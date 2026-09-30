import { NextResponse } from 'next/server';
import { testS3Connection } from '@/lib/storage-provider';
import { S3StorageConfig } from '@/types';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  props: { params: Promise<{ id: string }> }
) {
  try {
    await props.params; // Ensure params are awaited according to Next.js 15+ convention
    const body = await request.json().catch(() => ({}));
    const s3Config = body.s3Config as S3StorageConfig | undefined;

    if (!s3Config) {
      return NextResponse.json(
        { success: false, error: 'Missing storage configuration parameters in request body.' },
        { status: 400 }
      );
    }

    const testResult = await testS3Connection(s3Config);

    if (!testResult.success) {
      return NextResponse.json(
        { success: false, error: testResult.error },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: testResult.message,
    });
  } catch (error: unknown) {
    const err = error as Error;
    return NextResponse.json(
      { success: false, error: err.message || 'An unexpected error occurred while testing the storage connection.' },
      { status: 500 }
    );
  }
}
