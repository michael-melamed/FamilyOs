/**
 * @file types/index.ts
 *
 * @description_he הגדרות טיפוסים של TypeScript הבסיסיים למערכת
 * @description_en TypeScript global type definitions based on SQL migrations (001, 002, 007a)
 *
 * @inputs    None
 * @outputs   Interface and type exports matching the SQL schema
 *
 * @depends_on   None
 * @used_by      System wide
 *
 * @example
 *   import type { Task, Household } from '@/types'
 */

// ─── Primitives ───────────────────────────────────────────────────────────────

export type TaskStatus = 'pending' | 'in_progress' | 'done';
export type MemoryCategory = 'general' | 'member' | 'preference' | 'routine';
export type MemberRole = 'admin' | 'member';

// ─── Legacy (backfilled for shopping_items RLS) ───────────────────────────────

export type Family = {
  id: string;
  name: string;
  created_at: string;
};

// ─── Household (new schema — source of truth) ─────────────────────────────────

export type Household = {
  id: string;
  name: string;
  created_by: string;
  created_at: string;
};

export type NotificationPreferences = {
  notify_on_add: boolean;
  notify_on_complete: boolean;
  detailed_notifications: boolean;
  muted_list_ids: string[];
};

export type HouseholdMember = {
  id: string;
  household_id: string;
  user_id: string;
  role: MemberRole;
  joined_at: string;
  notification_preferences?: NotificationPreferences;
  cleared_history_at?: string;
};

export type HouseholdPermissions = {
  id: string;
  household_id: string;
  can_add_tasks: boolean;
  can_delete_tasks: boolean;
  can_add_shopping: boolean;
  can_delete_shopping: boolean;
  can_invite: boolean;
  can_edit_household: boolean;
  created_at: string;
  updated_at: string;
};

export type InviteCode = {
  id: string;
  household_id: string;
  code: string;
  created_by: string;
  is_active: boolean;
  expires_at: string | null;
  created_at: string;
};

export type List = {
  id: string;
  household_id: string;
  name: string;
  type: string;
  created_by: string;
  created_at: string;
};

// ─── Tasks ────────────────────────────────────────────────────────────────────

export type Task = {
  id: string;
  /** Primary filter — matches household_members.household_id */
  household_id: string;
  /** Legacy column — kept in sync with household_id for backwards compatibility */
  family_id: string;
  title: string;
  status: TaskStatus;
  assignee?: string;
  parent_id?: string;
  list_id?: string;
  position: number;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

// ─── Shopping ─────────────────────────────────────────────────────────────────

export type ShoppingItem = {
  id: string;
  /** Uses family_id column (legacy) — same UUID value as household_id */
  family_id: string;
  name: string;
  quantity?: string;
  checked: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
};

// ─── Agent Memory ─────────────────────────────────────────────────────────────

export type FamilyMemory = {
  id: string;
  family_id: string;
  key: string;
  value: string;
  category: MemoryCategory;
  updated_at: string;
};

// ─── API Utilities ────────────────────────────────────────────────────────────

/**
 * Standard API response wrapper.
 * All API routes and Server Actions should return this shape.
 * @example
 *   return NextResponse.json({ data: task } satisfies ApiResponse<Task>);
 *   return NextResponse.json({ error: 'Not found' } satisfies ApiResponse<Task>, { status: 404 });
 */
export type ApiResponse<T = unknown> = {
  data?: T;
  error?: string;
};

// ─── Activity Logs ────────────────────────────────────────────────────────────

export type ActivityLog = {
  id: string;
  household_id: string;
  actor_id: string | null;
  actor_name: string;
  action: 'INSERT' | 'UPDATE' | 'DELETE';
  entity_type: 'task' | 'shopping_item' | 'list';
  entity_title: string;
  details: any;
  created_at: string;
};

