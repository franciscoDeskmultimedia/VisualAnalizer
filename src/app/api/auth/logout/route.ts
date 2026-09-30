import { NextResponse } from 'next/server';
import { clearSessionCookie, getCurrentUser } from '@/lib/auth';
import { cleanupEphemeralRunsForUser } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const user = await getCurrentUser();
    if (user) {
      await cleanupEphemeralRunsForUser(user.id, user.email);
    } else {
      // Clean up any unassigned ephemeral projects
      await cleanupEphemeralRunsForUser();
    }
    await clearSessionCookie();
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
