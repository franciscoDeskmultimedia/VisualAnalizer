import { PNG } from 'pngjs';
import pixelmatch from 'pixelmatch';

export interface DiffResult {
  diffImageBase64: string;
  diffPixelCount: number;
  totalPixelCount: number;
  diffPercentage: number;
  isIdentical: boolean;
}

/**
 * Strips base64 data URI prefix and converts to Buffer
 */
export function base64ToBuffer(base64Data: string): Buffer {
  const cleanBase64 = base64Data.replace(/^data:image\/\w+;base64,/, '');
  return Buffer.from(cleanBase64, 'base64');
}

/**
 * Converts a buffer into a base64 PNG data URI
 */
export function bufferToBase64Png(buffer: Buffer): string {
  return `data:image/png;base64,${buffer.toString('base64')}`;
}

/**
 * Resize / pad an image to a target width and height if they differ
 */
function padImageToDimensions(img: PNG, targetWidth: number, targetHeight: number): PNG {
  if (img.width === targetWidth && img.height === targetHeight) {
    return img;
  }

  const padded = new PNG({ width: targetWidth, height: targetHeight });
  // Fill with white or transparent
  padded.data.fill(0);

  // Copy rows
  for (let y = 0; y < img.height; y++) {
    for (let x = 0; x < img.width; x++) {
      const srcIdx = (y * img.width + x) * 4;
      const targetIdx = (y * targetWidth + x) * 4;
      padded.data[targetIdx] = img.data[srcIdx];
      padded.data[targetIdx + 1] = img.data[srcIdx + 1];
      padded.data[targetIdx + 2] = img.data[srcIdx + 2];
      padded.data[targetIdx + 3] = img.data[srcIdx + 3];
    }
  }

  return padded;
}

/**
 * Compares two PNG images (as buffers or base64) and produces a visual diff
 */
export function compareImages(
  img1Input: Buffer | string,
  img2Input: Buffer | string,
  options?: {
    threshold?: number;
    diffColorRgb?: [number, number, number];
  }
): DiffResult {
  const buf1 = typeof img1Input === 'string' ? base64ToBuffer(img1Input) : img1Input;
  const buf2 = typeof img2Input === 'string' ? base64ToBuffer(img2Input) : img2Input;

  let img1: PNG = PNG.sync.read(buf1);
  let img2: PNG = PNG.sync.read(buf2);

  const maxWidth = Math.max(img1.width, img2.width);
  const maxHeight = Math.max(img1.height, img2.height);

  if (img1.width !== maxWidth || img1.height !== maxHeight) {
    img1 = padImageToDimensions(img1, maxWidth, maxHeight);
  }
  if (img2.width !== maxWidth || img2.height !== maxHeight) {
    img2 = padImageToDimensions(img2, maxWidth, maxHeight);
  }

  const diffPng = new PNG({ width: maxWidth, height: maxHeight });
  const threshold = options?.threshold ?? 0.1;
  const diffColor: [number, number, number] = options?.diffColorRgb ?? [239, 68, 68]; // default #ef4444 red

  const diffPixels = pixelmatch(
    img1.data,
    img2.data,
    diffPng.data,
    maxWidth,
    maxHeight,
    {
      threshold,
      diffColor,
      alpha: 0.8,
      includeAA: false,
    }
  );

  const totalPixels = maxWidth * maxHeight;
  const diffPercentage = totalPixels > 0 ? (diffPixels / totalPixels) * 100 : 0;
  const diffBuffer = PNG.sync.write(diffPng);

  return {
    diffImageBase64: bufferToBase64Png(diffBuffer),
    diffPixelCount: diffPixels,
    totalPixelCount: totalPixels,
    diffPercentage: Number(diffPercentage.toFixed(2)),
    isIdentical: diffPixels === 0,
  };
}
