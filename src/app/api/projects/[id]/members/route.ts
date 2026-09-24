import { NextResponse } from 'next/server';
import { getProjectById, addProjectMember, removeProjectMember } from '@/lib/storage';
import { getCurrentUser, findUserByEmail } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const project = getProjectById(id);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json({
      success: true,
      members: project.members || [],
      ownerEmail: project.ownerEmail,
      inviteToken: project.inviteToken,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await props.params;
    const project = getProjectById(id);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    // Check if requester has edit/owner permission
    if (user && project.ownerId && project.ownerId !== user.id) {
      const member = project.members?.find((m) => m.userId === user.id);
      if (!member || member.role === 'viewer') {
        return NextResponse.json(
          { success: false, error: 'You do not have permission to invite members to this project.' },
          { status: 403 }
        );
      }
    }

    const body = await request.json();
    const { email, role = 'editor' } = body;

    if (!email) {
      return NextResponse.json({ success: false, error: 'Email is required' }, { status: 400 });
    }

    // Check if the invited user already exists in the system
    const existingUser = findUserByEmail(email);

    const updatedProject = addProjectMember(id, {
      userId: existingUser?.id,
      email,
      name: existingUser?.name,
      role: role === 'viewer' ? 'viewer' : 'editor',
    });

    return NextResponse.json({ success: true, project: updatedProject });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    const { id } = await props.params;
    const project = getProjectById(id);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);
    const memberEmail = searchParams.get('email');

    if (!memberEmail) {
      return NextResponse.json({ success: false, error: 'Member email is required' }, { status: 400 });
    }

    // Prevent removing the owner
    if (project.ownerEmail && project.ownerEmail.toLowerCase() === memberEmail.toLowerCase()) {
      return NextResponse.json({ success: false, error: 'Cannot remove the project owner.' }, { status: 400 });
    }

    const updatedProject = removeProjectMember(id, memberEmail);
    return NextResponse.json({ success: true, project: updatedProject });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
