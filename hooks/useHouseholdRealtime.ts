/**
 * useHouseholdRealtime
 * 
 * JSDoc Header:
 * This hook manages real-time synchronization for a household using Supabase Realtime.
 * It subscribes to INSERT, UPDATE, and DELETE events on the `tasks` and `lists` tables,
 * filtered by the provided `household_id`.
 * 
 * The hook ensures that any changes made by other members (or the admin) are immediately
 * reflected in the local state without requiring a full page reload. It returns the current
 * live state of tasks and lists for the given household.
 * 
 * Usage:
 * const { tasks, lists } = useHouseholdRealtime(householdId);
 */
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

export function useHouseholdRealtime(householdId: string | null) {
  const [tasks, setTasks] = useState<any[]>([]);
  const [lists, setLists] = useState<any[]>([]);
  const supabase = createClient();

  useEffect(() => {
    if (!householdId) return;

    // Initial fetch
    const fetchInitialData = async () => {
      const [tasksData, listsData] = await Promise.all([
        supabase.from('tasks').select('*').eq('household_id', householdId),
        supabase.from('lists').select('*').eq('household_id', householdId)
      ]);
      
      if (tasksData.data) setTasks(tasksData.data);
      if (listsData.data) setLists(listsData.data);
    };

    fetchInitialData();

    // Realtime subscriptions
    const tasksChannel = supabase.channel(`tasks:household_id=eq.${householdId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'tasks', filter: `household_id=eq.${householdId}` }, (payload: any) => {
        if (payload.eventType === 'INSERT') setTasks(prev => [...prev, payload.new]);
        if (payload.eventType === 'UPDATE') setTasks(prev => prev.map(t => t.id === payload.new.id ? payload.new : t));
        if (payload.eventType === 'DELETE') setTasks(prev => prev.filter(t => t.id !== payload.old.id));
      })
      .subscribe();

    const listsChannel = supabase.channel(`lists:household_id=eq.${householdId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lists', filter: `household_id=eq.${householdId}` }, (payload: any) => {
        if (payload.eventType === 'INSERT') setLists(prev => [...prev, payload.new]);
        if (payload.eventType === 'UPDATE') setLists(prev => prev.map(l => l.id === payload.new.id ? payload.new : l));
        if (payload.eventType === 'DELETE') setLists(prev => prev.filter(l => l.id !== payload.old.id));
      })
      .subscribe();

    return () => {
      supabase.removeChannel(tasksChannel);
      supabase.removeChannel(listsChannel);
    };
  }, [householdId, supabase]);

  return { tasks, lists };
}
