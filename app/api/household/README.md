# 📁 app/api/household/

API routes for household management. All routes require authentication.

## Route Table

| Method | Path | Auth Level | Description |
|--------|------|-----------|-------------|
| `POST` | `/api/household/create` | Authenticated | Create a new household; caller becomes admin |
| `POST` | `/api/household/join` | Authenticated | Join a household via invite code |
| `GET` | `/api/household/invite` | Admin only | Get current active invite code + URL |
| `POST` | `/api/household/invite/regenerate` | Admin only | Deactivate old codes, generate new 6-char uppercase code |
| `GET` | `/api/household/members` | Authenticated | List all members of the caller's household |
| `POST` | `/api/household/members/remove` | Admin only | Remove a member (cannot remove last admin) |
| `GET` | `/api/household/permissions` | Authenticated | Get household permission flags |
| `PUT` | `/api/household/permissions` | Admin only | Update permission flags |
| `POST` | `/api/household/lists/lock` | Admin only | Lock or unlock a list |
| `DELETE` | `/api/household/dissolve` | Admin only | Permanently delete household + all data |

## Security Model

All routes:
1. Verify `session` exists → 401 if not
2. Resolve `household_id` from `household_members` via session (never from URL/body)
3. Admin-required routes check `role = 'admin'` → 403 if not

## Notes

- Invite codes are 6 characters, uppercase, no ambiguous characters (0, O, 1, I)
- `dissolve` requires `confirm: true` in the request body as a hard stop
- `remove` prevents removing the last admin (400)
