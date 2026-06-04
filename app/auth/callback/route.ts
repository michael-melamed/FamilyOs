import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';
import { createHouseholdForUser } from '@/lib/actions/households';

/**
 * @file route.ts (API route: GET /auth/callback)
 * @description_he נקודת הקצה לאימות חזרת ה-OAuth, סנכרון הסשן ויצירת household
 * @description_en Handles Google OAuth callback — exchanges code for session, bootstraps household on first login
 * @inputs    URL search param: code (from Supabase OAuth), next (optional redirect target)
 * @outputs   Redirect to /dashboard on success, /login?error=auth-callback-failed on failure
 * @depends_on @supabase/ssr, lib/actions/households.ts
 * @used_by   Supabase OAuth redirect (configured in Supabase Dashboard → Auth → URL Configuration)
 * @fix_guide
 *   - Redirect loop → check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
 *   - Household not created → check SUPABASE_SERVICE_ROLE_KEY is set in .env.local
 *   - Callback URL mismatch → add http://localhost:3000/auth/callback to Supabase allowed redirect URLs
 */

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') ?? '/dashboard';

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() { return cookieStore.getAll(); },
          setAll(cookiesToSet) {
            try {
              cookiesToSet.forEach(({ name, value, options }) =>
                cookieStore.set(name, value, options)
              );
            } catch {
              // Safe to ignore in Server Components — middleware handles session refresh
            }
          },
        },
      }
    );

    const { error, data } = await supabase.auth.exchangeCodeForSession(code);

    if (!error && data.session) {
      // Bootstrap household for first-time login — idempotent (safe to call on every login)
      try {
        await createHouseholdForUser(
          data.session.user.id,
          data.session.user.user_metadata?.full_name
        );
      } catch (err) {
        console.error('Failed to bootstrap household for user:', err);
        // Non-fatal — user can still log in; household creation can be retried
      }

      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth-callback-failed`);
}
