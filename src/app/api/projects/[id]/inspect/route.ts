import { NextResponse } from 'next/server';
import { captureComponentState } from '@/lib/screenshot';

export const dynamic = 'force-dynamic';

/**
 * Generates the client-side JavaScript injected into the inspected page
 * to provide a point-and-click element inspector with floating tooltip.
 */
function getInspectorScript(targetUrl: string): string {
  return `
<script>
(function() {
  if (window.__VA_INSPECTOR_ACTIVE__) return;
  window.__VA_INSPECTOR_ACTIVE__ = true;

  // Create highlight overlay and tooltip
  const overlay = document.createElement('div');
  overlay.id = 'va-inspector-overlay';
  overlay.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;border:2px solid #6366f1;background:rgba(99,102,241,0.15);border-radius:4px;transition:all 0.08s ease-out;display:none;';
  
  const tooltip = document.createElement('div');
  tooltip.id = 'va-inspector-tooltip';
  tooltip.style.cssText = 'position:fixed;pointer-events:none;z-index:2147483647;background:#0f172a;color:#f8fafc;padding:4px 8px;border-radius:6px;font-size:11px;font-family:monospace;font-weight:600;box-shadow:0 4px 12px rgba(0,0,0,0.4);border:1px solid #334155;display:none;white-space:nowrap;';

  document.documentElement.appendChild(overlay);
  document.documentElement.appendChild(tooltip);

  let currentTarget = null;

  // Computes a clean, human-readable and resilient CSS selector
  function getOptimalSelector(el) {
    if (!el || el === document.body || el === document.documentElement) return 'body';

    // 1. If element has an id
    if (el.id && !el.id.match(/^va-inspector/) && !el.id.match(/^[0-9]/)) {
      return '#' + CSS.escape(el.id);
    }

    // 2. If element has meaningful classes
    const tag = el.tagName.toLowerCase();
    const validClasses = Array.from(el.classList).filter(c => 
      !c.startsWith('va-') && !c.includes(':') && !c.includes('/') && !c.includes('[')
    );

    if (validClasses.length > 0) {
      const classSelector = tag + '.' + validClasses.slice(0, 2).map(c => CSS.escape(c)).join('.');
      if (document.querySelectorAll(classSelector).length === 1) {
        return classSelector;
      }
    }

    // 3. Walk up the DOM tree to construct hierarchy
    const path = [];
    let current = el;
    while (current && current.nodeType === Node.ELEMENT_NODE && current !== document.body && path.length < 4) {
      let segment = current.tagName.toLowerCase();
      if (current.id && !current.id.match(/^[0-9]/)) {
        segment += '#' + CSS.escape(current.id);
        path.unshift(segment);
        break;
      } else {
        const classes = Array.from(current.classList)
          .filter(c => !c.startsWith('va-') && !c.includes(':') && !c.includes('/') && !c.includes('['))
          .slice(0, 1);
        if (classes.length > 0) {
          segment += '.' + CSS.escape(classes[0]);
        }
      }
      path.unshift(segment);
      current = current.parentElement;
    }

    return path.join(' > ');
  }

  function getElementLabel(el) {
    const tag = el.tagName.toLowerCase();
    let text = (el.innerText || el.textContent || '').trim().replace(/\\s+/g, ' ');
    if (text.length > 25) text = text.substring(0, 22) + '...';
    
    if (text) {
      const cleanTag = tag.charAt(0).toUpperCase() + tag.slice(1);
      return cleanTag + ': ' + text;
    }
    return tag.toUpperCase() + ' component';
  }

  // Hover tracking
  document.addEventListener('mouseover', function(e) {
    const target = e.target;
    if (!target || target === overlay || target === tooltip || target === document.documentElement || target === document.body) {
      return;
    }

    currentTarget = target;
    const rect = target.getBoundingClientRect();

    overlay.style.display = 'block';
    overlay.style.top = rect.top + 'px';
    overlay.style.left = rect.left + 'px';
    overlay.style.width = rect.width + 'px';
    overlay.style.height = rect.height + 'px';

    const selector = getOptimalSelector(target);
    tooltip.textContent = selector;
    tooltip.style.display = 'block';

    let tooltipTop = rect.top - 28;
    if (tooltipTop < 4) tooltipTop = rect.bottom + 6;
    let tooltipLeft = Math.max(8, rect.left);
    
    tooltip.style.top = tooltipTop + 'px';
    tooltip.style.left = tooltipLeft + 'px';
  }, true);

  document.addEventListener('mouseleave', function() {
    overlay.style.display = 'none';
    tooltip.style.display = 'none';
  }, true);

  // Click interceptor
  document.addEventListener('click', function(e) {
    e.preventDefault();
    e.stopPropagation();

    if (!currentTarget) return;

    const selector = getOptimalSelector(currentTarget);
    const label = getElementLabel(currentTarget);
    const rect = currentTarget.getBoundingClientRect();

    // Pulse effect
    overlay.style.background = 'rgba(99,102,241,0.5)';
    setTimeout(() => {
      overlay.style.background = 'rgba(99,102,241,0.15)';
    }, 200);

    // Send payload to parent container
    window.parent.postMessage({
      type: 'VISUAL_ANALIZAR_ELEMENT_PICKED',
      selector: selector,
      name: label,
      width: Math.round(rect.width),
      height: Math.round(rect.height),
      tagName: currentTarget.tagName.toLowerCase(),
    }, '*');
  }, true);

  console.log('[VisualAnalizar] Interactive element picker initialized.');
})();
</script>
`;
}

