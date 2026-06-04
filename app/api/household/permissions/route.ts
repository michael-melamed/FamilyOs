import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

/**
 * @file app/api/household/permissions/route.ts
 * @description_en GET /api/household/permissions — returns permissions for the caller's household
 *               PUT /api/household/permissions — updates permissions (admin only)
 * @inputs    PUT body: partial household_permissions fields (household_id ignored from body)
 * @outputs   JSON: household_permissions object
 * @depends_on lib/supabase/server.ts
 */

async function getSession() {
  return createClient().auth.getSession();
}

export async function GET() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', session.user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'User has no household' }, { status: 404 });
  }

  const { data } = await supabase
    .from('household_permissions')
    .select('*')
    .eq('household_id', membership.household_id)
    .single();

  return NextResponse.json(data ?? null);
}

export async function PUT(request: Request) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: membership } = await supabase
    .from('household_members')
    .select('household_id, role')
    .eq('user_id', session.user.id)
    .single();

  if (!membership) {
    return NextResponse.json({ error: 'User has no household' }, { status: 404 });
  }

  if (membership.role !== 'admin') {
    return NextResponse.json({ error: 'Only admins can update permissions' }, { status: 403 });
  }

  const body = await request.json();

  // Strip household_id from body to prevent tampering — always use session-derived value
  const { household_id: _ignored, ...updates } = body;

  const { data, error } = await supabase
    .from('household_permissions')
    .update(updates)
    .eq('household_id', membership.household_id)
    .select('*')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}