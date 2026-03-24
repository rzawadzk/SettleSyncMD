# Contributing to SettleSync

Thank you for your interest in contributing to SettleSync! This project aims to make mediation technology accessible to legal professionals across Europe and beyond.

## Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Getting Started](#getting-started)
- [Development Setup](#development-setup)
- [Project Structure](#project-structure)
- [Making Changes](#making-changes)
- [Coding Standards](#coding-standards)
- [Translations](#translations)
- [Testing](#testing)
- [Submitting Changes](#submitting-changes)
- [Architecture Decisions](#architecture-decisions)

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](CODE_OF_CONDUCT.md). By participating, you agree to uphold a welcoming, inclusive environment.

## Getting Started

1. **Fork** the repository on GitHub
2. **Clone** your fork locally
3. **Create a branch** from `main` for your changes
4. **Make changes** following our coding standards
5. **Test** your changes thoroughly
6. **Submit a PR** with a clear description

## Development Setup

### Prerequisites

- Node.js ≥ 20 (we recommend [fnm](https://github.com/Schniz/fnm) or [nvm](https://github.com/nvm-sh/nvm))
- npm ≥ 10
- Git
- Docker (optional, for production-like testing)

### Install & Run

```bash
git clone https://github.com/<your-username>/settlesync.git
cd settlesync
npm install
cp apps/backend/.env.example apps/backend/.env
npm run db:migrate
npm run db:seed
npm run dev
```

This starts:
- Backend API at `http://localhost:3001`
- Frontend dev server at `http://localhost:5173`

### Useful Commands

| Command | Description |
|---------|-------------|
| `npm run dev` | Start both frontend + backend in dev mode |
| `npm run build` | Build all packages for production |
| `npm run test` | Run unit tests |
| `npm run test:e2e` | Run Playwright E2E tests |
| `npm run lint` | ESLint + Prettier check |
| `npm run lint:fix` | Auto-fix lint issues |
| `npm run typecheck` | TypeScript type checking |
| `npm run db:migrate` | Run database migrations |
| `npm run db:seed` | Seed test data |
| `npm run db:studio` | Open Drizzle Studio (DB browser) |

## Project Structure

```
settlesync/
├── apps/backend/       → Express API server
│   ├── src/routes/     → API route handlers (one file per resource)
│   ├── src/middleware/  → Auth, validation, rate-limiting, audit
│   ├── src/services/   → Business logic (case, party, email, PDF)
│   ├── src/db/         → Drizzle schema + migrations
│   └── src/utils/      → Helpers (token signing, email transport)
├── apps/frontend/      → React SPA
│   ├── src/components/ → Reusable UI components
│   ├── src/pages/      → Route-level components
│   ├── src/hooks/      → Custom React hooks
│   └── src/i18n/       → Translation JSON files
├── packages/shared/    → Shared Zod schemas, types, constants
├── infra/              → Docker, nginx config
└── docs/               → ADRs, guides, specs
```

### Key Conventions

- **Routes** handle HTTP concerns only (parse request, call service, format response)
- **Services** contain business logic and are framework-agnostic
- **Shared package** is the single source of truth for types and validation
- **Translations** use flat JSON with dot-notation keys

## Making Changes

### Branch Naming

```
feat/description       → New features
fix/description        → Bug fixes
docs/description       → Documentation only
refactor/description   → Code refactoring
test/description       → Adding tests
i18n/language-code     → Translation additions
```

### Commit Messages

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(cases): add document upload endpoint
fix(auth): handle expired magic links gracefully
docs: add deployment guide for Docker Compose
test(party): add consent flow E2E tests
i18n(de): add German translations
```

## Coding Standards

### TypeScript

- Strict mode enabled (`strict: true` in tsconfig)
- Prefer `interface` over `type` for object shapes
- Use Zod schemas (from `packages/shared`) for all external data validation
- No `any` — use `unknown` and narrow with type guards

### Backend

- Express route handlers should be thin — delegate to service layer
- All database queries go through Drizzle ORM (no raw SQL)
- Log with structured logger (pino) — never log PII
- Error responses use consistent `{ error: string, code: string }` format

### Frontend

- Functional components with hooks
- TanStack Query for server state
- Tailwind CSS for styling — follow existing dark theme tokens
- Accessibility: all interactive elements must be keyboard-navigable

### Formatting

- Prettier with project config (`.prettierrc`)
- ESLint with `@typescript-eslint` rules
- Run `npm run lint:fix` before committing

## Translations

SettleSync uses i18n with JSON translation files.

### Adding a New Language

1. Copy `apps/frontend/src/i18n/pl.json` to `apps/frontend/src/i18n/{code}.json`
2. Translate all values (keys stay in English)
3. Add the language to `packages/shared/src/constants.ts` → `SUPPORTED_LOCALES`
4. Copy `apps/backend/src/templates/email/{pl}/` to a new folder for your language
5. Submit a PR with the `i18n` label

### Translation Keys

Keys are organized by feature area:

```json
{
  "common.save": "Zapisz",
  "common.cancel": "Anuluj",
  "cases.create.title": "Nowa sprawa",
  "party.consent.accept": "Wyrażam zgodę na mediację",
  "party.consent.reject": "Nie wyrażam zgody"
}
```

## Testing

### Unit Tests (Vitest)

```bash
npm run test                    # Run all unit tests
npm run test -- --watch         # Watch mode
npm run test -- --coverage      # With coverage report
```

### E2E Tests (Playwright)

```bash
npm run test:e2e                # Run E2E suite
npm run test:e2e -- --ui        # Interactive UI mode
```

### What to Test

- **Services**: Business logic, edge cases, error handling
- **API Routes**: Request validation, auth checks, response format
- **Components**: User interactions, accessibility, i18n rendering
- **E2E**: Critical paths (login → create case → send links → party consents)

## Submitting Changes

1. Ensure all tests pass: `npm run test && npm run lint && npm run typecheck`
2. Push your branch and open a Pull Request
3. Fill in the PR template — describe what changed and why
4. Link related issues (e.g., `Closes #42`)
5. A maintainer will review within 3 business days

### PR Review Criteria

- [ ] Tests added or updated
- [ ] Types and schemas updated in `packages/shared` if API changed
- [ ] Translations updated if UI text changed
- [ ] No PII in logs or error messages
- [ ] Accessibility maintained (keyboard nav, screen reader labels)
- [ ] Documentation updated if behavior changed

## Architecture Decisions

Significant decisions are documented as Architecture Decision Records (ADRs) in `docs/adr/`. When proposing a major change, please add an ADR:

```markdown
# ADR-NNN: Title

## Status
Proposed | Accepted | Deprecated

## Context
What is the issue we're facing?

## Decision
What did we decide?

## Consequences
What are the trade-offs?
```

## Questions?

- Open a [GitHub Discussion](https://github.com/settlesync/settlesync/discussions) for ideas or questions
- File an [Issue](https://github.com/settlesync/settlesync/issues) for bugs or feature requests
- Tag `@maintainers` in PRs if you need guidance

Thank you for helping make mediation technology more accessible! 🤝
