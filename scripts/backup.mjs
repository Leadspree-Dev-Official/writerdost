/**
 * Writerdost AI — Database Backup Script.
 *
 * Exports tables to newline-delimited JSON (.ndjson) with row counts and SHA-256
 * checksums stored in a manifest. Plaintext credentials are excluded by storing
 * only the existing ciphertext fields (`secretCipher`, `aiSecretCipher`).
 *
 * Usage:
 *   node scripts/backup.mjs [--output <dir>]
 */
import { createHash } from "node:crypto";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client, TablesDB, Query } from "node-appwrite";

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

const TABLES = [
  "workspaces",
  "workspace_projects",
  "destinations",
  "automations",
  "automation_runs",
  "generated_posts",
  "seen_sources",
  "upgrade_requests",
  "automation_leases",
];

const tablesDB = new TablesDB(
  new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY),
);

async function listAllRows(tableId) {
  const rows = [];
  let cursor = null;
  const PAGE_SIZE = 100;

  while (true) {
    try {
      const queries = [Query.limit(PAGE_SIZE)];
      if (cursor) {
        queries.push(Query.cursorAfter(cursor));
      }
      const res = await tablesDB.listRows({
        databaseId: DATABASE_ID,
        tableId,
        queries,
      });

      if (!res.rows || res.rows.length === 0) break;
      rows.push(...res.rows);
      if (res.rows.length < PAGE_SIZE) break;
      cursor = res.rows[res.rows.length - 1].$id;
    } catch (err) {
      if (err.code === 404) {
        console.warn(`Table "${tableId}" not found in database "${DATABASE_ID}". Skipping.`);
        return [];
      }
      throw err;
    }
  }
  return rows;
}

async function run() {
  const args = process.argv.slice(2);
  let targetDir = null;
  const outIdx = args.indexOf("--output");
  if (outIdx !== -1 && args[outIdx + 1]) {
    targetDir = resolve(args[outIdx + 1]);
  } else {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    targetDir = resolve(process.cwd(), "backups", `backup-${timestamp}`);
  }

  mkdirSync(targetDir, { recursive: true });
  console.log(`Exporting database "${DATABASE_ID}" to ${targetDir}...`);

  const manifest = {
    databaseId: DATABASE_ID,
    timestamp: new Date().toISOString(),
    tables: {},
  };

  for (const tableId of TABLES) {
    process.stdout.write(`Exporting table ${tableId}... `);
    const rows = await listAllRows(tableId);
    const filePath = resolve(targetDir, `${tableId}.ndjson`);
    const ndjsonLines = rows.map((r) => JSON.stringify(r)).join("\n");
    writeFileSync(filePath, ndjsonLines ? ndjsonLines + "\n" : "", "utf8");

    const hash = createHash("sha256").update(ndjsonLines).digest("hex");
    manifest.tables[tableId] = {
      count: rows.length,
      sha256: hash,
      file: `${tableId}.ndjson`,
    };
    console.log(`${rows.length} rows (sha256: ${hash.slice(0, 12)}...)`);
  }

  const manifestPath = resolve(targetDir, "manifest.json");
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), "utf8");
  console.log(`\nBackup completed successfully. Manifest written to ${manifestPath}`);
}

run().catch((err) => {
  console.error("Backup failed:", err);
  process.exit(1);
});
