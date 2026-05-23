export interface GrayImage {
  data: Uint8Array;
  width: number;
  height: number;
}

export function toGrayscale(rgba: Uint8ClampedArray, width: number, height: number): GrayImage {
  const pixelCount = width * height;
  const grayData = new Uint8Array(pixelCount);
  for (let i = 0; i < pixelCount; i++) {
    const r = rgba[i * 4];
    const g = rgba[i * 4 + 1];
    const b = rgba[i * 4 + 2];
    grayData[i] = (77 * r + 150 * g + 29 * b) >> 8; // fast integer luminance
  }
  return { data: grayData, width, height };
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

/**
 * Adaptive local block thresholding.
 * Divides image into blockSize×blockSize tiles and thresholds each
 * tile at (localMean * sensitivity). Much better for uneven lighting.
 */
export function adaptiveBinarise(gray: GrayImage, blockSize: number = 32, sensitivity: number = 0.85): Uint8Array {
  const { data, width, height } = gray;
  const binary = new Uint8Array(data.length);
  const halfBlock = Math.floor(blockSize / 2);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      // compute local mean in block around (x,y)
      const x0 = Math.max(0, x - halfBlock);
      const x1 = Math.min(width - 1, x + halfBlock);
      const y0 = Math.max(0, y - halfBlock);
      const y1 = Math.min(height - 1, y + halfBlock);

      let sum = 0;
      let count = 0;
      for (let by = y0; by <= y1; by++) {
        for (let bx = x0; bx <= x1; bx++) {
          sum += data[by * width + bx];
          count++;
        }
      }
      const localMean = sum / count;
      binary[y * width + x] = data[y * width + x] < localMean * sensitivity ? 1 : 0;
    }
  }
  return binary;
}

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
 * Preprocessing pipeline with dual-mode thresholding.
 * Uses Otsu globally, but if the Otsu threshold looks unreliable
 * (extreme — very low or very high), falls back to adaptive local thresholding.
 */
export function preprocess(rgba: Uint8ClampedArray, width: number, height: number): PreprocessResult {
  const gray = toGrayscale(rgba, width, height);
  const threshold = computeOtsuThreshold(gray);

  // Use adaptive thresholding when Otsu threshold is in extreme zone
  // (< 60 or > 200 indicates very uneven lighting or near-uniform image)
  let binary: Uint8Array;
  if (threshold < 60 || threshold > 200) {
    binary = adaptiveBinarise(gray, 40, 0.85);
  } else {
    binary = binarise(gray, threshold);
  }

  return { binary, threshold, width, height };
}

