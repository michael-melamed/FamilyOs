'use client';

import { useEffect } from 'react';
import { createClient } from './client';

/**
 * @file lib/supabase/realtime.ts
 *
 * @description_he מינוי לשינויים בזמן אמת ב-Supabase Realtime
 * @description_en Supabase Realtime subscription hook — passes full event payload to callback
 *
 * @inputs    table name, familyId, onUpdate callback (receives payload)
 * @outputs   Realtime subscription (auto-cleaned up on unmount)
 *
 * @depends_on   Supabase Browser Client
 * @used_by      hooks/useBoard.ts
 */

export type RealtimePayload = {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: Record<string, any>;
  old: Record<string, any>;
  table: string;
};

export function useRealtimeTable(
  table: string,
  familyId: string | null,
  onUpdate: (payload: RealtimePayload) => void
) {
  useEffect(() => {
    if (!familyId) return;

    const supabase = createClient();

    const channel = supabase
      .channel(`${table}_changes_${familyId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: table,
          filter:
            table === 'tasks' || table === 'lists'
              ? `household_id=eq.${familyId}`
              : `family_id=eq.${familyId}`,
        },
        (payload) => {
          onUpdate({
            eventType: payload.eventType as 'INSERT' | 'UPDATE' | 'DELETE',
            new: payload.new ?? {},
            old: payload.old ?? {},
            table,
          });
        }
      )
      .subscribe((status, err) => {
        console.log(`[Realtime] Channel ${table}_changes_${familyId} status:`, status);
        if (err) console.error('[Realtime] Error:', err);
      });

    return () => {
      console.log(`[Realtime] Leaving channel ${table}_changes_${familyId}`);
      supabase.removeChannel(channel);
    };
  }, [table, familyId, onUpdate]);
}
