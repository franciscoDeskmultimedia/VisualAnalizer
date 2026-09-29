import { NextResponse } from 'next/server';
import { getRunById } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string; runId: string }> }
) {
  try {
    const { id, runId } = await props.params;
    // We include comparison images, but omit redundant screenshot raw blobs for fast transfer
    const run = await getRunById(runId, true, false);
    if (!run || run.projectId !== id) {
      return NextResponse.json({ success: false, error: 'Run not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, run });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
