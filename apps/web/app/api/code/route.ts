import { NextRequest, NextResponse } from 'next/server';
import { validateId, encode, drawCircularCode } from '@circular-id/codec';
import { createCanvas } from 'canvas';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const rawId = searchParams.get('id');
    const rawSize = searchParams.get('size');
    const rawDark = searchParams.get('dark');
    const rawLight = searchParams.get('light');
    const rawAccent = searchParams.get('accent');
    const rawLabel = searchParams.get('label');
    const rawFormat = searchParams.get('format') || 'png';

    // 1. Validate ID existence
    if (!rawId) {
      return NextResponse.json(
        { error: 'Missing required query parameter: id' },
        { status: 400 }
      );
    }

    // 2. Validate format
    if (rawFormat === 'svg') {
      return NextResponse.json(
        { error: 'SVG export coming soon' },
        { status: 501 }
      );
    }

    // 3. Clean and validate ID digits
    const cleanedId = rawId.replace(/\D/g, '');
    if (cleanedId.length === 0) {
      return NextResponse.json(
        { error: 'Parameter id must contain at least one digit', param: 'id' },
        { status: 400 }
      );
    }

    const validation = validateId(cleanedId);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || 'Invalid ID', param: 'id' },
        { status: 400 }
      );
    }

    // 4. Size validation & clamping
    let size = 400;
    if (rawSize) {
      const parsedSize = parseInt(rawSize, 10);
      if (!isNaN(parsedSize)) {
        size = Math.max(200, Math.min(2000, parsedSize));
      }
    }

    // 5. Color sanitization (strip leading # if present)
    const sanitizeColor = (colorStr: string | null, fallback: string): string => {
      if (!colorStr) return fallback;
      const cleaned = colorStr.trim().replace(/^#/, '');
      // Match valid 3, 4, 6, 8 hex digits
      if (/^[0-9a-fA-F]{3,8}$/.test(cleaned)) {
        return `#${cleaned}`;
      }
      return fallback;
    };

    const darkColor = sanitizeColor(rawDark, '#000000');
    const lightColor = sanitizeColor(rawLight, '#ffffff');
    const accentColor = sanitizeColor(rawAccent, '#444444');
    const label = (rawLabel || 'ID').slice(0, 3);

    // 6. Encode
    const bits = encode(validation.cleaned);

    // 7. Render using node-canvas
    const canvas = createCanvas(size, size);
    const ctx = canvas.getContext('2d');

    drawCircularCode({
      ctx: ctx as any, // Cast because node-canvas 2d context is slightly different typing but compatible
      bits,
      size,
      darkColor,
      lightColor,
      accentColor: darkColor, // Data rings color matches darkColor
      altColor: accentColor,   // Alternate rings color matches accentColor
      centerText: label
    });

    const buffer = canvas.toBuffer('image/png');

    // 8. Return response
    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, stale-while-revalidate=600',
      },
    });
  } catch (error: any) {
    console.error('API route generation error:', error);
    return NextResponse.json(
      { error: error?.message || 'Server error generating circular code' },
      { status: 500 }
    );
  }
}
