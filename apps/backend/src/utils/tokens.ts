import crypto from 'node:crypto';
import { config } from './config.js';

/**
 * Generate a secure party token with HMAC signature.
 * Token format: UUID v4 (random, unpredictable)
 * Signature: HMAC-SHA256(token, secret) — stored separately for verification
 */
export function generatePartyToken(): { token: string; signature: string } {
  const token = crypto.randomUUID();
  const signature = signToken(token);
  return { token, signature };
}

/**
 * Sign a token using HMAC-SHA256
 */
export function signToken(token: string): string {
  return crypto
    .createHmac('sha256', config.HMAC_SECRET)
    .update(token)
    .digest('hex');
}

/**
 * Verify a token's HMAC signature
 */
export function verifyTokenSignature(token: string, signature: string): boolean {
  const expected = signToken(token);
  return crypto.timingSafeEqual(
    Buffer.from(expected, 'hex'),
    Buffer.from(signature, 'hex')
  );
}

/**
 * Hash an identifier for privacy-safe audit logging.
 * Uses SHA-256 — one-way, so original value can't be recovered from logs.
 */
export function hashForAudit(value: string): string {
  return crypto
    .createHash('sha256')
    .update(value + config.HMAC_SECRET) // salted with secret
    .digest('hex')
    .substring(0, 16); // truncated for readability
}

/**
 * Calculate token expiration date
 */
export function getTokenExpiry(hours?: number): Date {
  const ttl = hours ?? config.TOKEN_TTL_HOURS;
  return new Date(Date.now() + ttl * 60 * 60 * 1000);
}

/**
 * Check if a token has expired
 */
export function isTokenExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt;
}

/**
 * Generate a magic link token (UUID v4)
 */
export function generateMagicLinkToken(): string {
  return crypto.randomUUID();
}

/**
 * Generate HMAC signature for webhook payloads
 */
export function signWebhookPayload(payload: string, secret: string): string {
  return crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
}
