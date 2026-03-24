# ADR-001: EUPL License Choice

## Status
Accepted

## Context
SettleSync is open-source software designed for EU legal professionals. We needed a license that:
- Is recognized and endorsed by EU institutions
- Provides copyleft protection (derivative works must remain open)
- Is compatible with other major open-source licenses (GPL, AGPL, MPL)
- Is available in all EU official languages
- Signals alignment with EU public sector values

## Decision
We chose the **European Union Public Licence (EUPL) v1.2**.

## Consequences
- Positive: Strong signal to EU public sector adopters
- Positive: Compatible with GPL v2/v3, AGPL, LGPL, MPL, CECILL
- Positive: Available in 23 EU languages — critical for adoption in legal communities
- Negative: Less well-known than MIT/Apache in the broader developer community
- Neutral: Copyleft requirement may deter some commercial integrators (by design)

---

# ADR-002: Passwordless Authentication for Arbiters

## Status
Accepted

## Context
Mediators need to authenticate to manage cases. Options considered:
1. Email + password
2. Magic link (passwordless)
3. OAuth/OIDC (Google, Microsoft)
4. Client certificates

## Decision
**Magic link** (passwordless email-based authentication).

## Rationale
- No password storage = smaller attack surface
- Legal professionals often manage many credentials; one fewer password helps
- Email delivery is already required for the consent workflow, so SMTP is guaranteed
- Simpler implementation, fewer dependencies
- OAuth providers raise data sovereignty concerns (Google/Microsoft processing login data)

## Consequences
- Positive: Zero password storage, no bcrypt/argon2 needed
- Positive: Consistent with the consent link UX (parties also receive email links)
- Negative: Depends on email delivery reliability
- Negative: Login is slightly slower (wait for email)
- Mitigation: Short-lived magic links (15 min) + refresh tokens for session persistence

---

# ADR-003: HMAC-Signed Party Tokens

## Status
Accepted

## Context
Parties (non-authenticated users) access the consent form via a link containing a token. This token must be:
- Unpredictable (not guessable/enumerable)
- Verifiable (detect tampering)
- Time-limited (expire after deadline)
- Privacy-preserving (not trackable across cases)

## Decision
**UUID v4 + HMAC-SHA256 signature**, stored separately in the database.

## Rationale
- UUID v4 provides 122 bits of randomness — not guessable
- HMAC signature allows server-side verification without exposing the signing key
- Storing token and signature separately means a database breach alone doesn't allow token forging
- Time-limiting is enforced via `token_expires_at` timestamp
- Timing-safe comparison prevents timing attacks on signature verification

## Consequences
- Positive: Strong security without requiring party accounts
- Positive: Each token is single-use per case, preventing replay
- Negative: Tokens are one-way — if a party loses their link, the arbiter must resend
- Neutral: 72h default TTL balances convenience with security

---

# ADR-004: No PII in Application Logs

## Status
Accepted

## Context
SettleSync handles sensitive legal data: party names, email addresses, case details. Application logs are often stored in centralized systems (ELK, CloudWatch) with different access controls than the database.

## Decision
**Zero PII in application logs.** All identifiers in logs are hashed. Request bodies are not logged. Email addresses are redacted from HTTP request logs.

## Rationale
- GDPR data minimization principle (Art. 5(1)(c))
- Mediation confidentiality obligations (KPC Art. 183⁴)
- Reduces blast radius of log aggregator breaches
- Audit trail uses hashed actor IDs — sufficient for debugging without exposing identity

## Consequences
- Positive: GDPR-compliant logging out of the box
- Positive: Safe to ship logs to external monitoring services
- Negative: Debugging specific user issues requires database lookup (can't grep logs for email)
- Mitigation: Audit trail links events to hashed IDs; admin can correlate when needed

---

# ADR-005: Monorepo with npm Workspaces

## Status
Accepted

## Context
The project has three main codebases: backend, frontend, and shared types/schemas. Options:
1. Monorepo (single repository, multiple packages)
2. Multi-repo (separate repositories)
3. Single package (everything together)

## Decision
**Monorepo with npm workspaces** and a shared package for types and schemas.

## Rationale
- Shared Zod schemas prevent frontend/backend type drift
- Single CI/CD pipeline for the entire project
- Easier for contributors to understand the full system
- Atomic commits across frontend + backend + shared
- npm workspaces handle cross-package dependencies natively

## Consequences
- Positive: Type safety across the stack via shared package
- Positive: Single `npm install` sets up everything
- Positive: Easier PR reviews (see full impact of changes)
- Negative: Larger repository size
- Negative: CI runs all checks even for frontend-only changes (mitigated with path filters)
