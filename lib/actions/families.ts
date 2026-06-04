'use server';

/**
 * @file lib/actions/families.ts
 * @description_he פעולות צד שרת לניהול "משפחות" — יצירה ושיוך משתמשים.
 * @description_en Server Actions for family management — creates a family and links the user on first login.
 * @inputs    userId: string, displayName?: string
 * @outputs   Promise<void>
 * @depends_on lib/supabase/server.ts
 * @used_by   app/auth/callback/route.ts
 * @fix_guide
 *   - "new row violates RLS" on families insert → this file uses the service-role client for the
 *     initial insert only. Make sure SUPABASE_SERVICE_ROLE_KEY is set in .env.local
 *   - Duplicate family on re-login → the early-return guard on family_members prevents double inserts
 *   - family_members insert fails → user_id must match auth.uid(); only runs inside a server action
 */

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

export async function createFamilyForUser(userId: string, displayName?: string): Promise<void> {
  // Regular (anon-key) client — used for reading family_members which has a SELECT RLS policy
  const supabase = createClient();

  // Service-role client — used ONLY for inserting into `families`.
  // The families table has no INSERT policy for regular users (by design — creation happens
  // exclusively here on the server, never from the browser).
  // SUPABASE_SERVICE_ROLE_KEY must be in .env.local and must NEVER be exposed to the client.
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Guard: if this user already has a family_member row, skip everything
  const { data: existingMember } = await supabase
    .from('family_members')
    .select('id')
    .eq('user_id', userId)
    .single();

  if (existingMember) return;

  // Build a Hebrew family name from the user's display name
  const firstName = displayName?.split(' ')[0] ?? null;
  const familyName = firstName ? `המשפחה של ${firstName}` : 'המשפחה שלי';

  // Insert family using admin client (bypasses RLS intentionally — server-only path)
  const { data: newFamily, error: familyErr } = await adminClient
    .from('families')
    .insert({ name: familyName })
    .select('id')
    .single();

  if (familyErr || !newFamily) {
    throw new Error(`Failed to create family: ${familyErr?.message ?? 'unknown error'}`);
  }

  // Insert family_member using admin client so it can set any user_id
  const { error: memberErr } = await adminClient
    .from('family_members')
    .insert({
      family_id: newFamily.id,
      user_id: userId,
      display_name: displayName || 'משתמש',
      role: 'admin',
    });

  if (memberErr) {
    throw new Error(`Failed to link user to family: ${memberErr.message}`);
  }
}
