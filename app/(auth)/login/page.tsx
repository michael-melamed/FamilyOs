'use client';

/**
 * @file app/(auth)/login/page.tsx




 * @description_he עמוד ההתחברות לאפליקציה — כפתור Google OAuth ותצוגת שגיאה
 * @description_en Login page — Google OAuth button and error state display
 * @inputs    URL search param: ?error=auth-callback-failed (optional)
 * @outputs   Login page JSX
 * @depends_on lib/supabase/client.ts

 * @used_by   Next.js Router, middleware.ts redirect
 * @fix_guide

 *   - Redirect loop after login → check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
 *   - Google popup closes immediately → verify Google OAuth is enabled in Supabase Dashboard → Auth → Providers
 *   - Callback URL mismatch → add http://localhost:3000/auth/callback to Supabase allowed redirect URLs
 *   - Error banner shown incorrectly → check the ?error= param is set by app/auth/callback/route.ts
 */

import { createClient } from '@/lib/supabase/client';

import { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import Image from 'next/image';


// Inner component that reads search params (must be wrapped in Suspense for Next.js 14)
function LoginForm() {
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const searchParams = useSearchParams();

  useEffect(() => {
    const error = searchParams.get('error');
    if (error === 'auth-callback-failed') {
      setErrorMessage('ההתחברות נכשלה. נסה שוב או פנה לתמיכה.');
    }
  }, [searchParams]);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    const supabase = createClient();





    // Always derive the origin from the browser — works for localhost and production equally
    const redirectUrl = `${window.location.origin}/auth/callback`;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });


    if (error) {
      setErrorMessage('לא ניתן להתחיל את תהליך ההתחברות. נסה שוב.');
      setIsLoading(false);
    }
    // If no error: browser will redirect to Google — keep isLoading=true
  };

  return (
    <div className="min-h-screen bg-calm-bg flex flex-col items-center justify-center p-4">
      <div className="bg-white p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] w-full max-w-md text-center border border-gray-100 relative overflow-hidden">
        
        {/* Background decorative elements */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-brand-teal/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-brand-purple/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 mb-8 flex flex-col items-center gap-4">
          <Image
            src="/logo.png"
            alt="FamilyOS Logo"
            width={72}
            height={72}
            className="rounded-2xl shadow-sm"
            priority
          />
          <div className="space-y-1">
            <h1 className="text-3xl font-extrabold text-calm-text tracking-wide">FamilyOS</h1>
            <p className="text-muted-warm font-medium">מנהל המשימות המשפחתי החכם</p>
          </div>
        </div>

        {/* Error banner — shown when OAuth callback returns with ?error= */}
        {errorMessage && (
          <div className="relative z-10 mb-6 bg-red-50/80 backdrop-blur-sm border border-red-100 text-red-600 text-sm px-4 py-3 rounded-2xl font-medium">
            {errorMessage}
          </div>
        )}

        <div className="relative z-10">
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white border border-gray-200 text-calm-text font-semibold py-4 px-4 rounded-2xl hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-purple transition-all shadow-sm disabled:opacity-60 disabled:cursor-not-allowed active:scale-[0.98]"
          >
            {isLoading ? (
              <span className="w-5 h-5 border-2 border-calm-text border-t-transparent rounded-full animate-spin"></span>
            ) : (
              <svg viewBox="0 0 24 24" className="w-5 h-5 bg-white rounded-full p-0.5">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            <span>התחברות עם חשבון Google</span>
          </button>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center">
        <span className="w-8 h-8 border-4 border-[#1B2A4A] border-t-transparent rounded-full animate-spin" />
      </div>
    }>
      <LoginForm />
    </Suspense>
  );
}
