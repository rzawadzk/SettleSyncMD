import { Router, Request, Response } from 'express';
import { validate } from '../middleware/validate.js';
import { requireAuth, generateAccessToken } from '../middleware/auth.js';
import { MagicLinkRequestSchema, MagicLinkVerifySchema } from '@settlesync/shared';

export const authRouter = Router();

/**
 * POST /api/auth/magic-link — Request a magic link email
 */
authRouter.post('/magic-link', validate(MagicLinkRequestSchema), async (req: Request, res: Response) => {
  try {
    const { email, locale } = req.body;

    // Service layer:
    // 1. Find or create arbiter by email
    // 2. Generate magic link token (UUID v4, 15min TTL)
    // 3. Send email with link: {APP_URL}/auth/verify?token={token}
    // 4. In dev mode, log Ethereal URL to console

    // Always return success to prevent email enumeration
    res.json({
      message: 'If an account exists, a login link has been sent to your email',
    });
  } catch (err) {
    // Still return success to prevent enumeration
    res.json({
      message: 'If an account exists, a login link has been sent to your email',
    });
  }
});

/**
 * GET /api/auth/verify — Verify magic link and return JWT
 */
authRouter.get('/verify', validate(MagicLinkVerifySchema, 'query'), async (req: Request, res: Response) => {
  try {
    const { token } = req.query as { token: string };

    // Service layer:
    // 1. Find magic link by token
    // 2. Check not expired and not used
    // 3. Mark as used
    // 4. Generate JWT + refresh token
    // 5. Update last login timestamp

    // Placeholder:
    // const arbiter = await authService.verifyMagicLink(token);
    // const accessToken = generateAccessToken(arbiter);
    // const refreshToken = await authService.createRefreshToken(arbiter.id);

    res.json({
      message: 'Verification placeholder',
      // accessToken,
      // refreshToken,
      // user: { id: arbiter.id, email: arbiter.email, name: arbiter.name },
    });
  } catch (err) {
    res.status(401).json({ error: 'Invalid or expired link', code: 'TOKEN_INVALID' });
  }
});

/**
 * POST /api/auth/refresh — Refresh access token
 */
authRouter.post('/refresh', async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    if (!refreshToken) {
      res.status(400).json({ error: 'Refresh token required', code: 'VALIDATION_ERROR' });
      return;
    }

    // Service: validate refresh token, rotate, issue new access token
    // const { accessToken, newRefreshToken } = await authService.refresh(refreshToken);

    res.json({ message: 'Token refresh placeholder' });
  } catch (err) {
    res.status(401).json({ error: 'Invalid refresh token', code: 'UNAUTHORIZED' });
  }
});

/**
 * GET /api/auth/me — Get current user profile
 */
authRouter.get('/me', requireAuth, async (req: Request, res: Response) => {
  try {
    // Service: fetch arbiter profile
    res.json({
      id: req.auth!.sub,
      email: req.auth!.email,
      isAdmin: req.auth!.isAdmin,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to get profile', code: 'INTERNAL_ERROR' });
  }
});

/**
 * POST /api/auth/logout — Revoke refresh token
 */
authRouter.post('/logout', requireAuth, async (req: Request, res: Response) => {
  try {
    const { refreshToken } = req.body;
    // Service: revoke refresh token
    res.json({ message: 'Logged out' });
  } catch (err) {
    res.json({ message: 'Logged out' });
  }
});
