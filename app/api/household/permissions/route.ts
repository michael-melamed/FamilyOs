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
    .select('household_id')
    .eq('user_id', session.user.id)
    .eq('household_id', household_id)
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
    return NextResponse.json({ error: 'Only admins can update permissions' }, { status: 403 });
  }

  // Extract household_id to prevent it from being modified in updates
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