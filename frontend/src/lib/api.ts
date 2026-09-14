/**
 * SecureX Centralized API Client
 * Interfaces directly with FastAPI backend on /api/v1 routes
 */

import {
  AnalysisResult,
  FinalResult,
  SanitizationResult,
  SecurityScore,
  UploadResponse,
} from '@/types/api';

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000'
).replace(/\/+$/, '');

export class ApiError extends Error {
  code: string;
  details?: Record<string, unknown> | null;
  status: number;

  constructor(message: string, code: string = 'UNKNOWN_ERROR', status: number = 500, details?: Record<string, unknown> | null) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

async function handleResponse<T>(res: Response): Promise<T> {
  if (!res.ok) {
    let errorData: { error?: { code?: string; message?: string; details?: Record<string, unknown> | null }; detail?: string } | null = null;
    try {
      errorData = await res.json();
    } catch {
      // Non-JSON response
    }

    const code = errorData?.error?.code || `HTTP_${res.status}`;
    const message =
      errorData?.error?.message ||
      (typeof errorData?.detail === 'string' ? errorData.detail : null) ||
      res.statusText ||
      `Server returned status ${res.status}`;
    const details = errorData?.error?.details || null;

    throw new ApiError(message, code, res.status, details);
  }

  return res.json() as Promise<T>;
}

/**
 * Upload a JPEG, PNG, or PDF file to the backend temporary storage
 */
export async function uploadFile(file: File): Promise<UploadResponse> {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/upload`, {
      method: 'POST',
      body: formData,
    });
    return await handleResponse<UploadResponse>(res);
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    throw new ApiError(
      'SecureX could not reach the backend server. Please make sure the FastAPI server is running on ' + API_BASE_URL,
      'NETWORK_ERROR',
      0
    );
  }
}

/**
 * Trigger verified metadata extraction and privacy risk analysis
 */
export async function analyzeFile(fileId: string): Promise<AnalysisResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/analyze/${encodeURIComponent(fileId)}`, {
      method: 'POST',
    });
    return await handleResponse<AnalysisResult>(res);
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('Failed to complete file privacy analysis.', 'ANALYSIS_ERROR', 0);
  }
}

/**
 * Calculate or retrieve the deterministic security score for an analyzed file
 */
export async function scoreFile(fileId: string): Promise<SecurityScore> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/score/${encodeURIComponent(fileId)}`, {
      method: 'POST',
    });
    return await handleResponse<SecurityScore>(res);
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('Failed to calculate privacy score.', 'SCORING_ERROR', 0);
  }
}

/**
 * Sanitize an uploaded file by selectively scrubbing chosen metadata fields
 */
export async function sanitizeFile(
  fileId: string,
  fieldsToRemove: string[]
): Promise<SanitizationResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/sanitize/${encodeURIComponent(fileId)}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ fields_to_remove: fieldsToRemove }),
    });
    return await handleResponse<SanitizationResult>(res);
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('Failed to sanitize file metadata.', 'SANITIZATION_ERROR', 0);
  }
}

/**
 * Retrieve the verified final privacy result including score comparison
 */
export async function getFinalResult(sanitizedFileId: string): Promise<FinalResult> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/result/${encodeURIComponent(sanitizedFileId)}`, {
      method: 'GET',
    });
    return await handleResponse<FinalResult>(res);
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('Failed to retrieve final privacy result.', 'RESULT_ERROR', 0);
  }
}

/**
 * Download the sanitized binary file and trigger automatic client browser download
 */
export async function downloadFile(
  sanitizedFileId: string,
  fallbackFilename: string = 'secure_file'
): Promise<void> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/download/${encodeURIComponent(sanitizedFileId)}`, {
      method: 'GET',
    });

    if (!res.ok) {
      await handleResponse(res);
      return;
    }

    // Parse Content-Disposition filename if available
    let filename = fallbackFilename;
    const disposition = res.headers.get('Content-Disposition');
    if (disposition && disposition.includes('filename=')) {
      const match = disposition.match(/filename=["']?([^"';]+)["']?/i);
      if (match && match[1]) {
        filename = match[1];
      }
    }

    const blob = await res.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  } catch (err: unknown) {
    if (err instanceof ApiError) throw err;
    throw new ApiError('Failed to download sanitized secure file.', 'DOWNLOAD_ERROR', 0);
  }
}
