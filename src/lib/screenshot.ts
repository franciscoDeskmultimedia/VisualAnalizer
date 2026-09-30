import fs from 'fs';
import puppeteer, { Browser } from 'puppeteer-core';
import chromium from '@sparticuz/chromium';

export interface CaptureOptions {
  url: string;
  width: number;
  height: number;
  waitTimeMs?: number;
  fullPage?: boolean;
}

/**
 * Finds local Chrome/Chromium installation on developer machines
 */
function getLocalChromePath(): string | null {
  const possiblePaths = [
    // macOS
    '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    '/Applications/Chromium.app/Contents/MacOS/Chromium',
    '/Applications/Brave Browser.app/Contents/MacOS/Brave Browser',
    '/Applications/Microsoft Edge.app/Contents/MacOS/Microsoft Edge',
    // Linux
    '/usr/bin/google-chrome',
    '/usr/bin/google-chrome-stable',
    '/usr/bin/chromium',
    '/usr/bin/chromium-browser',
    // Windows
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  ];

  for (const path of possiblePaths) {
    if (fs.existsSync(/*turbopackIgnore: true*/ path)) {
      return path;
    }
  }

  return null;
}

/**
 * Fallback to external high-fidelity screenshot service (Microlink API)
 * Zero API keys required; perfect for serverless fallback on Vercel.
 */
async function captureWithExternalService(options: CaptureOptions): Promise<string> {
  const { url, width, height, waitTimeMs = 1000 } = options;
  const targetUrl = encodeURIComponent(url);

  // Microlink screenshot endpoint returns JSON containing the screenshot URL
  const fullPageParam = options.fullPage !== false ? '&screenshot.fullPage=true' : '';
  const apiUrl = `https://api.microlink.io?url=${targetUrl}&screenshot=true${fullPageParam}&meta=false&viewport.width=${width}&viewport.height=${height}&viewport.deviceScaleFactor=1&waitForTimeout=${waitTimeMs}`;

  const res = await fetch(apiUrl, {
    headers: { 'User-Agent': 'VisualAnalizar/1.0' },
  });

  if (!res.ok) {
    throw new Error(`External screenshot service returned status ${res.status}`);
  }

  const json = await res.json();
  const screenshotUrl = json.data?.screenshot?.url;
  if (!screenshotUrl) {
    throw new Error('Screenshot URL was not returned by service');
  }

  // Fetch the actual image buffer and return as base64 data URI
  const imageRes = await fetch(screenshotUrl);
  const arrayBuffer = await imageRes.arrayBuffer();
  const base64 = Buffer.from(arrayBuffer).toString('base64');
  return `data:image/png;base64,${base64}`;
}

/**
 * Launches Puppeteer either using @sparticuz/chromium (Vercel / Lambda)
 * or local Chrome executable (Mac / Linux / Windows).
 */
async function launchBrowser(): Promise<Browser> {
  const isVercelOrLambda = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;

  if (isVercelOrLambda) {
    return puppeteer.launch({
      args: [...chromium.args, '--no-sandbox', '--disable-setuid-sandbox', '--hide-scrollbars'],
      executablePath: await chromium.executablePath(),
      headless: true,
    });
  }

  const localPath = getLocalChromePath();
  if (localPath) {
    return puppeteer.launch({
      executablePath: localPath,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--hide-scrollbars',
      ],
    });
  }

  // If no local Chrome found, throw so fallback service is triggered
  throw new Error('No local Chrome executable found on host system.');
}

/**
 * Auto-scroll down the page to trigger all lazy-loaded images,
 * dynamic hydration, and below-the-fold content before taking full screenshot.
 */
async function autoScrollToBottom(page: any): Promise<void> {
  await page.evaluate(async () => {
    await new Promise<void>((resolve) => {
      let totalHeight = 0;
      const distance = 400;
      const timer = setInterval(() => {
        const scrollHeight = document.documentElement.scrollHeight || document.body.scrollHeight;
        window.scrollBy(0, distance);
        totalHeight += distance;

        if (totalHeight >= scrollHeight || totalHeight > 18000) {
          clearInterval(timer);
          window.scrollTo(0, 0); // Return back to top of document
          setTimeout(resolve, 400); // Allow sticky and relative elements to reset
        }
      }, 70);
    });
  });
}

/**
 * Takes a screenshot of a given URL with specified dimensions.
 * Gracefully falls back to external service if Puppeteer is unable to launch.
 */
export async function captureScreenshot(options: CaptureOptions): Promise<string> {
  const { url, width, height, waitTimeMs = 1200, fullPage = true } = options;

  let browser: Browser | null = null;
  try {
    browser = await launchBrowser();
    const page = await browser.newPage();

    await page.setViewport({
      width,
      height,
      deviceScaleFactor: 1,
    });

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Suppress scrollbars to ensure exactly identical layout width across all captures
    await page.addStyleTag({
      content: `
        ::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
        html, body { scrollbar-width: none !important; -ms-overflow-style: none !important; }
      `
    }).catch(() => {});

    if (fullPage) {
      // Auto-scroll to trigger lazy loading of under-the-fold images and sections
      await autoScrollToBottom(page);
    }

    if (waitTimeMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTimeMs));
    }

    const screenshotBuffer = await page.screenshot({
      type: 'png',
      fullPage: Boolean(fullPage),
    });

    const base64 = Buffer.from(screenshotBuffer).toString('base64');
    return `data:image/png;base64,${base64}`;
  } catch (err: unknown) {
    const error = err as Error;
    console.warn(`[VisualAnalizar] Puppeteer capture failed or not available (${error.message}). Attempting external service fallback...`);
    try {
      return await captureWithExternalService(options);
    } catch (fallbackError: unknown) {
      const fbErr = fallbackError as Error;
      throw new Error(`Failed to capture screenshot with both Puppeteer and fallback service: ${error.message} | ${fbErr.message}`);
    }
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeErr) {
        console.error('Error closing browser:', closeErr);
      }
    }
  }
}

