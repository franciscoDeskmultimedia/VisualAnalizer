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
