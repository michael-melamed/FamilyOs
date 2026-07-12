'use client';

/**
 * @file hooks/useBoard.ts
 * @description_he Hook לניהול state הדשבורד — טעינה, realtime, עדכון, התראות
 * @description_en Hook for dashboard state management — loading, realtime, update, notifications.
 *               Scoped to a household_id. Passes realtime payload to notification system.
 * @inputs    householdId: string | undefined, currentUserId: string | undefined,
 *            addNotification: (msg, type) => void
 * @outputs   { tasks, shoppingItems, isLoading, refetch, hasRecentUpdate, lastUpdatedBy }
 * @depends_on lib/supabase/client.ts, lib/supabase/realtime.ts, types/index.ts
 * @used_by   app/dashboard/page.tsx
 * @fix_guide
 *   - Data not loading → check householdId is not undefined; user must be in household_members
 *   - Realtime not working → check supabase_realtime publication includes tasks and shopping_items tables
 *   - Notifications not showing → ensure currentUserId is passed correctly (must differ from created_by on the record)
 */

import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { createClient } from '@/lib/supabase/client';
import { useRealtimeTable, type RealtimePayload } from '@/lib/supabase/realtime';
import type { Task, ShoppingItem } from '@/types';
import type { NotificationType } from '@/hooks/useNotifications';

type UseBoardOptions = {
  householdId: string | undefined;
  currentUserId: string | undefined;
  addNotification: (message: string, type: NotificationType) => void;
};

/** Build a human-friendly Hebrew notification message from a realtime payload */
function buildMessage(payload: RealtimePayload): { message: string; type: NotificationType } | null {
  const { eventType, table, new: newRow, old: oldRow } = payload;

  if (table === 'tasks') {
    const title = newRow?.title || oldRow?.title || 'משימה';
    const actor = newRow?.assignee || null;
    const who = actor ? `${actor}` : 'חבר/ה';

    if (eventType === 'INSERT') return { message: `${who} הוסיפ/ה משימה: "${title}"`, type: 'add' };
    if (eventType === 'DELETE') return { message: `${who} מחק/ה משימה: "${title}"`, type: 'delete' };
    if (eventType === 'UPDATE') {
      if (newRow?.status === 'done') return { message: `${who} סימנ/ה כהושלמה: "${title}"`, type: 'complete' };
      return { message: `${who} עדכנ/ה משימה: "${title}"`, type: 'update' };
    }
  }

  if (table === 'shopping_items') {
    const name = newRow?.name || oldRow?.name || 'פריט';
    if (eventType === 'INSERT') return { message: `נוסף לקניות: "${name}"`, type: 'add' };
    if (eventType === 'DELETE') return { message: `הוסר מהקניות: "${name}"`, type: 'delete' };
    if (eventType === 'UPDATE') {
      if (newRow?.checked === true) return { message: `סומן כנקנה: "${name}"`, type: 'complete' };
      return { message: `עודכן בקניות: "${name}"`, type: 'update' };
    }
  }

  return null;
}

export function useBoard({ householdId, currentUserId, addNotification }: UseBoardOptions) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [lists, setLists] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  const [hasRecentUpdate, setHasRecentUpdate] = useState(false);
  const [lastUpdatedBy, setLastUpdatedBy] = useState<string | undefined>();

  // Debounce: track last notification time per table to avoid flooding
  const lastNotifTime = useRef<Record<string, number>>({});

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

  const handleRealtimeEvent = useCallback((payload: RealtimePayload) => {
    // Refetch to get latest data
    refetch(true);

    // Determine who triggered the change
    const changedBy = payload.new?.created_by || payload.old?.created_by;

    // Update last updater indicator in header
    if (changedBy && changedBy !== currentUserId) {
      setLastUpdatedBy(changedBy);
    }

    // Only notify if the change was made by SOMEONE ELSE
    if (!currentUserId || changedBy === currentUserId) return;

    // Debounce: max 1 notification per table per 800ms
    const now = Date.now();
    const lastTime = lastNotifTime.current[payload.table] ?? 0;
    if (now - lastTime < 800) return;
    lastNotifTime.current[payload.table] = now;

    const result = buildMessage(payload);
    if (result) {
      addNotification(result.message, result.type);
    }
  }, [refetch, currentUserId, addNotification]);

  useRealtimeTable('tasks', householdId ?? null, handleRealtimeEvent);
  useRealtimeTable('shopping_items', householdId ?? null, handleRealtimeEvent);

  return { tasks, shoppingItems, lists, permissions, isLoading, refetch, hasRecentUpdate, lastUpdatedBy };
}
