import { Queue } from 'bullmq';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

const redisUrl = new URL(REDIS_URL);
const connection = {
  host: redisUrl.hostname,
  port: parseInt(redisUrl.port || '6379', 10),
};

export const emailQueue = new Queue('email', {
  connection,
  defaultJobOptions: {
    attempts: 5,
    backoff: { type: 'exponential', delay: 5000 },
    removeOnComplete: { count: 100 },
    removeOnFail: { count: 500 },
  },
});

export interface MagicLinkJobData {
  type: 'magic-link';
  to: string;
  token: string;
}

export interface PartyLinkJobData {
  type: 'party-link';
  to: string;
  token: string;
  arbitrationId: string;
}

export interface BothAgreedJobData {
  type: 'both-agreed';
  to: string;
  arbitrationId: string;
  internalName: string;
}

export interface PartyConfirmationJobData {
  type: 'party-confirmation';
  to: string;
  arbitrationId: string;
  consent: string;
}

export interface OtpCodeJobData {
  type: 'otp-code';
  to: string;
  code: string;
}

export type EmailJobData = MagicLinkJobData | PartyLinkJobData | BothAgreedJobData | PartyConfirmationJobData | OtpCodeJobData;

export async function enqueueEmail(data: EmailJobData) {
  await emailQueue.add(data.type, data);
}
