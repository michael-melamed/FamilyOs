import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { createHouseholdForUser } from '@/lib/actions/households';

/**
 * @file app/api/household/create/route.ts
 * @description_en POST /api/household/create — creates a new household for the authenticated user
 * @inputs    POST body: { name: string }
 * @outputs   JSON: { household_id: string, invite_url: string }
 * @depends_on lib/actions/households.ts, lib/supabase/server.ts
 */

export async function POST(request: Request) {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const body = await request.json();
  const { name } = body;

  if (!name || typeof name !== 'string') {
    return NextResponse.json({ error: 'name is required' }, { status: 400 });
  }

  try {
    const result = await createHouseholdForUser(session.user.id, name, true);
    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Failed to create household:', err);
    return NextResponse.json({ error: err.message ?? 'Failed to create household' }, { status: 500 });
  }
}