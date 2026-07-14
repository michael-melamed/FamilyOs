import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import webpush from 'web-push';

// Initialize Supabase with Service Role to bypass RLS for webhooks
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY;

if (vapidPublicKey && vapidPrivateKey) {
  webpush.setVapidDetails(
    'mailto:support@familyos.com',
    vapidPublicKey,
    vapidPrivateKey
  );
}

export async function POST(req: Request) {
  return NextResponse.json({ message: 'Push notifications disabled' });
  /*
  try {
    const payload = await req.json();

    // Check if it's an INSERT on activity_logs
    if (payload.type !== 'INSERT' || payload.table !== 'activity_logs') {
      return NextResponse.json({ message: 'Ignored' });
    }

    const log = payload.record;
    if (!log.household_id) {
      return NextResponse.json({ message: 'No household_id' });
    }

    // Determine the message title and body
    const actorName = log.actor_name;
    const entityTitle = log.entity_title;
    
    let actionText = 'ביצע שינוי ב';
    let entityName = 'פריט';
    
    if (log.entity_type === 'task') entityName = 'משימה';
    if (log.entity_type === 'shopping_item') entityName = 'פריט קניות';
    if (log.entity_type === 'list') entityName = 'רשימה';

    if (log.action === 'INSERT') actionText = 'הוסיף/ה את ה';
    if (log.action === 'DELETE') actionText = 'מחק/ה את ה';
    if (log.action === 'UPDATE') {
      if (log.details?.event === 'completed') actionText = 'סיים/ה את ה';
      else actionText = 'עדכן/ה את ה';
    }

    const notificationTitle = 'FamilyOS';
    const notificationBody = `${actorName} ${actionText}${entityName} "${entityTitle}"`;

    // Get all members of the household EXCEPT the actor
    const { data: members, error: membersError } = await supabase
      .from('household_members')
      .select('user_id, notification_preferences')
      .eq('household_id', log.household_id)
      .neq('user_id', log.actor_id);

    if (membersError || !members) throw membersError;

    // Filter members based on their notification preferences
    const targetUserIds = members.filter(m => {
      const prefs = m.notification_preferences as Record<string, any> || {};
      
      // If it's a list operation, or task/shopping, maybe we mute certain lists?
      // For simplicity, let's just check the global toggles
      if (log.action === 'INSERT' && prefs.notify_on_add === false) return false;
      if (log.action === 'UPDATE' && log.details?.event === 'completed' && prefs.notify_on_complete === false) return false;
      
      // Muted lists? We don't have list_id in activity_logs directly unless we add it,
      // so we skip list-specific muting for now in push notifications.
      
      return true;
    }).map(m => m.user_id);

    if (targetUserIds.length === 0) {
      return NextResponse.json({ message: 'No target users' });
    }

    // Get push subscriptions for these users
    const { data: subs, error: subsError } = await supabase
      .from('push_subscriptions')
      .select('*')
      .in('user_id', targetUserIds);

    if (subsError) throw subsError;

    if (!subs || subs.length === 0) {
      return NextResponse.json({ message: 'No push subscriptions found' });
    }

    // Send push notifications
    const pushPayload = JSON.stringify({
      title: notificationTitle,
      body: notificationBody,
      url: '/dashboard'
    });

    const sendPromises = subs.map(async (sub) => {
      const pushSubscription = {
        endpoint: sub.endpoint,
        keys: {
          p256dh: sub.p256dh,
          auth: sub.auth
        }
      };

      try {
        await webpush.sendNotification(pushSubscription, pushPayload);
      } catch (err: any) {
        // If the subscription is no longer valid, delete it
        if (err.statusCode === 410 || err.statusCode === 404) {
          await supabase.from('push_subscriptions').delete().eq('id', sub.id);
        } else {
          console.error('Push error:', err);
        }
      }
    });

    await Promise.allSettled(sendPromises);

    return NextResponse.json({ success: true, sent: subs.length });

  } catch (err: any) {
    console.error('Webhook error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
  */
}
