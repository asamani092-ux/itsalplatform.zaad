# Changelog

## v1.0.0-pilot — 2026-07-27

### Security
- Protected all API routes with session guards
- JWT signature verification in middleware (jose)
- File upload validation (magic bytes + UUID filenames)
- Rate limiting on login, uploads, and request submission
- Approval token expiry (7 days) with manager resend
- Security headers (HSTS, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy)
- Cookie hardening (httpOnly, secure in production, sameSite, 24h maxAge)

### Features
- Hospitality bookings UI with time-conflict validation
- Media documents center with upload/delete
- Email notifications via SMTP (approval, assignment, completion)
- In-app notification bell with polling (manager + employee views)
- KPI dashboard redesign
- Kanban board redesign with SLA warnings
- Settings side-navigation (replaced tab-bar)
- Public form: inline validation, reference number, mobile support
- Accessibility improvements (labels, focus, keyboard navigation)

### Infrastructure
- Docker multi-stage build + docker-compose with Caddy TLS
- Deploy and backup scripts
- E2E tests with Playwright (5 critical paths)

### Code Quality
- Zero TypeScript errors
- Design system migrated to Design_system_f
- README updated with full setup instructions
