# Backup and restore

## Backup

Use a dedicated Appwrite API key with read-only database scope. Back up every
table as newline-delimited JSON, include a manifest with row counts and SHA-256
checksums, then encrypt the archive with the team's `age` recipient key before
uploading it to object storage.

Tables to export: `workspaces`, `workspace_projects`, `destinations`,
`automations`, `automation_runs`, `generated_posts`, `seen_sources`,
`upgrade_requests`, `publish_jobs`, and `automation_leases`.

Never export decrypted credentials. Destination and AI secrets are already
ciphertext; keep the encryption key in a separate secret store.

Retention: 7 daily, 4 weekly, and 3 monthly copies. Alert on any failed run.

## Restore drill

1. Create an empty staging Appwrite project/database and apply the schema.
2. Download the latest encrypted archive and verify its checksum.
3. Restore tables with a service key; restore rows in dependency order:
   workspaces/projects/destinations → automations → runs/posts/jobs → seen/leases.
4. Verify row counts and checksums against the manifest.
5. Start the app against staging with the matching encryption key.
6. Complete a login, project load, preview, and publish-to-local-WordPress smoke test.
7. Record the date, elapsed time, and any failures.

Run this drill before launch and quarterly thereafter. A backup is not considered
valid until a restore has succeeded.
