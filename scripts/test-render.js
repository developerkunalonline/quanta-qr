const { createCanvas } = require('canvas');
const fs = require('fs');
const path = require('path');

// We use the built JS output from packages/circular-id-codec/dist
const { encode, drawCircularCode } = require('../packages/circular-id-codec/dist/index.js');

try {
  console.log('Sanity rendering check starting...');
  const size = 400;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const id = '12345678901234567890';
  console.log(`Encoding ID: ${id}`);
  const bits = encode(id);

  console.log('Drawing circular code...');
  drawCircularCode({
    ctx,
    bits,
    size,
    darkColor: '#0f172a',
    lightColor: '#f8fafc',
    accentColor: '#4f46e5',
    altColor: '#0ea5e9',
    centerText: 'QR1'
  });

  const outPath = path.join(__dirname, '../test-code.png');
  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync(outPath, buffer);
  console.log(`Successfully generated PNG at: ${outPath}`);

  // Also write to /tmp/test-code.png as suggested
  try {
    fs.writeFileSync('/tmp/test-code.png', buffer);
    console.log('Also saved to /tmp/test-code.png');
  } catch (err) {
    // Ignore if /tmp is not writable
  }
} catch (err) {
  console.error('Error in sanity rendering script:', err);
  process.exit(1);
}
