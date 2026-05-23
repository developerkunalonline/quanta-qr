import { TOTAL_BITS } from './constants.js';

/**
 * Encodes a numeric ID string into an 88-bit array of 0s and 1s.
 * 
 * Rules:
 * 1. Strip non-digit characters.
 * 2. If empty after stripping, throw Error.
 * 3. Left-pad to exactly 20 digits (or slice to 20 if longer).
 * 4. BCD encode each digit into 4 bits MSB-first (80 bits total).
 * 5. Compute XOR checksum of all 10 byte-pairs, append as 8 bits MSB-first (88 bits total).
 */
export function encode(id: string): number[] {
  if (typeof id !== 'string') {
    throw new Error('ID must be a string');
  }

  // Strip all non-digit characters
  const cleaned = id.replace(/\D/g, '');

  if (cleaned.length === 0) {
    throw new Error('ID must contain at least one digit');
  }

  // Pad or slice to exactly 20 characters
  let padded = cleaned;
  if (padded.length < 20) {
    padded = padded.padStart(20, '0');
  } else if (padded.length > 20) {
    padded = padded.slice(0, 20);
  }

  const bits: number[] = [];

  // BCD encode digits (20 digits * 4 bits = 80 bits)
  for (let i = 0; i < 20; i++) {
    const digit = parseInt(padded[i], 10);
    bits.push((digit >> 3) & 1);
    bits.push((digit >> 2) & 1);
    bits.push((digit >> 1) & 1);
    bits.push(digit & 1);
  }

  // Compute checksum: XOR of 10 byte-pairs
  let cs = 0;
  for (let i = 0; i < 10; i++) {
    const highDigit = parseInt(padded[i * 2], 10);
    const lowDigit = parseInt(padded[i * 2 + 1], 10);
    const byteVal = highDigit * 10 + lowDigit;
    cs ^= byteVal;
  }

  // Append checksum as 8 bits MSB-first
  for (let j = 7; j >= 0; j--) {
    bits.push((cs >> j) & 1);
  }

  return bits;
}

export type EncodeResult = 
  | { ok: true; bits: number[] }
  | { ok: false; error: string };

/**
 * Safely encodes a numeric ID string into an 88-bit array. Never throws.
 */
export function encodeSafe(id: string): EncodeResult {
  try {
    const bits = encode(id);
    return { ok: true, bits };
  } catch (error: any) {
    return { ok: false, error: error?.message || 'Unknown encoding error' };
  }
}
