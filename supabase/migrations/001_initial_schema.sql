-- ============================================
-- FamilyOS — Initial Schema
-- Mission 02 | Generated for LiveCode Project
-- ============================================

-- FAMILIES
-- One family per household / workspace
create table families (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  created_at  timestamptz default now()
);

-- FAMILY MEMBERS
-- Links Supabase auth users to families
-- A user can belong to one family (expandable later)
create table family_members (
  id           uuid primary key default gen_random_uuid(),
  family_id    uuid references families(id) on delete cascade,
  user_id      uuid references auth.users(id) on delete cascade,
  display_name text not null,
  role         text default 'member', -- 'admin' | 'member'
  created_at   timestamptz default now(),
  unique(family_id, user_id)
);

-- TASKS
-- Main task list. Supports sub-tasks via parent_id.
create table tasks (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid references families(id) on delete cascade not null,
  title       text not null,
  status      text default 'pending',
  -- status values: 'pending' | 'in_progress' | 'done'
  assignee    text,
  -- free text name, e.g. 'תמר' or 'מיכאל'
  parent_id   uuid references tasks(id) on delete cascade,
  -- null = top-level task, uuid = sub-task
  position    integer default 0,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- SHOPPING ITEMS
create table shopping_items (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid references families(id) on delete cascade not null,
  name        text not null,
  quantity    text,
  checked     boolean default false,
  created_by  uuid references auth.users(id),
  created_at  timestamptz default now(),
  updated_at  timestamptz default now()
);

-- FAMILY MEMORY
-- Stores persistent context for the AI agent.
-- Key-value pairs scoped per family.
-- Examples:
--   key: 'member_tamar',    value: 'תמר, אוהבת קפה שחור, עובדת בצהל'
--   key: 'shopping_day',    value: 'יום ראשון'
--   key: 'agent_language',  value: 'hebrew'
create table family_memory (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid references families(id) on delete cascade not null,
  key         text not null,
  value       text not null,
  category    text default 'general',
  -- category values: 'general' | 'member' | 'preference' | 'routine'
  updated_at  timestamptz default now(),
  unique(family_id, key)
);

-- AGENT LOGS
-- Every prompt and its parsed actions are logged here.
-- Used for debugging and future learning.
create table agent_logs (
  id          uuid primary key default gen_random_uuid(),
  family_id   uuid references families(id) on delete cascade,
  user_id     uuid references auth.users(id),
  prompt      text not null,
  actions     jsonb,
  summary     text,
  created_at  timestamptz default now()
);

-- ============================================
-- UPDATED_AT TRIGGER
-- Auto-updates updated_at on row change
-- ============================================
create or replace function update_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger tasks_updated_at
  before update on tasks
  for each row execute function update_updated_at();

create trigger shopping_updated_at
  before update on shopping_items
  for each row execute function update_updated_at();

create trigger memory_updated_at
  before update on family_memory
  for each row execute function update_updated_at();

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- Each family sees only its own data
-- ============================================
alter table tasks           enable row level security;
alter table shopping_items  enable row level security;
alter table family_memory   enable row level security;
alter table agent_logs      enable row level security;
alter table family_members  enable row level security;
alter table families        enable row level security;

-- Helper: check if current user belongs to a family
create or replace function is_family_member(fid uuid)
returns boolean as $$
  select exists (
    select 1 from family_members
    where family_id = fid and user_id = auth.uid()
  );
$$ language sql security definer;

-- TASKS policies
create policy "family members can read tasks"
  on tasks for select using (is_family_member(family_id));

create policy "family members can insert tasks"
  on tasks for insert with check (is_family_member(family_id));

create policy "family members can update tasks"
  on tasks for update using (is_family_member(family_id));

create policy "family members can delete tasks"
  on tasks for delete using (is_family_member(family_id));

-- SHOPPING policies
create policy "family members can read shopping"
  on shopping_items for select using (is_family_member(family_id));

create policy "family members can insert shopping"
  on shopping_items for insert with check (is_family_member(family_id));

create policy "family members can update shopping"
  on shopping_items for update using (is_family_member(family_id));

create policy "family members can delete shopping"
  on shopping_items for delete using (is_family_member(family_id));

-- MEMORY policies
create policy "family members can read memory"
  on family_memory for select using (is_family_member(family_id));

create policy "family members can write memory"
  on family_memory for insert with check (is_family_member(family_id));

create policy "family members can update memory"
  on family_memory for update using (is_family_member(family_id));

-- AGENT LOGS policies
create policy "family members can read logs"
  on agent_logs for select using (is_family_member(family_id));

create policy "family members can insert logs"
  on agent_logs for insert with check (is_family_member(family_id));

-- FAMILY MEMBERS policies
create policy "members can see their family"
  on family_members for select using (user_id = auth.uid());

-- FAMILIES policies
create policy "members can see their family info"
  on families for select using (is_family_member(id));

-- ============================================
-- REALTIME
-- Enable realtime on live-updating tables
-- ============================================
alter publication supabase_realtime add table tasks;
alter publication supabase_realtime add table shopping_items;
