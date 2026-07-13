'use server';

/**
 * @file lib/actions/tasks.ts
 * @description_he Server Actions לניהול משימות — יצירה, עדכון, מחיקה
 * @description_en Server Actions for task management — create, update, delete
 * @inputs    Various: taskId, title, status, assignee, familyId
 * @outputs   Promise<Task> or Promise<void>
 * @depends_on lib/supabase/server.ts, types/index.ts
 * @used_by   app/api/agent/route.ts, components/dashboard/TaskItem.tsx
 * @fix_guide
 *   - RLS error → user's family_id doesn't match task's family_id
 *   - "use server" missing → add 'use server' directive at top of file
 * @integration_guide
 *   Import individual named exports — never import the whole file
 *   Example: import { createTask, updateTask } from '@/lib/actions/tasks'
 */

import { createClient } from '@/lib/supabase/server';
import type { Task, TaskStatus } from '@/types';

export async function createTask(familyId: string, title: string, assignee?: string, list_id?: string, parent_id?: string): Promise<Task> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      family_id: familyId,
      household_id: familyId,
      title,
      assignee: assignee || null,
      list_id: list_id || null,
      parent_id: parent_id || null,
      // position needs to fit in a 32-bit integer (max ~2.14 billion). Date.now() is ~1.7 trillion.
      position: Math.floor(Date.now() / 1000)
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function updateTask(taskId: string, changes: Partial<Task>): Promise<Task> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tasks')
    .update(changes)
    .eq('id', taskId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteTask(taskId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('id', taskId);

  if (error) throw new Error(error.message);
}

export async function completeTask(taskId: string): Promise<Task> {
  return updateTask(taskId, { status: 'done' });
}

export async function clearCompletedTasks(familyId: string, list_id?: string): Promise<void> {
  const supabase = createClient();
  let query = supabase.from('tasks').delete().eq('household_id', familyId).eq('status', 'done');
  if (list_id) {
    query = query.eq('list_id', list_id);
  } else {
    query = query.is('list_id', null);
  }
  
  try {
    const { error } = await query;
    if (error) throw error;
  } catch (e: any) {
    console.error('clearCompletedTasks failed. Check if migrations were run.', e);
    throw new Error(e.message || 'Failed to clear completed tasks. Please check server logs.');
  }
}

export async function reorderTasks(taskIds: string[]): Promise<void> {
  const supabase = createClient();
  
  // We can bulk update positions using a loop or an RPC.
  // Since the list of tasks is usually small, a Promise.all with updates is acceptable for MVP.
  const promises = taskIds.map((id, index) => 
    supabase.from('tasks').update({ position: index }).eq('id', id)
  );

  await Promise.allSettled(promises);
}
