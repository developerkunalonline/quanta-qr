export const REFERENCE_SIZE = 400;
export const CENTER_X = 200;
export const CENTER_Y = 200;
export const CENTER_RADIUS = 22;
export const GAP_RATIO = 0.28;

export interface RingDescriptor {
  radius: number;
  lineWidth: number;
  segments: number;
  kind: 'sync' | 'data';
  bitOffset: number | null;
}

export const RINGS: RingDescriptor[] = [
  { radius: 50,  lineWidth: 10, segments: 12, kind: 'sync', bitOffset: null },
  { radius: 76,  lineWidth: 10, segments: 16, kind: 'data', bitOffset: 0 },
  { radius: 102, lineWidth: 10, segments: 24, kind: 'data', bitOffset: 16 },
  { radius: 128, lineWidth: 10, segments: 24, kind: 'data', bitOffset: 40 },
  { radius: 154, lineWidth: 10, segments: 24, kind: 'data', bitOffset: 64 },
  { radius: 180, lineWidth: 8,  segments: 32, kind: 'sync', bitOffset: null }
];

export const TOTAL_BITS = 88;
export const DATA_BITS = 80;
export const CHECKSUM_BITS = 8;
export const START_ANGLE = -Math.PI / 2; // 12 o'clock, go clockwise
