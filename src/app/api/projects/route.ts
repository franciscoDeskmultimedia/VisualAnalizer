import { NextResponse } from 'next/server';
import { getProjects, saveProject } from '@/lib/storage';
import { getCurrentUser } from '@/lib/auth';
import { Project, DEFAULT_BREAKPOINTS, DEFAULT_PROJECT_SETTINGS } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const user = await getCurrentUser();
    const projects = await getProjects(user?.id, user?.email);
    return NextResponse.json({ success: true, projects, user });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Please sign in or create an account to create a project.' },
        { status: 401 }
      );
    }

    const body = await request.json();
    const { name, baseUrl, pages, breakpoints, settings } = body;

    if (!name || !baseUrl) {
      return NextResponse.json(
        { success: false, error: 'Name and Base URL are required.' },
        { status: 400 }
      );
    }

    // Clean URL
    let formattedUrl = baseUrl.trim();
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }
    formattedUrl = formattedUrl.replace(/\/+$/, '');

    const newProject: Project = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      baseUrl: formattedUrl,
      ownerId: user?.id || 'usr_anonymous',
      ownerEmail: user?.email || 'anonymous@local',
      members: user
        ? [
            {
              userId: user.id,
              email: user.email,
              name: user.name,
              role: 'owner',
              joinedAt: new Date().toISOString(),
            },
          ]
        : [],
      inviteToken: `inv_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      pages: pages && pages.length > 0 ? pages : [
        { id: `page_${Date.now()}`, name: 'Home', path: '/' }
      ],
      breakpoints: breakpoints && breakpoints.length > 0 ? breakpoints : DEFAULT_BREAKPOINTS,
      baselineRunId: null,
      settings: settings || DEFAULT_PROJECT_SETTINGS,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    await saveProject(newProject);

    return NextResponse.json({ success: true, project: newProject }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
