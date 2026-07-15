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
import type { Task, ShoppingItem, NotificationPreferences } from '@/types';
import type { NotificationType } from '@/hooks/useNotifications';

type UseBoardOptions = {
  householdId: string | undefined;
  currentUserId: string | undefined;
  addNotification: (message: string, type: NotificationType) => void;
};

const DEFAULT_PREFS: NotificationPreferences = {
  notify_on_add: true,
  notify_on_complete: true,
  detailed_notifications: false,
  muted_list_ids: []
};

/** Build a human-friendly Hebrew notification message from a realtime payload */
function buildMessage(payload: RealtimePayload, prefs: NotificationPreferences): { message: string; type: NotificationType } | null {
  const { eventType, table, new: newRow, old: oldRow } = payload;

  if (table === 'tasks') {
    const title = newRow?.title || oldRow?.title || 'משימה';
    const actor = newRow?.assignee || null;
    const who = actor ? `${actor}` : 'חבר/ה';
    
    // Check event types against preferences
    if (eventType === 'INSERT') {
      if (!prefs.notify_on_add) return null;
      return { message: `${who} הוסיפ/ה משימה: "${title}"`, type: 'add' };
    }
    if (eventType === 'DELETE') {
      return { message: `${who} מחק/ה משימה: "${title}"`, type: 'delete' };
    }
    if (eventType === 'UPDATE') {
      if (newRow?.status === 'done') {
        if (!prefs.notify_on_complete) return null;
        return { message: `${who} סימנ/ה כהושלמה: "${title}"`, type: 'complete' };
      }
      return { message: `${who} עדכנ/ה משימה: "${title}"`, type: 'update' };
    }
  }

  if (table === 'shopping_items') {
    const name = newRow?.name || oldRow?.name || 'פריט';
    if (eventType === 'INSERT') {
      if (!prefs.notify_on_add) return null;
      return { message: `נוסף לקניות: "${name}"`, type: 'add' };
    }
    if (eventType === 'DELETE') return { message: `הוסר מהקניות: "${name}"`, type: 'delete' };
    if (eventType === 'UPDATE') {
      if (newRow?.checked === true) {
        if (!prefs.notify_on_complete) return null;
        return { message: `סומן כנקנה: "${name}"`, type: 'complete' };
      }
      return { message: `עודכן בקניות: "${name}"`, type: 'update' };
    }
  }

  if (table === 'lists') {
    const name = newRow?.name || oldRow?.name || 'רשימה';
    if (eventType === 'INSERT') {
      if (!prefs.notify_on_add) return null;
      return { message: `נוספה רשימה: "${name}"`, type: 'add' };
    }
    if (eventType === 'DELETE') return { message: `נמחקה רשימה: "${name}"`, type: 'delete' };
    if (eventType === 'UPDATE') return { message: `עודכנה רשימה: "${name}"`, type: 'update' };
  }

  return null;
}

