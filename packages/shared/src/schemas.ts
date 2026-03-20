import { z } from 'zod';
import { CONSENT_OPTIONS, TIME_HORIZONS, MAX_NOTE_LENGTH } from './constants.js';

// Auth
export const magicLinkRequestSchema = z.object({
  email: z.string().email().max(255),
});

export const magicLinkVerifySchema = z.object({
  token: z.string().min(1).max(512),
});

// Cases
export const createCaseSchema = z.object({
  internalName: z.string().min(1).max(200).trim(),
  arbitrationId: z.string().min(1).max(100).trim(),
  description: z.string().max(1000).trim().optional(),
  tokenTtlHours: z.number().int().min(1).max(720).optional(),
});

export const sendLinksSchema = z.object({
  partyAEmail: z.string().email().max(255),
  partyBEmail: z.string().email().max(255),
});

// Party response
export const partyResponseSchema = z.object({
  consent: z.enum(CONSENT_OPTIONS),
  timeHorizon: z.enum(TIME_HORIZONS).optional(),
  note: z.string().max(MAX_NOTE_LENGTH).trim().optional(),
}).refine(
  (data) => {
    if (data.consent === 'yes' && !data.timeHorizon) return false;
    return true;
  },
  { message: 'Time horizon is required when consent is yes', path: ['timeHorizon'] }
);

// Type exports
export type MagicLinkRequest = z.infer<typeof magicLinkRequestSchema>;
export type MagicLinkVerify = z.infer<typeof magicLinkVerifySchema>;
export type CreateCase = z.infer<typeof createCaseSchema>;
export type SendLinks = z.infer<typeof sendLinksSchema>;
export type PartyResponse = z.infer<typeof partyResponseSchema>;
