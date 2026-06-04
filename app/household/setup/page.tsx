'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';

export default function HouseholdSetupPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [mode, setMode] = useState<'select' | 'create' | 'join'>('select');
  const [name, setName] = useState('');
  const [code, setCode] = useState('');
  const supabase = createClient();

  useEffect(() => {
    // Set default name based on user's first name
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const fullName = session.user.user_metadata?.full_name || '';
        const firstName = fullName.split(' ')[0];
        setName(firstName ? `הבית של ${firstName}` : 'הבית שלי');
      }
    };
    fetchUser();
  }, [supabase]);

  const handleCreate = async () => {
    if (!name.trim()) return;
    setLoading(true);
    setError('');

    try {
      const res = await fetch('/api/household/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim() })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'שגיאה ביצירת המשפחה');

      // Create default lists for the dashboard since we mock lists by name
      await supabase.from('lists').insert([
        { household_id: data.household_id, name: 'משימות' },
        { household_id: data.household_id, name: 'קניות' }
      ]);

      router.push('/dashboard');
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  const handleJoin = () => {
    if (!code.trim()) return;
    router.push(`/join/${code.trim()}`);
  };

  return (
    <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center p-4 text-right" dir="rtl">
      <div className="bg-white p-8 rounded-2xl shadow-xl max-w-md w-full border border-[#C8D4E8]">
        <h1 className="text-3xl font-bold text-[#1B2A4A] mb-2 text-center">ברוכים הבאים ל-FamilyOS</h1>
        <p className="text-[#4A5568] mb-8 text-center">כדי להתחיל, בחר האם ברצונך ליצור בית חדש או להצטרף לבית קיים.</p>

        {error && (
          <div className="bg-red-50 text-red-600 p-3 rounded-lg mb-6 text-sm border border-red-200">
            {error}
          </div>
        )}

        {mode === 'select' && (
          <div className="space-y-4">
            <button
              onClick={() => setMode('create')}
              className="w-full py-4 bg-[#1B2A4A] text-white rounded-xl font-bold hover:bg-[#2E4A7A] transition-colors shadow-md flex items-center justify-center gap-2"
            >
              <span>🏠</span> צור משפחה חדשה
            </button>
            <button
              onClick={() => setMode('join')}
              className="w-full py-4 bg-white text-[#1B2A4A] border-2 border-[#1B2A4A] rounded-xl font-bold hover:bg-gray-50 transition-colors flex items-center justify-center gap-2"
            >
              <span>🔗</span> הצטרף לקבוצה
            </button>
          </div>
        )}

        {mode === 'create' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div>
              <label className="block text-sm font-medium text-[#4A5568] mb-1">שם המשפחה / הבית</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-[#C8D4E8] focus:border-[#1A7A4A] focus:ring-1 focus:ring-[#1A7A4A] outline-none transition-all"
                placeholder="לדוגמה: משפחת ישראלי"
                disabled={loading}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setMode('select')}
                className="px-4 py-3 text-[#4A5568] hover:bg-gray-100 rounded-xl font-medium transition-colors"
                disabled={loading}
              >
                חזור
              </button>
              <button
                onClick={handleCreate}
                disabled={loading || !name.trim()}
                className="flex-1 py-3 bg-[#1A7A4A] text-white rounded-xl font-bold hover:bg-[#14603A] disabled:opacity-50 transition-colors shadow-md"
              >
                {loading ? 'מקים משפחה...' : 'המשך'}
              </button>
            </div>
          </div>
        )}

        {mode === 'join' && (
          <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4">
            <div>
              <label className="block text-sm font-medium text-[#4A5568] mb-1">קוד הצטרפות</label>
              <input
                type="text"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
                className="w-full px-4 py-3 rounded-xl border border-[#C8D4E8] focus:border-[#1A7A4A] focus:ring-1 focus:ring-[#1A7A4A] outline-none transition-all uppercase tracking-widest text-center text-xl font-mono"
                placeholder="XXXXXX"
                maxLength={6}
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={() => setMode('select')}
                className="px-4 py-3 text-[#4A5568] hover:bg-gray-100 rounded-xl font-medium transition-colors"
              >
                חזור
              </button>
              <button
                onClick={handleJoin}
                disabled={!code.trim() || code.length < 6}
                className="flex-1 py-3 bg-[#1A7A4A] text-white rounded-xl font-bold hover:bg-[#14603A] disabled:opacity-50 transition-colors shadow-md"
              >
                המשך
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
