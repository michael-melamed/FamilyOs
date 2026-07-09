'use client';

/**
 * @file components/dashboard/TaskList.tsx
 * @description_he רשימת משימות — מציגה משימות על וכפתור הוספה
 * @description_en Task list — shows top-level tasks and add button
 * @inputs    tasks: Task[], familyId: string, onUpdate: () => void
 * @outputs   JSX task list section
 * @depends_on components/dashboard/TaskItem.tsx, lib/actions/tasks.ts
 * @used_by   components/dashboard/Board.tsx
 * @fix_guide
 *   - Sub-tasks not showing → check tasks filter by parent_id
 */

import type { Task } from '@/types';
import { TaskItem } from './TaskItem';

type TaskListProps = {
  listName?: string;
  tasks: Task[];
  familyId: string | undefined;
  onUpdate: () => void;
  is_locked?: boolean;
  can_add_tasks?: boolean;
  can_delete_tasks?: boolean;
};

export function TaskList({ listName = 'משימות', tasks, familyId, onUpdate, is_locked = false, can_add_tasks = true, can_delete_tasks = false }: TaskListProps) {
  const activeTasks = tasks.filter((t) => t.status !== 'done' && !t.parent_id);

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-[#1B2A4A] font-bold text-xl flex items-center gap-2">
          <span>📋</span> {listName} {is_locked && <span title="רשימה נעולה">🔒</span>}
        </h2>
      </div>
      
      {activeTasks.length === 0 ? (
        <div className="w-full bg-brand-teal/5 rounded-3xl py-12 px-4 text-center border border-brand-teal/10">
          <div className="flex justify-center mb-5">
            <svg className="w-14 h-14 text-brand-teal opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-calm-text mb-1">הכל מסודר.</h3>
          <p className="text-sm text-muted-warm">מה המשימה הבאה?</p>
        </div>
      ) : (
        <div className={`bg-white rounded-xl shadow-sm border border-[#C8D4E8] overflow-hidden ${is_locked ? 'opacity-70 pointer-events-none' : ''}`}>
          {activeTasks.map(task => (
            <TaskItem key={task.id} task={task} onUpdate={onUpdate} can_delete={can_delete_tasks} />
          ))}
        </div>
      )}
    </div>
  );
}
