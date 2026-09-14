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
        badge: 'text-red-700 bg-red-50 border-red-200',
        label: 'CRITICAL RISK',
        tagBorder: 'border-l-4 border-l-red-600',
      };
    case 'HIGH':
      return {
        badge: 'text-orange-700 bg-orange-50 border-orange-200',
        label: 'HIGH RISK',
        tagBorder: 'border-l-4 border-l-orange-500',
      };
    case 'MEDIUM':
      return {
        badge: 'text-amber-700 bg-amber-50 border-amber-200',
        label: 'MEDIUM RISK',
        tagBorder: 'border-l-4 border-l-amber-500',
      };
    case 'LOW':
    default:
      return {
        badge: 'text-slate-700 bg-slate-100 border-slate-200',
        label: 'LOW RISK',
        tagBorder: 'border-l-4 border-l-slate-400',
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
      className={`rounded-xl border p-4 sm:p-5 transition-all shadow-xs ${theme.tagBorder} ${
        isSelected
          ? 'border-red-200 bg-red-50/30'
          : 'border-slate-200 bg-white opacity-70'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        {/* Finding Details */}
        <div className="flex-1 min-w-0">
          {/* Top metadata tags */}
          <div className="flex items-center gap-3 font-mono text-[10px] tracking-wider mb-2">
            <span className={`rounded px-2 py-0.5 font-bold uppercase border ${theme.badge}`}>
              {theme.label}
            </span>
            <span className="text-slate-500 uppercase">
              {finding.category.replace(/_/g, ' ')}
            </span>
          </div>

          {/* Finding Title */}
          <h4 className="text-base font-bold text-slate-900 tracking-tight">
            {finding.title}
          </h4>

          {/* Value Display */}
          <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs font-mono">
            <span className="text-slate-500">{finding.field}:</span>
            <span className="bg-slate-50 border border-slate-200 px-2 py-0.5 text-red-700 font-semibold rounded break-all">
              {finding.value || '(empty)'}
            </span>
          </div>

          {/* Explanation */}
          <p className="mt-2.5 text-xs text-slate-600 font-normal leading-relaxed">
            {finding.explanation}
          </p>
        </div>

        {/* Action Button / Checkbox */}
        <div className="shrink-0 self-start sm:self-center">
          <label
            htmlFor={inputId}
            className={`inline-flex items-center gap-2 cursor-pointer select-none rounded-lg border px-3.5 py-2 font-mono text-xs font-semibold transition-colors ${
              isSelected
                ? 'border-red-600 bg-red-600 text-white shadow-xs'
                : 'border-slate-300 bg-white text-slate-700 hover:border-slate-400 hover:bg-slate-50'
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
