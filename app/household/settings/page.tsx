'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { updateHouseholdName, updateMemberRole, removeMember } from '@/lib/actions/households';
import { loadMemory, upsertMemory, deleteMemory } from '@/lib/actions/memory';
import { PushSubscriptionManager } from '@/components/dashboard/PushSubscriptionManager';
import type { FamilyMemory, NotificationPreferences } from '@/types';

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
  const [householdId, setHouseholdId] = useState<string>('');
  
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

  // Notifications state
  const [notificationPrefs, setNotificationPrefs] = useState<NotificationPreferences>({
    notify_on_add: true,
    notify_on_complete: true,
    detailed_notifications: false,
    muted_list_ids: []
  });
  const [prefsSaved, setPrefsSaved] = useState(false);

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
        setHouseholdId(membership.household_id);

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

        // Fetch user preferences
        const { data: memberData } = await supabase
          .from('household_members')
          .select('notification_preferences')
          .eq('household_id', membership.household_id)
          .eq('user_id', session.user.id)
          .single();
        if (memberData?.notification_preferences) {
          setNotificationPrefs(memberData.notification_preferences as NotificationPreferences);
        }

        if (admin) {
          // Fetch members
          const memRes = await fetch(`/api/household/members?household_id=${membership.household_id}`);
          if (memRes.ok) {
             const mData = await memRes.json();
             setMembers(mData);
          }

          // Fetch permissions
          const permRes = await fetch(`/api/household/permissions?household_id=${membership.household_id}`);
          if (permRes.ok) {
            const pData = await permRes.json();
            setPermissions(pData);
          }

          // Fetch/Generate invite
          const invRes = await fetch(`/api/household/invite?household_id=${membership.household_id}`);
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
        body: JSON.stringify({ confirm: true, household_id: localStorage.getItem('active_household_id') })
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
      body: JSON.stringify({ list_id: id, is_locked: !currentLock, household_id: localStorage.getItem('active_household_id') })
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

  const handleRemoveMemberAction = async (userId: string) => {
    if (!window.confirm(`להסיר את המשתמש מהקבוצה?`)) return;
    const ok = await removeMember(localStorage.getItem('active_household_id')!, userId);
    if (ok) {
      setMembers(members.filter(m => m.user_id !== userId));
    } else {
      alert('שגיאה בהסרת המשתמש');
    }
  };

  const handleToggleRole = async (userId: string, currentRole: string) => {
    const newRole = currentRole === 'admin' ? 'member' : 'admin';
    if (!window.confirm(`לשנות את הרשאת המשתמש ל-${newRole === 'admin' ? 'מנהל' : 'חבר'}?`)) return;
    const ok = await updateMemberRole(localStorage.getItem('active_household_id')!, userId, newRole);
    if (ok) {
      setMembers(members.map(m => m.user_id === userId ? { ...m, role: newRole } : m));
    } else {
      alert('שגיאה בעדכון הרשאות המשתמש');
    }
  };

  const handlePermissionChange = async (key: keyof Permissions, value: boolean) => {
    if (!permissions) return;
    const newPerms = { ...permissions, [key]: value };
    setPermissions(newPerms);

    const res = await fetch('/api/household/permissions', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [key]: value, household_id: localStorage.getItem('active_household_id') })
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

  const handlePrefChange = async (key: keyof NotificationPreferences, value: boolean | string[]) => {
    const newPrefs = { ...notificationPrefs, [key]: value };
    setNotificationPrefs(newPrefs);
    
    const res = await fetch('/api/household/notifications', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ householdId: localStorage.getItem('active_household_id'), preferences: newPrefs })
    });
    if (res.ok) {
      setPrefsSaved(true);
      setTimeout(() => setPrefsSaved(false), 2000);
    }
  };

  const handleToggleMuteList = (listId: string) => {
    const current = notificationPrefs.muted_list_ids || [];
    const newMuted = current.includes(listId) ? current.filter(id => id !== listId) : [...current, listId];
    handlePrefChange('muted_list_ids', newMuted);
  };

  const [activeSection, setActiveSection] = useState<string | null>(null);

  if (loading) {
    return (
      <div className="min-h-screen bg-calm-bg p-4 flex flex-col items-center justify-center text-center">
        <div className="w-12 h-12 border-4 border-brand-purple/20 border-t-brand-purple rounded-full animate-spin mb-4"></div>
        <p className="text-calm-text/70 font-medium animate-pulse">פותח את אזור ההגדרות...</p>
      </div>
    );
  }

  const tabs = isAdmin ? [
    { id: 'general', label: 'כללי' },
    { id: 'advanced', label: 'ניהול והגדרות' },
  ] : [
    { id: 'general', label: 'כללי' },
    { id: 'advanced', label: 'הגדרות אישיות' },
  ];

  const renderAccordion = (sectionId: string, sectionTitle: string, sectionIcon: string, content: React.ReactNode) => {
    const isOpen = activeSection === sectionId;
    return (
      <div className="w-full bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden transition-all duration-300">
        <button 
          onClick={() => setActiveSection(isOpen ? null : sectionId)}
          className="w-full flex items-center justify-between p-4 bg-white active:bg-neutral-50/80 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">{sectionIcon}</span>
            <span className="text-base font-semibold text-calm-text">{sectionTitle}</span>
          </div>
          <div className="w-6 h-6 rounded-full bg-neutral-50 flex items-center justify-center text-muted-warm font-bold text-lg transition-transform duration-200">
            {isOpen ? '−' : '+'}
          </div>
        </button>
        <div 
          className={`grid transition-all duration-300 ease-in-out ${
            isOpen ? 'grid-rows-[1fr] opacity-100 border-t border-neutral-50' : 'grid-rows-[0fr] opacity-0'
          }`}
        >
          <div className="overflow-hidden">
            <div className="p-4 bg-calm-bg/30">
              {content}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-calm-bg p-4 md:p-6 text-right" dir="rtl">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6 px-2">
          <h1 className="text-2xl md:text-3xl font-bold text-calm-text">הגדרות קבוצה</h1>
          <button onClick={() => router.push('/dashboard')} className="text-muted-warm hover:text-calm-text transition-colors text-sm font-medium bg-white px-3 py-1.5 rounded-full shadow-sm border border-neutral-100">
            ← חזרה
          </button>
        </div>
        
        {/* Mobile-First Tab Navigation */}
        <div className="flex items-center gap-2 overflow-x-auto whitespace-nowrap scrollbar-none snap-x px-2 py-2 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`snap-center transition-colors ${
                activeTab === tab.id 
                  ? 'bg-brand-purple/10 text-brand-purple border border-brand-purple/20 px-4 py-1.5 rounded-full text-sm font-medium' 
                  : 'bg-white text-muted-warm hover:bg-neutral-50 px-4 py-1.5 rounded-full text-sm font-medium border border-neutral-100 shadow-sm'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="space-y-6">
          
          {/* Tab: General */}
          {activeTab === 'general' && (
            <div className="space-y-4">
              <div className="bg-white p-5 rounded-3xl shadow-sm border border-neutral-100">
                <h3 className="text-xs font-bold text-muted-warm uppercase tracking-wider mb-4">פרופיל הקבוצה</h3>
                <div className="flex items-center justify-between">
                  {isEditingName ? (
                    <div className="flex gap-2 w-full flex-wrap">
                      <input 
                        type="text"
                        value={householdName}
                        onChange={e => setHouseholdName(e.target.value)}
                        className="flex-1 min-w-[200px] px-4 py-2 border border-neutral-200 rounded-xl outline-none focus:border-brand-teal text-sm"
                        autoFocus
                      />
                      <button 
                        onClick={handleUpdateName}
                        disabled={savingName}
                        className="bg-brand-teal text-white px-5 py-2 rounded-xl font-bold disabled:opacity-50 text-sm"
                      >
                        שמור
                      </button>
                      <button onClick={() => setIsEditingName(false)} className="px-4 py-2 text-muted-warm text-sm">ביטול</button>
                    </div>
                  ) : (
                    <>
                      <div>
                        <p className="text-xl font-bold text-calm-text">{householdName}</p>
                        <p className="text-sm text-muted-warm">זהו השם שכולם רואים בדשבורד</p>
                      </div>
                      {isAdmin && (
                        <button onClick={() => setIsEditingName(true)} className="p-2 hover:bg-neutral-100 rounded-xl transition-colors text-sm">✏️ ערוך</button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {isAdmin && inviteCode && (
                <div className="bg-brand-teal/5 p-5 rounded-3xl border border-brand-teal/10">
                   <h3 className="text-xs font-bold text-brand-teal uppercase tracking-wider mb-2">הזמנת חברים</h3>
                   <p className="text-sm text-brand-teal/80 mb-4">שלח את הקוד או הקישור למי שאתה רוצה לצרף לבית:</p>
                   <div className="flex flex-col sm:flex-row gap-3">
                      <div className="flex-1 bg-white p-3 rounded-2xl border border-brand-teal/20 font-mono text-center flex items-center justify-between">
                         <span className="text-brand-teal font-bold text-xl">{inviteCode}</span>
                         <button 
                           onClick={() => { navigator.clipboard.writeText(inviteCode); alert('הקוד הועתק'); }}
                           className="text-xs bg-brand-teal/10 text-brand-teal hover:bg-brand-teal/20 px-3 py-1.5 rounded-lg font-medium transition-colors"
                         >העתק קוד</button>
                      </div>
                      <button 
                         onClick={() => { navigator.clipboard.writeText(inviteLink || ''); alert('הקישור הועתק'); }}
                         className="px-6 py-3 bg-brand-teal text-white rounded-2xl font-bold shadow-md hover:bg-brand-teal/90 transition-colors text-sm"
                      >🔗 העתק קישור הצטרפות</button>
                   </div>
                </div>
              )}

              {/* Danger Zone - Only in General tab */}
              {isAdmin && (
                <div className="mt-8 bg-red-50/40 border border-red-100 p-5 rounded-3xl">
                  <h2 className="text-base font-bold text-red-700 mb-1">אזור מסוכן</h2>
                  <p className="text-sm text-red-600/80 mb-4">
                    מחיקת הקבוצה תמחק את כל המשימות, הרשימות וחברי הקבוצה. פעולה זו בלתי הפיכה.
                  </p>
                  <div className="flex flex-col sm:flex-row gap-3 items-center">
                    <input 
                      type="text" 
                      placeholder="הקלד 'DELETE' לאישור"
                      value={dissolveConfirm}
                      onChange={(e) => setDissolveConfirm(e.target.value)}
                      className="px-4 py-2 border border-red-200 rounded-xl focus:border-red-400 outline-none w-full sm:w-auto font-mono text-center tracking-widest text-sm bg-white"
                    />
                    <button 
                      onClick={handleDissolve}
                      disabled={dissolveConfirm !== 'DELETE'}
                      className="px-6 py-2 bg-red-500 text-white rounded-xl font-bold disabled:opacity-50 hover:bg-red-600 w-full sm:w-auto transition-colors text-sm"
                    >
                      פזר קבוצה
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Tab: Advanced (Accordion List) */}
          {activeTab === 'advanced' && (
            <div className="space-y-3">
              
              {/* Accordion: Notifications (Everyone) */}
              {renderAccordion('notifications', 'התראות שלי', '🔔', (
                <div className="space-y-4 relative">
                  {prefsSaved && <div className="absolute top-0 left-0 bg-brand-teal text-white text-xs px-2 py-1 rounded-lg animate-pulse">נשמר ✓</div>}
                  
                  {/* Web Push Subscription Component */}
                  <div className="mb-6">
                    {householdId && <PushSubscriptionManager householdId={householdId} />}
                  </div>
                  
                  <div className="space-y-3">
                    {[
                      { key: 'notify_on_add', label: 'התראות על משימות ופריטים חדשים' },
                      { key: 'notify_on_complete', label: 'התראות על השלמת משימות/קניות' },
                    ].map((p) => (
                      <label key={p.key} className="flex items-center justify-between p-4 bg-white rounded-xl border border-neutral-100 shadow-sm cursor-pointer hover:bg-neutral-50 transition-colors">
                        <span className="font-medium text-calm-text text-sm">{p.label}</span>
                        <input 
                          type="checkbox" 
                          checked={notificationPrefs[p.key as keyof NotificationPreferences] as boolean} 
                          onChange={(e) => handlePrefChange(p.key as keyof NotificationPreferences, e.target.checked)} 
                          className="w-5 h-5 accent-brand-teal" 
                        />
                      </label>
                    ))}
                  </div>

                  {lists.length > 0 && (
                    <div className="mt-6">
                      <h4 className="text-xs font-bold text-muted-warm uppercase mb-3">השתקת רשימות</h4>
                      <p className="text-xs text-calm-text/70 mb-3">בחר רשימות שאתה לא רוצה לקבל מהן אף התראה:</p>
                      <div className="space-y-2">
                        {lists.map(list => (
                          <label key={list.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-neutral-100 shadow-sm cursor-pointer hover:bg-neutral-50 transition-colors">
                            <span className="text-sm text-calm-text font-medium">{list.name}</span>
                            <input 
                              type="checkbox" 
                              checked={notificationPrefs.muted_list_ids?.includes(list.id)} 
                              onChange={() => handleToggleMuteList(list.id)} 
                              className="w-4 h-4 accent-brand-purple" 
                            />
                          </label>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Accordion: Lists (Admin Only) */}
              {isAdmin && renderAccordion('lists', 'ניהול רשימות', '📋', (
                <div className="space-y-4">
                  <div className="space-y-2">
                    {lists.map(list => (
                      <div key={list.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-neutral-100 shadow-sm">
                        <div className="flex items-center gap-3">
                          <button onClick={() => handleToggleLock(list.id, list.is_locked)} className="text-lg opacity-70 hover:opacity-100 transition-opacity" title={list.is_locked ? 'שחרר נעילה' : 'נעל רשימה (לאדמינים בלבד)'}>
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
                              className="border border-brand-teal/30 rounded-lg px-2 py-1 outline-none focus:border-brand-teal text-sm"
                            />
                          ) : (
                            <span 
                              className="font-medium text-calm-text text-sm cursor-text hover:underline"
                              onClick={() => { setEditingListId(list.id); setEditListName(list.name); }}
                            >
                              {list.name}
                            </span>
                          )}
                        </div>
                        {/* ONLY show delete button if NOT locked */}
                        {!list.is_locked && (
                          <button onClick={() => handleDeleteList(list.id, list.name)} className="text-red-400 hover:text-red-600 text-xs font-bold transition-colors">
                            מחק רשימה
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                  <div className="flex gap-2 mt-4">
                    <input
                      type="text"
                      value={newListName}
                      onChange={(e) => setNewListName(e.target.value)}
                      placeholder="שם הרשימה החדשה"
                      className="flex-1 px-4 py-2 border border-neutral-200 rounded-xl focus:border-brand-teal outline-none text-sm bg-white"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddList()}
                    />
                    <button onClick={handleAddList} disabled={!newListName.trim()} className="px-5 py-2 bg-calm-text text-white rounded-xl text-sm font-medium disabled:opacity-50 shrink-0">
                      + הוסף
                    </button>
                  </div>
                </div>
              ))}

              {/* Accordion: Memory */}
              {renderAccordion('memory', 'זיכרון הסוכן', '🧠', (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 gap-3">
                    {memories.map(m => (
                      <div key={m.key} className="p-4 bg-white rounded-xl border border-neutral-100 shadow-sm flex justify-between items-start group">
                        <div className="flex-1">
                          <p className="text-xs font-bold text-brand-purple mb-1">{m.key}</p>
                          <p className="text-sm text-calm-text">{m.value}</p>
                        </div>
                        {isAdmin && (
                          <button onClick={() => handleDeleteMemory(m.key)} className="text-neutral-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all text-lg">🗑️</button>
                        )}
                      </div>
                    ))}
                    {memories.length === 0 && (
                      <p className="text-sm text-muted-warm text-center py-4">הסוכן עדיין לא למד כלום על הקבוצה.</p>
                    )}
                  </div>

                  {isAdmin && (
                    <div className="mt-4 p-5 bg-brand-purple/5 rounded-2xl border border-brand-purple/10">
                      <h4 className="text-sm font-bold text-brand-purple mb-3">למד את הסוכן משהו חדש</h4>
                      <div className="flex flex-col gap-3">
                        <div>
                          <label className="block text-xs font-medium text-calm-text/70 mb-1">מה הכלל או ההרגל?</label>
                          <input 
                            placeholder="למשל: יום ניקיון (בלי קו תחתון)"
                            value={newMemKey}
                            onChange={e => setNewMemKey(e.target.value)}
                            className="w-full px-4 py-2 border border-neutral-200 rounded-xl outline-none focus:border-brand-purple text-sm bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-calm-text/70 mb-1">מה הפירוט או התדירות?</label>
                          <input 
                            placeholder="למשל: קורה כל יום שלישי קבוע"
                            value={newMemVal}
                            onChange={e => setNewMemVal(e.target.value)}
                            className="w-full px-4 py-2 border border-neutral-200 rounded-xl outline-none focus:border-brand-purple text-sm bg-white"
                          />
                        </div>
                        <button 
                          onClick={handleAddMemory}
                          disabled={savingMem || !newMemKey || !newMemVal}
                          className="mt-2 bg-brand-purple text-white px-6 py-2.5 rounded-full text-sm font-bold disabled:opacity-50 transition-opacity"
                        >
                          הוסף מידע לסוכן
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Accordion: Members (Admin Only) */}
              {isAdmin && renderAccordion('members', 'משתתפים', '👥', (
                <div className="space-y-2">
                  {members.map(member => (
                    <div key={member.id} className="flex items-center justify-between p-3 bg-white rounded-xl border border-neutral-100 shadow-sm">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-teal/10 text-brand-teal rounded-full flex items-center justify-center font-bold text-sm">
                          מש
                        </div>
                        <div>
                          <div className="font-medium text-calm-text text-sm">משתמש {member.user_id.substring(0,6)}</div>
                          <div className="text-xs text-muted-warm">הצטרף {new Date(member.joined_at).toLocaleDateString('he-IL')}</div>
                        </div>
                        <button 
                          onClick={() => handleToggleRole(member.user_id, member.role)}
                          className={`text-[10px] font-bold px-3 py-1.5 rounded-full transition-colors ${member.role === 'admin' ? 'bg-brand-purple text-white hover:bg-brand-purple/80' : 'bg-neutral-100 text-muted-warm hover:bg-neutral-200'}`}
                          title="לחץ לשינוי תפקיד"
                        >
                          {member.role === 'admin' ? 'אדמין' : 'חבר'}
                        </button>
                      </div>
                      <button onClick={() => handleRemoveMemberAction(member.user_id)} className="text-red-400 hover:text-red-600 font-bold text-xl px-2 transition-colors" title="הסר משתמש">
                        ×
                      </button>
                    </div>
                  ))}
                </div>
              ))}

              {/* Accordion: Permissions (Admin Only) */}
              {isAdmin && permissions && renderAccordion('permissions', 'הרשאות', '🔐', (
                <div className="space-y-3 relative">
                  {permSaved && <div className="absolute top-0 left-0 bg-brand-teal text-white text-xs px-2 py-1 rounded-lg animate-pulse">נשמר ✓</div>}
                  
                  {[
                    { key: 'can_add_tasks', label: 'חברים יכולים להוסיף משימות' },
                    { key: 'can_delete_tasks', label: 'חברים יכולים למחוק משימות' },
                    { key: 'can_clear_lists', label: 'חברים יכולים לנקות רשימות מלאות' },
                    { key: 'can_add_to_specific_lists_only', label: 'הוספה לרשימות ספציפיות בלבד' },
                  ].map((p) => (
                    <label key={p.key} className="flex items-center justify-between p-4 bg-white rounded-xl border border-neutral-100 shadow-sm cursor-pointer hover:bg-neutral-50 transition-colors">
                      <span className="font-medium text-calm-text text-sm">{p.label}</span>
                      <input 
                        type="checkbox" 
                        checked={permissions[p.key as keyof Permissions]} 
                        onChange={(e) => handlePermissionChange(p.key as keyof Permissions, e.target.checked)} 
                        className="w-5 h-5 accent-brand-teal" 
                      />
                    </label>
                  ))}
                </div>
              ))}
              
            </div>
          )}

        </div>
      </div>
    </div>
  );
}
