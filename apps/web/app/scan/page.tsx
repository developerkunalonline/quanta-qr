'use client';

import React, { useState, useEffect } from 'react';
import Scanner from '../components/Scanner';

interface ScanLog {
  id: string;
  timestamp: string;
  confidence: number;
}

export default function ScanPage() {
  const [scanHistory, setScanHistory] = useState<ScanLog[]>([]);
  const [latestDecodedId, setLatestDecodedId] = useState<string | null>(null);
  const [copySuccess, setCopySuccess] = useState<string | null>(null);
  const [showBinarized, setShowBinarized] = useState(false);

  // Load history from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('circular-id-scan-history');
      if (stored) {
        setScanHistory(JSON.parse(stored));
      }
    } catch (e) {
      console.error('Failed to load history from localStorage', e);
    }
  }, []);

  // Save history to localStorage
  const saveHistory = (newHistory: ScanLog[]) => {
    setScanHistory(newHistory);
    try {
      localStorage.setItem('circular-id-scan-history', JSON.stringify(newHistory));
    } catch (e) {
      console.error('Failed to save history to localStorage', e);
    }
  };

  // Play synthetic success chime using Web Audio API
  const playSuccessChime = () => {
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc.connect(gain);
      gain.connect(audioCtx.destination);

      osc.type = 'sine';
      // Dual-tone high-frequency pleasant notification chime
      osc.frequency.setValueAtTime(587.33, audioCtx.currentTime); // D5
      osc.frequency.setValueAtTime(880, audioCtx.currentTime + 0.08);   // A5
      
      gain.gain.setValueAtTime(0.08, audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);

      osc.start();
      osc.stop(audioCtx.currentTime + 0.25);
    } catch (err) {
      console.error('Failed to play synthetic audio chime:', err);
    }
  };

  const handleScanSuccess = (id: string, confidence: number) => {
    // Prevent duplicate triggers if the camera continues scanning the same ID
    if (scanHistory.length > 0 && scanHistory[0].id === id && Date.now() - new Date(scanHistory[0].timestamp).getTime() < 3000) {
      return;
    }

    playSuccessChime();
    setLatestDecodedId(id);

    const newLog: ScanLog = {
      id,
      timestamp: new Date().toLocaleTimeString(),
      confidence
    };

    const updatedHistory = [newLog, ...scanHistory].slice(0, 50); // limit to 50 entries
    saveHistory(updatedHistory);
  };

  const handleCopyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopySuccess(text);
    setTimeout(() => setCopySuccess(null), 2000);
  };

  const handleClearHistory = () => {
    saveHistory([]);
    setLatestDecodedId(null);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-4xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-emerald-400 via-teal-400 to-indigo-400 bg-clip-text text-transparent">
            Camera Barcode Scanner
          </h1>
          <p className="mt-3 text-lg text-slate-400 max-w-2xl mx-auto">
            Point your camera at a circular ID or upload an image to decode instantly.
          </p>
        </header>

        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Scanner view */}
          <div className="md:col-span-6 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-bold text-slate-200">Real-Time Scanner</h2>
            </div>
            
            <div className="flex justify-between items-center bg-slate-950/40 border border-slate-850 rounded-2xl p-4.5">
              <div className="space-y-0.5 pr-2">
                <span className="block text-xs font-bold text-slate-200">Show Binarized Preview</span>
                <span className="block text-[10px] text-slate-500">Toggle real-time computer vision binary feed for lighting diagnostics</span>
              </div>
              <button
                type="button"
                onClick={() => setShowBinarized(!showBinarized)}
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  showBinarized ? 'bg-indigo-650' : 'bg-slate-800'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    showBinarized ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            <Scanner onSuccess={handleScanSuccess} showBinarized={showBinarized} />
          </div>

          {/* Scanned Results & Log */}
          <div className="md:col-span-6 space-y-6">
            {/* Decoded Output */}
            {latestDecodedId && (
              <div className="bg-gradient-to-br from-indigo-950/40 to-slate-900/60 border border-indigo-500/30 rounded-3xl p-6 shadow-2xl flex flex-col items-center justify-center text-center space-y-4">
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Successfully Decoded
                </span>
                <div className="font-mono text-3xl md:text-4xl font-extrabold tracking-wider text-slate-100 select-all">
                  {latestDecodedId}
                </div>
                <button
                  type="button"
                  onClick={() => handleCopyToClipboard(latestDecodedId)}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-slate-800 px-4 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-750 transition"
                >
                  {copySuccess === latestDecodedId ? 'Copied ✓' : 'Copy to Clipboard'}
                </button>
              </div>
            )}

            {/* History Log */}
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4">
              <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                <h3 className="text-lg font-bold text-slate-200">Scan History</h3>
                {scanHistory.length > 0 && (
                  <button
                    type="button"
                    onClick={handleClearHistory}
                    className="text-xs text-rose-400 hover:text-rose-350 hover:underline transition"
                  >
                    Clear History
                  </button>
                )}
              </div>

              {scanHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-slate-500 space-y-2">
                  <svg className="h-12 w-12 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-xs">No scan history recorded.</p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[350px] overflow-y-auto pr-1">
                  {scanHistory.map((item, idx) => (
                    <div
                      key={idx}
                      className="flex justify-between items-center bg-slate-950/70 border border-slate-850 hover:border-slate-800 rounded-xl p-3.5 transition"
                    >
                      <div className="space-y-1">
                        <span className="block font-mono text-sm font-bold text-indigo-400 tracking-wider">
                          {item.id}
                        </span>
                        <div className="flex gap-3 text-[10px] text-slate-500">
                          <span>Time: {item.timestamp}</span>
                          <span>Confidence: {(item.confidence * 100).toFixed(0)}%</span>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleCopyToClipboard(item.id)}
                        className="rounded-lg bg-slate-900 p-2 text-slate-400 hover:bg-slate-850 hover:text-slate-200 transition"
                        title="Copy ID"
                      >
                        {copySuccess === item.id ? (
                          <span className="text-[10px] px-1 font-semibold text-emerald-400">Copied!</span>
                        ) : (
                          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                          </svg>
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
