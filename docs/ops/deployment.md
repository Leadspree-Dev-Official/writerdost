# Production Deployment & Rollback Guide

## Architecture

Writerdost AI runs as a standalone Next.js Node.js container behind a Caddy reverse proxy, with Redis for shared rate limiting.

- **Caddy:** Handles SSL/TLS, compression, request body caps (26MB), and HTTP transport timeouts (15m for streaming AI routes).
- **App:** Next.js standalone server listening on port 3000.
- **Redis:** Redis 7 Alpine caching instance for distributed sliding-window rate limiters.

## Pre-deployment Checklist

1. Populate `.env.production` (never commit this file):
   - `NEXT_PUBLIC_APPWRITE_ENDPOINT`
   - `NEXT_PUBLIC_APPWRITE_PROJECT_ID`
   - `NEXT_PUBLIC_SITE_URL`
   - `APPWRITE_ENDPOINT`
   - `APPWRITE_PROJECT_ID`
   - `APPWRITE_API_KEY`
   - `APPWRITE_DATABASE_ID`
   - `WRITERDOST_ENCRYPTION_KEY` (`openssl rand -base64 32`)
   - `WRITERDOST_CRON_SECRET` (`openssl rand -hex 32`)
   - `REDIS_URL` (`redis://redis:6379`)
2. Run database setup:
   ```bash
   npm run appwrite:setup
   ```

## Deploying

```bash
docker compose -f deploy/docker-compose.yml build
docker compose -f deploy/docker-compose.yml up -d
```

Verify service status:
```bash
docker compose -f deploy/docker-compose.yml ps
curl -fsS https://<your-domain>/api/health
```

## Rollback Procedure

To roll back to a previous release tag:
1. Re-tag or check out the previous release:
   ```bash
   git checkout <previous-tag>
   docker compose -f deploy/docker-compose.yml build
   docker compose -f deploy/docker-compose.yml up -d
   ```
2. Verify `/api/health` returns 200 OK.
3. *Note:* Never roll back `WRITERDOST_ENCRYPTION_KEY` unless you have also restored a database backup from before that key was used.
