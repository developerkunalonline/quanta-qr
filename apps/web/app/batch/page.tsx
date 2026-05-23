'use client';

import React, { useState } from 'react';
import { generateBatch, BatchItemResult } from '../actions/generateBatch';
import { downloadBatchAsZip } from '../../lib/downloadBatch';
import { validateId } from '@circular-id/codec';

interface ParsedId {
  raw: string;
  cleaned: string;
  isValid: boolean;
  error?: string;
}

export default function BatchPage() {
  const [inputText, setInputText] = useState('');
  const [results, setResults] = useState<BatchItemResult[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [warningMsg, setWarningMsg] = useState<string | null>(null);

  // Parse lines reactively to show instant feedback
  const lines = inputText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  const tooManyLines = lines.length > 100;
  const activeLines = tooManyLines ? lines.slice(0, 100) : lines;

  const parsedIds: ParsedId[] = activeLines.map((line) => {
    if (line.length > 20) {
      return { raw: line, cleaned: '', isValid: false, error: 'Exceeds 20-digit limit' };
    }
    const cleaned = line.replace(/\D/g, '');
    if (cleaned.length === 0) {
      return { raw: line, cleaned: '', isValid: false, error: 'Contains no numeric digits' };
    }
    const validation = validateId(cleaned);
    if (!validation.valid) {
      return { raw: line, cleaned: '', isValid: false, error: validation.error || 'Invalid format' };
    }
    return { raw: line, cleaned: validation.cleaned, isValid: true };
  });

  const validCount = parsedIds.filter(p => p.isValid).length;
  const invalidCount = parsedIds.filter(p => !p.isValid).length;

  const handleGenerate = async () => {
    if (validCount === 0) return;
    setIsGenerating(true);
    setWarningMsg(tooManyLines ? 'Notice: Only the first 100 IDs were processed.' : null);

    try {
      // Collect only the valid cleaned IDs to send to the server
      const validCleanedIds = parsedIds.filter(p => p.isValid).map(p => p.cleaned);
      const res = await generateBatch(validCleanedIds);
      setResults(res);
    } catch (error) {
      console.error(error);
      alert('Error generating batch. Please try again.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleDownloadZip = () => {
    const successItems = results.filter(r => !r.error);
    if (successItems.length === 0) return;
    downloadBatchAsZip(successItems);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-12 px-4 sm:px-6 lg:px-8 font-sans">
      <div className="max-w-6xl mx-auto">
        <header className="mb-10 text-center">
          <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-sky-400 to-emerald-400 bg-clip-text text-transparent">
            Batch ID Generator
          </h1>
          <p className="mt-3 text-lg text-slate-400 max-w-2xl mx-auto">
            Input multiple IDs to generate and package dozens of custom circular barcodes in parallel.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Input Panel */}
          <div className="lg:col-span-5 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex justify-between items-center">
              <label htmlFor="batchArea" className="block text-sm font-semibold text-slate-300">
                Paste IDs (One per line, max 100)
              </label>
              <span className={`text-xs ${tooManyLines ? 'text-rose-400 font-bold' : 'text-slate-500'}`}>
                {lines.length} / 100 lines
              </span>
            </div>

            <textarea
              id="batchArea"
              rows={8}
              className="block w-full rounded-2xl border border-slate-800 bg-slate-950/80 px-4 py-3 font-mono text-sm text-white placeholder-slate-655 focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
              placeholder="12345678901234567890&#10;98765432109876543210&#10;5"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
            />

            {tooManyLines && (
              <p className="text-xs text-rose-400">
                ⚠️ Warning: Max 100 entries allowed. Entries beyond line 100 will be ignored.
              </p>
            )}

            {/* Validation Overview */}
            {lines.length > 0 && (
              <div className="bg-slate-950/50 border border-slate-850 rounded-2xl p-4 space-y-3">
                <div className="flex justify-between items-center text-xs border-b border-slate-850 pb-2">
                  <span className="text-slate-400">Validation Status</span>
                  <span className="font-semibold text-slate-200">
                    {validCount} Valid / {invalidCount} Invalid
                  </span>
                </div>

                {invalidCount > 0 && (
                  <div className="max-h-32 overflow-y-auto space-y-1.5 pr-2">
                    <p className="text-[10px] font-bold text-rose-400 uppercase tracking-wider">Formatting Errors</p>
                    {parsedIds.map((item, idx) => {
                      if (item.isValid) return null;
                      return (
                        <div key={idx} className="flex justify-between text-xs text-rose-400 font-mono">
                          <span className="truncate max-w-[150px]">{item.raw || '<empty>'}</span>
                          <span>({item.error})</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}

            <button
              type="button"
              onClick={handleGenerate}
              disabled={validCount === 0 || isGenerating}
              className="w-full inline-flex justify-center items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-4 text-sm font-semibold text-white shadow-lg shadow-indigo-600/30 hover:bg-indigo-500 hover:shadow-indigo-500/40 active:bg-indigo-750 transition duration-205 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Generating {validCount} Codes...
                </>
              ) : (
                <>
                  <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                  </svg>
                  Generate All ({validCount} Valid)
                </>
              )}
            </button>
          </div>

          {/* Results Panel */}
          <div className="lg:col-span-7 bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
              <h2 className="text-xl font-bold text-slate-200">
                Generated Grid
              </h2>
              {results.length > 0 && (
                <button
                  type="button"
                  onClick={handleDownloadZip}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-md shadow-emerald-600/30 hover:bg-emerald-500 hover:shadow-emerald-500/40 active:bg-emerald-700 transition duration-200"
                >
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Download ZIP
                </button>
              )}
            </div>

            {warningMsg && (
              <div className="p-3 bg-amber-950/40 border border-amber-800/40 rounded-xl text-xs text-amber-300">
                {warningMsg}
              </div>
            )}

            {results.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-slate-500 space-y-3">
                <svg className="h-16 w-16 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-sm">No codes generated yet. Paste valid IDs and hit Generate.</p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 max-h-[500px] overflow-y-auto pr-2">
                {results.map((item, index) => {
                  if (item.error) {
                    return (
                      <div key={index} className="flex flex-col items-center justify-center p-4 border border-rose-900/40 bg-rose-950/20 rounded-2xl h-[170px] space-y-1">
                        <span className="text-rose-400 font-bold text-xs uppercase tracking-wider">Error</span>
                        <p className="text-[10px] text-rose-300 text-center font-mono break-all px-1 leading-normal">{item.id}</p>
                        <span className="text-[10px] text-rose-400 text-center">{item.error}</span>
                      </div>
                    );
                  }

                  return (
                    <div key={index} className="flex flex-col items-center p-3 border border-slate-800 bg-slate-950 rounded-2xl space-y-2 hover:border-slate-700 transition duration-150">
                      <div className="rounded-xl overflow-hidden bg-white p-1.5 shadow-inner">
                        <img
                          src={item.pngBase64}
                          alt={`circular-id-${item.id}`}
                          className="h-28 w-28 object-contain rounded-lg"
                        />
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 font-semibold">{item.id}</span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
