import { NextResponse } from 'next/server';
import { getProjects, saveProject } from '@/lib/storage';
import { Project, DEFAULT_BREAKPOINTS, DEFAULT_PROJECT_SETTINGS } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const projects = getProjects();
    return NextResponse.json({ success: true, projects });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
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
    // Remove trailing slash
    formattedUrl = formattedUrl.replace(/\/+$/, '');

    const newProject: Project = {
      id: `proj_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: name.trim(),
      baseUrl: formattedUrl,
      pages: pages && pages.length > 0 ? pages : [
        { id: `page_${Date.now()}`, name: 'Home', path: '/' }
      ],
      breakpoints: breakpoints && breakpoints.length > 0 ? breakpoints : DEFAULT_BREAKPOINTS,
      baselineRunId: null,
      settings: settings || DEFAULT_PROJECT_SETTINGS,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    saveProject(newProject);

    return NextResponse.json({ success: true, project: newProject }, { status: 201 });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
