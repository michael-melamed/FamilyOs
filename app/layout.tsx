/**
 * @file app/layout.tsx
 *
 * @description_he קובץ פריסת הבסיס (Root Layout) של האפליקציה ב-Next.js
 * @description_en Root Layout component for the Next.js application
 *
 * @inputs    children: React.ReactNode — הדפים או הרכיבים השזורים בפנים
 * @outputs   Root HTML and Body with RTL setup
 *
 * @depends_on   globals.css
 * @used_by      Next.js App Router
 *
 * @fix_guide
 *   - CSS issues: Check if globals.css is correctly imported.
 *   - LTR layout: Ensure `<html lang="he" dir="rtl">` remains.
 *
 * @example
 *   export default function RootLayout({ children }) { return <html><body>{children}</body></html>; }
 */
import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'FamilyOS',
  description: 'Family Task & Agent Manager',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="he" dir="rtl">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <meta name="theme-color" content="#1B2A4A" />
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="FamilyOS" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
        <script dangerouslySetInnerHTML={{ __html: `
          if ('serviceWorker' in navigator) {
            window.addEventListener('load', function() {
              navigator.serviceWorker.register('/sw.js').then(function(reg) {
                console.log('SW registered:', reg.scope);
              }).catch(function(err) {
                console.log('SW registration failed:', err);
              });
            });
          }
        ` }} />
      </head>
      <body className="bg-[#F4F7FB] text-[#1B2A4A]">{children}</body>
    </html>
  )
}
