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

export async function createTask(familyId: string, title: string, assignee?: string, list_id?: string): Promise<Task> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('tasks')
    .insert({
      family_id: familyId,
      household_id: familyId,
      title,
      assignee: assignee || null,
      list_id: list_id || null,
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
