/**
 * @file types/index.ts
 *
 * @description_he הגדרות טיפוסים של TypeScript הבסיסיים למערכת
 * @description_en TypeScript global type definitions based on SQL migrations
 *
 * @inputs    None
 * @outputs   Interface and type exports matching the SQL logic
 *
 * @depends_on   None
 * @used_by      System wide
 *
 * @example
 *   // import type { Task } from '@/types'
 */

export type TaskStatus = 'pending' | 'in_progress' | 'done'
export type MemoryCategory = 'general' | 'member' | 'preference' | 'routine'

export type Family = {
  id: string
  name: string
  created_at: string
}

export type Task = {
  id: string
  family_id: string
  household_id?: string
  title: string
  status: TaskStatus
  assignee?: string
  parent_id?: string
  position: number
  created_by?: string
  created_at: string
  updated_at: string
}

export type ShoppingItem = {
  id: string
  family_id: string
  name: string
  quantity?: string
  checked: boolean
  created_by?: string
  created_at: string
  updated_at: string
}

export type FamilyMemory = {
  id: string
  family_id: string
  key: string
  value: string
  category: MemoryCategory
  updated_at: string
}

export type Household = {
  id: string
  name: string
  created_by: string
  created_at: string
}

export type HouseholdMember = {
  id: string
  household_id: string
  user_id: string
  role: 'admin' | 'member'
  joined_at: string
}

export type HouseholdPermission = {
  id: string
  household_id: string
  can_add_tasks: boolean
  can_delete_tasks: boolean
  can_clear_lists: boolean
  can_delete_lists: boolean
  can_add_to_specific_lists_only: boolean
  allowed_list_ids: string[] | null
}

export type InviteCode = {
  id: string
  household_id: string
  code: string
  created_by: string
  created_at: string
  expires_at: string | null
  is_active: boolean
}

export type List = {
  id: string
  household_id: string
  name: string
  is_locked: boolean
  created_by?: string
  created_at: string
}
