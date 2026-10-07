import { NextResponse } from 'next/server';
import { getProjectById, getRunsByProjectId, getRunById, saveRun, setProjectBaselineRun, deleteNonBaselineRuns } from '@/lib/storage';
import { captureScreenshot, captureMultipleComponentStates } from '@/lib/screenshot';
import { compareImagesAsync } from '@/lib/diff';
import { processRunImage } from '@/lib/image-processing';
import { uploadRunImage, isCloudStorageConfigured } from '@/lib/storage-provider';
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
    const { pageIds, breakpointIds, setAsBaseline, pagePaths, replaceRun } = body;

    const isCloud = isCloudStorageConfigured(project.settings);
    // If in ephemeral mode and replacing previous run, delete non-baseline runs before starting
    if (!isCloud && replaceRun && !body.runId) {
      await deleteNonBaselineRuns(id);
    }

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

    // If in ephemeral mode and replacing previous run, delete non-baseline runs on first step
    const isFirstStep = Boolean(body.replaceRun && (!existingRun || existingRun.screenshots.length === 0));
    if (!isCloud && isFirstStep) {
      await deleteNonBaselineRuns(id);
    }

    const screenshots: Screenshot[] = existingRun ? [...existingRun.screenshots] : [];
    const comparisons: ComparisonItem[] = existingRun ? [...existingRun.comparisons] : [];

    let passedChecks = existingRun ? existingRun.passedChecks : 0;
    let changedChecks = existingRun ? existingRun.changedChecks : 0;
    let newChecks = existingRun ? existingRun.newChecks : 0;

    const addScreenshot = (sc: Screenshot) => {
      const idx = screenshots.findIndex(
        (s) =>
          Boolean(s.isComponent) === Boolean(sc.isComponent) &&
          s.pageId === sc.pageId &&
          s.breakpointId === sc.breakpointId &&
          (!sc.isComponent || (s.componentId === sc.componentId && s.componentState === sc.componentState))
      );
      if (idx !== -1) {
        screenshots.splice(idx, 1);
      }
      screenshots.push(sc);
    };

    const addComparison = (cmp: ComparisonItem) => {
      const idx = comparisons.findIndex(
        (c) =>
          Boolean(c.isComponent) === Boolean(cmp.isComponent) &&
          c.pageId === cmp.pageId &&
          c.breakpointId === cmp.breakpointId &&
          (!cmp.isComponent || (c.componentId === cmp.componentId && c.componentState === cmp.componentState))
      );
      if (idx !== -1) {
        const prev = comparisons[idx];
        if (prev.status === 'identical') passedChecks = Math.max(0, passedChecks - 1);
        else if (prev.status === 'changed') changedChecks = Math.max(0, changedChecks - 1);
        else if (prev.status === 'new') newChecks = Math.max(0, newChecks - 1);
        comparisons.splice(idx, 1);
      }
      if (cmp.status === 'identical') passedChecks++;
      else if (cmp.status === 'changed') changedChecks++;
      else if (cmp.status === 'new') newChecks++;
      comparisons.push(cmp);
    };

    for (const page of finalPages) {
      const pagePath = page.path.startsWith('/') ? page.path : `/${page.path}`;
      const fullUrl = `${project.baseUrl}${pagePath}`;

      for (const bp of finalBreakpoints) {
        try {
          // 1. Capture current screenshot
          const rawImageData = await captureScreenshot({
            url: fullUrl,
            width: bp.width,
            height: bp.height,
            waitTimeMs: project.settings.waitTimeMs,
            fullPage: project.settings.fullPage,
          });

          const targetFormat = project.settings?.imageFormat || 'webp';
          const targetQuality = project.settings?.imageQuality || 80;

          // 2. Compress and upload/store current screenshot
          const processedCurrent = await processRunImage(rawImageData, targetFormat, targetQuality);
          const currentImageUrl = await uploadRunImage({
            projectId: id,
            runId: targetRunId,
            filename: `${page.id}_${bp.id}_current.${targetFormat}`,
            buffer: processedCurrent.buffer,
            mimeType: processedCurrent.mimeType,
            settings: project.settings,
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
            imageData: currentImageUrl,
            capturedAt: new Date().toISOString(),
          };
          addScreenshot(screenshot);

          // 3. Compare against baseline if available
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
              const diffResult = await compareImagesAsync(
                baselineImage,
                rawImageData,
                {
                  threshold: project.settings.diffThreshold,
                }
              );

              const isIdentical = diffResult.isIdentical || diffResult.diffPercentage === 0;

              // Only compress and store diff image if there are actual visual changes
              let diffImageUrl: string | undefined;
              if (!isIdentical) {
                const processedDiff = await processRunImage(diffResult.diffImageBase64, targetFormat, targetQuality);
                diffImageUrl = await uploadRunImage({
                  projectId: id,
                  runId: targetRunId,
                  filename: `${page.id}_${bp.id}_diff.${targetFormat}`,
                  buffer: processedDiff.buffer,
                  mimeType: processedDiff.mimeType,
                  settings: project.settings,
                });
              }

              addComparison({
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
                currentImage: currentImageUrl,
                diffImage: diffImageUrl,
                diffPixelCount: diffResult.diffPixelCount,
                totalPixelCount: diffResult.totalPixelCount,
                diffPercentage: diffResult.diffPercentage,
                status: isIdentical ? 'identical' : 'changed',
              });
            } catch (diffErr: unknown) {
              const dErr = diffErr as Error;
              addComparison({
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
                currentImage: currentImageUrl,
                diffPixelCount: 0,
                totalPixelCount: bp.width * bp.height,
                diffPercentage: 0,
                status: 'error',
                errorMessage: `Diff comparison failed: ${dErr.message}`,
              });
            }
          } else {
            // No baseline yet; this is a new capture
            addComparison({
              id: `cmp_${screenshotId}`,
              pageId: page.id,
              pageName: page.name,
              pagePath: page.path,
              breakpointId: bp.id,
              breakpointName: bp.name,
              width: bp.width,
              height: bp.height,
              fullUrl,
              currentImage: currentImageUrl,
              diffPixelCount: 0,
              totalPixelCount: bp.width * bp.height,
              diffPercentage: 0,
              status: 'new',
            });
          }
        } catch (captureErr: unknown) {
          const cErr = captureErr as Error;
          console.error(`Failed to capture ${fullUrl} at ${bp.width}x${bp.height}:`, cErr);
          addComparison({
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

      // 4. Capture & compare component targets for this page (if configured)
      if (page.components && page.components.length > 0) {
        for (const comp of page.components) {
          for (const bp of finalBreakpoints) {
            try {
              const compStates = (comp.states && comp.states.length > 0)
                ? (comp.states as ('default' | 'hover' | 'active' | 'focus')[])
                : (['default'] as ('default' | 'hover' | 'active' | 'focus')[]);
              const stateCaptures = await captureMultipleComponentStates({
                url: fullUrl,
                width: bp.width,
                height: bp.height,
                selector: comp.selector,
                states: compStates,
                waitTimeMs: project.settings?.waitTimeMs,
              });

              for (const stateCap of stateCaptures) {
                const targetFormat = project.settings?.imageFormat || 'webp';
                const targetQuality = project.settings?.imageQuality || 80;

                const processedCap = await processRunImage(stateCap.imageData, targetFormat, targetQuality);
                const compImageUrl = await uploadRunImage({
                  projectId: id,
                  runId: targetRunId,
                  filename: `${page.id}_${comp.id}_${stateCap.state}_${bp.id}.${targetFormat}`,
                  buffer: processedCap.buffer,
                  mimeType: processedCap.mimeType,
                  settings: project.settings,
                });

                const compScId = `sc_${comp.id}_${stateCap.state}_${bp.id}_${Date.now()}`;
                addScreenshot({
                  id: compScId,
                  pageId: page.id,
                  pageName: page.name,
                  pagePath: page.path,
                  breakpointId: bp.id,
                  breakpointName: bp.name,
                  width: stateCap.width,
                  height: stateCap.height,
                  fullUrl,
                  isComponent: true,
                  componentId: comp.id,
                  componentName: comp.name,
                  componentState: stateCap.state,
                  imageData: compImageUrl,
                  capturedAt: new Date().toISOString(),
                });

                // Compare against baseline component check
                let baselineCompImage: string | undefined;
                if (baselineRun) {
                  const matchCompCmp = baselineRun.comparisons.find(
                    (c) =>
                      c.isComponent &&
                      (c.componentId === comp.id || c.componentName === comp.name) &&
                      c.componentState === stateCap.state &&
                      (c.breakpointId === bp.id || c.width === stateCap.width)
                  );
                  baselineCompImage = matchCompCmp?.currentImage || matchCompCmp?.baselineImage;
                }

                if (baselineCompImage) {
                  try {
                    const diffResult = await compareImagesAsync(
                      baselineCompImage,
                      stateCap.imageData,
                      { threshold: project.settings?.diffThreshold }
                    );

                    const isIdentical = diffResult.isIdentical || diffResult.diffPercentage === 0;

                    let diffImageUrl: string | undefined;
                    if (!isIdentical) {
                      const processedDiff = await processRunImage(diffResult.diffImageBase64, targetFormat, targetQuality);
                      diffImageUrl = await uploadRunImage({
                        projectId: id,
                        runId: targetRunId,
                        filename: `${page.id}_${comp.id}_${stateCap.state}_${bp.id}_diff.${targetFormat}`,
                        buffer: processedDiff.buffer,
                        mimeType: processedDiff.mimeType,
                        settings: project.settings,
                      });
                    }

                    addComparison({
                      id: `cmp_${compScId}`,
                      pageId: page.id,
                      pageName: page.name,
                      pagePath: page.path,
                      breakpointId: bp.id,
                      breakpointName: bp.name,
                      width: stateCap.width,
                      height: stateCap.height,
                      fullUrl,
                      isComponent: true,
                      componentId: comp.id,
                      componentName: comp.name,
                      componentState: stateCap.state,
                      baselineImage: baselineCompImage,
                      currentImage: compImageUrl,
                      diffImage: diffImageUrl,
                      diffPixelCount: diffResult.diffPixelCount,
                      totalPixelCount: diffResult.totalPixelCount,
                      diffPercentage: diffResult.diffPercentage,
                      status: isIdentical ? 'identical' : 'changed',
                    });
                  } catch (diffErr: unknown) {
                    const dErr = diffErr as Error;
                    addComparison({
                      id: `cmp_${compScId}`,
                      pageId: page.id,
                      pageName: page.name,
                      pagePath: page.path,
                      breakpointId: bp.id,
                      breakpointName: bp.name,
                      width: stateCap.width,
                      height: stateCap.height,
                      fullUrl,
                      isComponent: true,
                      componentId: comp.id,
                      componentName: comp.name,
                      componentState: stateCap.state,
                      baselineImage: baselineCompImage,
                      currentImage: compImageUrl,
                      diffPixelCount: 0,
                      totalPixelCount: stateCap.width * stateCap.height,
                      diffPercentage: 0,
                      status: 'error',
                      errorMessage: `Component diff comparison failed: ${dErr.message}`,
                    });
                  }
                } else {
                  // New component state check
                  addComparison({
                    id: `cmp_${compScId}`,
                    pageId: page.id,
                    pageName: page.name,
                    pagePath: page.path,
                    breakpointId: bp.id,
                    breakpointName: bp.name,
                    width: stateCap.width,
                    height: stateCap.height,
                    fullUrl,
                    isComponent: true,
                    componentId: comp.id,
                    componentName: comp.name,
                    componentState: stateCap.state,
                    currentImage: compImageUrl,
                    diffPixelCount: 0,
                    totalPixelCount: stateCap.width * stateCap.height,
                    diffPercentage: 0,
                    status: 'new',
                  });
                }
              }
            } catch (compErr: unknown) {
              const err = compErr as Error;
              console.warn(`Failed to capture component "${comp.name}" (${comp.selector}) at ${bp.name}:`, err.message);
              addComparison({
                id: `cmp_err_${comp.id}_${bp.id}_${Date.now()}_${Math.random().toString(36).substring(2, 5)}`,
                pageId: page.id,
                pageName: page.name,
                pagePath: page.path,
                breakpointId: bp.id,
                breakpointName: bp.name,
                width: bp.width,
                height: bp.height,
                fullUrl,
                isComponent: true,
                componentId: comp.id,
                componentName: comp.name,
                componentState: 'default',
                currentImage: '',
                diffPixelCount: 0,
                totalPixelCount: bp.width * bp.height,
                diffPercentage: 0,
                status: 'error',
                errorMessage: `Could not capture component on ${bp.name}: ${err.message}`,
              });
            }
          }
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
      createdAt: existingRun?.createdAt || new Date().toISOString(),
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
