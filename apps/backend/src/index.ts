import express from 'express';
import { securityHeaders, corsMiddleware } from './middleware/security.js';
import { initEmailTransport } from './services/email.js';
import authRoutes from './routes/auth.js';
import casesRoutes from './routes/cases.js';
import partyRoutes from './routes/party.js';

const PORT = parseInt(process.env.PORT || '3001', 10);
const app = express();

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
async function start() {
  await initEmailTransport();
  app.listen(PORT, () => {
    console.log(`SettleSync backend running on http://localhost:${PORT}`);
  });
}

start().catch(console.error);
