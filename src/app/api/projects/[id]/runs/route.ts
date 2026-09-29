import { NextResponse } from 'next/server';
import { getProjectById, getRunsByProjectId, getRunById, saveRun, setProjectBaselineRun } from '@/lib/storage';
import { captureScreenshot } from '@/lib/screenshot';
import { compareImages } from '@/lib/diff';
import { Run, Screenshot, ComparisonItem } from '@/types';

// Vercel serverless function execution timeout up to 60 seconds
export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await props.params;
    const url = new URL(request.url);
    const runId = url.searchParams.get('runId');
    const includeImages = url.searchParams.get('includeImages') === 'true';

    if (runId) {
      const run = await getRunById(runId, true, false);
      if (!run || run.projectId !== id) {
        return NextResponse.json({ success: false, error: 'Run not found' }, { status: 404 });
      }
      return NextResponse.json({ success: true, run });
    }

    const runs = await getRunsByProjectId(id, includeImages);
    return NextResponse.json({ success: true, runs });
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
    const { id } = await props.params;
    const project = await getProjectById(id);
    if (!project) {
      return NextResponse.json({ success: false, error: 'Project not found' }, { status: 404 });
    }

    const body = await request.json().catch(() => ({}));
    const { pageIds, breakpointIds, setAsBaseline, pagePaths } = body;

    // Resilient matching for pages: exact id, suffix, or path
    const targetPages = pageIds && pageIds.length > 0
      ? project.pages.filter((p) =>
          pageIds.includes(p.id) ||
          pageIds.some((pid: string) => p.id.endsWith(`_${pid}`) || pid.endsWith(`_${p.id}`) || p.id === pid) ||
          (pagePaths && pagePaths.includes(p.path)) ||
          pageIds.includes(p.path)
        )
      : project.pages;

    // Resilient matching for breakpoints: exact id, suffix, or name
    const targetBreakpoints = breakpointIds && breakpointIds.length > 0
      ? project.breakpoints.filter((b) =>
          breakpointIds.includes(b.id) ||
          breakpointIds.some((bid: string) => b.id.endsWith(`_${bid}`) || bid.endsWith(`_${b.id}`) || b.id === bid) ||
          breakpointIds.some((bid: string) => b.name?.toLowerCase() === bid?.toLowerCase())
        )
      : project.breakpoints;

    const finalPages = targetPages.length > 0 ? targetPages : project.pages;
    const finalBreakpoints = targetBreakpoints.length > 0 ? targetBreakpoints : project.breakpoints;

    if (finalPages.length === 0 || finalBreakpoints.length === 0) {
      return NextResponse.json(
        { success: false, error: 'No pages or breakpoints configured in project to test.' },
        { status: 400 }
      );
    }

    const runId = body.runId || `run_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const targetRunId = runId;

    // Check if there is an active baseline run (must not be the run currently being captured)
    const baselineRunId =
      project.baselineRunId && project.baselineRunId !== targetRunId ? project.baselineRunId : null;
    const baselineRun = baselineRunId ? await getRunById(baselineRunId, true, true) : null;

    const existingRun = body.runId ? await getRunById(body.runId, true, true) : null;

    const screenshots: Screenshot[] = existingRun ? [...existingRun.screenshots] : [];
    const comparisons: ComparisonItem[] = existingRun ? [...existingRun.comparisons] : [];

    let passedChecks = existingRun ? existingRun.passedChecks : 0;
    let changedChecks = existingRun ? existingRun.changedChecks : 0;
    let newChecks = existingRun ? existingRun.newChecks : 0;

    for (const page of finalPages) {
      const pagePath = page.path.startsWith('/') ? page.path : `/${page.path}`;
      const fullUrl = `${project.baseUrl}${pagePath}`;

      for (const bp of finalBreakpoints) {
        try {
          // 1. Capture current screenshot
          const imageData = await captureScreenshot({
            url: fullUrl,
            width: bp.width,
            height: bp.height,
            waitTimeMs: project.settings.waitTimeMs,
            fullPage: project.settings.fullPage,
          });

          const screenshotId = `sc_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`;
          const screenshot: Screenshot = {
            id: screenshotId,
            pageId: page.id,
            pageName: page.name,
            pagePath: page.path,
            breakpointId: bp.id,
            breakpointName: bp.name,
            width: bp.width,
            height: bp.height,
            fullUrl,
            imageData,
            capturedAt: new Date().toISOString(),
          };
          screenshots.push(screenshot);

          // 2. Compare against baseline if available
          let baselineImage: string | undefined;
          if (baselineRun) {
            const matchCmp = baselineRun.comparisons.find(
              (c) =>
                (c.pageId === page.id || c.pagePath === page.path) &&
                (c.breakpointId === bp.id || c.width === bp.width)
            );
            baselineImage = matchCmp?.currentImage || matchCmp?.baselineImage;
            if (!baselineImage) {
              const matchSc = baselineRun.screenshots.find(
                (s) =>
                  (s.pageId === page.id || s.pagePath === page.path) &&
                  (s.breakpointId === bp.id || s.width === bp.width)
              );
              baselineImage = matchSc?.imageData;
            }
          }

          if (baselineImage) {
            try {
              const diffResult = compareImages(
                baselineImage,
                imageData,
                {
                  threshold: project.settings.diffThreshold,
                }
              );

              const isIdentical = diffResult.isIdentical || diffResult.diffPercentage === 0;
              if (isIdentical) {
                passedChecks++;
              } else {
                changedChecks++;
              }

              comparisons.push({
                id: `cmp_${screenshotId}`,
                pageId: page.id,
                pageName: page.name,
                pagePath: page.path,
                breakpointId: bp.id,
                breakpointName: bp.name,
                width: bp.width,
                height: bp.height,
                fullUrl,
                baselineImage,
                currentImage: imageData,
                diffImage: diffResult.diffImageBase64,
                diffPixelCount: diffResult.diffPixelCount,
                totalPixelCount: diffResult.totalPixelCount,
                diffPercentage: diffResult.diffPercentage,
                status: isIdentical ? 'identical' : 'changed',
              });
            } catch (diffErr: unknown) {
              const dErr = diffErr as Error;
              comparisons.push({
                id: `cmp_${screenshotId}`,
                pageId: page.id,
                pageName: page.name,
                pagePath: page.path,
                breakpointId: bp.id,
                breakpointName: bp.name,
                width: bp.width,
                height: bp.height,
                fullUrl,
                baselineImage,
                currentImage: imageData,
                diffPixelCount: 0,
                totalPixelCount: bp.width * bp.height,
                diffPercentage: 0,
                status: 'error',
                errorMessage: `Diff comparison failed: ${dErr.message}`,
              });
            }
          } else {
            // No baseline yet; this is a new capture
            newChecks++;
            comparisons.push({
              id: `cmp_${screenshotId}`,
              pageId: page.id,
              pageName: page.name,
              pagePath: page.path,
              breakpointId: bp.id,
              breakpointName: bp.name,
              width: bp.width,
              height: bp.height,
              fullUrl,
              currentImage: imageData,
              diffPixelCount: 0,
              totalPixelCount: bp.width * bp.height,
              diffPercentage: 0,
              status: 'new',
            });
          }
        } catch (captureErr: unknown) {
          const cErr = captureErr as Error;
          console.error(`Failed to capture ${fullUrl} at ${bp.width}x${bp.height}:`, cErr);
          comparisons.push({
            id: `cmp_err_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
            pageId: page.id,
            pageName: page.name,
            pagePath: page.path,
            breakpointId: bp.id,
            breakpointName: bp.name,
            width: bp.width,
            height: bp.height,
            fullUrl,
            currentImage: '',
            diffPixelCount: 0,
            totalPixelCount: bp.width * bp.height,
            diffPercentage: 0,
            status: 'error',
            errorMessage: cErr.message,
          });
        }
      }
    }

    const totalChecks = comparisons.length;
    // If user explicitly requested setAsBaseline, OR if project had no baseline yet, make this run the baseline
    const shouldBeBaseline = Boolean(
      setAsBaseline || !project.baselineRunId || project.baselineRunId === targetRunId
    );

    const newRun: Run = {
      id: targetRunId,
      projectId: project.id,
      createdAt: new Date().toISOString(),
      status: 'completed',
      isBaseline: shouldBeBaseline,
      totalChecks,
      passedChecks,
      changedChecks,
      newChecks,
      screenshots,
      comparisons,
    };

    await saveRun(newRun);

    if (shouldBeBaseline) {
      await setProjectBaselineRun(project.id, newRun.id);
      const updatedBaseline = await getRunById(newRun.id, true, false);
      if (updatedBaseline) {
        return NextResponse.json({ success: true, run: updatedBaseline });
      }
    }

    return NextResponse.json({ success: true, run: newRun });
  } catch (error: unknown) {
    const err = error as Error;
    console.error('Run execution error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
