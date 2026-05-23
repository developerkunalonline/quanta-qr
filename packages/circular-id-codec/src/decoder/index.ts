import { preprocess } from './preprocess';
import { findCenter, estimateCodeScale } from './centerDetect';
import { tryAllRotations, SampleResult } from './ringsampler';
import { decodeSafe } from '../decode';

export interface DecodeDebugInfo {
  threshold?: number;
  centerFound?: {
    cx: number;
    cy: number;
    radius: number;
    confidence: number;
  };
  scale?: number;
  syncR1Valid?: boolean;
  syncR6Valid?: boolean;
  bitsExtracted?: number[];
  angleOffsetUsed?: number;
  binary?: Uint8Array;
}

export type DecodeResult =
  | { ok: true; id: string; confidence: number; debug: DecodeDebugInfo }
  | { ok: false; error: string; stage: 'preprocess' | 'center' | 'sample' | 'decode'; debug: DecodeDebugInfo };

/**
 * Decodes a circular barcode from a raw RGBA pixel buffer.
 */
export function decodeImage(
  rgba: Uint8ClampedArray,
  width: number,
  height: number
): DecodeResult {
  const debug: DecodeDebugInfo = {};

  try {
    // 0. Hardening: Input validation to prevent crashes
    if (!rgba || !(rgba instanceof Uint8ClampedArray)) {
      return {
        ok: false,
        stage: 'preprocess',
        error: 'Input pixels must be a Uint8ClampedArray',
        debug
      };
    }

    if (width <= 0 || height <= 0 || rgba.length !== width * height * 4) {
      return {
        ok: false,
        stage: 'preprocess',
        error: 'Buffer size does not match dimensions (width * height * 4)',
        debug
      };
    }

    // 1. Preprocess (Grayscale + Otsu thresholding + Binarization)
    const { binary, threshold } = preprocess(rgba, width, height);
    debug.threshold = threshold;

    // Save binary in debug for real-time visual inspection
    debug.binary = binary;

    // 2. Find Center Circle (Double-pass polarity search)
    let centerResult = findCenter(binary, width, height);

    if (!centerResult) {
      // If not found, the image might have inverted colors (light-on-dark).
      // Try inverting the binary map and searching again.
      const invertedBinary = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        invertedBinary[i] = binary[i] === 1 ? 0 : 1;
      }

      const invertedCenterResult = findCenter(invertedBinary, width, height);
      if (invertedCenterResult) {
        centerResult = invertedCenterResult;
        // Apply the inversion to the working binary map
        for (let i = 0; i < binary.length; i++) {
          binary[i] = invertedBinary[i];
        }
      }
    }

    if (!centerResult) {
      return {
        ok: false,
        stage: 'center',
        error: 'Center circle not found',
        debug
      };
    }

    debug.centerFound = centerResult;

    // 3. Estimate Scale
    const scale = estimateCodeScale(centerResult.radius);
    debug.scale = scale;

    // 4. Sample Rings with Swept Rotations (tries every 30 degrees)
    const sampleResult = tryAllRotations(
      binary,
      width,
      height,
      centerResult.cx,
      centerResult.cy,
      scale
    );

    if (!sampleResult) {
      return {
        ok: false,
        stage: 'sample',
        error: 'Sync rings not detected — image may be blurred, too small, or too skewed',
        debug
      };
    }

    debug.syncR1Valid = sampleResult.syncR1Valid;
    debug.syncR6Valid = sampleResult.syncR6Valid;
    debug.bitsExtracted = sampleResult.bits;
    debug.angleOffsetUsed = sampleResult.angleOffsetUsed;

    // 5. Decode safe (verifies BCD structure and XOR checksum)
    const decodeRes = decodeSafe(sampleResult.bits);
    if (!decodeRes.ok) {
      return {
        ok: false,
        stage: 'decode',
        error: decodeRes.error,
        debug
      };
    }

    // Hardening: Reject false-positive all-zero decodes when outermost sync ring (R6) failed.
    // If the outer sync ring is missing/unreadable, the outer data rings are likely washed out/cropped.
    if (decodeRes.id === '00000000000000000000' && !sampleResult.syncR6Valid) {
      return {
        ok: false,
        stage: 'sample',
        error: 'Outer boundary (R6) unreadable. Scanning aborted to prevent false-positive all-zeros.',
        debug
      };
    }

    // 6. Return successful decode
    // Confidence is a combination of center blob quality normalized to at least 0.3
    const finalConfidence = centerResult.confidence * 0.7 + 0.3;

    return {
      ok: true,
      id: decodeRes.id,
      confidence: finalConfidence,
      debug
    };

  } catch (error: any) {
    return {
      ok: false,
      stage: 'preprocess',
      error: error?.message || 'Unexpected decoding failure',
      debug
    };
  }
}
