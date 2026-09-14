'use client';

import React from 'react';
import { ScoreComparison, SecurityScore as SecurityScoreType } from '@/types/api';

interface SecurityScoreProps {
  scoreComparison: ScoreComparison;
  security: SecurityScoreType;
}

function getRiskBadge(level: string): { label: string; badgeColor: string; textColor: string; barColor: string } {
  const norm = level.toUpperCase();
  if (norm === 'SAFE') {
    return {
      label: 'SAFE',
      badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      textColor: 'text-emerald-700',
      barColor: 'bg-emerald-500',
    };
  }
  if (norm === 'LOW RISK') {
    return {
      label: 'LOW RISK',
      badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
      textColor: 'text-blue-700',
      barColor: 'bg-blue-500',
    };
  }
  if (norm === 'MEDIUM RISK') {
    return {
      label: 'MEDIUM RISK',
      badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
      textColor: 'text-amber-700',
      barColor: 'bg-amber-500',
    };
  }
  return {
    label: 'HIGH RISK',
    badgeColor: 'bg-red-50 text-red-700 border-red-200',
    textColor: 'text-red-700',
    barColor: 'bg-red-600',
  };
}

function getBeforeRiskLevel(score: number): string {
  if (score >= 90) return 'SAFE';
  if (score >= 70) return 'LOW RISK';
  if (score >= 40) return 'MEDIUM RISK';
  return 'HIGH RISK';
}

export const SecurityScore: React.FC<SecurityScoreProps> = ({
  scoreComparison,
  security,
}) => {
  const beforeLevel = getBeforeRiskLevel(scoreComparison.before_score);
  const beforeConfig = getRiskBadge(beforeLevel);
  const afterConfig = getRiskBadge(security.risk_level);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
      <div className="flex items-center justify-between border-b border-slate-200 pb-4 mb-6">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-widest text-red-600">
            Privacy Impact Assessment
          </h3>
          <h2 className="text-xl font-extrabold text-slate-900 tracking-tight mt-1">
            Security Score Comparison
          </h2>
        </div>
        {scoreComparison.improvement > 0 && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 border border-emerald-200 px-3.5 py-1 text-xs font-bold text-emerald-700">
            <svg className="h-3.5 w-3.5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
            </svg>
            +{scoreComparison.improvement} POINTS IMPROVED
          </span>
        )}
      </div>

      {/* Comparison Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Before Sanitization Box */}
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-center">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-2">
            Before Sanitization
          </p>
          <div className="text-4xl sm:text-5xl font-extrabold text-slate-900">
            {scoreComparison.before_score}
            <span className="text-lg font-normal text-slate-400"> / 100</span>
          </div>
          <div className="mt-3">
            <span className={`inline-block rounded-md px-2.5 py-1 text-xs font-bold border ${beforeConfig.badgeColor}`}>
              {beforeConfig.label}
            </span>
          </div>
          {/* Visual Mini Bar */}
          <div className="mt-4 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className={`h-full ${beforeConfig.barColor}`}
              style={{ width: `${Math.max(4, scoreComparison.before_score)}%` }}
            />
          </div>
        </div>

        {/* Transition Arrow */}
        <div className="flex flex-col items-center justify-center py-2 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-50 border border-red-200 text-red-600 shadow-xs">
            <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
            </svg>
          </div>
          <p className="mt-2 text-xs font-medium text-slate-500">
            Selective Metadata Scrubbing
          </p>
        </div>

        {/* After Sanitization Box */}
        <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-5 text-center shadow-xs">
          <p className="text-xs font-semibold uppercase tracking-wider text-emerald-700 mb-2">
            Verified Post-Sanitization
          </p>
          <div className="text-4xl sm:text-5xl font-extrabold text-slate-900">
            {security.score}
            <span className="text-lg font-normal text-slate-400"> / 100</span>
          </div>
          <div className="mt-3">
            <span className={`inline-block rounded-md px-2.5 py-1 text-xs font-bold border ${afterConfig.badgeColor}`}>
              {afterConfig.label}
            </span>
          </div>
          {/* Visual Mini Bar */}
          <div className="mt-4 h-2 w-full rounded-full bg-slate-200 overflow-hidden">
            <div
              className={`h-full ${afterConfig.barColor}`}
              style={{ width: `${Math.max(4, security.score)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Threshold Reference Legend */}
      <div className="mt-6 pt-4 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-[11px] text-slate-500">
        <span>Score Risk Model:</span>
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            90–100 Safe
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-blue-500" />
            70–89 Low Risk
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-amber-500" />
            40–69 Medium Risk
          </span>
          <span className="flex items-center gap-1">
            <span className="h-2 w-2 rounded-full bg-red-600" />
            0–39 High Risk
          </span>
        </div>
      </div>
    </div>
  );
};
