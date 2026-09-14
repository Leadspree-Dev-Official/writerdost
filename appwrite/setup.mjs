/**
 * Writerdost AI — Appwrite 2.0 schema.
 *
 * This is the migration file's replacement. Appwrite has no SQL to apply, so
 * the schema is expressed as TablesDB calls and this script is the thing you
 * run. It is idempotent: every create swallows "already exists", so running it
 * again after adding a column here only creates the new column.
 *
 *   npm run appwrite:setup
 *
 * Needs APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID and an APPWRITE_API_KEY with
 * the `databases.read` / `databases.write` (or full Databases) scopes. Reads
 * .env.local, then .env, then the ambient environment.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client, TablesDB, TablesDBIndexType, OrderBy } from "node-appwrite";

/* ------------------------------------------------------------------ */
/* Environment                                                         */
/* ------------------------------------------------------------------ */

/** Minimal .env reader — one dependency fewer for a script run by hand. */
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
    if (process.env[key]) continue; // a real env var always wins

    const value = rawValue.trim().replace(/^(['"])(.*)\1$/s, "$2");
    if (value) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const ENDPOINT =
  process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const API_KEY = process.env.APPWRITE_API_KEY || "";
const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "writerdost";

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
  console.error(
    "Missing configuration. Set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID and\n" +
      "APPWRITE_API_KEY in .env.local — see .env.example.",
  );
  process.exit(1);
}

const tablesDB = new TablesDB(
  new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY),
);

/* ------------------------------------------------------------------ */
/* Schema                                                              */
/* ------------------------------------------------------------------ */

const s = (key, size, opts = {}) => ({ type: "string", key, size, ...opts });
const text = (key, opts = {}) => ({ type: "longtext", key, ...opts });
const bool = (key, opts = {}) => ({ type: "boolean", key, ...opts });
const int = (key, opts = {}) => ({ type: "integer", key, ...opts });
const when = (key, opts = {}) => ({ type: "datetime", key, ...opts });
const oneOf = (key, elements, opts = {}) => ({ type: "enum", key, elements, ...opts });

const key = (name, columns, orders) => ({
  key: name,
  type: TablesDBIndexType.Key,
  columns,
  orders,
});

/**
 * Row security is on for every table: rows carry per-user permissions so the
 * browser can read its own once Appwrite Auth is wired up. The scheduler's API
 * key ignores them, which is what lets one worker act for every user.
 */
const TABLES = [
  {
    id: "destinations",
    name: "Destinations",
    // Where finished posts get sent.
    columns: [
      s("userId", 64, { required: true }),
      s("name", 255, { required: true }),
      oneOf("kind", ["wordpress", "ghost", "webflow", "strapi", "sanity", "webhook"], {
        required: true,
      }),
      // Non-secret settings: site URL, collection id, default category, etc.
      text("config"),
      // Credentials, AES-256-GCM encrypted by the server. Never the raw token.
      text("secretCipher"),
      when("lastOkAt"),
      text("lastError"),
    ],
    indexes: [key("destinations_by_user", ["userId"], [OrderBy.Asc])],
  },
  {
    id: "automations",
    name: "Automations",
    // One scheduled content job.
    columns: [
      s("userId", 64, { required: true }),
      s("name", 255, { required: true }),
      bool("enabled", { xdefault: true }),
      oneOf("sourceKind", ["topic", "rss", "sitemap", "url"], { required: true }),
      // topic: { topics: [...], rotate: true }
      // rss/sitemap/url: { feedUrl, maxPerRun, minWords }
      text("sourceConfig"),
      // Voice and shape of the output: tone, audience, targetWords, keywords,
      // language, and whether to cite the source.
      text("contentConfig"),
      // Which AI provider/model to spend on. The key itself is encrypted.
      text("aiConfig"),
      text("aiSecretCipher"),
      s("destinationId", 64),
      oneOf("publish", ["draft", "publish", "gated"], { xdefault: "draft" }),
      // Frequency is the user-facing schedule; scheduleCron stays the machine
      // one. Cron cannot express "run once" or "every two weeks", so those are
      // driven by this column plus lastRunAt.
      oneOf("frequency", ["once", "daily", "weekly", "biweekly", "monthly", "custom"], {
        xdefault: "daily",
      }),
      // Wall-clock values read in the row's own timezone, stored as text on
      // purpose: "09:00 in Asia/Calcutta" must stay 09:00 across a DST change,
      // which an absolute instant would not.
      s("startDate", 10),
      s("startTime", 5, { xdefault: "09:00" }),
      // Standard 5-field cron, evaluated in the automation's timezone.
      s("scheduleCron", 128, { xdefault: "0 9 * * *" }),
      s("timezone", 64, { xdefault: "UTC" }),
      when("lastRunAt"),
      when("nextRunAt"),
    ],
    // The scheduler's only hot query: enabled rows whose next run has passed.
    indexes: [
      key("automations_due", ["enabled", "nextRunAt"], [OrderBy.Asc, OrderBy.Asc]),
      key("automations_by_user", ["userId"], [OrderBy.Asc]),
    ],
  },
  {
    id: "automation_runs",
    name: "Automation runs",
    // One execution, successful or not. This is the audit trail.
    columns: [
      s("automationId", 64, { required: true }),
      s("userId", 64, { required: true }),
      oneOf("status", ["running", "success", "skipped", "error"], { xdefault: "running" }),
      oneOf("trigger", ["schedule", "manual"], { xdefault: "schedule" }),
      text("detail"),
      int("tokensUsed", { min: 0, xdefault: 0 }),
      when("startedAt"),
      when("finishedAt"),
    ],
    indexes: [
      key("runs_by_automation", ["automationId", "startedAt"], [OrderBy.Asc, OrderBy.Desc]),
    ],
  },
  {
    id: "generated_posts",
    name: "Generated posts",
    columns: [
      s("automationId", 64),
      s("runId", 64),
      s("userId", 64, { required: true }),
      s("title", 512, { required: true }),
      s("slug", 255),
      text("bodyHtml"),
      text("bodyMarkdown"),
      text("excerpt"),
      s("metaDescription", 1024),
      s("keywords", 128, { array: true }),
      s("sourceUrl", 2048),
      s("sourceTitle", 512),
      oneOf("state", ["draft", "published", "failed"], { xdefault: "draft" }),
      s("remoteId", 255),
      s("remoteUrl", 2048),
      text("quality"),
    ],
    indexes: [
      key("posts_by_user", ["userId"], [OrderBy.Asc]),
      key("posts_by_automation", ["automationId"], [OrderBy.Asc]),
    ],
  },
  {
    id: "seen_sources",
    name: "Seen sources",
    // Dedupe: never rewrite the same source article twice. The row id is
    // sha256(automationId, urlHash), which stands in for the composite primary
    // key the SQL schema used.
    columns: [
      s("automationId", 64, { required: true }),
      s("urlHash", 64, { required: true }),
      s("url", 2048, { required: true }),
      when("seenAt"),
    ],
    indexes: [key("seen_by_automation", ["automationId", "seenAt"], [OrderBy.Asc, OrderBy.Desc])],
  },
];

/* ------------------------------------------------------------------ */
/* Apply                                                               */
/* ------------------------------------------------------------------ */

const sleep = (ms) => new Promise((done) => setTimeout(done, ms));

/** Runs a create, treating "already exists" as success. */
async function ensure(label, create) {
  try {
    await create();
    console.log(`  + ${label}`);
    return "created";
  } catch (error) {
    if (error?.code === 409) {
      console.log(`  = ${label} (already there)`);
      return "existing";
    }
    throw error;
  }
}

function createColumn(tableId, column) {
  const base = { databaseId: DATABASE_ID, tableId, key: column.key };
  const required = column.required ?? false;
  // Appwrite rejects a default on a required or array column.
  const xdefault = required || column.array ? undefined : column.xdefault;
  const array = column.array ?? false;

  switch (column.type) {
    case "string":
      return tablesDB.createStringColumn({ ...base, size: column.size, required, xdefault, array });
    case "longtext":
      return tablesDB.createLongtextColumn({ ...base, required, xdefault, array });
    case "boolean":
      return tablesDB.createBooleanColumn({ ...base, required, xdefault, array });
    case "integer":
      return tablesDB.createIntegerColumn({
        ...base,
        required,
        min: column.min,
        max: column.max,
        xdefault,
        array,
      });
    case "datetime":
      return tablesDB.createDatetimeColumn({ ...base, required, xdefault, array });
    case "enum":
      return tablesDB.createEnumColumn({
        ...base,
        elements: column.elements,
        required,
        xdefault,
        array,
      });
    default:
      throw new Error(`Unknown column type: ${column.type}`);
  }
}

/**
 * Columns are built asynchronously, and an index over a column that is still
 * `processing` fails. Wait for the whole table to settle first.
 */
async function waitForColumns(tableId, expected) {
  for (let attempt = 0; attempt < 60; attempt += 1) {
    const { columns } = await tablesDB.listColumns({ databaseId: DATABASE_ID, tableId });
    const ready = columns.filter(
      (column) => expected.includes(column.key) && column.status === "available",
    );
    if (ready.length === expected.length) return;

    const failed = columns.find((column) => column.status === "failed");
    if (failed) throw new Error(`Column ${tableId}.${failed.key} failed to build.`);

    await sleep(1000);
  }
  throw new Error(`Columns on ${tableId} did not become available in time.`);
}

async function main() {
  console.log(`Appwrite ${ENDPOINT} · project ${PROJECT_ID} · database ${DATABASE_ID}\n`);

  await ensure(`database ${DATABASE_ID}`, () =>
    tablesDB.create({ databaseId: DATABASE_ID, name: "Writerdost AI", enabled: true }),
  );

  for (const table of TABLES) {
    console.log(`\n${table.id}`);

    await ensure(`table ${table.id}`, () =>
      tablesDB.createTable({
        databaseId: DATABASE_ID,
        tableId: table.id,
        name: table.name,
        // Per-row permissions, written by ownerPermissions() on the server.
        rowSecurity: true,
        enabled: true,
      }),
    );

    for (const column of table.columns) {
      await ensure(`column ${column.key}`, () => createColumn(table.id, column));
    }

    await waitForColumns(
      table.id,
      table.columns.map((column) => column.key),
    );

    for (const index of table.indexes) {
      // A failed index is worth a warning, not a dead script: the app still
      // works, it just reads more slowly than it should.
      try {
        await ensure(`index ${index.key}`, () =>
          tablesDB.createIndex({
            databaseId: DATABASE_ID,
            tableId: table.id,
            key: index.key,
            type: index.type,
            columns: index.columns,
            orders: index.orders,
          }),
        );
      } catch (error) {
        console.warn(`  ! index ${index.key} could not be created: ${error?.message || error}`);
      }
    }
  }

  console.log("\nSchema is up to date.");
}

main().catch((error) => {
  console.error(`\nSetup failed: ${error?.message || error}`);
  if (error?.response) console.error(error.response);
  process.exit(1);
});
