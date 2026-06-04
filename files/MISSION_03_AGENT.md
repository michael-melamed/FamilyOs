# 🤖 MISSION 03 — AGENT CORE
# משימה 03 — ליבת הסוכן

> **PREREQUISITE | דרישה מוקדמת**
> Missions 01 and 02 must be fully verified before starting this mission.
> משימות 01 ו-02 חייבות להיות מאומתות לפני שמתחילים משימה זו.

---

## 🎯 GOAL OF THIS MISSION | מטרת המשימה

Build the AI agent core — the brain of FamilyOS:
- Claude API integration
- Free-text Hebrew/English parser
- Memory loading and saving
- Server actions for all board operations

בניית ליבת הסוכן — המוח של FamilyOS:
- חיבור ל-Claude API
- פרסר טקסט חופשי בעברית/אנגלית
- טעינה ושמירה של זיכרון
- Server Actions לכל פעולות הלוח

---

## ✅ VERIFICATION — HOW TO KNOW THIS MISSION SUCCEEDED
## אימות — איך יודעים שהמשימה הצליחה

Run this test in the browser console or a test script:

```typescript
// Test: send a Hebrew prompt and verify JSON response
const result = await fetch('/api/agent/test', {
  method: 'POST',
  body: JSON.stringify({
    prompt: 'גמרתי לכבס, תוסיף חלב לקניות'
  })
})
const data = await result.json()
console.log(data)

// Expected output shape:
// {
//   actions: [
//     { type: 'COMPLETE_TASK', task_id: '...' },   // or INFER if no match
//     { type: 'ADD_SHOPPING', item: 'חלב' }
//   ],
//   summary: 'סימנתי את הכביסה כהושלמה והוספתי חלב לרשימת הקניות'
// }
```

- [ ] Response is valid JSON matching `AgentOutput` type
- [ ] `summary` is in Hebrew
- [ ] No API key appears in any client-side code or response
- [ ] `agent_logs` table in Supabase shows a new row after the test

---

## 🤖 AGENT SYSTEM PROMPT
## פרומפט המערכת של הסוכן

Use this EXACT system prompt in `lib/agent/parser.ts`. Do not modify it.

```
You are a family task management assistant for an Israeli family.
You receive a free-text message in Hebrew or English.
You must parse it and return ONLY a valid JSON object — no markdown, no explanation, no text outside the JSON.

Return this exact shape:
{
  "actions": [...],
  "summary": "..."
}

Action types:
{ "type": "COMPLETE_TASK",  "task_id": "INFER:[title]" }
{ "type": "ADD_TASK",       "title": "...", "assignee": "..." }
{ "type": "ADD_SHOPPING",   "item": "...",  "quantity": "..." }
{ "type": "UPDATE_TASK",    "task_id": "INFER:[title]", "changes": { "status": "in_progress" } }
{ "type": "UPDATE_MEMORY",  "key": "...", "value": "...", "category": "general|member|preference|routine" }
{ "type": "NO_ACTION",      "message": "..." }

Rules:
1. Return ONLY valid JSON. Nothing else.
2. "done", "גמרתי", "סיימתי", "הושלם", "✓" → COMPLETE_TASK
3. "צריך", "תוסיף משימה", "יש לעשות" → ADD_TASK
4. "תקנה", "קנה", "תוסיף לקניות", "חסר" → ADD_SHOPPING
5. A name (תמר, מיכאל, ישי) in context of a task → set as assignee
6. New personal info ("אני אוהב...", "אנחנו רגיל...") → UPDATE_MEMORY
7. summary must ALWAYS be in Hebrew, 1-2 sentences max
8. For COMPLETE_TASK and UPDATE_TASK: if no task_id is known, use "INFER:[task title from message]"
9. One message can produce multiple actions — return all of them in the array
```

---

## 📁 FILES TO WRITE IN THIS MISSION
## קבצים לכתיבה במשימה זו

### `lib/agent/schema.ts`
```typescript
/**
 * @file schema.ts
 * @description_he טיפוסי TypeScript לפלט הסוכן — החוזה בין הסוכן לשאר המערכת
 * @description_en TypeScript types for agent output — the contract between agent and the rest of the system
 * @inputs    none — types only
 * @outputs   AgentAction, AgentOutput types
 * @depends_on none
 * @used_by   lib/agent/parser.ts, lib/actions/tasks.ts, lib/actions/shopping.ts
 * @fix_guide
 *   - If type errors appear in parser.ts → check this file matches the system prompt action shapes exactly
 */

export type AgentAction =
  | { type: 'COMPLETE_TASK';  task_id: string }
  | { type: 'ADD_TASK';       title: string; assignee?: string }
  | { type: 'ADD_SHOPPING';   item: string; quantity?: string }
  | { type: 'UPDATE_TASK';    task_id: string; changes: Partial<Task> }
  | { type: 'UPDATE_MEMORY';  key: string; value: string; category: MemoryCategory }
  | { type: 'NO_ACTION';      message: string }

export type AgentOutput = {
  actions: AgentAction[]
  summary: string
}
```

