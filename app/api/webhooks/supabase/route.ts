import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  // Webhooks disabled by user request. Returning 200 OK to prevent Supabase triggers from failing.
  console.log("Webhook hit - returning 200 OK (notifications disabled)");
  return NextResponse.json({ success: true, message: 'Notifications disabled' }, { status: 200 });
}
