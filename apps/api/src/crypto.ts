import { createHmac, timingSafeEqual } from 'node:crypto';
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

export function signToken(payload: TokenPayload, secret: string = getSecret()): string {
  const payloadJson = JSON.stringify(payload);
  const payloadB64 = base64UrlEncode(payloadJson);
  const hmac = createHmac('sha256', secret);
  hmac.update(payloadB64);
  const sigB64 = hmac.digest('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  return `${payloadB64}.${sigB64}`;
}

export function verifyToken(
  token: string,
  secret: string = getSecret(),
): { valid: boolean; payload?: TokenPayload; reason?: string } {
  const parts = token.split('.');
  if (parts.length !== 2) {
    return { valid: false, reason: 'Malformed token structure' };
  }

  const [payloadB64, sigB64] = parts;
  if (!payloadB64 || !sigB64) {
    return { valid: false, reason: 'Missing token components' };
  }

  // Recalculate signature
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
    const payload = JSON.parse(payloadJson) as TokenPayload;

    if (typeof payload.exp !== 'number' || payload.exp < Date.now()) {
      return { valid: false, reason: 'Token has expired' };
    }

    if (!Array.isArray(payload.sequence) || typeof payload.level !== 'number') {
      return { valid: false, reason: 'Invalid token payload format' };
    }

    return { valid: true, payload };
  } catch {
    return { valid: false, reason: 'Corrupt payload decoding' };
  }
}
