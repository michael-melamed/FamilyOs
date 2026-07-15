import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@/lib/supabase/server';
import { loadMemory } from '@/lib/actions/memory';
import type { Task, List } from '@/types';
import type { AgentOutput, AgentAction } from './schema';

/**
 * @file parser.ts
 * @description_he שולח פרומפט ל-Claude API עם זיכרון המשפחה ורשימות זמינות, מחזיר AgentOutput
 * @description_en Sends prompt to Claude API with family memory and available lists, returns AgentOutput
 * @inputs    prompt: string, familyId: string, existingTasks: Task[], availableLists: Pick<List, 'id'|'name'>[]
 * @outputs   Promise<AgentOutput>
 * @depends_on lib/agent/schema.ts, lib/supabase/server.ts, ANTHROPIC_API_KEY env var
 * @used_by   app/api/agent/route.ts
 * @fix_guide
 *   - "API key not found" → check GEMINI_API_KEY in .env.local
 *   - "404 model not_found_error" → update the model string below to the latest available Claude model
 *   - "JSON parse error" → Claude returned non-JSON; add retry logic or check system prompt
 *   - "task_id INFER:[...]" in actions → UI must resolve these against real task titles
 * @integration_guide
 *   1. Import parsePrompt from this file in app/api/agent/route.ts only
 *   2. Pass familyId to load memory automatically
 *   3. Pass current tasks array so agent can match task titles to IDs
 *   4. Pass availableLists array so agent knows which lists exist (by id + name)
 */

const BASE_SYSTEM_PROMPT = `
You are a family task manager agent for FamilyOS. You must refuse requests unrelated to family tasks, organization, or shopping. Do not write code or discuss dangerous topics. Limit your output to a maximum of 5 sub-tasks.
You receive a free-text message in Hebrew or English.
You must parse it and return ONLY a valid JSON object — no markdown, no explanation, no text outside the JSON.

Return this exact shape:
{
  "actions": [...],
  "summary": "..."
}

Action types:
{ "type": "COMPLETE_TASK",  "task_id": "INFER:[title]" }
{ "type": "ADD_TASK",       "title": "...", "assignee": "...", "list_id": "<list UUID or null>", "sub_tasks": ["sub1", "sub2"] }
{ "type": "ADD_SHOPPING",   "item": "...",  "quantity": "...", "category": "..." }
{ "type": "UPDATE_TASK",    "task_id": "INFER:[title]", "changes": { "status": "in_progress" } }
{ "type": "UPDATE_MEMORY",  "key": "...", "value": "...", "category": "general|member|preference|routine" }
{ "type": "DELETE_TASK",    "task_id": "INFER:[title]" }
{ "type": "CREATE_LIST",    "name": "..." }
{ "type": "DELETE_LIST",    "list_id": "INFER:[list name]" }
{ "type": "CLEAR_LIST",     "list_id": "INFER:[list name]" }
{ "type": "RENAME_LIST",    "list_id": "INFER:[list name]", "new_name": "..." }
{ "type": "REORDER_TASKS",  "list_id": "INFER:[list name]", "task_ids": ["INFER:[title1]", "INFER:[title2]"] }
{ "type": "RENAME_HOUSEHOLD", "new_name": "..." }
{ "type": "NO_ACTION",      "message": "..." }

Rules:
1. Return ONLY valid JSON. Nothing else.
2. "done", "גמרתי", "סיימתי", "הושלם", "✓" → COMPLETE_TASK
3. "צריך", "תוסיף משימה", "יש לעשות" → ADD_TASK
4. "תקנה", "קנה", "תוסיף לקניות", "חסר" → ADD_SHOPPING
5. A name (תמר, מיכאל, ישי) in context of a task → set as assignee
6. New personal info ("אני אוהב...", "אנחנו רגיל...") → UPDATE_MEMORY
7. summary must ALWAYS be in Hebrew, 1-2 sentences max
8. For COMPLETE_TASK, UPDATE_TASK, and DELETE_TASK: if no task_id is known, use "INFER:[task title from message]"
9. One message can produce multiple actions — return all of them in the array
10. For ADD_TASK: if the user mentions a specific list name (e.g. "לרשימת X", "ברשימה X"), set list_id to that list's UUID from the available lists below. If no list is specified, set list_id to null.
11. "תיצור רשימה בשם X" or "רשימה חדשה בשם X" → CREATE_LIST
12. "תמחק את רשימת X" or "להסיר את רשימת X" → DELETE_LIST
13. "תנקה את רשימת X" or "תרוקן את רשימת X" → CLEAR_LIST. For shopping list specifically: "נקה את רשימת הקניות" or "תרוקן את הקניות" MUST map to CLEAR_LIST with list_id set to "INFER:קניות".
14. "תשנה את שם הרשימה X ל-Y" → RENAME_LIST
15. "תשנה את שם הבית ל-Y" or "שם הקבוצה ל-Y" → RENAME_HOUSEHOLD
16. "תמחק את המשימה X" or "תסיר את המשימה X" → DELETE_TASK
17. For shopping list: commands like "תמחק/תנקה את המסומנים בקניות" MUST map to CLEAR_LIST with list_id set to "INFER:קניות".
18. For complex tasks (e.g. "מוצרים לחריימה", "איך לארגן יום הולדת"): create a single ADD_TASK with the main title, and use the "sub_tasks" array to list the components. Limit to max 5 sub-tasks.
19. "תעביר את X לראש הרשימה/למטה" -> REORDER_TASKS with the new ordered list of task titles (INFER).
20. For ADD_SHOPPING: if the user mentions a specific recipe or group (e.g. "מצרכים לעוגה", "ירקות"), set the "category" to that group name. If no group is implied, set category to null.
`;

