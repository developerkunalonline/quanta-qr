import { describe, it, expect } from 'vitest';
import { encode, decode, encodeSafe, decodeSafe, validateId } from '../src/index.js';

describe('Circular ID Codec Unit Tests', () => {
  it('encode("12345678901234567890") returns array of length 88', () => {
    const bits = encode('12345678901234567890');
    expect(bits).toBeInstanceOf(Array);
    expect(bits.length).toBe(88);
    bits.forEach(bit => expect(bit === 0 || bit === 1).toBe(true));
  });

  it('encode then decode on the same ID returns the same 20-char string', () => {
    const original = '12345678901234567890';
    const bits = encode(original);
    const decoded = decode(bits);
    expect(decoded).toBe(original);
  });

  it('encode("5") pads to "00000000000000000005" and round-trips correctly', () => {
    const original = '5';
    const expectedPadded = '00000000000000000005';
    const bits = encode(original);
    const decoded = decode(bits);
    expect(decoded).toBe(expectedPadded);
  });

  it('decode with corrupted bit throws checksum error', () => {
    const bits = encode('12345678901234567890');
    // Corrupt a bit in the checksum (bits 80-87)
    bits[80] = bits[80] === 1 ? 0 : 1;
    expect(() => decode(bits)).toThrow(/Checksum mismatch/);
  });

  it('encode with non-digit characters strips them correctly', () => {
    const dirty = 'abc-12345_67890!12345@67890#';
    const clean = '12345678901234567890';
    const bits = encode(dirty);
    const decoded = decode(bits);
    expect(decoded).toBe(clean);
  });

  it('encode("") throws an error', () => {
    expect(() => encode('')).toThrow(/ID must contain at least one digit/);
  });

  it('fuzz test — generate 500 random 20-digit IDs, encode then decode each, assert exact match', () => {
    for (let f = 0; f < 500; f++) {
      let id = '';
      for (let i = 0; i < 20; i++) {
        id += Math.floor(Math.random() * 10).toString();
      }
      const bits = encode(id);
      const decoded = decode(bits);
      expect(decoded).toBe(id);
    }
  });

  describe('Safe Variants Hardening Checks', () => {
    it('encodeSafe never throws and returns correct ok/error states', () => {
      // Valid input
      const res1 = encodeSafe('123');
      expect(res1.ok).toBe(true);
      if (res1.ok) {
        expect(res1.bits.length).toBe(88);
      }

      // Garbage input
      const res2 = encodeSafe('');
      expect(res2.ok).toBe(false);
      if (!res2.ok) {
        expect(res2.error).toMatch(/ID must contain at least one digit/);
      }

      // Non-string input (cast or forced)
      expect(() => encodeSafe(null as any)).not.toThrow();
      const res3 = encodeSafe(null as any);
      expect(res3.ok).toBe(false);
    });

    it('decodeSafe never throws and returns correct ok/error states', () => {
      // Valid input
      const bits = encode('99999999999999999999');
      const res1 = decodeSafe(bits);
      expect(res1.ok).toBe(true);
      if (res1.ok) {
        expect(res1.id).toBe('99999999999999999999');
      }

      // Garbage array size
      const res2 = decodeSafe([0, 1, 0, 1]);
      expect(res2.ok).toBe(false);

      // Corrupted bit array values (non-0/1)
      const corruptedBits = [...bits];
      corruptedBits[5] = 99;
      const res3 = decodeSafe(corruptedBits);
      expect(res3.ok).toBe(false);
      if (!res3.ok) {
        expect(res3.error).toMatch(/Invalid bit value/);
      }

      // Non-array input
      expect(() => decodeSafe(null as any)).not.toThrow();
      const res4 = decodeSafe(null as any);
      expect(res4.ok).toBe(false);
    });

    it('validateId returns expected validation objects and never throws', () => {
      expect(validateId('123')).toEqual({ valid: true, cleaned: '00000000000000000123' });
      expect(validateId('abc')).toEqual({ valid: false, cleaned: '', error: 'ID must contain at least one digit' });
      expect(validateId(undefined as any)).toEqual({ valid: false, cleaned: '', error: 'Input must be a string' });
    });
  });
});
