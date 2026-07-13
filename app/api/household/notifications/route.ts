import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { ApiResponse } from '@/types';

export async function POST(req: Request) {
  try {
    const supabase = createClient();
    
    // Validate auth
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' } satisfies ApiResponse, { status: 401 });
    }

    const body = await req.json();
    const { householdId, preferences } = body;

    if (!householdId || !preferences) {
      return NextResponse.json({ error: 'Missing required fields' } satisfies ApiResponse, { status: 400 });
    }

    // Ensure user is member
    const { data: memberData, error: memberError } = await supabase
      .from('household_members')
      .select('id')
      .eq('household_id', householdId)
      .eq('user_id', user.id)
      .single();

    if (memberError || !memberData) {
      return NextResponse.json({ error: 'Not a member of this household' } satisfies ApiResponse, { status: 403 });
    }

    // Update preferences
    const { error: updateError } = await supabase
      .from('household_members')
      .update({ notification_preferences: preferences })
      .eq('household_id', householdId)
      .eq('user_id', user.id);

    if (updateError) {
      throw updateError;
    }

    return NextResponse.json({ data: { success: true } });

  } catch (err: any) {
    console.error('Error updating notification preferences:', err);
    return NextResponse.json(
      { error: err.message || 'Internal server error' } satisfies ApiResponse,
      { status: 500 }
    );
  }
}
