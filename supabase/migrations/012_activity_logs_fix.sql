-- ============================================================
-- Fix DEFAULT issue in log_activity trigger
-- PURPOSE: PostgREST CTE inserts ban the use of DEFAULT. If a trigger uses DEFAULT implicitly, it crashes the original insert.
-- ============================================================

CREATE OR REPLACE FUNCTION log_activity()
RETURNS TRIGGER AS $$
DECLARE
    h_id UUID;
    a_id UUID;
    a_name TEXT;
    action_type TEXT;
    e_type TEXT;
    e_title TEXT;
    json_details JSONB;
    act_record RECORD;
BEGIN
    action_type := TG_OP;
    e_type := TG_ARGV[0];

    -- Determine which record to use for data
    IF action_type = 'DELETE' THEN
        act_record := OLD;
    ELSE
        act_record := NEW;
    END IF;

    -- Extract common fields based on table structure
    IF e_type = 'task' THEN
        h_id := act_record.household_id;
        a_id := COALESCE(auth.uid(), act_record.created_by);
        a_name := COALESCE(act_record.assignee, 'חבר משפחה');
        e_title := act_record.title;
        
        IF action_type = 'UPDATE' THEN
            IF NEW.status = 'done' AND OLD.status != 'done' THEN
                json_details := '{"event": "completed"}'::jsonb;
            ELSE
                json_details := '{"event": "updated"}'::jsonb;
            END IF;
        ELSE
            json_details := '{}'::jsonb;
        END IF;

    ELSIF e_type = 'shopping_item' THEN
        h_id := act_record.family_id; 
        a_id := COALESCE(auth.uid(), act_record.created_by);
        a_name := 'חבר משפחה'; 
        e_title := act_record.name;

        IF action_type = 'UPDATE' THEN
            IF NEW.checked = true AND OLD.checked = false THEN
                json_details := '{"event": "completed"}'::jsonb;
            ELSE
                json_details := '{"event": "updated"}'::jsonb;
            END IF;
        ELSE
            json_details := '{}'::jsonb;
        END IF;

    ELSIF e_type = 'list' THEN
        h_id := act_record.household_id;
        a_id := COALESCE(auth.uid(), act_record.created_by);
        a_name := 'מנהל';
        e_title := act_record.name;
        json_details := '{}'::jsonb;
    END IF;

    IF h_id IS NOT NULL THEN
        DECLARE
            actual_user_id UUID := NULLIF(current_setting('request.jwt.claim.sub', true), '');
        BEGIN
            IF actual_user_id IS NOT NULL THEN
                a_id := actual_user_id;
            END IF;
        EXCEPTION WHEN OTHERS THEN
        END;

        -- FIX: Explicitly specify id and created_at to avoid PostgreSQL DEFAULT restriction in PostgREST CTEs
        INSERT INTO activity_logs (id, created_at, household_id, actor_id, actor_name, action, entity_type, entity_title, details)
        VALUES (gen_random_uuid(), now(), h_id, a_id, a_name, action_type, e_type, e_title, json_details);
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
