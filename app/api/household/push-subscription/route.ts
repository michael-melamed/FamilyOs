import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/types';

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' } satisfies ApiResponse, { status: 401 });
    }

    const { subscription, householdId } = await req.json();

    if (!subscription || !subscription.endpoint || !subscription.keys || !householdId) {
      return NextResponse.json({ error: 'Missing subscription data or householdId' } satisfies ApiResponse, { status: 400 });
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .upsert({
        user_id: user.id,
        household_id: householdId,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth
      }, {
        onConflict: 'user_id, endpoint'
      });

    if (error) throw error;

    return NextResponse.json({ data: { success: true } });
  } catch (err: any) {
    console.error('Error saving push subscription:', err);
    return NextResponse.json({ error: err.message } satisfies ApiResponse, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' } satisfies ApiResponse, { status: 401 });
    }

    const { endpoint } = await req.json();

    if (!endpoint) {
      return NextResponse.json({ error: 'Missing endpoint' } satisfies ApiResponse, { status: 400 });
    }

    const { error } = await supabase
      .from('push_subscriptions')
      .delete()
      .eq('user_id', user.id)
      .eq('endpoint', endpoint);

    if (error) throw error;

    return NextResponse.json({ data: { success: true } });
  } catch (err: any) {
    console.error('Error deleting push subscription:', err);
    return NextResponse.json({ error: err.message } satisfies ApiResponse, { status: 500 });
  }
}
