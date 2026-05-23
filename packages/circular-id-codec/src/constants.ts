export const REFERENCE_SIZE = 400;
export const CENTER_X = 200;
export const CENTER_Y = 200;
export const CENTER_RADIUS = 20; // Slightly smaller to prevent merging with R1 under blur
export const GAP_RATIO = 0.28;

export interface RingDescriptor {
  radius: number;
  lineWidth: number;
  segments: number;
  kind: 'sync' | 'data';
  bitOffset: number | null;
}

// Wider spacing system: line width 8 instead of 10 gives larger spacing (17px gaps, 31px center gap)
export const RINGS: RingDescriptor[] = [
  { radius: 55,  lineWidth: 8, segments: 12, kind: 'sync', bitOffset: null },
  { radius: 80,  lineWidth: 8, segments: 16, kind: 'data', bitOffset: 0 },
  { radius: 105, lineWidth: 8, segments: 24, kind: 'data', bitOffset: 16 },
  { radius: 130, lineWidth: 8, segments: 24, kind: 'data', bitOffset: 40 },
  { radius: 155, lineWidth: 8, segments: 24, kind: 'data', bitOffset: 64 },
  { radius: 180, lineWidth: 8, segments: 32, kind: 'sync', bitOffset: null }
];

// Unique asymmetric sync patterns that completely break rotational symmetry (no false positive angles)
export const SYNC_R1_PATTERN = [1, 1, 1, 0, 1, 0, 1, 1, 0, 0, 1, 0];
export const SYNC_R6_PATTERN = [
  1, 1, 1, 1, 0, 0, 0, 0, 1, 0, 1, 0, 1, 0, 1, 0,
  1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0, 1, 0
];

export const TOTAL_BITS = 88;
export const DATA_BITS = 80;
export const CHECKSUM_BITS = 8;
export const START_ANGLE = -Math.PI / 2; // 12 o'clock, go clockwise
