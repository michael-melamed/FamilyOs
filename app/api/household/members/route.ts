import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * @file app/api/household/members/route.ts
 * @description_en GET /api/household/members — returns all members of the caller's household
 * @outputs   JSON: Array<{ id, user_id, role, joined_at }>
 * @depends_on lib/supabase/server.ts
 */

export async function GET() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Get the caller's household from their membership row
  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', session.user.id)
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