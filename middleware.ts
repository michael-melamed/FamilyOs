import { createServerClient } from '@supabase/ssr';
import { NextResponse, type NextRequest } from 'next/server';

/**
 * @file middleware.ts
 * @description_he הגנת נתיבים באמצעות Next.js Middleware והקצאת רענון תוקף של הסשן.
 * @description_en Route protection via Next.js Middleware and automated session refreshing.
 * @inputs    req: NextRequest
 * @outputs   NextResponse
 * @depends_on @supabase/ssr
 * @used_by   Next.js Framework Router
 * @fix_guide
 *   - Redirect loop → make sure /login and /invite are listed in isAuthRoute check
 *   - Session not refreshing → confirm setAll writes cookies back to supabaseResponse
 *   - /dashboard accessible without login → verify matcher pattern covers the route
 */

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({
    request,
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request,
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Routes that don't require authentication
  const isAuthRoute = pathname.startsWith('/login') || pathname.startsWith('/invite');

  // API and OAuth callback routes — always pass through so Supabase can exchange the code
  const isApiRoute =
    pathname.startsWith('/api') || pathname.startsWith('/auth');

  if (isApiRoute) {
    return supabaseResponse;
  }

  // Logged-out user trying to reach a protected page → send to /login
  if (!user && !isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    return NextResponse.redirect(url);
  }

  // Logged-in user on an auth page (login / invite landing) → send to /dashboard
  if (user && isAuthRoute) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  // Logged-in user on root / → send to /dashboard
  // NOTE: this must come AFTER the isAuthRoute check above to avoid an unreachable branch
  if (user && pathname === '/') {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    return NextResponse.redirect(url);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
