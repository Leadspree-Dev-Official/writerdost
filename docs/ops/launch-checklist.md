# Production Launch Go/No-Go Checklist

All items must be verified before opening traffic to the production cluster.

## 1. Codebase & Quality Gates
- [x] Working tree clean, build passing (`npm run build`).
- [x] Typecheck green (`npm run typecheck`).
- [x] Linting clean (`npm run lint`).
- [x] Unit test suite green (`npm run test:unit`).
- [x] Security audit clean with 0 high/critical vulnerabilities (`npm audit --omit=dev --audit-level=high`).
- [x] Structured logger configured with sensitive field redaction (`src/lib/logger.ts`).

## 2. Infrastructure & Secrets
- [ ] Production `.env.production` populated in deployment secret manager (never committed).
- [ ] `WRITERDOST_ENCRYPTION_KEY` set (32 bytes, base64 or hex).
- [ ] `WRITERDOST_CRON_SECRET` set (≥ 32 characters hex).
- [ ] `REDIS_URL` active and reachable from container network.
- [ ] Caddy reverse proxy configured with valid SSL/TLS certificate for custom domain.

## 3. Appwrite Backend
- [ ] Production schema applied via `npm run appwrite:setup`.
- [ ] Admin account granted via `npm run appwrite:grant-admin`.
- [ ] Row security permissions verified on all tables.
- [ ] Email verification enabled in Appwrite Auth settings.
- [ ] Admin MFA enabled on console accounts.

## 4. Disaster Recovery & Operations
- [x] Backup script verified (`scripts/backup.mjs`).
- [x] Restore script verified (`scripts/restore.mjs`).
- [x] Encryption key rotation procedure documented (`docs/ops/key-rotation.md`).
- [ ] Staging restore drill completed and verified.
- [ ] Uptime monitoring configured on `/api/health` and `/api/health/deep`.

## 5. Legal & Commercial Truthfulness
- [x] Privacy Policy published at `/privacy`.
- [x] Terms of Service published at `/terms`.
- [x] Pricing page displays free/BYO-key beta disclaimer without unverified commercial claims.
