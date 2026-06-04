# 🖥️ MISSION 04 — UI
# משימה 04 — ממשק משתמש

> **PREREQUISITE | דרישה מוקדמת**
> Missions 01, 02, and 03 must be fully verified before starting this mission.
> משימות 01, 02, ו-03 חייבות להיות מאומתות לפני שמתחילים משימה זו.

---

## 🎯 GOAL OF THIS MISSION | מטרת המשימה

Build the complete UI:
- Dashboard with live task and shopping lists
- PromptBar — free-text input fixed to bottom of screen
- Header with hamburger menu and realtime update indicator
- Sidebar with settings and memory editor
- Full RTL Hebrew support
- PWA manifest

בניית ממשק המשתמש המלא:
- דשבורד עם רשימות משימות וקניות חיות
- PromptBar — שורת קלט חופשי קבועה בתחתית המסך
- כותרת עם תפריט המבורגר וחיווי עדכון בזמן אמת
- סיידבר עם הגדרות ועורך זיכרון
- תמיכה מלאה ב-RTL עברית
- PWA manifest

---

## ✅ VERIFICATION — HOW TO KNOW THIS MISSION SUCCEEDED
## אימות — איך יודעים שהמשימה הצליחה

- [ ] Dashboard loads with empty lists (no errors in console)
- [ ] Typing a Hebrew prompt in PromptBar and submitting → shows loading state → board updates
- [ ] Checking a task manually → task shows as done immediately (optimistic update)
- [ ] Opening the app on mobile → layout looks correct, PromptBar is accessible
- [ ] Opening two browser tabs → change in one tab → other tab updates within 2 seconds (realtime)
- [ ] Hamburger menu opens Sidebar
- [ ] Red dot 🔴 appears in header when other user made a change

---

## 🖥️ UI LAYOUT SPEC
## מפרט ממשק

```
┌──────────────────────────────┐
│  ☰  FamilyOS          🔴    │  ← Header.tsx
│     [realtime indicator]     │
├──────────────────────────────┤
│                              │
│  📋 משימות                   │  ← TaskList.tsx
│  ┌─────────────────────────┐ │
│  │ ☐  שטיפת רצפות          │ │  ← TaskItem.tsx
│  │ ✅ כביסה         תמר   │ │
│  │ ☐  ניקוי מרפסת          │ │
│  └─────────────────────────┘ │
│  [+ הוסף משימה]              │
│                              │
│  🛒 קניות                    │  ← ShoppingList.tsx
│  ┌─────────────────────────┐ │
│  │ ☐  חלב                  │ │
│  │ ☐  לחם                  │ │
│  └─────────────────────────┘ │
│  [+ הוסף פריט]               │
│                              │
├──────────────────────────────┤
│  🎤 [ כתוב או הקלד... ]  ➤  │  ← PromptBar.tsx (fixed bottom)
└──────────────────────────────┘
```

**Sidebar (slides in from right on hamburger click):**
```
┌─────────────────────┐
│  ✕  הגדרות          │
├─────────────────────┤
│  👤 פרופיל משפחה    │
│  🧠 זיכרון הסוכן    │
│  🔔 התראות          │
│  👥 ניהול משתמשים   │
│  📄 ייצוא לקובץ     │
│  💳 תוכנית תשלום    │
└─────────────────────┘
```

---

## 📁 COMPONENTS TO BUILD
## קומפוננטים לבנייה

### `components/layout/Header.tsx`
```typescript
/**
 * @file Header.tsx
 * @description_he כותרת האפליקציה — המבורגר, שם, חיווי realtime
 * @description_en App header — hamburger menu, app name, realtime update indicator
 * @inputs    onMenuClick: () => void, hasRecentUpdate: boolean, updatedBy?: string
 * @outputs   JSX header element
 * @depends_on hooks/useBoard.ts (for realtime indicator state)
 * @used_by   app/dashboard/page.tsx
 * @fix_guide
 *   - Realtime dot not appearing → check useBoard passes hasRecentUpdate correctly
 *   - RTL layout broken → verify parent has dir="rtl"
 */

// Features:
// - Hamburger icon (right side in RTL) → calls onMenuClick
// - App name "FamilyOS" centered
// - Red dot indicator: shows when another user updated in last 60 seconds
//   Red dot shows tooltip: "תמר עדכנה לפני 30 שניות"
```

