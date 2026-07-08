# agent-rules.md — FamilyOS

> Paste this file into the agent's system settings (not the chat).
> The agent reads this before every session.

---

## Project Identity

- **Name:** FamilyOS
- **Stack:** Next.js 14 (App Router) + Supabase (Auth + DB + Realtime) + Anthropic Claude 3.5 + Tailwind CSS v4
- **Platform:** Web (PWA planned — Layer 07)
- **Deployment:** Vercel (auto-deploy from `main` branch on GitHub)
- **Repo:** https://github.com/michael-melamed/FamilyOs.git
- **Language:** Hebrew UI, English code & comments
- **Agent:** Antigravity (Google DeepMind)

---

## Iron Rules

1. **One layer at a time. No UI before API. No API before DB.**
2. **Read `state.md` before every session. Update it after every task.**
3. **Read the folder's `README.md` before editing any file in that folder.**
4. **No new npm packages without explicit user approval.**
5. **Never expose `SUPABASE_SERVICE_ROLE_KEY` or `ANTHROPIC_API_KEY` to the browser.** These are server-only.
6. **Never hardcode secrets, URLs, or IDs.** Use environment variables.
7. **TypeScript only.** No `.js` files in `app/`, `components/`, `lib/`, `hooks/`, `types/`.
8. **Every new folder gets a `README.md`.**
9. **`npx tsc --noEmit` must pass with zero errors before committing.**
10. **Git: commit after every completed task. Message format: `[LayerXX] Short description`.**

---

## Token Efficiency Rules

- Read `state.md` → identify the current task → read only the files relevant to that task.
- Never read `node_modules`, `.next`, or migration files unless explicitly debugging schema.
- If a file is over 200 lines, read only the relevant section by line range.
- Do not re-read files you already read in the same session unless they changed.

---

## Code Rules

- **Error handling:** Every Server Action and API Route must have try/catch. Return `{ error: string }` on failure.
- **API Routes return shape:** `{ data?: T, error?: string }` with appropriate HTTP status codes.
- **Server Actions:** Use `'use server'` directive. Never call from client without wrapping in a try/catch.
- **Client Components:** Use `'use client'` directive. Never import server-only modules.
- **Imports:** Use `@/` alias for all internal imports (e.g. `import { createClient } from '@/lib/supabase/client'`).
- **Types:** Import types with `import type { ... }` — never import type objects as values.
- **No `any` types** unless absolutely necessary and commented with `// TODO: type this`.
- **Comments:** Every file must have the JSDoc header block with `@file`, `@description_en`, `@depends_on`, `@used_by`, `@fix_guide`.

---

## Forbidden Actions

- ❌ Do NOT delete any existing file without explicit user instruction.
- ❌ Do NOT add a new database migration without showing the SQL to the user first.
- ❌ Do NOT change RLS policies without showing the SQL and getting approval.
- ❌ Do NOT install new npm packages without approval.
- ❌ Do NOT modify `supabase/migrations/` files that have already been run — create a new numbered migration instead.
- ❌ Do NOT use `console.log` in production code (use `console.error` for actual errors only).
- ❌ Do NOT use `any` without a comment explaining why.

---

## Exact Folder Structure

```
familyOS/
├── app/                        # Next.js 14 App Router
│   ├── (auth)/login/           # Google OAuth login page
│   ├── api/
│   │   ├── agent/              # POST /api/agent — Claude execution
│   │   └── household/
│   │       ├── join/           # POST /api/household/join
│   │       └── invite/
│   │           └── regenerate/ # POST /api/household/invite/regenerate
│   ├── auth/callback/          # GET /auth/callback — OAuth exchange
│   ├── dashboard/              # Main dashboard page
│   ├── household/
│   │   └── settings/           # Household settings page
│   └── join/[code]/            # Invite link landing page
├── components/
│   ├── dashboard/              # Board, TaskList, TaskItem, ShoppingList
│   ├── layout/                 # Header, Sidebar
│   └── prompt/                 # PromptBar
├── hooks/                      # useBoard, usePrompt, useHouseholdRealtime
├── lib/
│   ├── actions/                # Server Actions: tasks, shopping, memory, households, families
│   ├── agent/                  # parser.ts, schema.ts
│   └── supabase/               # client.ts, server.ts, auth.ts, realtime.ts
├── public/                     # Static assets (logo.png, future: manifest.json, sw.js)
├── supabase/
│   └── migrations/             # SQL migration files (run in Supabase SQL Editor)
├── types/
│   └── index.ts                # All TypeScript types
├── middleware.ts               # Route protection
├── next.config.js              # Next.js config
├── state.md                    # ← Agent reads this every session
└── agent-rules.md              # ← This file
```

---

## Environment Variables (names only — never commit values)

```
NEXT_PUBLIC_SUPABASE_URL        # Supabase project URL (browser-safe)
NEXT_PUBLIC_SUPABASE_ANON_KEY   # Supabase anon key (browser-safe)
SUPABASE_SERVICE_ROLE_KEY       # Server only — never expose to browser
ANTHROPIC_API_KEY               # Server only — never expose to browser
NEXT_PUBLIC_APP_URL             # Full production URL (e.g. https://family-os.vercel.app)
```

---

## Task Completion Format

At the end of every task, output this summary:

```
## ✅ Task Complete — [Task Number]: [Task Name]

### What was done
- [Bullet list of changes]

### Files changed
- [file path] — [one-line reason]

### Checklist
- [x] Item 1
- [x] Item 2

### What's next
[Task Number + 1]: [Name of next task]

### state.md updated
Yes — Current Stage updated to [LayerXX].
```

---

## Starting a New Session

Tell the agent exactly this:

> "Read `state.md` and the `README.md` of the folder you'll be working in. Then proceed with task [XX]."
