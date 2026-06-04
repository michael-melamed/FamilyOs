# 🗄️ MISSION 02 — DATABASE
# משימה 02 — מסד נתונים

> **PREREQUISITE | דרישה מוקדמת**
> Mission 01 must be fully verified before starting this mission.
> משימה 01 חייבת להיות מאומתת לגמרי לפני שמתחילים משימה זו.

---

## 🎯 GOAL OF THIS MISSION | מטרת המשימה

Create the complete database schema in Supabase:
- All tables with correct relationships
- Row Level Security (RLS) — families see only their own data
- Memory table for the AI agent
- Realtime enabled on relevant tables
- Supabase client files wired to the app

יצירת סכמת מסד נתונים מלאה ב-Supabase:
- כל הטבלאות עם קשרים נכונים
- Row Level Security — משפחות רואות רק את הנתונים שלהן
- טבלת זיכרון לסוכן ה-AI
- Realtime מופעל על טבלאות רלוונטיות
- קבצי Supabase client מחוברים לאפליקציה

---

## ✅ VERIFICATION — HOW TO KNOW THIS MISSION SUCCEEDED
## אימות — איך יודעים שהמשימה הצליחה

- [ ] All tables appear in Supabase Dashboard → Table Editor:
  `families`, `family_members`, `tasks`, `shopping_items`, `family_memory`, `agent_logs`
- [ ] RLS is enabled on all tables (green shield icon in Supabase)
- [ ] Realtime is enabled on `tasks` and `shopping_items`
- [ ] Running the test query below returns `[]` (empty array, not an error)
- [ ] `lib/supabase/client.ts` and `lib/supabase/server.ts` have no TypeScript errors

**Test query — run in Supabase SQL Editor:**
```sql
SELECT * FROM tasks LIMIT 1;
-- Expected: empty result, no error
```

**Test TypeScript — run in terminal:**
```bash
npx tsc --noEmit
# Expected: no errors
```

---

## 🗄️ COMPLETE DATABASE SCHEMA
## סכמת מסד הנתונים המלאה

Write this exactly in `supabase/migrations/001_initial_schema.sql`:

```sql
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
```

---

## 📁 FILES TO WRITE IN THIS MISSION
## קבצים לכתיבה במשימה זו

### `lib/supabase/client.ts`
Browser-side Supabase client. Used in React components.
```typescript
// Use @supabase/ssr createBrowserClient
// Export: createClient() function
// Fix guide: if "window is not defined" error → this file was imported in a server component
```

### `lib/supabase/server.ts`
Server-side Supabase client. Used in Server Actions and API routes.
```typescript
// Use @supabase/ssr createServerClient with cookies()
// Export: createClient() function  
// Fix guide: if cookies() error → wrap in async function and await cookies()
```

### `lib/supabase/realtime.ts`
Realtime subscription hook.
```typescript
// Export: useRealtimeTable(table, familyId, onUpdate) hook
// Uses supabase.channel() with postgres_changes
// Fix guide: if events not firing → check RLS policies allow SELECT
```

### `types/index.ts`
All shared TypeScript types.
```typescript
// Export these types exactly:
export type TaskStatus = 'pending' | 'in_progress' | 'done'
export type MemoryCategory = 'general' | 'member' | 'preference' | 'routine'

export type Family = {
  id: string
  name: string
  created_at: string
}

export type Task = {
  id: string
  family_id: string
  title: string
  status: TaskStatus
  assignee?: string
  parent_id?: string
  position: number
  created_by?: string
  created_at: string
  updated_at: string
}

export type ShoppingItem = {
  id: string
  family_id: string
  name: string
  quantity?: string
  checked: boolean
  created_at: string
  updated_at: string
}

export type FamilyMemory = {
  id: string
  family_id: string
  key: string
  value: string
  category: MemoryCategory
  updated_at: string
}
```

---

## 🚫 WHAT NOT TO DO IN THIS MISSION
## מה לא לעשות במשימה זו

- ❌ Do NOT write agent logic (Mission 3)
- ❌ Do NOT write UI components (Mission 4)
- ❌ Do NOT manually insert data into tables yet
- ❌ Do NOT skip the RLS policies — without them all data is public

---

*Mission 2 of 4 | FamilyOS / LiveCode Project*
*משימה 2 מתוך 4 | פרויקט FamilyOS / לייב קוד*
