import { z } from 'zod';

// ============================================================
// ENUMS & CONSTANTS
// ============================================================

export const SUPPORTED_LOCALES = ['pl', 'en'] as const;
export type Locale = (typeof SUPPORTED_LOCALES)[number];
export const DEFAULT_LOCALE: Locale = 'pl';

export const CaseStatus = {
  DRAFT: 'draft',
  PENDING_CONSENT: 'pending_consent',
  CONSENT_COMPLETE: 'consent_complete',
  MEDIATION_ACTIVE: 'mediation_active',
  SETTLED: 'settled',
  FAILED: 'failed',
  ARCHIVED: 'archived',
} as const;

export type CaseStatusType = (typeof CaseStatus)[keyof typeof CaseStatus];

export const PartyRole = {
  CLAIMANT: 'claimant',
  RESPONDENT: 'respondent',
  THIRD_PARTY: 'third_party',
} as const;

export type PartyRoleType = (typeof PartyRole)[keyof typeof PartyRole];

export const ConsentStatus = {
  PENDING: 'pending',
  ACCEPTED: 'accepted',
  REJECTED: 'rejected',
  EXPIRED: 'expired',
  WITHDRAWN: 'withdrawn',
} as const;

export type ConsentStatusType = (typeof ConsentStatus)[keyof typeof ConsentStatus];

export const ArbiterRole = {
  LEAD: 'lead',
  CO_MEDIATOR: 'co_mediator',
  OBSERVER: 'observer',
} as const;

export type ArbiterRoleType = (typeof ArbiterRole)[keyof typeof ArbiterRole];

export const EventType = {
  CASE_CREATED: 'case_created',
  PARTY_ADDED: 'party_added',
  LINKS_SENT: 'links_sent',
  CONSENT_GIVEN: 'consent_given',
  CONSENT_REFUSED: 'consent_refused',
  CONSENT_EXPIRED: 'consent_expired',
  DOCUMENT_UPLOADED: 'document_uploaded',
  STATUS_CHANGED: 'status_changed',
  SETTLEMENT_DRAFTED: 'settlement_drafted',
  SETTLEMENT_SIGNED: 'settlement_signed',
  CASE_ARCHIVED: 'case_archived',
  NOTE_ADDED: 'note_added',
  ARBITER_ADDED: 'arbiter_added',
  WEBHOOK_FIRED: 'webhook_fired',
} as const;

export type EventTypeType = (typeof EventType)[keyof typeof EventType];

export const DocumentType = {
  EVIDENCE: 'evidence',
  PROPOSAL: 'proposal',
  AGREEMENT: 'agreement',
  CORRESPONDENCE: 'correspondence',
  OTHER: 'other',
} as const;

// ============================================================
// ZOD SCHEMAS — INPUT VALIDATION
// ============================================================

// --- Auth ---
export const MagicLinkRequestSchema = z.object({
  email: z.string().email().max(255),
  locale: z.enum(SUPPORTED_LOCALES).default(DEFAULT_LOCALE),
});

export const MagicLinkVerifySchema = z.object({
  token: z.string().uuid(),
});

// --- Cases ---
export const CreateCaseSchema = z.object({
  title: z.string().min(3).max(500),
  description: z.string().max(5000).optional(),
  caseReference: z.string().max(100).optional(),
  caseType: z.enum(['civil', 'commercial', 'family', 'labor', 'other']).default('civil'),
  locale: z.enum(SUPPORTED_LOCALES).default(DEFAULT_LOCALE),
  consentDeadlineHours: z.number().int().min(1).max(720).default(72),
  metadata: z.record(z.string()).optional(),
});

export const UpdateCaseSchema = z.object({
  title: z.string().min(3).max(500).optional(),
  description: z.string().max(5000).optional(),
  status: z.nativeEnum(
    Object.fromEntries(Object.entries(CaseStatus)) as Record<string, string>
  ).optional(),
  metadata: z.record(z.string()).optional(),
});

export const CaseFilterSchema = z.object({
  status: z.string().optional(),
  search: z.string().max(200).optional(),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['created_at', 'updated_at', 'title']).default('created_at'),
  order: z.enum(['asc', 'desc']).default('desc'),
});

