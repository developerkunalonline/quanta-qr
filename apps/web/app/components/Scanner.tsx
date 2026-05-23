'use client';

import React, { useRef, useState, useEffect } from 'react';
import { decodeImage } from '@circular-id/codec';

interface ScannerProps {
  onSuccess: (id: string, confidence: number) => void;
  showBinarized?: boolean;
}

export default function Scanner({ onSuccess, showBinarized = false }: ScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);

  const [devices, setDevices] = useState<MediaDeviceInfo[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('');
  const [hasFlashlight, setHasFlashlight] = useState(false);
  const [flashlightOn, setFlashlightOn] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [scanError, setScanError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Initialize camera: request permission first, then enumerate devices for switcher
  useEffect(() => {
    let activeStream: MediaStream | null = null;

    async function initCamera() {
      try {
        // Step 1: Request camera access directly (triggers permission prompt)
        const constraints: MediaStreamConstraints = {
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };

        activeStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(activeStream);
        setScanError(null);

        if (videoRef.current) {
          videoRef.current.srcObject = activeStream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play();
        }

        // Step 2: Now enumerate devices (labels/IDs are available after permission)
        const devicesList = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devicesList.filter(d => d.kind === 'videoinput');
        setDevices(videoDevices);

        // Track the active device
        const activeTrack = activeStream.getVideoTracks()[0];
        const activeSettings = activeTrack.getSettings();
        if (activeSettings.deviceId) {
          setSelectedDeviceId(activeSettings.deviceId);
        }

        // Check for torch
        const capabilities = activeTrack.getCapabilities ? activeTrack.getCapabilities() : {};
        setHasFlashlight('torch' in capabilities);
      } catch (err: any) {
        console.error('Error initializing camera:', err);
        if (err?.name === 'NotAllowedError') {
          setScanError('Camera permission denied. Please allow camera access in your browser settings.');
        } else if (err?.name === 'NotFoundError') {
          setScanError('No camera found on this device.');
        } else {
          setScanError('Could not access camera: ' + (err?.message || 'Unknown error'));
        }
      }
    }

    initCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
    };
  }, []);

  // Switch camera when user selects a different device
  useEffect(() => {
    if (!selectedDeviceId || !stream) return;

    // Don't restart if already on this device
    const currentTrack = stream.getVideoTracks()[0];
    const currentSettings = currentTrack?.getSettings();
    if (currentSettings?.deviceId === selectedDeviceId) return;

    let activeStream: MediaStream | null = null;

    async function switchCamera() {
      try {
        stream?.getTracks().forEach(t => t.stop());

        const constraints: MediaStreamConstraints = {
          video: {
            deviceId: { exact: selectedDeviceId },
            width: { ideal: 1280 },
            height: { ideal: 720 }
          }
        };

        activeStream = await navigator.mediaDevices.getUserMedia(constraints);
        setStream(activeStream);

        if (videoRef.current) {
          videoRef.current.srcObject = activeStream;
          videoRef.current.setAttribute('playsinline', 'true');
          videoRef.current.play();
        }

        const track = activeStream.getVideoTracks()[0];
        const capabilities = track.getCapabilities ? track.getCapabilities() : {};
        setHasFlashlight('torch' in capabilities);
        setFlashlightOn(false);
      } catch (err: any) {
        console.error('Error switching camera:', err);
        setScanError('Could not switch to selected camera.');
      }
    }

    switchCamera();

    return () => {
      if (activeStream) {
        activeStream.getTracks().forEach(t => t.stop());
      }
    };
  }, [selectedDeviceId]);

  // Flashlight toggle
  const toggleFlashlight = async () => {
    if (!stream) return;
    try {
      const track = stream.getVideoTracks()[0];
      const nextState = !flashlightOn;
      await track.applyConstraints({
        advanced: [{ torch: nextState } as any]
      });
      setFlashlightOn(nextState);
    } catch (err) {
      console.error('Failed to toggle torch:', err);
    }
  };

  // Real-time loop
  useEffect(() => {
    if (!stream) return;

    let animationId: number;
    let lastScanTime = 0;
    const scanIntervalMs = 120; // balanced: fast enough without overloading main thread
    let lastDecodedId = '';
    let consecutiveMatches = 0;
    const CONFIRM_THRESHOLD = 2; // require 2 consecutive same-ID decodes

    const processFrame = () => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const overlay = overlayRef.current;

      if (!video || !canvas || !overlay) {
        animationId = requestAnimationFrame(processFrame);
        return;
      }

      // Keep overlay canvas resized
      if (overlay.width !== video.clientWidth || overlay.height !== video.clientHeight) {
        overlay.width = video.clientWidth;
        overlay.height = video.clientHeight;
      }

      const oCtx = overlay.getContext('2d');
      if (oCtx) {
        oCtx.clearRect(0, 0, overlay.width, overlay.height);

        // Draw elegant targeting crosshairs
        oCtx.strokeStyle = 'rgba(99, 102, 241, 0.4)'; // indigo-500/40
        oCtx.lineWidth = 2;
        const cx = overlay.width / 2;
        const cy = overlay.height / 2;
        const size = Math.min(overlay.width, overlay.height) * 0.6;

        // Draw scanning box outline
        oCtx.strokeRect(cx - size / 2, cy - size / 2, size, size);

        // Scanning laser animation line
        const time = Date.now() / 800;
        const laserY = cy - size / 2 + (Math.sin(time) * 0.5 + 0.5) * size;
        const grad = oCtx.createLinearGradient(cx - size / 2, laserY, cx + size / 2, laserY);
        grad.addColorStop(0, 'rgba(99, 102, 241, 0)');
        grad.addColorStop(0.5, 'rgba(99, 102, 241, 0.8)');
        grad.addColorStop(1, 'rgba(99, 102, 241, 0)');
        oCtx.strokeStyle = grad;
        oCtx.lineWidth = 3;
        oCtx.beginPath();
        oCtx.moveTo(cx - size / 2, laserY);
        oCtx.lineTo(cx + size / 2, laserY);
        oCtx.stroke();
      }

      const now = Date.now();
      if (now - lastScanTime >= scanIntervalMs) {
        lastScanTime = now;

        const ctx = canvas.getContext('2d');
        if (ctx && video.videoWidth > 0 && video.videoHeight > 0) {
          const procSize = 400;
          if (canvas.width !== procSize) {
            canvas.width = procSize;
            canvas.height = procSize;
          }

          // Use full frame (letterboxed to square) for maximum coverage
          const vWidth = video.videoWidth;
          const vHeight = video.videoHeight;
          const cropSize = Math.min(vWidth, vHeight);
          const sx = (vWidth - cropSize) / 2;
          const sy = (vHeight - cropSize) / 2;

          ctx.drawImage(video, sx, sy, cropSize, cropSize, 0, 0, procSize, procSize);

          const imgData = ctx.getImageData(0, 0, procSize, procSize);
          const result = decodeImage(imgData.data, procSize, procSize);

          // If debug binarized view is checked, repaint canvas with binarized pixels
          if (showBinarized && result.debug?.binary) {
            const bin = result.debug.binary;
            const binImgData = ctx.createImageData(procSize, procSize);
            for (let i = 0; i < bin.length; i++) {
              const val = bin[i] === 1 ? 0 : 255;
              binImgData.data[i * 4] = val;
              binImgData.data[i * 4 + 1] = val;
              binImgData.data[i * 4 + 2] = val;
              binImgData.data[i * 4 + 3] = 255;
            }
            ctx.putImageData(binImgData, 0, 0);
          }

          if (result.ok) {
            // Confirmation buffer: require N consecutive same-ID matches
            if (result.id === lastDecodedId) {
              consecutiveMatches++;
            } else {
              lastDecodedId = result.id;
              consecutiveMatches = 1;
            }
            if (consecutiveMatches < CONFIRM_THRESHOLD) {
              animationId = requestAnimationFrame(processFrame);
              return;
            }
            consecutiveMatches = 0; // reset after confirmed trigger
            // Draw a green circle around the centroid on the overlay!
            if (oCtx && result.debug.centerFound) {
              const { cx: dCx, cy: dCy, radius } = result.debug.centerFound;
              // Map processor coordinates (procSize) to screen client coordinates (overlay.width/height)
              const screenScale = overlay.width / procSize;
              const screenCx = dCx * screenScale;
              const screenCy = dCy * screenScale;
              const screenR = radius * screenScale;

              oCtx.strokeStyle = '#10b981'; // emerald-500
              oCtx.lineWidth = 4;
              oCtx.beginPath();
              oCtx.arc(screenCx, screenCy, screenR, 0, Math.PI * 2);
              oCtx.stroke();

              // Draw ID overlay
              oCtx.fillStyle = '#10b981';
              oCtx.font = 'bold 16px sans-serif';
              oCtx.textAlign = 'center';
              oCtx.fillText(`DECODED: ${result.id}`, screenCx, screenCy - screenR - 10);
            }

            onSuccess(result.id, result.confidence);
          }
        }
      }

      animationId = requestAnimationFrame(processFrame);
    };

    animationId = requestAnimationFrame(processFrame);

    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [stream, onSuccess, showBinarized]);

  // Handle direct file upload / drag-and-drop
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement> | React.DragEvent<HTMLDivElement>) => {
    let file: File | null = null;

    if ('dataTransfer' in e) {
      e.preventDefault();
      file = e.dataTransfer.files?.[0] || null;
    } else {
      file = e.target.files?.[0] || null;
    }

    if (!file) return;
    setUploadError(null);

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const tempCanvas = document.createElement('canvas');
        // Fit to max 500x500 for optimal processing
        const maxDim = 500;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          if (w > h) {
            h = Math.round((h * maxDim) / w);
            w = maxDim;
          } else {
            w = Math.round((w * maxDim) / h);
            h = maxDim;
          }
        }

        tempCanvas.width = w;
        tempCanvas.height = h;

        const ctx = tempCanvas.getContext('2d');
        if (!ctx) return;
        ctx.drawImage(img, 0, 0, w, h);

        const imgData = ctx.getImageData(0, 0, w, h);
        const result = decodeImage(imgData.data, w, h);

        if (result.ok) {
          onSuccess(result.id, result.confidence);
        } else {
          setUploadError(`Failed to decode: ${result.error}`);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  return (
    <div className="space-y-6">
      {/* Camera Video Block */}
      <div className="relative aspect-square max-w-md mx-auto overflow-hidden rounded-3xl border border-slate-800 bg-slate-950 shadow-2xl">
        <video
          ref={videoRef}
          className="absolute inset-0 h-full w-full object-cover transform scale-x-1"
          muted
        />
        {/* Transparent scanner overlays */}
        <canvas
          ref={overlayRef}
          className="absolute inset-0 h-full w-full pointer-events-none z-10"
        />
        {/* Hidden or overlay binarized processing canvas */}
        <canvas
          ref={canvasRef}
          className={showBinarized ? 'absolute inset-0 h-full w-full object-cover z-5' : 'hidden'}
        />

        {scanError && (
          <div className="absolute inset-0 flex flex-col items-center justify-center p-6 bg-slate-950/90 text-center space-y-3 z-10">
            <svg className="h-12 w-12 text-rose-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-sm font-medium text-slate-300">{scanError}</p>
          </div>
        )}
      </div>

      {/* Camera controls */}
      <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto items-center">
        {devices.length > 1 && (
          <div className="flex-1 w-full">
            <select
              value={selectedDeviceId}
              onChange={(e) => setSelectedDeviceId(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
            >
              {devices.map((device, idx) => (
                <option key={device.deviceId} value={device.deviceId}>
                  {device.label || `Camera ${idx + 1}`}
                </option>
              ))}
            </select>
          </div>
        )}

        {hasFlashlight && (
          <button
            type="button"
            onClick={toggleFlashlight}
            className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-slate-850 px-4 py-2.5 text-xs font-semibold shadow transition ${
              flashlightOn
                ? 'bg-amber-600 border-amber-500 text-white'
                : 'bg-slate-900 text-slate-300 hover:bg-slate-850'
            }`}
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            Flashlight: {flashlightOn ? 'ON' : 'OFF'}
          </button>
        )}
      </div>

      {/* Drag & Drop Area */}
      <div className="max-w-md mx-auto">
        <div className="relative flex justify-between items-center text-xs text-slate-500 uppercase tracking-widest my-4 before:content-[''] before:flex-1 before:border-t before:border-slate-800 before:mr-3 after:content-[''] after:flex-1 after:border-t after:border-slate-800 after:ml-3">
          Or Upload Image
        </div>

        <div
          onDragOver={handleDragOver}
          onDrop={handleFileUpload}
          className="flex flex-col items-center justify-center border-2 border-dashed border-slate-800 bg-slate-900/30 rounded-2xl p-6 text-center hover:border-slate-700 transition cursor-pointer"
          onClick={() => document.getElementById('scan-file-input')?.click()}
        >
          <input
            id="scan-file-input"
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileUpload}
          />
          <svg className="h-8 w-8 text-slate-655 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span className="text-xs font-semibold text-slate-300">Drag & drop photo or click to browse</span>
          <span className="text-[10px] text-slate-500 mt-1">Supports PNG, JPG, JPEG</span>
        </div>

        {uploadError && (
          <p className="mt-2.5 text-xs text-center text-rose-400 font-medium">
            ⚠️ {uploadError}
          </p>
        )}
      </div>
    </div>
  );
}
