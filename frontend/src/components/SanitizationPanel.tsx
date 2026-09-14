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
    <div className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Selection Status */}
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-xs text-slate-700">
            <strong className="text-red-600 font-bold">{selectedCount}</strong>{' '}
            {selectedCount === 1 ? 'item' : 'items'} selected
          </span>
          <span className="text-slate-300 font-mono text-xs">•</span>
          <span className="text-[11px] text-slate-500 font-mono">
            {totalCount} removable total
          </span>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={onSanitize}
          disabled={isButtonDisabled}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 px-6 py-2.5 font-mono text-xs font-bold tracking-wider text-white transition-all shadow-md shadow-red-600/20 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isSanitizing ? (
            <>
              <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
