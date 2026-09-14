'use client';

import React from 'react';
import { ZipAttachment } from '@/types/chat';
import { triggerZipDownload } from '@/lib/zipPrivacyScanner';

interface ZipFilePreviewProps {
  attachment: ZipAttachment;
  isOutgoing?: boolean;
  onOpenInspector?: (attachment: ZipAttachment) => void;
  className?: string;
}

export const ZipFilePreview: React.FC<ZipFilePreviewProps> = ({
  attachment,
  isOutgoing = true,
  onOpenInspector,
  className = '',
}) => {
  const getRiskColor = (level: string) => {
    switch (level.toUpperCase()) {
      case 'SAFE':
        return {
          badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          text: 'text-emerald-600',
          bar: 'bg-emerald-500',
        };
      case 'LOW RISK':
        return {
          badge: 'bg-blue-50 text-blue-700 border-blue-200',
          text: 'text-blue-600',
          bar: 'bg-blue-500',
        };
      case 'MEDIUM RISK':
        return {
          badge: 'bg-amber-50 text-amber-800 border-amber-200',
          text: 'text-amber-600',
          bar: 'bg-amber-500',
        };
      default:
        return {
          badge: 'bg-red-50 text-red-700 border-red-200',
          text: 'text-red-600',
          bar: 'bg-red-600',
        };
    }
  };

  const risk = getRiskColor(attachment.score?.risk_level || 'HIGH RISK');
  const score = attachment.privacyScanScore ?? attachment.score?.score ?? 35;
  const isSanitized = attachment.isSanitized;

  return (
    <div
      className={`rounded-xl border p-3.5 sm:p-4 transition-all ${
        isOutgoing
          ? 'bg-red-50/80 border-red-200 text-slate-900 shadow-sm'
          : 'bg-slate-50 border-slate-200 text-slate-900 shadow-sm'
      } ${className}`}
    >
      {/* Top row: ZIP icon, file details, perspective indicator */}
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {/* Custom ZIP Icon */}
          <div className="w-11 h-11 flex-shrink-0 rounded-lg bg-red-100 border border-red-200 flex items-center justify-center text-red-600 shadow-xs">
            <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M4 4v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6a2 2 0 0 0-2 2z" />
              <polyline points="14 2 14 8 20 8" />
              {/* Zipper Teeth */}
              <path d="M10 12h1M10 15h1M10 18h1" strokeWidth="2.5" strokeLinecap="round" />
              <circle cx="10" cy="9" r="1" fill="currentColor" />
            </svg>
          </div>

          {/* File Details */}
          <div className="min-w-0">
            <div className="font-mono text-sm font-semibold truncate text-slate-900" title={attachment.name}>
              {attachment.name}
            </div>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500 font-mono">
              <span>{attachment.formattedSize}</span>
              <span>•</span>
              <span className="text-red-700 font-semibold">
                {attachment.containedFiles?.length || 3} Files
              </span>
            </div>
          </div>
        </div>

        {/* Perspective Tag */}
        <span
          className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
            isOutgoing
              ? 'bg-red-600 text-white border-red-600 shadow-xs'
              : 'bg-slate-800 text-white border-slate-800'
          }`}
        >
          {isOutgoing ? 'Sender' : 'Receiver'}
        </span>
      </div>

      {/* Security Score Banner */}
      <div className="mt-3 p-2.5 rounded-lg bg-white border border-slate-200 space-y-2 shadow-2xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider font-medium">
              Privacy Score:
            </span>
            <span className="font-mono text-sm font-extrabold text-slate-900">
              {score} <span className="text-[10px] font-normal text-slate-400">/ 100</span>
            </span>
          </div>

          <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase border ${risk.badge}`}>
            {attachment.score?.risk_level || (score >= 90 ? 'SAFE' : 'HIGH RISK')}
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden">
          <div className={`h-full ${risk.bar} transition-all duration-500`} style={{ width: `${Math.max(4, score)}%` }} />
        </div>

        {/* Exposures count vs Sanitized status */}
        <div className="flex items-center justify-between text-[11px] font-mono pt-0.5">
          {isSanitized ? (
            <span className="text-emerald-700 flex items-center gap-1 font-semibold">
              <svg className="w-3 h-3 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
              Zero-Leak Verified (Clean)
            </span>
          ) : (
            <span className="text-red-700 flex items-center gap-1 font-semibold">
              ⚠️ {attachment.flaggedMetadataCount} Privacy Exposures Detected
            </span>
          )}

          <span className="text-slate-500 text-[10px]">
            {isSanitized ? 'Metadata Stripped' : 'Sanitization Required'}
          </span>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="mt-3 flex items-center gap-2">
        {/* Open Inspector Modal Button */}
        <button
          type="button"
          onClick={() => onOpenInspector?.(attachment)}
          className={`flex-1 py-2 px-3 rounded-lg font-mono text-xs font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
            !isSanitized && isOutgoing
              ? 'bg-red-600 hover:bg-red-700 text-white font-bold shadow-sm shadow-red-600/25'
              : 'bg-white hover:bg-slate-100 text-slate-700 border border-slate-300'
          }`}
        >
          <svg className="w-3.5 h-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
          <span>
            {isOutgoing && !isSanitized
              ? 'Inspect & Sanitize Risk'
              : 'View Privacy Certificate'}
          </span>
        </button>

        {/* Download Button */}
        <button
          type="button"
          onClick={() => triggerZipDownload(attachment)}
          className="p-2 rounded-lg bg-white hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-300 hover:border-emerald-300 transition-colors cursor-pointer shadow-2xs"
          title="Download Sanitized ZIP Archive"
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
          </svg>
        </button>
      </div>
    </div>
  );
};
