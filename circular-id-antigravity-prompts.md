# Circular ID Code System — Antigravity Build Prompts
> Complete phase-by-phase prompts for building the custom circular barcode system end-to-end.
> Feed these prompts to Antigravity in order. Do NOT skip phases.

---

## BEFORE YOU START — Project Context (paste this first)

```
PROJECT CONTEXT (read before any phase):

We are building a proprietary circular ID code system. Think of it like a QR code but circular and custom — made of concentric rings of arc segments that encode a 20-digit numeric ID.

The system has two halves:
1. GENERATOR — takes a 20-digit numeric ID and draws a circular code (PNG/SVG)
2. SCANNER — takes a camera frame or image, finds the code, and extracts the 20-digit ID

The scanner's ONLY job is to return the ID string. It does not perform any business logic. The app using it decides what to do with the ID.

Tech stack:
- Frontend: Next.js (App Router) + TypeScript
- Styling: Tailwind CSS
- Canvas: HTML Canvas API (browser) + node-canvas (server)
- No OpenCV for V1 — pure JS pixel manipulation only
- Package structure: monorepo with packages/circular-id-codec as a shared lib

The encoding spec (MEMORISE THIS):
- 6 concentric rings, inside → outer: R1 (sync), R2 (data), R3 (data), R4 (data), R5 (data), R6 (sync)
- R1: 12 segments, alternating 1010... pattern, radius = 50px at reference size 400×400
- R2: 16 segments, holds BCD bits 0–15 (digits 1–4), radius = 76px
- R3: 24 segments, holds BCD bits 16–39 (digits 5–10), radius = 102px
- R4: 24 segments, holds BCD bits 40–63 (digits 11–16), radius = 128px
- R5: 24 segments, holds BCD bits 64–79 (digits 17–20) + bits 80–87 (8-bit checksum), radius = 154px
- R6: 32 segments, alternating 1010... pattern, radius = 180px
- Dash arc = bit 1, gap = bit 0
- Gap ratio: 28% of each segment angle is always empty. Dash fills the remaining 72%.
- BCD encoding: each decimal digit 0–9 → 4 bits MSB-first. Digit 7 = [0,1,1,1]
- Total data bits: 20 digits × 4 bits = 80 bits + 8 checksum bits = 88 bits
- Checksum: XOR of all 10 byte-pairs. byte_i = parseInt(id[i*2]) * 10 + parseInt(id[i*2+1])
- All angles start at -π/2 (12 o'clock), go clockwise
- Center circle: solid filled, radius = 22px at reference size, used as anchor by scanner
- Reference canvas size: 400×400px. All radii scale proportionally for other sizes.
- Line width for each ring: 10px at reference size (also scales proportionally)
```

---

## PHASE 1 — Codec Library (Encoder + Decoder)

### Prompt 1.1 — Project scaffold and codec library

```
PHASE 1 · PROMPT 1 OF 3

Task: Scaffold the monorepo and build the pure TypeScript codec library with zero dependencies.

Folder structure to create:
```
circular-id-system/
├── packages/
│   └── circular-id-codec/
│       ├── src/
│       │   ├── encode.ts
│       │   ├── decode.ts
│       │   ├── constants.ts
│       │   └── index.ts
│       ├── tests/
│       │   └── codec.test.ts
│       ├── package.json
│       └── tsconfig.json
├── apps/
│   └── web/                  ← Next.js app, scaffold later
├── package.json              ← workspace root
└── tsconfig.base.json
```

Step 1: Create workspace root package.json with "workspaces": ["packages/*", "apps/*"]

Step 2: Create packages/circular-id-codec/src/constants.ts

Define and export these constants exactly:
- REFERENCE_SIZE = 400 (canvas size all radii are based on)
- CENTER_X = 200, CENTER_Y = 200
- CENTER_RADIUS = 22 (the solid anchor circle)
- GAP_RATIO = 0.28 (28% of each segment angle is always a gap)
- RINGS: an array of 6 ring descriptor objects, each with:
    { radius, lineWidth, segments, kind: 'sync' | 'data', bitOffset: number | null }
  Values:
    [0]: radius=50,  lineWidth=10, segments=12, kind='sync', bitOffset=null
    [1]: radius=76,  lineWidth=10, segments=16, kind='data', bitOffset=0
    [2]: radius=102, lineWidth=10, segments=24, kind='data', bitOffset=16
    [3]: radius=128, lineWidth=10, segments=24, kind='data', bitOffset=40
    [4]: radius=154, lineWidth=10, segments=24, kind='data', bitOffset=64
    [5]: radius=180, lineWidth=8,  segments=32, kind='sync', bitOffset=null
- TOTAL_BITS = 88
- DATA_BITS = 80
- CHECKSUM_BITS = 8
- START_ANGLE = -Math.PI / 2

Step 3: Create packages/circular-id-codec/src/encode.ts

Export a function: encode(id: string): number[]

Logic (implement exactly):
1. Strip all non-digit characters from input
2. If empty after stripping, throw Error('ID must contain at least one digit')
3. Left-pad with '0' characters until exactly 20 characters long
4. Slice to 20 if longer than 20
5. BCD encode: for each of the 20 digits, push 4 bits MSB-first into a bits array:
   digit = parseInt(char)
   push (digit >> 3) & 1
   push (digit >> 2) & 1
   push (digit >> 1) & 1
   push  digit       & 1
6. Compute checksum: XOR of 10 byte-pairs
   let cs = 0
   for i from 0 to 9: cs ^= (parseInt(padded[i*2]) * 10 + parseInt(padded[i*2+1]))
7. Append checksum as 8 bits MSB-first (bit 7 down to bit 0)
8. Return the bits array (length must be exactly 88)

Step 4: Create packages/circular-id-codec/src/decode.ts

Export a function: decode(bits: number[]): string

Logic:
1. If bits.length !== 88, throw Error('Expected 88 bits, got ' + bits.length)
2. Extract 20 digits via BCD: for i 0–19, read bits[i*4] to bits[i*4+3]
   digit = b0*8 + b1*4 + b2*2 + b3
   if digit > 9, throw Error('Invalid BCD nibble at position ' + i + ': ' + digit)
   append digit to id string
3. Recompute checksum from the decoded id string (same formula as encoder)
4. Read stored checksum from bits[80..87] (8 bits, MSB-first)
5. If computed checksum !== stored checksum, throw Error('Checksum mismatch: expected X got Y')
6. Return the 20-character id string (with leading zeros preserved)

Step 5: Create packages/circular-id-codec/src/index.ts
Export everything from encode.ts, decode.ts, and constants.ts.

Step 6: Create packages/circular-id-codec/tests/codec.test.ts
Write tests using vitest (or jest — whichever you scaffold):
- Test: encode('12345678901234567890') returns array of length 88
- Test: encode then decode on the same ID returns the same 20-char string
- Test: encode('5') pads to '00000000000000000005' and round-trips correctly
- Test: decode with corrupted bit throws checksum error
- Test: encode with non-digit characters strips them correctly
- Test: fuzz test — generate 500 random 20-digit IDs, encode then decode each, assert exact match
- Test: encode('') throws an error

Do NOT add any canvas, DOM, or browser imports to this package. It must run in Node with zero dependencies beyond TypeScript itself.
```

