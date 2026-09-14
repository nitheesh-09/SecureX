'use client';

import React, { useState } from 'react';
import { FinalResult as FinalResultType } from '@/types/api';

interface FinalResultProps {
  result: FinalResultType;
  onDownload: () => Promise<void>;
  onReset: () => void;
}

function getRiskBadge(level: string) {
  const norm = level.toUpperCase();
  if (norm === 'SAFE') {
    return 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10';
  }
  if (norm === 'LOW RISK') {
    return 'text-cyan-400 border-cyan-500/40 bg-cyan-500/10';
  }
  if (norm === 'MEDIUM RISK') {
    return 'text-amber-400 border-amber-500/40 bg-amber-500/10';
  }
  return 'text-rose-400 border-rose-500/40 bg-rose-500/10';
}

function formatFieldName(field: string): string {
  const map: Record<string, string> = {
    GPSLatitude: 'GPS Latitude',
    GPSLongitude: 'GPS Longitude',
    GPSPosition: 'GPS Location',
    Make: 'Camera Make',
    Model: 'Camera Model',
    DateTimeOriginal: 'Creation Date & Time',
    ModifyDate: 'Modification Date',
    Software: 'Software',
    Artist: 'Author',
    Author: 'Author',
    Creator: 'Creator Software',
    Producer: 'Producer Tool',
    Title: 'Document Title',
    Subject: 'Subject',
  };
  if (map[field]) return map[field];
  return field
    .replace(/_/g, ' ')
    .replace(/([a-z])([A-Z])/g, '$1 $2');
}

export const FinalResult: React.FC<FinalResultProps> = ({
  result,
  onDownload,
  onReset,
}) => {
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const handleDownloadClick = async () => {
    try {
      setIsDownloading(true);
      await onDownload();
      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch {
      // Error handled by parent
    } finally {
      setIsDownloading(false);
    }
  };

  const badgeClass = getRiskBadge(result.security.risk_level);

  return (
    <div className="rounded-xs border border-white/[0.08] bg-[#0c0e14] p-6 sm:p-8">
      {/* Top Banner & Main Score */}
      <div className="text-center pb-6 border-b border-white/[0.08]">
        <span className="font-mono text-[11px] tracking-widest text-cyan-400 font-bold uppercase block mb-3">
          FILE PROTECTED
        </span>

        <div className="font-mono text-4xl sm:text-5xl font-extrabold text-white tracking-tight">
          {result.security.score} <span className="text-xl text-neutral-500 font-normal">/ 100</span>
        </div>

        <div className="mt-3">
          <span className={`inline-block font-mono text-xs font-bold uppercase px-3 py-1 rounded-xs border ${badgeClass}`}>
            {result.security.risk_level}
          </span>
        </div>

        {/* Before -> After Comparison */}
        <div className="mt-6 inline-flex flex-col items-center rounded-xs border border-white/[0.06] bg-white/[0.02] px-6 py-3 font-mono text-xs">
          <div className="flex items-center gap-4 text-neutral-400">
            <div className="text-center">
              <span className="text-[10px] uppercase text-neutral-500 block mb-0.5">BEFORE</span>
              <span className="text-white font-bold">{result.score.before_score}/100</span>
            </div>
            <span className="text-cyan-400 text-sm">→</span>
            <div className="text-center">
              <span className="text-[10px] uppercase text-neutral-500 block mb-0.5">AFTER</span>
              <span className="text-cyan-300 font-bold">{result.score.after_score}/100</span>
            </div>
          </div>

          {result.score.improvement > 0 && (
            <div className="mt-2 text-[11px] font-bold text-emerald-400 tracking-wider">
              +{result.score.improvement} POINTS
            </div>
          )}
        </div>
      </div>

      {/* Removed vs Remaining Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-white/[0.08] font-mono text-xs">
        {/* REMOVED */}
        <div>
          <h4 className="text-[11px] font-bold tracking-widest text-emerald-400 uppercase mb-3">
            REMOVED
          </h4>
          {result.removed_fields.length > 0 ? (
            <ul className="space-y-1.5 text-neutral-300">
              {result.removed_fields.map((field) => (
                <li key={field} className="flex items-center gap-2">
                  <span className="text-emerald-400 font-bold">✓</span>
                  <span>{formatFieldName(field)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-neutral-500 italic">None</p>
          )}
        </div>

        {/* REMAINING */}
        <div>
          <h4 className="text-[11px] font-bold tracking-widest text-neutral-400 uppercase mb-3">
            REMAINING
          </h4>
          {result.remaining_fields.length > 0 ? (
            <ul className="space-y-1.5 text-neutral-400">
              {result.remaining_fields.map((field) => (
                <li key={field} className="flex items-center gap-2">
                  <span className="text-neutral-600 font-bold">•</span>
                  <span>{formatFieldName(field)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-emerald-400/80">None (All clear)</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleDownloadClick}
          disabled={isDownloading}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xs border border-cyan-400 bg-cyan-500/15 px-6 py-2.5 font-mono text-xs font-bold tracking-wider text-cyan-300 hover:bg-cyan-500/25 hover:text-white transition-all shadow-[0_0_15px_rgba(0,216,246,0.15)] disabled:opacity-40 cursor-pointer"
        >
          {isDownloading ? (
            <>
              <span className="h-3 w-3 border-2 border-cyan-300 border-t-transparent rounded-full animate-spin" />
              <span>DOWNLOADING...</span>
            </>
          ) : downloadSuccess ? (
            <span>✓ FILE DOWNLOADED</span>
          ) : (
            <span>[ DOWNLOAD SECURE FILE ]</span>
          )}
        </button>

        <button
          type="button"
          onClick={onReset}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-xs border border-white/[0.12] bg-white/[0.03] px-5 py-2.5 font-mono text-xs text-neutral-300 hover:text-white hover:border-white/[0.2] transition-colors cursor-pointer"
        >
          <span>[ SCAN ANOTHER FILE ]</span>
        </button>
      </div>
    </div>
  );
};
