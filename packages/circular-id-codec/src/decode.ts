/**
 * Decodes an 88-bit array of 0s and 1s back into a 20-digit numeric ID string.
 * 
 * Rules:
 * 1. Must be exactly 88 bits.
 * 2. Decode the first 80 bits into 20 digits via BCD.
 * 3. Validate that each BCD digit is between 0 and 9.
 * 4. Recompute XOR checksum and verify against the remaining 8 bits.
 */
export function decode(bits: number[]): string {
  if (!Array.isArray(bits)) {
    throw new Error('Input bits must be an array');
  }
  if (bits.length !== 88) {
    throw new Error(`Expected 88 bits, got ${bits.length}`);
  }

  let id = '';

  // Decode 20 digits using BCD (first 80 bits)
  for (let i = 0; i < 20; i++) {
    const b0 = bits[i * 4];
    const b1 = bits[i * 4 + 1];
    const b2 = bits[i * 4 + 2];
    const b3 = bits[i * 4 + 3];

    // Ensure they are 0 or 1
    if (
      (b0 !== 0 && b0 !== 1) ||
      (b1 !== 0 && b1 !== 1) ||
      (b2 !== 0 && b2 !== 1) ||
      (b3 !== 0 && b3 !== 1)
    ) {
      throw new Error(`Invalid bit value at digit position ${i}`);
    }

    const digit = b0 * 8 + b1 * 4 + b2 * 2 + b3;
    if (digit > 9) {
      throw new Error(`Invalid BCD nibble at position ${i}: ${digit}`);
    }

    id += digit.toString();
  }

  // Recompute checksum
  let computedCs = 0;
  for (let i = 0; i < 10; i++) {
    const highDigit = parseInt(id[i * 2], 10);
    const lowDigit = parseInt(id[i * 2 + 1], 10);
    const byteVal = highDigit * 10 + lowDigit;
    computedCs ^= byteVal;
  }

  // Read stored checksum (bits 80 to 87)
  let storedCs = 0;
  for (let j = 0; j < 8; j++) {
    const bit = bits[80 + j];
    if (bit !== 0 && bit !== 1) {
      throw new Error(`Invalid bit value in checksum at position ${j}`);
    }
    storedCs = (storedCs << 1) | bit;
  }

  if (computedCs !== storedCs) {
    throw new Error(`Checksum mismatch: expected ${storedCs} got ${computedCs}`);
  }

  return id;
}

export type DecodeSafeResult =
  | { ok: true; id: string }
  | { ok: false; error: string };

/**
 * Safely decodes an 88-bit array. Never throws.
 */
export function decodeSafe(bits: number[]): DecodeSafeResult {
  try {
    const id = decode(bits);
    return { ok: true, id };
  } catch (error: any) {
    return { ok: false, error: error?.message || 'Unknown decoding error' };
  }
}
