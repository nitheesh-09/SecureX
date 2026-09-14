'use client';

import React, { useState, useRef } from 'react';
import { ZipAttachment } from '@/types/chat';
import { createZipAttachment, inspectZipFile } from '@/lib/zipPrivacyScanner';

interface MessageComposerProps {
  onSendMessage: (text: string, attachment?: ZipAttachment) => void;
  onOpenInspector?: (attachment: ZipAttachment) => void;
  disabled?: boolean;
  stagedZip?: ZipAttachment | null;
  onStagedZipChange?: (attachment: ZipAttachment | null) => void;
}

export const MessageComposer: React.FC<MessageComposerProps> = ({
  onSendMessage,
  onOpenInspector,
  disabled = false,
  stagedZip,
  onStagedZipChange,
}) => {
  const [inputText, setInputText] = useState('');
  const [internalStagedZip, setInternalStagedZip] = useState<ZipAttachment | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const activeStagedZip = stagedZip !== undefined ? stagedZip : internalStagedZip;

  const updateStagedZip = (att: ZipAttachment | null) => {
    if (onStagedZipChange) {
      onStagedZipChange(att);
    }
    setInternalStagedZip(att);
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setErrorMessage(null);
    const file = e.target.files?.[0];
    if (!file) return;

    const isZip =
      file.name.toLowerCase().endsWith('.zip') ||
      file.type === 'application/zip' ||
      file.type === 'application/x-zip-compressed';

    if (!isZip) {
      setErrorMessage('Please select a valid ZIP archive (.zip) for SecureX file transfer.');
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    try {
      setIsScanning(true);
      const newAttachment = await inspectZipFile(file);
      updateStagedZip(newAttachment);
    } catch (err: unknown) {
      setErrorMessage(err instanceof Error ? err.message : 'Failed to inspect ZIP archive.');
    } finally {
      setIsScanning(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleAttachDemoZip = () => {
    setErrorMessage(null);
    const newAttachment = createZipAttachment('Confidential_Audit_Bundle.zip', 4210400);
    updateStagedZip(newAttachment);
  };

  const handleSend = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (disabled || isScanning) return;
    if (!inputText.trim() && !activeStagedZip) return;

    onSendMessage(inputText.trim(), activeStagedZip || undefined);
    setInputText('');
    updateStagedZip(null);
    setErrorMessage(null);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const isSanitized = Boolean(activeStagedZip?.isSanitized);

  return (
    <div className="bg-white border-t border-slate-200 p-3 sm:p-4 shadow-xs">
      {/* Error Banner if invalid file */}
      {errorMessage && (
        <div className="mb-3 px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-xs font-mono flex items-center justify-between">
          <span>{errorMessage}</span>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-red-500 hover:text-red-800 ml-2 cursor-pointer font-bold"
          >
            ✕
          </button>
        </div>
      )}

      {/* Staged ZIP file preview bar before sending */}
      {activeStagedZip && (
        <div
          className={`mb-3 p-3.5 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs transition-all ${
            isSanitized
              ? 'bg-emerald-50/80 border-emerald-300'
              : 'bg-red-50/70 border-red-200'
          }`}
        >
          <div className="flex items-center gap-3 min-w-0">
            <div
              className={`w-10 h-10 rounded-lg border flex items-center justify-center flex-shrink-0 shadow-2xs ${
                isSanitized
                  ? 'bg-emerald-100 border-emerald-300 text-emerald-700'
                  : 'bg-red-100 border-red-200 text-red-600'
              }`}
            >
              {isSanitized ? (
                <svg className="w-5 h-5 text-emerald-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M4 4v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6a2 2 0 0 0-2 2z" />
                  <polyline points="14 2 14 8 20 8" />
                </svg>
              )}
            </div>
            <div className="min-w-0">
              <div className="font-mono text-sm font-semibold text-slate-900 truncate max-w-[220px] sm:max-w-xs">
                {activeStagedZip.name}
              </div>
              <div className="flex items-center gap-2 mt-0.5 text-xs font-mono">
                <span className="text-slate-500">{activeStagedZip.formattedSize}</span>
                <span>•</span>
                {isSanitized ? (
                  <span className="text-emerald-700 font-bold">
                    Score: 100 / 100 (SAFE)
                  </span>
                ) : (
                  <span className="text-red-600 font-bold">
                    Score: {activeStagedZip.privacyScanScore} / 100 ({activeStagedZip.score.risk_level})
                  </span>
                )}
                <span>•</span>
                {isSanitized ? (
                  <span className="text-emerald-700 font-semibold">Zero-Leak Verified (Clean)</span>
                ) : (
                  <span className="text-slate-500">{activeStagedZip.flaggedMetadataCount} Exposures</span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 self-end sm:self-center">
            {/* Direct Inspector / Certificate Button before sending */}
            {onOpenInspector && (
              <button
                type="button"
                onClick={() => onOpenInspector(activeStagedZip)}
                className={`px-2.5 py-1.5 rounded-lg border font-mono text-xs font-semibold transition-all cursor-pointer ${
                  isSanitized
                    ? 'bg-emerald-100 hover:bg-emerald-200 border-emerald-300 text-emerald-800'
                    : 'bg-red-100 hover:bg-red-200 border-red-300 text-red-800'
                }`}
              >
                {isSanitized ? 'View Certificate' : 'Inspect / Sanitize'}
              </button>
            )}

            <button
              type="button"
              onClick={() => updateStagedZip(null)}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
              title="Remove attachment"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" />
                <line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
            <button
              type="button"
              onClick={() => handleSend()}
              className={`px-3 py-1.5 rounded-lg text-white font-mono text-xs font-bold transition-all flex items-center gap-1.5 shadow-sm cursor-pointer ${
                isSanitized
                  ? 'bg-emerald-600 hover:bg-emerald-700 shadow-emerald-600/25'
                  : 'bg-red-600 hover:bg-red-700 shadow-red-600/25'
              }`}
            >
              <span>{isSanitized ? 'Transmit Clean ZIP' : 'Transmit Securely'}</span>
              <svg className="w-3.5 h-3.5 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Input row */}
      <form onSubmit={handleSend} className="flex items-center gap-2 sm:gap-3">
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip,application/zip,application/x-zip-compressed"
          onChange={handleFileChange}
          className="hidden"
          id="securex-zip-input"
        />

        {/* Attachment Button */}
        <button
          type="button"
          disabled={isScanning}
          onClick={() => fileInputRef.current?.click()}
          className={`p-2.5 rounded-full text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer focus:outline-none focus:ring-2 focus:ring-red-500 relative ${
            isScanning ? 'opacity-50 cursor-wait' : ''
          }`}
          title="Select a ZIP file to share securely"
          aria-label="Attach ZIP file"
        >
          {isScanning ? (
            <svg className="w-5 h-5 sm:w-6 sm:h-6 animate-spin text-red-600" viewBox="0 0 24 24" fill="none" stroke="currentColor">
              <circle cx="12" cy="12" r="10" strokeWidth="4" className="opacity-25" />
              <path d="M4 12a8 8 0 018-8v8H4z" fill="currentColor" className="opacity-75" />
            </svg>
          ) : (
            <svg className="w-5 h-5 sm:w-6 sm:h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
            </svg>
          )}
        </button>

        {/* Quick Demo ZIP Button */}
        <button
          type="button"
          onClick={handleAttachDemoZip}
          className="hidden md:inline-flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-red-50 border border-slate-200 hover:border-red-200 text-[10px] font-mono text-slate-700 hover:text-red-700 transition-all cursor-pointer font-medium"
          title="Quickly test with a mock ZIP attachment"
        >
          <span>+ Demo ZIP (Risks)</span>
        </button>

        {/* Text Input */}
        <div className="flex-1 relative">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isScanning
                ? 'Inspecting ZIP archive...'
                : activeStagedZip
                ? 'Add an optional message...'
                : 'Type a message or attach a secure ZIP...'
            }
            className="w-full py-2.5 px-4 bg-slate-50 text-slate-900 placeholder-slate-400 rounded-xl border border-slate-300 focus:border-red-600 focus:outline-none focus:ring-1 focus:ring-red-600/20 text-sm font-sans transition-all"
          />
        </div>

        {/* Send Button */}
        <button
          type="submit"
          disabled={disabled || isScanning || (!inputText.trim() && !activeStagedZip)}
          className={`p-2.5 rounded-full transition-all flex items-center justify-center ${
            inputText.trim() || activeStagedZip
              ? 'bg-red-600 text-white hover:bg-red-700 shadow-md shadow-red-600/25 cursor-pointer active:scale-95'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
          aria-label="Send message"
        >
          <svg className="w-5 h-5 transform rotate-45 -translate-y-0.5 translate-x-[-1px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </form>
    </div>
  );
};

