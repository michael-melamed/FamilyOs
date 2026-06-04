/**
 * @file lib/supabase/client.ts
 *
 * @description_he קליינט Supabase לדפדפן (Browser Client)
 * @description_en Supabase browser client
 *
 * @inputs    None
 * @outputs   createClient instance
 *
 * @depends_on   @supabase/ssr
 * @used_by      React Client Components and Providers
 *
 * @fix_guide
 *   - "window is not defined": Usually means you imported this file in a Server Component instead of a Client Component.
 *
 * @example
 *   // const supabase = createClient()
 */
import { createBrowserClient } from '@supabase/ssr'

export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )
}
