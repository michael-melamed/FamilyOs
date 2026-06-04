# 📁 supabase/migrations/

Migration SQL files applied in sequence to the Supabase project.

## Files

| File | Status | Purpose |
|---|---|---|
| `001_initial_schema.sql` | ✅ Apply | Original schema: `families`, `tasks`, `shopping_items`, `family_memory`, `agent_logs`, RLS |
| `002_household_schema.sql` | ⚠️ **DEPRECATED — DO NOT APPLY** | Early draft — has conflicts. Superseded by 007a. |
| `007a_households.sql` | ✅ Apply | Clean household schema: `households`, `household_members`, `household_permissions`, `invite_codes`, `lists`, + `tasks.household_id` column |

## How to Apply a Migration

1. Open [Supabase Dashboard](https://app.supabase.com)
2. Go to your project → **SQL Editor**
3. Paste the contents of the migration file
4. Click **Run**

## Order of Application

```
001_initial_schema.sql   ← apply first
007a_households.sql      ← apply second (skip 002!)
```

## Notes

- `007a_households.sql` is idempotent — safe to run multiple times (`IF NOT EXISTS` guards on all DDL)
- The `families` model (from 001) is **not replaced** — both models coexist
- `lists` is a new table distinct from `shopping_items`
