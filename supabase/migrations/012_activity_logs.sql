-- ============================================================
-- FamilyOS — Mission: Activity Logs
-- Migration: 012_activity_logs.sql
-- ============================================================

-- 1. Add cleared_history_at to household_members
ALTER TABLE household_members 
ADD COLUMN IF NOT EXISTS cleared_history_at TIMESTAMPTZ DEFAULT now();

-- 2. Create activity_logs table
CREATE TABLE IF NOT EXISTS activity_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    household_id UUID NOT NULL REFERENCES households(id) ON DELETE CASCADE,
    actor_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    actor_name TEXT NOT NULL,
    action TEXT NOT NULL, -- 'INSERT', 'UPDATE', 'DELETE'
    entity_type TEXT NOT NULL, -- 'task', 'shopping_item', 'list'
    entity_title TEXT NOT NULL,
    details JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view activity logs for their households"
    ON activity_logs FOR SELECT
    USING (
        household_id IN (
            SELECT household_id FROM household_members WHERE user_id = auth.uid()
        )
    );

-- 3. Create generic trigger function to log activity
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
    -- (We assume standard column names exist based on table type)
    IF e_type = 'task' THEN
        h_id := act_record.household_id;
        a_id := COALESCE(auth.uid(), act_record.created_by);
        a_name := COALESCE(act_record.assignee, 'חבר משפחה');
        e_title := act_record.title;
        
        -- Special update details
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
        h_id := act_record.family_id; -- In our schema, family_id = household_id
        a_id := COALESCE(auth.uid(), act_record.created_by);
        a_name := 'חבר משפחה'; -- No explicit assignee for shopping
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

    -- Only log if we have a household_id
    IF h_id IS NOT NULL THEN
        -- Actually, created_by might not be the real actor for updates/deletes in RLS,
        -- but since we use auth.uid() in RLS, we can capture the actual DB user:
        -- But Supabase passes auth.uid() in the request.
        -- We will just use the current auth.uid() if possible, but triggers in Postgres
        -- can access auth.uid() using current_setting('request.jwt.claim.sub', true).
        
        DECLARE
            actual_user_id UUID := NULLIF(current_setting('request.jwt.claim.sub', true), '');
        BEGIN
            IF actual_user_id IS NOT NULL THEN
                a_id := actual_user_id;
                -- Try to find their role or name in household_members? 
                -- To keep it simple, we'll store their UUID and let frontend fetch name, 
                -- OR we just store a generic name here.
            END IF;
        EXCEPTION WHEN OTHERS THEN
            -- Ignore missing settings
        END;

        INSERT INTO activity_logs (household_id, actor_id, actor_name, action, entity_type, entity_title, details)
        VALUES (h_id, a_id, a_name, action_type, e_type, e_title, json_details);
    END IF;

    RETURN NULL; -- AFTER triggers return NULL
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Apply triggers to tables

DROP TRIGGER IF EXISTS trg_log_task_activity ON tasks;
CREATE TRIGGER trg_log_task_activity
    AFTER INSERT OR UPDATE OR DELETE ON tasks
    FOR EACH ROW EXECUTE FUNCTION log_activity('task');

DROP TRIGGER IF EXISTS trg_log_shopping_activity ON shopping_items;
CREATE TRIGGER trg_log_shopping_activity
    AFTER INSERT OR UPDATE OR DELETE ON shopping_items
    FOR EACH ROW EXECUTE FUNCTION log_activity('shopping_item');

DROP TRIGGER IF EXISTS trg_log_list_activity ON lists;
CREATE TRIGGER trg_log_list_activity
    AFTER INSERT OR UPDATE OR DELETE ON lists
    FOR EACH ROW EXECUTE FUNCTION log_activity('list');

-- 5. Enable realtime for activity_logs to use Webhooks later
ALTER PUBLICATION supabase_realtime ADD TABLE activity_logs;
