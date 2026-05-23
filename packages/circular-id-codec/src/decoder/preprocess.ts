export interface GrayImage {
  data: Uint8Array;   // one luminance value per pixel
  width: number;
  height: number;
}

/**
 * Converts a flat RGBA Uint8ClampedArray to a grayscale GrayImage.
 */
export function toGrayscale(rgba: Uint8ClampedArray, width: number, height: number): GrayImage {
  const pixelCount = width * height;
  const grayData = new Uint8Array(pixelCount);

  for (let i = 0; i < pixelCount; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    // Luminance formula
    grayData[i] = Math.round(0.299 * r + 0.587 * g + 0.114 * b);
  }

  return {
    data: grayData,
    width,
    height
  };
}

/**
 * Implements Otsu's binarization threshold selection.
 */
export function computeOtsuThreshold(gray: GrayImage): number {
  const data = gray.data;
  const total = data.length;

  // Build histogram
  const histogram = new Int32Array(256);
  for (let i = 0; i < total; i++) {
    histogram[data[i]]++;
  }

  // Compute sum of all (v * count[v])
  let sum = 0;
  for (let v = 0; v < 256; v++) {
    sum += v * histogram[v];
  }

  let sumB = 0;
  let wB = 0;
  let wF = 0;

  let maxVariance = 0;
  let threshold = 128; // fallback for uniform image

  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;

    wF = total - wB;
    if (wF === 0) break;

    sumB += t * histogram[t];

    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;

    // Between-class variance
    const variance = wB * wF * (mB - mF) * (mB - mF);

    if (variance > maxVariance) {
      maxVariance = variance;
      threshold = t;
    }
  }

  return threshold;
}

/**
 * Binarizes a grayscale image based on a threshold.
 * 1 represents dark pixels (foreground, code markings), 0 represents light pixels (background).
 */
export function binarise(gray: GrayImage, threshold: number): Uint8Array {
  const data = gray.data;
  const length = data.length;
  const binary = new Uint8Array(length);

  for (let i = 0; i < length; i++) {
    binary[i] = data[i] < threshold ? 1 : 0;
  }

  return binary;
}

export interface PreprocessResult {
  binary: Uint8Array;
  threshold: number;
  width: number;
  height: number;
}

/**
 * Complete preprocessing pipeline.
 */
export function preprocess(rgba: Uint8ClampedArray, width: number, height: number): PreprocessResult {
  const gray = toGrayscale(rgba, width, height);
  const threshold = computeOtsuThreshold(gray);
  const binary = binarise(gray, threshold);

  return {
    binary,
    threshold,
    width,
    height
  };
}
