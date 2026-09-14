'use client';

import React from 'react';
import { PrivacyFinding, SeverityLevel } from '@/types/api';

interface FindingCardProps {
  finding: PrivacyFinding;
  isSelected: boolean;
  onToggle: (id: string) => void;
  disabled?: boolean;
}

interface SeverityTheme {
  badge: string;
  label: string;
  tagBorder: string;
}

function getSeverityTheme(severity: SeverityLevel): SeverityTheme {
  switch (severity) {
    case 'CRITICAL':
      return {
        badge: 'text-rose-400 bg-rose-500/10 border-rose-500/30',
        label: 'CRITICAL RISK',
        tagBorder: 'border-l-2 border-l-rose-500',
      };
    case 'HIGH':
      return {
        badge: 'text-amber-400 bg-amber-500/10 border-amber-500/30',
        label: 'HIGH RISK',
        tagBorder: 'border-l-2 border-l-amber-500',
      };
    case 'MEDIUM':
      return {
        badge: 'text-yellow-300 bg-yellow-500/10 border-yellow-500/30',
        label: 'MEDIUM',
        tagBorder: 'border-l-2 border-l-yellow-500',
      };
    case 'LOW':
    default:
      return {
        badge: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30',
        label: 'LOW',
        tagBorder: 'border-l-2 border-l-cyan-500',
      };
  }
}

export const FindingCard: React.FC<FindingCardProps> = ({
  finding,
  isSelected,
  onToggle,
  disabled = false,
}) => {
  const theme = getSeverityTheme(finding.severity);
  const inputId = `chk-${finding.id}`;

  return (
    <div
      className={`rounded-sm border p-5 transition-all ${theme.tagBorder} ${
        isSelected
          ? 'border-white/[0.12] bg-[#0c0e14]'
          : 'border-white/[0.04] bg-[#090b10] opacity-60'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        {/* Finding Details */}
        <div className="flex-1 min-w-0">
          {/* Top metadata tags */}
          <div className="flex items-center gap-3 font-mono text-[10px] tracking-wider mb-2">
            <span className={`rounded-xs px-2 py-0.5 font-bold uppercase border ${theme.badge}`}>
              {theme.label}
            </span>
            <span className="text-neutral-400 uppercase">
              {finding.category.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Finding Title */}
          <h4 className="text-base font-bold text-white tracking-tight">
            {finding.title}
          </h4>

          {/* Value Display */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="text-neutral-500">{finding.field}:</span>
            <span className="bg-white/[0.03] border border-white/[0.08] px-2 py-0.5 text-cyan-300 rounded-xs break-all">
              {finding.value || '(empty)'}
            </span>
          </div>

          {/* Explanation */}
          <p className="mt-2.5 text-xs text-neutral-400 font-normal leading-relaxed">
            {finding.explanation}
          </p>
        </div>

        {/* Action Button / Checkbox */}
        <div className="shrink-0 self-start sm:self-center">
          <label
            htmlFor={inputId}
            className={`inline-flex items-center gap-2 cursor-pointer select-none rounded-sm border px-3.5 py-2 font-mono text-xs font-semibold transition-colors ${
              isSelected
                ? 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20'
                : 'border-white/[0.1] bg-white/[0.02] text-neutral-400 hover:border-white/[0.2] hover:text-white'
            } ${disabled ? 'opacity-40 cursor-not-allowed' : ''}`}
          >
            <input
              id={inputId}
              type="checkbox"
              checked={isSelected}
              onChange={() => onToggle(finding.id)}
              disabled={disabled || !finding.removable}
              className="sr-only"
            />
            <span>{isSelected ? '[✓ REMOVE]' : '[ KEEP ]'}</span>
          </label>
        </div>
      </div>
    </div>
  );
};
