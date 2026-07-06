# Project State — FamilyOS

## Current Stage
Layer 08 — Deployment & Quality Assurance
Last completed: 08A (GitHub Push, TypeScript checks, and Vercel environment setup)
Next: 02B (Fixing missing TypeScript definitions for Households, Lists, Permissions, and Invite Codes)

## Completed Tasks
- **01A (Project Init):** Next.js 14 App Router project structured with README.md files in every folder.
- **01B (Library Config):** Supabase client (browser & server), cookie handling, and route-protecting middleware configured.
- **02A (Database Schema):** Applied migrations for the initial schema (`families`, `tasks`, `shopping_items`, `family_memory`, `agent_logs`), households schema (`households`, `household_members`, `household_permissions`, `invite_codes`, `lists`), and RLS fixes for shopping items.
- **02B (TypeScript Types - Partial):** Basic models for Task, ShoppingItem, and FamilyMemory defined in `types/index.ts` (missing new household-related models).
- **03A (Authentication):** Google OAuth login page, auth callback route, and dynamic origin redirection implemented.
- **03B (Auto-Profile Bootstrapping):** Auto-creation of households and family members upon first login defined in `/auth/callback` callback route.
- **04A-C (API & Actions):**
  - POST `/api/agent` for AI natural language processing (Claude 3.5 Sonnet).
  - POST `/api/household/join` for joining a household.
  - Server Actions in `lib/actions/` for tasks, memory, households, and shopping management.
- **05A (Custom Hooks):** `useBoard.ts` (realtime sync), `useHouseholdRealtime.ts` (active household monitoring), and `usePrompt.ts` (agent dispatching).
- **06A-B (UI Screens):**
  - Interactive `/dashboard` with inline editing/deleting of tasks.
  - `/household/settings` for household management and invite code sharing.
  - `/household/setup` for onboarding.
  - `/join/[code]` for joining groups.
- **07A (Platform - Partial):** `manifest.json` configured in `public/` (missing PWA icons and service worker setup).
- **08A (Deployment):** Repository pushed to GitHub, TypeScript error-free (`npx tsc --noEmit` verified), Vercel environment variables mapped.

## Critical Decisions Made
- **Additive Database Modeling:** The new `households` schema runs alongside the legacy `families` schema (using `household_id` and `family_id` for backward compatibility).
- **Service Role RLS Bypass:** Using `SUPABASE_SERVICE_ROLE_KEY` inside server-side invite/join endpoints to bypass Row Level Security constraints for non-member lookup.
- **Comprehensive Folder documentation:** Strict adherence to folder-specific `README.md` files describing components, routes, and hooks.

## Critical Files
- `lib/supabase/client.ts` — Client-side Supabase initializer
- `lib/supabase/server.ts` — Server-side Supabase client (SSR)
- `middleware.ts` — Auth routing guard
- `types/index.ts` — TypeScript types
- `app/auth/callback/route.ts` — OAuth callback & onboarding bootstrap
- `app/join/[code]/page.tsx` — Invite page
- `components/dashboard/Board.tsx` — Main dashboard layout
