/**
 * Writerdost AI — Database Restore Script.
 *
 * Restores tables from newline-delimited JSON (.ndjson) backup archives in
 * dependency order. Validates checksums against manifest.json before restoring.
 *
 * Usage:
 *   node scripts/restore.mjs <backup-dir> [--dry-run]
 */
import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client, TablesDB, ID } from "node-appwrite";

function loadEnvFile(name) {
  let text;
  try {
    text = readFileSync(resolve(process.cwd(), name), "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const match = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/i.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    const value = rawValue.trim().replace(/^(['"])(.*)\1$/s, "$2");
    if (value) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const ENDPOINT = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const API_KEY = process.env.APPWRITE_API_KEY || "";
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "writerdost";

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
  console.error("Missing configuration. Set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID, and APPWRITE_API_KEY.");
  process.exit(1);
}

const RESTORE_ORDER = [
  "workspaces",
  "workspace_projects",
  "destinations",
  "automations",
  "automation_runs",
  "generated_posts",
  "seen_sources",
  "upgrade_requests",
  "publish_jobs",
  "automation_leases",
];

const tablesDB = new TablesDB(
  new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY),
);

async function run() {
  const args = process.argv.slice(2);
  const backupDirArg = args.find((a) => !a.startsWith("--"));
  const dryRun = args.includes("--dry-run");

  if (!backupDirArg) {
    console.error("Usage: node scripts/restore.mjs <backup-dir> [--dry-run]");
    process.exit(1);
  }

  const backupDir = resolve(backupDirArg);
  const manifestPath = resolve(backupDir, "manifest.json");

  if (!existsSync(manifestPath)) {
    console.error(`manifest.json not found in ${backupDir}`);
    process.exit(1);
  }

  const manifest = JSON.parse(readFileSync(manifestPath, "utf8"));
  console.log(`Verifying backup manifest for database "${manifest.databaseId}" created at ${manifest.timestamp}...`);

  for (const tableId of RESTORE_ORDER) {
    const meta = manifest.tables[tableId];
    if (!meta) continue;

    const filePath = resolve(backupDir, meta.file);
    if (!existsSync(filePath)) {
      console.error(`Missing backup file for table "${tableId}": ${filePath}`);
      process.exit(1);
    }

    const content = readFileSync(filePath, "utf8");
    const lines = content.trim() ? content.trim().split("\n") : [];
    const hash = createHash("sha256").update(lines.join("\n")).digest("hex");

    if (hash !== meta.sha256) {
      console.error(`Checksum mismatch for table "${tableId}"! Expected ${meta.sha256}, got ${hash}`);
      process.exit(1);
    }
    console.log(`✓ Checksum verified for ${tableId} (${lines.length} rows)`);
  }

  if (dryRun) {
    console.log("\n[DRY RUN] All table files and checksums verified. No data written to Appwrite.");
    return;
  }

  console.log(`\nRestoring data into Appwrite database "${DATABASE_ID}"...`);

  for (const tableId of RESTORE_ORDER) {
    const meta = manifest.tables[tableId];
    if (!meta) continue;

    const filePath = resolve(backupDir, meta.file);
    const content = readFileSync(filePath, "utf8");
    const lines = content.trim() ? content.trim().split("\n") : [];
    if (lines.length === 0) {
      console.log(`Table ${tableId}: 0 rows to restore.`);
      continue;
    }

    process.stdout.write(`Restoring ${tableId} (${lines.length} rows)... `);
    let restoredCount = 0;

    for (const line of lines) {
      const doc = JSON.parse(line);
      const rowId = doc.$id || ID.unique();
      const permissions = doc.$permissions || [];

      // Strip system metadata fields before inserting
      const data = { ...doc };
      delete data.$id;
      delete data.$createdAt;
      delete data.$updatedAt;
      delete data.$permissions;
      delete data.$databaseId;
      delete data.$tableId;
      delete data.$collectionId;

      try {
        await tablesDB.createRow({
          databaseId: DATABASE_ID,
          tableId,
          rowId,
          data,
          permissions,
        });
        restoredCount++;
      } catch (err) {
        if (err.code === 409) {
          // Already exists; update row
          try {
            await tablesDB.updateRow({
              databaseId: DATABASE_ID,
              tableId,
              rowId,
              data,
              permissions,
            });
            restoredCount++;
          } catch (updateErr) {
            console.error(`\nFailed to update row ${rowId} in ${tableId}:`, updateErr.message);
          }
        } else {
          console.error(`\nFailed to restore row ${rowId} in ${tableId}:`, err.message);
        }
      }
    }
    console.log(`done (${restoredCount}/${lines.length} restored).`);
  }

  console.log("\nRestore completed successfully.");
}

run().catch((err) => {
  console.error("Restore failed:", err);
  process.exit(1);
});
