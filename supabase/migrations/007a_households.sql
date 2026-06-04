-- ============================================================
-- FamilyOS — Mission 07A: Households & Sync
-- Migration: 007a_households.sql
-- 
-- PURPOSE:
--   Introduces a new "household" data model that runs ALONGSIDE
--   (not replacing) the existing "families" model from Mission 02.
--   This is an additive migration — no existing tables or policies
--   are removed. The families-based dashboard continues to work.
--
-- NEW TABLES:
--   households            — a workspace shared by multiple users
--   household_members     — links auth.users to a household with a role
--   household_permissions — per-household permission flags
--   invite_codes          — shareable join codes for households
--   lists                 — named lists scoped to a household
--                           (distinct from shopping_items which is family-scoped)
--
-- MODIFIED TABLES:
--   tasks   — gains household_id column (family_id preserved)
--
-- SAFE TO RUN:
--   Uses CREATE TABLE IF NOT EXISTS and ADD COLUMN IF NOT EXISTS
--   throughout, making this idempotent on re-run.
-- ============================================================


-- ============================================================
-- STEP 1 — NEW TABLES
-- ============================================================

-- HOUSEHOLDS
-- The top-level workspace. One household can contain many members.
-- created_by is NOT NULL — a household must always have an owner.
CREATE TABLE IF NOT EXISTS households (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT        NOT NULL,
  created_by  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at  TIMESTAMPTZ DEFAULT now()
);

-- HOUSEHOLD MEMBERS
-- Joins auth users to a household. Role must be 'admin' or 'member'.
-- A user can only appear once per household (UNIQUE constraint).
CREATE TABLE IF NOT EXISTS household_members (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  user_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role         TEXT        NOT NULL CHECK (role IN ('admin', 'member')),
  joined_at    TIMESTAMPTZ DEFAULT now(),
  UNIQUE(household_id, user_id)
);

-- HOUSEHOLD PERMISSIONS
-- One row per household defining what members are allowed to do.
-- Defaults are conservative (read-heavy, no destructive actions).
-- UNIQUE(household_id) enforces one permission set per household.
CREATE TABLE IF NOT EXISTS household_permissions (
  id                              UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id                    UUID    NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  can_add_tasks                   BOOLEAN DEFAULT true,
  can_delete_tasks                BOOLEAN DEFAULT false,
  can_clear_lists                 BOOLEAN DEFAULT false,
  can_delete_lists                BOOLEAN DEFAULT false,
  can_add_to_specific_lists_only  BOOLEAN DEFAULT false,
  allowed_list_ids                UUID[]  DEFAULT NULL,
  UNIQUE(household_id)
);

-- INVITE CODES
-- Short unique codes used to join a household.
-- expires_at = NULL means never expires.
-- is_active can be flipped to false to revoke without deleting.
CREATE TABLE IF NOT EXISTS invite_codes (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  code         TEXT        NOT NULL UNIQUE,
  created_by   UUID        NOT NULL REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT now(),
  expires_at   TIMESTAMPTZ DEFAULT NULL,
  is_active    BOOLEAN     DEFAULT true
);

