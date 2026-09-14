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
}

export const FindingsList: React.FC<FindingsListProps> = ({
  findings,
  selectedIds,
  onToggleFinding,
  onSelectAll,
  onDeselectAll,
  disabled = false,
}) => {
  if (findings.length === 0) {
    return (
      <div className="rounded-xs border border-white/[0.08] bg-[#0c0e14] p-8 text-center">
        <span className="font-mono text-[10px] tracking-widest text-cyan-400 font-bold uppercase block mb-1">
          SCAN COMPLETE
        </span>
        <h3 className="text-base font-bold text-white tracking-tight mt-1">
          NO PRIVACY EXPOSURES FOUND
        </h3>
        <p className="mt-2 text-xs text-neutral-400 max-w-sm mx-auto">
          Your file contains no detected privacy-sensitive metadata and is safe to share.
        </p>
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
        <div>
          <span className="font-mono text-[10px] tracking-widest text-cyan-400 font-bold uppercase block mb-0.5">
            SCAN COMPLETE
          </span>
          <h3 className="font-mono text-sm sm:text-base font-bold text-white tracking-wide uppercase">
            {findings.length} {findings.length === 1 ? 'PRIVACY EXPOSURE' : 'PRIVACY EXPOSURES'} FOUND
          </h3>
        </div>

        {/* Quick Selection Buttons */}
        <div className="flex items-center gap-3 font-mono text-xs">
          <button
            type="button"
            onClick={onSelectAll}
            disabled={disabled || selectedIds.size === findings.length}
            className="text-cyan-400 hover:text-cyan-300 disabled:opacity-40 disabled:hover:text-cyan-400 cursor-pointer focus:outline-none"
          >
            Select All
          </button>
          <span className="text-neutral-600">/</span>
          <button
            type="button"
            onClick={onDeselectAll}
            disabled={disabled || selectedIds.size === 0}
            className="text-neutral-400 hover:text-white disabled:opacity-40 disabled:hover:text-neutral-400 cursor-pointer focus:outline-none"
          >
            Deselect All
          </button>
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
