import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * @file app/api/household/members/remove/route.ts
 * @description_en POST /api/household/members/remove — removes a member from the household
 * @inputs    POST body: { user_id: string }
 * @outputs   JSON: { success: true }
 * @depends_on lib/supabase/server.ts
 * @fix_guide
 *   - 400 if trying to remove the last admin
 *   - 403 if caller is not an admin
 */

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { user_id: targetUserId, household_id } = await request.json();

  if (!targetUserId || !household_id) {
    return NextResponse.json({ error: 'user_id and household_id are required' }, { status: 400 });
  }

  // Verify caller is admin
  const { data: callerMembership } = await supabase
    .from('household_members')
    .select('household_id, role')
    .eq('user_id', session.user.id)
    .eq('household_id', household_id)
    .single();

  if (!callerMembership) {
    return NextResponse.json({ error: 'User has no household' }, { status: 404 });
  }

  if (callerMembership.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can remove members' }, { status: 403 });
  }

  const hid = callerMembership.household_id;

  // Guard: cannot remove if target is the only admin remaining
  const { data: targetMembership } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', hid)
    .eq('user_id', targetUserId)
    .single();

  if (targetMembership?.role === 'admin') {
    const { count } = await supabase
      .from('household_members')
      .select('*', { count: 'exact', head: true })
      .eq('household_id', hid)
      .eq('role', 'admin');

    if ((count ?? 0) <= 1) {
      return NextResponse.json(
        { error: 'Cannot remove the last admin. Promote another member first.' },
        { status: 400 }
      );
    }
  }

  const { error } = await supabase
    .from('household_members')
    .delete()
    .eq('household_id', hid)
    .eq('user_id', targetUserId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}