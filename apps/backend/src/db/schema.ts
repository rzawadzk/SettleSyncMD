import { pgTable, text, timestamp, uuid, integer, boolean, jsonb, pgEnum } from 'drizzle-orm/pg-core';

// ============================================================
// ENUMS
// ============================================================

export const caseStatusEnum = pgEnum('case_status', [
  'draft', 'pending_consent', 'consent_complete',
  'mediation_active', 'settled', 'failed', 'archived',
]);

export const partyRoleEnum = pgEnum('party_role', [
  'claimant', 'respondent', 'third_party',
]);

export const consentStatusEnum = pgEnum('consent_status', [
  'pending', 'accepted', 'rejected', 'expired', 'withdrawn',
]);

export const arbiterRoleEnum = pgEnum('arbiter_role', [
  'lead', 'co_mediator', 'observer',
]);

export const eventTypeEnum = pgEnum('event_type', [
  'case_created', 'party_added', 'links_sent',
  'consent_given', 'consent_refused', 'consent_expired',
  'document_uploaded', 'status_changed',
  'settlement_drafted', 'settlement_signed',
  'case_archived', 'note_added', 'arbiter_added', 'webhook_fired',
]);

export const documentTypeEnum = pgEnum('document_type', [
  'evidence', 'proposal', 'agreement', 'correspondence', 'other',
]);

// ============================================================
// TABLES
// ============================================================

export const arbiters = pgTable('arbiters', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull().unique(),
  name: text('name'),
  organization: text('organization'),
  isAdmin: boolean('is_admin').default(false),
  locale: text('locale').default('pl'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  lastLoginAt: timestamp('last_login_at'),
});

export const magicLinks = pgTable('magic_links', {
  id: uuid('id').primaryKey().defaultRandom(),
  arbiterId: uuid('arbiter_id').notNull().references(() => arbiters.id),
  token: uuid('token').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  usedAt: timestamp('used_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const refreshTokens = pgTable('refresh_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  arbiterId: uuid('arbiter_id').notNull().references(() => arbiters.id),
  tokenHash: text('token_hash').notNull().unique(),
  expiresAt: timestamp('expires_at').notNull(),
  revokedAt: timestamp('revoked_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const cases = pgTable('cases', {
  id: uuid('id').primaryKey().defaultRandom(),
  title: text('title').notNull(),
  description: text('description'),
  caseReference: text('case_reference'),
  caseType: text('case_type').notNull().default('civil'),
  status: caseStatusEnum('status').notNull().default('draft'),
  locale: text('locale').default('pl'),
  consentDeadlineHours: integer('consent_deadline_hours').default(72),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  settledAt: timestamp('settled_at'),
  archivedAt: timestamp('archived_at'),
});

export const caseArbiters = pgTable('case_arbiters', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  arbiterId: uuid('arbiter_id').notNull().references(() => arbiters.id),
  role: arbiterRoleEnum('role').notNull().default('lead'),
  addedAt: timestamp('added_at').defaultNow().notNull(),
});

export const parties = pgTable('parties', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  name: text('name').notNull(),
  email: text('email').notNull(),
  role: partyRoleEnum('role').notNull(),
  organization: text('organization'),
  locale: text('locale').default('pl'),
  token: text('token').notNull().unique(),
  tokenSignature: text('token_signature').notNull(),
  tokenExpiresAt: timestamp('token_expires_at').notNull(),
  consentStatus: consentStatusEnum('consent_status').notNull().default('pending'),
  consentAt: timestamp('consent_at'),
  consentMessage: text('consent_message'),
  linkSentAt: timestamp('link_sent_at'),
  reminderSentAt: timestamp('reminder_sent_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const documents = pgTable('documents', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  filename: text('filename').notNull(),
  originalName: text('original_name').notNull(),
  mimeType: text('mime_type').notNull(),
  sizeBytes: integer('size_bytes').notNull(),
  type: documentTypeEnum('type').notNull().default('other'),
  description: text('description'),
  storagePath: text('storage_path').notNull(),
  uploadedByType: text('uploaded_by_type').notNull(), // 'arbiter' | 'party'
  uploadedById: uuid('uploaded_by_id').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const settlements = pgTable('settlements', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  title: text('title').notNull(),
  body: text('body').notNull(),
  clauses: jsonb('clauses'),
  templateId: text('template_id'),
  version: integer('version').notNull().default(1),
  pdfPath: text('pdf_path'),
  createdById: uuid('created_by_id').notNull().references(() => arbiters.id),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const settlementSignatures = pgTable('settlement_signatures', {
  id: uuid('id').primaryKey().defaultRandom(),
  settlementId: uuid('settlement_id').notNull().references(() => settlements.id),
  partyId: uuid('party_id').notNull().references(() => parties.id),
  signedAt: timestamp('signed_at'),
  signatureData: text('signature_data'), // base64 signature image or eIDAS ref
  ipHash: text('ip_hash'), // hashed, not raw IP
});

export const caseTimeline = pgTable('case_timeline', {
  id: uuid('id').primaryKey().defaultRandom(),
  caseId: uuid('case_id').notNull().references(() => cases.id, { onDelete: 'cascade' }),
  type: eventTypeEnum('type').notNull(),
  actorType: text('actor_type').notNull(), // 'arbiter' | 'party' | 'system'
  actorIdHash: text('actor_id_hash'), // hashed for privacy
  description: text('description').notNull(),
  metadata: jsonb('metadata'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export const webhookConfigs = pgTable('webhook_configs', {
  id: uuid('id').primaryKey().defaultRandom(),
  arbiterId: uuid('arbiter_id').notNull().references(() => arbiters.id),
  url: text('url').notNull(),
  secretHash: text('secret_hash').notNull(),
  events: jsonb('events').notNull(), // string[]
  active: boolean('active').default(true),
  lastFiredAt: timestamp('last_fired_at'),
  failCount: integer('fail_count').default(0),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
});

export const webhookDeliveries = pgTable('webhook_deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  webhookId: uuid('webhook_id').notNull().references(() => webhookConfigs.id),
  eventType: text('event_type').notNull(),
  payload: jsonb('payload').notNull(),
  responseStatus: integer('response_status'),
  responseBody: text('response_body'),
  deliveredAt: timestamp('delivered_at'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
});
