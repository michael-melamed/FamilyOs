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
import Script from 'next/script'

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
      </head>
      <body className="bg-[#F4F7FB] text-[#1B2A4A]">
        {children}
        
        {/* PWA Service Worker Registration */}
        <Script id="register-sw" strategy="afterInteractive">
          {`
            if ('serviceWorker' in navigator) {
              navigator.serviceWorker.register('/sw.js').then(
                function(registration) {
                  console.log('ServiceWorker registration successful');
                },
                function(err) {
                  console.log('ServiceWorker registration failed: ', err);
                }
              );
            }
          `}
        </Script>
      </body>
    </html>
  )
}

