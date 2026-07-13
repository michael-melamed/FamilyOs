'use client';

import { useState, useEffect, useRef } from 'react';
import type { ActivityLog } from '@/types';
import { createClient } from '@/lib/supabase/client';

type NotificationBellProps = {
  householdId: string;
  hasRecentUpdate: boolean;
  currentUserId?: string;
};

export function NotificationBell({ householdId, hasRecentUpdate, currentUserId }: NotificationBellProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasUnread, setHasUnread] = useState(hasRecentUpdate);
  const panelRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();

  useEffect(() => {
    if (hasRecentUpdate) setHasUnread(true);
  }, [hasRecentUpdate]);

  useEffect(() => {
    // Close panel when clicking outside
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchLogs = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/household/activity?household_id=${householdId}`);
      if (res.ok) {
        const json = await res.json();
        setLogs(json.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = () => {
    const nextState = !isOpen;
    setIsOpen(nextState);
    if (nextState) {
      setHasUnread(false);
      fetchLogs();
    }
  };

  const handleClearHistory = async () => {
    if (!window.confirm('האם אתה בטוח שברצונך לנקות את היסטוריית ההתראות עבורך?')) return;
    try {
      const res = await fetch(`/api/household/activity?household_id=${householdId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setLogs([]);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const formatAction = (log: ActivityLog) => {
    const isMe = log.actor_id === currentUserId;
    const name = isMe ? 'את/ה' : log.actor_name;
    const verbSuffix = isMe ? '' : 'ה'; // Very naive hebrew conjugation

    if (log.action === 'INSERT') return `${name} הוסיפ/${verbSuffix} את ה${getEntityType(log.entity_type)}`;
    if (log.action === 'DELETE') return `${name} מחק/${verbSuffix} את ה${getEntityType(log.entity_type)}`;
    if (log.action === 'UPDATE') {
      if (log.details?.event === 'completed') return `${name} סימנ/${verbSuffix} כהושלם את ה${getEntityType(log.entity_type)}`;
      return `${name} עדכנ/${verbSuffix} את ה${getEntityType(log.entity_type)}`;
    }
    return `${name} שינה/${verbSuffix}`;
  };

  const getEntityType = (type: string) => {
    if (type === 'task') return 'משימה';
    if (type === 'shopping_item') return 'פריט';
    if (type === 'list') return 'רשימה';
    return 'פריט';
  };

  const formatTime = (isoString: string) => {
    const d = new Date(isoString);
    const now = new Date();
    const diffMin = Math.round((now.getTime() - d.getTime()) / 60000);
    if (diffMin < 1) return 'עכשיו';
    if (diffMin < 60) return `לפני ${diffMin} דקות`;
    if (diffMin < 1440) return `לפני ${Math.round(diffMin / 60)} שעות`;
    return d.toLocaleDateString('he-IL');
  };

  return (
    <div className="relative" ref={panelRef}>
      <button 
        onClick={handleToggle}
        className="relative p-2 text-xl hover:bg-[#2E4A7A] rounded-full transition-colors"
        aria-label="התראות"
      >
        🔔
        {hasUnread && (
          <div className="absolute top-1 right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse border-2 border-[#1B2A4A]" />
        )}
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-2 w-80 sm:w-96 bg-white text-calm-text rounded-2xl shadow-xl border border-neutral-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-4 duration-200">
          <div className="p-4 bg-neutral-50 border-b border-neutral-100 flex justify-between items-center">
            <h3 className="font-bold text-lg">פעילות אחרונה</h3>
            <a href="/household/settings" className="text-xs text-brand-teal hover:underline font-medium">
              הגדרות התראות ⚙️
            </a>
          </div>
          
          <div className="max-h-96 overflow-y-auto p-2">
            {loading ? (
              <div className="text-center p-4 text-muted-warm text-sm">טוען...</div>
            ) : logs.length === 0 ? (
              <div className="text-center p-6 text-muted-warm text-sm flex flex-col items-center gap-2">
                <span className="text-2xl opacity-50">📭</span>
                אין התראות חדשות
              </div>
            ) : (
              <div className="space-y-1">
                {logs.map(log => (
                  <div key={log.id} className="p-3 hover:bg-neutral-50 rounded-xl transition-colors flex flex-col gap-1">
                    <p className="text-sm">
                      {formatAction(log)} <span className="font-bold text-brand-purple">"{log.entity_title}"</span>
                    </p>
                    <span className="text-xs text-muted-warm">{formatTime(log.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {logs.length > 0 && (
            <div className="p-3 border-t border-neutral-100 bg-neutral-50 text-center">
              <button 
                onClick={handleClearHistory}
                className="text-xs text-muted-warm hover:text-red-500 transition-colors font-medium"
              >
                נקה היסטוריה
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
