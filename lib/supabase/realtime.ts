'use client';

import { useEffect } from 'react';
import { createClient } from './client';

/**
 * @file lib/supabase/realtime.ts
 *
 * @description_he הגדרות לשירות זמן אמת (Realtime) של Supabase
 * @description_en Config for Supabase Realtime subscriptions
 *
 * @inputs    table name, familyId, onUpdate callback
 * @outputs   Realtime setup hook mapping
 *
 * @depends_on   Supabase Browser Client
 * @used_by      React components
 *
 * @fix_guide
 *   - Events not firing: Verify RLS SELECT policies are properly validating the family.
 *
 * @example
 *   // useRealtimeTable('tasks', familyId, () => fetchTasks())
 */
export function useRealtimeTable(
  table: string,
  familyId: string | null,
  onUpdate: () => void
) {
  useEffect(() => {
    if (!familyId) return;

    const supabase = createClient();
    
    // Subscribe to changes on the given table for this family
    const channel = supabase
      .channel(`${table}_changes`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter: table === 'tasks' || table === 'lists' ? `household_id=eq.${familyId}` : `family_id=eq.${familyId}`,
        },
        () => {
          onUpdate();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, familyId, onUpdate]);
}