export function useBoard({ householdId, currentUserId, addNotification }: UseBoardOptions) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [shoppingItems, setShoppingItems] = useState<ShoppingItem[]>([]);
  const [optimisticTasks, setOptimisticTasks] = useState<Task[]>([]);
  const [optimisticShoppingItems, setOptimisticShoppingItems] = useState<ShoppingItem[]>([]);
  const [lists, setLists] = useState<any[]>([]);
  const [permissions, setPermissions] = useState<any>(null);
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>(DEFAULT_PREFS);
  const [isLoading, setIsLoading] = useState(true);

  const [hasRecentUpdate, setHasRecentUpdate] = useState(false);
  const [lastUpdatedBy, setLastUpdatedBy] = useState<string | undefined>();
  const [userRole, setUserRole] = useState<string>('member');

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
      const [tasksRes, shoppingRes, listsRes, permsRes] = await Promise.all([
        supabase.from('tasks').select('*').eq('family_id', householdId).order('position', { ascending: true }).order('created_at', { ascending: true }),
        supabase.from('shopping_items').select('*').eq('family_id', householdId).order('created_at', { ascending: true }),
        supabase.from('lists').select('*').eq('household_id', householdId),
        supabase.from('household_permissions').select('*').eq('household_id', householdId).single()
      ]);

      if (currentUserId && !isRealtimeUpdate) {
        const { data: memberData } = await supabase
          .from('household_members')
          .select('notification_preferences, role')
          .eq('household_id', householdId)
          .eq('user_id', currentUserId)
          .single();
        
        if (memberData) {
          if (memberData.notification_preferences) {
            setNotificationPrefs(memberData.notification_preferences as NotificationPreferences);
          }
          if (memberData.role) {
            setUserRole(memberData.role);
          }
        }
      }

      if (tasksRes.data) {
        setTasks(tasksRes.data as Task[]);
        setOptimisticTasks([]);
      }
      if (shoppingRes.data) {
        setShoppingItems(shoppingRes.data as ShoppingItem[]);
        setOptimisticShoppingItems([]);
      }
      if (listsRes.data) setLists(listsRes.data);
      if (permsRes.data) setPermissions(permsRes.data);
    } catch (err) {
      console.error('Failed fetching board data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [householdId, currentUserId, supabase]);

  useEffect(() => {
    if (householdId) refetch(false);
  }, [householdId, refetch]);

  const handleRealtimeEvent = useCallback((payload: RealtimePayload) => {
    refetch(true);

    const changedBy = payload.new?.created_by || payload.old?.created_by;

    if (changedBy && changedBy !== currentUserId) {
      setLastUpdatedBy(changedBy);
    }

    if (!currentUserId || changedBy === currentUserId) return;

    // Filter out muted lists
    const listId = payload.new?.list_id || payload.old?.list_id;
    if (listId && notificationPrefs.muted_list_ids?.includes(listId)) return;

    const now = Date.now();
    const lastTime = lastNotifTime.current[payload.table] ?? 0;
    if (now - lastTime < 800) return;
    lastNotifTime.current[payload.table] = now;

    const result = buildMessage(payload, notificationPrefs);
    if (result) {
      addNotification(result.message, result.type);
    }
  }, [refetch, currentUserId, notificationPrefs, addNotification]);

  useRealtimeTable('tasks', householdId ?? null, handleRealtimeEvent);
  useRealtimeTable('shopping_items', householdId ?? null, handleRealtimeEvent);
  useRealtimeTable('lists', householdId ?? null, handleRealtimeEvent);

  const addOptimisticItem = useCallback((intent: 'ADD_TASK' | 'ADD_SHOPPING', title: string, assignee?: string) => {
    if (intent === 'ADD_TASK') {
      const tempTask = {
        id: `temp-${Date.now()}`,
        title,
        assignee: assignee || null,
        family_id: householdId || '',
        household_id: householdId || '',
        status: 'todo',
        created_at: new Date().toISOString(),
        isOptimistic: true
      } as unknown as Task;
      setOptimisticTasks(prev => [...prev, tempTask]);
    } else if (intent === 'ADD_SHOPPING') {
      const tempItem = {
        id: `temp-${Date.now()}`,
        name: title,
        family_id: householdId || '',
        checked: false,
        created_at: new Date().toISOString(),
        isOptimistic: true
      } as unknown as ShoppingItem;
      setOptimisticShoppingItems(prev => [...prev, tempItem]);
    }
  }, [householdId]);

  const combinedTasks = useMemo(() => [...tasks, ...optimisticTasks], [tasks, optimisticTasks]);
  const combinedShoppingItems = useMemo(() => [...shoppingItems, ...optimisticShoppingItems], [shoppingItems, optimisticShoppingItems]);

  return {
    tasks: combinedTasks,
    shoppingItems: combinedShoppingItems,
    lists,
    permissions,
    isLoading,
    refetch,
    hasRecentUpdate,
    lastUpdatedBy,
    notificationPrefs,
    userRole,
    addOptimisticItem
  };
}
