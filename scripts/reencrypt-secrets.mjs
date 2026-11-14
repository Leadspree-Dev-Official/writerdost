/**
 * Writerdost AI — Encryption Key Rotation & Secret Re-encryption.
 *
 * Iterates through destinations and automations, decrypts with either the
 * current key or the previous key (WRITERDOST_ENCRYPTION_KEY_PREVIOUS), and
 * re-encrypts with the current key.
 *
 * Usage:
 *   node scripts/reencrypt-secrets.mjs [--dry-run] [--apply]
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client, TablesDB, Query } from "node-appwrite";
import { decryptSecret, encryptSecret } from "../src/lib/secure-store.ts";

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

if (!process.env.WRITERDOST_ENCRYPTION_KEY) {
  console.error("WRITERDOST_ENCRYPTION_KEY is required.");
  process.exit(1);
}

const tablesDB = new TablesDB(
  new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY),
);

async function listAllRows(tableId) {
  const rows = [];
  let cursor = null;
  const PAGE_SIZE = 100;

  while (true) {
    const queries = [Query.limit(PAGE_SIZE)];
    if (cursor) queries.push(Query.cursorAfter(cursor));
    const res = await tablesDB.listRows({
      databaseId: DATABASE_ID,
      tableId,
      queries,
    });
    if (!res.rows || res.rows.length === 0) break;
    rows.push(...res.rows);
    if (res.rows.length < PAGE_SIZE) break;
    cursor = res.rows[res.rows.length - 1].$id;
  }
  return rows;
}

async function run() {
  const args = process.argv.slice(2);
  const apply = args.includes("--apply");

  console.log(`Key rotation re-encryption [mode: ${apply ? "APPLY" : "DRY-RUN"}]`);

  // 1. Process destinations
  console.log("Checking destinations...");
  const destinations = await listAllRows("destinations");
  let destCount = 0;
  let destError = 0;

  for (const row of destinations) {
    if (!row.secretCipher) continue;
    try {
      const plaintext = decryptSecret(row.secretCipher);
      const newCipher = encryptSecret(plaintext);
      destCount++;

      if (apply) {
        await tablesDB.updateRow({
          databaseId: DATABASE_ID,
          tableId: "destinations",
          rowId: row.$id,
          data: { secretCipher: newCipher },
        });
      }
    } catch (err) {
      destError++;
      console.error(`Failed to decrypt destination ${row.$id}:`, err.message);
    }
  }
  console.log(`Destinations processed: ${destCount}, errors: ${destError}`);

  // 2. Process automations
  console.log("Checking automations...");
  const automations = await listAllRows("automations");
  let autoCount = 0;
  let autoError = 0;

  for (const row of automations) {
    if (!row.aiSecretCipher) continue;
    try {
      const plaintext = decryptSecret(row.aiSecretCipher);
      const newCipher = encryptSecret(plaintext);
      autoCount++;

      if (apply) {
        await tablesDB.updateRow({
          databaseId: DATABASE_ID,
          tableId: "automations",
          rowId: row.$id,
          data: { aiSecretCipher: newCipher },
        });
      }
    } catch (err) {
      autoError++;
      console.error(`Failed to decrypt automation ${row.$id}:`, err.message);
    }
  }
  console.log(`Automations processed: ${autoCount}, errors: ${autoError}`);

  if (!apply) {
    console.log("\nDry run completed. Run with `--apply` to persist re-encrypted secrets to Appwrite.");
  } else {
    console.log("\nRe-encryption applied successfully.");
  }
}

run().catch((err) => {
  console.error("Re-encryption failed:", err);
  process.exit(1);
});
