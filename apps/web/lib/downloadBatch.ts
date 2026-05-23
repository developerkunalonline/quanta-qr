import JSZip from 'jszip';

export interface ZipItem {
  id: string;
  pngBase64: string;
}

/**
 * Creates and downloads a ZIP file containing the generated circular ID PNGs.
 */
export async function downloadBatchAsZip(results: ZipItem[]): Promise<void> {
  if (typeof window === 'undefined') return;

  const zip = new JSZip();

  results.forEach((item) => {
    // Extract raw base64 data by removing the data URI prefix
    const base64Prefix = 'data:image/png;base64,';
    if (item.pngBase64.startsWith(base64Prefix)) {
      const rawBase64 = item.pngBase64.substring(base64Prefix.length);
      zip.file(`circular-id-${item.id}.png`, rawBase64, { base64: true });
    }
  });

  try {
    const content = await zip.generateAsync({ type: 'blob' });
    
    // Create download link and trigger
    const url = URL.createObjectURL(content);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'circular-id-codes.zip';
    document.body.appendChild(link);
    link.click();
    
    // Clean up
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } catch (error) {
    console.error('Error generating ZIP file:', error);
    alert('Failed to generate ZIP file. Please try again.');
  }
}
