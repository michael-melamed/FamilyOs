# 📁 app/join/[code]/

## Purpose
Handles the join-household flow when a user clicks an invite link (`/join/XXXXXX`) or enters a code manually.

## Flow & UX
1. Extract `code` from the URL params.
2. Check if user is authenticated via Supabase session.
   - If not logged in → redirect to `/login?redirect=/join/[code]`.
3. Fetch the household name associated with the code to show a friendly confirmation prompt: "הצטרף ל־[Household Name]?".
4. User clicks explicit "[ הצטרף ]" button.
5. Calls `POST /api/household/join` with the code.
6. Handles error states gracefully:
   - **409 Conflict**: Shows "כבר חבר בקבוצה זו" and provides a link to dashboard.
   - **404/Invalid**: Shows "קישור לא תקין או פג תוקף" and provides a link back to dashboard.
   - **Success**: Redirects to `/dashboard`.

## Dependencies
- `/api/household/join` (POST)
- `@/lib/supabase/client`
