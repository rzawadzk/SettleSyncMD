# SettleSync

Secure mediation consent portal for arbitration proceedings.

## Architecture

**Monorepo** (npm workspaces):
- `apps/backend` — Express + Drizzle ORM + SQLite (dev) / PostgreSQL (prod)
- `apps/frontend` — React + Vite + Tailwind CSS (dark theme)
- `packages/shared` — Zod schemas, TypeScript types, i18n translations (PL/EN)
- `infra` — Docker, nginx, environment config

**Key design decisions:**
- **Arbiter auth**: Magic link (passwordless) — no passwords stored
- **Party tokens**: UUID v4 + HMAC-SHA256 signature — unpredictable, verifiable
- **Anonymity**: No IP/user-agent storage for parties; logs contain no PII
- **i18n**: Polish (default) + English

## Quick Start

```bash
# Install dependencies
npm install

# Run database migration
npm run db:migrate

# Seed test data
npm run db:seed

# Start dev servers (backend :3001 + frontend :5173)
npm run dev
```

Test arbiter: `jan.kowalski@kancelaria.pl` (use magic link login — check Ethereal email in console logs)

## Docker

```bash
cd infra
cp .env.example .env  # edit secrets
docker-compose up --build
```

## API Endpoints

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/auth/magic-link` | Public | Request magic link |
| GET | `/api/auth/verify` | Public | Verify magic link, get JWT |
| POST | `/api/cases` | JWT | Create case |
| GET | `/api/cases` | JWT | List cases |
| GET | `/api/cases/:id` | JWT | Case detail |
| POST | `/api/cases/:id/send-links` | JWT | Email party links |
| GET | `/api/party/:token` | Token | Validate party token |
| POST | `/api/party/:token/respond` | Token | Submit consent |

## Security

- Helmet.js with strict CSP, HSTS, X-Frame-Options
- Rate limiting: 5 req/min on party endpoints, 10 req/min on auth
- HMAC-signed tokens with 72h TTL
- Zod validation on all inputs
- Drizzle ORM (prepared statements only)
- No PII in logs
