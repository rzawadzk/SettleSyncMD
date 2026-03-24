# Security Policy

## Supported Versions

| Version | Supported          |
|---------|--------------------|
| 2.x     | ✅ Active support   |
| 1.x     | ⚠️ Critical fixes only |
| < 1.0   | ❌ No support       |

## Reporting a Vulnerability

SettleSync handles sensitive legal data. We take security seriously.

**DO NOT** open a public GitHub issue for security vulnerabilities.

### How to Report

1. Email **security@settlesync.dev** with:
   - Description of the vulnerability
   - Steps to reproduce
   - Potential impact assessment
   - Suggested fix (if any)

2. You will receive an acknowledgment within **48 hours**

3. We aim to provide a fix or mitigation within **7 days** for critical issues

### What Qualifies

- Authentication or authorization bypass
- SQL injection, XSS, CSRF
- Token prediction or forgery
- PII exposure in logs or responses
- Privilege escalation
- Denial of service on critical endpoints
- Insecure cryptographic implementation

### What Doesn't Qualify

- Issues in dependencies (report upstream, but let us know too)
- Theoretical attacks without proof of concept
- Social engineering attacks
- Physical access attacks

## Security Architecture

### Authentication
- Arbiter: Passwordless magic-link → JWT (short-lived) + refresh token
- Parties: HMAC-signed UUID tokens with configurable TTL

### Data Protection
- No PII in application logs
- Party identifiers hashed in audit trail
- File uploads scanned and type-validated
- Database encrypted at rest (PostgreSQL TDE or volume encryption)

### Network
- TLS 1.2+ required in production
- Strict CSP headers via Helmet.js
- CORS restricted to configured origins
- Rate limiting on all public endpoints

### Dependencies
- Dependabot enabled for automated vulnerability scanning
- npm audit run in CI pipeline
- No unnecessary runtime dependencies

## Responsible Disclosure

We follow a 90-day disclosure timeline:
1. Report received → acknowledgment within 48h
2. Fix developed → within 7–30 days depending on severity
3. Fix released → coordinated disclosure
4. Public disclosure → 90 days after initial report (or sooner if fix is released)

We credit reporters in release notes (unless anonymity is requested).

## Contact

- Security reports: security@settlesync.dev
- General questions: Open a GitHub Discussion
- PGP key: Available upon request
