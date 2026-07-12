'use client';

/**
 * @file components/layout/NotificationToast.tsx
 * @description_he תצוגת התראות בזמן אמת — Toast שמגלש מלמטה
 * @description_en Animated bottom toast notifications for real-time household updates
 * @inputs    notifications: AppNotification[], onDismiss: (id: string) => void
 * @outputs   JSX toast stack above the PromptBar
 */

import type { AppNotification, NotificationType } from '@/hooks/useNotifications';

type Props = {
  notifications: AppNotification[];
  onDismiss: (id: string) => void;
};

function getIcon(type: NotificationType): string {
  switch (type) {
    case 'add':      return '✅';
    case 'complete': return '🎉';
    case 'delete':   return '🗑️';
    case 'update':   return '✏️';
    default:         return '🔔';
  }
}

function getAccentColor(type: NotificationType): string {
  switch (type) {
    case 'add':      return 'border-brand-teal/40 bg-brand-teal/5';
    case 'complete': return 'border-brand-teal/60 bg-brand-teal/10';
    case 'delete':   return 'border-red-200 bg-red-50';
    case 'update':   return 'border-brand-purple/40 bg-brand-purple/5';
    default:         return 'border-gray-200 bg-white';
  }
}

export function NotificationToast({ notifications, onDismiss }: Props) {
  if (notifications.length === 0) return null;

  return (
    <div
      className="fixed bottom-28 left-4 right-4 z-50 flex flex-col gap-2 items-stretch max-w-sm mx-auto"
      role="region"
      aria-label="התראות"
      dir="rtl"
    >
      {notifications.map((notif) => (
        <div
          key={notif.id}
          className={`
            flex items-start gap-3 px-4 py-3 rounded-2xl border shadow-lg
            backdrop-blur-sm animate-slide-up
            ${getAccentColor(notif.type)}
          `}
          style={{
            animation: 'slideUp 0.3s ease-out forwards',
          }}
        >
          <span className="text-xl shrink-0 mt-0.5">{getIcon(notif.type)}</span>
          <p className="text-sm font-medium text-calm-text flex-1 leading-snug">
            {notif.message}
          </p>
          <button
            onClick={() => onDismiss(notif.id)}
            className="text-muted-warm hover:text-calm-text transition-colors shrink-0 text-lg leading-none"
            aria-label="סגור התראה"
          >
            ×
          </button>
        </div>
      ))}

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(16px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
