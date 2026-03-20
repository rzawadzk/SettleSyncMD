import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';

export const arbiters = sqliteTable('arbiters', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  email: text('email').notNull().unique(),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
});

export const magicLinks = sqliteTable('magic_links', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  arbiterId: integer('arbiter_id').notNull().references(() => arbiters.id),
  token: text('token').notNull().unique(),
  expiresAt: text('expires_at').notNull(),
  usedAt: text('used_at'),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
});

export const cases = sqliteTable('cases', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  arbiterId: integer('arbiter_id').notNull().references(() => arbiters.id),
  internalName: text('internal_name').notNull(),
  arbitrationId: text('arbitration_id').notNull(),
  description: text('description'),
  status: text('status', { enum: ['pending', 'one_agreed', 'both_agreed', 'expired'] }).notNull().default('pending'),
  tokenTtlHours: integer('token_ttl_hours').notNull().default(72),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
});

export const partyTokens = sqliteTable('party_tokens', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  caseId: integer('case_id').notNull().references(() => cases.id),
  party: text('party', { enum: ['A', 'B'] }).notNull(),
  token: text('token').notNull().unique(),
  emailSent: integer('email_sent', { mode: 'boolean' }).notNull().default(false),
  expiresAt: text('expires_at').notNull(),
  createdAt: text('created_at').notNull().default(new Date().toISOString()),
});

export const responses = sqliteTable('responses', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  partyTokenId: integer('party_token_id').notNull().references(() => partyTokens.id).unique(),
  consent: text('consent', { enum: ['yes', 'no', 'later'] }).notNull(),
  timeHorizon: text('time_horizon', {
    enum: ['under_2_weeks', 'two_to_four_weeks', 'one_to_two_months', 'over_2_months'],
  }),
  note: text('note'),
  respondedAt: text('responded_at').notNull(),
});
