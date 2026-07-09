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
  // Only displaying pending or in-progress tasks natively mapped top-level (no parents for Mission 4 scope unless explicitly requested nested representations)
  const activeTasks = tasks.filter(t => t.status !== 'done' && !t.parent_id);

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-[#1B2A4A] font-bold text-xl flex items-center gap-2">
          <span>📋</span> {listName} {is_locked && <span title="רשימה נעולה">🔒</span>}
        </h2>
      </div>
      
      {activeTasks.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm p-8 text-center text-[#4A5568] border border-[#C8D4E8] border-dashed">
          הכל עשוי! הוסף משימה לשמירה על הפעילות
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