### Prompt 1.2 — Validate and harden the codec

```
PHASE 1 · PROMPT 2 OF 3

Task: Run the tests. Fix any failures. Then add these hardening checks.

1. Run the test suite. Paste all output. Fix any failures before continuing.

2. Add an encodeSafe function to encode.ts:
   encodeSafe(id: string): { ok: true; bits: number[] } | { ok: false; error: string }
   Wraps encode() in try/catch, never throws.

3. Add a decodeSafe function to decode.ts:
   decodeSafe(bits: number[]): { ok: true; id: string } | { ok: false; error: string }
   Wraps decode() in try/catch, never throws.

4. Add a validateId function to index.ts:
   validateId(input: string): { valid: boolean; cleaned: string; error?: string }
   - strips non-digits
   - returns valid: false if empty after stripping
   - returns valid: true with cleaned = left-padded 20-char string if OK
   - does NOT throw

5. Export all four new functions from index.ts.

6. Add tests for the safe variants — they must never throw even on garbage input like null, undefined cast to string, empty string, a string of 100 random chars.

7. Run tests again. All must pass before declaring Phase 1 done.
```

### Prompt 1.3 — Document the codec API

```
PHASE 1 · PROMPT 3 OF 3

Task: Write the developer README for the codec package. This is important because the scanner in Phase 3 imports from this package and the author needs to know the exact API.

Create packages/circular-id-codec/README.md with these sections:

1. Overview — one paragraph explaining what the package does and what the encoding format is
2. Installation — how to import it from within the monorepo
3. API Reference — document all exported functions with TypeScript signatures and example input/output
4. Encoding Specification — document the ring structure, BCD encoding, checksum formula, bit layout
5. Error conditions — list every error message the package can throw and what causes each one

No code generation required in this prompt. Just the README.
```

---

## PHASE 2 — Generator / Renderer

### Prompt 2.1 — Core renderer function

```
PHASE 2 · PROMPT 1 OF 4

Task: Build the core drawing function that renders a circular ID code onto an HTML Canvas context.

Create: packages/circular-id-codec/src/renderer.ts

This file must work in BOTH browser (HTMLCanvasElement) and Node (node-canvas). Do not import any DOM types directly — accept the canvas context as a parameter.

Export this function:
  drawCircularCode(options: DrawOptions): void

Where DrawOptions is:
  {
    ctx: CanvasRenderingContext2D  // already-created 2d context
    bits: number[]                 // 88-bit array from encode()
    size: number                   // canvas is size×size pixels
    darkColor?: string             // defaults to '#000000'
    lightColor?: string            // defaults to '#ffffff' (background)
    accentColor?: string           // color of primary data rings (defaults to darkColor)
    altColor?: string              // color of alternate rings for visual style (defaults to '#444444')
    centerText?: string            // up to 3 chars shown in center circle, optional
    centerTextColor?: string       // defaults to lightColor
  }

Implementation steps (do each in order):

STEP 1: Compute scale factor
  scale = size / REFERENCE_SIZE  (import REFERENCE_SIZE = 400 from constants.ts)
  Every radius and lineWidth from the RINGS array must be multiplied by scale before use.
  Center is always (size/2, size/2).

STEP 2: Fill background
  ctx.fillStyle = lightColor
  Fill the entire canvas.

STEP 3: Draw each ring
  For each ring descriptor in RINGS array (in order, ring index 0 to 5):
    scaledRadius   = ring.radius   × scale
    scaledLineWidth = ring.lineWidth × scale
    segmentAngle   = (2 * Math.PI) / ring.segments
    gapAngle       = segmentAngle × GAP_RATIO
    dashAngle      = segmentAngle - gapAngle

    For each segment index i from 0 to ring.segments - 1:
      Determine bit value:
        if ring.kind === 'sync': bit = (i % 2 === 0) ? 1 : 0
        if ring.kind === 'data': bit = bits[ring.bitOffset + i]

      If bit === 0: skip (this segment is a gap, draw nothing)

      Compute arc angles:
        startAngle = START_ANGLE + i * segmentAngle + gapAngle / 2
        endAngle   = startAngle + dashAngle

      Choose stroke color:
        ringIndex % 2 === 0 ? accentColor : altColor

      Draw the arc:
        ctx.beginPath()
        ctx.arc(cx, cy, scaledRadius, startAngle, endAngle)
        ctx.strokeStyle = chosenColor
        ctx.lineWidth = scaledLineWidth
        ctx.lineCap = 'round'
        ctx.stroke()

STEP 4: Draw center circle
  ctx.beginPath()
  ctx.arc(cx, cy, CENTER_RADIUS * scale, 0, Math.PI * 2)
  ctx.fillStyle = darkColor
  ctx.fill()

STEP 5: Draw center text (if centerText is provided)
  fontSizePx = Math.floor(10 * scale)
  ctx.font = `bold ${fontSizePx}px monospace`
  ctx.fillStyle = centerTextColor
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(centerText.slice(0, 3).toUpperCase(), cx, cy)

Export DrawOptions type from index.ts as well.

After writing the file, write a quick sanity-check script (not a test — just a Node script) that:
- imports encode from the codec
- imports drawCircularCode from renderer
- creates a node-canvas 400×400
- encodes '12345678901234567890'
- draws it
- saves to /tmp/test-code.png

Run it and confirm the PNG is created without errors. Do NOT proceed to the next prompt if errors occur.
```

