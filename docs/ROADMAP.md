# SettleSync Roadmap

## Vision

The go-to open-source platform for mediation consent management and case workflow in European legal practice. Privacy-first, EU law-aligned, self-hosted.

---

## v1.0 — Foundation ✅ (Shipped)

- [x] Arbiter magic-link auth, case CRUD, party consent via signed tokens
- [x] HMAC-SHA256 security, PII-free logging, PL+EN i18n, Docker deployment

## v2.0 — Open Source Ready 🚧 (Current)

### Infrastructure
- [x] README, CONTRIBUTING, SECURITY, EUPL license, CI/CD, issue templates
- [ ] Playwright E2E tests, Dependabot, Docker multi-stage builds

### Backend
- [x] Full DB schema, audit trail, email templates, token utils, error handling
- [ ] Service layers (case, party, document), PDF generation, webhooks, export, cron

### Frontend
- [x] Complete i18n files
- [ ] Dashboard, case list/detail, party consent page, document upload, mobile layout

## v2.1 — Polish Law Compliance

- [ ] KPC-aligned settlement templates, court filing export (new e-court system)
- [ ] Mediation protocol generation, RODO data register export
- [ ] Configurable consent text per jurisdiction

## v3.0 — Multi-Mediator & Collaboration

- [ ] Co-mediation roles (lead, co-mediator, observer), RBAC
- [ ] Multi-tenancy, shared templates, admin analytics, API keys

## v3.1 — Digital Signatures

- [ ] Signature capture, eIDAS integration, Profil Zaufany (Polish trusted profile)
- [ ] Signed settlement PDFs with embedded verification

## v4.0 — Communication & Scheduling

- [ ] Secure messaging, session scheduling, video integration (Jitsi/BBB)
- [ ] WebSocket notifications, SMS for parties

## v5.0 — Intelligence & Analytics

- [ ] Settlement calculator, outcome analytics, AI-assisted clause suggestions

---

## Non-Goals

Not a full practice management system (use Clio/Smokeball for billing). Not an AI mediator — the human mediator leads. Not a court filing portal — we generate compatible documents.

## Influence the Roadmap

Vote 👍 on GitHub issues, open feature requests, contribute PRs, or join Discussions. Practitioner input is especially valued.
