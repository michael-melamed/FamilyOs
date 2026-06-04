# 📁 app/household/settings/

## Purpose
The centralized configuration page for a household, with conditional views for Admins vs Members.

## Admin View (5 Tabs)
1. **תוכן (Lists)**: Manage lists (rename, lock/unlock via `/api/household/lists/lock`, delete, create). Uses direct Supabase client calls leveraging RLS since there are no custom API routes for generic list CRUD.
2. **עיצוב**: Placeholder for theme settings.
3. **משתתפים (Members)**: Lists active members and allows removal (excluding the last admin). Calls `/api/household/members/remove`.
4. **הרשאות (Permissions)**: Toggles for member capabilities (e.g. `can_add_tasks`). Saves immediately on change via `PUT /api/household/permissions`.
5. **התראות (Notifications)**: Placeholder.
- **Danger Zone**: Dissolve the household permanently. Requires typing "DELETE". Calls `DELETE /api/household/dissolve`.

## Member View (3 Tabs)
1. **תצוגה**: Read-only display of available lists.
2. **עיצוב אישי**: Placeholder for personal theme settings.
3. **התראות**: Placeholder.

## Security
This page enforces Role-Based Access Control (RBAC). It checks the user's role on load and renders the appropriate tabs. Direct actions (like deleting a list) are protected by Row Level Security (RLS) policies configured in `007a_households.sql`.
