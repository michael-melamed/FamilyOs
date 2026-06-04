import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * @file lib/supabase/server.ts
 *
 * @description_he קליינט Supabase לשרת (Server Client)
 * @description_en Supabase server client
 *
 * @inputs    None
 * @outputs   createClient method resolving to Supabase Server Client instance
 *
 * @depends_on   @supabase/ssr, next/headers
 * @used_by      Server Actions, API Routes, Server Components
 *
 * @fix_guide
 *   - "cookies() error": Ensure you map cookies correctly awaiting them or wrapping in an async boundary where required.
 *
 * @example
 *   // const supabase = createClient()
 */
export function createClient() {
  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value, ...options })
          } catch (error) {
            // The `set` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
        remove(name: string, options: CookieOptions) {
          try {
            cookieStore.set({ name, value: '', ...options })
          } catch (error) {
            // The `delete` method was called from a Server Component.
            // This can be ignored if you have middleware refreshing
            // user sessions.
          }
        },
      },
    }
  )
}
