import { cookies } from 'next/headers';
import crypto from 'crypto';

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
}

export interface SessionTokens {
  accessToken: string;
  refreshToken?: string;
  expiresAt: number; // timestamp in ms
}

export interface SessionDatabase {
  spreadsheetId: string;
  name: string;
  status: 'connected' | 'setup_required' | 'disconnected';
  sheetsReady?: boolean;
  profileReady?: boolean;
}

export interface SessionData {
  user: SessionUser;
  tokens?: SessionTokens;
  database?: SessionDatabase;
  isDevMode?: boolean;
  createdAt: number;
}

const SESSION_COOKIE_NAME = 'self_tracker_session';
const SESSION_MAX_AGE = 30 * 24 * 60 * 60; // 30 days in seconds

function getEncryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('CRITICAL SECURITY CONFIGURATION ERROR: AUTH_SECRET must be set in production environments.');
    }
    console.warn(
      '[SECURITY WARNING] AUTH_SECRET is not configured. Falling back to development-only temporary key. Do not use this in production.'
    );
    return crypto.createHash('sha256').update('dev-only-ephemeral-secret-key-32-chars!').digest();
  }
  return crypto.createHash('sha256').update(secret).digest();
}

/**
 * Encrypts session data into an authenticated AES-256-GCM string (iv:authTag:ciphertext)
 */
export function encryptSession(data: SessionData): string {
  const key = getEncryptionKey();
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

  const json = JSON.stringify(data);
  let encrypted = cipher.update(json, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const authTag = cipher.getAuthTag().toString('hex');

  return `${iv.toString('hex')}:${authTag}:${encrypted}`;
}

const HEX_REGEX = /^[0-9a-fA-F]+$/;

/**
 * Decrypts and verifies session ciphertext
 */
export function decryptSession(cookieValue: string): SessionData | null {
  try {
    if (!cookieValue || typeof cookieValue !== 'string') return null;
    // Normalize potential URI encoding (e.g. %3A for colon)
    const raw = decodeURIComponent(cookieValue).trim();
    const parts = raw.split(':');
    if (parts.length !== 3) return null;

    const [ivHex, authTagHex, encryptedHex] = parts;

    // Strict validation of hex formats and expected IV / tag lengths
    if (!HEX_REGEX.test(ivHex) || !HEX_REGEX.test(authTagHex) || !HEX_REGEX.test(encryptedHex)) {
      return null;
    }
    // AES-GCM IV is 12 bytes (24 hex characters), auth tag is 16 bytes (32 hex characters)
    if (ivHex.length !== 24 || authTagHex.length !== 32) {
      return null;
    }

    const key = getEncryptionKey();
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encryptedHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    const session = JSON.parse(decrypted) as SessionData;

    // Validate structural integrity and server-side session expiration
    if (!session || typeof session !== 'object' || !session.user || !session.user.id) {
      return null;
    }

    // Verify session TTL (SESSION_MAX_AGE in seconds -> ms)
    if (!session.createdAt || typeof session.createdAt !== 'number') {
      return null;
    }
    const maxAgeMs = SESSION_MAX_AGE * 1000;
    if (Date.now() - session.createdAt > maxAgeMs) {
      // Session has expired
      return null;
    }

    return session;
  } catch (err) {
    console.error('[Session Decrypt Error]:', err instanceof Error ? err.message : 'Invalid session format');
    return null;
  }
}

/**
 * Reads session data from request cookies or Next.js headers cookieStore
 */
export async function getSession(request?: Request | { cookies: { get: (name: string) => { value?: string } | undefined } }): Promise<SessionData | null> {
  try {
    let cookieVal: string | undefined;

    // Check request-provided cookies first if available
    if (request && 'cookies' in request && typeof request.cookies?.get === 'function') {
      cookieVal = request.cookies.get(SESSION_COOKIE_NAME)?.value;
    }

    // Fall back to Next.js cookieStore
    if (!cookieVal) {
      try {
        const cookieStore = await cookies();
        cookieVal = cookieStore.get(SESSION_COOKIE_NAME)?.value;
      } catch {}
    }

    if (!cookieVal) {
      return null;
    }
    return decryptSession(cookieVal);
  } catch {
    return null;
  }
}

/**
 * Sets session cookie with HTTP-only, secure, and SameSite protection
 */
export async function setSession(data: SessionData): Promise<void> {
  const encrypted = encryptSession(data);
  const cookieStore = await cookies();

  cookieStore.set(SESSION_COOKIE_NAME, encrypted, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE,
  });
}

/**
 * Clears the session cookie
 */
export async function clearSession(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Automatically refreshes the Google OAuth access token if expired or close to expiry (within 5 mins)
 */
export async function refreshGoogleTokensIfNeeded(session: SessionData): Promise<SessionData> {
  if (session.isDevMode || !session.tokens || !session.tokens.refreshToken) {
    return session;
  }

  const now = Date.now();
  const bufferTime = 5 * 60 * 1000; // 5 minutes before expiry
  if (now < session.tokens.expiresAt - bufferTime) {
    return session;
  }

  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return session;
  }

  try {
    const params = new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: session.tokens.refreshToken,
      grant_type: 'refresh_token',
    });

    const res = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error('[Google Token Refresh Failed]:', errText);
      return session;
    }

    const tokenData = await res.json();
    const updatedSession: SessionData = {
      ...session,
      tokens: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token || session.tokens.refreshToken,
        expiresAt: Date.now() + (tokenData.expires_in || 3600) * 1000,
      },
    };

    await setSession(updatedSession);
    return updatedSession;
  } catch (err) {
    console.error('[Google Token Refresh Error]:', err);
    return session;
  }
}
