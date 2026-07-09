-- ============================================================
-- Migration: 010_add_list_id_to_tasks.sql
-- PURPOSE: Adds the missing list_id column to tasks table 
--          to support multiple task lists (Mission 07B).
-- ============================================================

ALTER TABLE tasks
  ADD COLUMN IF NOT EXISTS list_id UUID REFERENCES lists(id) ON DELETE CASCADE;

-- Create an index to speed up lookups by list
CREATE INDEX IF NOT EXISTS idx_tasks_list_id ON tasks(list_id);
