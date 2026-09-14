'use client';

import React, { useRef, useState } from 'react';

interface FileUploaderProps {
  onFileSelected: (file: File) => void;
  onError: (error: string) => void;
  disabled?: boolean;
}

const MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024; // 25 MB

export const FileUploader: React.FC<FileUploaderProps> = ({
  onFileSelected,
  onError,
  disabled = false,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const validateAndSelectFile = (file: File) => {
    const filename = file.name.toLowerCase();

    // 1. Explicit ZIP check
    if (
      filename.endsWith('.zip') ||
      file.type === 'application/zip' ||
      file.type === 'application/x-zip-compressed'
    ) {
      onError('SecureX supports JPEG, PNG, and PDF files only. ZIP archives are not supported.');
      return;
    }

    // 2. Supported format check
    const isJpeg = filename.endsWith('.jpg') || filename.endsWith('.jpeg') || file.type === 'image/jpeg';
    const isPng = filename.endsWith('.png') || file.type === 'image/png';
    const isPdf = filename.endsWith('.pdf') || file.type === 'application/pdf';

    if (!isJpeg && !isPng && !isPdf) {
      onError('SecureX supports JPEG, PNG, and PDF files only.');
      return;
    }

    // 3. File size check
    if (file.size === 0) {
      onError('Uploaded file is empty (0 bytes). Please choose a valid file.');
      return;
    }

    if (file.size > MAX_FILE_SIZE_BYTES) {
      onError('File exceeds the 25 MB limit.');
      return;
    }

    onFileSelected(file);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSelectFile(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSelectFile(files[0]);
      e.target.value = '';
    }
  };

  const handleZoneClick = () => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      fileInputRef.current?.click();
    }
  };

  return (
    <div
      role="button"
      tabIndex={disabled ? -1 : 0}
      aria-label="Upload file drop zone"
      onClick={handleZoneClick}
      onKeyDown={handleKeyDown}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`relative flex flex-col items-center justify-center rounded-xs border p-8 sm:p-10 text-center transition-all cursor-pointer focus:outline-none focus-visible:ring-1 focus-visible:ring-cyan-400 group ${
        isDragging
          ? 'border-cyan-400 bg-cyan-950/[0.15] shadow-[0_0_25px_rgba(0,216,246,0.15)]'
          : 'border-white/[0.08] bg-[#0c0e14] hover:border-cyan-500/40 hover:bg-[#0e111a]'
      } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
    >
      <input
        ref={fileInputRef}
        type="file"
        accept=".jpg,.jpeg,.png,.pdf,image/jpeg,image/png,application/pdf"
        onChange={handleInputChange}
        disabled={disabled}
        className="sr-only"
        aria-hidden="true"
        tabIndex={-1}
      />

      {/* Simple technical document icon */}
      <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-sm border border-white/[0.08] bg-white/[0.02] text-neutral-400 transition-colors group-hover:border-cyan-500/30 group-hover:text-cyan-400">
        <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1.75">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>

      {/* Primary Headline */}
      <h2 className="font-mono text-base sm:text-lg font-bold tracking-wider text-white uppercase">
        DROP YOUR FILE
      </h2>

      {/* Subtext */}
      <p className="mt-1.5 text-xs text-neutral-400">
        Drag & drop or choose a file
      </p>

      {/* Choose File Button */}
      <div className="mt-5">
        <span className="inline-block rounded-sm border border-white/[0.12] bg-white/[0.04] px-5 py-2 font-mono text-xs font-semibold text-neutral-200 group-hover:border-cyan-500/50 group-hover:text-cyan-300 transition-colors">
          [ Choose File ]
        </span>
      </div>

      {/* Technical Specs & Constraints */}
      <div className="mt-6 flex items-center gap-3 font-mono text-[10px] tracking-widest text-neutral-400 uppercase">
        <span>JPEG</span>
        <span className="text-neutral-600">/</span>
        <span>PNG</span>
        <span className="text-neutral-600">/</span>
        <span>PDF</span>
      </div>

      <p className="mt-2 font-mono text-[10px] tracking-wider text-neutral-500 uppercase">
        MAXIMUM 25 MB
      </p>
    </div>
  );
};
