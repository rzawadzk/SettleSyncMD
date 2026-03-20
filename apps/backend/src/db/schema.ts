import { pgTable, serial, text, integer, boolean, timestamp, index, unique } from 'drizzle-orm/pg-core';

export const arbiters = pgTable('arbiters', {
  id: serial('id').primaryKey(),
  email: text('email').notNull().unique(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const magicLinks = pgTable('magic_links', {
  id: serial('id').primaryKey(),
  arbiterId: integer('arbiter_id').notNull().references(() => arbiters.id),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  usedAt: timestamp('used_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_magic_links_token').on(table.token),
]);

export const cases = pgTable('cases', {
  id: serial('id').primaryKey(),
  arbiterId: integer('arbiter_id').notNull().references(() => arbiters.id),
  internalName: text('internal_name').notNull(),
  arbitrationId: text('arbitration_id').notNull(),
  description: text('description'),
  status: text('status', { enum: ['pending', 'one_agreed', 'both_agreed', 'expired'] }).notNull().default('pending'),
  tokenTtlHours: integer('token_ttl_hours').notNull().default(72),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_cases_arbiter').on(table.arbiterId),
]);

export const partyTokens = pgTable('party_tokens', {
  id: serial('id').primaryKey(),
  caseId: integer('case_id').notNull().references(() => cases.id),
  party: text('party', { enum: ['A', 'B'] }).notNull(),
  token: text('token').notNull().unique(),
  emailSent: boolean('email_sent').notNull().default(false),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
}, (table) => [
  index('idx_party_tokens_token').on(table.token),
]);

export const responses = pgTable('responses', {
  id: serial('id').primaryKey(),
  partyTokenId: integer('party_token_id').notNull().references(() => partyTokens.id),
  consent: text('consent', { enum: ['yes', 'no', 'later'] }).notNull(),
  timeHorizon: text('time_horizon', {
    enum: ['under_2_weeks', 'two_to_four_weeks', 'one_to_two_months', 'over_2_months'],
  }),
  note: text('note'),
  respondedAt: timestamp('responded_at', { withTimezone: true }).notNull(),
}, (table) => [
  unique('responses_party_token_id_unique').on(table.partyTokenId),
]);
