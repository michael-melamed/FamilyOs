-- ============================================================
-- MIGRATION: 008_shopping_rls_fix.sql
-- PURPOSE: Updates RLS policies for shopping_items to use the new households model.
-- ============================================================

DO $$ BEGIN
  CREATE POLICY "shopping: household members can select"
    ON shopping_items FOR SELECT USING (is_household_member(family_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "shopping: household members can insert"
    ON shopping_items FOR INSERT WITH CHECK (is_household_member(family_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "shopping: household members can update"
    ON shopping_items FOR UPDATE USING (is_household_member(family_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE POLICY "shopping: household members can delete"
    ON shopping_items FOR DELETE USING (is_household_member(family_id));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
