'use server';

import { validateId, encode, drawCircularCode } from '@circular-id/codec';
import { createCanvas } from 'canvas';

export interface BatchItemResult {
  id: string;
  pngBase64: string;
  error?: string;
}

/**
 * Server Action to generate circular codes for a list of IDs.
 * Limits to the first 100 IDs.
 */
export async function generateBatch(ids: string[]): Promise<BatchItemResult[]> {
  try {
    if (!Array.isArray(ids)) {
      throw new Error('Input must be an array of IDs');
    }

    // Limit to the first 100 IDs
    const targetIds = ids.slice(0, 100);

    const tasks = targetIds.map(async (rawId) => {
      try {
        // Strip non-digits
        const cleanedId = rawId.replace(/\D/g, '');
        if (cleanedId.length === 0) {
          return { id: rawId, pngBase64: '', error: 'ID contains no digit characters' };
        }

        // Hardening Check: Reject if ID is longer than 20 digits even before/after stripping
        if (rawId.length > 20) {
          console.warn(`[Batch Generator] ID rejected: too long (${rawId.length} chars)`);
          return { id: rawId, pngBase64: '', error: 'ID exceeds maximum length of 20 digits' };
        }

        const validation = validateId(cleanedId);
        if (!validation.valid) {
          return { id: rawId, pngBase64: '', error: validation.error || 'Invalid ID structure' };
        }

        const bits = encode(validation.cleaned);

        // Render at a compact size (e.g. 300x300) for batch thumbnails/downloads
        const size = 300;
        const canvas = createCanvas(size, size);
        const ctx = canvas.getContext('2d');

        drawCircularCode({
          ctx: ctx as any,
          bits,
          size,
          darkColor: '#0f172a',
          lightColor: '#ffffff',
          accentColor: '#0f172a',
          altColor: '#4f46e5',
          centerText: 'ID'
        });

        const base64 = canvas.toBuffer('image/png').toString('base64');
        return {
          id: validation.cleaned,
          pngBase64: `data:image/png;base64,${base64}`
        };
      } catch (err: any) {
        return {
          id: rawId,
          pngBase64: '',
          error: err?.message || 'Failed to render code'
        };
      }
    });

    return await Promise.all(tasks);
  } catch (error: any) {
    console.error('Batch generation general error:', error);
    throw new Error(error?.message || 'Server failed to process batch');
  }
}