### Prompt 2.2 — Next.js generator page

```
PHASE 2 · PROMPT 2 OF 4

Task: Scaffold the Next.js app and build the Generator page.

Step 1: Scaffold apps/web as a Next.js 14 App Router project with TypeScript and Tailwind CSS.
In tsconfig.json, add a path alias for the codec: "@circular-id/codec": ["../../packages/circular-id-codec/src/index"]

Step 2: Create the generator page at apps/web/app/generate/page.tsx

This is a client component ('use client'). It renders:

A. An input field for the 20-digit ID
   - type="text" with maxLength={20}
   - only allows digit characters (filter on change)
   - shows a counter "X / 20 digits" below it
   - shows a green checkmark icon when exactly 20 digits entered
   - shows an error message if non-digit characters are typed

B. A color picker row:
   - "Ring color" — color input, defaults to #000000
   - "Background" — color input, defaults to #ffffff
   - "Accent rings" — color input, defaults to #444444

C. A text input for the center label (max 3 chars, defaults to "ID")

D. A canvas element (400×400) that live-previews the code as the user types

E. A "Download PNG" button:
   - calls canvas.toDataURL('image/png')
   - triggers a download with filename circular-id-{id}.png

F. A "Copy SVG" button (implement in the next prompt — leave as disabled for now with "Coming soon" tooltip)

State management:
- Use React useState for: idInput, ringColor, bgColor, accentColor, centerLabel
- Use useRef for the canvas element
- Use useEffect that triggers whenever any input changes:
  1. Call validateId(idInput) from the codec — if invalid, clear canvas and show error
  2. If valid, call encode(cleaned) → bits
  3. Get canvas 2d context
  4. Call drawCircularCode({ ctx, bits, size: 400, darkColor: ringColor, lightColor: bgColor, altColor: accentColor, centerText: centerLabel })

Error states:
- If ID is empty: show placeholder "Enter an ID to preview"
- If ID has fewer than 20 digits: show "Padded to 20 digits with leading zeros" info message
- If encoding fails (should not happen with validateId): show "Encoding error" in red

Styling: use Tailwind. Dark card background for the canvas area. Clean minimal layout. Mobile-friendly.
```

### Prompt 2.3 — Server-side PNG API route

```
PHASE 2 · PROMPT 3 OF 4

Task: Build a Next.js API route that generates codes server-side, so codes can be embedded in emails, PDFs, and third-party systems via a simple URL.

Create: apps/web/app/api/code/route.ts

It handles GET requests with these query parameters:
  - id (required): the numeric ID string, 1–20 digits
  - size (optional): output size in pixels, default 400, min 200, max 2000
  - dark (optional): hex color without #, default 000000
  - light (optional): hex color without #, default ffffff
  - accent (optional): hex color without #, default 444444
  - label (optional): center text up to 3 chars, default ID
  - format (optional): 'png' or 'svg', default 'png'

Logic:
1. Parse and validate all query params. Return 400 JSON error if id is missing or contains non-digits.
2. Clamp size to 200–2000.
3. Call validateId(id) from codec. Return 400 if invalid.
4. Call encode(cleaned) to get bits.
5. Create a node-canvas of size×size.
6. Call drawCircularCode with all options.
7. Return canvas.toBuffer('image/png') with Content-Type: image/png.
8. Set Cache-Control: public, max-age=86400 (codes are deterministic — same params = same image).

For the SVG format option — return 501 Not Implemented for now with JSON { error: 'SVG export coming soon' }.

Error responses must always be JSON with shape: { error: string, param?: string }

Add input sanitisation: strip the '#' from color params if the user accidentally included it.

Test the route manually:
  curl "http://localhost:3000/api/code?id=12345678901234567890&size=400" --output /tmp/api-test.png
  open /tmp/api-test.png

Confirm it opens and looks correct before proceeding.
```

### Prompt 2.4 — Batch generator and export utilities

```
PHASE 2 · PROMPT 4 OF 4

Task: Add bulk generation capability — generate codes for a list of IDs at once.

Part A: Create a server action at apps/web/app/actions/generateBatch.ts

Function: generateBatch(ids: string[]): Promise<{ id: string; pngBase64: string; error?: string }[]>

- Accepts up to 100 IDs per call. If more than 100, process only first 100 and include a warning.
- For each ID: validate → encode → draw → export as base64 PNG string.
- If an individual ID fails, include { id, error: errorMessage } in the result without crashing the whole batch.
- Run all generations in parallel using Promise.all.

Part B: Create a batch download utility at apps/web/lib/downloadBatch.ts

Function: downloadBatchAsZip(results: { id: string; pngBase64: string }[]): void

- Uses the JSZip library (install it)
- Creates a ZIP file with one PNG per result, named {id}.png
- Triggers browser download of the ZIP as circular-id-codes.zip

Part C: Create a simple batch UI at apps/web/app/batch/page.tsx

UI:
- A textarea where the user pastes one ID per line (max 100 lines)
- A "Generate All" button
- A results grid showing thumbnails (img tags with base64 src) of each code
- Each thumbnail shows the ID below it
- A "Download All as ZIP" button that calls downloadBatchAsZip

Validation display:
- Show a count: "X valid / Y invalid IDs"
- Invalid IDs are listed in red with the reason (non-numeric, empty, etc.)
- Valid IDs show their thumbnails

Do not call the API route from the batch page — use the server action directly for performance.
```

