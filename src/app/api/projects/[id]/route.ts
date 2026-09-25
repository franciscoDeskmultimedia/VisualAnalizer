import { NextResponse } from 'next/server';
import { getProjectById, saveProject, deleteProject } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const project = await getProjectById(id);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, project });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const project = await getProjectById(id);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const { name, baseUrl, pages, breakpoints, settings, baselineRunId } = body;

    let formattedUrl = baseUrl ? baseUrl.trim() : project.baseUrl;
    if (!formattedUrl.startsWith('http://') && !formattedUrl.startsWith('https://')) {
      formattedUrl = `https://${formattedUrl}`;
    }
    formattedUrl = formattedUrl.replace(/\/+$/, '');

    const updatedProject = {
      ...project,
      name: name !== undefined ? name.trim() : project.name,
      baseUrl: formattedUrl,
      pages: pages !== undefined ? pages : project.pages,
      breakpoints: breakpoints !== undefined ? breakpoints : project.breakpoints,
      settings: settings !== undefined ? { ...project.settings, ...settings } : project.settings,
      baselineRunId: baselineRunId !== undefined ? baselineRunId : project.baselineRunId,
      updatedAt: new Date().toISOString(),
    };

    await saveProject(updatedProject);
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
    const { id } = await props.params;
    const deleted = await deleteProject(id);
    return NextResponse.json({ success: deleted });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
