# AGENTS.md

## Cursor Cloud specific instructions

Next.js 15 (App Router) RTL Arabic portal. Single service; ORM is Prisma 7 backed by PostgreSQL 16. Standard commands live in `README.md` and `package.json` scripts — this section only covers non-obvious cloud setup caveats.

### Database (required before anything Prisma-related)
- A local PostgreSQL 16 cluster backs the app. It does NOT auto-start on VM boot — start it each session:
  `sudo pg_ctlcluster 16 main start`
- Connection (already provisioned): user `itsal` / password `itsal_dev` / db `itsalplatform` on port `5432`.
- `.env` is gitignored (not in the repo). If missing, copy `.env.example` to `.env` and use the local-Postgres line:
  `DATABASE_URL="postgresql://itsal:itsal_dev@localhost:5432/itsalplatform?schema=public"`
  (The default `.env.example` line points at Docker port `5433`, which is NOT used here — Docker is not installed.)

### Gotchas
- `npm install` runs `postinstall: prisma generate`, and `prisma.config.ts` loads `.env` via `dotenv` and HARD-FAILS if `DATABASE_URL` is unset. So `.env` must exist before `npm install` / `prisma generate`, otherwise install fails with `Cannot resolve environment variable: DATABASE_URL`.
- The generated Prisma client lives in `generated/` (gitignored). Re-run `npx prisma generate` if it's missing.
- After a fresh DB, apply schema then seed: `npx prisma migrate deploy` then `npm run db:seed`.

### Run / test
- Dev server: `npm run dev` → http://localhost:3001 (health: `/ping`, `/api/health`).
- Lint: `npm run lint` (one pre-existing font warning is expected). Types: `npx tsc --noEmit`.
- E2E: `npm run test:e2e` (Playwright; auto-starts `npm run dev`, needs a running DB + seed).

### Seed accounts (after `npm run db:seed`)
- Manager: `manager@zaad.org` / `password123` → `/dashboard`
- Employee: `sara.comm@zaad.org` / `password123` → `/employee`
- Reception screen: `/reception/reception-demo-token`
