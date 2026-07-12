'use client';

/**
 * @file hooks/useNotifications.ts
 * @description_he Hook לניהול תור התראות בזמן אמת
 * @description_en Notification queue manager for real-time updates from other household members
 * @inputs    None (stateful hook)
 * @outputs   { notifications, addNotification, dismissNotification }
 */

import { useState, useCallback } from 'react';

export type NotificationType = 'add' | 'complete' | 'delete' | 'update';

export type AppNotification = {
  id: string;
  message: string;
  type: NotificationType;
  timestamp: Date;
};

export function useNotifications() {
  const [notifications, setNotifications] = useState<AppNotification[]>([]);

  const addNotification = useCallback((message: string, type: NotificationType) => {
    const id = `notif-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    const notification: AppNotification = {
      id,
      message,
      type,
      timestamp: new Date(),
    };

    setNotifications((prev) => {
      // Cap at 3 visible toasts at once
      const updated = [notification, ...prev].slice(0, 3);
      return updated;
    });

    // Auto-dismiss after 5 seconds
    setTimeout(() => {
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, 5000);
  }, []);

  const dismissNotification = useCallback((id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
  }, []);

  return { notifications, addNotification, dismissNotification };
}
