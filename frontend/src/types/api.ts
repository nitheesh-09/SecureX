/**
 * SecureX API TypeScript Definitions
 * Matching backend contracts for Review 1
 */

export type SeverityLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type PrivacyCategory =
  | 'LOCATION'
  | 'DEVICE_INFORMATION'
  | 'DATE_TIME'
  | 'AUTHOR_IDENTITY'
  | 'SOFTWARE'
  | 'COPYRIGHT'
  | 'DOCUMENT_INFORMATION'
  | 'ATTACHMENT'
  | 'OTHER';

export interface UploadResponse {
  file_id: string;
  filename: string;
  mime_type: string;
  size_bytes: number;
  status: string;
}

export interface PrivacyFinding {
  id: string;
  field: string;
  category: PrivacyCategory;
  value: string;
  severity: SeverityLevel;
  title: string;
  explanation: string;
  removable: boolean;
}

export interface AnalysisSummary {
  total_findings: number;
  high_risk_findings: number;
  removable_findings: number;
}

export interface AnalysisResult {
  file_id: string;
  filename: string;
  status: string;
  findings: PrivacyFinding[];
  summary: AnalysisSummary;
}

export interface SanitizationRequest {
  fields_to_remove: string[];
}

export interface SanitizationResult {
  file_id: string;
  sanitized_file_id: string;
  original_filename: string;
  sanitized_filename: string;
  removed_fields: string[];
  remaining_fields: string[];
  status: string;
}

export interface SecurityScore {
  score: number;
  risk_level: string;
  risk_points: number;
  total_remaining_findings: number;
  critical_findings: number;
  high_findings: number;
  medium_findings: number;
  low_findings: number;
  recommendation: string;
  is_sanitized?: boolean | null;
}

export interface ScoreComparison {
  before_score: number;
  after_score: number;
  improvement: number;
}

export interface FinalResult {
  file_id: string;
  sanitized_file_id: string;
  filename: string;
  status: string;
  score: ScoreComparison;
  security: SecurityScore;
  removed_fields: string[];
  remaining_fields: string[];
  download: {
    sanitized_file_id: string;
    [key: string]: string;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown> | null;
  timestamp: string;
}

export interface ErrorResponseEnvelope {
  success: false;
  error: ApiError;
}