### `components/layout/Sidebar.tsx`
```typescript
/**
 * @file Sidebar.tsx
 * @description_he תפריט צד — הגדרות, זיכרון, ניהול משתמשים
 * @description_en Side menu — settings, memory editor, user management
 * @inputs    isOpen: boolean, onClose: () => void, familyId: string
 * @outputs   JSX sidebar panel
 * @depends_on lib/actions/memory.ts
 * @used_by   app/dashboard/page.tsx
 * @fix_guide
 *   - Sidebar appears behind content → check z-index (should be z-50)
 *   - Slides from wrong side → in RTL should slide from right (right-0)
 */

// Sections:
// 1. Family Profile — family name, members list
// 2. Agent Memory — list of key/value memory items, editable
// 3. Notifications — toggle push notifications (future)
// 4. User Management — invite link generator
// 5. Export — download tasks as PDF (calls existing PDF logic)
// 6. Plan — placeholder for payment plan (future)
```

### `components/dashboard/Board.tsx`
```typescript
/**
 * @file Board.tsx
 * @description_he קונטיינר הדשבורד — מחזיק TaskList ו-ShoppingList, מנהל state
 * @description_en Dashboard container — holds TaskList and ShoppingList, manages state
 * @inputs    familyId: string
 * @outputs   JSX board container
 * @depends_on hooks/useBoard.ts, components/dashboard/TaskList.tsx, ShoppingList.tsx
 * @used_by   app/dashboard/page.tsx
 * @fix_guide
 *   - Board not updating after prompt → check usePrompt calls refetch after agent response
 *   - Infinite re-renders → check useBoard dependency array in useEffect
 */
```

### `components/dashboard/TaskList.tsx`
```typescript
/**
 * @file TaskList.tsx
 * @description_he רשימת משימות — מציגה משימות על וכפתור הוספה
 * @description_en Task list — shows top-level tasks and add button
 * @inputs    tasks: Task[], familyId: string, onUpdate: () => void
 * @outputs   JSX task list section
 * @depends_on components/dashboard/TaskItem.tsx, lib/actions/tasks.ts
 * @used_by   components/dashboard/Board.tsx
 * @fix_guide
 *   - Sub-tasks not showing → check tasks filter by parent_id
 */
```

### `components/dashboard/TaskItem.tsx`
```typescript
/**
 * @file TaskItem.tsx
 * @description_he פריט משימה בודד — צ'קבוקס, כותרת, אחראי, עריכה
 * @description_en Single task item — checkbox, title, assignee, inline edit
 * @inputs    task: Task, onUpdate: () => void
 * @outputs   JSX task row
 * @depends_on lib/actions/tasks.ts
 * @used_by   components/dashboard/TaskList.tsx
 * @fix_guide
 *   - Checkbox click not saving → check completeTask server action is awaited
 *   - Optimistic update flickering → implement local state before server call
 */

// Features:
// - Checkbox → calls completeTask() → optimistic update (check immediately, confirm from server)
// - Task title → click to edit inline (input field replaces text)
// - Assignee badge (if set) — small pill on the left in RTL
// - Long press or swipe → delete option (mobile)
```

### `components/dashboard/ShoppingList.tsx`
```typescript
/**
 * @file ShoppingList.tsx
 * @description_he רשימת קניות — צ'קבוקס לכל פריט, כפתור ניקוי
 * @description_en Shopping list — checkbox per item, clear checked button
 * @inputs    items: ShoppingItem[], familyId: string, onUpdate: () => void
 * @outputs   JSX shopping list section
 * @depends_on lib/actions/shopping.ts
 * @used_by   components/dashboard/Board.tsx
 * @fix_guide
 *   - Checked items not clearing → check clearCheckedItems receives correct familyId
 */
```

### `components/prompt/PromptBar.tsx`
```typescript
/**
 * @file PromptBar.tsx
 * @description_he שורת קלט חופשי קבועה בתחתית — לב האינטראקציה עם הסוכן
 * @description_en Fixed free-text input bar at bottom — the heart of agent interaction
 * @inputs    familyId: string, onAgentResponse: (summary: string) => void
 * @outputs   JSX input bar
 * @depends_on hooks/usePrompt.ts
 * @used_by   app/dashboard/page.tsx
 * @fix_guide
 *   - Bar covered by mobile keyboard → add padding-bottom to board equal to bar height
 *   - Submit button not working → check usePrompt handles Enter key and button click
 *   - Hebrew text direction wrong → add dir="rtl" to the input element itself
 */

// Features:
// - Fixed to bottom of screen (position: fixed, bottom: 0)
// - Text input with Hebrew placeholder: "מה קרה? מה צריך לעשות?..."
// - Submit button (arrow icon)
// - Loading spinner while agent processes
// - After response: show summary toast for 3 seconds, then clear input
// - Height: ~56px, full width, slight shadow above
```

