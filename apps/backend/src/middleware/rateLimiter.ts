import rateLimit from 'express-rate-limit';
import { RATE_LIMIT_PARTY, RATE_LIMIT_AUTH } from '@settlesync/shared';

export const partyRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_PARTY.windowMs,
  max: RATE_LIMIT_PARTY.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});

export const authRateLimiter = rateLimit({
  windowMs: RATE_LIMIT_AUTH.windowMs,
  max: RATE_LIMIT_AUTH.max,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests. Please try again later.' },
});