---

## PHASE 3 — Decoder Library

### Prompt 3.1 — Image preprocessing pipeline

```
PHASE 3 · PROMPT 1 OF 4

Task: Build the image preprocessing pipeline — the first step of the decoder that converts raw pixel data into a clean binary image ready for analysis.

Create: packages/circular-id-codec/src/decoder/preprocess.ts

The decoder works on ImageData — a flat Uint8ClampedArray of RGBA values (4 bytes per pixel, row by row). This format is what you get from canvas.getImageData() in the browser.

IMPORTANT: This file must have zero browser dependencies. Accept raw pixel data as a typed array with explicit width and height parameters.

Export this type:
  type GrayImage = {
    data: Uint8Array   // one luminance value per pixel
    width: number
    height: number
  }

Export these functions:

1. toGrayscale(rgba: Uint8ClampedArray, width: number, height: number): GrayImage
   For each pixel at index i (0 to width*height - 1):
     r = rgba[i * 4]
     g = rgba[i * 4 + 1]
     b = rgba[i * 4 + 2]
     luminance = Math.round(0.299 * r + 0.587 * g + 0.114 * b)
   Store luminance in output Uint8Array at index i.

2. computeOtsuThreshold(gray: GrayImage): number
   Implements Otsu's binarisation threshold selection.
   Algorithm:
     a. Build histogram: count[v] = number of pixels with luminance v, for v in 0..255
     b. Total pixels = width * height
     c. Compute sum of all (v * count[v]) for v in 0..255
     d. Sweep threshold t from 1 to 254:
        - weightBackground = sum of count[0..t-1] / total
        - weightForeground = 1 - weightBackground
        - meanBackground = (sum of v*count[v] for v 0..t-1) / count in background
        - meanForeground = (sum of v*count[v] for v t..255) / count in foreground
        - betweenClassVariance = weightBackground * weightForeground * (meanBackground - meanForeground)²
     e. Return t that maximises betweenClassVariance
   If all pixels are the same color (no variance), return 128.

3. binarise(gray: GrayImage, threshold: number): Uint8Array
   Returns flat array same size as gray.data.
   pixel < threshold → 1 (dark, this is where our arcs are)
   pixel >= threshold → 0 (light, background)

4. preprocess(rgba: Uint8ClampedArray, width: number, height: number): { binary: Uint8Array; threshold: number; width: number; height: number }
   Calls toGrayscale → computeOtsuThreshold → binarise.
   Returns the binary map and the threshold used (for debugging).

Export GrayImage type from index.ts.
Write unit tests:
- toGrayscale of a single red pixel (255,0,0,255) should return approximately 76
- toGrayscale of white (255,255,255,255) should return 255
- toGrayscale of black (0,0,0,255) should return 0
- computeOtsuThreshold on a 50/50 black-and-white image should return ~127
- binarise: pixel with value below threshold maps to 1, above maps to 0
```

### Prompt 3.2 — Center circle detection

```
PHASE 3 · PROMPT 2 OF 4

Task: Build the center detection module. This is the most critical step — everything else depends on finding (cx, cy) accurately.

Create: packages/circular-id-codec/src/decoder/centerDetect.ts

Context: The circular ID code always has a solid filled dark circle at its center. In the binary image (from preprocess.ts), this circle is a contiguous blob of 1s. We need to find it and return its centroid and radius.

Export this type:
  type CenterResult = {
    cx: number       // x coordinate of centroid
    cy: number       // y coordinate of centroid
    radius: number   // estimated radius of center circle in pixels
    confidence: number  // 0–1 score of how confident the detection is
  }

Export this function:
  findCenter(binary: Uint8Array, width: number, height: number): CenterResult | null

Algorithm (implement step by step):

STEP 1: Find all dark pixel runs
  Scan every row. For each row, collect contiguous runs of 1s (dark pixels).
  Store as: { row, colStart, colEnd, length }

STEP 2: Build connected blobs
  Use a simple flood-fill or run-length union-find approach to group connected dark pixels into blobs.
  For V1 simplicity: use a stack-based flood fill starting from the darkest/densest region.

  Practical V1 approach that works well:
  - Scan the binary image in a 3×3 grid of zones (9 zones total)
  - In each zone, find the pixel with the highest density of dark neighbors (3×3 window)
  - These are candidate center seeds
  - From the highest-scoring seed, flood fill (4-connectivity) collecting all connected dark pixels
  - Stop flood fill after 50,000 pixels (prevents runaway on bad images)

STEP 3: For the largest blob found:
  - Compute centroid: cx = mean of all x coords, cy = mean of all y coords
  - Compute equivalent radius: r = sqrt(pixelCount / Math.PI)
  - Compute circularity score: 
      perimeter = count of blob pixels adjacent to at least one 0 pixel
      circularity = (4 * Math.PI * pixelCount) / (perimeter * perimeter)
      Perfect circle = 1.0, irregular shapes < 1.0

STEP 4: Compute confidence
  confidence = Math.min(1, circularity) * Math.min(1, pixelCount / 200)
  (penalise very small blobs and non-circular shapes)

STEP 5: Reject if confidence < 0.3. Return null.

STEP 6: Return { cx, cy, radius, confidence }

Also export a helper:
  estimateCodeScale(centerRadius: number): number
  Returns: centerRadius / CENTER_RADIUS
  (CENTER_RADIUS = 22 from constants.ts — the reference center circle radius)
  This scale factor converts all reference radii to pixel radii in the actual image.

Write tests:
- Create a synthetic 200×200 binary image with a solid circle of radius 15 at (100, 100)
- findCenter should return cx ≈ 100, cy ≈ 100, radius ≈ 15, confidence > 0.7
- Empty binary image (all zeros) should return null
- Single pixel should return null (confidence too low)
```

