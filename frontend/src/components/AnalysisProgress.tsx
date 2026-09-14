'use client';

import React from 'react';

interface AnalysisProgressProps {
  label?: string;
}

export const AnalysisProgress: React.FC<AnalysisProgressProps> = () => {
  return (
    <div className="relative overflow-hidden rounded-xs border border-cyan-500/30 bg-[#0c0e14] p-8 sm:p-10 text-center">
      {/* Subtle scanning line effect */}
      <div className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-cyan-400 to-transparent animate-scanline opacity-75" />

      {/* Center Beacon Indicator */}
      <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full border border-cyan-500/30 bg-cyan-500/[0.06] mb-4">
        <span className="h-2 w-2 rounded-full bg-cyan-400 animate-beacon" />
      </div>

      {/* Main Status */}
      <h2 className="font-mono text-base font-bold tracking-widest text-white uppercase">
        SCANNING
      </h2>

      <p className="mt-1.5 text-xs text-neutral-400 font-normal">
        Inspecting hidden metadata...
      </p>
    </div>
  );
};
