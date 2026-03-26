import { Worker } from 'bullmq';
import { sendMagicLink, sendPartyLink, sendBothAgreedNotification, sendPartyConfirmation, initEmailTransport } from './services/email.js';
import type { EmailJobData } from './services/emailQueue.js';
import { logError, logInfo } from './services/logger.js';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
const redisUrl = new URL(REDIS_URL);
const connection = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port || '6379', 10),
};

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

  logInfo('email-worker', 'Email worker started');
}

start().catch(console.error);
