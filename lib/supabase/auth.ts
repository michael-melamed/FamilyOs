import { createClient } from '@/lib/supabase/server'
import type { Session, User } from '@supabase/supabase-js'

/**
 * @file lib/supabase/auth.ts
 * @description_he פונקציות עזר לאימות בצד השרת — שליפת משתמש וסשן פעיל
 * @description_en Server-side auth helper functions — fetch current user and active session
 * @inputs    none — reads from Supabase cookie session automatically
 * @outputs   getUser(): Promise<User | null>, getSession(): Promise<Session | null>
 * @depends_on lib/supabase/server.ts
 * @used_by   app/auth/callback/route.ts, lib/actions/households.ts, server components
 * @fix_guide
 *   - Returns null unexpectedly → user is not logged in or session cookie is missing
 *   - "cookies() error" → must be called from a Server Component, Server Action, or Route Handler only
 *   - After OAuth login getUser() is null → wait for callback route to exchange code first
 */

/**
 * Returns the currently authenticated Supabase user from the server session.
 * Returns null if no session exists.
 */
export async function getUser(): Promise<User | null> {
  const supabase = createClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error) {
    // Not an error worth throwing — simply means no active session
    return null
  }

  return user
}

/**
 * Returns the currently active Supabase session from the server.
 * Returns null if the user is not logged in.
 */
export async function getSession(): Promise<Session | null> {
  const supabase = createClient()
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) {
    return null
  }

  return session
}
