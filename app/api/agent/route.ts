import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { parsePrompt } from '@/lib/agent/parser';
import { createTask, updateTask, completeTask } from '@/lib/actions/tasks';
import { addShoppingItem } from '@/lib/actions/shopping';
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
      .select('household_id')
      .eq('user_id', session.user.id)
      .eq('household_id', familyId);

    if (!memberships || memberships.length === 0) {
      return NextResponse.json(
        { error: 'User does not belong to this household.' },
        { status: 403 }
      );
    }

    const householdId = familyId;

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
          case 'ADD_TASK':
            await createTask(householdId, action.title, action.assignee, action.list_id);
            actionsExecutedCount++;
            break;
          case 'COMPLETE_TASK':
            if (!action.task_id.startsWith('INFER:')) {
              await completeTask(action.task_id);
              actionsExecutedCount++;
            }
            break;
          case 'ADD_SHOPPING':
            await addShoppingItem(householdId, action.item, action.quantity);
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

