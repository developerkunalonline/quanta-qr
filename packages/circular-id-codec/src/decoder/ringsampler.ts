import { RINGS, START_ANGLE, GAP_RATIO } from '../constants';

export interface SampleResult {
  bits: number[];
  syncR1Valid: boolean;
  syncR6Valid: boolean;
  perRingThresholds: number[];
  angleOffsetUsed: number;
}

/**
 * Samples a single ring at a given angle offset.
 * Uses 5-point radial averaging for better noise rejection.
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

  for (let rIndex = 0; rIndex < RINGS.length; rIndex++) {
    const ring = RINGS[rIndex];
    const scaledRadius = ring.radius * scale;
    const scaledLineWidth = ring.lineWidth * scale;
    const segmentAngle = (2 * Math.PI) / ring.segments;
    const gapAngle = segmentAngle * GAP_RATIO;
    const dashAngle = segmentAngle - gapAngle;

    const ringSamples: number[] = [];

    for (let i = 0; i < ring.segments; i++) {
      const sampleAngle =
        START_ANGLE +
        angleOffset +
        i * segmentAngle +
        gapAngle / 2 +
        dashAngle / 2;

      // 5-point radial averaging (inner, inner-mid, center, outer-mid, outer)
      const offsets = [-0.4, -0.2, 0, 0.2, 0.4];
      let darkSum = 0;

      for (const offset of offsets) {
        const r = scaledRadius + offset * scaledLineWidth;
        const px = Math.round(cx + r * Math.cos(sampleAngle));
        const py = Math.round(cy + r * Math.sin(sampleAngle));
        const clampedX = Math.max(0, Math.min(width - 1, px));
        const clampedY = Math.max(0, Math.min(height - 1, py));
        darkSum += binary[clampedY * width + clampedX];
      }

      // Majority vote across 5 samples
      const bitValue = darkSum >= 3 ? 1 : 0;
      ringSamples.push(bitValue);
    }

    perRingSamples.push(ringSamples);
    perRingThresholds.push(0.5);
  }

  // Validate R1 sync ring (12 segments, alternating)
  const r1Samples = perRingSamples[0];
  let r1MismatchesA = 0;
  let r1MismatchesB = 0;
  for (let i = 0; i < 12; i++) {
    if (r1Samples[i] !== (i % 2 === 0 ? 1 : 0)) r1MismatchesA++;
    if (r1Samples[i] !== (i % 2 === 0 ? 0 : 1)) r1MismatchesB++;
  }
  syncR1Valid = Math.min(r1MismatchesA, r1MismatchesB) <= 3;

  // Validate R6 sync ring (32 segments, alternating)
  const r6Samples = perRingSamples[5];
  let r6MismatchesA = 0;
  let r6MismatchesB = 0;
  for (let i = 0; i < 32; i++) {
    if (r6Samples[i] !== (i % 2 === 0 ? 1 : 0)) r6MismatchesA++;
    if (r6Samples[i] !== (i % 2 === 0 ? 0 : 1)) r6MismatchesB++;
  }
  syncR6Valid = Math.min(r6MismatchesA, r6MismatchesB) <= 6;

  if (!syncR1Valid && !syncR6Valid) {
    return null;
  }

  bits.push(...perRingSamples[1]); // R2: 16 bits
  bits.push(...perRingSamples[2]); // R3: 24 bits
  bits.push(...perRingSamples[3]); // R4: 24 bits
  bits.push(...perRingSamples[4]); // R5: 24 bits

  return {
    bits,
    syncR1Valid,
    syncR6Valid,
    perRingThresholds,
    angleOffsetUsed: angleOffset,
  };
}

/**
 * Tries 24 rotation steps (every 15 degrees) for finer alignment recovery.
 */
export function tryAllRotations(
  binary: Uint8Array,
  width: number,
  height: number,
  cx: number,
  cy: number,
  scale: number
): SampleResult | null {
  // 24 steps × 15° = full 360° coverage with half the previous blind spots
  for (let step = 0; step < 24; step++) {
    const angleOffset = (step * 15 * Math.PI) / 180;
    const result = sampleRings(binary, width, height, cx, cy, scale, angleOffset);
    if (result !== null) {
      return result;
    }
  }
  return null;
}
