# The Layered Build Methodology
## How to Plan Any Project for an AI Coding Agent

---

## What This Is

A repeatable system for turning a product idea into a structured, agent-ready work plan.
It works for **new projects** and **existing projects**.
The output is always two files: `agent-rules.md` and `[project-name]-plan.md`.

---

## The Core Philosophy

> One layer at a time. Test before you continue.
> No UI before API. No API before DB.
> Every folder has a README. Every task updates state.md.

---

## Part 1 — The Intake Process

Before writing a single task, answer these questions.
The more precise the answers, the better the plan.

### Product Questions
```
1. What does this app do in one sentence?
2. Who is the user? (one person, a team, public?)
3. What are the 2-3 core actions the user takes?
4. What data needs to be stored?
5. Are there multiple user roles? (admin, member, guest?)
```

### Technical Questions
```
6. Stack? (framework, database, auth, deployment)
7. Platform? (web / mobile / PWA / desktop)
8. Is this a new project or does code already exist?
9. Are there external integrations? (payments, email, APIs)
10. What environment variables will be needed?
```

### Agent Questions
```
11. Which AI agent will execute? (Antigravity, Cursor, Copilot, etc.)
12. What is the agent's context window limit?
13. Should tasks be split smaller for heavy-load hours?
```

---

## Part 2 — The Two Output Files

Every project produces exactly these two files.

### File 1: `agent-rules.md`
The agent reads this before every session.
It is pasted into the agent's system settings (not the chat).

