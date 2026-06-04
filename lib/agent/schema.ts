import { Task } from '@/types'

/**
 * @file lib/agent/schema.ts
 * @description_he טיפוסי TypeScript לפלט הסוכן — החוזה בין הסוכן לשאר המערכת
 * @description_en TypeScript types for agent output — the contract between agent and the rest of the system
 * @inputs    none — types only
 * @outputs   AgentAction, AgentOutput types
 * @depends_on types/index.ts
 * @used_by   lib/agent/parser.ts, lib/actions/tasks.ts, lib/actions/shopping.ts
 * @fix_guide
 *   - If type errors appear in parser.ts → check this file matches the system prompt action shapes exactly
 */

export type MemoryCategory = 'general' | 'member' | 'preference' | 'routine'

export type AgentAction =
  | { type: 'COMPLETE_TASK';  task_id: string }
  | { type: 'ADD_TASK';       title: string; assignee?: string }
  | { type: 'ADD_SHOPPING';   item: string; quantity?: string }
  | { type: 'UPDATE_TASK';    task_id: string; changes: Partial<Task> }
  | { type: 'UPDATE_MEMORY';  key: string; value: string; category: MemoryCategory }
  | { type: 'NO_ACTION';      message: string }

export type AgentOutput = {
  actions: AgentAction[]
  summary: string
}
