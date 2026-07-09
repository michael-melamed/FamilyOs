import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * @file app/api/household/invite/regenerate/route.ts
 * @description_en POST /api/household/invite/regenerate — deactivates old codes and generates a new invite code
 * @outputs   JSON: { code: string, invite_url: string }
 * @depends_on lib/supabase/server.ts
 * @fix_guide
 *   - 401 if not authenticated
 *   - 403 if caller is not admin
 */

/** 6-char uppercase invite code — no ambiguous characters */
function generateCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)];
  return code;
}

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
    return NextResponse.json({ error: 'Only admins can regenerate invite codes' }, { status: 403 });
  }

  const hid = membership.household_id;

  // Deactivate all current codes for this household
  await supabase
    .from('invite_codes')
    .update({ is_active: false })
    .eq('household_id', hid);

  // Generate and insert a new 6-char uppercase code
  const code = generateCode();
  const { error } = await supabase
    .from('invite_codes')
    .insert({ household_id: hid, code, created_by: session.user.id });

  if (error) {
    return NextResponse.json({ error: 'Failed to generate new invite code' }, { status: 500 });
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? '';
  return NextResponse.json({ code, invite_url: `${appUrl}/join/${code}` });
}
