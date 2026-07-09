/**
 * @file app/page.tsx
 *
 * @description_he דף הנחיתה הראשי של האפליקציה (ניתוב /)
 * @description_en Main landing page of the application (route /)
 *
 * @inputs    None
 * @outputs   Landing page component
 *
 * @depends_on   None currently (Next.js Link to be added)
 * @used_by      Next.js Router
 *
 * @fix_guide
 *   - Route not found: Ensure this file is inside app/
 *
 * @integration_guide
 *   Will redirect or link to /dashboard or /login
 *
 * @example
 *   <Page />
 */
import Link from 'next/link';

export default function Page() {
  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 text-center" dir="rtl">
      <div className="max-w-md w-full space-y-8 bg-white p-10 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-gray-100 relative overflow-hidden">
        
        {/* Background decorative elements */}
        <div className="absolute -top-24 -right-24 w-48 h-48 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-48 h-48 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center space-y-4">
          <div className="w-16 h-16 bg-gradient-to-tr from-primary to-blue-500 rounded-2xl flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-3xl text-white">🏠</span>
          </div>
          
          <h1 className="text-4xl font-extrabold tracking-tight text-gray-900">
            FamilyOS
          </h1>
          
          <p className="text-lg text-gray-500 max-w-sm mx-auto leading-relaxed">
            המערכת החכמה לניהול הבית והמשפחה שלך. משימות, קניות וסידורים - הכל במקום אחד.
          </p>
        </div>

        <div className="relative z-10 pt-4">
          <Link 
            href="/login" 
            className="w-full flex items-center justify-center py-4 px-8 border border-transparent rounded-2xl shadow-sm text-lg font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary transition-all duration-200 active:scale-[0.98]"
          >
            התחברות / הרשמה
          </Link>
        </div>
      </div>
    </main>
  );
}
