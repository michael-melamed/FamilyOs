import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiResponse, ActivityLog } from '@/types';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const householdId = searchParams.get('household_id');

    if (!householdId) {
      return NextResponse.json({ error: 'Missing household_id' } satisfies ApiResponse, { status: 400 });
    }

    const supabase = createClient();
    
    // Auth validation
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' } satisfies ApiResponse, { status: 401 });
    }

    // Check membership and get cleared_history_at
    const { data: member, error: memberError } = await supabase
      .from('household_members')
      .select('cleared_history_at')
      .eq('household_id', householdId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !member) {
      return NextResponse.json({ error: 'Forbidden' } satisfies ApiResponse, { status: 403 });
    }

    // Query activity logs
    let query = supabase
      .from('activity_logs')
      .select('*')
      .eq('household_id', householdId)
      .order('created_at', { ascending: false })
      .limit(50);

    // Only show logs after cleared_history_at
    if (member.cleared_history_at) {
      query = query.gt('created_at', member.cleared_history_at);
    }

    const { data: logs, error: logsError } = await query;

    if (logsError) throw logsError;

    return NextResponse.json({ data: logs as ActivityLog[] });

  } catch (err: any) {
    console.error('Error fetching activity logs:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' } satisfies ApiResponse, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const householdId = searchParams.get('household_id');

    if (!householdId) {
      return NextResponse.json({ error: 'Missing household_id' } satisfies ApiResponse, { status: 400 });
    }

    const supabase = createClient();
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' } satisfies ApiResponse, { status: 401 });
    }

    // Update cleared_history_at for the user
    const { error } = await supabase
      .from('household_members')
      .update({ cleared_history_at: new Date().toISOString() })
      .eq('household_id', householdId)
      .eq('user_id', user.id);

    if (error) throw error;

    return NextResponse.json({ data: { success: true } });

  } catch (err: any) {
    console.error('Error clearing activity logs:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' } satisfies ApiResponse, { status: 500 });
  }
}
