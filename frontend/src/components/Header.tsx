'use client';

import React from 'react';

interface HeaderProps {
  onReset?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onReset }) => {
  return (
    <header className="w-full border-b border-white/[0.06] bg-[#08090d]/95 backdrop-blur-md sticky top-0 z-50">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5 sm:px-6">
        {/* Left: Brand */}
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 group cursor-pointer"
          aria-label="SecureX Reset"
        >
          <div className="h-6 w-6 rounded-xs border border-cyan-500/40 bg-cyan-500/10 flex items-center justify-center text-cyan-400 font-mono font-bold text-xs">
            SX
          </div>
          <div>
            <span className="font-mono font-bold tracking-tight text-white text-sm sm:text-base block leading-none">
              SECURE<span className="text-cyan-400">X</span>
            </span>
            <span className="text-[9px] font-mono tracking-widest text-neutral-400 uppercase block mt-0.5">
              METADATA PRIVACY SCANNER
            </span>
          </div>
        </button>

      </div>
    </header>
  );
};
