# Appwrite 2.0 backend

The manual app — ebooks, rewrite, blog drafts, exports — needs none of this. It
runs on BYO API settings held in the browser. Everything here is for **blog
automation**, which runs on the server on a schedule.

Two pieces:

| Piece | What it is |
| --- | --- |
| `setup.mjs` | The schema. Creates the database, tables, columns and indexes in TablesDB. Idempotent — safe to re-run. |
| `functions/automation-tick/` | An Appwrite Function on a cron schedule that pokes `/api/automations/tick`. |

## 1. Create the project

1. Create a project at [cloud.appwrite.io](https://cloud.appwrite.io) (or point
   at your own instance).
2. Copy the **Project ID** and the **API Endpoint** from *Settings*.
3. Create an **API key** under *Overview → Integrations → API keys* with the
   `databases.read` and `databases.write` scopes. This key is server-only.

## 2. Fill in the environment

Copy `.env.example` to `.env.local` and set:

```
APPWRITE_ENDPOINT=https://<region>.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=...
APPWRITE_API_KEY=...
APPWRITE_DATABASE_ID=writerdost

WRITERDOST_ENCRYPTION_KEY=$(openssl rand -base64 32)
WRITERDOST_CRON_SECRET=$(openssl rand -hex 32)
```

## 3. Apply the schema

```bash
npm run appwrite:setup
```

It prints one line per object. Run it again after pulling a change that adds a
column — existing objects are left alone.

## 4. Schedule the tick

In the Appwrite console, *Functions → Create function*:

- **Runtime**: Node 22 (any Node 18+ runtime works)
- **Entrypoint**: `src/main.js`
- **Schedule**: `*/5 * * * *`
- **Variables**:
  - `WRITERDOST_APP_URL` — where the Next.js app is deployed, e.g. `https://app.example.com`
  - `WRITERDOST_CRON_SECRET` — the same value as in `.env.local`

Then deploy `functions/automation-tick/`, either by uploading the folder as a
tarball or with the CLI from that directory:

```bash
appwrite push function
```

A manual execution with `?check=1` hits the route's health check instead of
firing a real run, which is the quickest way to confirm the secret matches.

## The schema

| Table | Holds |
| --- | --- |
| `destinations` | Where finished posts are sent. Credentials are AES-256-GCM encrypted by the app before they ever reach Appwrite. |
| `automations` | One scheduled content job: source, voice, AI provider, schedule. |
| `automation_runs` | One execution, successful or not. The audit trail. |
| `generated_posts` | What was written, and where it ended up. |
| `seen_sources` | Dedupe marks, so the same article is never rewritten twice. |

Two details worth knowing before you edit `setup.mjs`:

- **JSON lives in longtext columns.** TablesDB columns are typed, so the
  free-form blobs (`sourceConfig`, `contentConfig`, `aiConfig`, `quality`) are
  stored as JSON strings. `encodeJson` / `decodeJson` in
  `src/lib/appwrite/server.ts` are the only code that knows this.
- **`seen_sources` has no composite key.** Its row id is
  `sha256(automationId, urlHash)` truncated to 32 characters, so re-seeing a
  source upserts instead of duplicating.

## Permissions

Every table has row security on, and the server stamps each row with
read/update/delete for `Role.user(<userId>)`. Nothing in the browser talks to
Appwrite yet — the app's accounts are still local — so today those permissions
are dormant and the scheduler's API key, which ignores them, does all the work.
When Appwrite Auth replaces the local accounts, the same rows become readable
directly from the browser with no schema change.
