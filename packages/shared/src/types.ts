import type { CaseStatus, ConsentOption, TimeHorizon, PartyLabel } from './constants.js';

export interface ArbiterProfile {
  id: number;
  email: string;
}

export interface CaseSummary {
  id: number;
  internalName: string;
  arbitrationId: string;
  status: CaseStatus;
  createdAt: string;
}

export interface CaseDetail extends CaseSummary {
  description: string | null;
  tokenTtlHours: number;
  parties: {
    party: PartyLabel;
    emailSent: boolean;
    hasResponded: boolean;
    consent: ConsentOption | null;
    timeHorizon: TimeHorizon | null;
    note: string | null;
    respondedAt: string | null;
  }[];
}

export interface PartyView {
  caseArbitrationId: string;
  party: PartyLabel;
  alreadyResponded: boolean;
  expired: boolean;
  previousResponse?: {
    consent: ConsentOption;
    timeHorizon: TimeHorizon | null;
    note: string | null;
  };
}

export interface ApiError {
  error: string;
  details?: unknown;
}
