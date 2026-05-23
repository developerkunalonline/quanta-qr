const { createCanvas } = require('@napi-rs/canvas');
const { encode, drawCircularCode, decodeImage } = require('../packages/circular-id-codec/dist/index.js');

try {
  console.log('--- DECODER DEBUGGING RUN ---');
  const size = 400;
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  const testId = '12345678901234567890';
  const bits = encode(testId);

  // Render inverted circular code
  drawCircularCode({
    ctx: ctx,
    bits,
    size,
    darkColor: '#ffffff',
    lightColor: '#000000'
  });

  const imgData = ctx.getImageData(0, 0, size, size);
  console.log('Image Data dimensions:', imgData.width, imgData.height, 'length:', imgData.data.length);

  const result = decodeImage(imgData.data, size, size);
  console.log('DecodeResult:', JSON.stringify(result, null, 2));

  // Let's run a direct search using findCenter but with console.logs
  console.log('\nRunning manual blob diagnostic...');
  const { preprocess } = require('../packages/circular-id-codec/dist/decoder/preprocess.js');
  const prepRes = preprocess(imgData.data, size, size);
  
  // Custom manual blob trace:
  const binary = prepRes.binary;
  const width = size;
  const height = size;
  const totalPixels = width * height;
  const visited = new Uint8Array(totalPixels);
  const blobs = [];

  for (let y = 4; y < height - 4; y += 2) {
    for (let x = 4; x < width - 4; x += 2) {
      const idx = y * width + x;
      if (binary[idx] === 1 && visited[idx] === 0) {
        let pixelCount = 0;
        let sumX = 0;
        let sumY = 0;
        let perimeter = 0;
        const stack = [idx];
        visited[idx] = 1;

        while (stack.length > 0) {
          const currIdx = stack.pop();
          pixelCount++;
          const cx_val = currIdx % width;
          const cy_val = Math.floor(currIdx / width);
          sumX += cx_val;
          sumY += cy_val;

          let isPerimeter = false;
          const neighbors = [currIdx - 1, currIdx + 1, currIdx - width, currIdx + width];
          for (let n = 0; n < 4; n++) {
            const nIdx = neighbors[n];
            if (nIdx >= 0 && nIdx < totalPixels) {
              const nx = nIdx % width;
              const ny = Math.floor(nIdx / width);
              if (Math.abs(nx - cx_val) <= 1 && Math.abs(ny - cy_val) <= 1) {
                if (binary[nIdx] === 0) {
                  isPerimeter = true;
                } else if (visited[nIdx] === 0) {
                  visited[nIdx] = 1;
                  stack.push(nIdx);
                }
              }
            } else {
              isPerimeter = true;
            }
          }
          if (isPerimeter) perimeter++;
        }

        if (pixelCount >= 10) {
          const cx = sumX / pixelCount;
          const cy = sumY / pixelCount;
          const radius = Math.sqrt(pixelCount / Math.PI);
          const actualPerimeter = perimeter > 0 ? perimeter : 2 * Math.PI * radius;
          const circularity = (4 * Math.PI * pixelCount) / (actualPerimeter * actualPerimeter);
          const sizeConfidence = Math.min(1.0, pixelCount / 200);
          const circularityConfidence = Math.min(1.0, circularity);
          const confidence = circularityConfidence * sizeConfidence;

          blobs.push({ cx, cy, pixelCount, perimeter, circularity, confidence, radius });
        }
      }
    }
  }

  // Sort blobs by pixelCount descending
  blobs.sort((a, b) => b.pixelCount - a.pixelCount);
  console.log(`Found ${blobs.length} candidate blobs. Top 10 by size:`);
  blobs.slice(0, 10).forEach((b, i) => {
    console.log(`Blob #${i+1}: cx=${b.cx.toFixed(1)}, cy=${b.cy.toFixed(1)}, size=${b.pixelCount}, perimeter=${b.perimeter}, circularity=${b.circularity.toFixed(3)}, confidence=${b.confidence.toFixed(3)}, radius=${b.radius.toFixed(1)}`);
  });

} catch (err) {
  console.error('Crash in debug-decoder script:', err);
}
