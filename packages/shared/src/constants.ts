export const TOKEN_TTL_HOURS = 72;
export const MAGIC_LINK_TTL_MINUTES = 15;
export const MAX_NOTE_LENGTH = 280;
export const RATE_LIMIT_PARTY = { windowMs: 60_000, max: 5 };
export const RATE_LIMIT_AUTH = { windowMs: 60_000, max: 10 };

export const TIME_HORIZONS = [
  'under_2_weeks',
  'two_to_four_weeks',
  'one_to_two_months',
  'over_2_months',
] as const;

export type TimeHorizon = (typeof TIME_HORIZONS)[number];

export const CONSENT_OPTIONS = ['yes', 'no', 'later'] as const;
export type ConsentOption = (typeof CONSENT_OPTIONS)[number];

export const CASE_STATUSES = ['pending', 'one_agreed', 'both_agreed', 'declined', 'expired'] as const;
export type CaseStatus = (typeof CASE_STATUSES)[number];

export const PARTY_LABELS = ['A', 'B'] as const;
export type PartyLabel = (typeof PARTY_LABELS)[number];
