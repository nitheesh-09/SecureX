'use client';

import React from 'react';

interface SanitizationPanelProps {
  selectedCount: number;
  totalCount: number;
  onSanitize: () => void;
  isSanitizing: boolean;
  disabled?: boolean;
}

export const SanitizationPanel: React.FC<SanitizationPanelProps> = ({
  selectedCount,
  totalCount,
  onSanitize,
  isSanitizing,
  disabled = false,
}) => {
  const isButtonDisabled = disabled || isSanitizing || selectedCount === 0;

  return (
    <div className="rounded-xs border border-white/[0.08] bg-[#0c0e14] p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Selection Status */}
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs text-neutral-300">
            <strong className="text-cyan-400 font-bold">{selectedCount}</strong>{' '}
            {selectedCount === 1 ? 'item' : 'items'} selected
          </span>
          <span className="text-neutral-600 font-mono text-xs">•</span>
          <span className="text-[11px] text-neutral-500 font-mono">
            {totalCount} removable total
          </span>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onSanitize}
          disabled={isButtonDisabled}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xs border border-cyan-400 bg-cyan-500/15 px-6 py-2.5 font-mono text-xs font-bold tracking-wider text-cyan-300 hover:bg-cyan-500/25 hover:text-white transition-all shadow-[0_0_15px_rgba(0,216,246,0.15)] disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSanitizing ? (
            <>
              <span className="h-3 w-3 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin" />
              <span>[ PROTECTING... ]</span>
            </>
          ) : (
            <span>[ PROTECT MY FILE ]</span>
          )}
        </button>
      </div>
    </div>
  );
};
