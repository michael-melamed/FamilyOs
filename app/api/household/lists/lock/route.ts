import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * @file app/api/household/lists/lock/route.ts
 * @description_en POST /api/household/lists/lock — locks or unlocks a list (admin only)
 * @inputs    POST body: { list_id: string, is_locked: boolean }
 * @outputs   JSON: { id: string, is_locked: boolean }
 * @depends_on lib/supabase/server.ts
 */

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json().catch(() => ({}));
  if (!body.household_id) {
    return NextResponse.json({ error: 'Missing household_id' }, { status: 400 });
  }

  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id, role')
    .eq('user_id', session.user.id)
    .eq('household_id', body.household_id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'User has no household' }, { status: 404 });
  }

  if (membership.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can lock or unlock lists' }, { status: 403 });
  }

  const { list_id, is_locked } = body;

  if (!list_id || typeof is_locked !== 'boolean') {
    return NextResponse.json({ error: 'list_id and is_locked are required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('lists')
    .update({ is_locked })
    .eq('id', list_id)
    .eq('household_id', membership.household_id) // ensures the list belongs to the caller's household
    .select('id, is_locked')
    .single();

  if (error || !data) {
    return NextResponse.json({ error: 'List not found or update failed' }, { status: 404 });
  }

  return NextResponse.json(data);
}