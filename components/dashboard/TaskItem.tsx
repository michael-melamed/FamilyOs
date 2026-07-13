'use client';

/**
 * @file components/dashboard/TaskItem.tsx
 * @description_he פריט משימה בודד — צ'קבוקס, כותרת, אחראי, עריכה, תמיכה בתתי-משימות וגרירה
 * @description_en Single task item — checkbox, title, assignee, inline edit, subtasks & drag support
 * @inputs    task: Task, subTasks?: Task[], onUpdate: () => void
 * @outputs   JSX task row
 * @depends_on lib/actions/tasks.ts
 */

import { useState, useCallback, useEffect } from 'react';
import type { Task } from '@/types';
import { updateTask, deleteTask, completeTask } from '@/lib/actions/tasks';

type TaskItemProps = {
  task: Task;
  subTasks?: Task[];
  onUpdate: () => void;
  can_delete?: boolean;
  dragHandleProps?: any;
};

export function TaskItem({ task, subTasks = [], onUpdate, can_delete = false, dragHandleProps }: TaskItemProps) {
  const [isCompleting, setIsCompleting] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState(task.title);
  const [isSaving, setIsSaving] = useState(false);
  const [isProcessingAI, setIsProcessingAI] = useState(false);

  useEffect(() => {
    const handleStart = (e: any) => { if (e.detail === task.id) setIsProcessingAI(true); };
    const handleStop = (e: any) => { if (e.detail === task.id) setIsProcessingAI(false); };
    const handleClear = () => setIsProcessingAI(false);

    window.addEventListener('ai-start', handleStart);
    window.addEventListener('ai-stop', handleStop);
    window.addEventListener('ai-clear-all', handleClear);
    
    return () => {
      window.removeEventListener('ai-start', handleStart);
      window.removeEventListener('ai-stop', handleStop);
      window.removeEventListener('ai-clear-all', handleClear);
    }
  }, [task.id]);

  const handleAbortAI = () => {
    window.dispatchEvent(new CustomEvent('ai-abort'));
    setIsProcessingAI(false);
  };

  // Derive if this task is fully completed (either natively done, or it has subtasks and all are done)
  const isDone = task.status === 'done' || (subTasks.length > 0 && subTasks.every(st => st.status === 'done'));

  // If this task was auto-completed by its subtasks but DB status isn't done, update it silently
  useEffect(() => {
    if (subTasks.length > 0 && subTasks.every(st => st.status === 'done') && task.status !== 'done') {
      completeTask(task.id).then(() => onUpdate()).catch(console.error);
    }
  }, [subTasks, task.id, task.status, onUpdate]);

  const handleToggleStatus = useCallback(async () => {
    if (isCompleting) return;
    
    setIsCompleting(true);
    
    try {
      if (isDone) {
        await updateTask(task.id, { status: 'pending' });
      } else {
        await updateTask(task.id, { status: 'done' });
      }
      onUpdate();
    } catch (err) {
      console.error('Failed toggling task:', err);
    } finally {
      setIsCompleting(false);
    }
  }, [isDone, isCompleting, task.id, onUpdate]);

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

  const isParent = subTasks.length > 0;

  return (
    <div className={`flex flex-col border-b border-[#C8D4E8] last:border-b-0 group ${isDone ? 'bg-[#F9FAFB]' : 'bg-white hover:bg-[#F4F7FB] transition-colors'} rounded-sm`}>
      <div className="flex items-center justify-between py-3 px-4">
        
        <div className="flex items-center gap-3 flex-1 overflow-hidden">
          
          {/* Drag Handle */}
          {dragHandleProps && !isDone && (
            <div {...dragHandleProps} className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500 px-1" aria-label="גרור משימה">
              <svg width="12" height="16" viewBox="0 0 12 16" fill="currentColor"><path d="M4 2C4 3.10457 3.10457 4 2 4C0.89543 4 0 3.10457 0 2C0 0.89543 0.89543 0 2 0C3.10457 0 4 0.89543 4 2ZM4 8C4 9.10457 3.10457 10 2 10C0.89543 10 0 9.10457 0 8C0 6.89543 0.89543 6 2 6C3.10457 6 4 6.89543 4 8ZM4 14C4 15.10457 3.10457 16 2 16C0.89543 16 0 15.10457 0 14C0 12.8954 0.89543 12 2 12C3.10457 12 4 12.8954 4 14ZM12 2C12 3.10457 11.1046 4 10 4C8.89543 4 8 3.10457 8 2C8 0.89543 8.89543 0 10 0C11.1046 0 12 0.89543 12 2ZM12 8C12 9.10457 11.1046 10 10 10C8.89543 10 8 9.10457 8 8C8 6.89543 8.89543 6 10 6C11.1046 6 12 6.89543 12 8ZM12 14C12 15.10457 11.1046 16 10 16C8.89543 16 8 15.10457 8 14C8 12.8954 8.89543 12 10 12C11.1046 12 12 12.8954 12 14Z"/></svg>
            </div>
          )}

          {isProcessingAI ? (
            <div className="w-6 h-6 shrink-0 rounded-full flex items-center justify-center" aria-label="מעבד אינטיליגנציה מלאכותית">
              <span className="animate-spin block border-2 border-brand-purple border-t-transparent rounded-full w-5 h-5"></span>
            </div>
          ) : !isParent ? (
            <button 
              onClick={handleToggleStatus}
              disabled={isCompleting || isSaving || isEditing}
              className={`w-6 h-6 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${isDone ? 'border-brand-teal bg-brand-teal text-white' : 'border-[#C8D4E8] text-transparent hover:border-[#1A7A4A] disabled:opacity-50'}`}
              aria-label="שנה סטטוס משימה"
            >
              <span className="text-sm">✓</span>
            </button>
          ) : (
            <div className="w-6 h-6 shrink-0 flex items-center justify-center text-brand-teal font-bold text-lg">•</div>
          )}

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
              className={`text-[#1B2A4A] truncate cursor-text hover:underline ${isParent ? 'font-bold' : 'font-medium'} ${isDone ? 'line-through text-gray-400' : ''} ${isProcessingAI ? 'animate-pulse text-brand-purple' : ''}`}
              onClick={() => !isProcessingAI && !isDone && setIsEditing(true)}
            >
              {task.title}
            </span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          {isProcessingAI ? (
            <button 
              onClick={handleAbortAI}
              className="text-xs bg-red-50 text-red-600 px-3 py-1 rounded-full whitespace-nowrap border border-red-200 hover:bg-red-100 transition-colors font-medium cursor-pointer"
            >
              עצור
            </button>
          ) : task.assignee && (
            <span className={`text-xs px-2 py-1 rounded-full whitespace-nowrap border ${isDone ? 'bg-gray-100 text-gray-500 border-gray-200' : 'bg-[#E8F5EE] text-[#1A7A4A] border-[#bce3cd]'}`}>
              {task.assignee}
            </span>
          )}
          {can_delete && !isEditing && (
            <button 
              onClick={handleDelete}
              className="text-gray-400 hover:text-red-500 font-bold opacity-100 sm:opacity-0 group-hover:opacity-100 transition-opacity px-2"
              title="מחק משימה"
            >
              ×
            </button>
          )}
        </div>
      </div>

      {/* Render subtasks */}
      {isParent && (
        <div className="flex flex-col pb-2 pr-12 pl-4">
          {subTasks.map((subTask) => (
            <div key={subTask.id} className="flex items-center gap-3 py-2 border-t border-dashed border-gray-100 first:border-t-0">
              <button 
                onClick={async () => {
                  await updateTask(subTask.id, { status: subTask.status === 'done' ? 'pending' : 'done' });
                  onUpdate();
                }}
                className={`w-5 h-5 shrink-0 rounded-full border-2 flex items-center justify-center transition-colors ${subTask.status === 'done' ? 'border-brand-teal bg-brand-teal text-white' : 'border-[#C8D4E8] text-transparent hover:border-[#1A7A4A]'}`}
              >
                <span className="text-xs">✓</span>
              </button>
              <span className={`text-sm ${subTask.status === 'done' ? 'line-through text-gray-400' : 'text-[#1B2A4A] font-medium'}`}>
                {subTask.title}
              </span>
            </div>
          ))}
        </div>
      )}

    </div>
  );
}
