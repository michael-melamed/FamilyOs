-- ============================================================
-- ⚠️  DEPRECATED — DO NOT APPLY TO SUPABASE
-- ============================================================
-- This file (002_household_schema.sql) was an early draft of
-- the household schema and contains the following known issues:
--
--   1. References ALTER TABLE lists — but the `lists` table did
--      not exist in the initial schema (001). This will error.
--
--   2. households.created_by is NULLABLE (ON DELETE SET NULL),
--      which conflicts with the NOT NULL requirement in Mission 07A.
--
--   3. RLS policies use raw CREATE POLICY without IF NOT EXISTS
--      guards, making the file non-idempotent.
--
-- USE INSTEAD: supabase/migrations/007a_households.sql
-- That file is idempotent, conflict-free, and fully commented.
-- ============================================================

-- ============================================
-- FamilyOS — Household Sync & Family Management
-- Mission 07
-- ============================================

-- HOUSEHOLDS
create table households (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_by  uuid references auth.users(id) on delete set null,
  created_at  timestamptz default now()
);

-- HOUSEHOLD MEMBERS
create table household_members (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade not null,
  user_id      uuid references auth.users(id) on delete cascade not null,
  role         text check (role in ('admin', 'member')) default 'member',
  joined_at    timestamptz default now(),
  unique(household_id, user_id)
);

-- HOUSEHOLD PERMISSIONS
create table household_permissions (
  id                             uuid primary key default gen_random_uuid(),
  household_id                   uuid references households(id) on delete cascade not null,
  can_add_tasks                  boolean default true,
  can_delete_tasks               boolean default false,
  can_clear_lists                boolean default false,
  can_delete_lists               boolean default false,
  can_add_to_specific_lists_only boolean default false,
  allowed_list_ids               uuid[] default null,
  unique(household_id)
);

-- INVITE CODES
create table invite_codes (
  id           uuid primary key default gen_random_uuid(),
  household_id uuid references households(id) on delete cascade not null,
  code         text unique not null,
  created_by   uuid references auth.users(id) on delete cascade not null,
  created_at   timestamptz default now(),
  expires_at   timestamptz default null,
  is_active    boolean default true
);

-- UPDATE EXISTING TABLES
alter table tasks 
  add column household_id uuid references households(id) on delete cascade;

alter table lists 
  add column household_id uuid references households(id) on delete cascade,
  add column is_locked boolean default false;

-- ROW LEVEL SECURITY (RLS)
alter table households             enable row level security;
alter table household_members      enable row level security;
alter table household_permissions  enable row level security;
alter table invite_codes           enable row level security;

-- Helper function: check if current user is member of household
create or replace function is_household_member(hid uuid)
returns boolean as $$
  select exists (
    select 1 from household_members
    where household_id = hid and user_id = auth.uid()
  );
$$ language sql security definer;

-- Helper function: check if current user is admin of household
create or replace function is_household_admin(hid uuid)
returns boolean as $$
  select exists (
    select 1 from household_members
    where household_id = hid and user_id = auth.uid() and role = 'admin'
  );
$$ language sql security definer;

-- HOUSEHOLDS policies
create policy "members can read their households"
  on households for select using (is_household_member(id));
create policy "admins can update their households"
  on households for update using (is_household_admin(id));
create policy "admins can delete their households"
  on households for delete using (is_household_admin(id));
create policy "anyone can insert household"
  on households for insert with check (auth.uid() = created_by);

-- HOUSEHOLD MEMBERS policies
create policy "members can read household members"
  on household_members for select using (is_household_member(household_id));
create policy "admins can insert household members"
  on household_members for insert with check (is_household_admin(household_id) or auth.uid() = user_id);
create policy "admins can update household members"
  on household_members for update using (is_household_admin(household_id));
create policy "admins can delete household members"
  on household_members for delete using (is_household_admin(household_id) or auth.uid() = user_id);

-- HOUSEHOLD PERMISSIONS policies
create policy "members can read household permissions"
  on household_permissions for select using (is_household_member(household_id));
create policy "admins can insert household permissions"
  on household_permissions for insert with check (is_household_admin(household_id) or auth.uid() in (select created_by from households where id = household_id));
create policy "admins can update household permissions"
  on household_permissions for update using (is_household_admin(household_id));

-- INVITE CODES policies
create policy "members can read invite codes"
  on invite_codes for select using (is_household_member(household_id));
create policy "admins can insert invite codes"
  on invite_codes for insert with check (is_household_admin(household_id));
create policy "admins can update invite codes"
  on invite_codes for update using (is_household_admin(household_id));
create policy "admins can delete invite codes"
  on invite_codes for delete using (is_household_admin(household_id));

-- UPDATING TASKS AND LISTS RLS to use household_id
-- Assuming existing RLS exists, we may need to drop and recreate or just add new policies
-- We'll add policies based on household_id
create policy "household members can read tasks"
  on tasks for select using (is_household_member(household_id));
create policy "household members can insert tasks"
  on tasks for insert with check (is_household_member(household_id));
create policy "household members can update tasks"
  on tasks for update using (is_household_member(household_id));
create policy "household members can delete tasks"
  on tasks for delete using (is_household_member(household_id));

create policy "household members can read lists"
  on lists for select using (is_household_member(household_id));
create policy "household members can insert lists"
  on lists for insert with check (is_household_member(household_id));
create policy "household members can update lists"
  on lists for update using (is_household_member(household_id));
create policy "household members can delete lists"
  on lists for delete using (is_household_member(household_id));
