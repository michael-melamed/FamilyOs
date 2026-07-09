import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * @file app/api/household/invite/route.ts
 * @description_en GET /api/household/invite — returns the active invite URL for the caller's household
 * @outputs   JSON: { invite_url: string, code: string }
 * @depends_on lib/supabase/server.ts
 * @fix_guide
 *   - 401 if not authenticated
 *   - 403 if caller is not an admin
 *   - 404 if no active invite code exists (use /regenerate to create one)
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

  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id, role')
    .eq('user_id', session.user.id)
    .eq('household_id', household_id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'User has no household' }, { status: 404 });
  }

  if (membership.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can view invite codes' }, { status: 403 });
  }

  const { data: invite } = await supabase
    .from('invite_codes')
    .select('code')
    .eq('household_id', membership.household_id)
    .eq('is_active', true)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  if (!invite) {
    return NextResponse.json({ error: 'No active invite code. Use /regenerate to create one.' }, { status: 404 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  const invite_url = `${appUrl}/join/${invite.code}`;

  return NextResponse.json({ code: invite.code, invite_url });
}