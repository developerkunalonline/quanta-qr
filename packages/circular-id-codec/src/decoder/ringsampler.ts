import { RINGS, START_ANGLE, GAP_RATIO } from '../constants';

export interface SampleResult {
  bits: number[];         // 88 bits extracted
  syncR1Valid: boolean;   // did R1 alternating pattern validate?
  syncR6Valid: boolean;   // did R6 alternating pattern validate?
  perRingThresholds: number[]; // one threshold per ring for debugging
  angleOffsetUsed: number;
}

/**
 * Samples the concentric data and sync rings of a circular barcode.
 * Uses 3-point radial averaging to reduce single-pixel noise.
 */
export function sampleRings(
  binary: Uint8Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  scale: number,
  angleOffset: number = 0
): SampleResult | null {
  const bits: number[] = [];
  const perRingSamples: number[][] = [];
  const perRingThresholds: number[] = [];

  let syncR1Valid = false;
  let syncR6Valid = false;

  // STEP 1 & 2: Sample all 6 rings
  for (let rIndex = 0; rIndex < RINGS.length; rIndex++) {
    const ring = RINGS[rIndex];
    const scaledRadius = ring.radius * scale;
    const scaledLineWidth = ring.lineWidth * scale;
    const segmentAngle = (2 * Math.PI) / ring.segments;
    const gapAngle = segmentAngle * GAP_RATIO;
    const dashAngle = segmentAngle - gapAngle;

    const ringSamples: number[] = [];

    for (let i = 0; i < ring.segments; i++) {
      // Calculate sample angle (middle of the dash area)
      const sampleAngle =
        START_ANGLE +
        angleOffset +
        i * segmentAngle +
        gapAngle / 2 +
        dashAngle / 2;

      // Hardening: radial multi-sampling (3 points: inner, center, outer)
      const rInner = scaledRadius - scaledLineWidth * 0.3;
      const rCenter = scaledRadius;
      const rOuter = scaledRadius + scaledLineWidth * 0.3;

      let darkSum = 0;

      const samplePoint = (r: number) => {
        const px = Math.round(cx + r * Math.cos(sampleAngle));
        const py = Math.round(cy + r * Math.sin(sampleAngle));
        const clampedX = Math.max(0, Math.min(width - 1, px));
        const clampedY = Math.max(0, Math.min(height - 1, py));
        return binary[clampedY * width + clampedX];
      };

      darkSum += samplePoint(rInner);
      darkSum += samplePoint(rCenter);
      darkSum += samplePoint(rOuter);

      // Average thresholded at 0.5
      const bitValue = (darkSum / 3) >= 0.5 ? 1 : 0;
      ringSamples.push(bitValue);
    }

    perRingSamples.push(ringSamples);
    perRingThresholds.push(0.5); // Using binary directly for V1
  }

  // STEP 3: Validate Sync Rings (R1 and R6)
  // R1 (index 0): 12 segments. Expected alternating pattern: 1, 0, 1, 0, 1, 0, ...
  const r1Samples = perRingSamples[0];
  let r1MismatchesPatternA = 0; // expected: 1010...
  let r1MismatchesPatternB = 0; // expected: 0101...
  for (let i = 0; i < 12; i++) {
    const expectedA = i % 2 === 0 ? 1 : 0;
    const expectedB = i % 2 === 0 ? 0 : 1;
    if (r1Samples[i] !== expectedA) r1MismatchesPatternA++;
    if (r1Samples[i] !== expectedB) r1MismatchesPatternB++;
  }
  const r1Mismatches = Math.min(r1MismatchesPatternA, r1MismatchesPatternB);
  // Relaxed tolerance: up to 3 mismatches out of 12
  syncR1Valid = r1Mismatches <= 3;

  // R6 (index 5): 32 segments. Expected alternating pattern
  const r6Samples = perRingSamples[5];
  let r6MismatchesPatternA = 0;
  let r6MismatchesPatternB = 0;
  for (let i = 0; i < 32; i++) {
    const expectedA = i % 2 === 0 ? 1 : 0;
    const expectedB = i % 2 === 0 ? 0 : 1;
    if (r6Samples[i] !== expectedA) r6MismatchesPatternA++;
    if (r6Samples[i] !== expectedB) r6MismatchesPatternB++;
  }
  const r6Mismatches = Math.min(r6MismatchesPatternA, r6MismatchesPatternB);
  // Relaxed tolerance: up to 5 mismatches out of 32
  syncR6Valid = r6Mismatches <= 5;

  // Reject only if BOTH sync rings fail
  if (!syncR1Valid && !syncR6Valid) {
    return null;
  }

  // STEP 4: Assemble bits array (88 bits) from data rings R2-R5
  // R2 (index 1): 16 bits
  const r2Bits = perRingSamples[1];
  bits.push(...r2Bits);

  // R3 (index 2): 24 bits
  const r3Bits = perRingSamples[2];
  bits.push(...r3Bits);

  // R4 (index 3): 24 bits
  const r4Bits = perRingSamples[3];
  bits.push(...r4Bits);

  // R5 (index 4): 24 bits
  const r5Bits = perRingSamples[4];
  bits.push(...r5Bits);

  return {
    bits,
    syncR1Valid,
    syncR6Valid,
    perRingThresholds,
    angleOffsetUsed: angleOffset
  };
}

/**
 * Tries 12 different rotation increments (30 degrees each) to find a valid alignment.
 */
export function tryAllRotations(
  binary: Uint8Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  scale: number
): SampleResult | null {
  // Try 12 angles around the circle
  for (let step = 0; step < 12; step++) {
    const angleOffset = (step * 30 * Math.PI) / 180;
    const result = sampleRings(binary, width, height, cx, cy, scale, angleOffset);
    if (result !== null) {
      return result;
    }
  }
  return null;
}
