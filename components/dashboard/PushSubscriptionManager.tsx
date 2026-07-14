'use client';

// Push notifications have been temporarily disabled.
// The component is stubbed to prevent undefined component errors in parent layouts.

export function PushSubscriptionManager({ householdId }: { householdId: string }) {
  return null;
}

/* 
import { useState, useEffect } from 'react';

// Base64 to Uint8Array converter
function urlBase64ToUint8Array(base64String: string) {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/\-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

export function PushSubscriptionManager({ householdId }: { householdId: string }) {
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if ('serviceWorker' in navigator && 'PushManager' in window) {
      setIsSupported(true);
      checkSubscription();
    } else {
      setLoading(false);
    }
  }, []);

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (err) {
      console.error('Error checking push subscription:', err);
    } finally {
      setLoading(false);
    }
  };

  const subscribe = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error('VAPID public key is missing');
      }

      const subscription = await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
      });

      // Send to backend
      const res = await fetch('/api/household/push-subscription', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscription, householdId })
      });

      if (res.ok) {
        setIsSubscribed(true);
      } else {
        throw new Error('Failed to save subscription');
      }
    } catch (err) {
      console.error('Failed to subscribe:', err);
      alert('שגיאה בהרשמה להתראות פוש. ודא שנתת הרשאה בדפדפן.');
    } finally {
      setLoading(false);
    }
  };

  const unsubscribe = async () => {
    setLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await registration.pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from backend
        await fetch('/api/household/push-subscription', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ endpoint: subscription.endpoint })
        });
      }
      
      setIsSubscribed(false);
    } catch (err) {
      console.error('Failed to unsubscribe:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return (
      <div className="p-4 bg-yellow-50 rounded-xl border border-yellow-100 text-sm text-yellow-800">
        התראות פוש (למכשיר) לא נתמכות בדפדפן זה, או שאתה צריך להוסיף את האפליקציה למסך הבית (iOS).
      </div>
    );
  }

  return (
    <div className="p-4 bg-white rounded-xl border border-brand-teal/20 shadow-sm">
      <h4 className="font-bold text-brand-teal mb-2 text-sm">התראות פוש למכשיר 📱</h4>
      <p className="text-xs text-muted-warm mb-4">
        קבל התראות אמיתיות לטלפון כשיש שינויים, גם כשהאפליקציה סגורה!
      </p>
      
      {loading ? (
        <button disabled className="px-4 py-2 bg-neutral-100 text-neutral-400 rounded-lg text-sm font-medium w-full">
          טוען...
        </button>
      ) : isSubscribed ? (
        <button 
          onClick={unsubscribe}
          className="px-4 py-2 bg-red-50 text-red-600 rounded-lg text-sm font-medium w-full hover:bg-red-100 transition-colors"
        >
          בטל התראות פוש למכשיר זה
        </button>
      ) : (
        <button 
          onClick={subscribe}
          className="px-4 py-2 bg-brand-teal text-white rounded-lg text-sm font-bold w-full hover:bg-brand-teal/90 transition-colors shadow-sm"
        >
          אפשר התראות פוש למכשיר זה
        </button>
      )}
    </div>
  );
}
*/
