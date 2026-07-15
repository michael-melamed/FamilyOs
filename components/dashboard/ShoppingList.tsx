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
        <div className="w-full bg-brand-purple/[0.02] rounded-xl py-4 px-4 border border-brand-purple/15 text-center">
          <p className="text-sm font-medium text-calm-text/70">בעגלה זו הכל שקט.</p>
        </div>
      ) : (
        <div className={`flex flex-col gap-4 ${is_locked ? 'opacity-70 pointer-events-none' : ''}`}>
          {Object.entries(
            items.reduce((acc, item) => {
              const cat = item.category || 'כללי';
              if (!acc[cat]) acc[cat] = [];
              acc[cat].push(item);
              return acc;
            }, {} as Record<string, ShoppingItem[]>)
          ).map(([category, catItems]) => (
            <div key={category} className="bg-white rounded-2xl shadow-sm border border-neutral-100 overflow-hidden">
              {category !== 'כללי' && (
                <div className="bg-neutral-50 border-b border-neutral-100 px-4 py-2 font-bold text-brand-purple text-sm">
                  {category}
                </div>
              )}
              <div className="flex flex-col">
                {catItems.map((item, index) => (
                  <div 
                    key={item.id} 
                    className={`w-full p-4 flex items-center gap-4 cursor-pointer hover:bg-neutral-50 transition-colors ${index !== catItems.length - 1 ? 'border-b border-neutral-50' : ''} ${(item as any).isOptimistic ? 'opacity-50 pointer-events-none' : ''}`}
                    onClick={() => handleToggle(item)}
                  >
                    <button 
                      className={`w-7 h-7 shrink-0 rounded-xl border-2 flex items-center justify-center transition-colors ${item.checked ? 'bg-brand-teal border-brand-teal text-white' : 'border-neutral-200 text-transparent hover:border-brand-teal'}`}
                      aria-label="החלף פריט קניות"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7"></path></svg>
                    </button>
                    <div className={`flex-1 font-medium transition-all flex items-center justify-between ${item.checked ? 'opacity-60' : ''}`}>
                      <span className={`text-calm-text ${item.checked ? 'line-through text-muted-warm' : ''}`}>{item.name}</span>
                      {item.quantity && (
                        <span className={`text-xs px-2 py-0.5 rounded-full border ${item.checked ? 'border-neutral-300 text-muted-warm' : 'bg-calm-bg border-neutral-200 text-muted-warm'}`}>
                          ({item.quantity})
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
