'use client';

/**
 * @file Board.tsx
 * @description_he קונטיינר הדשבורד — מחזיק TaskList ו-ShoppingList, מנהל state
 * @description_en Dashboard container — holds TaskList and ShoppingList, manages state
 * @inputs    familyId: string
 * @outputs   JSX board container
 * @depends_on hooks/useBoard.ts, components/dashboard/TaskList.tsx, ShoppingList.tsx
 * @used_by   app/dashboard/page.tsx
 * @fix_guide
 *   - Board not updating after prompt → check usePrompt calls refetch after agent response
 *   - Infinite re-renders → check useBoard dependency array in useEffect
 */

import { TaskList } from './TaskList';
import { ShoppingList } from './ShoppingList';
import type { Task, ShoppingItem } from '@/types';

type BoardProps = {
  tasks: Task[];
  shoppingItems: ShoppingItem[];
  lists?: any[];
  permissions?: any;
  familyId: string | undefined;
  isLoading: boolean;
  onUpdate: () => void;
};

export function Board({ tasks, shoppingItems, lists = [], permissions, familyId, isLoading, onUpdate }: BoardProps) {
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <div className="w-12 h-12 border-4 border-brand-teal/20 border-t-brand-teal rounded-full animate-spin"></div>
        <p className="text-brand-teal font-medium animate-pulse">טוען נתונים...</p>
      </div>
    );
  }

  const shoppingList = lists.find(l => l.name === 'קניות');
  const otherLists = lists.filter(l => l.name !== 'קניות');

  return (
    <div className="w-full flex flex-col pt-4">
      {otherLists.map(list => (
        <TaskList 
          key={list.id}
          listName={list.name}
          tasks={tasks.filter(t => t.list_id === list.id || (!t.list_id && list.name === 'משימות'))} 
          familyId={familyId} 
          onUpdate={onUpdate} 
          is_locked={list.is_locked}
          can_add_tasks={permissions?.can_add_tasks !== false}
          can_delete_tasks={permissions?.can_delete_tasks !== false}
        />
      ))}
      <ShoppingList 
        items={shoppingItems}  
        familyId={familyId} 
        onUpdate={onUpdate} 
        is_locked={shoppingList?.is_locked}
        can_clear_lists={permissions?.can_clear_lists !== false}
      />
    </div>
  );
}
