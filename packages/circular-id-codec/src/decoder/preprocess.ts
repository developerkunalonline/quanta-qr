export interface GrayImage {
  data: Uint8Array;
  width: number;
  height: number;
}

export interface PreprocessResult {
  binary: Uint8Array;
  threshold: number;
  width: number;
  height: number;
  sharpness: number;
}

export function toGrayscale(rgba: Uint8ClampedArray, width: number, height: number): GrayImage {
  const pixelCount = width * height;
  const grayData = new Uint8Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    grayData[i] = (77 * r + 150 * g + 29 * b) >> 8;
  }
  return { data: grayData, width, height };
}

/**
 * Estimates the sharpness of a grayscale image using a 3x3 Laplacian filter kernel.
 * Calculates the variance of the Laplacian values.
 * Blurry/out-of-focus images yield a very low variance (< 3.0), allowing us to skip them entirely.
 */
export function estimateSharpness(gray: GrayImage): number {
  const { data, width, height } = gray;
  const n = (width - 2) * (height - 2);
  if (n <= 0) return 0;

  const gradients = new Float32Array(n);
  let gIdx = 0;
  let gradSum = 0;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x;
      // Laplacian 3x3 filter
      const val = data[idx] * -4 +
                  data[idx - 1] +
                  data[idx + 1] +
                  data[idx - width] +
                  data[idx + width];
      gradients[gIdx++] = val;
      gradSum += val;
    }
  }

  const mean = gradSum / n;
  let varianceSum = 0;
  for (let i = 0; i < n; i++) {
    const diff = gradients[i] - mean;
    varianceSum += diff * diff;
  }

  return varianceSum / n;
}

export function computeOtsuThreshold(gray: GrayImage): number {
  const data = gray.data;
  const total = data.length;
  const histogram = new Int32Array(256);
  for (let i = 0; i < total; i++) histogram[data[i]]++;

  let sum = 0;
  for (let v = 0; v < 256; v++) sum += v * histogram[v];

  let sumB = 0, wB = 0, maxVariance = 0, threshold = 128;
  for (let t = 0; t < 256; t++) {
    wB += histogram[t];
    if (wB === 0) continue;
    const wF = total - wB;
    if (wF === 0) break;
    sumB += t * histogram[t];
    const mB = sumB / wB;
    const mF = (sum - sumB) / wF;
    const variance = wB * wF * (mB - mF) * (mB - mF);
    if (variance > maxVariance) { maxVariance = variance; threshold = t; }
  }
  return threshold;
}

export function binarise(gray: GrayImage, threshold: number): Uint8Array {
  const data = gray.data;
  const binary = new Uint8Array(data.length);
  for (let i = 0; i < data.length; i++) {
    binary[i] = data[i] < threshold ? 1 : 0;
  }
  return binary;
}

/**
 * Fast adaptive binarization using an integral image (summed area table).
 * Total complexity is O(n) — suitable for real-time video processing.
 * Each pixel is thresholded against the mean of its local neighbourhood,
 * which handles uneven lighting and shadows perfectly.
 */
export function adaptiveBinarise(gray: GrayImage, blockRadius: number = 20, bias: number = 8): Uint8Array {
  const { data, width, height } = gray;
  const n = width * height;

  // Build integral image (summed area table) — O(n)
  const integral = new Float64Array(n);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = y * width + x;
      const above = y > 0 ? integral[(y - 1) * width + x] : 0;
      const left = x > 0 ? integral[y * width + (x - 1)] : 0;
      const aboveLeft = (y > 0 && x > 0) ? integral[(y - 1) * width + (x - 1)] : 0;
      integral[idx] = data[idx] + above + left - aboveLeft;
    }
  }

  // Threshold each pixel against its local block mean — O(n)
  const binary = new Uint8Array(n);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const x0 = Math.max(0, x - blockRadius);
      const y0 = Math.max(0, y - blockRadius);
      const x1 = Math.min(width - 1, x + blockRadius);
      const y1 = Math.min(height - 1, y + blockRadius);

      const area = (x1 - x0 + 1) * (y1 - y0 + 1);
      const sum =
        integral[y1 * width + x1]
        - (x0 > 0 ? integral[y1 * width + (x0 - 1)] : 0)
        - (y0 > 0 ? integral[(y0 - 1) * width + x1] : 0)
        + (x0 > 0 && y0 > 0 ? integral[(y0 - 1) * width + (x0 - 1)] : 0);

      const localMean = sum / area;
      binary[y * width + x] = data[y * width + x] < localMean - bias ? 1 : 0;
    }
  }

  return binary;
}

/**
 * Preprocessing with sharpness estimation and dual-mode thresholding.
 * Supports forcing adaptive local thresholding (for camera feeds) while keeping
 * Otsu global thresholding as default (for crisp vector/test images).
 */
export function preprocess(
  rgba: Uint8ClampedArray,
  width: number,
  height: number,
  forceAdaptive: boolean = false
): PreprocessResult {
  const gray = toGrayscale(rgba, width, height);
  const sharpness = estimateSharpness(gray);
  const threshold = computeOtsuThreshold(gray);

  let binary: Uint8Array;
  if (forceAdaptive || threshold < 60 || threshold > 195) {
    // Force local adaptive thresholding or handle uneven lighting
    binary = adaptiveBinarise(gray, 24, 7);
  } else {
    binary = binarise(gray, threshold);
  }

  return { binary, threshold, width, height, sharpness };
}
