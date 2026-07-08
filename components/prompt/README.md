# `components/prompt/` — PromptBar

Read `state.md` before editing. Read this file before editing any component here.

---

## Purpose

The PromptBar is the main human→agent interface. The user types a free-text Hebrew or English instruction, which is sent to the `/api/agent` route. Claude 3.5 parses the intent and executes DB mutations via Server Actions.

---

## Components

| Component | File | Description |
|-----------|------|-------------|
| `PromptBar` | `PromptBar.tsx` | Fixed bottom input bar. Sends prompt to `/api/agent`, fires `onAgentResponse` callback with the agent's Hebrew summary. |

---

## Data Flow

```
User types text → PromptBar
  → POST /api/agent { familyId, message }
      → Claude 3.5 parses intent → JSON action list
      → Server Actions executed (createTask, addShoppingItem, etc.)
      → Returns { summary: string } (Hebrew)
  → onAgentResponse(summary) called in dashboard/page.tsx
  → successToast shown + useBoard.refetch() triggered
```

---

## Key Rules

- `PromptBar` is a **Client Component** (`'use client'`).
- It receives `familyId` (= householdId) and `onAgentResponse` as props.
- It is **disabled** when `familyId` is undefined (user not yet in a household).
- Never add DB logic here — all mutations happen server-side via `/api/agent`.

