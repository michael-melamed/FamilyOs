-- ============================================================
-- FamilyOS — Mission: Notification Preferences
-- Migration: 011_notification_prefs.sql
-- ============================================================

-- Add a JSONB column to household_members to store per-household user notification settings.
ALTER TABLE household_members 
ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{
  "notify_on_add": true,
  "notify_on_complete": true,
  "detailed_notifications": false,
  "muted_list_ids": []
}'::jsonb;
