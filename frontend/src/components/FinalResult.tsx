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
    return 'text-emerald-700 border-emerald-200 bg-emerald-50';
  }
  if (norm === 'LOW RISK') {
    return 'text-blue-700 border-blue-200 bg-blue-50';
  }
  if (norm === 'MEDIUM RISK') {
    return 'text-amber-700 border-amber-200 bg-amber-50';
  }
  return 'text-red-700 border-red-200 bg-red-50';
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
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-8 shadow-sm">
      {/* Top Banner & Main Score */}
      <div className="text-center pb-6 border-b border-slate-200">
        <span className="font-mono text-[11px] tracking-widest text-red-600 font-bold uppercase block mb-3">
          FILE PROTECTED
        </span>

        <div className="font-mono text-4xl sm:text-5xl font-extrabold text-slate-900 tracking-tight">
          {result.security.score} <span className="text-xl text-slate-400 font-normal">/ 100</span>
        </div>

        <div className="mt-3">
          <span className={`inline-block font-mono text-xs font-bold uppercase px-3 py-1 rounded-md border ${badgeClass}`}>
            {result.security.risk_level}
          </span>
        </div>

        {/* Before -> After Comparison */}
        <div className="mt-6 inline-flex flex-col items-center rounded-xl border border-slate-200 bg-slate-50 px-6 py-3 font-mono text-xs shadow-2xs">
          <div className="flex items-center gap-4 text-slate-600">
            <div className="text-center">
              <span className="text-[10px] uppercase text-slate-400 block mb-0.5">BEFORE</span>
              <span className="text-slate-900 font-bold">{result.score.before_score}/100</span>
            </div>
            <span className="text-red-600 font-bold text-sm">→</span>
            <div className="text-center">
              <span className="text-[10px] uppercase text-slate-400 block mb-0.5">AFTER</span>
              <span className="text-red-600 font-bold">{result.score.after_score}/100</span>
            </div>
          </div>

          {result.score.improvement > 0 && (
            <div className="mt-2 text-[11px] font-bold text-emerald-600 tracking-wider">
              +{result.score.improvement} POINTS IMPROVED
            </div>
          )}
        </div>
      </div>

      {/* Removed vs Remaining Breakdown */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 py-6 border-b border-slate-200 font-mono text-xs">
        {/* REMOVED */}
        <div>
          <h4 className="text-[11px] font-bold tracking-widest text-emerald-700 uppercase mb-3">
            REMOVED
          </h4>
          {result.removed_fields.length > 0 ? (
            <ul className="space-y-1.5 text-slate-700">
              {result.removed_fields.map((field) => (
                <li key={field} className="flex items-center gap-2">
                  <span className="text-emerald-600 font-bold">✓</span>
                  <span>{formatFieldName(field)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-slate-400 italic">None</p>
          )}
        </div>

        {/* REMAINING */}
        <div>
          <h4 className="text-[11px] font-bold tracking-widest text-slate-500 uppercase mb-3">
            REMAINING
          </h4>
          {result.remaining_fields.length > 0 ? (
            <ul className="space-y-1.5 text-slate-500">
              {result.remaining_fields.map((field) => (
                <li key={field} className="flex items-center gap-2">
                  <span className="text-slate-400 font-bold">•</span>
                  <span>{formatFieldName(field)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-emerald-600 font-medium">None (All clear)</p>
          )}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-6 flex flex-col sm:flex-row items-center justify-center gap-3">
        <button
          type="button"
          onClick={handleDownloadClick}
          disabled={isDownloading}
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 px-6 py-2.5 font-mono text-xs font-bold tracking-wider text-white transition-all shadow-md shadow-red-600/20 disabled:opacity-40 cursor-pointer"
        >
          {isDownloading ? (
            <>
              <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
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
          className="w-full sm:w-auto inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-5 py-2.5 font-mono text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors cursor-pointer font-medium"
        >
          <span>[ SCAN ANOTHER FILE ]</span>
        </button>
      </div>
    </div>
  );
};
