import { Contact, ChatMessage, AuthUser } from '@/types/chat';

export const CURRENT_USER: AuthUser = {
  id: 'me',
  name: 'Dev Sender',
  email: 'sender@securex.local',
};

// Start empty - no false/dummy chats
export const MOCK_CONTACTS: Contact[] = [];

// Empty initial message history
export const INITIAL_MESSAGES: Record<string, ChatMessage[]> = {};

export function createNewContact(nameOrEmail: string): Contact {
  const clean = nameOrEmail.trim();
  const isEmail = clean.includes('@');
  const name = isEmail ? clean.split('@')[0] : clean;
  const initials = name.slice(0, 2).toUpperCase();
  const id = `peer-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`;

  // Generate a mock cryptographic fingerprint
  const hexParts = Array.from({ length: 6 }, () =>
    Math.floor(Math.random() * 0xffff)
      .toString(16)
      .padStart(4, '0')
      .toUpperCase()
  );

  return {
    id,
    name: name.charAt(0).toUpperCase() + name.slice(1),
    role: 'Verified Peer',
    avatarColor: 'from-cyan-600 to-blue-800',
    initials: initials || 'SX',
    online: true,
    email: isEmail ? clean : `${clean.toLowerCase()}@securex.internal`,
    about: 'End-to-End Encrypted SecureX Peer',
    encryptionVerified: true,
    keyFingerprint: hexParts.join(' : '),
    unreadCount: 0,
  };
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}
