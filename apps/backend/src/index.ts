import express from 'express';
import { securityHeaders, corsMiddleware } from './middleware/security.js';
import authRoutes from './routes/auth.js';
import casesRoutes from './routes/cases.js';
import partyRoutes from './routes/party.js';
import { logInfo } from './services/logger.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const app = express();

// Trust nginx reverse proxy (for correct IP in rate limiting)
app.set('trust proxy', 1);

// Security middleware
app.use(securityHeaders);
app.use(corsMiddleware);

// Body parsing
app.use(express.json({ limit: '10kb' }));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/cases', casesRoutes);
app.use('/api/party', partyRoutes);

// Start
app.listen(PORT, () => {
  logInfo('server', `SettleSync backend running on :${PORT}`);
});
