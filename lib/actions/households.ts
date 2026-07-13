'use server';

/**
 * @file lib/actions/households.ts
 * @description_he פעולות צד שרת ליצירת Household ושיוך משתמשים — מחליף את families.ts
 * @description_en Server Actions for household management. Supersedes lib/actions/families.ts.
 *               Creates household, links admin member, sets default permissions, generates invite code.
 * @inputs    userId: string, displayName?: string
 * @outputs   Promise<{ household_id: string, invite_url: string }>
 * @depends_on lib/supabase/server.ts, @supabase/supabase-js (admin client)
 * @used_by   app/auth/callback/route.ts, app/api/household/create/route.ts
 * @fix_guide
 *   - "new row violates RLS" on households insert → uses service-role client intentionally
 *   - SUPABASE_SERVICE_ROLE_KEY must be set in .env.local and NEVER exposed to the browser
 *   - Duplicate household on re-login → early-return guard on household_members prevents double inserts
 */

import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';

/** Generates a cryptographically-simple 6-character uppercase invite code */
function generateInviteCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no ambiguous chars (0/O, 1/I)
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

export async function createHouseholdForUser(
  userId: string,
  displayName?: string,
  forceNew: boolean = false
): Promise<{ household_id: string; invite_url: string }> {
  // Regular client — used only for the membership guard SELECT (subject to RLS)
  const supabase = createClient();

  // Service-role client — bypasses RLS for all INSERT operations.
  // households has no INSERT RLS policy for regular users by design —
  // creation happens exclusively here on the server, never from the browser.
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  // Guard: if this user already has a household_members row, return their existing household
  // We MUST use adminClient here, because during OAuth callback the session cookies are not yet
  // available to createClient(), causing RLS to falsely return 0 rows for the regular client.
  if (!forceNew) {
    const { data: existingMembers } = await adminClient
      .from('household_members')
      .select('household_id')
      .eq('user_id', userId)
      .limit(1);

    if (existingMembers && existingMembers.length > 0) {
      const code = generateInviteCode();
      // Return existing household — no new household created
      return {
        household_id: existingMembers[0].household_id,
        invite_url: `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/join/${code}`,
      };
    }
  }

  // Use the explicitly passed name, or fall back to a default
  const householdName = displayName && displayName.trim().length > 0 
    ? displayName.trim() 
    : 'קבוצה חדשה';

  // 1. Create household (admin client bypasses RLS)
  const { data: newHousehold, error: householdErr } = await adminClient
    .from('households')
    .insert({ name: householdName, created_by: userId })
    .select('id')
    .single();

  if (householdErr || !newHousehold) {
    throw new Error(`Failed to create household: ${householdErr?.message ?? 'unknown error'}`);
  }

  const household_id = newHousehold.id;

  // 2. Add creator as admin member
  const { error: memberErr } = await adminClient
    .from('household_members')
    .insert({
      household_id,
      user_id: userId,
      role: 'admin',
    });

  if (memberErr) {
    throw new Error(`Failed to add admin member: ${memberErr.message}`);
  }

  // Backfill legacy tables to support shopping_items RLS without requiring manual SQL migration
  await adminClient.from('families').upsert({ id: household_id, name: householdName });
  await adminClient.from('family_members').insert({
    family_id: household_id,
    user_id: userId,
    display_name: displayName || 'Admin',
    role: 'admin'
  });

  // 3. Create default permissions row (all defaults from schema)
  const { error: permErr } = await adminClient
    .from('household_permissions')
    .insert({ household_id });

  if (permErr) {
    // Non-fatal: permissions row is optional for basic operation
    console.error('Failed to create household_permissions row:', permErr.message);
  }

  // 4. Generate invite code and store it
  const code = generateInviteCode();
  const { error: codeErr } = await adminClient
    .from('invite_codes')
    .insert({
      household_id,
      code,
      created_by: userId,
    });

  if (codeErr) {
    // Non-fatal: household still usable; invite can be regenerated
    console.error('Failed to create invite code:', codeErr.message);
  }

  // 5. Create default lists — every new household gets "משימות" and "קניות" out of the box.
  //    This runs here (not in the setup page) so OAuth-login users also get them automatically.
  const { error: listsErr } = await adminClient
    .from('lists')
    .insert([
      { household_id, name: 'משימות', created_by: userId },
      { household_id, name: 'קניות', created_by: userId },
    ]);

  if (listsErr) {
    // Non-fatal: user can create lists manually from settings
    console.error('Failed to create default lists:', listsErr.message);
  }

  const invite_url = `${process.env.NEXT_PUBLIC_APP_URL ?? ''}/join/${code}`;

  return { household_id, invite_url };
}

export async function getInviteInfo(code: string): Promise<{ householdName: string, householdId: string } | null> {
  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: invite } = await adminClient
    .from('invite_codes')
    .select('household_id, households(name)')
    .eq('code', code.toUpperCase())
    .eq('is_active', true)
    .single() as any;

  if (!invite) return null;

  const householdName = Array.isArray(invite.households)
    ? invite.households[0]?.name
    : invite.households?.name;

  return {
    householdId: invite.household_id,
    householdName: householdName || 'קבוצה לא ידועה'
  };
}

export async function updateHouseholdName(householdId: string, newName: string): Promise<boolean> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  
  if (!session) throw new Error("Unauthorized");

  // Verify the user is an admin
  const { data: membership } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', householdId)
    .eq('user_id', session.user.id)
    .single();

  if (membership?.role !== 'admin') {
    throw new Error("Only admins can change the household name");
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await adminClient
    .from('households')
    .update({ name: newName })
    .eq('id', householdId);

  if (error) {
    console.error("Failed to update household name:", error);
    return false;
  }
  
  // Update legacy family name as well to keep in sync
  await adminClient.from('families').update({ name: newName }).eq('id', householdId);

  return true;
}

export async function updateMemberRole(householdId: string, targetUserId: string, newRole: 'admin' | 'member'): Promise<boolean> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  // Verify caller is admin
  const { data: caller } = await supabase
    .from('household_members')
    .select('role')
    .eq('household_id', householdId)
    .eq('user_id', session.user.id)
    .single();

  if (caller?.role !== 'admin') {
    throw new Error("Only admins can change roles");
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await adminClient
    .from('household_members')
    .update({ role: newRole })
    .eq('household_id', householdId)
    .eq('user_id', targetUserId);

  if (error) {
    console.error("Failed to update role:", error);
    return false;
  }
  return true;
}

export async function removeMember(householdId: string, targetUserId: string): Promise<boolean> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error("Unauthorized");

  const isSelf = session.user.id === targetUserId;

  if (!isSelf) {
    // Verify caller is admin
    const { data: caller } = await supabase
      .from('household_members')
      .select('role')
      .eq('household_id', householdId)
      .eq('user_id', session.user.id)
      .single();

    if (caller?.role !== 'admin') {
      throw new Error("Only admins can remove other members");
    }
  }

  const adminClient = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { error } = await adminClient
    .from('household_members')
    .delete()
    .eq('household_id', householdId)
    .eq('user_id', targetUserId);

  if (error) {
    console.error("Failed to remove member:", error);
    return false;
  }
  return true;
}
