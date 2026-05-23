import {
  REFERENCE_SIZE,
  CENTER_RADIUS,
  GAP_RATIO,
  RINGS,
  START_ANGLE
} from './constants.js';

export interface DrawOptions {
  ctx: CanvasRenderingContext2D;  // already-created 2d context
  bits: number[];                 // 88-bit array from encode()
  size: number;                   // canvas is size×size pixels
  darkColor?: string;             // defaults to '#000000'
  lightColor?: string;            // defaults to '#ffffff' (background)
  accentColor?: string;           // color of primary data rings (defaults to darkColor)
  altColor?: string;              // color of alternate rings for visual style (defaults to '#444444')
  centerText?: string;            // up to 3 chars shown in center circle, optional
  centerTextColor?: string;       // defaults to lightColor
}

/**
 * Draws a circular code onto a 2D canvas context.
 * This is designed to run in both the browser and Node.js.
 */
export function drawCircularCode(options: DrawOptions): void {
  const { lightColor = '#ffffff' } = options;

  // Determine if lightColor (background) is a dark color to choose a contrasting default altColor
  let isBackgroundDark = false;
  try {
    const cleanHex = lightColor.trim().replace(/^#/, '');
    let r = 255, g = 255, b = 255;
    if (cleanHex.length === 3) {
      r = parseInt(cleanHex[0] + cleanHex[0], 16);
      g = parseInt(cleanHex[1] + cleanHex[1], 16);
      b = parseInt(cleanHex[2] + cleanHex[2], 16);
    } else if (cleanHex.length === 6 || cleanHex.length === 8) {
      r = parseInt(cleanHex.slice(0, 2), 16);
      g = parseInt(cleanHex.slice(2, 4), 16);
      b = parseInt(cleanHex.slice(4, 6), 16);
    }
    const luminance = 0.299 * r + 0.587 * g + 0.114 * b;
    isBackgroundDark = luminance < 128;
  } catch (e) {
    // ignore parsing errors
  }

  const defaultAltColor = isBackgroundDark ? '#cccccc' : '#444444';

  const {
    ctx,
    bits,
    size,
    darkColor = '#000000',
    accentColor = darkColor,
    altColor = defaultAltColor,
    centerText,
    centerTextColor = lightColor
  } = options;

  const scale = size / REFERENCE_SIZE;
  const cx = size / 2;
  const cy = size / 2;

  // STEP 2: Fill background
  ctx.fillStyle = lightColor;
  ctx.fillRect(0, 0, size, size);

  // STEP 3: Draw each ring
  RINGS.forEach((ring, ringIndex) => {
    const scaledRadius = ring.radius * scale;
    const scaledLineWidth = ring.lineWidth * scale;
    const segmentAngle = (2 * Math.PI) / ring.segments;
    const gapAngle = segmentAngle * GAP_RATIO;
    const dashAngle = segmentAngle - gapAngle;

    for (let i = 0; i < ring.segments; i++) {
      let bit = 0;
      if (ring.kind === 'sync') {
        bit = (i % 2 === 0) ? 1 : 0;
      } else if (ring.kind === 'data') {
        const offset = ring.bitOffset;
        if (offset !== null) {
          bit = bits[offset + i];
        }
      }

      // If bit is 0, we draw nothing (gap)
      if (bit === 0) {
        continue;
      }

      // Compute angles
      const startAngle = START_ANGLE + i * segmentAngle + gapAngle / 2;
      const endAngle = startAngle + dashAngle;

      // Choose stroke color
      const chosenColor = (ringIndex % 2 === 0) ? accentColor : altColor;

      // Draw the arc segment
      ctx.beginPath();
      ctx.arc(cx, cy, scaledRadius, startAngle, endAngle);
      ctx.strokeStyle = chosenColor;
      ctx.lineWidth = scaledLineWidth;
      ctx.lineCap = 'round';
      ctx.stroke();
    }
  });

  // STEP 4: Draw center circle
  ctx.beginPath();
  ctx.arc(cx, cy, CENTER_RADIUS * scale, 0, Math.PI * 2);
  ctx.fillStyle = darkColor;
  ctx.fill();

  // STEP 5: Draw center text
  if (centerText && centerText.trim().length > 0) {
    const fontSizePx = Math.floor(10 * scale);
    ctx.font = `bold ${fontSizePx}px monospace`;
    ctx.fillStyle = centerTextColor;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(centerText.slice(0, 3).toUpperCase(), cx, cy);
  }
}
