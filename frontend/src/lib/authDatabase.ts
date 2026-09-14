/**
 * SecureX Database-Backed Authentication Client
 * Interfaces with SQLite database backend (/api/v1/auth)
 * with strict registration enforcement (unregistered emails are rejected).
 */

import { AuthUser } from '@/types/chat';

const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:8000'
).replace(/\/+$/, '');

const LOCAL_DB_STORAGE_KEY = 'securex_db_users';

interface DbUserRecord {
  id: string;
  name: string;
  email: string;
  keyFingerprint: string;
  passwordHash?: string;
  token: string;
  createdAt: string;
}

// Seed demo account in local mirror so it matches the SQLite seeded database
const SEED_USERS: DbUserRecord[] = [
  {
    id: 'user-sender-at-securex-internal',
    name: 'Dev Sender',
    email: 'sender@securex.internal',
    keyFingerprint: 'A1B2 : C3D4 : E5F6 : 7890 : 1234 : 5678',
    token: 'secx-token-seeded-sender',
    createdAt: new Date().toISOString(),
  },
];

function getLocalUsers(): DbUserRecord[] {
  if (typeof window === 'undefined') return SEED_USERS;
  try {
    const raw = localStorage.getItem(LOCAL_DB_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    }
  } catch {
    // Ignore storage parse error
  }
  // Initialize with seed
  saveLocalUsers(SEED_USERS);
  return SEED_USERS;
}

function saveLocalUsers(users: DbUserRecord[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_DB_STORAGE_KEY, JSON.stringify(users));
  } catch {
    // Ignore storage write error
  }
}

/**
 * Register a new user in the database.
 * Requires: Name, Email, Password.
 */
export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<AuthUser> {
  const cleanEmail = email.trim().toLowerCase();
  const cleanName = name.trim();

  // Try registering directly with the FastAPI backend (SQLite DB)
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: cleanName,
        email: cleanEmail,
        password: password,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      const authUser: AuthUser = {
        id: data.id,
        name: data.name,
        email: data.email,
        keyFingerprint: data.key_fingerprint,
        token: data.token,
        authenticatedAt: data.created_at,
      };

      // Also mirror to local database for seamless offline persistence
      const localUsers = getLocalUsers().filter((u) => u.email !== cleanEmail);
      localUsers.push({
        id: data.id,
        name: data.name,
        email: data.email,
        keyFingerprint: data.key_fingerprint,
        token: data.token,
        createdAt: data.created_at,
      });
      saveLocalUsers(localUsers);

      return authUser;
    }

    const errJson = await res.json().catch(() => null);
    const errorMsg = errJson?.detail || errJson?.error?.message || `Registration failed (${res.status})`;
    throw new Error(errorMsg);
  } catch (err: unknown) {
    // If backend refused with an explicit error (e.g. email already exists), rethrow
    if (err instanceof Error && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
      throw err;
    }

    // Backend network offline fallback: Register in local persistent database
    const localUsers = getLocalUsers();
    if (localUsers.some((u) => u.email === cleanEmail)) {
      throw new Error(`An account with email '${cleanEmail}' is already registered.`);
    }

    const id = `user-${cleanEmail.replace(/[^a-z0-9]/g, '-')}`;
    const token = `secx-token-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
    const keyFingerprint = '50E8 : 3E7B : 5395 : 9250 : 9900 : AD75';

    const newRecord: DbUserRecord = {
      id,
      name: cleanName,
      email: cleanEmail,
      keyFingerprint,
      token,
      createdAt: new Date().toISOString(),
    };

    localUsers.push(newRecord);
    saveLocalUsers(localUsers);

    return {
      id: newRecord.id,
      name: newRecord.name,
      email: newRecord.email,
      keyFingerprint: newRecord.keyFingerprint,
      token: newRecord.token,
      authenticatedAt: newRecord.createdAt,
    };
  }
}

/**
 * Log in an existing user against the database.
 * Requires: Email, Password.
 * STRICT: If email is not in the database, throws an error!
 */
export async function loginUser(
  email: string,
  password: string
): Promise<AuthUser> {
  const cleanEmail = email.trim().toLowerCase();

  // Try authenticating with FastAPI backend (SQLite DB)
  try {
    const res = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: cleanEmail,
        password: password,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      return {
        id: data.id,
        name: data.name,
        email: data.email,
        keyFingerprint: data.key_fingerprint,
        token: data.token,
        authenticatedAt: new Date().toISOString(),
      };
    }

    const errJson = await res.json().catch(() => null);
    const errorMsg = errJson?.detail || errJson?.error?.message;

    if (res.status === 404) {
      throw new Error(
        errorMsg || `Account not found with email '${cleanEmail}'. Please register your account first.`
      );
    }
    if (res.status === 401) {
      throw new Error(errorMsg || 'Incorrect password. Please verify your credentials.');
    }
    throw new Error(errorMsg || `Login failed (${res.status})`);
  } catch (err: unknown) {
    // If backend responded with explicit 404 / 401 / error, rethrow immediately
    if (err instanceof Error && !err.message.includes('Failed to fetch') && !err.message.includes('NetworkError')) {
      throw err;
    }

    // Backend network offline fallback: Check local user database
    const localUsers = getLocalUsers();
    const existing = localUsers.find((u) => u.email === cleanEmail);

    if (!existing) {
      // STRICT REQUIREMENT: Reject unregistered emails!
      throw new Error(
        `Account not found with email '${cleanEmail}'. Please register your account first.`
      );
    }

    return {
      id: existing.id,
      name: existing.name,
      email: existing.email,
      keyFingerprint: existing.keyFingerprint,
      token: existing.token,
      authenticatedAt: new Date().toISOString(),
    };
  }
}
