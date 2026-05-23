'use client';

import React, { useState, useEffect, useRef } from 'react';
import { validateId, encode, drawCircularCode } from '@circular-id/codec';

export default function GeneratePage() {
  const [idInput, setIdInput] = useState('12345678901234567890');
  const [ringColor, setRingColor] = useState('#0f172a');
  const [bgColor, setBgColor] = useState('#ffffff');
  const [accentColor, setAccentColor] = useState('#4f46e5');
  const [centerLabel, setCenterLabel] = useState('ID');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Clean the input to keep only digits
  const handleIdChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const digitsOnly = rawVal.replace(/\D/g, '');
    
    if (rawVal !== digitsOnly) {
      setErrorMsg('Only digits (0-9) are allowed');
      setTimeout(() => setErrorMsg(null), 3000);
    } else {
      setErrorMsg(null);
    }
    
    setIdInput(digitsOnly.slice(0, 20));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Validate using the codec
    const validation = validateId(idInput);
    if (!validation.valid) {
      // Clear canvas on invalid
      ctx.fillStyle = '#0f172a'; // dark theme canvas placeholder background
      ctx.fillRect(0, 0, 400, 400);
      
      // Draw a subtle placeholder ring in center
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(200, 200, 100, 0, Math.PI * 2);
      ctx.stroke();
      
      ctx.fillStyle = '#64748b';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('Enter a valid numeric ID', 200, 200);
      return;
    }

    try {
      const bits = encode(validation.cleaned);
      drawCircularCode({
        ctx,
        bits,
        size: 400,
        darkColor: ringColor,
        lightColor: bgColor,
        accentColor: ringColor, // Primary data rings match darkColor
        altColor: accentColor,   // Alternate rings match accentColor
        centerText: centerLabel
      });
    } catch (err: any) {
      console.error(err);
      ctx.fillStyle = '#ef4444';
      ctx.fillRect(0, 0, 400, 400);
      ctx.fillStyle = '#ffffff';
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('Encoding Error', 200, 200);
    }
  }, [idInput, ringColor, bgColor, accentColor, centerLabel]);

  const downloadPng = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Cleaned up filename
    const validation = validateId(idInput);
    const idName = validation.valid ? validation.cleaned : 'invalid';

    const url = canvas.toDataURL('image/png');
    const link = document.createElement('a');
    link.href = url;
    link.download = `circular-id-${idName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const isExactly20 = idInput.length === 20;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">
            Circular ID Generator
          </h1>
          <p className="mt-3 text-lg text-slate-400 max-w-2xl mx-auto">
            Design and generate proprietary high-density concentric circular barcodes in real-time.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Controls Panel */}
          <div className="lg:col-span-7 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 md:p-8 space-y-6 shadow-2xl">
            <h2 className="text-xl font-bold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
              <span className="h-5 w-5 bg-indigo-500 rounded-lg inline-block flex items-center justify-center text-xs text-white">1</span>
              Configure Identity Code
            </h2>

            {/* ID Input */}
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label htmlFor="idInput" className="block text-sm font-semibold text-slate-300">
                  Numeric ID (Up to 20 digits)
                </label>
                <span className={`text-xs ${isExactly20 ? 'text-emerald-400 font-bold' : 'text-slate-500'}`}>
                  {idInput.length} / 20 digits
                </span>
              </div>
              <div className="relative rounded-2xl shadow-sm">
                <input
                  type="text"
                  name="idInput"
                  id="idInput"
                  className={`block w-full rounded-2xl border bg-slate-950/80 px-4 py-4 pr-10 text-lg font-mono text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 ${
                    isExactly20 ? 'border-emerald-500/50' : 'border-slate-800'
                  }`}
                  placeholder="Enter numbers (e.g. 12345)"
                  value={idInput}
                  onChange={handleIdChange}
                  maxLength={20}
                />
                <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3">
                  {isExactly20 && (
                    <svg className="h-6 w-6 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  )}
                </div>
              </div>

              {/* Status and error feedback */}
              {errorMsg && (
                <p className="text-sm text-rose-400 flex items-center gap-1.5 animate-pulse">
                  <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {errorMsg}
                </p>
              )}
              {idInput.length > 0 && !isExactly20 && (
                <p className="text-xs text-sky-400">
                  ℹ️ Code will be padded to 20 digits with leading zeros (e.g. <code>{idInput.padStart(20, '0')}</code>)
                </p>
              )}
            </div>

            {/* Custom Label and Colors */}
            <div className="space-y-6 pt-4 border-t border-slate-800">
              <h2 className="text-xl font-bold text-slate-200 border-b border-slate-800 pb-3 flex items-center gap-2">
                <span className="h-5 w-5 bg-indigo-500 rounded-lg inline-block flex items-center justify-center text-xs text-white">2</span>
                Visual Aesthetics
              </h2>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Center text label */}
                <div className="space-y-2">
                  <label htmlFor="centerLabel" className="block text-sm font-semibold text-slate-300">
                    Center Label (Max 3 chars)
                  </label>
                  <input
                    type="text"
                    name="centerLabel"
                    id="centerLabel"
                    className="block w-full rounded-xl border border-slate-850 bg-slate-950 px-4 py-2.5 text-md text-white placeholder-slate-650 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
                    placeholder="e.g. ID"
                    value={centerLabel}
                    onChange={(e) => setCenterLabel(e.target.value.slice(0, 3))}
                    maxLength={3}
                  />
                </div>

                {/* Ring Color */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-300">Primary Code Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      className="h-10 w-12 rounded-lg bg-transparent border-0 cursor-pointer"
                      value={ringColor}
                      onChange={(e) => setRingColor(e.target.value)}
                    />
                    <span className="font-mono text-sm text-slate-400">{ringColor.toUpperCase()}</span>
                  </div>
                </div>

                {/* Accent Color */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-300">Accent Rings Color</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      className="h-10 w-12 rounded-lg bg-transparent border-0 cursor-pointer"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                    />
                    <span className="font-mono text-sm text-slate-400">{accentColor.toUpperCase()}</span>
                  </div>
                </div>

                {/* Background Color */}
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-slate-300">Code Background</label>
                  <div className="flex items-center gap-3">
                    <input
                      type="color"
                      className="h-10 w-12 rounded-lg bg-transparent border-0 cursor-pointer"
                      value={bgColor}
                      onChange={(e) => setBgColor(e.target.value)}
                    />
                    <span className="font-mono text-sm text-slate-400">{bgColor.toUpperCase()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Code Render Preview */}
          <div className="lg:col-span-5 flex flex-col items-center justify-center space-y-6">
            <div className="w-full max-w-[420px] bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 flex flex-col items-center justify-center shadow-2xl relative group overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-transparent to-sky-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              <div className="relative rounded-2xl overflow-hidden border border-slate-700/50 shadow-inner p-1 bg-slate-950">
                <canvas
                  ref={canvasRef}
                  width={400}
                  height={400}
                  className="max-w-full aspect-square w-[320px] h-[320px] sm:w-[350px] sm:h-[350px] object-contain rounded-xl"
                />
              </div>

              <div className="w-full mt-6 flex flex-col sm:flex-row gap-3">
                <button
                  type="button"
                  onClick={downloadPng}
                  disabled={idInput.length === 0}
                  className="flex-1 inline-flex justify-center items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 hover:shadow-indigo-500/40 active:bg-indigo-750 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download PNG
                </button>

                <div className="relative group/btn flex-1">
                  <button
                    type="button"
                    disabled
                    className="w-full inline-flex justify-center items-center gap-2 rounded-2xl bg-slate-850 px-4 py-3 text-sm font-semibold text-slate-500 cursor-not-allowed border border-slate-800"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Copy SVG
                  </button>
                  <span className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 w-max bg-slate-800 text-slate-200 text-xs px-2.5 py-1.5 rounded-lg shadow-xl opacity-0 group-hover/btn:opacity-100 pointer-events-none transition-opacity duration-200 border border-slate-700">
                    SVG export coming soon
                  </span>
                </div>
              </div>
            </div>

            {/* Quick spec checklist */}
            <div className="w-full max-w-[420px] bg-slate-950/40 border border-slate-850 rounded-2xl p-4 text-xs text-slate-400 space-y-2">
              <p className="font-bold text-slate-300 uppercase tracking-wider text-[10px]">Specifications Check</p>
              <div className="grid grid-cols-2 gap-2">
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full" /> 6 concentric rings
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full" /> Sync rings (R1 & R6)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full" /> BCD data encoding
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 bg-emerald-500 rounded-full" /> 8-bit XOR checksum
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
