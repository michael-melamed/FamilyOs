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
    <main className="p-8">
      <h1 className="text-3xl font-bold">ברוכים הבאים ל-FamilyOS</h1>
      <Link href="/dashboard" className="text-blue-500 mt-4 block">
        לדשבורד
      </Link>
    </main>
  );
}
