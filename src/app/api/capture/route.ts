import { NextResponse } from 'next/server';
import { captureScreenshot } from '@/lib/screenshot';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { url, width = 1440, height = 900, waitTimeMs = 1000, fullPage = false } = body;

    if (!url) {
      return NextResponse.json({ success: false, error: 'URL is required' }, { status: 400 });
    }

    const imageData = await captureScreenshot({
      url,
      width: Number(width),
      height: Number(height),
      waitTimeMs: Number(waitTimeMs),
      fullPage: Boolean(fullPage),
    });

    return NextResponse.json({ success: true, imageData });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
