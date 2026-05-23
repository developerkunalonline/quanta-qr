import { CENTER_RADIUS } from '../constants';

export interface CenterResult {
  cx: number;       // x coordinate of centroid
  cy: number;       // y coordinate of centroid
  radius: number;   // estimated radius of center circle in pixels
  confidence: number; // 0-1 score
  // Ellipse moments for perspective correction
  axisA?: number;
  axisB?: number;
  ellipseAngle?: number;
}

/**
 * Finds the solid center anchor circle within a binary image.
 * Uses a density-seeded flood-fill to find the central dark blob, then evaluates centroid and circularity.
 * It also computes the second-order central moments of the blob to estimate perspective distortion (ellipse model).
 */
export function findCenter(binary: Uint8Array, width: number, height: number): CenterResult | null {
  const totalPixels = width * height;
  if (totalPixels === 0) return null;

  const visited = new Uint8Array(totalPixels);
  let bestBlob: {
    cx: number;
    cy: number;
    radius: number;
    confidence: number;
    pixelCount: number;
    score: number;
    axisA: number;
    axisB: number;
    ellipseAngle: number;
  } | null = null;

  const maxFillLimit = 200000;

  for (let y = 4; y < height - 4; y += 2) {
    for (let x = 4; x < width - 4; x += 2) {
      const idx = y * width + x;
      if (binary[idx] === 1 && visited[idx] === 0) {
        let pixelCount = 0;
        let sumX = 0;
        let sumY = 0;
        let sumX2 = 0;
        let sumY2 = 0;
        let sumXY = 0;
        let perimeter = 0;

        const stack: number[] = [idx];
        visited[idx] = 1;

        while (stack.length > 0) {
          const currIdx = stack.pop()!;
          pixelCount++;

          if (pixelCount > maxFillLimit) {
            break;
          }

          const cx_val = currIdx % width;
          const cy_val = Math.floor(currIdx / width);

          sumX += cx_val;
          sumY += cy_val;
          sumX2 += cx_val * cx_val;
          sumY2 += cy_val * cy_val;
          sumXY += cx_val * cy_val;

          let isPerimeter = false;
          const neighbors = [
            currIdx - 1,
            currIdx + 1,
            currIdx - width,
            currIdx + width
          ];

          for (let n = 0; n < 4; n++) {
            const nIdx = neighbors[n];
            if (nIdx >= 0 && nIdx < totalPixels) {
              const nx = nIdx % width;
              const ny = Math.floor(nIdx / width);

              if (Math.abs(nx - cx_val) <= 1 && Math.abs(ny - cy_val) <= 1) {
                if (binary[nIdx] === 0) {
                  isPerimeter = true;
                } else if (visited[nIdx] === 0) {
                  visited[nIdx] = 1;
                  stack.push(nIdx);
                }
              }
            } else {
              isPerimeter = true;
            }
          }

          if (isPerimeter) {
            perimeter++;
          }
        }

        if (pixelCount >= 25 && pixelCount < maxFillLimit) {
          const cx = sumX / pixelCount;
          const cy = sumY / pixelCount;
          const radius = Math.sqrt(pixelCount / Math.PI);

          if (radius > Math.min(width, height) * 0.22) {
            continue;
          }

          // Calculate central moments
          const mu20 = (sumX2 / pixelCount) - cx * cx;
          const mu02 = (sumY2 / pixelCount) - cy * cy;
          const mu11 = (sumXY / pixelCount) - cx * cy;

          // Covariance eigenvalues
          const delta = mu20 - mu02;
          const term = Math.sqrt(delta * delta + 4 * mu11 * mu11);
          const l1 = (mu20 + mu02 + term) / 2;
          const l2 = (mu20 + mu02 - term) / 2;

          const axisA = 2 * Math.sqrt(Math.max(0, l1));
          const axisB = 2 * Math.sqrt(Math.max(0, l2));
          const ellipseAngle = 0.5 * Math.atan2(2 * mu11, delta);

          // We check aspect ratio: too flat is rejected
          if (axisA > 0) {
            const ratio = axisB / axisA;
            if (ratio < 0.45) continue; // too flat to be a circular code
          }

          const actualPerimeter = perimeter > 0 ? perimeter : 2 * Math.PI * radius;
          const circularity = (4 * Math.PI * pixelCount) / (actualPerimeter * actualPerimeter);

          const circularityConfidence = Math.min(1.0, circularity);
          const sizeConfidence = Math.min(1.0, pixelCount / 180);
          const confidence = circularityConfidence * sizeConfidence;
          const score = confidence * pixelCount;

          if (confidence >= 0.25) {
            if (!bestBlob || score > bestBlob.score) {
              bestBlob = { cx, cy, radius, confidence, pixelCount, score, axisA, axisB, ellipseAngle };
            }
          }
        }
      }
    }
  }

  if (!bestBlob) {
    return null;
  }

  return {
    cx: bestBlob.cx,
    cy: bestBlob.cy,
    radius: bestBlob.radius,
    confidence: bestBlob.confidence,
    axisA: bestBlob.axisA,
    axisB: bestBlob.axisB,
    ellipseAngle: bestBlob.ellipseAngle
  };
}

/**
 * Estimating scale factor based on detected center radius.
 */
export function estimateCodeScale(centerRadius: number): number {
  return centerRadius / CENTER_RADIUS;
}
