'use client';

/**
 * @file components/layout/Header.tsx
 * @description_he כותרת האפליקציה — המבורגר, שם, לוגו, אווטאר משתמש, חיווי realtime
 * @description_en App header — hamburger menu, logo, app name, user avatar, realtime update indicator
 * @inputs    onMenuClick: () => void, hasRecentUpdate: boolean, updatedBy?: string,
 *            userName?: string, userAvatar?: string, onSignOut: () => void
 * @outputs   JSX header element
 * @depends_on lib/supabase/client.ts
 * @used_by   app/dashboard/page.tsx
 * @fix_guide
 *   - Realtime dot not appearing → check useBoard passes hasRecentUpdate correctly
 *   - Avatar not showing → check user_metadata.avatar_url is returned by Supabase Google OAuth
 *   - RTL layout broken → verify parent has dir="rtl"
 */

import Image from 'next/image';

type HeaderProps = {
  onMenuClick: () => void;
  hasRecentUpdate: boolean;
  updatedBy?: string;
  userName?: string;
  userAvatar?: string;
  householdName?: string;
  onSignOut: () => void;
};

export function Header({ onMenuClick, hasRecentUpdate, updatedBy, userName, userAvatar, householdName, onSignOut }: HeaderProps) {
  return (
    <header className="bg-[#1B2A4A] text-white flex items-center justify-between px-4 py-3 shadow-md sticky top-0 z-40">
      {/* Right side: hamburger + logo + name */}
      <div className="flex items-center gap-3">
        <button 
          onClick={onMenuClick} 
          className="text-2xl hover:bg-[#2E4A7A] p-2 rounded-full transition-colors"
          aria-label="פתח תפריט"
        >
          ☰
        </button>
        <div className="flex flex-col">
          <span className="font-bold text-2xl tracking-tight leading-none">FamilyOS</span>
          {householdName && (
            <span className="text-sm font-normal opacity-80 mt-1 leading-none">{householdName}</span>
          )}
        </div>
      </div>

      {/* Left side: realtime dot + user avatar + sign-out */}
      <div className="flex items-center gap-3">
        {hasRecentUpdate && (
          <div 
            className="w-3 h-3 bg-red-500 rounded-full animate-pulse relative group cursor-help"
            title={updatedBy ? `עודכן לאחרונה על ידי ${updatedBy}` : 'עודכן הרגע'}
          >
            <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-2 py-1 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap hidden md:block">
              {updatedBy ? `עודכן לאחרונה על ידי ${updatedBy}` : 'עודכן הרגע'}
            </div>
          </div>
        )}

        {/* User avatar from Google OAuth */}
        {userAvatar ? (
          <div className="rounded-full p-[2px] bg-brand-gradient flex items-center justify-center">
            <Image
              src={userAvatar}
              alt={userName ?? 'משתמש'}
              width={32}
              height={32}
              className="rounded-full"
              title={userName}
            />
          </div>
        ) : userName ? (
          <div className="rounded-full p-[2px] bg-brand-gradient flex items-center justify-center" title={userName}>
            <div className="w-8 h-8 rounded-full bg-[#2E4A7A] flex items-center justify-center text-sm font-bold">
              {userName.charAt(0).toUpperCase()}
            </div>
          </div>
        ) : null}

        {/* Sign-out button */}
        <button
          onClick={onSignOut}
          className="text-xs text-white/70 hover:text-white hover:bg-[#2E4A7A] px-2 py-1 rounded-lg transition-colors"
          aria-label="התנתק"
          title="התנתק"
        >
          יציאה
        </button>
      </div>
    </header>
  );
}
