import { NextResponse } from 'next/server';
import { getProjectByInviteToken, addProjectMember } from '@/lib/storage';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Please sign in or create an account to join this project team.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { inviteToken } = body;

    if (!inviteToken) {
      return NextResponse.json({ success: false, error: 'Invite token is required.' }, { status: 400 });
    }

    const project = getProjectByInviteToken(inviteToken);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Invalid or expired invite token.' }, { status: 404 });
    }

    // Add user as editor member
    const updated = addProjectMember(project.id, {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: 'editor',
    });

    return NextResponse.json({ success: true, project: updated });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
