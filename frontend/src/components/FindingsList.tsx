'use client';

import React from 'react';
import { PrivacyFinding } from '@/types/api';
import { FindingCard } from './FindingCard';

interface FindingsListProps {
  findings: PrivacyFinding[];
  selectedIds: Set<string>;
  onToggleFinding: (id: string) => void;
  onSelectAll: () => void;
  onDeselectAll: () => void;
  disabled?: boolean;
  onReset?: () => void;
}

export const FindingsList: React.FC<FindingsListProps> = ({
  findings,
  selectedIds,
  onToggleFinding,
  onSelectAll,
  onDeselectAll,
  disabled = false,
  onReset,
}) => {
  if (findings.length === 0) {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center space-y-6 shadow-sm">
        <div>
          <span className="font-mono text-[10px] tracking-widest text-emerald-600 font-bold uppercase block mb-2">
            SCAN COMPLETE • FILE SECURE
          </span>
          <div className="font-mono text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight my-2">
            100 <span className="text-xl text-slate-400 font-normal">/ 100</span>
          </div>
          <span className="inline-block font-mono text-xs font-bold uppercase px-3 py-1 rounded-md border text-emerald-700 border-emerald-200 bg-emerald-50 mt-1">
            SAFE
          </span>
        </div>

        <div className="pt-2 border-t border-slate-200">
          <h3 className="text-base font-bold text-slate-900 tracking-tight">
            NO PRIVACY EXPOSURES FOUND
          </h3>
          <p className="mt-2 text-xs text-slate-500 max-w-sm mx-auto">
            Your file contains no detected privacy-sensitive metadata (such as GPS coordinates, camera hardware serials, or personal author info). It is completely clean and safe to share.
          </p>
        </div>

        {onReset && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 px-6 py-2.5 font-mono text-xs font-bold tracking-wider text-white transition-all shadow-md shadow-red-600/20 cursor-pointer"
            >
              [ SCAN ANOTHER FILE ]
            </button>
          </div>
        )}
      </div>
    );
  }

  // Sort findings: CRITICAL -> HIGH -> MEDIUM -> LOW
  const severityRank: Record<string, number> = {
    CRITICAL: 4,
    HIGH: 3,
    MEDIUM: 2,
    LOW: 1,
  };

  const sortedFindings = [...findings].sort((a, b) => {
    const rankA = severityRank[a.severity] || 0;
    const rankB = severityRank[b.severity] || 0;
    return rankB - rankA;
  });

  return (
    <div className="space-y-4">
      {/* Section Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
        <div>
          <span className="font-mono text-[10px] tracking-widest text-red-600 font-bold uppercase block mb-0.5">
            SCAN COMPLETE
          </span>
          <h3 className="font-mono text-sm sm:text-base font-bold text-slate-900 tracking-wide uppercase">
            {findings.length} {findings.length === 1 ? 'PRIVACY EXPOSURE' : 'PRIVACY EXPOSURES'} FOUND
          </h3>
        </div>

        {/* Quick Selection Buttons */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <button
            type="button"
            onClick={onSelectAll}
            disabled={disabled || selectedIds.size === findings.length}
            className="text-red-600 hover:text-red-700 font-semibold disabled:opacity-40 cursor-pointer focus:outline-none"
          >
            Select All
          </button>
          <span className="text-slate-300">/</span>
          <button
            type="button"
            onClick={onDeselectAll}
            disabled={disabled || selectedIds.size === 0}
            className="text-slate-500 hover:text-slate-900 disabled:opacity-40 cursor-pointer focus:outline-none"
          >
            Deselect All
          </button>
          {onReset && (
            <>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={onReset}
                className="text-slate-500 hover:text-red-600 cursor-pointer focus:outline-none font-medium"
              >
                Scan Another
              </button>
            </>
          )}
        </div>
      </div>

      {/* Cards List */}
      <div className="space-y-2.5">
        {sortedFindings.map((finding) => (
          <FindingCard
            key={finding.id}
            finding={finding}
            isSelected={selectedIds.has(finding.id)}
            onToggle={onToggleFinding}
            disabled={disabled}
          />
        ))}
      </div>
    </div>
  );
};