### Prompt 3.3 — Ring sampler and bit extractor

```
PHASE 3 · PROMPT 3 OF 4

Task: Build the ring sampler — reads pixel brightness at each ring's expected radius and converts samples to a 88-bit array.

Create: packages/circular-id-codec/src/decoder/ringsampler.ts

This is the step that actually reads the encoded data from the image.

Context: We know (cx, cy) and scale from Phase 3 Prompt 2. Every ring's radius in pixels = ring.radius × scale. For each ring we sample N points around the circle (N = ring.segments). At each point we read the brightness and decide: dark (1) or light (0).

Export this type:
  type SampleResult = {
    bits: number[]         // 88 bits extracted
    syncR1Valid: boolean   // did R1 alternating pattern validate?
    syncR6Valid: boolean   // did R6 alternating pattern validate?
    perRingThresholds: number[]  // one threshold per ring for debugging
  }

Export this function:
  sampleRings(
    binary: Uint8Array,
    width: number,
    height: number,
    cx: number,
    cy: number,
    scale: number,
    angleOffset?: number  // rotational offset in radians, default 0
  ): SampleResult | null

Algorithm:

STEP 1: For each ring (0–5):
  scaledRadius = ring.radius × scale
  segmentAngle = (2 × Math.PI) / ring.segments

  For each segment index i (0 to segments-1):
    sampleAngle = START_ANGLE + angleOffset + i × segmentAngle + (segmentAngle × GAP_RATIO / 2) + (segmentAngle × (1 - GAP_RATIO) / 2)
    ↑ this samples the MIDDLE of the dash area, avoiding the gap

    px = Math.round(cx + scaledRadius × Math.cos(sampleAngle))
    py = Math.round(cy + scaledRadius × Math.sin(sampleAngle))

    Clamp px to [0, width-1], py to [0, height-1]

    pixelIdx = py × width + px
    rawSample = binary[pixelIdx]   // 0 or 1 from preprocess

    Store rawSample in a per-ring sample buffer

STEP 2: Per-ring adaptive threshold
  For each ring, compute the mean brightness of all its samples.
  If mean > 0.6: most segments are lit → dark segments are bits=1 (no inversion needed)
  If mean < 0.4: most segments are dark → light segments might be 1 (possible inversion)
  For simplicity in V1: trust the binary directly. Per-ring threshold just validates consistency.
  
  After sampling, compute per-ring confidence:
    confidence = how bimodal the ring's samples are (either 0 or 1, not many 0.5s)
    Since binary is already 0/1, this is trivially high. Keep for future when using grayscale.

STEP 3: Validate sync rings
  R1 (index 0) must be alternating: sample[0]=1, sample[1]=0, sample[2]=1, ...
  R6 (index 5) must be alternating: same pattern.
  syncValid = true if at least 10 out of 12 (R1) or 28 out of 32 (R6) segments match expected.
  Allow up to 2 mismatches in R1 and up to 4 in R6 (tolerance for noise).
  If either sync ring fails: return null.

STEP 4: Assemble bits array (88 bits)
  Read data rings R2–R5 in order.
  R2: samples[0..15] → bits[0..15]
  R3: samples[0..23] → bits[16..39]
  R4: samples[0..23] → bits[40..63]
  R5: samples[0..23] → bits[64..87]

STEP 5: Return SampleResult.

Also export:
  tryAllRotations(
    binary: Uint8Array,
    width: number,
    height: number,
    cx: number,
    cy: number,
    scale: number
  ): SampleResult | null

  This tries 12 different angle offsets (0, 30°, 60°, ... 330° converted to radians).
  Returns the first SampleResult where both sync rings are valid.
  Returns null if none work.
  
  Why: the image might be rotated. The 12 tries cover every 30° increment. Since our segments
  are multiples of 30° apart (360/12 = 30), this covers all possible alignments.
```

### Prompt 3.4 — Full decoder function and integration

```
PHASE 3 · PROMPT 4 OF 4

Task: Wire all decoder modules together into a single decode function and write the integration tests.

Create: packages/circular-id-codec/src/decoder/index.ts

Export this function:
  decodeImage(
    rgba: Uint8ClampedArray,
    width: number,
    height: number
  ): DecodeResult

Where DecodeResult is:
  type DecodeResult =
    | { ok: true;  id: string; confidence: number; debug: DecodeDebugInfo }
    | { ok: false; error: string; stage: 'preprocess' | 'center' | 'sample' | 'decode'; debug: DecodeDebugInfo }

And DecodeDebugInfo is:
  type DecodeDebugInfo = {
    threshold?: number
    centerFound?: { cx: number; cy: number; radius: number; confidence: number }
    scale?: number
    syncR1Valid?: boolean
    syncR6Valid?: boolean
    bitsExtracted?: number[]
    angleOffsetUsed?: number
  }

Pipeline:
1. preprocess(rgba, width, height) → { binary, threshold }
2. findCenter(binary, width, height) → centerResult or null → if null, return { ok: false, stage: 'center', error: 'Center circle not found' }
3. scale = estimateCodeScale(centerResult.radius)
4. tryAllRotations(binary, width, height, cx, cy, scale) → sampleResult or null → if null, return { ok: false, stage: 'sample', error: 'Sync rings not detected — image may be blurred, too small, or too skewed' }
5. decodeSafe(sampleResult.bits) → if not ok, return { ok: false, stage: 'decode', error: result.error }
6. Return { ok: true, id: result.id, confidence: centerResult.confidence × 0.7 + 0.3 (normalise), debug: full debug info }

Re-export decodeImage from the main packages/circular-id-codec/src/index.ts.

Integration tests in packages/circular-id-codec/tests/decoder.test.ts:

For these tests you need to generate real PNG images and decode them. Use node-canvas:

Test 1 — Round-trip perfect:
  - Encode '12345678901234567890'
  - Draw at 400×400
  - Read back via ctx.getImageData(0, 0, 400, 400)
  - Pass to decodeImage
  - Assert result.ok === true
  - Assert result.id === '12345678901234567890'

Test 2 — Round-trip small size (200×200):
  Same as test 1 but drawn at 200×200. Should still decode correctly.

Test 3 — Round-trip large size (800×800):
  Same at 800×800.

Test 4 — Round-trip with white-on-black colors (inverted):
  Draw with darkColor='#ffffff', lightColor='#000000'
  Decode should still work (Otsu handles both orientations).

Test 5 — Corrupted image:
  Pass a 100×100 solid white RGBA buffer.
  Assert result.ok === false, stage === 'center'.

Test 6 — Wrong size buffer:
  Pass a buffer that is too small for the claimed width×height.
  Should return ok: false without crashing.

Run all tests. All must pass. Fix anything that doesn't.
```

