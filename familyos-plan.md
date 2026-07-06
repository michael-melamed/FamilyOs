# FamilyOS — Layered Build Plan

This plan details the remaining tasks required to align FamilyOS with the Layered Build Methodology.

---

## 🎯 Layered Work Plan

### Layer 02 — Database Types
#### Task 02B: Align TypeScript Types with Households Schema
- **What to build:** Update `types/index.ts` to include the full schema definitions for the new household model introduced in `007a_households.sql`.
- **Details:**
  - Add types/interfaces for:
    - `Household` (`id`, `name`, `created_by`, `created_at`)
    - `HouseholdMember` (`id`, `household_id`, `user_id`, `role`, `joined_at`)
    - `HouseholdPermission` (`id`, `household_id`, `can_add_tasks`, `can_delete_tasks`, `can_clear_lists`, `can_delete_lists`, `can_add_to_specific_lists_only`, `allowed_list_ids`)
    - `InviteCode` (`id`, `household_id`, `code`, `created_by`, `created_at`, `expires_at`, `is_active`)
    - `List` (`id`, `household_id`, `name`, `is_locked`, `created_by`, `created_at`)
  - Update `Task` type to include optional `household_id: string`.
- **Checklist:**
  - [ ] `types/index.ts` contains interfaces for `Household`, `HouseholdMember`, `HouseholdPermission`, `InviteCode`, and `List`.
  - [ ] `Task` type has `household_id?: string`.
  - [ ] Running `npx tsc --noEmit` returns no compilation errors.

---

### Layer 07 — Platform Layer (PWA)
#### Task 07A: Complete PWA Icon Assets
- **What to build:** Create the missing PWA icon files `icon-192.png` and `icon-512.png` referenced in `public/manifest.json`.
- **Details:**
  - Add PNG images matching these dimensions to the `public/` directory (can be generated using simple colored brand squares/logos).
- **Checklist:**
  - [ ] `public/icon-192.png` exists in the filesystem.
  - [ ] `public/icon-512.png` exists in the filesystem.
  - [ ] PWA manifest audit does not throw missing asset warnings.

---

### Layer 08 — Deployment
#### Task 08B: Supabase Auth Redirect Validation
- **What to build:** Configure and verify production redirects on Supabase and Vercel.
- **Details:**
  - Set up environment variables on Vercel.
  - Add the Vercel app URL (`https://[project-name].vercel.app/auth/callback`) to Supabase allowed Redirect URLs list.
  - Test Google OAuth from the production build and verify it redirects back to the Vercel domain (not localhost).
- **Checklist:**
  - [ ] Vercel dashboard shows active environment variables.
  - [ ] Supabase Authentication Redirect URLs contain the Vercel app callback.
  - [ ] Logging in from Vercel production UI redirects back to the Vercel dashboard.

---

## 🚀 Execution Order
1. **Task 02B** (Database Types Alignment) ➡️
2. **Task 07A** (PWA Assets completion) ➡️
3. **Task 08B** (Production Deploy & Auth redirect verification)

*Rule: Every task checklist must be fully verified (✅) before moving to the next task (➡️).*