/**
 * GET: Serves the proxied webpage with injected interactive inspector
 */
export async function GET(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await props.params;
    const url = new URL(request.url);
    const targetUrl = url.searchParams.get('url');

    if (!targetUrl) {
      return new NextResponse('Missing target URL query parameter', { status: 400 });
    }

    let parsedUrl: URL;
    try {
      parsedUrl = new URL(targetUrl);
    } catch {
      return new NextResponse('Invalid URL provided', { status: 400 });
    }

    const res = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 VisualAnalizar/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      },
    });

    if (!res.ok) {
      return new NextResponse(
        `Failed to fetch target URL: ${res.status} ${res.statusText}`,
        { status: res.status }
      );
    }

    let html = await res.text();

    // Strip frame-ancestors and CSP metas
    html = html.replace(/<meta[^>]*http-equiv=["']?Content-Security-Policy["']?[^>]*>/gi, '');
    html = html.replace(/<meta[^>]*http-equiv=["']?X-Frame-Options["']?[^>]*>/gi, '');

    // Invert base tag or add base tag so relative paths work
    const baseTag = `<base href="${parsedUrl.origin}${parsedUrl.pathname}">`;
    const inspectorScript = getInspectorScript(targetUrl);

    if (html.includes('<head>')) {
      html = html.replace('<head>', `<head>${baseTag}${inspectorScript}`);
    } else if (html.includes('<head ')) {
      html = html.replace(/<head\b[^>]*>/, `$&${baseTag}${inspectorScript}`);
    } else {
      html = baseTag + inspectorScript + html;
    }

    return new NextResponse(html, {
      status: 200,
      headers: {
        'Content-Type': 'text/html; charset=utf-8',
        'X-Frame-Options': 'ALLOWALL',
        'Access-Control-Allow-Origin': '*',
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    return new NextResponse(`Error proxying page: ${err.message}`, { status: 500 });
  }
}

/**
 * POST: Captures a quick preview of an element selector using Puppeteer
 */
export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await props.params;
    const body = await request.json().catch(() => ({}));
    const { url, selector, width = 1280, height = 800 } = body;

    if (!url || !selector) {
      return NextResponse.json(
        { success: false, error: 'Both url and selector are required in request body.' },
        { status: 400 }
      );
    }

    const capture = await captureComponentState({
      url,
      width,
      height,
      selector,
      state: 'default',
      waitTimeMs: 800,
    });

    return NextResponse.json({
      success: true,
      imageData: capture.imageData,
      width: capture.width,
      height: capture.height,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || 'Failed to capture component preview.' },
      { status: 500 }
    );
  }
}
