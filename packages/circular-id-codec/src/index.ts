export * from './constants';
export * from './encode';
export * from './decode';
export * from './renderer';
export * from './decoder/index';

/**
 * Validates and cleans a raw ID input string.
 * 
 * Rules:
 * - Strips all non-digit characters.
 * - If empty after stripping, returns valid: false with an error.
 * - Otherwise, left-pads the cleaned digits to 20 chars (or slices to 20 if longer) and returns valid: true.
 * - Never throws.
 */
export function validateId(input: string): { valid: boolean; cleaned: string; error?: string } {
  try {
    if (typeof input !== 'string') {
      return {
        valid: false,
        cleaned: '',
        error: 'Input must be a string'
      };
    }

    const cleaned = input.replace(/\D/g, '');

    if (cleaned.length === 0) {
      return {
        valid: false,
        cleaned: '',
        error: 'ID must contain at least one digit'
      };
    }

    // Pad or slice to exactly 20 digits
    let padded = cleaned;
    if (padded.length < 20) {
      padded = padded.padStart(20, '0');
    } else if (padded.length > 20) {
      padded = padded.slice(0, 20);
    }

    return {
      valid: true,
      cleaned: padded
    };
  } catch (err: any) {
    return {
      valid: false,
      cleaned: '',
      error: err?.message || 'Unknown validation error'
    };
  }
}
