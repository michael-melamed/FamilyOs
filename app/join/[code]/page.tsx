'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getInviteInfo } from '@/lib/actions/households';

export default function JoinHouseholdPage({ params }: { params: { code: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [householdName, setHouseholdName] = useState<string | null>(null);
  const [alreadyMember, setAlreadyMember] = useState(false);
  const [joining, setJoining] = useState(false);
  
  const supabase = createClient();
  const { code } = params;

  useEffect(() => {
    const checkInvite = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
          // Store redirect URL and send to login
          document.cookie = `redirect_after_login=/join/${code}; path=/; max-age=3600`;
          router.push('/login');
          return;
        }

        // Fetch invite details securely via server action bypassing RLS
        const inviteInfo = await getInviteInfo(code);

        if (inviteInfo) {
          setHouseholdName(inviteInfo.householdName);

          // Check if already a member
          const { data: membership } = await supabase
            .from('household_members')
            .select('id')
            .eq('household_id', inviteInfo.householdId)
            .eq('user_id', session.user.id)
            .single();

          if (membership) {
            setAlreadyMember(true);
          }
        } else {
          // Invalid code or inactive
          setError('קוד הזמנה לא חוקי או פג תוקף');
        }

      } catch (err: any) {
        console.error('Check invite error:', err);
      } finally {
        setLoading(false);
      }
    };

    checkInvite();
  }, [code, router, supabase]);

  const handleJoin = async () => {
    setJoining(true);
    setError(null);

    try {
      const res = await fetch('/api/household/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      });

      const data = await res.json();

      if (!res.ok) {
        if (res.status === 409) {
          setAlreadyMember(true);
          return;
        }
        throw new Error(data.error || 'שגיאה בהצטרפות לקבוצה');
      }

      router.push(`/dashboard?active=${data.household_id}`);
    } catch (err: any) {
      setError(err.message || 'שגיאה כללית בהצטרפות');
      setJoining(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F4F7FB] text-right" dir="rtl">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#1A7A4A]"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F4F7FB] text-right" dir="rtl">
        <div className="p-8 bg-white shadow-xl rounded-2xl max-w-sm w-full text-center border border-red-200">
          <div className="text-5xl mb-4">❌</div>
          <h1 className="text-xl font-bold text-red-600 mb-2">שגיאה בהצטרפות</h1>
          <p className="text-[#4A5568] mb-6">{error}</p>
          <button 
            onClick={() => router.push('/dashboard')}
            className="w-full py-3 bg-[#1B2A4A] text-white rounded-xl font-bold hover:bg-[#2E4A7A] transition-colors"
          >
            חזרה לדשבורד
          </button>
        </div>
      </div>
    );
  }

  if (alreadyMember) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-[#F4F7FB] text-right" dir="rtl">
        <div className="p-8 bg-white shadow-xl rounded-2xl max-w-sm w-full text-center border border-[#C8D4E8]">
          <div className="text-5xl mb-4">👋</div>
          <h1 className="text-xl font-bold text-[#1B2A4A] mb-2">כבר חבר בקבוצה זו</h1>
          <p className="text-[#4A5568] mb-6">אתה כבר רשום בבית זה.</p>
          <button 
            onClick={() => router.push('/dashboard')}
            className="w-full py-3 bg-[#1A7A4A] text-white rounded-xl font-bold hover:bg-[#14603A] transition-colors"
          >
            המשך לדשבורד
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#F4F7FB] text-right" dir="rtl">
      <div className="p-8 bg-white shadow-xl rounded-2xl max-w-sm w-full text-center border border-[#C8D4E8]">
        <div className="text-6xl mb-4">🏠</div>
        <h1 className="text-2xl font-bold text-[#1B2A4A] mb-2">הצטרף ל־{householdName}</h1>
        <p className="text-[#4A5568] mb-8">הוזמנת להצטרף לניהול המשותף של הבית. האם ברצונך לאשר?</p>
        
        <div className="space-y-3">
          <button
            onClick={handleJoin}
            disabled={joining}
            className="w-full py-4 bg-[#1A7A4A] text-white rounded-xl font-bold text-lg hover:bg-[#14603A] disabled:opacity-50 transition-colors shadow-md"
          >
            {joining ? 'מצטרף...' : 'הצטרף'}
          </button>
          <button
            onClick={() => router.push('/dashboard')}
            disabled={joining}
            className="w-full py-3 bg-white text-[#4A5568] rounded-xl font-medium hover:bg-gray-50 transition-colors"
          >
            ביטול
          </button>
        </div>
      </div>
    </div>
  );
}
