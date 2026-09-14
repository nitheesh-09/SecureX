/**
 * TypeScript types for SecureX Secure ZIP Sharing Prototype
 */

import { PrivacyFinding, SecurityScore, ScoreComparison } from '@/types/api';

export type AuthMode = 'login' | 'register';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  avatarUrl?: string;
  token?: string;
  keyFingerprint?: string;
  authenticatedAt?: string;
}

export type AttachmentSecurityStatus =
  | 'Ready for privacy scan'
  | 'Sanitization required'
  | 'Ready to encrypt'
  | 'Securely shared';

export interface ContainedArchiveFile {
  name: string;
  sizeBytes: number;
  formattedSize: string;
  mimeType: string;
  findingsCount: number;
  criticalCount: number;
}

export interface ZipAttachment {
  id: string;
  name: string;
  sizeBytes: number;
  formattedSize: string;
  status: AttachmentSecurityStatus;
  privacyScanScore: number; // 0 - 100
  flaggedMetadataCount: number;
  encryptionHash?: string;
  isProcessing?: boolean;
  isSanitized: boolean;
  score: SecurityScore;
  scoreComparison?: ScoreComparison;
  findings: PrivacyFinding[];
  removedFindings: PrivacyFinding[];
  containedFiles: ContainedArchiveFile[];
  downloadBlobUrl?: string;
}

export interface ChatMessage {
  id: string;
  conversationId?: string;
  senderId: string; // real user ID or 'me'
  recipientId: string;
  text?: string;
  attachment?: ZipAttachment;
  timestamp: string;
  status: 'sent' | 'delivered' | 'read';
}

export interface Contact {
  id: string;
  name: string;
  role?: string;
  avatarColor: string;
  initials: string;
  online: boolean;
  lastSeen?: string;
  email: string;
  phone?: string;
  about: string;
  encryptionVerified: boolean;
  keyFingerprint: string;
  unreadCount: number;
  conversationId?: string;
}

export interface RegisteredUser {
  id: string;
  name: string;
  email: string;
  key_fingerprint: string;
  created_at: string;
}

export interface ConversationParticipant {
  id: string;
  name: string;
  email: string;
  key_fingerprint: string;
}

export interface ConversationLastMessage {
  id: string;
  sender_id: string;
  receiver_id: string;
  text?: string;
  attachment_json?: string;
  created_at: string;
}

export interface ConversationItem {
  id: string;
  created_at: string;
  updated_at: string;
  peer?: ConversationParticipant;
  last_message?: ConversationLastMessage;
}
