'use client';

import React, { useState } from 'react';
import { Header } from '@/components/Header';
import { FileUploader } from '@/components/FileUploader';
import { FileInfo } from '@/components/FileInfo';
import { AnalysisProgress } from '@/components/AnalysisProgress';
import { ProtectionProgress } from '@/components/ProtectionProgress';
import { FindingsList } from '@/components/FindingsList';
import { SanitizationPanel } from '@/components/SanitizationPanel';
import { FinalResult } from '@/components/FinalResult';
import { ErrorMessage } from '@/components/ErrorMessage';
import {
  analyzeFile,
  downloadFile,
  getFinalResult,
  sanitizeFile,
  uploadFile,
} from '@/lib/api';
import {
  AnalysisResult,
  FinalResult as FinalResultType,
  UploadResponse,
} from '@/types/api';

type AppState =
  | 'IDLE'
  | 'UPLOADING'
  | 'UPLOADED'
  | 'ANALYZING'
  | 'ANALYZED'
  | 'SANITIZING'
  | 'COMPLETE'
  | 'ERROR';

interface MetadataScannerViewProps {
  onSwitchToChat?: () => void;
}

export const MetadataScannerView: React.FC<MetadataScannerViewProps> = ({ onSwitchToChat }) => {
  const [appState, setAppState] = useState<AppState>('IDLE');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadData, setUploadData] = useState<UploadResponse | null>(null);
  const [analysisData, setAnalysisData] = useState<AnalysisResult | null>(null);
  const [selectedFindingIds, setSelectedFindingIds] = useState<Set<string>>(new Set());
  const [finalResult, setFinalResult] = useState<FinalResultType | null>(null);
  const [errorInfo, setErrorInfo] = useState<{ message: string; code?: string } | null>(null);

  // Full clean reset - Scan Another File
  const handleReset = () => {
    setAppState('IDLE');
    setSelectedFile(null);
    setUploadData(null);
    setAnalysisData(null);
    setSelectedFindingIds(new Set());
    setFinalResult(null);
    setErrorInfo(null);
  };

  // Handle client-side error
  const handleClientError = (msg: string) => {
    setErrorInfo({ message: msg, code: 'VALIDATION_ERROR' });
  };

  // 1. File Selected -> Trigger Upload
  const handleFileSelected = async (file: File) => {
    setErrorInfo(null);
    setSelectedFile(file);
    setAppState('UPLOADING');

    try {
      const uploadRes = await uploadFile(file);
      setUploadData(uploadRes);
      setAppState('UPLOADED');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Upload failed. Please try again.';
      const code = (err as { code?: string })?.code || 'UPLOAD_FAILED';
      setErrorInfo({ message: msg, code });
      setAppState('ERROR');
    }
  };

  // 2. Trigger Analysis
  const handleAnalyze = async () => {
    if (!uploadData?.file_id) return;
    setErrorInfo(null);
    setAppState('ANALYZING');

    try {
      const res = await analyzeFile(uploadData.file_id);
      setAnalysisData(res);

      // Default: ALL removable findings are selected by default
      const defaultSelected = new Set(
        res.findings.filter((f) => f.removable).map((f) => f.id)
      );
      setSelectedFindingIds(defaultSelected);

      setAppState('ANALYZED');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "We couldn't analyze this file. Please try again.";
      const code = (err as { code?: string })?.code || 'ANALYSIS_FAILED';
      setErrorInfo({ message: msg, code });
      setAppState('ERROR');
    }
  };

  // Toggle individual finding checkbox
  const handleToggleFinding = (id: string) => {
    setSelectedFindingIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  // Select all removable findings
  const handleSelectAll = () => {
    if (!analysisData) return;
    const all = new Set(analysisData.findings.filter((f) => f.removable).map((f) => f.id));
    setSelectedFindingIds(all);
  };

  // Deselect all findings
  const handleDeselectAll = () => {
    setSelectedFindingIds(new Set());
  };

  // 3. Trigger Sanitization
  const handleSanitize = async () => {
    if (!uploadData?.file_id || !analysisData) return;
    if (selectedFindingIds.size === 0) {
      setErrorInfo({ message: 'Select at least one metadata item to remove.', code: 'NO_SELECTION' });
      return;
    }

    setErrorInfo(null);
    setAppState('SANITIZING');

    try {
      const selectedFindings = analysisData.findings.filter((f) => selectedFindingIds.has(f.id));
      const fieldsToRemove = selectedFindings.map((f) => f.field);

      const sanRes = await sanitizeFile(uploadData.file_id, fieldsToRemove);

      // Fetch the verified complete final result
      const finalRes = await getFinalResult(sanRes.sanitized_file_id);
      setFinalResult(finalRes);
      setAppState('COMPLETE');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "We couldn't safely remove the selected metadata.";
      const code = (err as { code?: string })?.code || 'SANITIZATION_FAILED';
      setErrorInfo({ message: msg, code });
      setAppState('ERROR');
    }
  };

  // 4. Trigger Binary Download
  const handleDownload = async () => {
    if (!finalResult?.sanitized_file_id) return;
    try {
      const originalName = selectedFile?.name || 'secure_file';
      const parts = originalName.split('.');
      const ext = parts.pop();
      const baseName = parts.join('.');
      const suggestedName = `${baseName}_secure.${ext}`;

      await downloadFile(finalResult.sanitized_file_id, suggestedName);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Download failed. Please try again.';
      setErrorInfo({ message: msg, code: 'DOWNLOAD_FAILED' });
    }
  };

  return (
    <div className="flex flex-col flex-1 w-full">
      {/* Header with quick switch if available */}
      <Header onReset={handleReset} canReset={appState !== 'IDLE'} onSwitchToChat={onSwitchToChat} />

      {/* Main Single-Screen Workspace */}
      <main className="flex-1 flex flex-col justify-center py-10 sm:py-14 px-4 sm:px-6">
        <div className="mx-auto w-full max-w-xl">
          {/* Global Alert / Error Notification */}
          {errorInfo && (
            <div className="mb-6">
              <ErrorMessage
                message={errorInfo.message}
                code={errorInfo.code}
                onDismiss={() => setErrorInfo(null)}
                onRetry={
                  appState === 'ERROR'
                    ? uploadData
                      ? handleAnalyze
                      : handleReset
                    : undefined
                }
              />
            </div>
          )}

          {/* Workflow View Switcher */}
          <div className="space-y-6">
            {/* STATE 1: IDLE or UPLOADING -> Upload Screen */}
            {(appState === 'IDLE' || appState === 'UPLOADING') && (
              <div>
                <div className="text-center mb-6">
                  <h1 className="font-mono text-lg sm:text-xl font-bold tracking-wider text-slate-900 uppercase">
                    SCAN YOUR FILE
                  </h1>
                  <p className="mt-1 text-xs text-slate-500">
                    Discover hidden metadata before you share it.
                  </p>
                </div>

                <FileUploader
                  onFileSelected={handleFileSelected}
                  onError={handleClientError}
                  disabled={appState === 'UPLOADING'}
                />
              </div>
            )}

            {/* STATE 2: UPLOADED -> File Overview Card with Analyze CTA */}
            {appState === 'UPLOADED' && selectedFile && (
              <FileInfo
                filename={selectedFile.name}
                sizeBytes={selectedFile.size}
                mimeType={selectedFile.type || 'application/octet-stream'}
                onAnalyze={handleAnalyze}
                onChangeFile={handleReset}
              />
            )}

            {/* STATE 3: ANALYZING -> Scan Animation */}
            {appState === 'ANALYZING' && <AnalysisProgress />}

            {/* STATE 4: ANALYZED -> Findings & Selection Controls */}
            {appState === 'ANALYZED' && analysisData && (
              <div className="space-y-4">
                <FindingsList
                  findings={analysisData.findings}
                  selectedIds={selectedFindingIds}
                  onToggleFinding={handleToggleFinding}
                  onSelectAll={handleSelectAll}
                  onDeselectAll={handleDeselectAll}
                  onReset={handleReset}
                />

                {analysisData.findings.length > 0 && (
                  <SanitizationPanel
                    selectedCount={selectedFindingIds.size}
                    totalCount={analysisData.findings.filter((f) => f.removable).length}
                    onSanitize={handleSanitize}
                    isSanitizing={false}
                  />
                )}
              </div>
            )}

            {/* STATE 5: SANITIZING -> Protection Progress */}
            {appState === 'SANITIZING' && <ProtectionProgress />}

            {/* STATE 6: COMPLETE -> Final Results & Download */}
            {appState === 'COMPLETE' && finalResult && (
              <FinalResult
                result={finalResult}
                onDownload={handleDownload}
                onReset={handleReset}
              />
            )}

            {/* STATE 7: ERROR fallback state */}
            {appState === 'ERROR' && (
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={handleReset}
                  className="rounded-lg border border-slate-300 bg-white px-4 py-2 font-mono text-xs text-slate-700 hover:text-slate-900 hover:border-slate-400 transition-colors cursor-pointer"
                >
                  [ Start Over ]
                </button>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Minimal Footer */}
      <footer className="border-t border-slate-200 bg-white py-4 text-center">
        <p className="font-mono text-[10px] sm:text-[11px] text-slate-400 uppercase tracking-widest">
          SECUREX • SINGLE-FILE METADATA SCANNER
        </p>
      </footer>
    </div>
  );
};
