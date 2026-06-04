# Household UI Routes

This directory contains the core user interfaces for setting up and managing a FamilyOS household.

## `/household/setup`
The initial landing experience for users who do not yet belong to a household. 
*   **Create**: Allows the user to input a name to initialize a brand new household.
*   **Join**: Prompts the user for a manual invite code to join an existing household.

## `/household/settings`
The management dashboard for the active household. The view is dynamically adjusted based on the user's role:
*   **Admin View**: Contains 5 tabs (Content, Design, Members, Permissions, Notifications). Allows full control over the household, including a danger zone button at the bottom for dissolving the household (requires typed confirmation).
*   **Member View**: Contains 3 tabs (Display, Personal Design, Notifications). Restricts access from destructive or managerial actions. UI elements like "Add Task" or "Delete List" are hidden or disabled based on the permissions managed by admins.
