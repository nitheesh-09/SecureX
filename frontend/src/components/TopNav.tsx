'use client';

import React from 'react';

export type ActiveAppView = 'chat-prototype' | 'metadata-scanner';

interface TopNavProps {
  activeView: ActiveAppView;
  onViewChange: (view: ActiveAppView) => void;
}

export const TopNav: React.FC<TopNavProps> = ({ activeView, onViewChange }) => {
  return (
    <nav className="w-full bg-white border-b border-slate-200 px-3 sm:px-6 py-2 flex items-center justify-between text-xs font-mono z-40 select-none shadow-xs">
      <div className="flex items-center gap-2">
        <span className="text-[10px] uppercase tracking-widest text-slate-500 font-semibold hidden sm:inline">
          Workspace Mode:
        </span>
        <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
          <button
            type="button"
            onClick={() => onViewChange('chat-prototype')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeView === 'chat-prototype'
                ? 'bg-red-600 text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <svg
              className={`w-3.5 h-3.5 ${activeView === 'chat-prototype' ? 'text-white' : 'text-slate-500'}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
            </svg>
            <span>Secure ZIP Transfer (Prototype)</span>
          </button>

          <button
            type="button"
            onClick={() => onViewChange('metadata-scanner')}
            className={`px-2.5 sm:px-3 py-1.5 rounded-md font-medium transition-all flex items-center gap-1.5 cursor-pointer ${
              activeView === 'metadata-scanner'
                ? 'bg-red-600 text-white shadow-xs font-semibold'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
            }`}
          >
            <svg
              className={`w-3.5 h-3.5 ${activeView === 'metadata-scanner' ? 'text-white' : 'text-slate-500'}`}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <span>Single-File Scanner</span>
          </button>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <span className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-50 text-[10px] text-red-700 font-semibold border border-red-200">
          <span className="w-1.5 h-1.5 rounded-full bg-red-600 animate-pulse" />
          SecureX Protocol v2.0
        </span>
      </div>
    </nav>
  );
};
