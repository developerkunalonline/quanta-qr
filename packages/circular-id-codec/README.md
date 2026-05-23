# @circular-id/codec

A zero-dependency TypeScript library for encoding 20-digit numeric IDs into custom concentric-ring circular barcodes (Circular IDs) and decoding them back from pixel-level data.

## Overview

The circular ID code system is a proprietary encoding format resembling a circular QR code. It consists of a solid central anchor circle surrounded by 6 concentric rings containing arc segments. Arc segments represent data or sync bits where a printed/filled arc is `1` and an empty/unprinted gap is `0`.

This package provides:
1. **Core Encoder**: Conversions from a 20-digit numeric ID to BCD (Binary Coded Decimal) format, computing an 8-bit XOR checksum, and outputting an 88-bit array.
2. **Core Decoder**: Validates the 88-bit array, extracts BCD values, performs checksum verification, and reconstructs the 20-digit string.
3. **HTML Canvas Renderer**: Renders circular barcodes on HTML Canvas contexts (both client-side and server-side using `node-canvas`).
4. **Image Processing and Scanning Pipeline**: Preprocesses raw image buffers, performs binarization (Otsu's thresholding), finds the center blob, samples the rings, and decodes the ID.

---

## Installation

Within the monorepo, import it using the package workspace dependency or local paths:

```typescript
import { encode, decode, encodeSafe, decodeSafe, validateId } from '@circular-id/codec';
```

---

## API Reference

### `encode(id: string): number[]`
Takes a numeric ID string, strips non-digit characters, left-pads or slices to exactly 20 digits, calculates a checksum, and returns an array of exactly 88 bits (0 or 1).
* **Throws**: `Error` if the string contains no digits.

### `encodeSafe(id: string): { ok: true; bits: number[] } | { ok: false; error: string }`
Safe wrapper around `encode()` that catches all exceptions.

### `decode(bits: number[]): string`
Takes an 88-bit array of 0s and 1s, decodes it using BCD, verifies the 8-bit checksum, and returns the original 20-digit padded ID string.
* **Throws**: `Error` if bit length is not 88, bit values are not 0/1, BCD values are out of bounds (> 9), or checksum mismatch occurs.

### `decodeSafe(bits: number[]): { ok: true; id: string } | { ok: false; error: string }`
Safe wrapper around `decode()` that catches all exceptions.

### `validateId(input: string): { valid: boolean; cleaned: string; error?: string }`
Strips non-digits from input and checks if it contains at least one digit. Returns the cleaned, left-padded 20-character string if valid. Never throws.

---

## Encoding Specification

### Concentric Ring Layout

1. **R1 (Sync Ring - Inner)**: radius = 50px, 12 segments, alternating `101010101010` pattern.
2. **R2 (Data Ring)**: radius = 76px, 16 segments, BCD bits 0–15 (digits 1–4).
3. **R3 (Data Ring)**: radius = 102px, 24 segments, BCD bits 16–39 (digits 5–10).
4. **R4 (Data Ring)**: radius = 128px, 24 segments, BCD bits 40–63 (digits 11–16).
5. **R5 (Data Ring)**: radius = 154px, 24 segments, BCD bits 64–79 (digits 17–20) + bits 80–87 (8-bit checksum).
6. **R6 (Sync Ring - Outer)**: radius = 180px, 32 segments, alternating `1010...` pattern.

*Note: All sizes scale proportionally for canvas dimensions other than 400×400px. Line width is 10px (8px for R6) at the reference scale.*

### Arc Geometry
- **Start Angle**: All rings start drawing at `-π/2` (12 o'clock position) and progress clockwise.
- **Gaps**: Each segment angle contains a 28% gap ratio. The empty gap is centered at the start of each segment boundary, and the dash (representing bit `1`) fills the remaining 72%. If a segment is bit `0`, nothing is drawn.
- **Center Circle**: Solid dark circle with a reference radius of 22px used as a location anchor.

### Binary Coded Decimal (BCD)
Each digit 0–9 is encoded using 4 bits, MSB-first. For example:
- Digit `0` = `[0, 0, 0, 0]`
- Digit `7` = `[0, 1, 1, 1]`
- Digit `9` = `[1, 0, 0, 1]`

### Checksum Algorithm
An 8-bit XOR checksum of all 10 byte-pairs of the 20-digit string:
$$\text{byte}_i = \text{parseInt}(ID[2i]) \times 10 + \text{parseInt}(ID[2i + 1])$$
$$\text{checksum} = \text{byte}_0 \oplus \text{byte}_1 \oplus \dots \oplus \text{byte}_9$$

---

## Error Conditions

- **"ID must contain at least one digit"**: Occurs when calling `encode()` with an empty string or a string containing only letters/symbols.
- **"Expected 88 bits, got X"**: Occurs when calling `decode()` with an array whose length is not exactly 88.
- **"Invalid BCD nibble at position X: Y"**: Occurs if a BCD nibble represents a decimal value greater than 9 (e.g. `[1, 0, 1, 0]` = 10).
- **"Checksum mismatch: expected X got Y"**: Occurs when the calculated XOR checksum does not match the 8 bits stored at the end of the bit array.
