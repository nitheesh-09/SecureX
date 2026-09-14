'use client';

import React from 'react';

interface HeroProps {
  onScanClick: () => void;
}

export const Hero: React.FC<HeroProps> = ({ onScanClick }) => {
  return (
    <section className="py-10 sm:py-14 text-center">
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {/* Technical Label */}
        <div className="inline-flex items-center gap-2 rounded-full border border-red-200 bg-red-50 px-3 py-1 font-mono text-[10px] tracking-widest text-red-700 uppercase mb-5 font-semibold">
          <span className="h-1.5 w-1.5 rounded-full bg-red-600 animate-pulse" />
          <span>METADATA PRIVACY SCANNER</span>
        </div>

        {/* Main Headline */}
        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-slate-900">
          See what your files <span className="text-red-600">reveal.</span>
        </h1>

        {/* Supporting Text */}
        <p className="mx-auto mt-4 max-w-xl text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
          Discover hidden metadata, remove what you choose, and verify your file before sharing.
        </p>

        {/* Primary CTA & Format Specs */}
        <div className="mt-7 flex flex-col items-center justify-center gap-3">
          <button
            type="button"
            onClick={onScanClick}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 px-7 py-3 text-xs font-mono font-bold tracking-wider text-white transition-all shadow-md shadow-red-600/20 active:scale-[0.99] focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 cursor-pointer"
          >
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M7.5 12L12 7.5m0 0L16.5 12M12 7.5v12" />
            </svg>
            <span>SCAN A FILE</span>
          </button>

          <span className="font-mono text-[11px] tracking-wider text-slate-400 uppercase font-medium">
            JPEG / PNG / PDF • MAX 25 MB
          </span>
        </div>
      </div>
    </section>
  );
};
