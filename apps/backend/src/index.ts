import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import pino from 'pino';
import pinoHttp from 'pino-http';
import { rateLimit } from 'express-rate-limit';
import { config } from './utils/config.js';
import { authRouter } from './routes/auth.js';
import { casesRouter } from './routes/cases.js';
import { partyRouter } from './routes/party.js';
import { adminRouter } from './routes/admin.js';
import { healthRouter } from './routes/health.js';
import { errorHandler } from './middleware/errorHandler.js';

const logger = pino({
  level: config.LOG_LEVEL,
  // Redact PII from logs
  redact: {
    paths: ['req.headers.authorization', 'req.headers.cookie', 'res.headers["set-cookie"]'],
    censor: '[REDACTED]',
  },
});

const app = express();

// ============================================================
// SECURITY MIDDLEWARE
// ============================================================

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:'],
      connectSrc: ["'self'"],
      fontSrc: ["'self'"],
      objectSrc: ["'none'"],
      frameAncestors: ["'none'"],
      upgradeInsecureRequests: config.NODE_ENV === 'production' ? [] : null,
    },
  },
  hsts: { maxAge: 63072000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

app.use(cors({
  origin: config.APP_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Accept-Language'],
}));

app.use(express.json({ limit: '1mb' }));

// ============================================================
// LOGGING (PII-free)
// ============================================================

app.use(pinoHttp({
  logger,
  // Don't log request bodies (may contain PII)
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      // No headers, no body
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
  },
}));

// ============================================================
// RATE LIMITING
// ============================================================

const generalLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_GENERAL,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', code: 'RATE_LIMITED' },
});

const authLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_AUTH,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many authentication attempts', code: 'RATE_LIMITED' },
});

const partyLimiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW_MS,
  max: config.RATE_LIMIT_PARTY,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests', code: 'RATE_LIMITED' },
});

app.use('/api/', generalLimiter);

// ============================================================
// ROUTES
// ============================================================

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/cases', casesRouter);
app.use('/api/party', partyLimiter, partyRouter);
app.use('/api/admin', adminRouter);
app.use('/api/health', healthRouter);

// OpenAPI docs (Swagger UI)
if (config.NODE_ENV !== 'production') {
  // Dynamic import to avoid bundling swagger in production
  import('./routes/docs.js').then(({ docsRouter }) => {
    app.use('/api/docs', docsRouter);
  });
}

// ============================================================
// ERROR HANDLING
// ============================================================

app.use(errorHandler);

// ============================================================
// START SERVER
// ============================================================

const port = config.PORT;

app.listen(port, () => {
  logger.info(`SettleSync API running on port ${port}`);
  logger.info(`Environment: ${config.NODE_ENV}`);
  if (config.NODE_ENV === 'development') {
    logger.info(`API docs: http://localhost:${port}/api/docs`);
  }
});

export { app };