---

## 🪝 HOOKS TO BUILD
## Hooks לבנייה

### `hooks/useBoard.ts`
```typescript
/**
 * @file useBoard.ts
 * @description_he Hook לניהול state הדשבורד — טעינה, realtime, עדכון
 * @description_en Hook for dashboard state management — loading, realtime, update
 * @inputs    familyId: string
 * @outputs   { tasks, shoppingItems, isLoading, refetch, hasRecentUpdate, lastUpdatedBy }
 * @depends_on lib/supabase/client.ts, lib/supabase/realtime.ts
 * @used_by   components/dashboard/Board.tsx, components/layout/Header.tsx
 * @fix_guide
 *   - Data not loading → check familyId is not undefined on first render
 *   - Realtime not working → check supabase_realtime publication includes the table
 */

// Responsibilities:
// 1. Initial data fetch for tasks and shopping items
// 2. Subscribe to realtime changes on both tables
// 3. Track who made the last update and when (for header indicator)
// 4. Expose refetch() for after agent response
```

### `hooks/usePrompt.ts`
```typescript
/**
 * @file usePrompt.ts
 * @description_he Hook לניהול שליחת פרומפט לסוכן
 * @description_en Hook for managing prompt submission to agent
 * @inputs    familyId: string, onSuccess: (summary: string) => void
 * @outputs   { prompt, setPrompt, submit, isLoading, error }
 * @depends_on none (uses fetch to /api/agent)
 * @used_by   components/prompt/PromptBar.tsx
 * @fix_guide
 *   - Request not reaching agent → check /api/agent route exists and is POST
 *   - isLoading stuck → ensure finally block resets isLoading to false
 */
```

---

## 📱 PWA CONFIGURATION
## הגדרת PWA

Create `public/manifest.json`:
```json
{
  "name": "FamilyOS",
  "short_name": "FamilyOS",
  "description": "מנהל משימות משפחתי חכם",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#ffffff",
  "theme_color": "#1B2A4A",
  "dir": "rtl",
  "lang": "he",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

Add to `app/layout.tsx`:
```tsx
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#1B2A4A" />
<meta name="mobile-web-app-capable" content="yes" />
```

---

## 🎨 DESIGN TOKENS
## ערכי עיצוב

```typescript
// Use these Tailwind classes consistently:

// Colors
// Primary dark:  bg-[#1B2A4A]  text-[#1B2A4A]
// Primary mid:   bg-[#2E4A7A]
// Success green: text-[#1A7A4A]  bg-[#E8F5EE]
// Background:    bg-[#F4F7FB]
// Border:        border-[#C8D4E8]

// Typography
// Headings: font-bold text-[#1B2A4A]
// Body:     text-[#1B2A4A]
// Subtext:  text-[#4A5568]

// Spacing — mobile first
// PromptBar height: h-14 (56px)
// Board padding bottom: pb-16 (to clear PromptBar)
// Item padding: py-3 px-4
```

---

## 🚫 WHAT NOT TO DO IN THIS MISSION
## מה לא לעשות במשימה זו

- ❌ Do NOT call Claude API directly from any component
- ❌ Do NOT import `lib/agent/parser.ts` in any component
- ❌ Do NOT use `localStorage` — all state comes from Supabase
- ❌ Do NOT forget `dir="rtl"` on input elements
- ❌ Do NOT build payment or advanced notification features now — placeholders only

---

## 🏁 FINAL CHECKLIST — MISSION 04 COMPLETE
## צ'קליסט סופי — משימה 04 הושלמה

- [ ] All components have header comment blocks
- [ ] All folders have README.md
- [ ] App works end-to-end: type prompt → board updates
- [ ] Realtime sync works between two browser tabs
- [ ] Mobile layout is usable (test in Chrome DevTools)
- [ ] PWA manifest is in place
- [ ] No TypeScript errors (`npx tsc --noEmit`)
- [ ] No API keys in client-side code

---

## 🎉 AFTER ALL 4 MISSIONS — NEXT STEPS
## אחרי כל 4 המשימות — צעדים הבאים

1. **Deploy to Vercel** — connect GitHub repo, add env vars in Vercel dashboard
2. **Invite Tamar** — use the invite link from Sidebar
3. **Seed memory** — add family context via Sidebar → Agent Memory
4. **Test real prompts** — start using it daily
5. **Iterate** — what's missing? what's annoying? fix it in small tasks

---

*Mission 4 of 4 | FamilyOS / LiveCode Project*
*משימה 4 מתוך 4 | פרויקט FamilyOS / לייב קוד*