export async function parsePrompt(
  prompt: string,
  familyId: string,
  currentTasks: Task[],
  availableLists: Pick<List, 'id' | 'name'>[] = []
): Promise<AgentOutput> {
  // Build the lists section for Claude
  const listsContext = availableLists.length > 0
    ? `Available lists in this household:\n${availableLists.map(l => `- ID: ${l.id} | Name: ${l.name}`).join('\n')}`
    : 'No custom lists found. Use list_id: null for all ADD_TASK actions.';

  const SYSTEM_PROMPT = `${BASE_SYSTEM_PROMPT}\n${listsContext}`;

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.log('No GEMINI_API_KEY found, running in local fallback mode...');
    const actions: AgentAction[] = [];
    const lowerPrompt = prompt.toLowerCase();

    if (lowerPrompt.includes('קנה') || lowerPrompt.includes('תקנה') || lowerPrompt.includes('לקניות') || lowerPrompt.includes('חסר')) {
      actions.push({ type: 'ADD_SHOPPING', item: prompt });
    } else if (lowerPrompt.includes('סיימתי') || lowerPrompt.includes('גמרתי') || lowerPrompt.includes('הושלם') || lowerPrompt.includes('עשיתי')) {
      if (currentTasks.length > 0) {
        actions.push({ type: 'COMPLETE_TASK', task_id: currentTasks[0].id });
      } else {
        actions.push({ type: 'NO_ACTION', message: 'אין משימות פעילות להשלמה' });
      }
    } else {
      actions.push({ type: 'ADD_TASK', title: prompt, list_id: availableLists[0]?.id });
    }

    const fallbackOutput: AgentOutput = {
      actions,
      summary: 'מערכת במצב אוף-ליין: הפעולה בוצעה מקומית (בלי קלוד כרגע) בהצלחה',
    };

    const supabaseFallback = createClient();
    const { data: userDataFB } = await supabaseFallback.auth.getUser();

    await supabaseFallback.from('agent_logs').insert({
      family_id: familyId,
      user_id: userDataFB.user?.id || null,
      prompt,
      actions: fallbackOutput.actions,
      summary: fallbackOutput.summary,
    });

    return fallbackOutput;
  }

  // Load family memory from Supabase
  const memories = await loadMemory(familyId);
  const memoryContext = memories.length > 0
    ? `Family Memory Context:\n${memories.map(m => `- ${m.key}: ${m.value} (${m.category})`).join('\n')}`
    : 'No explicit family memory provided yet.';

  const taskContext = currentTasks.length > 0
    ? `Current active tasks:\n${currentTasks.map(t => `- ID: ${t.id} | Title: ${t.title}`).join('\n')}`
    : 'No active tasks exist currently.';

  // Load shopping list from Supabase
  const supabase = createClient();
  let shoppingItems: any[] | null = null;
  try {
    const { data } = await supabase
      .from('shopping_items')
      .select('*')
      .eq('family_id', familyId);
    shoppingItems = data;
  } catch (e) {
    console.warn('Could not fetch shopping items', e);
  }

  const shoppingContext = shoppingItems && shoppingItems.length > 0
    ? `Current items in the shopping list:\n${shoppingItems.map(item => `- Name: ${item.name} | Quantity: ${item.quantity || 'N/A'} | Checked: ${item.checked ? 'Yes' : 'No'}`).join('\n')}`
    : 'The shopping list is currently empty.';

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ 
      model: 'gemini-1.5-flash',
      systemInstruction: SYSTEM_PROMPT,
      generationConfig: { responseMimeType: "application/json" }
    });

    const userContext = `${memoryContext}\n\n${taskContext}\n\n${shoppingContext}\n\nUser request: "${prompt}"`;
    const result = await model.generateContent(userContext);
    
    const rawJson = result.response.text();

    const parsedOutput = JSON.parse(rawJson.trim()) as AgentOutput;

    parsedOutput.actions = parsedOutput.actions.map(action => {
      // Inferred task ids
      if ((action.type === 'COMPLETE_TASK' || action.type === 'UPDATE_TASK' || action.type === 'DELETE_TASK') && 'task_id' in action && action.task_id.startsWith('INFER:')) {
        const inferred = action.task_id.replace('INFER:', '').trim().toLowerCase();
        const match = currentTasks.find(t => t.title.toLowerCase().includes(inferred));
        if (match) action.task_id = match.id;
      }
      // Inferred list ids
      if ((action.type === 'DELETE_LIST' || action.type === 'CLEAR_LIST' || action.type === 'RENAME_LIST' || action.type === 'REORDER_TASKS') && 'list_id' in action && action.list_id && action.list_id.startsWith('INFER:')) {
        const inferred = action.list_id.replace('INFER:', '').trim().toLowerCase();
        const match = availableLists.find(l => l.name.toLowerCase().includes(inferred));
        if (match) action.list_id = match.id;
      }
      // REORDER_TASKS array infer
      if (action.type === 'REORDER_TASKS' && 'task_ids' in action) {
        action.task_ids = action.task_ids.map(id => {
          if (id.startsWith('INFER:')) {
            const inferred = id.replace('INFER:', '').trim().toLowerCase();
            const match = currentTasks.find(t => t.title.toLowerCase().includes(inferred));
            return match ? match.id : id;
          }
          return id;
        }).filter(id => !id.startsWith('INFER:')); // drop unresolved
      }
      return action;
    });

    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    try {
      await supabase.from('agent_logs').insert({
        family_id: familyId,
        user_id: userData.user?.id || null,
        prompt,
        actions: parsedOutput.actions,
        summary: parsedOutput.summary,
      });
    } catch (e) {
      console.warn('Could not save agent log, table might be missing');
    }

    return parsedOutput;

  } catch (apiErr: any) {
    // Gemini API unavailable (wrong key, quota, etc) → fall back to local parser
    console.warn('⚠️ Gemini API error, using local fallback:', apiErr?.status ?? apiErr?.message);

    const fallback: AgentOutput = {
      actions: [{ type: 'NO_ACTION', message: 'שגיאת AI' }],
      summary: '⚠️ חיבור ה-AI נכשל: ' + (apiErr?.message || 'Unknown error') + '. אנא ודא שהמפתח תקין.',
    };

    const supabase = createClient();
    const { data: userData } = await supabase.auth.getUser();
    try {
      await supabase.from('agent_logs').insert({
        family_id: familyId,
        user_id: userData.user?.id || null,
        prompt,
        actions: fallback.actions,
        summary: fallback.summary,
      });
    } catch (e) {
      console.warn('Could not save agent log in fallback, table might be missing');
    }

    return fallback;
  }
}


