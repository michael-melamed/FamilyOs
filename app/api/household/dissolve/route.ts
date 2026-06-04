import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * @file app/api/household/dissolve/route.ts
 * @description_en DELETE /api/household/dissolve — permanently deletes a household and all its data
 * @inputs    DELETE body: { confirm: true }
 * @outputs   JSON: { success: true }
 * @depends_on lib/supabase/server.ts
 * @fix_guide
 *   - 400 if confirm !== true (hard stop, intentional)
 *   - 401 if not authenticated
 *   - 403 if not admin of the household
 */

export async function DELETE(request: Request) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();

  // Hard stop — must explicitly pass confirm: true
  if (body.confirm !== true) {
    return NextResponse.json(
      { error: 'You must pass confirm: true to dissolve a household. This action is irreversible.' },
      { status: 400 }
    );
  }

  // Resolve the caller's household and verify admin role
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id, role')
    .eq('user_id', session.user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'User has no household' }, { status: 404 });
  }

  if (membership.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can dissolve a household' }, { status: 403 });
  }

  const hid = membership.household_id;

  // Ordered deletion — respects FK constraints (children before parents)
  await supabase.from('tasks').delete().eq('household_id', hid);
  await supabase.from('lists').delete().eq('household_id', hid);
  await supabase.from('invite_codes').delete().eq('household_id', hid);
  await supabase.from('household_permissions').delete().eq('household_id', hid);
  await supabase.from('household_members').delete().eq('household_id', hid);

  const { error } = await supabase.from('households').delete().eq('id', hid);

  if (error) {
    console.error('Failed to dissolve household:', error.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}