-- ============================================================
-- Mission: RPC Bypasses for PostgREST DEFAULT bug
-- Migration: 014_rpc_inserts.sql
-- PURPOSE: Bypasses the PostgREST CTE bug "DEFAULT is not allowed in this context" by using PL/pgSQL functions for inserts.
-- ============================================================

CREATE OR REPLACE FUNCTION rpc_add_shopping_item(
    p_family_id UUID,
    p_name TEXT,
    p_quantity TEXT DEFAULT NULL,
    p_category TEXT DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    new_item RECORD;
BEGIN
    INSERT INTO shopping_items (family_id, name, quantity, category, created_by)
    VALUES (p_family_id, p_name, p_quantity, p_category, COALESCE(p_created_by, auth.uid()))
    RETURNING * INTO new_item;
    
    RETURN row_to_json(new_item)::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION rpc_add_task(
    p_household_id UUID,
    p_title TEXT,
    p_assignee TEXT DEFAULT NULL,
    p_list_id UUID DEFAULT NULL,
    p_parent_id UUID DEFAULT NULL,
    p_created_by UUID DEFAULT NULL
) RETURNS JSONB AS $$
DECLARE
    new_task RECORD;
BEGIN
    INSERT INTO tasks (family_id, household_id, title, assignee, list_id, parent_id, created_by, position)
    VALUES (p_household_id, p_household_id, p_title, p_assignee, p_list_id, p_parent_id, COALESCE(p_created_by, auth.uid()), EXTRACT(EPOCH FROM now())::int)
    RETURNING * INTO new_task;
    
    RETURN row_to_json(new_task)::jsonb;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
