import jwt from 'jsonwebtoken';
import { eq } from 'drizzle-orm';
import type { Request, Response, NextFunction } from 'express';

const JWT_SECRET = process.env.JWT_SECRET || (process.env.NODE_ENV === 'production'
  ? (() => { throw new Error('JWT_SECRET must be set in production'); })()
  : 'dev-jwt-secret-change-in-production');

export interface AuthPayload {
  arbiterId: number;
  email: string;
  tokenVersion: number;
}

declare global {
  namespace Express {
    interface Request {
      arbiter?: AuthPayload;
    }
  }
}

export function signJwt(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });
}

export function requireAuth(req: Request, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header?.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required' });
    return;
  }

  try {
    const token = header.slice(7);
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    req.arbiter = payload;
    next();
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
}

// Verify tokenVersion against DB (use on sensitive operations)
export async function requireFreshAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  requireAuth(req, res, async () => {
    if (!req.arbiter) return;
    try {
      const { db, schema } = await import('../db/index.js');
      const arbiter = await db.query.arbiters.findFirst({
        where: eq(schema.arbiters.id, req.arbiter.arbiterId),
      });
      if (!arbiter || arbiter.tokenVersion !== req.arbiter.tokenVersion) {
        res.status(401).json({ error: 'Session invalidated. Please log in again.' });
        return;
      }
      next();
    } catch {
      res.status(500).json({ error: 'Internal server error' });
    }
  });
}
