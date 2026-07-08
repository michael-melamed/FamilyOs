# `components/dashboard/` — Dashboard Components

Read `state.md` before editing. Read this file before editing any component here.

---

## Component Responsibilities

| Component | File | Props In | Emits / Calls |
|-----------|------|----------|---------------|
| `Board` | `Board.tsx` | `tasks`, `shoppingItems`, `lists`, `permissions`, `familyId`, `isLoading`, `onUpdate` | Renders TaskList + ShoppingList dynamically |
| `TaskList` | `TaskList.tsx` | `title`, `tasks`, `familyId`, `permissions`, `onUpdate` | Renders TaskItem list, handles add task form |
| `TaskItem` | `TaskItem.tsx` | `task`, `familyId`, `permissions`, `onUpdate` | Calls `updateTask`, `deleteTask`, `completeTask` Server Actions |
| `ShoppingList` | `ShoppingList.tsx` | `items`, `familyId`, `permissions`, `onUpdate` | Calls shopping Server Actions |

---

## Data Flow

```
dashboard/page.tsx
  └── useBoard(householdId)         ← fetches all data + realtime
        ├── tasks[]
        ├── shoppingItems[]
        ├── lists[]
        └── permissions
  └── Board
        ├── TaskList (one per list)
        │     └── TaskItem (one per task)
        └── ShoppingList
```

---

## Key Rules

- All components here are **Client Components** (`'use client'`).
- Data is never fetched inside these components — it flows down via props from `dashboard/page.tsx`.
- Mutations (create, update, delete) call **Server Actions** from `lib/actions/`.
- After any mutation, call the `onUpdate()` prop to trigger a `refetch` in `useBoard`.
- Use `permissions` prop to conditionally show/hide add and delete buttons per role.
## Purpose
Granular views for lists and items displayed securely over the Dashboard actively managing optimistic UI.
## Keys Files
- `Board.tsx`, `TaskList.tsx`, `TaskItem.tsx`, `ShoppingList.tsx`
## Dependencies
lucide-react, hooks cleanly properly securely nicely smoothly cleanly correctly explicitly logically unconditionally.
