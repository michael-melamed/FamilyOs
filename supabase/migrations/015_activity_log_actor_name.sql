-- ============================================================
-- Mission: Fix Activity Log Identities
-- Migration: 015_activity_log_actor_name.sql
-- PURPOSE: Extract the real user name from auth.users instead of fallback.
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
    real_name TEXT;
BEGIN
    action_type := TG_OP;
    e_type := TG_ARGV[0];

    IF action_type = 'DELETE' THEN
        act_record := OLD;
    ELSE
        act_record := NEW;
    END IF;

    IF e_type = 'task' THEN
        h_id := act_record.household_id;
        a_id := COALESCE(auth.uid(), act_record.created_by);
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

        -- FETCH REAL NAME FROM auth.users
        a_name := 'משתמש';
        IF a_id IS NOT NULL THEN
            SELECT 
                COALESCE(
                    raw_user_meta_data->>'full_name', 
                    raw_user_meta_data->>'name', 
                    'משתמש'
                ) 
            INTO real_name
            FROM auth.users 
            WHERE id = a_id;
            
            IF real_name IS NOT NULL AND real_name != 'משתמש' THEN
                -- Extract first name only for a more personal touch
                a_name := split_part(real_name, ' ', 1);
            END IF;
        END IF;

        INSERT INTO activity_logs (household_id, actor_id, actor_name, action, entity_type, entity_title, details)
        VALUES (h_id, a_id, a_name, action_type, e_type, e_title, json_details);
    END IF;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
