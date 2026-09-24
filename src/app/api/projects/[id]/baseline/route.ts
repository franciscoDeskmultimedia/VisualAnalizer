import { NextResponse } from 'next/server';
import { getProjectById, getRunById, setProjectBaselineRun } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const project = getProjectById(id);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json();
    const { runId } = body;

    if (!runId) {
      return NextResponse.json({ success: false, error: 'runId is required' }, { status: 400 });
    }

    const run = getRunById(runId);
    if (!run || run.projectId !== id) {
      return NextResponse.json({ success: false, error: 'Run not found for this project' }, { status: 404 });
    }

    const ok = setProjectBaselineRun(id, runId);
    return NextResponse.json({ success: ok, baselineRunId: runId });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