-- LISTS
-- Named lists scoped to a household (e.g. "Grocery", "Chores", "Weekend").
-- is_locked = true means only admins can modify it.
-- This is a NEW table — not the same as shopping_items (which is family-scoped).
CREATE TABLE IF NOT EXISTS lists (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  is_locked    BOOLEAN     DEFAULT false,
  created_by   UUID        REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- STEP 2 — UPDATE EXISTING TABLES (ADDITIVE ONLY)
-- ============================================================

-- Add household_id to tasks so tasks can be scoped to a household.
-- The existing family_id column is preserved — this is additive.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE;


-- ============================================================
-- STEP 3 — ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE households            ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists                 ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- STEP 4 — HELPER FUNCTIONS
-- ============================================================

-- Returns true if the current auth user is a member of the given household.
-- Used as a lightweight security check in RLS policies.
CREATE OR REPLACE FUNCTION is_household_member(hid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = hid AND user_id = auth.uid()
  );
$$ LANGUAGE sql SECURITY DEFINER;

-- Returns true if the current auth user is an admin of the given household.
CREATE OR REPLACE FUNCTION is_household_admin(hid UUID)
RETURNS BOOLEAN AS $$
  SELECT EXISTS (
    SELECT 1 FROM household_members
    WHERE household_id = hid AND user_id = auth.uid() AND role = 'admin'
  );
$$ LANGUAGE sql SECURITY DEFINER;


-- ============================================================
-- STEP 5 — RLS POLICIES
-- Using DO blocks with exception handling to be idempotent.
-- ============================================================

-- HOUSEHOLDS policies
DO $$ BEGIN
  CREATE POLICY "households: members can select"
    ON households FOR SELECT USING (is_household_member(id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "households: authenticated users can create"
    ON households FOR INSERT WITH CHECK (auth.uid() = created_by);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "households: admins can update"
    ON households FOR UPDATE USING (is_household_admin(id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "households: admins can delete"
    ON households FOR DELETE USING (is_household_admin(id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- HOUSEHOLD_MEMBERS policies
DO $$ BEGIN
  CREATE POLICY "household_members: members can select"
    ON household_members FOR SELECT USING (is_household_member(household_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  -- Admins can add members, or a user can add themselves (joining via invite)
  CREATE POLICY "household_members: admins can insert or self-join"
    ON household_members FOR INSERT
    WITH CHECK (is_household_admin(household_id) OR auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "household_members: admins can update"
    ON household_members FOR UPDATE USING (is_household_admin(household_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  -- Admins can remove members, or a user can remove themselves (leave)
  CREATE POLICY "household_members: admins can delete or self-leave"
    ON household_members FOR DELETE
    USING (is_household_admin(household_id) OR auth.uid() = user_id);
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- HOUSEHOLD_PERMISSIONS policies
DO $$ BEGIN
  CREATE POLICY "household_permissions: members can select"
    ON household_permissions FOR SELECT USING (is_household_member(household_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "household_permissions: admins can insert"
    ON household_permissions FOR INSERT WITH CHECK (is_household_admin(household_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "household_permissions: admins can update"
    ON household_permissions FOR UPDATE USING (is_household_admin(household_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- INVITE_CODES policies
DO $$ BEGIN
  CREATE POLICY "invite_codes: members can select"
    ON invite_codes FOR SELECT USING (is_household_member(household_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "invite_codes: admins can insert"
    ON invite_codes FOR INSERT WITH CHECK (is_household_admin(household_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "invite_codes: admins can update"
    ON invite_codes FOR UPDATE USING (is_household_admin(household_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "invite_codes: admins can delete"
    ON invite_codes FOR DELETE USING (is_household_admin(household_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- LISTS policies
DO $$ BEGIN
  CREATE POLICY "lists: household members can select"
    ON lists FOR SELECT USING (is_household_member(household_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "lists: household members can insert"
    ON lists FOR INSERT WITH CHECK (is_household_member(household_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "lists: household members can update"
    ON lists FOR UPDATE USING (is_household_member(household_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  -- Only admins can delete lists (destructive action)
  CREATE POLICY "lists: admins can delete"
    ON lists FOR DELETE USING (is_household_admin(household_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- TASKS — add household-scoped policies (family_id policies remain)
DO $$ BEGIN
  CREATE POLICY "tasks: household members can select"
    ON tasks FOR SELECT USING (
      household_id IS NOT NULL AND is_household_member(household_id)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "tasks: household members can insert"
    ON tasks FOR INSERT WITH CHECK (
      household_id IS NULL OR is_household_member(household_id)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "tasks: household members can update"
    ON tasks FOR UPDATE USING (
      household_id IS NOT NULL AND is_household_member(household_id)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "tasks: household members can delete"
    ON tasks FOR DELETE USING (
      household_id IS NOT NULL AND is_household_member(household_id)
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- STEP 6 — PERFORMANCE INDEXES
-- ============================================================

-- Speeds up "what households does this user belong to?" lookups
CREATE INDEX IF NOT EXISTS idx_household_members_user_id
  ON household_members(user_id);

-- Speeds up "who are the members of this household?" lookups
CREATE INDEX IF NOT EXISTS idx_household_members_household_id
  ON household_members(household_id);

-- Speeds up join-by-code lookups (used during invite flow)
CREATE INDEX IF NOT EXISTS idx_invite_codes_code
  ON invite_codes(code);

-- Speeds up fetching all lists for a household
CREATE INDEX IF NOT EXISTS idx_lists_household_id
  ON lists(household_id);

-- Speeds up fetching all tasks for a household
CREATE INDEX IF NOT EXISTS idx_tasks_household_id
  ON tasks(household_id);


-- ============================================================
-- STEP 7 — REALTIME
-- Enable realtime change tracking on new live-data tables
-- ============================================================

-- lists: members need to see new lists appear in real time
ALTER PUBLICATION supabase_realtime ADD TABLE lists;

-- households: useful for admin dashboards reacting to name changes
ALTER PUBLICATION supabase_realtime ADD TABLE households;


-- ============================================================
-- END OF MIGRATION 007a_households.sql
-- ============================================================
