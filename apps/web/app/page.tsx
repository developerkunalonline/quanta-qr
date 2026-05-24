import React from 'react';
import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans relative overflow-hidden">
      {/* Decorative Blur Orbs */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] aspect-square rounded-full bg-indigo-650/15 blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] aspect-square rounded-full bg-emerald-650/10 blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-20 relative z-10">
        {/* Hero Section */}
        <header className="text-center max-w-3xl mx-auto space-y-6 mb-16">
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full text-xs font-semibold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Proprietary Barcode Format
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight bg-gradient-to-r from-white via-slate-200 to-slate-400 bg-clip-text text-transparent">
            Quanta QR
          </h1>
          <p className="text-lg sm:text-xl text-slate-400 leading-relaxed">
            An advanced, aesthetically stunning concentric ring barcode codec. Fast encoding, high-density storage, error checking, and real-time camera scanning.
          </p>
        </header>

        {/* Action Modules */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Module 1: Single Generator */}
          <Link href="/generate" className="group">
            <div className="h-full bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 hover:border-indigo-500/50 hover:bg-slate-900/60 shadow-2xl transition-all duration-300 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 flex items-center justify-center group-hover:scale-110 transition duration-300">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-100 group-hover:text-indigo-400 transition">
                  Single Code Generator
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Generate beautiful individual barcodes. Customize colors, add a custom 3-character center text label, and download high-resolution PNGs instantly.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-400 group-hover:translate-x-1.5 transition">
                Launch Generator &rarr;
              </span>
            </div>
          </Link>

          {/* Module 2: Batch Generator */}
          <Link href="/batch" className="group">
            <div className="h-full bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 hover:border-emerald-500/50 hover:bg-slate-900/60 shadow-2xl transition-all duration-300 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center group-hover:scale-110 transition duration-300">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-100 group-hover:text-emerald-400 transition">
                  Batch ID Generator
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Bulk process up to 100 numeric IDs simultaneously. View dynamic thumbnail grids, automatically sanitize inputs, and export everything inside a single ZIP file.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-400 group-hover:translate-x-1.5 transition">
                Launch Batch Exporter &rarr;
              </span>
            </div>
          </Link>

          {/* Module 3: Live Scanner */}
          <Link href="/scan" className="group">
            <div className="h-full bg-slate-900/40 backdrop-blur-xl border border-slate-800 rounded-3xl p-8 hover:border-sky-500/50 hover:bg-slate-900/60 shadow-2xl transition-all duration-300 flex flex-col justify-between space-y-6">
              <div className="space-y-4">
                <div className="h-12 w-12 rounded-2xl bg-sky-600/10 text-sky-400 border border-sky-500/20 flex items-center justify-center group-hover:scale-110 transition duration-300">
                  <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-slate-100 group-hover:text-sky-400 transition">
                  Camera Scanner
                </h3>
                <p className="text-sm text-slate-400 leading-relaxed">
                  Open your camera to scan circular codes in real time. Features target reticles, visual center overlays, flashlight toggling, and image upload drag & drop.
                </p>
              </div>
              <span className="inline-flex items-center gap-1 text-xs font-semibold text-sky-400 group-hover:translate-x-1.5 transition">
                Launch Scanner &rarr;
              </span>
            </div>
          </Link>
        </div>
      </div>
    </div>
  );
}
