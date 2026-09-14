'use client';

import React from 'react';

interface HeaderProps {
  onReset?: () => void;
  canReset?: boolean;
  onSwitchToChat?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onReset, canReset = false, onSwitchToChat }) => {
  return (
    <header className="w-full border-b border-slate-200 bg-white/95 backdrop-blur-md sticky top-0 z-50 shadow-xs">
      <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-3.5 sm:px-6">
        {/* Left: Brand */}
        <button
          type="button"
          onClick={onReset}
          className="flex items-center gap-2.5 text-left focus:outline-none focus-visible:ring-1 focus-visible:ring-red-500 group cursor-pointer"
          aria-label="SecureX Reset"
        >
          <div className="h-6 w-6 rounded-xs border border-red-200 bg-red-50 flex items-center justify-center text-red-600 font-mono font-bold text-xs">
            SX
          </div>
          <div>
            <span className="font-mono font-bold tracking-tight text-slate-900 text-sm sm:text-base block leading-none">
              SECURE<span className="text-red-600 ml-0.5">X</span>
            </span>
            <span className="text-[9px] font-mono tracking-widest text-red-600 font-semibold uppercase block mt-0.5">
              METADATA PRIVACY SCANNER
            </span>
          </div>
        </button>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          {onSwitchToChat && (
            <button
              type="button"
              onClick={onSwitchToChat}
              className="rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 font-mono text-xs text-red-700 font-semibold hover:bg-red-100 hover:border-red-300 transition-all cursor-pointer"
            >
              💬 Secure Transfer Chat
            </button>
          )}
          {canReset && onReset && (
            <button
              type="button"
              onClick={onReset}
              className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-mono text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-100 transition-all cursor-pointer"
            >
              [ Scan Another File ]
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
