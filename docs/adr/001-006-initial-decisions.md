# ADR-001: EUPL License Choice

## Status
Accepted

## Context
SettleSync is an open-source tool targeting European legal professionals. We needed a license that encourages adoption by public institutions and law firms while protecting against proprietary forks that don't contribute back.

## Decision
We chose the European Union Public Licence (EUPL) v1.2 because it is legally validated in all 23 EU languages and all EU member state courts, explicitly compatible with GPL, AGPL, MPL, and other copyleft licenses, designed for public sector and legal technology contexts, and the only open-source license drafted by an EU institution.

## Consequences
Copyleft requirement means modifications must be shared under compatible terms. Some companies may prefer permissive licenses (MIT/Apache), but EUPL better protects the mediation community's investment.

---

# ADR-002: Passwordless Authentication

## Status
Accepted

## Context
Mediators need secure access but may not be technically sophisticated. Password management adds friction and security risk.

## Decision
Magic-link (passwordless) authentication via email. No passwords stored anywhere.

## Consequences
Depends on reliable email delivery. 15-minute token TTL balances security with usability. Refresh tokens provide session continuity without re-authentication.

---

# ADR-003: HMAC-Signed Party Tokens

## Status
Accepted

## Context
Party consent links must be secure (unpredictable, tamper-proof, time-limited) while remaining simple for non-technical users to use.

## Decision
UUID v4 tokens signed with HMAC-SHA256. The token is random (unpredictable), the signature proves authenticity, and a TTL prevents indefinite exposure.

## Consequences
Tokens are single-use for consent submission. If a party needs a new link, the arbiter must resend. This is intentional — it provides an audit trail of all consent link distributions.

---

# ADR-004: PII-Free Logging

## Status
Accepted

## Context
Mediation proceedings are legally confidential (art. 183⁴ KPC, EU Directive 2008/52/EC). Application logs must not compromise this confidentiality.

## Decision
No personally identifiable information in any log output. Actor IDs in audit trails are SHA-256 hashed. Request bodies are never logged. Pino logger with explicit redaction rules.

## Consequences
Debugging production issues is harder without PII. We mitigate this with structured error codes and correlation IDs that don't contain personal data.

---

# ADR-005: Monorepo with Shared Package

## Status
Accepted

## Context
Frontend and backend need to share validation schemas, TypeScript types, error codes, and constants. Drift between frontend and backend contracts causes bugs.

## Decision
npm workspaces monorepo with a `packages/shared` package containing Zod schemas, TypeScript interfaces, and constants. Both apps import from `@settlesync/shared`.

## Consequences
Single `npm install` for the whole project. Shared types ensure API contracts are enforced at compile time. Trade-off: slightly more complex build configuration than separate repos.

---

# ADR-006: PostgreSQL for Production, SQLite for Development

## Status
Accepted

## Context
Legal data needs reliable, well-understood database technology. Development setup should be zero-config.

## Decision
Drizzle ORM with dialect switching: SQLite for local development (no setup), PostgreSQL for production (battle-tested, backed up, supports concurrent access).

## Consequences
Drizzle's dialect abstraction handles most differences. Some PostgreSQL-specific features (pg_dump, extensions) need to be tested separately from dev environment.
