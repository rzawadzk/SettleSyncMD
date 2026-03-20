import { Router } from 'express';
import { eq, and, isNull } from 'drizzle-orm';
import { magicLinkRequestSchema } from '@settlesync/shared';
import { db, schema } from '../db/index.js';
import { generateMagicLinkToken, getMagicLinkExpiry, isTokenExpired } from '../services/token.js';
import { enqueueEmail } from '../services/emailQueue.js';
import { signJwt } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { logError } from '../services/logger.js';

const router = Router();

/**
 * POST /api/auth/magic-link
 * Przyjmuje: { email: string }
 * Zwraca: { message: string }
 * Uprawnienia: publiczny, rate limited
 * Wysyła magic link na podany email. Tworzy arbitra jeśli nie istnieje.
 */
router.post('/magic-link', authRateLimiter, async (req, res) => {
  try {
    const parsed = magicLinkRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid email', details: parsed.error.flatten() });
      return;
    }

    const { email } = parsed.data;

    // Znajdź lub utwórz arbitra
    let arbiter = await db.query.arbiters.findFirst({
      where: eq(schema.arbiters.email, email),
    });

    if (!arbiter) {
      const [result] = await db.insert(schema.arbiters).values({ email }).returning();
      arbiter = result;
    }

    // Wygeneruj magic link
    const token = generateMagicLinkToken();
    const expiresAt = getMagicLinkExpiry();

    await db.insert(schema.magicLinks).values({
      arbiterId: arbiter.id,
      token,
      expiresAt: new Date(expiresAt),
    });

    // Kolejkuj email (async, z retry)
    await enqueueEmail({ type: 'magic-link', to: email, token });

    // Odpowiedź nie zdradza czy email istnieje w systemie
    res.json({ message: 'If this email is registered, a login link has been sent.' });
  } catch (error) {
    logError('auth/magic-link', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/verify?token=...
 * Przyjmuje: token w query string
 * Zwraca: { token: string (JWT), arbiter: { id, email } }
 * Uprawnienia: publiczny, rate limited
 * Weryfikuje magic link i zwraca JWT sesyjny.
 */
router.get('/verify', authRateLimiter, async (req, res) => {
  try {
    const token = req.query.token as string;
    if (!token) {
      res.status(400).json({ error: 'Token is required' });
      return;
    }

    const magicLink = await db.query.magicLinks.findFirst({
      where: and(
        eq(schema.magicLinks.token, token),
        isNull(schema.magicLinks.usedAt),
      ),
    });

    if (!magicLink || isTokenExpired(magicLink.expiresAt)) {
      res.status(401).json({ error: 'Invalid or expired token' });
      return;
    }

    // Oznacz jako użyty
    await db.update(schema.magicLinks)
      .set({ usedAt: new Date() })
      .where(eq(schema.magicLinks.id, magicLink.id));

    const arbiter = await db.query.arbiters.findFirst({
      where: eq(schema.arbiters.id, magicLink.arbiterId),
    });

    if (!arbiter) {
      res.status(401).json({ error: 'Invalid token' });
      return;
    }

    const jwt = signJwt({ arbiterId: arbiter.id, email: arbiter.email });

    res.json({
      token: jwt,
      arbiter: { id: arbiter.id, email: arbiter.email },
    });
  } catch (error) {
    logError('auth/verify', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
