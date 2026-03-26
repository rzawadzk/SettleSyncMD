import { Worker } from 'bullmq';
import { eq, and, ne, lt } from 'drizzle-orm';
import { sendMagicLink, sendPartyLink, sendBothAgreedNotification, sendPartyConfirmation, sendOtpCode, initEmailTransport } from './services/email.js';
import type { EmailJobData } from './services/emailQueue.js';
import { db, schema } from './db/index.js';
import { logError, logInfo } from './services/logger.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redisUrl = new URL(REDIS_URL);
const connection = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port || '6379', 10),
};

// Check for expired cases every 5 minutes
async function expireCases() {
  try {
    const now = new Date();
    const expiredTokens = await db.query.partyTokens.findMany({
      where: lt(schema.partyTokens.expiresAt, now),
    });

    const expiredCaseIds = new Set(expiredTokens.map((t) => t.caseId));

    for (const caseId of expiredCaseIds) {
      const caseRow = await db.query.cases.findFirst({
        where: and(
          eq(schema.cases.id, caseId),
          ne(schema.cases.status, 'both_agreed'),
          ne(schema.cases.status, 'expired'),
        ),
      });

      if (!caseRow) continue;

      // Check if ALL tokens for this case are expired
      const tokens = await db.query.partyTokens.findMany({
        where: eq(schema.partyTokens.caseId, caseId),
      });

      const allExpired = tokens.every((t) => t.expiresAt < now);
      if (allExpired) {
        await db.update(schema.cases)
          .set({ status: 'expired' })
          .where(eq(schema.cases.id, caseId));
        logInfo('expiry-check', `Case ${caseId} marked as expired`);
      }
    }
  } catch (error) {
    logError('expiry-check', error);
  }
}

async function start() {
  await initEmailTransport();

  const worker = new Worker<EmailJobData>(
    'email',
    async (job) => {
      const data = job.data;
      switch (data.type) {
        case 'magic-link':
          await sendMagicLink(data.to, data.token);
          break;
        case 'party-link':
          await sendPartyLink(data.to, data.token, data.arbitrationId);
          break;
        case 'both-agreed':
          await sendBothAgreedNotification(data.to, data.arbitrationId, data.internalName);
          break;
        case 'party-confirmation':
          await sendPartyConfirmation(data.to, data.arbitrationId, data.consent);
          break;
        case 'otp-code':
          await sendOtpCode(data.to, data.code);
          break;
      }
      logInfo('email-worker', `Sent ${data.type} email to ${data.to.substring(0, 3)}***`);
    },
    {
      connection,
      concurrency: 3,
    },
  );

  worker.on('failed', (job, err) => {
    logError('email-worker', err);
  });

  // Run expiry check on startup and every 5 minutes
  await expireCases();
  setInterval(expireCases, 5 * 60 * 1000);

  logInfo('email-worker', 'Email worker started (with case expiry checker)');
}

start().catch(console.error);
