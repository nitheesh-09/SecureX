/**
 * SecureX Centralized Chat & Messaging API Client
 * Interfaces with FastAPI backend (/api/v1/conversations and /api/v1/users)
 * All requests authenticate with JWT Bearer tokens.
 */

import {
  RegisteredUser,
  ConversationItem,
  ChatMessage,
  ZipAttachment,
  Contact,
} from '@/types/chat';

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000'
).replace(/\/+$/, '');

function getHeaders(token?: string) {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }
  return headers;
}

/**
 * Search registered users in the database by name or email.
 */
export async function searchRegisteredUsers(
  query: string,
  token: string
): Promise<RegisteredUser[]> {
  if (!query.trim()) return [];
  const res = await fetch(
    `${API_BASE_URL}/api/v1/users/search?q=${encodeURIComponent(query.trim())}`,
    {
      method: 'GET',
      headers: getHeaders(token),
    }
  );
  if (!res.ok) {
    throw new Error(`Failed to search users (${res.status})`);
  }
  return res.json();
}

/**
 * List all available registered peers from the database.
 */
export async function listRegisteredPeers(
  token: string
): Promise<RegisteredUser[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/users`, {
    method: 'GET',
    headers: getHeaders(token),
  });
  if (!res.ok) {
    throw new Error(`Failed to list peers (${res.status})`);
  }
  return res.json();
}

/**
 * Fetch all active conversations for the authenticated user from SQLite.
 */
export async function fetchUserConversations(
  token: string
): Promise<ConversationItem[]> {
  const res = await fetch(`${API_BASE_URL}/api/v1/conversations`, {
    method: 'GET',
    headers: getHeaders(token),
  });
  if (!res.ok) {
    throw new Error(`Failed to fetch conversations (${res.status})`);
  }
  return res.json();
}

/**
 * Start or retrieve the canonical shared conversation with a registered peer.
 */
export async function createOrGetConversation(
  recipientId: string,
  token: string
): Promise<ConversationItem> {
  const res = await fetch(`${API_BASE_URL}/api/v1/conversations`, {
    method: 'POST',
    headers: getHeaders(token),
    body: JSON.stringify({ recipient_id: recipientId }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail || err?.error?.message || `Failed to create conversation (${res.status})`);
  }
  return res.json();
}

interface RawBackendMessage {
  id: string;
  conversation_id: string;
  sender_id: string;
  receiver_id: string;
  text?: string;
  attachment_json?: string;
  created_at: string;
}

function formatMessageTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    const hours = d.getHours();
    const minutes = d.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    return `${hours % 12 || 12}:${minutes} ${ampm}`;
  } catch {
    return 'Just now';
  }
}

/**
 * Fetch all persistent messages for a conversation from SQLite.
 */
export async function fetchConversationMessages(
  conversationId: string,
  token: string
): Promise<ChatMessage[]> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: 'GET',
      headers: getHeaders(token),
    }
  );
  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail || err?.error?.message || `Failed to load messages (${res.status})`);
  }
  const rawList: RawBackendMessage[] = await res.json();

  return rawList.map((m) => {
    let attachment: ZipAttachment | undefined = undefined;
    if (m.attachment_json) {
      try {
        attachment = JSON.parse(m.attachment_json);
      } catch {
        // invalid json
      }
    }

    return {
      id: m.id,
      conversationId: m.conversation_id,
      senderId: m.sender_id,
      recipientId: m.receiver_id,
      text: m.text || undefined,
      attachment,
      timestamp: formatMessageTime(m.created_at),
      status: 'delivered',
    };
  });
}

/**
 * Send a message or encrypted ZIP file to the database.
 */
export async function sendConversationMessage(
  conversationId: string,
  text: string | undefined,
  attachment: ZipAttachment | undefined,
  token: string
): Promise<ChatMessage> {
  const attachmentJson = attachment ? JSON.stringify(attachment) : null;

  const res = await fetch(
    `${API_BASE_URL}/api/v1/conversations/${encodeURIComponent(conversationId)}/messages`,
    {
      method: 'POST',
      headers: getHeaders(token),
      body: JSON.stringify({
        text: text || null,
        attachment_json: attachmentJson,
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail || err?.error?.message || `Failed to send message (${res.status})`);
  }

  const raw: RawBackendMessage = await res.json();
  let parsedAttachment: ZipAttachment | undefined = undefined;
  if (raw.attachment_json) {
    try {
      parsedAttachment = JSON.parse(raw.attachment_json);
    } catch {
      // ignore
    }
  }

  return {
    id: raw.id,
    conversationId: raw.conversation_id,
    senderId: raw.sender_id,
    recipientId: raw.receiver_id,
    text: raw.text || undefined,
    attachment: parsedAttachment,
    timestamp: formatMessageTime(raw.created_at),
    status: 'delivered',
  };
}

/**
 * Update an existing message's attachment (e.g. after sanitization).
 */
export async function updateConversationMessageAttachment(
  conversationId: string,
  messageId: string,
  attachment: ZipAttachment,
  token: string
): Promise<ChatMessage> {
  const res = await fetch(
    `${API_BASE_URL}/api/v1/conversations/${encodeURIComponent(conversationId)}/messages/${encodeURIComponent(messageId)}`,
    {
      method: 'PATCH',
      headers: getHeaders(token),
      body: JSON.stringify({
        attachment_json: JSON.stringify(attachment),
      }),
    }
  );

  if (!res.ok) {
    const err = await res.json().catch(() => null);
    throw new Error(err?.detail || err?.error?.message || `Failed to update message attachment (${res.status})`);
  }

  const raw: RawBackendMessage = await res.json();
  let parsedAttachment: ZipAttachment | undefined = undefined;
  if (raw.attachment_json) {
    try {
      parsedAttachment = JSON.parse(raw.attachment_json);
    } catch {
      // ignore
    }
  }

  return {
    id: raw.id,
    conversationId: raw.conversation_id,
    senderId: raw.sender_id,
    recipientId: raw.receiver_id,
    text: raw.text || undefined,
    attachment: parsedAttachment,
    timestamp: formatMessageTime(raw.created_at),
    status: 'delivered',
  };
}

/**
 * Convert a backend ConversationItem into a frontend Contact object.
 */
export function conversationToContact(conv: ConversationItem): Contact {
  const peer = conv.peer || {
    id: 'unknown-peer',
    name: 'Unknown Peer',
    email: 'peer@securex.internal',
    key_fingerprint: 'SECX : 2026 : E2EE : AUTH : USER : KEY1',
  };

  const initials = peer.name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase() || 'SX';

  return {
    id: peer.id,
    conversationId: conv.id,
    name: peer.name,
    email: peer.email,
    initials,
    avatarColor: 'from-red-600 to-rose-700',
    online: true,
    about: 'End-to-End Encrypted SecureX Peer',
    encryptionVerified: true,
    keyFingerprint: peer.key_fingerprint,
    unreadCount: 0,
    lastSeen: 'Active',
  };
}
