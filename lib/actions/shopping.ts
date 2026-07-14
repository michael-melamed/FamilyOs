'use server';

/**
 * @file lib/actions/shopping.ts
 * @description_he Server Actions לרשימת קניות
 * @description_en Server Actions for shopping list
 * @inputs    item name, quantity, familyId, itemId
 * @outputs   Promise<ShoppingItem> or Promise<void>
 * @depends_on lib/supabase/server.ts, types/index.ts
 * @used_by   app/api/agent/route.ts, components/dashboard/ShoppingList.tsx
 * @fix_guide
 *   - Duplicate items → check unique constraint; use upsert if needed
 */

import { createClient } from '@/lib/supabase/server';
import type { ShoppingItem } from '@/types';

export async function addShoppingItem(familyId: string, name: string, quantity?: string, category?: string): Promise<ShoppingItem> {
  const supabase = createClient();
  const { data, error } = await supabase
    .rpc('rpc_add_shopping_item', {
      p_family_id: familyId,
      p_name: name,
      p_quantity: quantity || null,
      p_category: category || null
    })
    .single();

  if (error) {
    console.error("SUPABASE RPC ERROR:", error);
    throw new Error(error.message);
  }
  return data as unknown as ShoppingItem;
}

export async function toggleShoppingItem(itemId: string, checked: boolean): Promise<ShoppingItem> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('shopping_items')
    .update({ checked })
    .eq('id', itemId)
    .select()
    .single();

  if (error) throw new Error(error.message);
  return data;
}

export async function deleteShoppingItem(itemId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('shopping_items')
    .delete()
    .eq('id', itemId);

  if (error) throw new Error(error.message);
}

export async function clearCheckedItems(familyId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('shopping_items')
    .delete()
    .eq('family_id', familyId)
    .eq('checked', true);

  if (error) throw new Error(error.message);
}

export async function clearAllShoppingItems(familyId: string): Promise<void> {
  const supabase = createClient();
  const { error } = await supabase
    .from('shopping_items')
    .delete()
    .eq('family_id', familyId);

  if (error) throw new Error(error.message);
}

