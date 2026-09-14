# Appwrite 2.0 backend

Appwrite is not optional. It holds **the accounts people sign in with** and
**the blog campaigns the scheduler runs**. Ebook drafting still spends a BYO AI
key held in the browser, but nobody gets as far as the workspace without an
Appwrite account.

Three pieces:

| Piece | What it is |
| --- | --- |
| `setup.mjs` | The schema. Creates the database, tables, columns, indexes and table permissions in TablesDB. Idempotent — safe to re-run. |
| `grant-admin.mjs` | Grants or revokes the administrator role. The only way to make the *first* administrator. |
| `functions/automation-tick/` | An Appwrite Function on a cron schedule that pokes `/api/automations/tick`. |

## 1. Create the project

1. Create a project at [cloud.appwrite.io](https://cloud.appwrite.io) (or point
   at your own instance).
2. Copy the **Project ID** and the **API Endpoint** from *Settings*.
3. Create an **API key** under *Overview → Integrations → API keys*. This key
   is server-only. It needs four scopes:

   | Scope | Why |
   | --- | --- |
   | `databases.read`, `databases.write` | The campaign tables. |
   | `users.read`, `users.write` | The admin screen, and the `admin` label that grants the administrator role. |

## 2. Fill in the environment

Copy `.env.example` to `.env.local` and set:

```
APPWRITE_ENDPOINT=https://<region>.cloud.appwrite.io/v1
APPWRITE_PROJECT_ID=...
APPWRITE_API_KEY=...
APPWRITE_DATABASE_ID=writerdost

# The browser signs in against Appwrite directly, so it needs these two as
# well. Public by design; usually the same values as above.
NEXT_PUBLIC_APPWRITE_ENDPOINT=https://<region>.cloud.appwrite.io/v1
NEXT_PUBLIC_APPWRITE_PROJECT_ID=...

WRITERDOST_ENCRYPTION_KEY=$(openssl rand -base64 32)
WRITERDOST_CRON_SECRET=$(openssl rand -hex 32)
```

## 3. Apply the schema

```bash
npm run appwrite:setup
```

It prints one line per object. Run it again after pulling a change that adds a
column — existing objects are left alone.

## 4. Make the first administrator

Sign up through the app as you normally would, then promote that account:

```bash
npm run appwrite:grant-admin -- you@example.com
```

Revoke with `-- you@example.com --revoke`. Sign out and back in for the change
to reach the session.

This has to happen outside the app, and that is deliberate — see *Roles* below.
Once one administrator exists, they can promote anyone else from *Admin*.

## 5. Schedule the tick

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
| `upgrade_requests` | A user asking for a locked feature. Shared, because the admin reviewing a request is not the person who raised it. |

Two details worth knowing before you edit `setup.mjs`:

- **JSON lives in longtext columns.** TablesDB columns are typed, so the
  free-form blobs (`sourceConfig`, `contentConfig`, `aiConfig`, `quality`) are
  stored as JSON strings. `encodeJson` / `decodeJson` in
  `src/lib/appwrite/server.ts` are the only code that knows this.
- **`seen_sources` has no composite key.** Its row id is
  `sha256(automationId, urlHash)` truncated to 32 characters, so re-seeing a
  source upserts instead of duplicating.

## Permissions

Three mechanisms, and it matters which does what.

**Table permissions** grant `create` to `users` — nothing else. With row
security on, a table-level `read` would apply to *every* row, which is the
leak per-row permissions exist to prevent. `automation_runs` and
`seen_sources` grant nothing at all: only the scheduler writes them.

**Row permissions** are stamped per row by `ownerPermissions(userId)`:
read/update/delete for that user alone. The browser reaches Appwrite through
this app's API routes, and those routes use a client carrying the caller's
JWT — so Appwrite decides what is legible, not a `where` clause. A filter bug
yields an empty list rather than someone else's campaign. The scheduler's API
key bypasses all of it, which is what lets one worker act for every user.

**Roles** are Appwrite **labels**, not account preferences.

This is the part worth remembering. Preferences are writable by the account
holder — `PATCH /account/prefs` is theirs — so a role kept there can be
self-granted, and re-reading it through the server Users API does not help:
that call returns the same bag the user just wrote. Labels have no
account-side endpoint at all, and setting one needs `users.write`. So:

- `role` → label `admin`. Trustworthy. Checked by `requireAdmin`.
- `plan` and `allowedFeatures` → preferences. **Not** a security boundary.
  They gate client-side navigation over the user's own BYO AI key, and no
  server route spends this app's money on the strength of them. If that ever
  changes — a platform key, a paid quota — move the gate to a label or a
  permissioned row first.
