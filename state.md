# Project State — FamilyOS

> **HOW TO USE THIS FILE**
> At the start of every new session, tell the agent:
> "Read `state.md` and the README.md of the folder you'll be working in. Then proceed with task [XX]."
> At the end of every task, the agent updates this file.

---

## Current Stage

**Layer 07 — PWA (Complete)**
Last completed: Added manifest.json, sw.js, and SW registration in layout (Mission 07)
Next recommended: Feature work or improvements

---

## Completed Tasks

- 01A: Project initialized — Next.js 14 App Router, folder structure, GEMINI.md
- 01B: Supabase clients configured — `lib/supabase/client.ts`, `server.ts`, `auth.ts`, `realtime.ts`
- 02A: Core schema migrated — `001_initial_schema.sql`, `002_household_schema.sql`, `007a_households.sql`, `008_shopping_rls_fix.sql`
- 02B: TypeScript types created — `types/index.ts` (Task, ShoppingItem, FamilyMemory, Family)
- 03A: Google OAuth login page — `app/(auth)/login/page.tsx` + `app/auth/callback/route.ts`
- 03B: Auto-household creation on first login — `lib/actions/households.ts → createHouseholdForUser`
- 04A: Agent API route — `app/api/agent/route.ts` (Claude 3.5, JSON parser, Server Actions)
- 04B: Household join API — `app/api/household/join/route.ts` (RLS bypass via service role)
- 04C: Invite regenerate API — `app/api/household/invite/regenerate/route.ts`
- 04D: Household settings API — `app/household/settings/page.tsx`
- 05A: Board hook — `hooks/useBoard.ts` (realtime, tasks + shopping + lists + permissions)
- 05B: Prompt hook — `hooks/usePrompt.ts`
- 05C: Household realtime hook — `hooks/useHouseholdRealtime.ts`
- 06A: Dashboard page — `app/dashboard/page.tsx` (multi-household, URL param active switch)
- 06B: Board + TaskList + TaskItem + ShoppingList — `components/dashboard/`
- 06C: Header + Sidebar — `components/layout/` (household switcher, group list always open)
- 06D: PromptBar — `components/prompt/PromptBar.tsx`
- 06E: Join page — `app/join/[code]/page.tsx`
- 07A: PWA Layer — `public/sw.js` and Service Worker registration in `layout.tsx`
- 08A: Deployed to Vercel — GitHub Actions triggers auto-deploy on push to `main`
- QA1: BUG fixes (Mission 08) — household_id in createTask, Board dynamic lists, RLS bypass for join, shopping RLS fix, realtime filter fix, TaskItem edit/delete

---

## Critical Decisions Made

- **Dual schema (legacy + new):** `households` / `household_members` are the source of truth. Legacy `families` / `family_members` tables are backfilled on creation and join for `shopping_items` RLS compatibility.
- **Server Actions over API Routes for mutations:** tasks, shopping, memory use `'use server'` actions. Auth-sensitive ops (join, invite) use API Routes.
- **household_id is the primary filter:** All queries in `useBoard.ts` filter by `household_id`. `shopping_items` still uses `family_id` (same UUID value, different column name).
- **Agent uses Claude 3.5** via Anthropic SDK. Has JSON-mode parser + Hebrew keyword fallback parser.
- **Realtime filter:** `tasks` and `lists` use `household_id=eq.${id}`. `shopping_items` uses `family_id=eq.${id}`.
- **Service role key** is used server-side only for: household creation, invite code lookup, household join, invite regeneration.
- **Middleware** protects all routes except `/login`, `/invite`, `/api/*`, `/auth/*`.

---

## Critical Files

| File | Purpose |
|------|---------|
| `lib/supabase/client.ts` | Browser Supabase client |
| `lib/supabase/server.ts` | Server Supabase client (SSR cookies) |
| `lib/supabase/realtime.ts` | `useRealtimeTable` hook |
| `lib/actions/tasks.ts` | createTask, updateTask, deleteTask, completeTask |
| `lib/actions/households.ts` | createHouseholdForUser, getInviteInfo, updateHouseholdName |
| `lib/actions/shopping.ts` | shopping item CRUD |
| `lib/actions/memory.ts` | agent memory CRUD |
| `lib/agent/parser.ts` | Claude JSON response parser + fallback keyword parser |
| `lib/agent/schema.ts` | Agent action schema |
| `types/index.ts` | All TypeScript types |
| `middleware.ts` | Route protection + session refresh |
| `next.config.js` | Next.js config (Server Actions origins — dynamic from NEXT_PUBLIC_APP_URL) |
| `supabase/migrations/007a_households.sql` | Full household schema with RLS |
| `supabase/migrations/008_shopping_rls_fix.sql` | Shopping items RLS fix (run manually in Supabase SQL editor) |

---

## Environment Variables Required

```
NEXT_PUBLIC_SUPABASE_URL        — Supabase project URL
NEXT_PUBLIC_SUPABASE_ANON_KEY   — Supabase anon/public key
SUPABASE_SERVICE_ROLE_KEY       — Supabase service role key (server only, never browser)
ANTHROPIC_API_KEY               — Anthropic Claude API key
NEXT_PUBLIC_APP_URL             — Full app URL (e.g. https://family-os.vercel.app)
```

---

## Known Remaining Issues / Next Steps

- [ ] `types/index.ts` is missing: `Household`, `HouseholdMember`, `HouseholdPermissions`, `InviteCode`, `List` types and `household_id` in `Task`
- [ ] PWA layer (Layer 07) not started — no `manifest.json`, no service worker
- [ ] `supabase/migrations/008_shopping_rls_fix.sql` must be run manually in Supabase SQL Editor
- [ ] `NEXT_PUBLIC_APP_URL` in Vercel must be updated to the real Vercel domain after first deploy
