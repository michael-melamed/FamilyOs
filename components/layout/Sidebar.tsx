'use client';

/**
 * @file components/layout/Sidebar.tsx
 * @description_he תפריט צד — רשימת קבוצות, מעבר מהיר, הצטרפות ידנית, ייצוא ויציאה.
 * @description_en Side menu — household switcher, manual join, task export, sign-out.
 */

import { useState, useEffect } from 'react';
import { createClient } from '@/lib/supabase/client';
import { removeMember } from '@/lib/actions/households';
import type { FamilyMemory, Task } from '@/types';

type SidebarProps = {
  isOpen: boolean;
  onClose: () => void;
  householdId: string | undefined;
  tasks: Task[] | undefined;
  onSwitchHousehold?: (id: string) => void;
};

export function Sidebar({ isOpen, onClose, householdId, tasks = [], onSwitchHousehold }: SidebarProps) {
  const [activePanel, setActivePanel] = useState<string | null>(null);
  const [userHouseholds, setUserHouseholds] = useState<any[]>([]);

  const [manualCode, setManualCode] = useState('');
  const [joining, setJoining] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);

  // Create Household state
  const [newHouseholdName, setNewHouseholdName] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    if (!isOpen) return;

    const fetchHouseholds = async () => {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { data: memberships } = await supabase
        .from('household_members')
        .select('household_id, role, households(name)')
        .eq('user_id', session.user.id);
      
      if (memberships) {
        setUserHouseholds(memberships.map(m => ({
          id: m.household_id,
          role: m.role,
          name: (m.households as any)?.name || 'קבוצה ללא שם'
        })));
      }
    };

    fetchHouseholds();
  }, [isOpen]);

  const handleSignOut = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    window.location.href = '/login';
  };

  const handleManualJoin = async () => {
    if (!manualCode.trim()) return;
    setJoining(true);
    setJoinError(null);
    try {
      const res = await fetch('/api/household/join', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: manualCode.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'שגיאה בהצטרפות');
      
      if (onSwitchHousehold) {
        onSwitchHousehold(data.household_id);
      }
      setActivePanel(null);
      setManualCode('');
    } catch (err: any) {
      setJoinError(err.message);
    } finally {
      setJoining(false);
    }
  };

  const handleCreateHousehold = async () => {
    if (!newHouseholdName.trim()) return;
    setCreating(true);
    setJoinError(null);
    try {
      const res = await fetch('/api/household/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newHouseholdName.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'שגיאה ביצירת קבוצה');
      
      if (onSwitchHousehold) {
        onSwitchHousehold(data.household_id);
      }
      setActivePanel(null);
      setNewHouseholdName('');
    } catch (err: any) {
      setJoinError(err.message);
    } finally {
      setCreating(false);
    }
  };

  const handleLeaveOrDelete = async (h: any) => {
    if (h.role === 'admin') {
      if (!window.confirm(`האם אתה בטוח שברצונך לפזר את הקבוצה "${h.name}"? פעולה זו בלתי הפיכה!`)) return;
      try {
        const res = await fetch('/api/household/dissolve', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ confirm: true, household_id: h.id })
        });
        if (res.ok) {
          setUserHouseholds(userHouseholds.filter(u => u.id !== h.id));
          if (householdId === h.id) window.location.href = '/dashboard';
        } else {
          alert('שגיאה בפיזור הקבוצה');
        }
      } catch (e) {
        console.error(e);
      }
    } else {
      if (!window.confirm(`האם אתה בטוח שברצונך לעזוב את הקבוצה "${h.name}"?`)) return;
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;
      const ok = await removeMember(h.id, session.user.id);
      if (ok) {
        setUserHouseholds(userHouseholds.filter(u => u.id !== h.id));
        if (householdId === h.id) window.location.href = '/dashboard';
      } else {
        alert('שגיאה ביציאה מהקבוצה');
      }
    }
  };

  const handleExportTasks = () => {
    if (!tasks || tasks.length === 0) {
      alert('אין משימות לייצוא!');
      return;
    }
    const lines = tasks.map(t => `${t.status === 'done' ? '✅' : '☐'} ${t.title}`);
    const content = lines.join('\n');
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `family_tasks_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const isPanelOpen = activePanel !== null;

  return (
    <>
      <div 
        className={`fixed inset-0 bg-black/50 backdrop-blur-sm z-40 transition-opacity duration-300 ${isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} 
        onClick={onClose}
      />
      <aside 
        className={`fixed top-0 bottom-0 right-0 w-80 bg-white shadow-2xl z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="bg-[#1B2A4A] text-white p-4 flex justify-between items-center shrink-0">
          <div className="flex gap-2 items-center">
            <h2 className="font-bold text-lg">תפריט</h2>
          </div>
          <button onClick={onClose} className="text-2xl p-2 hover:bg-[#2E4A7A] rounded-full transition-colors leading-none">
            ✕
          </button>
        </div>

        <div className="overflow-y-auto flex-1 p-4 flex flex-col gap-2 relative">
          
          <div className="flex flex-col gap-1">
            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 px-3">הקבוצות שלי</h3>
            
            {userHouseholds.map(h => (
              <div 
                key={h.id}
                onClick={() => onSwitchHousehold?.(h.id)}
                className={`group px-3 py-2.5 rounded-xl cursor-pointer transition-colors flex items-center justify-between ${
                  h.id === householdId 
                    ? 'bg-brand-teal/10 text-brand-teal' 
                    : 'bg-transparent text-calm-text hover:bg-neutral-50'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className={`w-8 h-8 shrink-0 rounded-lg flex items-center justify-center font-bold text-sm ${
                    h.id === householdId ? 'bg-brand-teal/20 text-brand-teal' : 'bg-neutral-100 text-muted-warm'
                  }`}>
                    {h.name.charAt(0)}
                  </div>
                  <span className="text-sm font-medium truncate">{h.name}</span>
                </div>
                {h.id !== householdId && (
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                    <button 
                      onClick={() => window.location.href=`/household/settings`}
                      className="p-1.5 hover:bg-neutral-200 rounded-lg text-muted-warm"
                      title="הגדרות"
                    >⚙️</button>
                    <button 
                      onClick={() => handleLeaveOrDelete(h)}
                      className="p-1.5 hover:bg-red-100 rounded-lg text-red-500 font-bold"
                      title={h.role === 'admin' ? 'פזר קבוצה' : 'עזוב קבוצה'}
                    >
                      {h.role === 'admin' ? '🗑️' : '🚪'}
                    </button>
                  </div>
                )}
              </div>
            ))}

            <div className="mt-3 mx-2 flex gap-2">
              <button 
                onClick={() => setActivePanel('יצירת קבוצה')}
                className="flex-1 p-3 border border-neutral-200 rounded-xl text-brand-teal text-xs hover:bg-brand-teal/5 transition-colors flex flex-col items-center justify-center gap-1 font-bold bg-white"
              >
                <span className="text-lg leading-none">🏠</span> קבוצה חדשה
              </button>
              <button 
                onClick={() => setActivePanel('הצטרפות ידנית')}
                className="flex-1 p-3 border border-neutral-200 rounded-xl text-muted-warm text-xs hover:bg-neutral-50 transition-colors flex flex-col items-center justify-center gap-1 font-bold bg-white"
              >
                <span className="text-lg leading-none">🔗</span> הצטרפות קיימת
              </button>
            </div>
          </div>

          <div className="mt-8 flex flex-col space-y-4 border-t border-neutral-100 pt-6 px-2">
            <a href="/household/settings" className="flex items-center gap-3 p-2 hover:bg-neutral-50 rounded-xl transition-colors">
               <span className="text-lg opacity-70">⚙️</span>
               <span className="text-calm-text text-sm font-medium">הגדרות קבוצה פעילה</span>
            </a>
            <button onClick={handleExportTasks} className="flex items-center gap-3 p-2 hover:bg-neutral-50 rounded-xl transition-colors">
               <span className="text-lg opacity-70">📄</span>
               <span className="text-calm-text text-sm font-medium">ייצוא משימות</span>
            </button>
          </div>

          {activePanel === 'הצטרפות ידנית' && (
            <div className="absolute inset-0 bg-white z-20 p-6 flex flex-col gap-4 animate-in slide-in-from-left-4 text-center">
              <button onClick={() => setActivePanel(null)} className="self-start text-gray-400 p-2 hover:bg-gray-100 rounded-full">← חזרה</button>
              <div className="text-5xl mb-2 mt-8">🔑</div>
              <h3 className="font-bold text-[#1B2A4A] text-lg">הצטרפות לקבוצה</h3>
              <p className="text-sm text-gray-500">הכנס את הקוד בן 6 התווים שקיבלת:</p>
              <div className="mt-2">
                <input 
                  type="text"
                  maxLength={6}
                  value={manualCode}
                  onChange={e => setManualCode(e.target.value.toUpperCase())}
                  placeholder="XXX-XXX"
                  className="w-full text-center text-2xl font-bold tracking-[0.2em] py-3 border-2 border-[#C8D4E8] rounded-xl focus:border-[#1A7A4A] outline-none transition-colors"
                />
                {joinError && <p className="text-red-500 text-xs mt-2">{joinError}</p>}
                <button
                  onClick={handleManualJoin}
                  disabled={joining || manualCode.length < 6}
                  className="w-full mt-4 bg-[#1A7A4A] text-white py-4 rounded-xl font-bold disabled:opacity-50 transition-opacity"
                >
                  {joining ? 'מתחבר...' : 'הצטרף עכשיו'}
                </button>
              </div>
            </div>
          )}

          {activePanel === 'יצירת קבוצה' && (
            <div className="absolute inset-0 bg-white z-20 p-6 flex flex-col gap-4 animate-in slide-in-from-left-4 text-center">
              <button onClick={() => setActivePanel(null)} className="self-start text-gray-400 p-2 hover:bg-gray-100 rounded-full">← חזרה</button>
              <div className="text-5xl mb-2 mt-8">🏠</div>
              <h3 className="font-bold text-[#1B2A4A] text-lg">קבוצה חדשה</h3>
              <p className="text-sm text-gray-500">תן שם לבית החדש (למשל "המשפחה של כהן"):</p>
              <div className="mt-2">
                <input 
                  type="text"
                  value={newHouseholdName}
                  onChange={e => setNewHouseholdName(e.target.value)}
                  placeholder="שם הקבוצה"
                  className="w-full text-center text-xl font-bold py-3 border-2 border-[#C8D4E8] rounded-xl focus:border-[#1A7A4A] outline-none transition-colors"
                />
                {joinError && <p className="text-red-500 text-xs mt-2">{joinError}</p>}
                <button
                  onClick={handleCreateHousehold}
                  disabled={creating || !newHouseholdName.trim()}
                  className="w-full mt-4 bg-[#1A7A4A] text-white py-4 rounded-xl font-bold disabled:opacity-50 transition-opacity"
                >
                  {creating ? 'יוצר...' : 'צור קבוצה'}
                </button>
              </div>
            </div>
          )}

        </div>

        <div className="p-4 border-t border-[#C8D4E8] shrink-0">
          <button
            onClick={handleSignOut}
            className="w-full flex items-center justify-center gap-2 text-sm text-red-500 hover:bg-red-50 border border-red-200 hover:border-red-300 rounded-xl py-2 transition-colors font-medium"
          >
            <span>🚪</span> יציאה מהחשבון
          </button>
        </div>
      </aside>
    </>
  );
}
