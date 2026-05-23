import { CENTER_RADIUS } from '../constants.js';

export interface CenterResult {
  cx: number;       // x coordinate of centroid
  cy: number;       // y coordinate of centroid
  radius: number;   // estimated radius of center circle in pixels
  confidence: number; // 0-1 score
}

/**
 * Finds the solid center anchor circle within a binary image.
 * Uses a density-seeded flood-fill to find the central dark blob, then evaluates centroid and circularity.
 */
export function findCenter(binary: Uint8Array, width: number, height: number): CenterResult | null {
  const totalPixels = width * height;
  if (totalPixels === 0) return null;



  // Let's write the density and flood-fill loops extremely cleanly:
  // We can scan the entire image in a structured way to find dark pixels and flood fill them,
  // or use the zone density search. Let's do a robust search.
  // Actually, a simpler and extremely robust method is:
  // Iterate through the image, and whenever we find an unvisited dark pixel (1), we flood fill it.
  // We track the largest blob that matches circularity characteristics. This is 100% reliable!
  // Let's implement this!

  const visited = new Uint8Array(totalPixels);
  let bestBlob: { cx: number; cy: number; radius: number; confidence: number; pixelCount: number; score: number } | null = null;

  const maxFillLimit = 200000; // robust limit for large resolutions

  for (let y = 4; y < height - 4; y += 2) { // step by 2 for scanning speed
    for (let x = 4; x < width - 4; x += 2) {
      const idx = y * width + x;
      if (binary[idx] === 1 && visited[idx] === 0) {
        // Start iterative flood fill
        let pixelCount = 0;
        let sumX = 0;
        let sumY = 0;
        let perimeter = 0;

        // Use a flat array as stack
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

          // Check neighbors
          let isPerimeter = false;
          const neighbors = [
            currIdx - 1,          // West
            currIdx + 1,          // East
            currIdx - width,      // North
            currIdx + width       // South
          ];

          for (let n = 0; n < 4; n++) {
            const nIdx = neighbors[n];
            if (nIdx >= 0 && nIdx < totalPixels) {
              const nx = nIdx % width;
              const ny = Math.floor(nIdx / width);

              // check boundaries
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

        // Evaluate this blob
        if (pixelCount >= 30 && pixelCount < maxFillLimit) {
          const cx = sumX / pixelCount;
          const cy = sumY / pixelCount;
          const radius = Math.sqrt(pixelCount / Math.PI);

          // Hardening: Filter out blobs that are too large to be the center anchor
          if (radius > Math.min(width, height) * 0.20) {
            continue;
          }

          // Circularity: (4 * Math.PI * A) / (P^2)
          // For single pixel/small circularity calculations, enforce perimeter > 0
          const actualPerimeter = perimeter > 0 ? perimeter : 2 * Math.PI * radius;
          const circularity = (4 * Math.PI * pixelCount) / (actualPerimeter * actualPerimeter);

          // Circularity confidence: clamp to 1.0
          const circularityConfidence = Math.min(1.0, circularity);

          // Penalize very small blobs
          const sizeConfidence = Math.min(1.0, pixelCount / 200);
          const confidence = circularityConfidence * sizeConfidence;
          const score = confidence * pixelCount;

          if (confidence >= 0.3) {
            if (!bestBlob || score > bestBlob.score) {
              bestBlob = { cx, cy, radius, confidence, pixelCount, score };
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
    confidence: bestBlob.confidence
  };
}

/**
 * Estimating scale factor based on detected center radius.
 */
export function estimateCodeScale(centerRadius: number): number {
  return centerRadius / CENTER_RADIUS;
}