**Must contain:**
- Project identity (name, stack, deployment)
- Iron rules (README in every folder, one layer at a time, no UI before API)
- Token efficiency rules (state.md, read-before-write)
- Code rules (TypeScript, error handling, no hardcoded secrets)
- Forbidden actions (don't delete, don't add libraries without approval)
- Exact folder structure
- Exact environment variables (names only, no values)
- Task completion format (what was done / files changed / checklist / what's next)

### File 2: `[project-name]-plan.md`
The execution roadmap. One prompt per task, one checklist per task.

**Must contain:**
- Layer breakdown (DB → Auth → API → Hooks → UI → PWA/Native → Deploy)
- Each task: number, name, full prompt, checklist
- Execution order at the bottom
- The golden rule: Checklist ✅ before ➡️

---

## Part 3 — The Layer Order

Always build in this order. Never skip a layer.

```
Layer 01 — Project Init
  ├── 01A: Create project + folder structure + all READMEs + state.md
  └── 01B: Configure core libraries (Supabase client, middleware, etc.)

Layer 02 — Database
  ├── 02A: Schema (tables, RLS policies with explicit SQL, indexes, triggers)
  └── 02B: TypeScript types (match schema exactly)

Layer 03 — Authentication
  ├── 03A: Login UI + OAuth callback route
  └── 03B: Auto-profile creation (trigger + server action)

Layer 04 — API Routes
  ├── 04A: First core action (e.g. create)
  ├── 04B: Second core action (e.g. update/complete)
  └── 04C: Read actions (status, list, history)

Layer 05 — Hooks
  └── 05A: Custom hooks that wrap all API calls + manage state

Layer 06 — UI
  ├── 06A: Main screen
  └── 06B: Secondary screens (history, settings, etc.)

Layer 07 — Platform Layer
  └── 07A: PWA manifest + service worker  (or: mobile config, desktop config)

Layer 08 — Deployment
  └── 08A: Build check + environment variables audit + deploy
```

**Adjust layers based on project needs:**
- No auth? Skip Layer 03.
- Simple CRUD? Collapse Layer 04 into one task.
- Mobile app? Replace Layer 07 with Expo/React Native config.
- Multi-role? Add a Layer 03C for role management.

---

## Part 4 — The Prompt Formula

Every task prompt follows the same structure:

```
[READ FIRST]
Read [relevant README.md] before starting.

[WHAT TO BUILD]
Create [file path] with:
- Exact specification point by point
- Edge cases to handle
- Error format to use
- What to return

[DOCUMENTATION]
Update [relevant README.md].
Update state.md with: "[task number] completed — [one line summary]".
```

**Rules for writing prompts:**
- Be specific about file paths — never say "create a file", say "create app/api/shifts/clock-in/route.ts"
- Include exact SQL, exact TypeScript interfaces, exact return shapes
- Name the edge cases — don't assume the agent will think of them
- One responsibility per task — if a prompt does two things, split it
- If the task is large, split it into A and B

---

## Part 5 — The Checklist Formula

Every task ends with a checklist. Rules:

- **Specific and binary** — either it passes or it doesn't
- **Testable without reading code** — the developer can verify by running the app or checking the dashboard
- **3–6 items max** — if you have more, the task is too big
- **Include the failure case** — e.g. "POST with no session returns 401"

**Good checklist:**
```
- [ ] POST returns 201 with the created record
- [ ] Second POST during active shift returns 400
- [ ] No session returns 401
- [ ] Record exists in DB after the call
```

**Bad checklist:**
```
- [ ] Code looks correct
- [ ] Everything works
```

---

## Part 6 — state.md

This file is the agent's memory across sessions.
It lives in the project root and is updated at the end of every task.

**Format:**
```markdown
# Project State — [Project Name]

## Current Stage
Layer 04 — API Routes
Last completed: 04B (clock-out route)
Next: 04C (status + history)

## Completed Tasks
- 01A: Project initialized, all READMEs created
- 01B: Supabase clients + middleware configured
- 02A: Schema migrated (profiles + shifts, RLS enabled)
- 02B: TypeScript types created
- 03A: Login page + OAuth callback
- 03B: Auto-profile trigger + getProfile action
- 04A: clock-in route (POST /api/shifts/clock-in)
- 04B: clock-out route (POST /api/shifts/clock-out)

## Critical Decisions Made
- Using API Routes (not Server Actions) for scalability
- duration_minutes calculated server-side on clock-out
- Middleware protects ['/', '/history/:path*'] only

## Critical Files
- lib/supabase/client.ts — browser client
- lib/supabase/server.ts — server client
- types/database.ts — all DB types
- types/api.ts — ApiResponse<T>
```

**When starting a new session:**
Tell the agent: "Read state.md and the README.md of the folder you'll be working in. Then proceed with task [XX]."

---

## Part 7 — Existing Projects

If the project already has code, add these steps before writing the plan:

### Step 1 — Audit Prompt
```
Read every file in the project root and every README.md.
Then produce a report with:
1. What exists (files, routes, components, DB tables)
2. What is missing based on the intended features
3. Any inconsistencies or bugs you notice
4. Suggested layer order to continue from
Do not write any code yet.
```

### Step 2 — Generate state.md from existing code
```
Based on your audit, create a state.md that reflects the current state of the project.
Mark completed tasks as done, identify where we are in the layer order,
and list all critical decisions that appear to have been made in the existing code.
```

### Step 3 — Continue with the standard plan
Pick up from the correct layer. Don't rebuild what works.

---

## Part 8 — The Prompt to Generate the Plan

Once you have the intake answers, use this prompt with Claude to generate the two files:

```
I need a structured agent work plan for a new project.

Here are the intake answers:

PRODUCT:
- What it does: [one sentence]
- Core user actions: [list]
- Data to store: [list]
- User roles: [yes/no + details]

TECHNICAL:
- Stack: [framework + DB + auth + deployment]
- Platform: [web / mobile / PWA]
- External integrations: [list or none]
- Environment variables needed: [list]

AGENT:
- Agent: [name]
- Task size preference: [normal / split smaller for heavy-load hours]

Generate:
1. agent-rules.md — full agent system rules
2. [project-name]-plan.md — full layered work plan

Follow the Layered Build Methodology:
- One layer at a time, DB before API, API before UI
- Every task has a full prompt and a binary checklist
- Every prompt ends with "Update README.md. Update state.md."
- Use the standard layer order (Init → DB → Auth → API → Hooks → UI → Platform → Deploy)
- All content in English
```

---

## Quick Reference Card

```
NEW PROJECT                          EXISTING PROJECT
─────────────────────────────────    ────────────────────────────────
1. Answer intake questions           1. Run audit prompt
2. Generate agent-rules.md           2. Generate state.md from audit
3. Generate plan.md                  3. Answer intake for missing features
4. Paste rules into agent settings   4. Generate plan for remaining layers
5. Start at Layer 01A                5. Start from current layer
6. Checklist ✅ before ➡️           6. Checklist ✅ before ➡️
```
