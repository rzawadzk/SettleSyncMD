import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { config } from '../utils/config.js';

export interface AuthPayload {
  sub: string; // arbiter ID
  email: string;
  isAdmin: boolean;
}

declare global {
  namespace Express {
    interface Request {
      auth?: AuthPayload;
    }
  }
}

/**
 * JWT authentication middleware for arbiter routes.
 * Extracts and verifies Bearer token from Authorization header.
 */
export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Missing authorization token', code: 'UNAUTHORIZED' });
    return;
  }

  const token = header.slice(7);

  try {
    const payload = jwt.verify(token, config.JWT_SECRET) as AuthPayload;
    req.auth = payload;
    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ error: 'Token expired', code: 'TOKEN_EXPIRED' });
    } else {
      res.status(401).json({ error: 'Invalid token', code: 'UNAUTHORIZED' });
    }
  }
}

/**
 * Admin-only middleware. Must be used after requireAuth.
 */
export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!req.auth?.isAdmin) {
    res.status(403).json({ error: 'Admin access required', code: 'FORBIDDEN' });
    return;
  }
  next();
}

/**
 * Generate a short-lived JWT for an authenticated arbiter.
 */
export function generateAccessToken(arbiter: { id: string; email: string; isAdmin: boolean }): string {
  const payload: AuthPayload = {
    sub: arbiter.id,
    email: arbiter.email,
    isAdmin: arbiter.isAdmin,
  };
  return jwt.sign(payload, config.JWT_SECRET, {
    expiresIn: `${config.JWT_EXPIRY_MINUTES}m`,
    issuer: 'settlesync',
    audience: 'settlesync-api',
  });
}
