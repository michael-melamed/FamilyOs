import { NextResponse } from 'next/server';
import { createClient as createSupabaseClient } from '@supabase/supabase-js';
import { createClient } from '@/lib/supabase/server';

/**
 * @file app/api/household/join/route.ts
 * @description_en POST /api/household/join — joins a household using an invite code
 * @inputs    POST body: { code: string }
 * @outputs   JSON: { household_id: string, household_name: string }
 * @depends_on lib/supabase/server.ts
 * @fix_guide
 *   - 401 if not authenticated
 *   - 404 if code not found or inactive or expired
 *   - 409 if user is already a member of this household
 */

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { code } = await request.json();

  if (!code || typeof code !== 'string') {
    return NextResponse.json({ error: 'code is required' }, { status: 400 });
  }

  // Bypass RLS just to check the invite code validity since the user is not a member yet
  const supabaseAdmin = createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );

  const { data: invite, error: lookupErr } = await supabaseAdmin
    .from('invite_codes')
    .select('household_id, is_active, expires_at, households!inner(name)')
    .eq('code', code.toUpperCase())
    .single() as any;

  if (lookupErr || !invite) {
    return NextResponse.json({ error: 'Invalid invite code' }, { status: 404 });
  }

  if (!invite.is_active) {
    return NextResponse.json({ error: 'This invite code has been revoked' }, { status: 404 });
  }

  if (invite.expires_at && new Date(invite.expires_at) < new Date()) {
    return NextResponse.json({ error: 'This invite code has expired' }, { status: 404 });
  }

  const hid = invite.household_id;

  // Check if user is already a member (409 Conflict)
  const { data: existingMembership } = await supabase
    .from('household_members')
    .select('id')
    .eq('household_id', hid)
    .eq('user_id', session.user.id)
    .single();

  if (existingMembership) {
    return NextResponse.json({ error: 'You are already a member of this household' }, { status: 409 });
  }

  // Add the user as a member using admin client to avoid any RLS chicken-and-egg issues
  const { error: joinErr } = await supabaseAdmin
    .from('household_members')
    .insert({ household_id: hid, user_id: session.user.id, role: 'member' });

  if (joinErr) {
    return NextResponse.json({ error: 'Failed to join household' }, { status: 500 });
  }

  // Backfill legacy family_members to satisfy shopping_items RLS
  await supabaseAdmin.from('family_members').insert({
    family_id: hid,
    user_id: session.user.id,
    display_name: 'Member',
    role: 'member'
  });

  const householdName = Array.isArray(invite.households)
    ? invite.households[0]?.name
    : invite.households?.name;

  return NextResponse.json({ household_id: hid, household_name: householdName });
}