'use client';

import React, { useState } from 'react';
import { ZipAttachment } from '@/types/chat';
import { triggerZipDownload } from '@/lib/zipPrivacyScanner';

interface ZipPrivacyModalProps {
  attachment: ZipAttachment;
  isOutgoing: boolean; // true = Sender perspective, false = Receiver perspective
  onClose: () => void;
  onSanitize?: (findingIdsToRemove: Set<string>) => void;
}

export const ZipPrivacyModal: React.FC<ZipPrivacyModalProps> = ({
  attachment,
  isOutgoing,
  onClose,
  onSanitize,
}) => {
  const [activeTab, setActiveTab] = useState<'exposures' | 'files' | 'audit'>('exposures');
  const [selectedFindingIds, setSelectedFindingIds] = useState<Set<string>>(
    new Set(attachment.findings.filter((f) => f.removable).map((f) => f.id))
  );
  const [isSanitizingAction, setIsSanitizingAction] = useState(false);

  const getRiskBadge = (level: string) => {
    const norm = level.toUpperCase();
    if (norm === 'SAFE') {
      return {
        label: 'SAFE',
        badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        barColor: 'bg-emerald-500',
        dotColor: 'bg-emerald-500',
      };
    }
    if (norm === 'LOW RISK') {
      return {
        label: 'LOW RISK',
        badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
        barColor: 'bg-blue-500',
        dotColor: 'bg-blue-500',
      };
    }
    if (norm === 'MEDIUM RISK') {
      return {
        label: 'MEDIUM RISK',
        badgeColor: 'bg-amber-50 text-amber-800 border-amber-200',
        barColor: 'bg-amber-500',
        dotColor: 'bg-amber-500',
      };
    }
    return {
      label: 'HIGH RISK',
      badgeColor: 'bg-red-50 text-red-700 border-red-200',
      barColor: 'bg-red-600',
      dotColor: 'bg-red-600',
    };
  };

  const getSeverityBadge = (sev: string) => {
    switch (sev.toUpperCase()) {
      case 'CRITICAL':
        return 'bg-red-100 text-red-800 border-red-300';
      case 'HIGH':
        return 'bg-orange-50 text-orange-800 border-orange-200';
      case 'MEDIUM':
        return 'bg-amber-50 text-amber-800 border-amber-200';
      default:
        return 'bg-blue-50 text-blue-800 border-blue-200';
    }
  };

  const currentConfig = getRiskBadge(attachment.score.risk_level);
  const beforeScore = attachment.scoreComparison
    ? attachment.scoreComparison.before_score
    : attachment.score.score;
  const currentScore = attachment.score.score;
  const improvement = attachment.scoreComparison?.improvement || 0;

  const handleToggleFinding = (id: string) => {
    setSelectedFindingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleSelectAll = () => {
    setSelectedFindingIds(new Set(attachment.findings.map((f) => f.id)));
  };

  const handleDeselectAll = () => {
    setSelectedFindingIds(new Set());
  };

  const handleExecuteSanitize = () => {
    if (!onSanitize) return;
    setIsSanitizingAction(true);
    setTimeout(() => {
      onSanitize(selectedFindingIds);
      setIsSanitizingAction(false);
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="relative w-full max-w-3xl my-auto rounded-2xl bg-white border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Top Header */}
        <div className="p-4 sm:px-6 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-red-100 border border-red-200 flex items-center justify-center text-red-600 flex-shrink-0 shadow-xs">
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8l-6-6H6a2 2 0 0 0-2 2z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="font-mono text-sm sm:text-base font-bold text-slate-900 truncate max-w-[280px] sm:max-w-md" title={attachment.name}>
                  {attachment.name}
                </h2>
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase border ${
                    isOutgoing
                      ? 'bg-red-600 text-white border-red-600 shadow-2xs'
                      : 'bg-slate-800 text-white border-slate-800'
                  }`}
                >
                  {isOutgoing ? 'Sender Inspection' : 'Receiver Audit'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">
                {attachment.formattedSize} • {attachment.containedFiles.length} Packaged Files • {attachment.encryptionHash}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-800 hover:bg-slate-200/60 transition-colors cursor-pointer text-base"
            aria-label="Close modal"
          >
            ✕
          </button>
        </div>

        {/* Modal Scrollable Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-6">
          {/* Security Score Card */}
          <div className="p-5 sm:p-6 rounded-xl bg-slate-50 border border-slate-200 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-200 pb-4">
              <div>
                <span className="text-[10px] font-mono font-bold uppercase tracking-widest text-red-600 block">
                  Deterministic Privacy Assessment
                </span>
                <h3 className="text-base sm:text-lg font-mono font-bold text-slate-900 mt-0.5">
                  Security Score Comparison
                </h3>
              </div>

              {improvement > 0 && (
                <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 font-mono text-xs font-bold text-emerald-700 shadow-2xs self-start sm:self-auto">
                  <svg className="w-3.5 h-3.5 text-emerald-600" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 17a.75.75 0 01-.75-.75V5.612L5.29 9.77a.75.75 0 01-1.08-1.04l5.25-5.5a.75.75 0 011.08 0l5.25 5.5a.75.75 0 11-1.08 1.04l-3.96-4.158V16.25A.75.75 0 0110 17z" clipRule="evenodd" />
                  </svg>
                  +{improvement} POINTS IMPROVED
                </span>
              )}
            </div>

            {/* Side-by-side Score Gauges */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 items-center">
              {/* Box 1: Pre-Sanitization */}
              <div className="p-4 rounded-xl bg-white border border-slate-200 text-center space-y-1.5 shadow-2xs">
                <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block font-medium">
                  Before Sanitization
                </span>
                <div className="font-mono text-3xl sm:text-4xl font-extrabold text-slate-900">
                  {beforeScore}
                  <span className="text-sm font-normal text-slate-400"> / 100</span>
                </div>
                <div className="pt-1">
                  <span className="inline-block px-2.5 py-0.5 rounded-md font-mono text-[11px] font-bold uppercase bg-red-50 text-red-700 border border-red-200">
                    {beforeScore < 40 ? 'HIGH RISK' : beforeScore < 70 ? 'MEDIUM RISK' : 'LOW RISK'}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden mt-3">
                  <div className="h-full bg-red-600" style={{ width: `${Math.max(5, beforeScore)}%` }} />
                </div>
              </div>

              {/* Middle Arrow */}
              <div className="hidden md:flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 rounded-full bg-red-50 border border-red-200 flex items-center justify-center text-red-600 shadow-2xs">
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                  </svg>
                </div>
                <span className="text-[10px] font-mono text-slate-500 font-medium mt-1.5">Zero-Leak Scrub</span>
              </div>

              {/* Box 2: Verified State */}
              <div
                className={`p-4 rounded-xl border text-center space-y-1.5 shadow-2xs ${
                  attachment.isSanitized
                    ? 'bg-emerald-50/60 border-emerald-200'
                    : 'bg-white border-slate-200'
                }`}
              >
                <span className="text-[11px] font-mono text-slate-500 uppercase tracking-wider block font-medium">
                  {attachment.isSanitized ? 'Verified Sanitized' : 'Current Status'}
                </span>
                <div className="font-mono text-3xl sm:text-4xl font-extrabold text-slate-900">
                  {currentScore}
                  <span className="text-sm font-normal text-slate-400"> / 100</span>
                </div>
                <div className="pt-1">
                  <span className={`inline-block px-2.5 py-0.5 rounded-md font-mono text-[11px] font-bold uppercase border ${currentConfig.badgeColor}`}>
                    {currentConfig.label}
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-slate-100 overflow-hidden mt-3">
                  <div className={`h-full ${currentConfig.barColor}`} style={{ width: `${Math.max(5, currentScore)}%` }} />
                </div>
              </div>
            </div>

            {/* Threshold Reference */}
            <div className="pt-3 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 text-[10px] font-mono text-slate-500">
              <span className="font-semibold">Risk Scale:</span>
              <div className="flex flex-wrap items-center gap-3 font-medium">
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                  90–100 Safe
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                  70–89 Low Risk
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
                  40–69 Medium Risk
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-600" />
                  0–39 High Risk
                </span>
              </div>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex border-b border-slate-200 gap-2 font-mono text-xs">
            <button
              type="button"
              onClick={() => setActiveTab('exposures')}
              className={`pb-2.5 px-3 border-b-2 font-semibold transition-all cursor-pointer ${
                activeTab === 'exposures'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Privacy Exposures ({attachment.findings.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('files')}
              className={`pb-2.5 px-3 border-b-2 font-semibold transition-all cursor-pointer ${
                activeTab === 'files'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Contained Files ({attachment.containedFiles.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('audit')}
              className={`pb-2.5 px-3 border-b-2 font-semibold transition-all cursor-pointer ${
                activeTab === 'audit'
                  ? 'border-red-600 text-red-600'
                  : 'border-transparent text-slate-500 hover:text-slate-900'
              }`}
            >
              Sanitization Audit ({attachment.removedFindings.length})
            </button>
          </div>

          {/* TAB 1: PRIVACY EXPOSURES / FINDINGS */}
          {activeTab === 'exposures' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-800 font-bold uppercase tracking-wider">
                  {attachment.findings.length === 0
                    ? 'Zero Exposures Detected'
                    : 'Detected Metadata Fields'}
                </span>

                {isOutgoing && !attachment.isSanitized && attachment.findings.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={handleSelectAll}
                      className="text-red-600 hover:text-red-700 cursor-pointer text-[11px] font-semibold"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">/</span>
                    <button
                      type="button"
                      onClick={handleDeselectAll}
                      className="text-slate-500 hover:text-slate-800 cursor-pointer text-[11px]"
                    >
                      Deselect All
                    </button>
                  </div>
                )}
              </div>

              {attachment.findings.length === 0 ? (
                <div className="p-8 rounded-xl bg-slate-50 border border-slate-200 text-center space-y-2">
                  <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-600">
                    <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  </div>
                  <h4 className="font-mono text-sm font-bold text-slate-900">All Metadata Stripped</h4>
                  <p className="text-xs text-slate-600 max-w-sm mx-auto font-sans">
                    This archive contains zero remaining privacy risks. GPS coordinates, author emails, and device IDs have been completely purged.
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {attachment.findings.map((f) => (
                    <div
                      key={f.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        selectedFindingIds.has(f.id) && isOutgoing && !attachment.isSanitized
                          ? 'bg-red-50/40 border-red-300 shadow-2xs'
                          : 'bg-white border-slate-200'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 min-w-0">
                          {isOutgoing && !attachment.isSanitized && (
                            <input
                              type="checkbox"
                              checked={selectedFindingIds.has(f.id)}
                              onChange={() => handleToggleFinding(f.id)}
                              className="mt-1 h-4 w-4 rounded-xs border-slate-300 text-red-600 focus:ring-red-500 cursor-pointer"
                            />
                          )}

                          <div className="min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-md text-[10px] font-mono font-bold uppercase border ${getSeverityBadge(f.severity)}`}>
                                {f.severity}
                              </span>
                              <span className="text-xs font-mono font-bold text-slate-900">{f.title}</span>
                              <span className="text-[10px] font-mono text-slate-400">[{f.category}]</span>
                            </div>

                            <div className="mt-1.5 p-2 rounded-lg bg-slate-50 border border-slate-200 font-mono text-xs text-red-700 font-medium break-all leading-relaxed">
                              {f.value}
                            </div>

                            <p className="mt-1 text-[11px] text-slate-600 font-sans leading-snug">
                              {f.explanation}
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: CONTAINED FILES */}
          {activeTab === 'files' && (
            <div className="space-y-2.5">
              <span className="text-xs font-mono text-slate-800 font-bold uppercase tracking-wider block">
                Files Packaged in this ZIP Archive
              </span>
              <div className="divide-y divide-slate-100 rounded-xl bg-white border border-slate-200 overflow-hidden shadow-2xs">
                {attachment.containedFiles.map((file, idx) => (
                  <div key={idx} className="p-3.5 flex items-center justify-between gap-3 hover:bg-slate-50 transition-colors">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-8 h-8 rounded-lg bg-red-50 border border-red-200 flex items-center justify-center text-red-600 flex-shrink-0">
                        📄
                      </div>
                      <div className="min-w-0">
                        <div className="font-mono text-xs font-semibold text-slate-900 truncate">{file.name}</div>
                        <div className="text-[10px] font-mono text-slate-400">{file.formattedSize} • {file.mimeType}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {attachment.isSanitized ? (
                        <span className="px-2 py-0.5 rounded-full font-mono text-[10px] bg-emerald-50 border border-emerald-200 text-emerald-700 font-semibold">
                          Scrubbed & Verified
                        </span>
                      ) : file.criticalCount > 0 ? (
                        <span className="px-2 py-0.5 rounded-full font-mono text-[10px] bg-red-50 border border-red-200 text-red-700 font-semibold">
                          Exposures Detected
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full font-mono text-[10px] bg-slate-100 border border-slate-200 text-slate-600">
                          Low Risk
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: SANITIZATION AUDIT & CERTIFICATE */}
          {activeTab === 'audit' && (
            <div className="space-y-3">
              <span className="text-xs font-mono text-slate-800 font-bold uppercase tracking-wider block">
                Cryptographic Sanitization Audit
              </span>

              {attachment.removedFindings.length === 0 ? (
                <div className="p-6 rounded-xl bg-slate-50 border border-slate-200 text-center text-xs text-slate-400 font-mono">
                  No metadata fields have been purged yet. Sanitize the archive to generate the audit certificate.
                </div>
              ) : (
                <div className="space-y-2">
                  <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs font-mono text-emerald-800 flex items-center gap-2 font-medium">
                    <svg className="w-4 h-4 text-emerald-600 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span>SecureX Zero-Leak Protocol verified. {attachment.removedFindings.length} exposures purged.</span>
                  </div>

                  {attachment.removedFindings.map((rf, idx) => (
                    <div key={idx} className="p-3 rounded-xl bg-white border border-slate-200 flex items-center justify-between text-xs font-mono shadow-2xs">
                      <div>
                        <span className="text-slate-900 font-semibold">{rf.title}</span>
                        <div className="text-[11px] text-slate-400 mt-0.5">Field: {rf.field} [{rf.category}]</div>
                      </div>
                      <span className="px-2 py-0.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-700 text-[10px] font-bold">
                        PURGED
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Action Bar */}
        <div className="p-4 sm:px-6 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-[11px] font-mono text-slate-500 flex items-center gap-2 font-medium">
            <span>Tunnel: E2EE AES-GCM-256</span>
            <span>•</span>
            <span className="text-red-700 font-semibold">{attachment.isSanitized ? 'Clean & Sealed' : 'Pre-Sanitization'}</span>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {/* Sender Sanitize Action */}
            {isOutgoing && !attachment.isSanitized && onSanitize && (
              <button
                type="button"
                onClick={handleExecuteSanitize}
                disabled={isSanitizingAction || selectedFindingIds.size === 0}
                className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-mono text-xs font-bold transition-all shadow-sm shadow-red-600/25 cursor-pointer flex items-center justify-center gap-2"
              >
                {isSanitizingAction ? (
                  <>
                    <svg className="w-3.5 h-3.5 animate-spin text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                      <circle cx="12" cy="12" r="10" strokeWidth="4" className="opacity-25" />
                      <path d="M4 12a8 8 0 018-8v8H4z" fill="currentColor" className="opacity-75" />
                    </svg>
                    <span>Scrubbing Metadata...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 text-white" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
                    </svg>
                    <span>Sanitize Selected ({selectedFindingIds.size})</span>
                  </>
                )}
              </button>
            )}

            {/* Direct Download Button */}
            <button
              type="button"
              onClick={() => triggerZipDownload(attachment)}
              className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-900 hover:bg-black text-white font-mono text-xs font-bold transition-all shadow-sm cursor-pointer flex items-center justify-center gap-2"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              <span>Download Clean ZIP</span>
            </button>

            <button
              type="button"
              onClick={onClose}
              className="px-3 py-2 rounded-xl border border-slate-300 bg-white text-slate-700 hover:bg-slate-100 text-xs font-mono cursor-pointer font-medium"
            >
              Close
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
