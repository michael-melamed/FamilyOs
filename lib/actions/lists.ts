'use server';

import { createClient } from '@/lib/supabase/server';
import type { List } from '@/types';

export async function createList(householdId: string, name: string): Promise<List> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('lists')
    .insert({
      household_id: householdId,
      name,
    })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function renameList(listId: string, newName: string): Promise<List> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('lists')
    .update({ name: newName })
    .eq('id', listId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteList(listId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('lists')
    .delete()
    .eq('id', listId);

  if (error) throw new Error(error.message);
}

export async function clearList(householdId: string, listId: string): Promise<void> {
  const supabase = createClient();
  // Clear all tasks under this list
  const { error } = await supabase
    .from('tasks')
    .delete()
    .eq('household_id', householdId)
    .eq('list_id', listId);

  if (error) throw new Error(error.message);
}
