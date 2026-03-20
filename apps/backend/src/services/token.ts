import crypto from 'crypto';
import { TOKEN_TTL_HOURS, MAGIC_LINK_TTL_MINUTES } from '@settlesync/shared';

const HMAC_SECRET = process.env.HMAC_SECRET || (process.env.NODE_ENV === 'production'
  ? (() => { throw new Error('HMAC_SECRET must be set in production'); })()
  : 'dev-hmac-secret-change-in-production');

/**
 * Generuje token dla strony: UUID v4 + HMAC-SHA256
 * Format: {uuid}.{hmac}
 */
export function generatePartyToken(): string {
  const uuid = crypto.randomUUID();
  const hmac = crypto.createHmac('sha256', HMAC_SECRET).update(uuid).digest('hex');
  return `${uuid}.${hmac}`;
}

/**
 * Weryfikuje podpis HMAC tokenu strony
 */
export function verifyPartyToken(token: string): boolean {
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [uuid, providedHmac] = parts;
  const expectedHmac = crypto.createHmac('sha256', HMAC_SECRET).update(uuid).digest('hex');
  return crypto.timingSafeEqual(Buffer.from(providedHmac, 'hex'), Buffer.from(expectedHmac, 'hex'));
}

/**
 * Generuje kryptograficznie bezpieczny token dla magic link
 */
export function generateMagicLinkToken(): string {
  return crypto.randomBytes(48).toString('base64url');
}

/**
 * Oblicza datę wygaśnięcia tokenu strony
 */
export function getPartyTokenExpiry(ttlHours: number = TOKEN_TTL_HOURS): string {
  return new Date(Date.now() + ttlHours * 60 * 60 * 1000).toISOString();
}

/**
 * Oblicza datę wygaśnięcia magic link
 */
export function getMagicLinkExpiry(): string {
  return new Date(Date.now() + MAGIC_LINK_TTL_MINUTES * 60 * 1000).toISOString();
}

/**
 * Sprawdza czy token nie wygasł
 */
export function isTokenExpired(expiresAt: string | Date): boolean {
  const expiry = expiresAt instanceof Date ? expiresAt : new Date(expiresAt);
  return expiry < new Date();
}