export interface CaptureComponentOptions {
  url: string;
  width: number;
  height: number;
  selector: string;
  state?: 'default' | 'hover' | 'active' | 'focus';
  waitTimeMs?: number;
}

export interface ComponentCaptureResult {
  state: 'default' | 'hover' | 'active' | 'focus';
  imageData: string; // base64 PNG data URI
  width: number;
  height: number;
}

/**
 * Captures one or multiple interactive states of a specific DOM component
 * in a single browser session for maximum speed.
 */
export async function captureMultipleComponentStates(options: {
  url: string;
  width: number;
  height: number;
  selector: string;
  states: ('default' | 'hover' | 'active' | 'focus')[];
  waitTimeMs?: number;
}): Promise<ComponentCaptureResult[]> {
  const { url, width, height, selector, states, waitTimeMs = 1200 } = options;
  if (!states || states.length === 0) return [];

  let browser: Browser | null = null;
  const results: ComponentCaptureResult[] = [];

  try {
    browser = await launchBrowser();
    const page = await browser.newPage();

    await page.setViewport({
      width,
      height,
      deviceScaleFactor: 1,
    });

    await page.goto(url, {
      waitUntil: 'networkidle2',
      timeout: 30000,
    });

    // Suppress scrollbars
    await page.addStyleTag({
      content: `
        ::-webkit-scrollbar { display: none !important; width: 0 !important; height: 0 !important; }
        html, body { scrollbar-width: none !important; -ms-overflow-style: none !important; }
      `
    }).catch(() => {});

    if (waitTimeMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTimeMs));
    }

    // Wait for the target element to be present in DOM
    await page.waitForSelector(selector, { timeout: 10000 });
    const element = await page.$(selector);
    if (!element) {
      throw new Error(`Target component element "${selector}" was not found on page ${url}`);
    }

    // Scroll element into view smoothly
    await element.evaluate((el: any) => {
      el.scrollIntoView({ block: 'center', inline: 'center', behavior: 'instant' });
    }).catch(() => {});

    // Ensure transitions and reflow have stabilized
    await new Promise((resolve) => setTimeout(resolve, 300));

    // Get element dimensions
    const box = await element.boundingBox();
    const elWidth = box ? Math.round(box.width) : width;
    const elHeight = box ? Math.round(box.height) : height;

    for (const st of states) {
      try {
        if (st === 'default') {
          // Move mouse away to ensure no hover pseudo-classes linger
          await page.mouse.move(0, 0);
          await new Promise((r) => setTimeout(r, 100));

          const buf = await element.screenshot({ type: 'png' });
          results.push({
            state: 'default',
            imageData: `data:image/png;base64,${Buffer.from(buf).toString('base64')}`,
            width: elWidth,
            height: elHeight,
          });
        } else if (st === 'hover') {
          await page.hover(selector);
          await new Promise((r) => setTimeout(r, 200)); // wait for hover transition / tooltip

          const buf = await element.screenshot({ type: 'png' });
          results.push({
            state: 'hover',
            imageData: `data:image/png;base64,${Buffer.from(buf).toString('base64')}`,
            width: elWidth,
            height: elHeight,
          });

          // Reset mouse position
          await page.mouse.move(0, 0);
          await new Promise((r) => setTimeout(r, 100));
        } else if (st === 'focus') {
          await page.focus(selector);
          await new Promise((r) => setTimeout(r, 150));

          const buf = await element.screenshot({ type: 'png' });
          results.push({
            state: 'focus',
            imageData: `data:image/png;base64,${Buffer.from(buf).toString('base64')}`,
            width: elWidth,
            height: elHeight,
          });
        } else if (st === 'active') {
          const freshBox = await element.boundingBox();
          if (freshBox) {
            await page.mouse.move(freshBox.x + freshBox.width / 2, freshBox.y + freshBox.height / 2);
            await page.mouse.down();
            await new Promise((r) => setTimeout(r, 150));

            const buf = await element.screenshot({ type: 'png' });
            results.push({
              state: 'active',
              imageData: `data:image/png;base64,${Buffer.from(buf).toString('base64')}`,
              width: elWidth,
              height: elHeight,
            });

            await page.mouse.up();
            await page.mouse.move(0, 0);
          }
        }
      } catch (stErr) {
        console.error(`Error capturing state "${st}" for component "${selector}":`, stErr);
      }
    }

    return results;
  } finally {
    if (browser) {
      try {
        await browser.close();
      } catch (closeErr) {
        console.error('Error closing browser:', closeErr);
      }
    }
  }
}

/**
 * Captures a single interactive state of a component (convenience wrapper)
 */
export async function captureComponentState(options: CaptureComponentOptions): Promise<ComponentCaptureResult> {
  const state = options.state || 'default';
  const results = await captureMultipleComponentStates({
    url: options.url,
    width: options.width,
    height: options.height,
    selector: options.selector,
    states: [state],
    waitTimeMs: options.waitTimeMs,
  });

  if (results.length === 0) {
    throw new Error(`Failed to capture state "${state}" for element "${options.selector}"`);
  }

  return results[0];
}
