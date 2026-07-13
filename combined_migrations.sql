-- ============================================================
-- FamilyOS ג€” Mission 07A: Households & Sync
-- Migration: 007a_households.sql
-- 
-- PURPOSE:
--   Introduces a new "household" data model that runs ALONGSIDE
--   (not replacing) the existing "families" model from Mission 02.
--   This is an additive migration ג€” no existing tables or policies
--   are removed. The families-based dashboard continues to work.
--
-- NEW TABLES:
--   households            ג€” a workspace shared by multiple users
--   household_members     ג€” links auth.users to a household with a role
--   household_permissions ג€” per-household permission flags
--   invite_codes          ג€” shareable join codes for households
--   lists                 ג€” named lists scoped to a household
--                           (distinct from shopping_items which is family-scoped)
--
-- MODIFIED TABLES:
--   tasks   ג€” gains household_id column (family_id preserved)
--
-- SAFE TO RUN:
--   Uses CREATE TABLE IF NOT EXISTS and ADD COLUMN IF NOT EXISTS
--   throughout, making this idempotent on re-run.
-- ============================================================


-- ============================================================
-- STEP 1 ג€” NEW TABLES
-- ============================================================

-- HOUSEHOLDS
-- The top-level workspace. One household can contain many members.
-- created_by is NOT NULL ג€” a household must always have an owner.
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
-- This is a NEW table ג€” not the same as shopping_items (which is family-scoped).
CREATE TABLE IF NOT EXISTS lists (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  household_id UUID        NOT NULL REFERENCES households(id) ON DELETE CASCADE,
  name         TEXT        NOT NULL,
  is_locked    BOOLEAN     DEFAULT false,
  created_by   UUID        REFERENCES auth.users(id),
  created_at   TIMESTAMPTZ DEFAULT now()
);


-- ============================================================
-- STEP 2 ג€” UPDATE EXISTING TABLES (ADDITIVE ONLY)
-- ============================================================

-- Add household_id to tasks so tasks can be scoped to a household.
-- The existing family_id column is preserved ג€” this is additive.
ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS household_id UUID REFERENCES households(id) ON DELETE CASCADE;


-- ============================================================
-- STEP 3 ג€” ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE households            ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_members     ENABLE ROW LEVEL SECURITY;
ALTER TABLE household_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE invite_codes          ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists                 ENABLE ROW LEVEL SECURITY;


-- ============================================================
-- STEP 4 ג€” HELPER FUNCTIONS
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
-- STEP 5 ג€” RLS POLICIES
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


-- TASKS ג€” add household-scoped policies (family_id policies remain)
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
-- STEP 6 ג€” PERFORMANCE INDEXES
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
-- STEP 7 ג€” REALTIME
-- Enable realtime change tracking on new live-data tables
-- ============================================================

-- lists: members need to see new lists appear in real time
ALTER PUBLICATION supabase_realtime ADD TABLE lists;

-- households: useful for admin dashboards reacting to name changes
ALTER PUBLICATION supabase_realtime ADD TABLE households;


-- ============================================================
-- END OF MIGRATION 007a_households.sql
-- ============================================================
-- ============================================================
-- MIGRATION: 008_shopping_rls_fix.sql
-- PURPOSE: Updates RLS policies for shopping_items to use the new households model.
-- ============================================================

