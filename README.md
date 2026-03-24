# SettleSync

**Open-source mediation consent & case management portal for arbitration and mediation proceedings.**

SettleSync enables mediators, arbitrators, and legal professionals to securely collect party consent, manage case workflows, and generate settlement documentation — all through a privacy-first, self-hosted platform.

[![License: EUPL-1.2](https://img.shields.io/badge/License-EUPL--1.2-blue.svg)](https://joinup.ec.europa.eu/collection/eupl/eupl-text-eupl-12)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6.svg)](https://www.typescriptlang.org/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

---

## Why SettleSync?

Commercial mediation software is expensive, closed-source, and rarely designed for European legal frameworks. SettleSync fills that gap:

- **Free & open-source** — deploy on your own infrastructure, keep full control of sensitive case data
- **Privacy-first** — no PII in logs, no tracking, GDPR-compliant by design
- **EU/Polish law aligned** — built with Polish Civil Procedure Code (KPC) mediation provisions and EU Directive 2008/52/EC in mind
- **Multi-language** — Polish (default) and English, with easy i18n extension
- **Self-hosted** — Docker Compose deployment, no external dependencies

## Features

### Core (v1.0 — Current)
- ✅ **Arbiter authentication** — passwordless magic-link login
- ✅ **Case management** — create cases, add parties, track status
- ✅ **Party consent collection** — secure, time-limited token links sent via email
- ✅ **HMAC-signed tokens** — UUID v4 + SHA-256, 72h TTL, tamper-proof
- ✅ **Consent dashboard** — real-time status view per case
- ✅ **i18n** — Polish + English with shared translation keys
- ✅ **Rate limiting** — per-endpoint protection against abuse
- ✅ **Strict CSP** — Helmet.js with full security header suite

### New in v2.0
- 🆕 **Settlement agreement builder** — generate PDF agreements from templates
- 🆕 **Document upload** — parties can attach files (evidence, proposals)
- 🆕 **Case timeline / audit log** — immutable event log for each case
- 🆕 **Multi-arbiter support** — co-mediation with role-based access
- 🆕 **Email templates** — customizable HTML email templates (Handlebars)
- 🆕 **Webhook notifications** — POST events to external systems (Slack, CRM, etc.)
- 🆕 **Export** — CSV/JSON case data export for reporting
- 🆕 **Admin dashboard** — system health, usage stats, user management
- 🆕 **Plugin architecture** — extend with custom consent types, document generators
- 🆕 **OpenAPI spec** — full Swagger/OpenAPI 3.1 documentation
- 🆕 **E2E tests** — Playwright test suite for critical workflows
- 🆕 **CI/CD** — GitHub Actions pipeline with lint, test, build, deploy stages

### Planned (v3.0 Roadmap)
- 📋 Digital signature integration (qualified electronic signatures per eIDAS)
- 📋 Court filing format export (per Polish e-court system requirements)
- 📋 Video mediation session scheduling (Jitsi/BBB integration)
- 📋 Party-to-party secure messaging
- 📋 Settlement calculator / negotiation workspace
- 📋 Multi-tenancy for mediation centers

## Architecture

```
settlesync/
├── apps/
│   ├── backend/          # Express + Drizzle ORM + PostgreSQL
│   │   ├── src/
│   │   │   ├── routes/   # API route handlers
│   │   │   ├── middleware/# Auth, rate-limit, validation, audit
│   │   │   ├── services/ # Business logic layer
│   │   │   ├── db/       # Drizzle schema, migrations, seeds
│   │   │   ├── utils/    # Token signing, email, PDF generation
│   │   │   └── templates/# Email & document templates
│   │   └── tests/
│   └── frontend/         # React + Vite + Tailwind CSS
│       ├── src/
│       │   ├── components/# Reusable UI components
│       │   ├── pages/    # Route-level page components
│       │   ├── hooks/    # Custom React hooks
│       │   ├── i18n/     # Translation files
│       │   └── utils/    # Client-side helpers
│       └── tests/
├── packages/
│   └── shared/           # Zod schemas, TS types, i18n keys, constants
├── infra/                # Docker, nginx, env config
├── docs/                 # Architecture decisions, deployment guides
└── .github/              # CI/CD, issue templates, PR template
```

**Key design decisions:**
- **Monorepo** with npm workspaces — shared types prevent frontend/backend drift
- **Arbiter auth**: Magic-link (passwordless) — no passwords stored anywhere
- **Party tokens**: UUID v4 + HMAC-SHA256 — unpredictable, verifiable, time-limited
- **Anonymity**: No IP/user-agent storage for parties; audit logs contain no PII
- **Database**: SQLite (dev) / PostgreSQL (prod) via Drizzle ORM
- **i18n**: Polish (default) + English, extensible via JSON translation files

## Quick Start

### Prerequisites
- Node.js ≥ 20
- npm ≥ 10
- PostgreSQL 15+ (production) or SQLite (development)

### Development

```bash
# Clone the repository
git clone https://github.com/settlesync/settlesync.git
cd settlesync

# Install dependencies
npm install

# Copy environment config
cp apps/backend/.env.example apps/backend/.env

# Run database migrations
npm run db:migrate

# Seed test data
npm run db:seed

# Start dev servers (backend :3001 + frontend :5173)
npm run dev
```

**Test credentials:**
- Arbiter: `jan.kowalski@kancelaria.pl` (magic-link login — check console for Ethereal email link)

### Docker (Production)

```bash
cd infra
cp .env.example .env    # Edit secrets, SMTP config, domain
docker compose up --build -d
```

See [Deployment Guide](docs/DEPLOYMENT.md) for full production setup with nginx, TLS, and backups.

## API Reference

Full OpenAPI documentation available at `/api/docs` when running the server.

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| `POST` | `/api/auth/magic-link` | Public | Request magic-link email |
| `GET` | `/api/auth/verify` | Public | Verify magic-link, receive JWT |
| `GET` | `/api/auth/me` | JWT | Current user profile |
| `POST` | `/api/cases` | JWT | Create new case |
| `GET` | `/api/cases` | JWT | List arbiter's cases |
| `GET` | `/api/cases/:id` | JWT | Case detail with parties |
| `PATCH` | `/api/cases/:id` | JWT | Update case metadata |
| `POST` | `/api/cases/:id/parties` | JWT | Add party to case |
| `POST` | `/api/cases/:id/send-links` | JWT | Email consent links to parties |
| `GET` | `/api/cases/:id/timeline` | JWT | Case event timeline |
| `GET` | `/api/cases/:id/export` | JWT | Export case data (CSV/JSON) |
| `POST` | `/api/cases/:id/documents` | JWT | Upload document to case |
| `GET` | `/api/party/:token` | Token | Validate party token, get case info |
| `POST` | `/api/party/:token/respond` | Token | Submit consent response |
| `POST` | `/api/party/:token/upload` | Token | Party document upload |
| `GET` | `/api/admin/stats` | Admin | System statistics |
| `GET` | `/api/health` | Public | Health check |

## Security

SettleSync is designed for handling sensitive legal data:

- **Helmet.js** with strict CSP, HSTS, X-Frame-Options, X-Content-Type-Options
- **Rate limiting**: 5 req/min on party endpoints, 10 req/min on auth, 30 req/min general
- **HMAC-signed tokens** with configurable TTL (default 72h)
- **Zod validation** on all request inputs (body, params, query)
- **Drizzle ORM** with prepared statements (SQL injection protection)
- **No PII in logs** — party identifiers are hashed in audit trail
- **CORS** restricted to configured origins
- **File upload** validation — type, size, and content scanning
- **JWT rotation** — short-lived access tokens + refresh token flow
- **Audit log** — immutable append-only event log per case

See [SECURITY.md](SECURITY.md) for vulnerability reporting.

## Configuration

All configuration via environment variables. See [`.env.example`](apps/backend/.env.example) for full list.

| Variable | Description | Default |
|----------|-------------|---------|
| `DATABASE_URL` | PostgreSQL connection string | `sqlite://dev.db` |
| `JWT_SECRET` | JWT signing key (≥32 chars) | — |
| `HMAC_SECRET` | Token signing key (≥32 chars) | — |
| `SMTP_HOST` | Email server host | `localhost` |
| `SMTP_PORT` | Email server port | `587` |
| `SMTP_USER` | Email username | — |
| `SMTP_PASS` | Email password | — |
| `SMTP_FROM` | Sender email address | `noreply@settlesync.local` |
| `APP_URL` | Public-facing URL | `http://localhost:5173` |
| `TOKEN_TTL_HOURS` | Party token validity | `72` |
| `MAX_UPLOAD_MB` | Max file upload size | `10` |
| `WEBHOOK_URL` | Optional webhook endpoint | — |
| `LOG_LEVEL` | Logging verbosity | `info` |

## Legal Context

SettleSync is built with awareness of:

- **Polish Code of Civil Procedure** (KPC) — Articles 183¹–183¹⁵ on mediation
- **EU Directive 2008/52/EC** — mediation in civil and commercial matters
- **Polish Act of March 2026** — digitalization of court submissions (the new State Courts Information Online System)
- **eIDAS Regulation** — qualified electronic signatures (roadmap)
- **GDPR** — data minimization, right to erasure, processing records
- **Code of Ethics of Polish Mediators** — confidentiality and impartiality standards

> ⚠️ **Disclaimer**: SettleSync is a technical tool. It does not constitute legal advice. Consult qualified legal counsel for compliance with your jurisdiction's mediation and data protection requirements.

## Contributing

We welcome contributions! See [CONTRIBUTING.md](CONTRIBUTING.md) for:

- Development setup
- Code style and conventions
- How to submit issues and PRs
- Architecture decision records
- Translation guide

### Good First Issues

Look for issues tagged [`good first issue`](https://github.com/settlesync/settlesync/labels/good%20first%20issue) — these are scoped, well-documented tasks ideal for newcomers.

## Roadmap

See [ROADMAP.md](docs/ROADMAP.md) for the full feature roadmap and prioritization.

## License

SettleSync is licensed under the [European Union Public Licence (EUPL) v1.2](LICENSE) — a copyleft license specifically designed for EU public sector software, compatible with GPL, AGPL, and other open-source licenses.

## Acknowledgments

Built with the Polish mediation community in mind. Special thanks to the ADR practitioners who provided feedback on consent workflows and compliance requirements.

---

**Questions?** Open a [Discussion](https://github.com/settlesync/settlesync/discussions) or reach out via issues.
