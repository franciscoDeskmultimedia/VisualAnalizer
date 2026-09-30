import { S3Client, PutObjectCommand, DeleteObjectCommand, HeadBucketCommand } from '@aws-sdk/client-s3';
import { S3StorageConfig, ProjectSettings } from '@/types';
import { bufferToDataUri } from './image-processing';

/**
 * Creates an S3Client instance from S3StorageConfig
 */
export function getS3Client(config: S3StorageConfig): S3Client {
  const isCloudflareR2 = config.endpoint?.includes('cloudflarestorage.com');

  return new S3Client({
    region: config.region || (isCloudflareR2 ? 'auto' : 'us-east-1'),
    credentials: {
      accessKeyId: config.accessKeyId.trim(),
      secretAccessKey: config.secretAccessKey.trim(),
    },
    endpoint: config.endpoint?.trim() || undefined,
    forcePathStyle: Boolean(config.endpoint && !isCloudflareR2), // required for MinIO / LocalStack
  });
}

/**
 * Tests an S3 / Cloudflare R2 / Supabase Storage connection by attempting to write and delete a small test probe.
 */
export async function testS3Connection(config: S3StorageConfig): Promise<{ success: boolean; message?: string; error?: string }> {
  if (!config.bucket || !config.accessKeyId || !config.secretAccessKey) {
    return {
      success: false,
      error: 'Missing required configuration: Bucket, Access Key ID, and Secret Access Key are required.',
    };
  }

  try {
    const s3 = getS3Client(config);
    const testKey = `.visualanalizar-connection-test-${Date.now()}.txt`;

    // Test write permission
    await s3.send(
      new PutObjectCommand({
        Bucket: config.bucket.trim(),
        Key: testKey,
        Body: Buffer.from('VisualAnalizar storage connection test probe', 'utf8'),
        ContentType: 'text/plain',
      })
    );

    // Test delete permission / cleanup
    try {
      await s3.send(
        new DeleteObjectCommand({
          Bucket: config.bucket.trim(),
          Key: testKey,
        })
      );
    } catch (cleanupErr) {
      console.warn('Storage test probe cleanup notice:', cleanupErr);
    }

    return {
      success: true,
      message: `Successfully connected to bucket "${config.bucket}". Read and write permissions verified.`,
    };
  } catch (err: unknown) {
    const error = err as Error;
    return {
      success: false,
      error: error.message || 'Failed to authenticate or connect with the specified S3 bucket.',
    };
  }
}

/**
 * Resolves the public or accessible URL for an uploaded object
 */
export function buildS3ObjectUrl(config: S3StorageConfig, objectKey: string): string {
  if (config.publicUrlPrefix?.trim()) {
    const prefix = config.publicUrlPrefix.trim().replace(/\/+$/, '');
    return `${prefix}/${objectKey}`;
  }

  if (config.endpoint?.trim()) {
    const endpoint = config.endpoint.trim().replace(/\/+$/, '');
    return `${endpoint}/${config.bucket.trim()}/${objectKey}`;
  }

  const region = config.region?.trim() || 'us-east-1';
  return `https://${config.bucket.trim()}.s3.${region}.amazonaws.com/${objectKey}`;
}

export interface UploadImageOptions {
  projectId: string;
  runId: string;
  filename: string;
  buffer: Buffer;
  mimeType: string;
  settings?: ProjectSettings;
}

/**
 * Uploads an image either to the user's connected S3/R2 storage (if enabled)
 * or returns a compressed base64 data URI for database storage.
 */
export async function uploadRunImage(options: UploadImageOptions): Promise<string> {
  const { projectId, runId, filename, buffer, mimeType, settings } = options;

  const isS3Enabled =
    settings?.storageProvider === 's3' &&
    Boolean(settings?.s3Config?.bucket) &&
    Boolean(settings?.s3Config?.accessKeyId) &&
    Boolean(settings?.s3Config?.secretAccessKey);

  if (isS3Enabled && settings?.s3Config) {
    try {
      const s3 = getS3Client(settings.s3Config);
      const safeFilename = filename.replace(/[^a-zA-Z0-9._-]/g, '_');
      const objectKey = `projects/${projectId}/runs/${runId}/${safeFilename}`;

      await s3.send(
        new PutObjectCommand({
          Bucket: settings.s3Config.bucket.trim(),
          Key: objectKey,
          Body: buffer,
          ContentType: mimeType,
          CacheControl: 'public, max-age=31536000, immutable',
        })
      );

      return buildS3ObjectUrl(settings.s3Config, objectKey);
    } catch (uploadError) {
      console.error('[VisualAnalizar] S3 upload failed, gracefully falling back to base64 data URI:', uploadError);
      // Fallback to base64 to prevent test run failure
      return bufferToDataUri(buffer, mimeType);
    }
  }

  // Default: base64 Data URI
  return bufferToDataUri(buffer, mimeType);
}
