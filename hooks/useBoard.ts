'use client';

/**
 * @file hooks/useBoard.ts
 * @description_he Hook לניהול state הדשבורד — טעינה, realtime, עדכון
 * @description_en Hook for dashboard state management — loading, realtime, update.
 *               Scoped to a household_id (migrated from family_id in Mission 07B).
 * @inputs    householdId: string | undefined
 * @outputs   { tasks, shoppingItems, isLoading, refetch, hasRecentUpdate, lastUpdatedBy }
 * @depends_on lib/supabase/client.ts, lib/supabase/realtime.ts, types/index.ts
 * @used_by   app/dashboard/page.tsx
 * @fix_guide
 *   - Data not loading → check householdId is not undefined; user must be in household_members
 *   - Realtime not working → check supabase_realtime publication includes tasks and shopping_items tables
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRealtimeTable } from '@/lib/supabase/realtime';
import type { Task, ShoppingItem } from '@/types';

export function useBoard(householdId: string | undefined) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [lists, setLists] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [hasRecentUpdate, setHasRecentUpdate] = useState(false);
  const [lastUpdatedBy, setLastUpdatedBy] = useState<string | undefined>();

  const supabase = useMemo(() => createClient(), []);

  const refetch = useCallback(async (isRealtimeUpdate = false) => {
    if (!householdId) return;

    if (isRealtimeUpdate) {
      setHasRecentUpdate(true);
      setTimeout(() => setHasRecentUpdate(false), 60000);
    }

    try {
      const { data: tasksData } = await supabase
        .from('tasks')
        .select('*')
        .eq('household_id', householdId)
        .order('position', { ascending: true })
        .order('created_at', { ascending: true });

      const { data: shoppingData } = await supabase
        .from('shopping_items')
        .select('*')
        .eq('family_id', householdId)
        .order('created_at', { ascending: true });

      const { data: listsData } = await supabase
        .from('lists')
        .select('*')
        .eq('household_id', householdId);

      const { data: permsData } = await supabase
        .from('household_permissions')
        .select('*')
        .eq('household_id', householdId)
        .single();

      if (tasksData) setTasks(tasksData as Task[]);
      if (shoppingData) setShoppingItems(shoppingData as ShoppingItem[]);
      if (listsData) setLists(listsData);
      if (permsData) setPermissions(permsData);
    } catch (err) {
      console.error('Failed fetching board data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [householdId, supabase]);

  useEffect(() => {
    if (householdId) refetch(false);
  }, [householdId, refetch]);

  useRealtimeTable('tasks', householdId ?? null, () => refetch(true));
  useRealtimeTable('shopping_items', householdId ?? null, () => refetch(true));

  return { tasks, shoppingItems, lists, permissions, isLoading, refetch, hasRecentUpdate, lastUpdatedBy };
}
