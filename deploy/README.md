# Production deployment

The app runs as a standalone Next.js Node container behind Caddy, with Redis
for shared rate limiting.

```bash
cp .env.example .env.production
# Fill every required value.
# Generate secrets:
#   openssl rand -base64 32   -> WRITERDOST_ENCRYPTION_KEY
#   openssl rand -hex 32      -> WRITERDOST_CRON_SECRET

export NEXT_PUBLIC_APPWRITE_ENDPOINT="$(grep '^NEXT_PUBLIC_APPWRITE_ENDPOINT=' .env.production | cut -d= -f2-)"
export NEXT_PUBLIC_APPWRITE_PROJECT_ID="$(grep '^NEXT_PUBLIC_APPWRITE_PROJECT_ID=' .env.production | cut -d= -f2-)"
export NEXT_PUBLIC_SITE_URL="$(grep '^NEXT_PUBLIC_SITE_URL=' .env.production | cut -d= -f2-)"

docker compose -f deploy/docker-compose.yml build
docker compose -f deploy/docker-compose.yml up -d
curl -fsS https://your-domain/api/health
```

`.env.production` is never committed. Public `NEXT_PUBLIC_*` values are build
args and are inlined into the browser bundle; server secrets are runtime-only.
Apply the Appwrite schema before starting the app:

```bash
npm run appwrite:setup
```
