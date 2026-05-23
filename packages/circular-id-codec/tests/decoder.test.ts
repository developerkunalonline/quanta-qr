import { describe, it, expect } from 'vitest';
import { encode, drawCircularCode, decodeImage } from '../src/index.js';
import { createCanvas } from 'canvas';

describe('Circular ID Decoder Integration Tests', () => {
  const testId = '12345678901234567890';

  it('Test 1 — Round-trip perfect (400x400)', () => {
    const size = 400;
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    const bits = encode(testId);
    drawCircularCode({
      ctx: ctx as any,
      bits,
      size,
      darkColor: '#000000',
      lightColor: '#ffffff'
    });

    const imgData = ctx.getImageData(0, 0, size, size);
    const result = decodeImage(imgData.data, size, size);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.id).toBe(testId);
      expect(result.confidence).toBeGreaterThanOrEqual(0.7);
    }
  });

  it('Test 2 — Round-trip small size (200x200)', () => {
    const size = 200;
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    const bits = encode(testId);
    drawCircularCode({
      ctx: ctx as any,
      bits,
      size,
      darkColor: '#000000',
      lightColor: '#ffffff'
    });

    const imgData = ctx.getImageData(0, 0, size, size);
    const result = decodeImage(imgData.data, size, size);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.id).toBe(testId);
    }
  });

  it('Test 3 — Round-trip large size (800x800)', () => {
    const size = 800;
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    const bits = encode(testId);
    drawCircularCode({
      ctx: ctx as any,
      bits,
      size,
      darkColor: '#000000',
      lightColor: '#ffffff'
    });

    const imgData = ctx.getImageData(0, 0, size, size);
    const result = decodeImage(imgData.data, size, size);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.id).toBe(testId);
    }
  });

  it('Test 4 — Round-trip with white-on-black colors (inverted)', () => {
    const size = 400;
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    const bits = encode(testId);
    drawCircularCode({
      ctx: ctx as any,
      bits,
      size,
      darkColor: '#ffffff',
      lightColor: '#000000'
    });

    const imgData = ctx.getImageData(0, 0, size, size);
    const result = decodeImage(imgData.data, size, size);

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.id).toBe(testId);
    }
  });

  it('Test 5 — Corrupted image (all solid white)', () => {
    const size = 100;
    const rgba = new Uint8ClampedArray(size * size * 4);
    rgba.fill(255); // Solid white

    const result = decodeImage(rgba, size, size);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe('center');
      expect(result.error).toMatch(/Center circle not found/);
    }
  });

  it('Test 6 — Wrong size buffer', () => {
    const size = 50;
    // Should be 50 * 50 * 4 = 10000 bytes, but we pass only 500 bytes
    const smallRgba = new Uint8ClampedArray(500);

    const result = decodeImage(smallRgba, size, size);

    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.stage).toBe('preprocess');
      expect(result.error).toMatch(/Buffer size does not match dimensions/);
    }
  });
});