---

## PHASE 4 — Camera Scanner UI

### Prompt 4.1 — Scanner React component

```
PHASE 4 · PROMPT 1 OF 3

Task: Build the camera scanner as a reusable React component.

Create: apps/web/components/CircularIdScanner.tsx

This is a client component. It:
1. Opens the device camera (rear camera on mobile)
2. Continuously captures frames
3. Runs decodeImage on each frame
4. Fires a callback with the ID when a successful scan is debounced

Props:
  type ScannerProps = {
    onScan: (id: string) => void          // called when ID is confidently detected
    onError?: (error: string) => void     // optional error callback
    width?: number                        // display width, default 320
    height?: number                       // display height, default 320
    scanIntervalMs?: number               // how often to attempt decode, default 250
    debounceCount?: number                // how many consecutive matches before firing, default 3
    cropRatio?: number                    // 0–1, center crop of frame to send to decoder, default 0.7
    active?: boolean                      // start/stop scanning, default true
  }

Internal state:
  - status: 'idle' | 'requesting' | 'scanning' | 'found' | 'error'
  - lastId: string | null (last decoded ID, for debounce tracking)
  - consecutiveMatches: number (increments when same ID decoded repeatedly)
  - errorMessage: string | null

Refs:
  - videoRef: HTMLVideoElement
  - canvasRef: HTMLCanvasElement (hidden, used for frame capture)
  - overlayCanvasRef: HTMLCanvasElement (visible, drawn on top of video for targeting UI)
  - streamRef: MediaStream (for cleanup)
  - intervalRef: ReturnType<typeof setInterval>

Implementation:

CAMERA SETUP (useEffect on mount if active === true):
  1. navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } } })
  2. Set videoRef.current.srcObject = stream
  3. Call videoRef.current.play()
  4. Set status = 'scanning'
  5. Start the scan interval (see below)
  6. On cleanup: stop all stream tracks, clear interval

SCAN INTERVAL:
  Every scanIntervalMs milliseconds:
  1. If video is not playing or paused, skip
  2. Draw video to hidden canvas (full video frame):
     hiddenCtx.drawImage(video, 0, 0, canvasWidth, canvasHeight)
  3. Compute crop region (center cropRatio of the canvas):
     cropW = Math.floor(canvasWidth * cropRatio)
     cropH = Math.floor(canvasHeight * cropRatio)
     cropX = Math.floor((canvasWidth - cropW) / 2)
     cropY = Math.floor((canvasHeight - cropH) / 2)
  4. Get pixel data of the crop: hiddenCtx.getImageData(cropX, cropY, cropW, cropH)
  5. Call decodeImage(imageData.data, cropW, cropH) from the codec
  6. If result.ok === true:
     - If result.id === lastId: increment consecutiveMatches
     - Else: reset consecutiveMatches to 1, set lastId = result.id
     - If consecutiveMatches >= debounceCount: fire onScan(result.id), set status = 'found', stop interval
  7. If result.ok === false: reset consecutiveMatches to 0

OVERLAY CANVAS (drawn every animation frame):
  Draw a targeting square in the center of the overlay canvas:
  - Size: cropRatio × display size
  - Style:
    - status === 'scanning': white rounded rectangle outline, 2px, opacity 0.8
    - status === 'found': green filled rounded rectangle, 20% opacity + green outline
  - Corner markers: draw L-shaped corner lines at each corner (common scanner aesthetic)
  - Status text below the box:
    - 'scanning': "Align code within frame"
    - 'found': "✓ ID: {lastId}"
    - 'error': errorMessage in red

RENDER:
  <div style={{ position: 'relative', width, height, borderRadius: 12, overflow: 'hidden', background: '#000' }}>
    <video ref={videoRef} style={{ width: '100%', height: '100%', objectFit: 'cover' }} playsInline muted />
    <canvas ref={overlayCanvasRef} style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }} />
    <canvas ref={canvasRef} style={{ display: 'none' }} />
  </div>

Note: the hidden canvas must be the actual video resolution (not display size) for accurate pixel sampling.
```

### Prompt 4.2 — Scanner page and integration

```
PHASE 4 · PROMPT 2 OF 3

Task: Build the scanner page and wire the CircularIdScanner component into it.

Create: apps/web/app/scan/page.tsx

This is a client component. It uses the CircularIdScanner component.

Page layout:
1. Header: "Scan ID Code" title + a small info icon that shows a tooltip explaining what the scanner does
2. Scanner area: render <CircularIdScanner /> centered on screen
3. Result area below the scanner:
   - When no scan yet: show "Point camera at a circular ID code"
   - When scanning: show the scanner component with live status
   - When ID found: slide up a result card showing:
       - Large ID text (monospace, formatted as groups of 4 for readability: 1234 5678 9012 3456 7890)
       - A "Copy ID" button that copies to clipboard and shows "Copied!" for 2 seconds
       - A "Scan Again" button that resets the scanner
       - A small timestamp: "Scanned at HH:MM:SS"
4. History section at the bottom:
   - Shows last 5 scanned IDs (stored in component state, not persisted)
   - Each entry: ID + timestamp + a copy button
   - "Clear history" button

Handle these states gracefully:
- Camera permission denied: show a message explaining how to enable camera in browser settings, with a link to the generator page as an alternative
- No camera available (desktop without webcam): show "No camera found. Use the image upload scanner instead." with a button (the image upload UI is in the next prompt — leave the button disabled for now)
- HTTPS not available: show warning "Camera requires a secure connection (HTTPS)"

Check for HTTPS: typeof window !== 'undefined' && (window.location.protocol === 'https:' || window.location.hostname === 'localhost')

Add error boundary wrapping the scanner component so a crash in the decoder never crashes the whole page.
```

