import { Router } from 'express';
import { eq, and, isNull } from 'drizzle-orm';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import { magicLinkRequestSchema } from '@settlesync/shared';
import { db, schema } from '../db/index.js';
import { generateMagicLinkToken, getMagicLinkExpiry, isTokenExpired } from '../services/token.js';
import { enqueueEmail } from '../services/emailQueue.js';
import { signJwt, requireAuth } from '../middleware/auth.js';
import { authRateLimiter } from '../middleware/rateLimiter.js';
import { logError } from '../services/logger.js';

const router = Router();

/**
 * POST /api/auth/magic-link
 * Send magic link to mediator email. Creates mediator if not exists.
 */
router.post('/magic-link', authRateLimiter, async (req, res) => {
  try {
    const parsed = magicLinkRequestSchema.safeParse(req.body);
    if (!parsed.success) {
      res.status(400).json({ error: 'Invalid email', details: parsed.error.flatten() });
      return;
    }

    const { email } = parsed.data;

    let arbiter = await db.query.arbiters.findFirst({
      where: eq(schema.arbiters.email, email),
    });

    if (!arbiter) {
      const [result] = await db.insert(schema.arbiters).values({ email }).returning();
      arbiter = result;
    }

    // Admins cannot use magic link — they must use password + OTP
    if (arbiter.role === 'admin') {
      res.json({ message: 'If this email is registered, a login link has been sent.' });
      return;
    }

    const token = generateMagicLinkToken();
    const expiresAt = getMagicLinkExpiry();

    await db.insert(schema.magicLinks).values({
      arbiterId: arbiter.id,
      token,
      expiresAt: new Date(expiresAt),
    });

    await enqueueEmail({ type: 'magic-link', to: email, token });

    res.json({ message: 'If this email is registered, a login link has been sent.' });
  } catch (error) {
    logError('auth/magic-link', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * GET /api/auth/verify?token=...
 * Verify magic link, return JWT with role: 'mediator'
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

    const jwt = signJwt({
      arbiterId: arbiter.id,
      email: arbiter.email,
      role: (arbiter.role as 'mediator' | 'admin') || 'mediator',
      tokenVersion: arbiter.tokenVersion,
    });

    res.json({
      token: jwt,
      arbiter: { id: arbiter.id, email: arbiter.email, role: arbiter.role || 'mediator' },
    });
  } catch (error) {
    logError('auth/verify', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/admin-login
 * Step 1: verify email + password, send OTP to email
 */
router.post('/admin-login', authRateLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'Email and password required' });
      return;
    }

    const arbiter = await db.query.arbiters.findFirst({
      where: eq(schema.arbiters.email, email),
    });

    if (!arbiter || arbiter.role !== 'admin' || !arbiter.passwordHash) {
      // Don't reveal whether account exists
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const passwordValid = await bcrypt.compare(password, arbiter.passwordHash);
    if (!passwordValid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Generate 6-digit OTP
    const code = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    await db.insert(schema.otpCodes).values({
      arbiterId: arbiter.id,
      code,
      expiresAt,
    });

    // Send OTP via email
    await enqueueEmail({ type: 'otp-code', to: email, code });

    res.json({ otpRequired: true, message: 'OTP code sent to your email' });
  } catch (error) {
    logError('auth/admin-login', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/verify-otp
 * Step 2: verify OTP code, return JWT with role: 'admin'
 */
router.post('/verify-otp', authRateLimiter, async (req, res) => {
  try {
    const { email, code } = req.body;
    if (!email || !code) {
      res.status(400).json({ error: 'Email and OTP code required' });
      return;
    }

    const arbiter = await db.query.arbiters.findFirst({
      where: eq(schema.arbiters.email, email),
    });

    if (!arbiter || arbiter.role !== 'admin') {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    // Find valid, unused OTP for this arbiter
    const otpRecords = await db.query.otpCodes.findMany({
      where: and(
        eq(schema.otpCodes.arbiterId, arbiter.id),
        eq(schema.otpCodes.code, code),
        eq(schema.otpCodes.used, false),
      ),
    });

    const validOtp = otpRecords.find((otp) => !isTokenExpired(otp.expiresAt));
    if (!validOtp) {
      res.status(401).json({ error: 'Invalid or expired OTP code' });
      return;
    }

    // Mark OTP as used
    await db.update(schema.otpCodes)
      .set({ used: true })
      .where(eq(schema.otpCodes.id, validOtp.id));

    const jwt = signJwt({
      arbiterId: arbiter.id,
      email: arbiter.email,
      role: 'admin',
      tokenVersion: arbiter.tokenVersion,
    });

    res.json({
      token: jwt,
      arbiter: { id: arbiter.id, email: arbiter.email, role: 'admin' },
    });
  } catch (error) {
    logError('auth/verify-otp', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

/**
 * POST /api/auth/logout-all
 * Invalidates all existing sessions for the current arbiter
 */
router.post('/logout-all', requireAuth, async (req, res) => {
  try {
    await db.update(schema.arbiters)
      .set({ tokenVersion: (req.arbiter!.tokenVersion || 0) + 1 })
      .where(eq(schema.arbiters.id, req.arbiter!.arbiterId));

    res.json({ message: 'All sessions invalidated' });
  } catch (error) {
    logError('auth/logout-all', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
