# 📁 app/household/setup/

## Purpose
The first-time flow page for authenticated users who are not yet members of any household.

## Features
- **Create Household**: Takes a name and calls `POST /api/household/create`. Also bootstraps two default lists ("משימות" and "קניות") to populate the new dashboard automatically.
- **Join Household**: Takes a 6-character invite code and redirects the user to `/join/[code]`.

## Security
If a user without a household visits `/dashboard`, they are automatically redirected here. If they already have a household, this page functions as a fallback if they are removed from their household.
