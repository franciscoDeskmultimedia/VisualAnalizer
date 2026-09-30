import sharp from 'sharp';

/**
 * Strips base64 data URI prefix and returns a Buffer
 */
export function extractBufferFromInput(input: string | Buffer): Buffer {
  if (Buffer.isBuffer(input)) {
    return input;
  }
  const cleanBase64 = input.replace(/^data:image\/[a-zA-Z0-9+.-]+;base64,/, '');
  return Buffer.from(cleanBase64, 'base64');
}

/**
 * Formats a raw image buffer into a base64 data URI
 */
export function bufferToDataUri(buffer: Buffer, mimeType: string = 'image/webp'): string {
  return `data:${mimeType};base64,${buffer.toString('base64')}`;
}

/**
 * Compresses an image buffer (PNG, JPEG, or WebP) to WebP format using Sharp.
 * Typically yields 75% - 85% compression vs lossless PNG while preserving pixel accuracy.
 */
export async function compressToWebp(
  input: Buffer | string,
  quality: number = 80
): Promise<{ buffer: Buffer; dataUri: string; sizeBytes: number }> {
  const sourceBuffer = extractBufferFromInput(input);

  const webpBuffer = await sharp(sourceBuffer)
    .webp({
      quality: Math.max(50, Math.min(100, quality)),
      effort: 4, // Balanced speed vs compression effort
      lossless: false,
    })
    .toBuffer();

  return {
    buffer: webpBuffer,
    dataUri: bufferToDataUri(webpBuffer, 'image/webp'),
    sizeBytes: webpBuffer.length,
  };
}

/**
 * Compresses or formats an image according to project settings (WebP or PNG).
 */
export async function processRunImage(
  input: Buffer | string,
  format: 'webp' | 'png' = 'webp',
  quality: number = 80
): Promise<{ buffer: Buffer; dataUri: string; mimeType: string; sizeBytes: number }> {
  const sourceBuffer = extractBufferFromInput(input);

  if (format === 'webp') {
    const res = await compressToWebp(sourceBuffer, quality);
    return {
      buffer: res.buffer,
      dataUri: res.dataUri,
      mimeType: 'image/webp',
      sizeBytes: res.sizeBytes,
    };
  }

  // PNG lossless
  const pngBuffer = await sharp(sourceBuffer).png({ compressionLevel: 8 }).toBuffer();
  return {
    buffer: pngBuffer,
    dataUri: bufferToDataUri(pngBuffer, 'image/png'),
    mimeType: 'image/png',
    sizeBytes: pngBuffer.length,
  };
}
