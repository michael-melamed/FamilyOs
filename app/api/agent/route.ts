import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parsePrompt } from '@/lib/agent/parser';
import { createTask, updateTask, completeTask, deleteTask } from '@/lib/actions/tasks';
import { addShoppingItem, clearAllShoppingItems, clearCheckedItems } from '@/lib/actions/shopping';
import { createList, renameList, deleteList, clearList } from '@/lib/actions/lists';
import { updateHouseholdName } from '@/lib/actions/households';
import { upsertMemory } from '@/lib/actions/memory';
import type { Task, List } from '@/types';

/**
 * @file route.ts (API route: POST /api/agent)
 * @description_he נקודת הכניסה של הסוכן — מקבל פרומפט, מחזיר פעולות ומריץ אותן
 * @description_en Agent entry point — receives prompt, parses it with Claude, executes actions
 * @inputs    POST body: { prompt: string, familyId: string }
 * @outputs   JSON: { summary: string, actionsExecuted: number, actions: AgentAction[] }
 * @depends_on lib/agent/parser.ts, lib/actions/tasks.ts, lib/actions/shopping.ts, lib/actions/memory.ts
 * @used_by   hooks/usePrompt.ts (client-side fetch)
 * @fix_guide
 *   - 401 → user not authenticated; ensure session cookie is valid
 *   - 403 → familyId not sent or user is not a member of that household
 *   - 500 → check agent_logs table for the failed prompt details
 */

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json();
    const { prompt, familyId } = body;

    if (!prompt || typeof prompt !== 'string') {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    if (!familyId || typeof familyId !== 'string') {
      return NextResponse.json({ error: 'familyId is required' }, { status: 400 });
    }

    // Validate that this user is actually a member of the specified household.
    // Use .maybeSingle() (or filter on user_id) to handle users with multiple households correctly.
    const { data: memberships } = await supabase
      .from('household_members')
      .select('household_id, role')
      .eq('user_id', session.user.id)
      .eq('household_id', familyId);

    if (!memberships || memberships.length === 0) {
      return NextResponse.json(
        { error: 'User does not belong to this household.' },
        { status: 403 }
      );
    }

    const householdId = familyId;
    const callerRole = memberships[0].role;

    // Fetch household permissions to respect them
    let permissions = null;
    try {
      const { data } = await supabase
        .from('household_permissions')
        .select('*')
        .eq('household_id', householdId)
        .single();
      permissions = data;
    } catch (e) {
      console.warn('Could not fetch permissions, defaulting to null', e);
    }

    // Load active tasks for agent context (household-scoped)
    const { data: activeTasks } = await supabase
      .from('tasks')
      .select('*')
      .eq('household_id', householdId)
      .neq('status', 'done');

    // Load available lists so the agent knows where to add tasks
    const { data: availableLists } = await supabase
      .from('lists')
      .select('id, name')
      .eq('household_id', householdId)
      .order('created_at', { ascending: true });

    const agentOutput = await parsePrompt(
      prompt,
      householdId,
      (activeTasks as Task[]) ?? [],
      (availableLists as Pick<List, 'id' | 'name'>[]) ?? []
    );

    let actionsExecutedCount = 0;

    for (const action of agentOutput.actions) {
      try {
        switch (action.type) {
          case 'ADD_TASK': {
            const parentTask = await createTask(householdId, action.title, action.assignee, action.list_id);
            if (action.sub_tasks && action.sub_tasks.length > 0) {
              for (const sub of action.sub_tasks) {
                await createTask(householdId, sub, action.assignee, action.list_id, parentTask.id);
              }
            }
            actionsExecutedCount++;
            break;
          }
          case 'COMPLETE_TASK':
            if (!action.task_id.startsWith('INFER:')) {
              await completeTask(action.task_id);
              actionsExecutedCount++;
            }
            break;
          case 'ADD_SHOPPING':
            await addShoppingItem(householdId, action.item, action.quantity, action.category);
            actionsExecutedCount++;
            break;
          case 'UPDATE_TASK':
            if (!action.task_id.startsWith('INFER:')) {
              await updateTask(action.task_id, action.changes);
              actionsExecutedCount++;
            }
            break;
          case 'UPDATE_MEMORY':
            await upsertMemory(householdId, action.key, action.value, action.category);
            actionsExecutedCount++;
            break;
          case 'DELETE_TASK':
            if (!action.task_id.startsWith('INFER:')) {
              if (callerRole !== 'admin' && permissions?.can_delete_tasks === false) {
                throw new Error('אין לך הרשאה למחוק משימות בקבוצה זו');
              }
              await deleteTask(action.task_id);
              actionsExecutedCount++;
            }
            break;
          case 'CREATE_LIST':
            await createList(householdId, action.name);
            actionsExecutedCount++;
            break;
          case 'DELETE_LIST': {
            const listId = action.list_id;
            const isDefault = listId === 'INFER:קניות' || listId === 'INFER:משימות' ||
              (listId.startsWith('INFER:') && ['קניות', 'משימות'].includes(listId.replace('INFER:', '').trim())) ||
              (availableLists?.find(l => l.id === listId)?.name === 'קניות' || availableLists?.find(l => l.id === listId)?.name === 'משימות');

            if (isDefault) {
              throw new Error('לא ניתן למחוק את רשימות ברירת המחדל');
            }

            if (!listId.startsWith('INFER:')) {
              if (callerRole !== 'admin') {
                throw new Error('רק מנהלים יכולים למחוק רשימות');
              }
              await deleteList(listId);
              actionsExecutedCount++;
            }
            break;
          }
          case 'CLEAR_LIST': {
            const listId = action.list_id;
            const isShopping = listId === 'INFER:קניות' || 
              (listId.startsWith('INFER:') && listId.replace('INFER:', '').trim() === 'קניות') ||
              (availableLists?.find(l => l.id === listId)?.name === 'קניות');

            if (isShopping) {
              if (callerRole !== 'admin' && permissions?.can_clear_lists === false) {
                throw new Error('אין לך הרשאה לנקות את רשימת הקניות');
              }
              const cleanPrompt = prompt.toLowerCase();
              // Check if prompt specifically mentions clearing "all" or "everything"
              const shouldClearAll = cleanPrompt.includes('כל') || cleanPrompt.includes('הכל') || cleanPrompt.includes('לגמרי');
              
              if (shouldClearAll) {
                await clearAllShoppingItems(householdId);
              } else {
                await clearCheckedItems(householdId);
              }
              actionsExecutedCount++;
            } else if (!listId.startsWith('INFER:')) {
              if (callerRole !== 'admin' && permissions?.can_clear_lists === false) {
                throw new Error('אין לך הרשאה לנקות רשימות בקבוצה זו');
              }
              await clearList(householdId, listId);
              actionsExecutedCount++;
            }
            break;
          }
          case 'RENAME_LIST':
            if (!action.list_id.startsWith('INFER:')) {
              await renameList(action.list_id, action.new_name);
              actionsExecutedCount++;
            }
            break;
          case 'REORDER_TASKS': {
            // Need to import reorderTasks from '@/lib/actions/tasks'
            const { reorderTasks } = await import('@/lib/actions/tasks');
            if (action.task_ids && action.task_ids.length > 0) {
               await reorderTasks(action.task_ids);
               actionsExecutedCount++;
            }
            break;
          }
          case 'RENAME_HOUSEHOLD':
            if (callerRole !== 'admin') {
              throw new Error('רק מנהלים יכולים לשנות את שם הבית');
            }
            await updateHouseholdName(householdId, action.new_name);
            actionsExecutedCount++;
            break;
          case 'NO_ACTION':
            break;
        }
      } catch (err) {
        console.error('Failed executing action:', action.type, err);
        // Continue with remaining actions — partial execution is better than full failure
      }
    }

    return NextResponse.json({
      actions: agentOutput.actions,
      summary: agentOutput.summary,
      actionsExecuted: actionsExecutedCount,
    });

  } catch (error: any) {
    console.error('Agent route error:', error);
    return NextResponse.json({ error: error.message || 'Internal agent failure' }, { status: 500 });
  }
}