### Prompt 4.3 — Image upload scanner and navigation

```
PHASE 4 · PROMPT 3 OF 3

Task: Add image upload scanning (for desktop users or when camera is unavailable) and build the site navigation.

Part A: Image upload scanner

Add an "Upload Image" tab to apps/web/app/scan/page.tsx alongside the camera scanner tab.

The upload UI:
1. Drag-and-drop zone (also supports click to browse)
   - Accepts image files: JPEG, PNG, WEBP, GIF
   - Max file size: 10MB
   - Shows a dashed border upload zone with icon and "Drop image here or click to browse"
2. When file is dropped/selected:
   a. Create an HTMLImageElement and load the file via FileReader → readAsDataURL
   b. Draw the loaded image to a hidden canvas (max 1200px on longest side, maintain aspect ratio)
   c. Get ImageData from the canvas
   d. Call decodeImage() from the codec
   e. Display the result (same result card UI as the camera scanner)
3. Error states:
   - File too large: "File exceeds 10MB limit"
   - Not an image: "Please upload an image file"
   - Decode failed: show the decode error and which stage failed, e.g. "Could not detect center circle — try a clearer, well-lit photo"

Part B: Navigation

Create apps/web/components/Nav.tsx — a simple top navigation bar:
- Logo: "◎ Circular ID" (monospace)
- Links: Generate | Batch | Scan
- Active link highlighted
- Mobile: hamburger menu that toggles a drawer

Add the Nav component to apps/web/app/layout.tsx.

Part C: Home page

Create apps/web/app/page.tsx — a simple landing page:
- Hero: "Generate and scan circular ID codes" + brief one-paragraph description
- Two CTA buttons: "Generate a Code" → /generate, "Scan a Code" → /scan
- A static preview image (use the canvas API to draw a demo code server-side at build time using generateStaticParams, or just import a pre-generated PNG)
- Below hero: three feature cards explaining: "Proprietary format", "Scan with any camera", "20-digit ID storage"

Part D: Final check

Run the full Next.js dev server. Manually test:
1. Generate a code for ID 12345678901234567890 at /generate
2. Download the PNG
3. Go to /scan → Upload Image tab
4. Upload the downloaded PNG
5. Confirm it decodes back to 12345678901234567890

If this round-trip works, Phase 4 is complete.
```

---

## PHASE 5 — Polish, Hardening & Deployment

### Prompt 5.1 — Error hardening and edge cases

```
PHASE 5 · PROMPT 1 OF 2

Task: Harden the entire system against real-world failure modes.

CODEC HARDENING:

1. Add to decode.ts — handle partial sync ring failures:
   If syncR1Valid is false but syncR6Valid is true (or vice versa), still attempt decode.
   Only reject (return null from sampleRings) if BOTH sync rings fail.
   Update the tolerance: allow up to 3/12 mismatches in R1, 5/32 in R6.

2. Add multi-sample averaging to ringsampler.ts:
   Instead of sampling one pixel per segment, sample 3 pixels per segment at:
     - inner edge of arc (scaledRadius - scaledLineWidth * 0.3)
     - center of arc (scaledRadius)
     - outer edge of arc (scaledRadius + scaledLineWidth * 0.3)
   Average the 3 binary values and threshold at 0.5 for the final bit.
   This reduces single-pixel noise errors significantly.

3. Add perspective rejection to centerDetect.ts:
   After finding (cx, cy), sample R1 sync ring at 4 quadrants (0°, 90°, 180°, 270°).
   Compute the ratio of detected arc radius at each quadrant vs expected radius.
   If any quadrant varies by more than 20% from the mean → image is skewed → return null with error 'Image appears skewed — hold camera straight'.

SCANNER UI HARDENING:

4. Add torch/flashlight toggle to CircularIdScanner (mobile only):
   Check if track.getCapabilities().torch exists. If yes, show a torch button.
   Toggle via track.applyConstraints({ advanced: [{ torch: true/false }] }).

5. Add scan timeout to CircularIdScanner:
   If no successful scan occurs within 15 seconds, show a message: "Having trouble? Try better lighting or move closer."

6. Add frame quality check before attempting decode:
   Before calling decodeImage, compute the standard deviation of a 50×50 center crop of the grayscale image.
   If stddev < 8 (image is nearly uniform — blank wall, too dark, too bright), skip this frame.
   This saves decoder CPU on frames that have no useful content.

API HARDENING:

7. Add rate limiting to apps/web/app/api/code/route.ts:
   Use a simple in-memory Map with IP → { count, resetAt }.
   Allow max 60 requests per minute per IP.
   Return 429 with Retry-After header if exceeded.
   (For production, replace with Redis — note this in a TODO comment)

8. Add input sanitisation to the batch action:
   Reject if any individual ID in the array is longer than 20 digits even before stripping.
   Log rejected IDs at warn level.
```

### Prompt 5.2 — README, environment setup, and deployment config

