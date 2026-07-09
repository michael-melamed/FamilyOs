import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * @file app/api/household/members/route.ts
 * @description_en GET /api/household/members — returns all members of the caller's household
 * @outputs   JSON: Array<{ id, user_id, role, joined_at }>
 * @depends_on lib/supabase/server.ts
 */
export async function GET(request: Request) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const household_id = searchParams.get('household_id');

  if (!household_id) {
    return NextResponse.json({ error: 'Missing household_id' }, { status: 400 });
  }

  // Get the caller's household from their membership row
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', session.user.id)
    .eq('household_id', household_id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'User has no household' }, { status: 404 });
  }

  const { data: members } = await supabase
    .from('household_members')
    .select('id, user_id, role, joined_at')
    .eq('household_id', membership.household_id)
    .order('joined_at', { ascending: true });

  return NextResponse.json(members ?? []);
}