### `lib/agent/parser.ts`
SERVER ONLY — never import in client components.
```typescript
/**
 * @file parser.ts
 * @description_he שולח פרומפט ל-Claude API עם זיכרון המשפחה, מחזיר AgentOutput
 * @description_en Sends prompt to Claude API with family memory, returns AgentOutput
 * @inputs    prompt: string, familyId: string, existingTasks: Task[]
 * @outputs   Promise<AgentOutput>
 * @depends_on lib/agent/schema.ts, lib/supabase/server.ts, ANTHROPIC_API_KEY env var
 * @used_by   app/api/agent/route.ts
 * @fix_guide
 *   - "API key not found" → check ANTHROPIC_API_KEY in .env.local
 *   - "JSON parse error" → Claude returned non-JSON; add retry logic or check system prompt
 *   - "task_id INFER:[...]" in actions → UI must resolve these against real task titles
 * @integration_guide
 *   1. Import parsePrompt from this file in app/api/agent/route.ts only
 *   2. Pass familyId to load memory automatically
 *   3. Pass current tasks array so agent can match task titles to IDs
 */

// Implementation notes for the agent:
// 1. Load family memory from Supabase before calling Claude
// 2. Load current task titles+IDs from Supabase
// 3. Build messages array with system prompt + memory context + current tasks + user prompt
// 4. Call Claude API with model: 'claude-sonnet-4-6', max_tokens: 1000
// 5. Parse response as JSON → validate against AgentOutput shape
// 6. Resolve INFER:[title] task_ids against real task IDs from the loaded tasks
// 7. Save prompt + actions + summary to agent_logs table
// 8. Return AgentOutput
```

### `app/api/agent/route.ts`
API route that receives prompts from the frontend.
```typescript
/**
 * @file route.ts (API route: POST /api/agent)
 * @description_he נקודת הכניסה של הסוכן — מקבל פרומפט, מחזיר פעולות ומריץ אותן
 * @description_en Agent entry point — receives prompt, returns actions and executes them
 * @inputs    POST body: { prompt: string }
 * @outputs   JSON: { summary: string, actionsExecuted: number }
 * @depends_on lib/agent/parser.ts, lib/actions/tasks.ts, lib/actions/shopping.ts
 * @used_by   hooks/usePrompt.ts (client-side fetch)
 * @fix_guide
 *   - 401 error → user not authenticated; check Supabase session
 *   - 500 error → check agent_logs table for the failed prompt
 * @integration_guide
 *   This route is the ONLY entry point to the agent.
 *   Frontend always calls POST /api/agent — never calls parser.ts directly.
 */

// Implementation notes:
// 1. Authenticate user via Supabase server client
// 2. Get user's family_id from family_members table
// 3. Call parsePrompt(prompt, familyId, tasks)
// 4. Execute each action using lib/actions/* server actions
// 5. Return { summary, actionsExecuted: actions.length }
```

### `lib/actions/tasks.ts`
```typescript
/**
 * @file tasks.ts
 * @description_he Server Actions לניהול משימות — יצירה, עדכון, מחיקה
 * @description_en Server Actions for task management — create, update, delete
 * @inputs    Various: taskId, title, status, assignee, familyId
 * @outputs   Promise<Task> or Promise<void>
 * @depends_on lib/supabase/server.ts, types/index.ts
 * @used_by   app/api/agent/route.ts, components/dashboard/TaskItem.tsx
 * @fix_guide
 *   - RLS error → user's family_id doesn't match task's family_id
 *   - "use server" missing → add 'use server' directive at top of file
 * @integration_guide
 *   Import individual named exports — never import the whole file
 *   Example: import { createTask, updateTask } from '@/lib/actions/tasks'
 */

// Export these functions:
// createTask(familyId, title, assignee?) → Task
// updateTask(taskId, changes) → Task
// deleteTask(taskId) → void
// completeTask(taskId) → Task  (sets status: 'done')
```

### `lib/actions/shopping.ts`
```typescript
/**
 * @file shopping.ts
 * @description_he Server Actions לרשימת קניות
 * @description_en Server Actions for shopping list
 * @inputs    item name, quantity, familyId, itemId
 * @outputs   Promise<ShoppingItem> or Promise<void>
 * @depends_on lib/supabase/server.ts, types/index.ts
 * @used_by   app/api/agent/route.ts, components/dashboard/ShoppingList.tsx
 * @fix_guide
 *   - Duplicate items → check unique constraint; use upsert if needed
 */

// Export these functions:
// addShoppingItem(familyId, name, quantity?) → ShoppingItem
// toggleShoppingItem(itemId) → ShoppingItem
// deleteShoppingItem(itemId) → void
// clearCheckedItems(familyId) → void
```

### `lib/actions/memory.ts`
```typescript
/**
 * @file memory.ts
 * @description_he Server Actions לניהול זיכרון הסוכן
 * @description_en Server Actions for agent memory management
 * @inputs    familyId, key, value, category
 * @outputs   Promise<FamilyMemory[]> or Promise<FamilyMemory>
 * @depends_on lib/supabase/server.ts, types/index.ts
 * @used_by   lib/agent/parser.ts, components/layout/Sidebar.tsx
 * @fix_guide
 *   - Memory not loading in agent → check loadMemory returns all rows for familyId
 */

// Export these functions:
// loadMemory(familyId) → FamilyMemory[]   ← used by parser before every Claude call
// upsertMemory(familyId, key, value, category) → FamilyMemory
// deleteMemory(familyId, key) → void
```

---

## 🔒 SECURITY RULES FOR THIS MISSION
## כללי אבטחה למשימה זו

- ✅ `ANTHROPIC_API_KEY` is used ONLY in `lib/agent/parser.ts` (server-side)
- ✅ `SUPABASE_SERVICE_ROLE_KEY` is used ONLY in server-side files
- ❌ NEVER import `lib/agent/parser.ts` in any component or client-side hook
- ❌ NEVER expose API keys in API responses
- ❌ NEVER log full prompts to console in production

---

## 🚫 WHAT NOT TO DO IN THIS MISSION
## מה לא לעשות במשימה זו

- ❌ Do NOT build any UI (Mission 4)
- ❌ Do NOT call Claude API from the client side — only through `/api/agent`
- ❌ Do NOT store API keys in the database

---

*Mission 3 of 4 | FamilyOS / LiveCode Project*
*משימה 3 מתוך 4 | פרויקט FamilyOS / לייב קוד*