```
PHASE 5 · PROMPT 2 OF 2

Task: Write the production README and deployment configuration.

Part A: Root README.md

Sections:
1. Project overview — what this is, what it does, who it's for
2. Architecture diagram (text-based ASCII, showing: codec lib → renderer → generator page → API route; and: camera/image → decoder → scanner page)
3. Quick start — clone, install, dev server commands
4. Package breakdown — explain what each package/app does
5. Encoding format reference — full spec (ring layout, BCD, checksum, bit positions)
6. API reference — document the /api/code GET endpoint with all params and examples
7. Scanner integration — how to embed the CircularIdScanner React component in another app
8. Deployment notes

Part B: Environment and deployment

Create apps/web/.env.example with comments explaining any env vars (even if empty for now — leave placeholders for future Redis URL, analytics key, etc.).

Create apps/web/next.config.ts:
- Enable standalone output for Docker deployment
- Add Content Security Policy headers
- Add cache headers for the /api/code route (Cache-Control: public, max-age=86400)
- Disable x-powered-by header

Create Dockerfile at project root:
- Multi-stage build: deps → builder → runner
- Use node:20-alpine
- Copy only the apps/web app and packages/circular-id-codec into the runner stage
- Expose port 3000
- Set NODE_ENV=production

Create .github/workflows/ci.yml:
- Trigger on push to main and on PRs
- Jobs:
  1. lint: run eslint on all packages
  2. test: run vitest on circular-id-codec (all test files)
  3. build: run next build on apps/web
- Jobs 2 and 3 depend on job 1 passing

Part C: Final integration test script

Create scripts/e2e-test.js (runs in Node, no browser):
- Imports encode, decode, decodeImage from the codec
- Generates 10 random 20-digit IDs
- For each: encode → draw with node-canvas → extract ImageData → decodeImage → assert ids match
- Prints "PASS" or "FAIL" for each with timing
- Exits with code 1 if any fail

Add to root package.json scripts: "test:e2e": "node scripts/e2e-test.js"

Run it. All 10 must pass.
```

---

## APPENDIX — Debugging Prompts (use if something breaks)

### Debug A — Decoder not finding center

```
DEBUG PROMPT A — use when decodeImage returns { ok: false, stage: 'center' }

The center detection is failing. Run this diagnostic:

1. Take the binary image output from preprocess() and render it to a PNG using node-canvas.
   Paint each pixel: 1 → black, 0 → white.
   Save to /tmp/debug-binary.png and inspect it.

2. Check questions:
   - Is the center circle visible as a solid dark blob in the binary PNG?
   - Is the blob contiguous (no gaps)?
   - Is the contrast enough? (Otsu threshold might be choosing a bad split point)

3. If the binary image looks wrong:
   - The image might be inverted (white code on dark background). Add an inversion detection step:
     after binarise(), if the sum of all pixels > (width * height * 0.7), invert the binary.
     (Most of the image should be background/white = 0, so > 70% ones means inverted.)

4. If the binary image looks right but center detection still fails:
   - Add logging to findCenter() to print: how many candidate seeds were tried,
     what the largest blob pixel count was, and the circularity score.
   - Common fix: the flood fill hit its 50,000 pixel limit and stopped before measuring the full blob.
     Increase the limit to 200,000.

5. Print the DecodeDebugInfo and paste it here so we can diagnose further.
```

### Debug B — Sync ring validation failing

```
DEBUG PROMPT B — use when decodeImage returns { ok: false, stage: 'sample' }

The sync rings are not being detected as alternating. Diagnose:

1. Log the raw samples from R1 (12 values) and R6 (32 values).
   Print them as a binary string e.g. "101010101010" for R1.

2. Check questions:
   - Is the pattern there but rotated? (e.g. "010101010101" instead of "101010101010")
     Fix: tryAllRotations already handles this. But double-check it's actually being called.
   - Are there 2+ consecutive same-value segments? (e.g. "110101010101")
     This suggests the scale estimate is off and we're sampling at the wrong radius.

3. If scale is wrong:
   - Log the centerResult.radius and the computed scale.
   - Generate a test image at the exact scale and log what radius you expect R1 at vs what you sampled.
   - The scale formula is centerRadius / CENTER_RADIUS (22px). Verify CENTER_RADIUS matches what the renderer used.

4. If still failing after rotation tries:
   - Add a scale sweep: try scale * 0.8, scale * 0.9, scale * 1.0, scale * 1.1, scale * 1.2
   - For each scale, try all 12 rotations.
   - Return the first combination where both sync rings validate.
   - This brute-force approach is slow (60 attempts) but reliable for V1.

5. Paste the R1 and R6 sample arrays here for further analysis.
```

### Debug C — Checksum mismatch

```
DEBUG PROMPT C — use when decodeImage returns { ok: false, stage: 'decode', error: 'Checksum mismatch' }

The image was found, rings were sampled, bits extracted — but the decoded ID doesn't match its checksum.

This means some bits were read incorrectly (bit flips from noise or mis-sampling).

Diagnose:

1. Log the full 88-bit array from sampleResult.bits.
2. Manually encode the ID you expect and log its bits array.
3. XOR the two arrays to find which positions differ:
   diffPositions = bits.map((b, i) => b !== expectedBits[i] ? i : -1).filter(x => x >= 0)
   Log diffPositions.

4. For each wrong bit position, determine which ring it belongs to:
   bits 0–15: R2 (16 segments)
   bits 16–39: R3 (24 segments)
   bits 40–63: R4 (24 segments)
   bits 64–87: R5 (24 segments)
   
   Are errors concentrated in one ring? That ring may have a radius/scale issue.

5. Common fixes:
   - If errors spread across all rings: scale is slightly off globally → add scale sweep (see Debug B step 4)
   - If errors in R2 only: R2 has the fewest segments (16) and widest arcs — low contrast might blur boundaries. Try sampling at 2 sub-positions per segment.
   - If checksum bits (positions 80–87) are all wrong: the angle offset is wrong and we're reading data segments as checksum.

6. Try the multi-sample averaging from Phase 5 Prompt 1 step 2 if not already implemented.
```

---

*End of Antigravity prompt file. Feed prompts in order within each phase. Do not skip phases. The codec library (Phase 1) is imported by everything else — get it right first.*
