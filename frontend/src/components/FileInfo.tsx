'use client';

import React from 'react';

interface FileInfoProps {
  filename: string;
  sizeBytes: number;
  mimeType: string;
  onAnalyze: () => void;
  onChangeFile: () => void;
  isLoading?: boolean;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}

function getFormatShort(mimeType: string, filename: string): string {
  const ext = filename.split('.').pop()?.toUpperCase();
  if (ext === 'JPG' || ext === 'JPEG' || mimeType === 'image/jpeg') return 'JPEG';
  if (ext === 'PNG' || mimeType === 'image/png') return 'PNG';
  if (ext === 'PDF' || mimeType === 'application/pdf') return 'PDF';
  return 'FILE';
}

export const FileInfo: React.FC<FileInfoProps> = ({
  filename,
  sizeBytes,
  mimeType,
  onAnalyze,
  onChangeFile,
  isLoading = false,
}) => {
  const format = getFormatShort(mimeType, filename);

  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-6 sm:p-7 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        {/* File Information */}
        <div className="min-w-0 flex-1">
          <span className="font-mono text-[10px] tracking-widest text-red-600 font-bold uppercase block mb-1">
            FILE READY
          </span>
          <h3 className="text-base sm:text-lg font-bold text-slate-900 truncate">
            {filename}
          </h3>

          <div className="mt-1.5 flex items-center gap-2.5 font-mono text-xs text-slate-500">
            <span className="text-slate-800 font-medium">{format}</span>
            <span className="text-slate-300">•</span>
            <span>{formatBytes(sizeBytes)}</span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={onChangeFile}
            disabled={isLoading}
            className="rounded-lg border border-slate-300 bg-white px-3.5 py-2 font-mono text-xs text-slate-700 hover:text-slate-900 hover:bg-slate-50 transition-colors disabled:opacity-40 cursor-pointer"
          >
            Change File
          </button>

          <button
            type="button"
            onClick={onAnalyze}
            disabled={isLoading}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 hover:bg-red-700 px-5 py-2 font-mono text-xs font-bold tracking-wider text-white transition-all shadow-md shadow-red-600/20 disabled:opacity-40 cursor-pointer"
          >
            {isLoading ? (
              <>
                <span className="h-3 w-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                <span>SCANNING...</span>
              </>
            ) : (
              <span>[ ANALYZE FILE ]</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
