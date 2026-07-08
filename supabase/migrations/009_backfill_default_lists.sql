-- =============================================================================
-- Migration: 009_backfill_default_lists.sql
-- Purpose:   Add default "משימות" and "קניות" lists to every existing household
--            that currently has no lists at all.
--
-- When to run: Once, manually in the Supabase SQL Editor.
-- Safe to re-run: YES — the WHERE clause guarantees idempotency (only inserts
--                 for households that truly have zero lists).
--
-- How it works:
--   1. Find all household_ids that have no rows in the `lists` table.
--   2. For each such household, pick the admin user as `created_by`
--      (falls back to any member if no admin exists).
--   3. Insert two list rows: "משימות" and "קניות".
-- =============================================================================

WITH households_needing_lists AS (
  -- DISTINCT ON picks one row per household_id.
  -- ORDER BY (role = 'admin') DESC ensures we prefer the admin as created_by.
  SELECT DISTINCT ON (hm.household_id)
    hm.household_id,
    hm.user_id
  FROM household_members hm
  LEFT JOIN lists l ON l.household_id = hm.household_id
  WHERE l.id IS NULL          -- only households with ZERO lists
  ORDER BY hm.household_id, (hm.role = 'admin') DESC
)
INSERT INTO lists (household_id, name, created_by)
SELECT
  h.household_id,
  list_names.name,
  h.user_id
FROM households_needing_lists h
CROSS JOIN (
  VALUES ('משימות'), ('קניות')
) AS list_names(name);

-- Verify: should return 0 rows after the migration runs successfully.
-- SELECT household_id FROM household_members
-- LEFT JOIN lists ON lists.household_id = household_members.household_id
-- WHERE lists.id IS NULL
-- LIMIT 10;
