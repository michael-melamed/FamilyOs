'use client';

/**
 * @file components/dashboard/TaskItem.tsx
 * @description_he פריט משימה בודד — צ'קבוקס, כותרת, אחראי, עריכה
 * @description_en Single task item — checkbox, title, assignee, inline edit
 * @inputs    task: Task, onUpdate: () => void
 * @outputs   JSX task row
 * @depends_on lib/actions/tasks.ts
 * @used_by   components/dashboard/TaskList.tsx
 * @fix_guide
 *   - Checkbox click not saving → check completeTask server action is awaited
 *   - Optimistic update flickering → implement local state before server call
 */

import { useState, useCallback } from 'react';
import type { Task } from '@/types';
import { updateTask, deleteTask, completeTask } from '@/lib/actions/tasks';

type TaskItemProps = {
  task: Task;
  onUpdate: () => void;
  can_delete?: boolean;
};

export function TaskItem({ task, onUpdate, can_delete = false }: TaskItemProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [isDoneLocally, setIsDoneLocally] = useState(task.status === 'done');
  
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [isSaving, setIsSaving] = useState(false);

  // Optimistic handler bound seamlessly bypassing generic lag natively
  const handleComplete = useCallback(async () => {
    if (isDoneLocally || isCompleting) return;
    
    setIsDoneLocally(true);
    setIsCompleting(true);
    
    try {
      await completeTask(task.id);
      onUpdate();
    } catch (err) {
      console.error('Failed completing task:', err);
      setIsDoneLocally(false); 
    } finally {
      setIsCompleting(false);
    }
  }, [isDoneLocally, isCompleting, task.id, onUpdate]);

  const handleSave = async () => {
    if (!editTitle.trim() || editTitle === task.title) {
      setIsEditing(false);
      setEditTitle(task.title);
      return;
    }
    setIsSaving(true);
    try {
      await updateTask(task.id, { title: editTitle.trim() });
      onUpdate();
      setIsEditing(false);
    } catch (err) {
      console.error('Failed updating task:', err);
      setEditTitle(task.title);
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('למחוק את המשימה?')) return;
    try {
      await deleteTask(task.id);
      onUpdate();
    } catch (err) {
      console.error('Failed deleting task:', err);
    }
  };

  if (isDoneLocally) return null; // We hide immediately mapped matching the design logic internally naturally

  return (
    <div className="flex items-center justify-between py-3 px-4 bg-white border-b border-[#C8D4E8] last:border-b-0 hover:bg-[#F4F7FB] transition-colors rounded-sm group">
      <div className="flex items-center gap-3 flex-1 overflow-hidden">
        <button 
          onClick={handleComplete}
          disabled={isCompleting || isSaving || isEditing}
          className="w-6 h-6 shrink-0 rounded-full border-2 border-[#C8D4E8] flex items-center justify-center text-transparent hover:border-[#1A7A4A] transition-colors disabled:opacity-50"
          aria-label="השלם משימה"
        >
          <span className="text-sm">✓</span>
        </button>
        {isEditing ? (
          <input
            type="text"
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            onBlur={handleSave}
            onKeyDown={(e) => e.key === 'Enter' && handleSave()}
            disabled={isSaving}
            autoFocus
            className="flex-1 px-2 py-1 border border-[#C8D4E8] rounded outline-none focus:border-[#1A7A4A]"
          />
        ) : (
          <span 
            className="text-[#1B2A4A] font-medium truncate cursor-text hover:underline"
            onClick={() => setIsEditing(true)}
          >
            {task.title}
          </span>
        )}
      </div>
      
      <div className="flex items-center gap-2">
        {task.assignee && (
          <span className="text-xs bg-[#E8F5EE] text-[#1A7A4A] px-2 py-1 rounded-full whitespace-nowrap border border-[#bce3cd]">
            {task.assignee}
          </span>
        )}
        {can_delete && !isEditing && (
          <button 
            onClick={handleDelete}
            className="text-gray-400 hover:text-red-500 font-bold opacity-0 group-hover:opacity-100 transition-opacity px-2"
            title="מחק משימה"
          >
            ×
          </button>
        )}
      </div>
    </div>
  );
}
