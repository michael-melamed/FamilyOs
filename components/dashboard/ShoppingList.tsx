'use client';

/**
 * @file components/dashboard/ShoppingList.tsx
 * @description_he רשימת קניות — צ'קבוקס לכל פריט, כפתור ניקוי
 * @description_en Shopping list — checkbox per item, clear checked button
 * @inputs    items: ShoppingItem[], familyId: string, onUpdate: () => void
 * @outputs   JSX shopping list section
 * @depends_on lib/actions/shopping.ts
 * @used_by   components/dashboard/Board.tsx
 * @fix_guide
 *   - Checked items not clearing → check clearCheckedItems receives correct familyId
 */

import { useState } from 'react';
import type { ShoppingItem } from '@/types';
import { toggleShoppingItem, clearCheckedItems } from '@/lib/actions/shopping';

type ShoppingListProps = {
  items: ShoppingItem[];
  familyId: string | undefined;
  onUpdate: () => void;
  is_locked?: boolean;
  can_clear_lists?: boolean;
};

export function ShoppingList({ items, familyId, onUpdate, is_locked = false, can_clear_lists = true }: ShoppingListProps) {
  const [isClearing, setIsClearing] = useState(false);

  const handleToggle = async (item: ShoppingItem) => {
    try {
      await toggleShoppingItem(item.id, !item.checked);
      onUpdate();
    } catch (err) {
      console.error('Failed toggling map error:', err);
    }
  };

  const handleClear = async () => {
    if (!familyId) return;
    setIsClearing(true);
    try {
      await clearCheckedItems(familyId);
      onUpdate();
    } catch (err) {
      console.error('Failed clearing array natively:', err);
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-[#1B2A4A] font-bold text-xl flex items-center gap-2">
          <span>🛒</span> קניות {is_locked && <span title="רשימה נעולה">🔒</span>}
        </h2>
        {items.some(i => i.checked) && can_clear_lists && !is_locked && (
          <button 
            onClick={handleClear} 
            disabled={isClearing}
            className="text-xs text-[#1A7A4A] font-medium bg-[#E8F5EE] px-3 py-1 rounded-full disabled:opacity-50 transition-colors"
          >
            {isClearing ? 'מנקה...' : 'נקה סיום'}
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-[#4A5568] border border-[#C8D4E8] border-dashed">
          העגלה ריקה! כתוב מה חסר בשורת הפקודה
        </div>
      ) : (
        <div className={`bg-white rounded-xl shadow-sm border border-[#C8D4E8] overflow-hidden ${is_locked ? 'opacity-70 pointer-events-none' : ''}`}>
          {items.map(item => (
            <div 
              key={item.id} 
              className="flex items-center py-3 px-4 border-b border-[#C8D4E8] last:border-b-0 hover:bg-[#F4F7FB] transition-colors"
              onClick={() => handleToggle(item)}
            >
              <button 
                className={`w-6 h-6 shrink-0 rounded border-2 flex items-center justify-center transition-colors ${item.checked ? 'bg-[#1B2A4A] border-[#1B2A4A] text-white' : 'border-[#C8D4E8] text-transparent hover:border-[#1A7A4A]'}`}
                aria-label="החלף פריט קניות"
              >
                <span className="text-sm">✓</span>
              </button>
              <div className={`mr-4 flex-1 font-medium transition-all ${item.checked ? 'text-[#4A5568] line-through opacity-70' : 'text-[#1B2A4A]'}`}>
                {item.name} {item.quantity && <span className="text-xs text-gray-500 mr-2">({item.quantity})</span>}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
