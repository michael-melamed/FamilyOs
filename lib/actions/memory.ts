'use server';

/**
 * @file lib/actions/memory.ts
 * @description_he Server Actions לניהול זיכרון הסוכן
 * @description_en Server Actions for agent memory management
 * @inputs    familyId, key, value, category
 * @outputs   Promise<FamilyMemory[]> or Promise<FamilyMemory>
 * @depends_on lib/supabase/server.ts, types/index.ts
 * @used_by   lib/agent/parser.ts, components/layout/Sidebar.tsx
 * @fix_guide
 *   - Memory not loading in agent → check loadMemory returns all rows for familyId
 */

import { createClient } from '@/lib/supabase/server';
import type { FamilyMemory, MemoryCategory } from '@/types';

export async function loadMemory(familyId: string): Promise<FamilyMemory[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('family_memory')
    .select('*')
    .eq('family_id', familyId);

  if (error) throw new Error(error.message);
  return data || [];
}

export async function upsertMemory(
  familyId: string,
  key: string,
  value: string,
  category: MemoryCategory = 'general'
): Promise<FamilyMemory> {
  const supabase = createClient();
  
  // Use upsert to handle both insert and update based on the unique constraint (family_id, key)
  const { data, error } = await supabase
    .from('family_memory')
    .upsert({
      family_id: familyId,
      key,
      value,
      category,
    }, { onConflict: 'family_id, key' })
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteMemory(familyId: string, key: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('family_memory')
    .delete()
    .eq('family_id', familyId)
    .eq('key', key);

  if (error) throw new Error(error.message);
}