// --- Parties ---
export const AddPartySchema = z.object({
  email: z.string().email().max(255),
  name: z.string().min(1).max(255),
  role: z.enum([PartyRole.CLAIMANT, PartyRole.RESPONDENT, PartyRole.THIRD_PARTY]),
  organization: z.string().max(255).optional(),
  locale: z.enum(SUPPORTED_LOCALES).default(DEFAULT_LOCALE),
});

export const ConsentResponseSchema = z.object({
  consent: z.enum(['accepted', 'rejected']),
  message: z.string().max(2000).optional(),
  locale: z.enum(SUPPORTED_LOCALES).default(DEFAULT_LOCALE),
});

// --- Documents ---
export const DocumentUploadSchema = z.object({
  type: z.enum([
    DocumentType.EVIDENCE,
    DocumentType.PROPOSAL,
    DocumentType.AGREEMENT,
    DocumentType.CORRESPONDENCE,
    DocumentType.OTHER,
  ]),
  description: z.string().max(1000).optional(),
});

// --- Settlement ---
export const SettlementDraftSchema = z.object({
  templateId: z.string().optional(),
  title: z.string().min(3).max(500),
  body: z.string().min(10).max(50000),
  clauses: z.array(z.object({
    id: z.string(),
    title: z.string(),
    body: z.string(),
    optional: z.boolean().default(false),
  })).optional(),
});

// --- Webhook ---
export const WebhookConfigSchema = z.object({
  url: z.string().url(),
  secret: z.string().min(16).max(128),
  events: z.array(z.string()).min(1),
  active: z.boolean().default(true),
});

// --- Admin ---
export const AdminStatsQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
});

// ============================================================
// RESPONSE TYPES (TypeScript interfaces)
// ============================================================

export interface CaseResponse {
  id: string;
  title: string;
  description?: string;
  caseReference?: string;
  caseType: string;
  status: CaseStatusType;
  locale: Locale;
  consentDeadlineHours: number;
  parties: PartyResponse[];
  arbiters: ArbiterResponse[];
  createdAt: string;
  updatedAt: string;
  metadata?: Record<string, string>;
}

export interface PartyResponse {
  id: string;
  name: string;
  email: string;
  role: PartyRoleType;
  organization?: string;
  consentStatus: ConsentStatusType;
  consentAt?: string;
  consentMessage?: string;
  tokenExpiresAt: string;
  locale: Locale;
}

export interface ArbiterResponse {
  id: string;
  email: string;
  name?: string;
  role: ArbiterRoleType;
}

export interface TimelineEvent {
  id: string;
  caseId: string;
  type: EventTypeType;
  actorType: 'arbiter' | 'party' | 'system';
  actorId?: string;
  description: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
}

export interface DocumentResponse {
  id: string;
  caseId: string;
  filename: string;
  type: string;
  description?: string;
  sizeBytes: number;
  mimeType: string;
  uploadedBy: string;
  uploadedAt: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'down';
  version: string;
  uptime: number;
  database: 'connected' | 'disconnected';
  timestamp: string;
}

export interface AdminStats {
  totalCases: number;
  activeCases: number;
  totalParties: number;
  consentRate: number;
  avgResolutionDays: number;
  casesByStatus: Record<string, number>;
  casesByType: Record<string, number>;
  recentActivity: TimelineEvent[];
}

// ============================================================
// ERROR CODES
// ============================================================

export const ErrorCode = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  UNAUTHORIZED: 'UNAUTHORIZED',
  FORBIDDEN: 'FORBIDDEN',
  NOT_FOUND: 'NOT_FOUND',
  TOKEN_EXPIRED: 'TOKEN_EXPIRED',
  TOKEN_INVALID: 'TOKEN_INVALID',
  RATE_LIMITED: 'RATE_LIMITED',
  CONSENT_ALREADY_GIVEN: 'CONSENT_ALREADY_GIVEN',
  CASE_NOT_ACTIVE: 'CASE_NOT_ACTIVE',
  FILE_TOO_LARGE: 'FILE_TOO_LARGE',
  UNSUPPORTED_FILE_TYPE: 'UNSUPPORTED_FILE_TYPE',
  INTERNAL_ERROR: 'INTERNAL_ERROR',
  EMAIL_SEND_FAILED: 'EMAIL_SEND_FAILED',
  WEBHOOK_FAILED: 'WEBHOOK_FAILED',
} as const;

export interface ErrorResponse {
  error: string;
  code: keyof typeof ErrorCode;
  details?: unknown;
}
