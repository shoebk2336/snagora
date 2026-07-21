import { logger } from './logger';

/**
 * Cryptographic utilities for license encryption, signature verification,
 * and device fingerprinting. Uses Web Crypto API (no external deps).
 */

// ─── AES-GCM Encryption / Decryption ─────────────────────────────────────────

const ENCRYPTION_KEY_MATERIAL = 'Snagora-Enterprise-2024-License-Key';

async function deriveKey(): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(ENCRYPTION_KEY_MATERIAL),
    { name: 'PBKDF2' },
    false,
    ['deriveKey']
  );

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: encoder.encode('Snagora-salt-v1'),
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptData(plaintext: string): Promise<string> {
  try {
    const key = await deriveKey();
    const encoder = new TextEncoder();
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      key,
      encoder.encode(plaintext)
    );

    // Combine IV + ciphertext, encode as base64
    const combined = new Uint8Array(iv.length + new Uint8Array(encrypted).length);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    return btoa(String.fromCharCode(...combined));
  } catch (e) {
    logger.error('Encryption failed:', e);
    throw new Error('Failed to encrypt data');
  }
}

export async function decryptData(ciphertext: string): Promise<string> {
  try {
    const key = await deriveKey();
    const combined = Uint8Array.from(atob(ciphertext), c => c.charCodeAt(0));
    
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      key,
      data
    );

    return new TextDecoder().decode(decrypted);
  } catch (e) {
    logger.error('Decryption failed:', e);
    throw new Error('Failed to decrypt data – license may be corrupted');
  }
}

// ─── Digital Signature Verification ──────────────────────────────────────────

/**
 * Verify a license signature. In production, the backend signs the license
 * payload with its private key, and we verify with the public key.
 * For the mock implementation, we use a simple HMAC-SHA256 check.
 */
export async function verifyLicenseSignature(
  payload: string,
  signature: string
): Promise<boolean> {
  try {
    const encoder = new TextEncoder();
    const key = await crypto.subtle.importKey(
      'raw',
      encoder.encode('Snagora-license-signing-key-v1'),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['verify']
    );

    const sigBytes = Uint8Array.from(atob(signature), c => c.charCodeAt(0));
    
    return await crypto.subtle.verify(
      'HMAC',
      key,
      sigBytes,
      encoder.encode(payload)
    );
  } catch (e) {
    logger.error('Signature verification failed:', e);
    return false;
  }
}

/**
 * Generate an HMAC signature (used by mock API to create signed licenses).
 */
export async function generateSignature(payload: string): Promise<string> {
  const encoder = new TextEncoder();
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode('Snagora-license-signing-key-v1'),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'HMAC',
    key,
    encoder.encode(payload)
  );

  return btoa(String.fromCharCode(...new Uint8Array(signature)));
}

// ─── Device Fingerprint ──────────────────────────────────────────────────────

export function generateDeviceFingerprint(): string {
  if (typeof window === 'undefined') return 'server-side';
  
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth.toString(),
    new Date().getTimezoneOffset().toString(),
    navigator.hardwareConcurrency?.toString() || '0',
  ];
  
  // Simple hash from components
  let hash = 0;
  const str = components.join('|');
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return 'dev-' + Math.abs(hash).toString(36) + '-' + str.length.toString(36);
}

// ─── Time Tampering Detection ────────────────────────────────────────────────

const LAST_KNOWN_TIME_KEY = 'Snagora_last_known_time';

export function recordCurrentTime(): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(LAST_KNOWN_TIME_KEY, Date.now().toString());
}

export function detectTimeTampering(): boolean {
  if (typeof window === 'undefined') return false;
  
  const lastKnown = localStorage.getItem(LAST_KNOWN_TIME_KEY);
  if (!lastKnown) return false;
  
  const lastTime = parseInt(lastKnown, 10);
  const now = Date.now();
  
  // If current time is more than 1 hour before last known time,
  // the clock has likely been set back
  if (now < lastTime - 3600000) {
    return true;
  }
  
  return false;
}

// ─── Secure Storage Helpers ──────────────────────────────────────────────────

export async function secureStore(key: string, data: unknown): Promise<void> {
  if (typeof window === 'undefined') return;
  const json = JSON.stringify(data);
  const encrypted = await encryptData(json);
  localStorage.setItem(key, encrypted);
  recordCurrentTime();
}

export async function secureRetrieve<T>(key: string): Promise<T | null> {
  if (typeof window === 'undefined') return null;
  const encrypted = localStorage.getItem(key);
  if (!encrypted) return null;
  
  try {
    const json = await decryptData(encrypted);
    return JSON.parse(json) as T;
  } catch {
    logger.error(`Failed to retrieve secure data for key: ${key}`);
    return null;
  }
}

export function secureRemove(key: string): void {
  if (typeof window === 'undefined') return;
  localStorage.removeItem(key);
}
