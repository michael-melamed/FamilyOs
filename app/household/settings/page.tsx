'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { updateHouseholdName } from '@/lib/actions/households';
import { loadMemory, upsertMemory, deleteMemory } from '@/lib/actions/memory';
import type { FamilyMemory } from '@/types';

type List = { id: string; name: string; is_locked: boolean };
type Member = { id: string; user_id: string; role: string; joined_at: string; users?: { email: string } };
type Permissions = {
  can_add_tasks: boolean;
  can_delete_tasks: boolean;
  can_clear_lists: boolean;
  can_delete_lists: boolean;
  can_add_to_specific_lists_only: boolean;
};

export default function HouseholdSettingsPage() {
  const router = useRouter();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<string>('');
  const [dissolveConfirm, setDissolveConfirm] = useState('');
  
  const [lists, setLists] = useState<List[]>([]);
  const [newListName, setNewListName] = useState('');
  const [editingListId, setEditingListId] = useState<string | null>(null);
  const [editListName, setEditListName] = useState('');

  const [members, setMembers] = useState<Member[]>([]);
  const [permissions, setPermissions] = useState<Permissions | null>(null);
  const [permSaved, setPermSaved] = useState(false);

  // Household Name editing
  const [householdName, setHouseholdName] = useState('');
  const [isEditingName, setIsEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);

  // Invite state
  const [inviteCode, setInviteCode] = useState<string | null>(null);
  const [inviteLink, setInviteLink] = useState<string | null>(null);
  const [inviteCopied, setInviteCopied] = useState(false);

  // Memory state
  const [memories, setMemories] = useState<FamilyMemory[]>([]);
  const [newMemKey, setNewMemKey] = useState('');
  const [newMemVal, setNewMemVal] = useState('');
  const [savingMem, setSavingMem] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    const fetchData = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        router.push('/login');
        return;
      }

      const savedId = localStorage.getItem('active_household_id');
      const { data: memberships } = await supabase
        .from('household_members')
        .select('role, household_id')
        .eq('user_id', session.user.id);

      const membership = memberships?.find(m => m.household_id === savedId) || memberships?.[0];

      if (membership) {
        const admin = membership.role === 'admin';
        setIsAdmin(admin);
        setActiveTab('general'); // Default tab for everyone

        // Fetch household name
        const { data: household } = await supabase.from('households').select('name').eq('id', membership.household_id).single();
        if (household) setHouseholdName(household.name);

        // Fetch lists
        const { data: listsData } = await supabase.from('lists').select('*').eq('household_id', membership.household_id).order('created_at', { ascending: true });
        if (listsData) setLists(listsData);

        // Fetch memories
        try {
          const mData = await loadMemory(membership.household_id);
          setMemories(mData);
        } catch (_) {}

        if (admin) {
          // Fetch members
          const memRes = await fetch('/api/household/members');
          if (memRes.ok) {
             const mData = await memRes.json();
             setMembers(mData);
          }

          // Fetch permissions
          const permRes = await fetch('/api/household/permissions');
          if (permRes.ok) {
            const pData = await permRes.json();
            setPermissions(pData);
          }

          // Fetch/Generate invite
          const invRes = await fetch('/api/household/invite');
          if (invRes.ok) {
            const invData = await invRes.json();
            setInviteCode(invData.code);
            setInviteLink(invData.invite_url);
          }
        }
      } else {
        router.push('/household/setup');
      }
      setLoading(false);
    };

    fetchData();
  }, [router, supabase]);

  const handleDissolve = async () => {
    if (dissolveConfirm !== 'DELETE') return;
    try {
      const res = await fetch('/api/household/dissolve', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ confirm: true })
      });
      if (res.ok) {
        router.push('/household/setup');
      } else {
        const data = await res.json();
        alert(data.error || 'שגיאה במחיקת הקבוצה');
      }
    } catch (err) {
      console.error('Failed to dissolve group', err);
    }
  };

  const handleAddList = async () => {
    if (!newListName.trim()) return;
    const savedId = localStorage.getItem('active_household_id');
    const { data: member } = await supabase.from('household_members').select('household_id').eq('household_id', savedId).single();
    if (!member) return;

    const { data, error } = await supabase.from('lists').insert({
      household_id: member.household_id,
      name: newListName.trim()
    }).select().single();

    if (!error && data) {
      setLists([...lists, data]);
      setNewListName('');
    }
  };

  const handleRenameList = async (id: string) => {
    if (!editListName.trim()) {
      setEditingListId(null);
      return;
    }
    const { error } = await supabase.from('lists').update({ name: editListName.trim() }).eq('id', id);
    if (!error) {
      setLists(lists.map(l => l.id === id ? { ...l, name: editListName.trim() } : l));
    }
    setEditingListId(null);
  };

  const handleToggleLock = async (id: string, currentLock: boolean) => {
    const res = await fetch('/api/household/lists/lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ list_id: id, is_locked: !currentLock })
    });
    if (res.ok) {
      setLists(lists.map(l => l.id === id ? { ...l, is_locked: !currentLock } : l));
    }
  };

  const handleDeleteList = async (id: string, name: string) => {
    if (!window.confirm(`האם למחוק את הרשימה ${name}? פעולה זו לא ניתנת לביטול`)) return;
    const { error } = await supabase.from('lists').delete().eq('id', id);
    if (!error) {
      setLists(lists.filter(l => l.id !== id));
    }
  };

  const handleRemoveMember = async (userId: string, role: string) => {
    if (!window.confirm(`להסיר את המשתמש מהקבוצה?`)) return;
    const res = await fetch('/api/household/members/remove', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_id: userId })
    });
    if (res.ok) {
      setMembers(members.filter(m => m.user_id !== userId));
    } else {
      const data = await res.json();
      alert(data.error || 'שגיאה בהסרת המשתמש');
    }
  };

  const handlePermissionChange = async (key: keyof Permissions, value: boolean) => {
    if (!permissions) return;
    const newPerms = { ...permissions, [key]: value };
    setPermissions(newPerms);

    const res = await fetch('/api/household/permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value })
    });
    if (res.ok) {
      setPermSaved(true);
      setTimeout(() => setPermSaved(false), 2000);
    }
  };

  const handleUpdateName = async () => {
    const savedId = localStorage.getItem('active_household_id');
    if (!savedId || !householdName.trim()) return;
    setSavingName(true);
    const ok = await updateHouseholdName(savedId, householdName.trim());
    if (ok) setIsEditingName(false);
    setSavingName(false);
  };

  const handleAddMemory = async () => {
    const savedId = localStorage.getItem('active_household_id');
    if (!savedId || !newMemKey.trim() || !newMemVal.trim()) return;
    setSavingMem(true);
    try {
      await upsertMemory(savedId, newMemKey.trim(), newMemVal.trim());
      const m = await loadMemory(savedId);
      setMemories(m);
      setNewMemKey('');
      setNewMemVal('');
    } catch (err) {
      console.error(err);
    } finally {
      setSavingMem(false);
    }
  };

  const handleDeleteMemory = async (key: string) => {
    const savedId = localStorage.getItem('active_household_id');
    if (!savedId) return;
    if (!window.confirm('למחוק זיכרון זה?')) return;
    await deleteMemory(savedId, key);
    setMemories(memories.filter(m => m.key !== key));
  };

  if (loading) return <div className="min-h-screen bg-[#F4F7FB] flex items-center justify-center">טוען...</div>;

  const allTabs = [
    { id: 'general', label: 'כללי' },
    { id: 'content', label: 'ניהול רשימות' },
    { id: 'memory', label: 'זיכרון הסוכן' },
    { id: 'members', label: 'משתתפים' },
    { id: 'permissions', label: 'הרשאות' },
    // { id: 'premium', label: 'מנוי פרימיום' }, // Temporarily disabled placeholder
  ];

  const tabs = isAdmin ? allTabs : [
    { id: 'general', label: 'כללי' },
    { id: 'memory', label: 'זיכרון הסוכן (צפייה)' },
  ];

  return (
    <div className="min-h-screen bg-[#F4F7FB] p-6 text-right" dir="rtl">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-[#1B2A4A]">הגדרות קבוצה</h1>
          <button onClick={() => router.push('/dashboard')} className="text-[#4A5568] hover:text-[#1B2A4A] transition-colors">
            חזרה לדשבורד
          </button>
        </div>
        
        <div className="flex gap-4 border-b border-[#C8D4E8] mb-6 overflow-x-auto pb-2">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id 
                  ? 'text-[#1A7A4A] border-b-2 border-[#1A7A4A]' 
                  : 'text-[#4A5568] hover:text-[#1B2A4A]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="bg-white p-6 rounded-2xl shadow-sm border border-[#C8D4E8] min-h-[400px]">
          
          {/* Tab: General */}
          {activeTab === 'general' && (
            <div className="space-y-8">
              <section className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
                <h3 className="text-sm font-bold text-gray-400 uppercase tracking-wider mb-4">פרופיל הקבוצה</h3>
                <div className="flex items-center justify-between">
                  {isEditingName ? (
                    <div className="flex gap-2 w-full max-w-md">
                      <input 
                        type="text"
                        value={householdName}
                        onChange={e => setHouseholdName(e.target.value)}
                        className="flex-1 px-4 py-2 border rounded-xl outline-none focus:border-[#1A7A4A]"
                        autoFocus
                      />
                      <button 
                        onClick={handleUpdateName}
                        disabled={savingName}
                        className="bg-[#1A7A4A] text-white px-6 py-2 rounded-xl font-bold disabled:opacity-50"
                      >
                        שמור
                      </button>
                      <button onClick={() => setIsEditingName(false)} className="px-4 py-2 text-gray-500">ביטול</button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-2xl font-bold text-[#1B2A4A]">{householdName}</p>
                        <p className="text-sm text-gray-500">זהו השם שכולם רואים בדשבורד</p>
                      </div>
                      {isAdmin && (
                        <button onClick={() => setIsEditingName(true)} className="p-2 hover:bg-gray-200 rounded-lg transition-colors">✏️ ערוך שם</button>
                      )}
                    </>
                  )}
                </div>
              </section>

              {isAdmin && inviteCode && (
                <section className="bg-[#e6f4ea] p-6 rounded-2xl border border-[#c8e6d1]">
                   <h3 className="text-sm font-bold text-[#1A7A4A] uppercase tracking-wider mb-2">הזמנת חברים</h3>
                   <p className="text-sm text-[#2d5a3d] mb-4">שלח את הקוד או הקישור למי שאתה רוצה לצרף לבית:</p>
                   <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 bg-white p-3 rounded-xl border border-[#1A7A4A]/20 font-mono text-center flex items-center justify-between">
                         <span className="text-[#1A7A4A] font-bold text-xl">{inviteCode}</span>
                         <button 
                           onClick={() => { navigator.clipboard.writeText(inviteCode); alert('הקוד הועתק'); }}
                           className="text-xs bg-[#1A7A4A] text-white px-3 py-1 rounded-lg"
                         >העתק קוד</button>
                      </div>
                      <button 
                         onClick={() => { navigator.clipboard.writeText(inviteLink || ''); alert('הקישור הועתק'); }}
                         className="px-6 py-3 bg-[#1B2A4A] text-white rounded-xl font-bold shadow-md"
                      >🔗 העתק קישור הצטרפות</button>
                   </div>
                </section>
              )}
            </div>
          )}

          {/* Tab: Memory */}
          {activeTab === 'memory' && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-[#1B2A4A]">זיכרון הסוכן</h2>
                <span className="text-xs text-gray-500">מידע שהסוכן זוכר ומשתמש בו</span>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {memories.map(m => (
                  <div key={m.key} className="p-4 bg-gray-50 rounded-xl border border-gray-200 flex justify-between items-start group">
                    <div className="flex-1">
                      <p className="text-[10px] font-bold text-[#1A7A4A] uppercase mb-1">{m.key}</p>
                      <p className="text-sm text-[#1B2A4A]">{m.value}</p>
                    </div>
                    {isAdmin && (
                      <button onClick={() => handleDeleteMemory(m.key)} className="text-gray-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all">🗑️</button>
                    )}
                  </div>
                ))}
              </div>

              {isAdmin && (
                <div className="mt-8 p-6 bg-[#F4F7FB] rounded-2xl border border-dashed border-[#C8D4E8]">
                  <h4 className="text-sm font-bold mb-4">הוסף זיכרון חדש</h4>
                  <div className="flex flex-col sm:flex-row gap-3">
                    <input 
                      placeholder="מפתח (למשל: יום_ניקיון)"
                      value={newMemKey}
                      onChange={e => setNewMemKey(e.target.value)}
                      className="flex-1 px-4 py-2 border rounded-xl outline-none"
                    />
                    <input 
                      placeholder="ערך (למשל: כל יום שלישי)"
                      value={newMemVal}
                      onChange={e => setNewMemVal(e.target.value)}
                      className="flex-[2] px-4 py-2 border rounded-xl outline-none"
                    />
                    <button 
                      onClick={handleAddMemory}
                      disabled={savingMem || !newMemKey || !newMemVal}
                      className="bg-[#1B2A4A] text-white px-6 py-2 rounded-xl font-bold disabled:opacity-50"
                    >הוסף</button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Admin: Content (Lists) */}
          {activeTab === 'content' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-[#1B2A4A]">ניהול רשימות</h2>
              <div className="space-y-3">
                {lists.map(list => (
                  <div key={list.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-3">
                      <button onClick={() => handleToggleLock(list.id, list.is_locked)} className="text-xl" title={list.is_locked ? 'שחרר נעילה' : 'נעל רשימה (לאדמינים בלבד)'}>
                        {list.is_locked ? '🔒' : '🔓'}
                      </button>
                      {editingListId === list.id ? (
                        <input
                          type="text"
                          value={editListName}
                          onChange={(e) => setEditListName(e.target.value)}
                          onBlur={() => handleRenameList(list.id)}
                          onKeyDown={(e) => e.key === 'Enter' && handleRenameList(list.id)}
                          autoFocus
                          className="border border-gray-300 rounded px-2 py-1 outline-none focus:border-[#1A7A4A]"
                        />
                      ) : (
                        <span 
                          className="font-medium text-[#1B2A4A] cursor-pointer hover:underline"
                          onClick={() => { setEditingListId(list.id); setEditListName(list.name); }}
                        >
                          {list.name}
                        </span>
                      )}
                    </div>
                    <button onClick={() => handleDeleteList(list.id, list.name)} className="text-red-500 hover:text-red-700 text-sm font-medium">
                      מחק רשימה
                    </button>
                  </div>
                ))}
              </div>
              <div className="flex gap-3 mt-4">
                <input
                  type="text"
                  value={newListName}
                  onChange={(e) => setNewListName(e.target.value)}
                  placeholder="שם הרשימה החדשה"
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-xl focus:border-[#1A7A4A] outline-none"
                  onKeyDown={(e) => e.key === 'Enter' && handleAddList()}
                />
                <button onClick={handleAddList} disabled={!newListName.trim()} className="px-6 py-2 bg-[#1B2A4A] text-white rounded-xl font-medium disabled:opacity-50">
                  + רשימה חדשה
                </button>
              </div>
            </div>
          )}

          {/* Admin: Members */}
          {activeTab === 'members' && (
            <div className="space-y-6">
              <h2 className="text-xl font-bold text-[#1B2A4A]">משתתפים</h2>
              <div className="space-y-3">
                {members.map(member => (
                  <div key={member.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-[#1A7A4A] rounded-full flex items-center justify-center text-white font-bold">
                        מש
                      </div>
                      <div>
                        <div className="font-medium text-[#1B2A4A]">משתמש {member.user_id.substring(0,6)}</div>
                        <div className="text-xs text-gray-500">הצטרף {new Date(member.joined_at).toLocaleDateString('he-IL')}</div>
                      </div>
                      <span className={`text-xs px-2 py-1 rounded-full ${member.role === 'admin' ? 'bg-blue-100 text-blue-800' : 'bg-gray-200 text-gray-800'}`}>
                        {member.role === 'admin' ? 'אדמין' : 'חבר'}
                      </span>
                    </div>
                    <button onClick={() => handleRemoveMember(member.user_id, member.role)} className="text-red-500 hover:text-red-700 font-bold text-lg" title="הסר משתמש">
                      ×
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin: Permissions */}
          {activeTab === 'permissions' && permissions && (
            <div className="space-y-6 relative">
              <div className="flex justify-between items-center">
                <h2 className="text-xl font-bold text-[#1B2A4A]">הרשאות חברים</h2>
                {permSaved && <span className="text-[#1A7A4A] font-medium text-sm animate-pulse">נשמר ✓</span>}
              </div>
              <div className="space-y-4">
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer">
                  <span className="font-medium text-[#4A5568]">חברים יכולים להוסיף משימות</span>
                  <input type="checkbox" checked={permissions.can_add_tasks} onChange={(e) => handlePermissionChange('can_add_tasks', e.target.checked)} className="w-5 h-5 accent-[#1A7A4A]" />
                </label>
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer">
                  <span className="font-medium text-[#4A5568]">חברים יכולים למחוק משימות</span>
                  <input type="checkbox" checked={permissions.can_delete_tasks} onChange={(e) => handlePermissionChange('can_delete_tasks', e.target.checked)} className="w-5 h-5 accent-[#1A7A4A]" />
                </label>
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer">
                  <span className="font-medium text-[#4A5568]">חברים יכולים לנקות רשימות מלאות</span>
                  <input type="checkbox" checked={permissions.can_clear_lists} onChange={(e) => handlePermissionChange('can_clear_lists', e.target.checked)} className="w-5 h-5 accent-[#1A7A4A]" />
                </label>
                <label className="flex items-center justify-between p-4 bg-gray-50 rounded-xl border border-gray-200 cursor-pointer">
                  <span className="font-medium text-[#4A5568]">הוספה לרשימות ספציפיות בלבד</span>
                  <input type="checkbox" checked={permissions.can_add_to_specific_lists_only} onChange={(e) => handlePermissionChange('can_add_to_specific_lists_only', e.target.checked)} className="w-5 h-5 accent-[#1A7A4A]" />
                </label>
              </div>
            </div>
          )}

          {/* Tab: Premium (Placeholder - Temporarily Disabled) */}
          {/* activeTab === 'premium' && (
            <div className="flex flex-col items-center justify-center py-12 text-center">
               <div className="text-6xl mb-6">⭐</div>
               <h2 className="text-2xl font-bold text-[#1B2A4A] mb-2">מנוי פרימיום</h2>
               <p className="text-gray-500 max-w-md mb-8">
                 שדרוג לפרימיום יאפשר לכם להשתמש במודלים מתקדמים יותר של Claude, נפח זיכרון גדול יותר ותמיכה בריבוי משתתפים ללא הגבלה.
               </p>
               <div className="p-6 bg-orange-50 border border-orange-100 rounded-2xl w-full max-w-sm">
                  <p className="text-orange-800 font-bold text-lg mb-1">בקרוב מאוד</p>
                  <p className="text-orange-600 text-sm">התכונה נמצאת בפיתוח סופי</p>
               </div>
            </div>
          ) */}

        </div>

        {isAdmin && (
          <div className="mt-12 bg-red-50 border border-red-200 p-8 rounded-2xl shadow-sm">
            <h2 className="text-xl font-bold text-red-700 mb-2">אזור מסוכן</h2>
            <p className="text-red-600 mb-6">
              מחיקת הקבוצה תמחק את כל המשימות, הרשימות וחברי הקבוצה. פעולה זו בלתי הפיכה.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 items-center">
              <input 
                type="text" 
                placeholder="הקלד 'DELETE' לאישור"
                value={dissolveConfirm}
                onChange={(e) => setDissolveConfirm(e.target.value)}
                className="px-4 py-3 border border-red-300 rounded-xl focus:ring-red-500 outline-none w-full sm:w-auto font-mono text-center tracking-widest"
              />
              <button 
                onClick={handleDissolve}
                disabled={dissolveConfirm !== 'DELETE'}
                className="px-8 py-3 bg-red-600 text-white rounded-xl font-bold disabled:opacity-50 hover:bg-red-700 w-full sm:w-auto transition-colors"
              >
                פזר קבוצה ומחק דשבורד
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