DO $$ BEGIN
  CREATE POLICY "shopping: household members can select"
    ON shopping_items FOR SELECT USING (is_household_member(family_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "shopping: household members can insert"
    ON shopping_items FOR INSERT WITH CHECK (is_household_member(family_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "shopping: household members can update"
    ON shopping_items FOR UPDATE USING (is_household_member(family_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "shopping: household members can delete"
    ON shopping_items FOR DELETE USING (is_household_member(family_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
-- =============================================================================
-- Migration: 009_backfill_default_lists.sql
-- Purpose:   Add default "׳׳©׳™׳׳•׳×" and "׳§׳ ׳™׳•׳×" lists to every existing household
--            that currently has no lists at all.
--
-- When to run: Once, manually in the Supabase SQL Editor.
-- Safe to re-run: YES ג€” the WHERE clause guarantees idempotency (only inserts
--                 for households that truly have zero lists).
--
-- How it works:
--   1. Find all household_ids that have no rows in the `lists` table.
--   2. For each such household, pick the admin user as `created_by`
--      (falls back to any member if no admin exists).
--   3. Insert two list rows: "׳׳©׳™׳׳•׳×" and "׳§׳ ׳™׳•׳×".
-- =============================================================================

WITH households_needing_lists AS (
  -- DISTINCT ON picks one row per household_id.
  -- ORDER BY (role = 'admin') DESC ensures we prefer the admin as created_by.
  SELECT DISTINCT ON (hm.household_id)
    hm.household_id,
    hm.user_id
  FROM household_members hm
  LEFT JOIN lists l ON l.household_id = hm.household_id
  WHERE l.id IS NULL          -- only households with ZERO lists
  ORDER BY hm.household_id, (hm.role = 'admin') DESC
)
INSERT INTO lists (household_id, name, created_by)
SELECT
  h.household_id,
  list_names.name,
  h.user_id
FROM households_needing_lists h
CROSS JOIN (
  VALUES ('׳׳©׳™׳׳•׳×'), ('׳§׳ ׳™׳•׳×')
) AS list_names(name);

-- Verify: should return 0 rows after the migration runs successfully.
-- SELECT household_id FROM household_members
-- LEFT JOIN lists ON lists.household_id = household_members.household_id
-- WHERE lists.id IS NULL
-- LIMIT 10;
-- ============================================================
-- Migration: 010_add_list_id_to_tasks.sql
-- PURPOSE: Adds the missing list_id column to tasks table 
--          to support multiple task lists (Mission 07B).
-- ============================================================

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS list_id UUID REFERENCES lists(id) ON DELETE CASCADE;

-- Create an index to speed up lookups by list
CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id);
-- ============================================================
-- FamilyOS ג€” Mission: Notification Preferences
-- Migration: 011_notification_prefs.sql
-- ============================================================

-- Add a JSONB column to household_members to store per-household user notification settings.
ALTER TABLE household_members 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "notify_on_add": true,
  "notify_on_complete": true,
  "detailed_notifications": false,
  "muted_list_ids": []
}'::jsonb;
-- ============================================================
-- FamilyOS ג€” Mission: Activity Logs
-- Migration: 012_activity_logs.sql
-- ============================================================

-- 1. Add cleared_history_at to household_members
ALTER TABLE household_members 
ADD COLUMN IF NOT EXISTS cleared_history_at TIMESTAMPTZ DEFAULT now();

-- 2. Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL,
    action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    entity_type TEXT NOT NULL, -- 'task', 'shopping_item', 'list'
    entity_title TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity logs for their households"
    ON activity_logs FOR SELECT
    USING (
        household_id IN (
            SELECT household_id FROM household_members WHERE user_id = auth.uid()
        )
    );

-- 3. Create generic trigger function to log activity
CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
DECLARE
    h_id UUID;
    a_id UUID;
    a_name TEXT;
    action_type TEXT;
    e_type TEXT;
    e_title TEXT;
    json_details JSONB;
    act_record RECORD;
BEGIN
    action_type := TG_OP;
    e_type := TG_ARGV[0];

    -- Determine which record to use for data
    IF action_type = 'DELETE' THEN
        act_record := OLD;
    ELSE
        act_record := NEW;
    END IF;

    -- Extract common fields based on table structure
    -- (We assume standard column names exist based on table type)
    IF e_type = 'task' THEN
        h_id := act_record.household_id;
        a_id := act_record.created_by;
        a_name := COALESCE(act_record.assignee, '׳—׳‘׳¨ ׳׳©׳₪׳—׳”');
        e_title := act_record.title;
        
        -- Special update details
        IF action_type = 'UPDATE' THEN
            IF NEW.status = 'done' AND OLD.status != 'done' THEN
                json_details := '{"event": "completed"}'::jsonb;
            ELSE
                json_details := '{"event": "updated"}'::jsonb;
            END IF;
        ELSE
            json_details := '{}'::jsonb;
        END IF;

    ELSIF e_type = 'shopping_item' THEN
        h_id := act_record.family_id; -- In our schema, family_id = household_id
        a_id := act_record.created_by;
        a_name := '׳—׳‘׳¨ ׳׳©׳₪׳—׳”'; -- No explicit assignee for shopping
        e_title := act_record.name;

        IF action_type = 'UPDATE' THEN
            IF NEW.checked = true AND OLD.checked = false THEN
                json_details := '{"event": "completed"}'::jsonb;
            ELSE
                json_details := '{"event": "updated"}'::jsonb;
            END IF;
        ELSE
            json_details := '{}'::jsonb;
        END IF;

    ELSIF e_type = 'list' THEN
        h_id := act_record.household_id;
        a_id := act_record.created_by;
        a_name := '׳׳ ׳”׳';
        e_title := act_record.name;
        json_details := '{}'::jsonb;
    END IF;

    -- Only log if we have a household_id
    IF h_id IS NOT NULL THEN
        -- Actually, created_by might not be the real actor for updates/deletes in RLS,
        -- but since we use auth.uid() in RLS, we can capture the actual DB user:
        -- But Supabase passes auth.uid() in the request.
        -- We will just use the current auth.uid() if possible, but triggers in Postgres
        -- can access auth.uid() using current_setting('request.jwt.claim.sub', true).
        
        DECLARE
            actual_user_id UUID := NULLIF(current_setting('request.jwt.claim.sub', true), '');
        BEGIN
            IF actual_user_id IS NOT NULL THEN
                a_id := actual_user_id;
                -- Try to find their role or name in household_members? 
                -- To keep it simple, we'll store their UUID and let frontend fetch name, 
                -- OR we just store a generic name here.
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Ignore missing settings
        END;

        INSERT INTO activity_logs (household_id, actor_id, actor_name, action, entity_type, entity_title, details)
        VALUES (h_id, a_id, a_name, action_type, e_type, e_title, json_details);
    END IF;

    RETURN NULL; -- AFTER triggers return NULL
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Apply triggers to tables

DROP TRIGGER IF EXISTS trg_log_task_activity ON tasks;
CREATE TRIGGER trg_log_task_activity
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION log_activity('task');

DROP TRIGGER IF EXISTS trg_log_shopping_activity ON shopping_items;
CREATE TRIGGER trg_log_shopping_activity
    AFTER INSERT OR UPDATE OR DELETE ON shopping_items
    FOR EACH ROW EXECUTE FUNCTION log_activity('shopping_item');

DROP TRIGGER IF EXISTS trg_log_list_activity ON lists;
CREATE TRIGGER trg_log_list_activity
    AFTER INSERT OR UPDATE OR DELETE ON lists
    FOR EACH ROW EXECUTE FUNCTION log_activity('list');

-- 5. Enable realtime for activity_logs to use Webhooks later
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
-- ============================================================
-- FamilyOS ג€” Mission: Push Notifications
-- Migration: 013_push_subscriptions.sql
-- ============================================================

CREATE TABLE IF NOT EXISTS push_subscriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    endpoint TEXT NOT NULL,
    p256dh TEXT NOT NULL,
    auth TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, endpoint) -- Prevent duplicate subscriptions for same device
);

ALTER TABLE push_subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can manage their own subscriptions"
    ON push_subscriptions FOR ALL
    USING (user_id = auth.uid());
