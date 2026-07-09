'use client';

/**
 * @file app/dashboard/page.tsx
 * @description_he דף הדשבורד (ניתוב /dashboard) — משלב Header, Sidebar, Board, PromptBar
 * @description_en Dashboard page — integrates Header, Sidebar, Board, and PromptBar.
 *               Resolves householdId from the authenticated user's household_members row.
 * @inputs    None (reads auth session client-side)
 * @outputs   Dashboard page UI
 * @depends_on components/layout/Header.tsx, components/layout/Sidebar.tsx,
 *            components/dashboard/Board.tsx, components/prompt/PromptBar.tsx,
 *            hooks/useBoard.ts, lib/supabase/client.ts
 * @used_by   Next.js Router
 * @fix_guide
 *   - PromptBar is disabled → householdId is undefined; user must create or join a household
 *   - Board shows empty → RLS may be blocking; verify user is in household_members table
 *   - Sign-out not redirecting → middleware catches missing session and redirects to /login
 */

import { useState, useEffect } from 'react';
import { Header } from '@/components/layout/Header';
import { Sidebar } from '@/components/layout/Sidebar';
import { Board } from '@/components/dashboard/Board';
import { PromptBar } from '@/components/prompt/PromptBar';
import { useBoard } from '@/hooks/useBoard';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [householdId, setHouseholdId] = useState<string | undefined>(undefined);
  const [householdName, setHouseholdName] = useState<string | undefined>(undefined);
  const [successToast, setSuccessToast] = useState('');
  const [userName, setUserName] = useState<string | undefined>(undefined);
  const [userAvatar, setUserAvatar] = useState<string | undefined>(undefined);

  // Load authenticated user data and resolve their householdId
  useEffect(() => {
    const fetchUserAndHousehold = async () => {
      const supabase = createClient();

      try {
        const { data: { session } } = await supabase.auth.getSession();

        if (!session?.user) return;

        const meta = session.user.user_metadata;
        setUserName(meta?.full_name ?? meta?.name ?? undefined);
        setUserAvatar(meta?.avatar_url ?? meta?.picture ?? undefined);

        // Try to get household from URL param, then localStorage
        const urlParams = new URLSearchParams(window.location.search);
        const activeParam = urlParams.get('active');
        const savedId = activeParam || localStorage.getItem('active_household_id');

        const { data: memberships } = await supabase
          .from('household_members')
          .select('household_id, households(name)');

        if (!memberships || memberships.length === 0) {
          router.push('/household/setup');
          return;
        }

        // If saved ID is valid for this user, use it. Otherwise use the first one.
        const isValid = savedId && memberships.some(m => m.household_id === savedId);
        const targetMembership = isValid ? memberships.find(m => m.household_id === savedId) : memberships[0];
        const targetId = targetMembership.household_id;
        const targetName = (targetMembership.households as any)?.name;

        setHouseholdId(targetId);
        setHouseholdName(targetName);
        localStorage.setItem('active_household_id', targetId);

        // Clean up URL if we came from a join redirect
        if (activeParam) {
          window.history.replaceState({}, '', '/dashboard');
        }

      } catch (err) {
        console.error('Could not resolve householdId:', err);
      }
    };

    fetchUserAndHousehold();
  }, [router]);

  const handleSwitchHousehold = (id: string, name?: string) => {
    setHouseholdId(id);
    if (name) setHouseholdName(name);
    localStorage.setItem('active_household_id', id);
    setIsSidebarOpen(false);
  };

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const { tasks, shoppingItems, lists, permissions, isLoading, refetch, hasRecentUpdate, lastUpdatedBy } = useBoard(householdId);

  const handleAgentResponse = (summary: string) => {
    setSuccessToast(summary);
    refetch(false);
    setTimeout(() => setSuccessToast(''), 4000);
  };

  return (
    <div className="min-h-screen bg-calm-bg flex flex-col relative pb-28 text-right mx-auto max-w-3xl">
      <Header
        onMenuClick={() => setIsSidebarOpen(true)}
        hasRecentUpdate={hasRecentUpdate}
        updatedBy={lastUpdatedBy}
        userName={userName}
        userAvatar={userAvatar}
        householdName={householdName}
        onSignOut={handleSignOut}
      />

      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        householdId={householdId}
        tasks={tasks}
        onSwitchHousehold={handleSwitchHousehold}
      />

      <main className="flex-1 px-4 lg:px-0">
        {successToast && (
          <div className="fixed top-20 left-4 right-4 md:left-1/2 md:-translate-x-1/2 md:right-auto bg-[#1A7A4A] text-white p-3 rounded-lg shadow-xl text-sm font-medium z-40 transition-all text-center animate-bounce">
            ✨ {successToast}
          </div>
        )}

        <Board
          tasks={tasks}
          shoppingItems={shoppingItems}
          lists={lists}
          permissions={permissions}
          familyId={householdId}
          isLoading={isLoading}
          onUpdate={() => refetch(false)}
        />
      </main>

      <PromptBar
        familyId={householdId}
        onAgentResponse={handleAgentResponse}
      />
    </div>
  );
}
