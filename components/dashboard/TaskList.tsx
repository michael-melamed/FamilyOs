'use client';

/**
 * @file components/dashboard/TaskList.tsx
 * @description_he רשימת משימות — מציגה משימות ראשיות ותתי משימות, גרירה ושחרור, ומשימות שהושלמו
 * @description_en Task list — shows top-level tasks with subtasks, drag & drop, and completed tasks
 * @inputs    tasks: Task[], familyId: string, onUpdate: () => void
 * @outputs   JSX task list section
 * @depends_on components/dashboard/TaskItem.tsx, lib/actions/tasks.ts, @hello-pangea/dnd
 */

import { useState } from 'react';
import type { Task } from '@/types';
import { TaskItem } from './TaskItem';
import { clearCompletedTasks, reorderTasks } from '@/lib/actions/tasks';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

type TaskListProps = {
  listName?: string;
  tasks: Task[];
  familyId: string | undefined;
  onUpdate: () => void;
  is_locked?: boolean;
  can_add_tasks?: boolean;
  can_delete_tasks?: boolean;
  listId?: string;
};

export function TaskList({ listName = 'משימות', tasks, familyId, onUpdate, is_locked = false, can_add_tasks = true, can_delete_tasks = false, listId }: TaskListProps) {
  const [isClearing, setIsClearing] = useState(false);

  // Filter tasks into top-level and completed
  const activeTopLevelTasks = tasks.filter((t) => t.status !== 'done' && !t.parent_id).sort((a, b) => a.position - b.position);
  const doneTopLevelTasks = tasks.filter((t) => t.status === 'done' && !t.parent_id).sort((a, b) => a.position - b.position);
  
  // All subtasks (not top level)
  const allSubtasks = tasks.filter(t => t.parent_id);

  const handleClear = async () => {
    if (!familyId) return;
    setIsClearing(true);
    try {
      await clearCompletedTasks(familyId, listId);
      onUpdate();
    } catch (err) {
      console.error('Failed clearing tasks natively:', err);
    } finally {
      setIsClearing(false);
    }
  };

  const handleDragEnd = async (result: DropResult) => {
    if (!result.destination || is_locked) return;
    
    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;
    
    if (sourceIndex === destinationIndex) return;

    // Optimistic UI for drag
    const newActiveList = Array.from(activeTopLevelTasks);
    const [reorderedItem] = newActiveList.splice(sourceIndex, 1);
    newActiveList.splice(destinationIndex, 0, reorderedItem);

    // Call server to update positions in background
    try {
      const taskIds = newActiveList.map(t => t.id);
      // Fire and forget - realtime will eventually sync, but we don't await blocking UI
      reorderTasks(taskIds).then(() => onUpdate());
    } catch (err) {
      console.error('Failed to reorder tasks:', err);
    }
  };

  return (
    <div className="mb-6">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-[#1B2A4A] font-bold text-xl flex items-center gap-2">
          <span>📋</span> {listName} {is_locked && <span title="רשימה נעולה">🔒</span>}
        </h2>
        
        {doneTopLevelTasks.length > 0 && !is_locked && can_delete_tasks && (
          <button 
            onClick={handleClear} 
            disabled={isClearing}
            className="text-xs text-[#1A7A4A] font-medium bg-[#E8F5EE] px-3 py-1 rounded-full disabled:opacity-50 transition-colors"
          >
            {isClearing ? 'מנקה...' : 'נקה סיום'}
          </button>
        )}
      </div>
      
      {activeTopLevelTasks.length === 0 && doneTopLevelTasks.length === 0 ? (
        <div className="w-full bg-brand-teal/[0.02] rounded-xl py-4 px-4 border border-brand-teal/15 text-center">
          <p className="text-sm font-medium text-calm-text/70">ברשימה זו הכל שקט.</p>
        </div>
      ) : (
        <div className={`bg-white rounded-xl shadow-sm border border-[#C8D4E8] overflow-hidden ${is_locked ? 'opacity-70 pointer-events-none' : ''}`}>
          
          <DragDropContext onDragEnd={handleDragEnd}>
            <Droppable droppableId={`droppable-${listId || 'main'}`}>
              {(provided) => (
                <div {...provided.droppableProps} ref={provided.innerRef}>
                  {activeTopLevelTasks.map((task, index) => {
                    const subTasks = allSubtasks.filter(sub => sub.parent_id === task.id).sort((a, b) => a.position - b.position);
                    return (
                      <Draggable key={task.id} draggableId={task.id} index={index} isDragDisabled={is_locked}>
                        {(provided, snapshot) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            style={{
                              ...provided.draggableProps.style,
                              opacity: snapshot.isDragging ? 0.8 : 1,
                            }}
                            className={snapshot.isDragging ? 'shadow-lg relative z-50 bg-white' : ''}
                          >
                            <TaskItem 
                              task={task} 
                              subTasks={subTasks}
                              onUpdate={onUpdate} 
                              can_delete={can_delete_tasks} 
                              dragHandleProps={provided.dragHandleProps}
                            />
                          </div>
                        )}
                      </Draggable>
                    );
                  })}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </DragDropContext>

          {/* Completed Tasks at the bottom */}
          {doneTopLevelTasks.length > 0 && (
            <div className="border-t border-dashed border-[#C8D4E8] bg-[#F9FAFB] opacity-60">
              {doneTopLevelTasks.map(task => {
                const subTasks = allSubtasks.filter(sub => sub.parent_id === task.id).sort((a, b) => a.position - b.position);
                return (
                  <TaskItem 
                    key={task.id} 
                    task={task} 
                    subTasks={subTasks}
                    onUpdate={onUpdate} 
                    can_delete={can_delete_tasks} 
                  />
                );
              })}
            </div>
          )}

        </div>
      )}
    </div>
  );
}
