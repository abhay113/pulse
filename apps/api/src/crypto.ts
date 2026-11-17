import { createHmac, createHash, timingSafeEqual, randomInt, randomBytes } from 'node:crypto';
import type { TokenPayload } from './types.js';

const DEFAULT_SECRET = 'pulse-dev-secret-fallback-key-32-chars-long';

export function getSecret(): string {
  return process.env.HMAC_SECRET || DEFAULT_SECRET;
}

export function base64UrlEncode(str: string): string {
  return Buffer.from(str, 'utf8')
    .toString('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

export function base64UrlDecode(str: string): string {
  let b64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (b64.length % 4 !== 0) {
    b64 += '=';
  }
  return Buffer.from(b64, 'base64').toString('utf8');
}

/**
 * Sign an arbitrary JSON payload with HMAC-SHA256
 */
export function signPayload<T extends Record<string, unknown>>(
  payload: T,
  secret: string = getSecret(),
): string {
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = base64UrlEncode(payloadJson);
  const hmac = createHmac('sha256', secret);
  hmac.update(payloadB64);
  const sigB64 = hmac.digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${payloadB64}.${sigB64}`;
}

/**
 * Verify and decode an HMAC-SHA256 signed payload
 */
export function verifyPayload<T extends Record<string, unknown>>(
  token: string,
  secret: string = getSecret(),
): { valid: boolean; payload?: T; reason?: string } {
  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: 'Malformed token structure' };
  }

  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) {
    return { valid: false, reason: 'Missing token components' };
  }

  const hmac = createHmac('sha256', secret);
  hmac.update(payloadB64);
  const expectedSigB64 = hmac
    .digest('base64')
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');

  const sigBuf = Buffer.from(sigB64);
  const expectedBuf = Buffer.from(expectedSigB64);

  if (sigBuf.length !== expectedBuf.length || !timingSafeEqual(sigBuf, expectedBuf)) {
    return { valid: false, reason: 'Invalid signature' };
  }

  try {
    const payloadJson = base64UrlDecode(payloadB64);
    const payload = JSON.parse(payloadJson) as T;

    if ('exp' in payload && typeof payload.exp === 'number' && payload.exp < Date.now()) {
      return { valid: false, reason: 'Token has expired' };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, reason: 'Corrupt payload decoding' };
  }
}

/**
 * Legacy round token signer
 */
export function signToken(payload: TokenPayload, secret: string = getSecret()): string {
  return signPayload<TokenPayload>(payload, secret);
}

/**
 * Legacy round token verifier
 */
export function verifyToken(
  token: string,
  secret: string = getSecret(),
): { valid: boolean; payload?: TokenPayload; reason?: string } {
  const res = verifyPayload<TokenPayload>(token, secret);
  if (!res.valid || !res.payload) {
    return res;
  }
  if (!Array.isArray(res.payload.sequence) || typeof res.payload.level !== 'number') {
    return { valid: false, reason: 'Invalid token payload format' };
  }
  return res;
}

/**
 * Generates a cryptographically random 6-digit numeric OTP.
 */
export function generateOtp(): string {
  return String(randomInt(100000, 1000000));
}

/**
 * Generates a random salt.
 */
export function generateSalt(): string {
  return randomBytes(16).toString('hex');
}

/**
 * Computes a SHA-256 hash of an OTP bound to the user's email and salt.
 */
export function hashOtp(otp: string, salt: string, email: string): string {
  return createHash('sha256')
    .update(`${otp.trim()}:${salt}:${email.trim().toLowerCase()}`)
    .digest('hex');
}

/**
 * Constant-time comparison between submitted OTP and the expected hash.
 */
export function verifyOtpHash(
  otp: string,
  salt: string,
  email: string,
  expectedHash: string,
): boolean {
  const computed = hashOtp(otp, salt, email);
  const compBuf = Buffer.from(computed);
  const expBuf = Buffer.from(expectedHash);
  if (compBuf.length !== expBuf.length) {
    return false;
  }
  return timingSafeEqual(compBuf, expBuf);
}
