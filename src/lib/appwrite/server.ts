/**
 * Appwrite 2.0 access for the server.
 *
 * Everything the automation engine persists lives in Appwrite TablesDB
 * (tables / rows / columns — the 2.0 successor to the document API). This
 * module owns the whole SDK surface so a version bump is one file to read,
 * and so nothing else has to know whether a value is a row or a document.
 *
 * Two clients, deliberately:
 *  - the worker client authenticates with an API key. It acts for every user
 *    at once, so it bypasses row permissions by design and must never be
 *    reachable from the browser;
 *  - the user client carries a short-lived Appwrite JWT, so the row-level
 *    permissions written by `ownerPermissions` decide what the caller sees.
 */
import { createHash } from "node:crypto";
import { Client, TablesDB, ID, Permission, Query, Role } from "node-appwrite";

const ENDPOINT =
  process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const API_KEY = process.env.APPWRITE_API_KEY || "";

/** The database holding every Writerdost table. Created by appwrite/setup.mjs. */
export const DATABASE_ID = process.env.APPWRITE_DATABASE_ID || "writerdost";

/** Table ids. Kept here so the schema script and the repository cannot drift. */
export const TABLES = {
  destinations: "destinations",
  automations: "automations",
  runs: "automation_runs",
  posts: "generated_posts",
  seen: "seen_sources",
  upgrades: "upgrade_requests",
} as const;

export { ID, Permission, Query, Role };

/** True when the server can reach Appwrite, so the UI can show a setup notice. */
export function appwriteConfigured(): boolean {
  return Boolean(ENDPOINT && PROJECT_ID && API_KEY);
}

/** True when the browser has enough to talk to Appwrite directly (auth). */
export function appwritePublicConfigured(): boolean {
  return Boolean(ENDPOINT && PROJECT_ID);
}

function baseClient(): Client {
  if (!ENDPOINT || !PROJECT_ID) {
    throw new Error(
      "Appwrite is not configured. Set APPWRITE_ENDPOINT and APPWRITE_PROJECT_ID.",
    );
  }
  return new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID);
}

/** API-key client. Server only — ignores row permissions. */
export function workerTables(): TablesDB {
  if (!API_KEY) {
    throw new Error("APPWRITE_API_KEY is not set, so the scheduler cannot reach Appwrite.");
  }
  return new TablesDB(baseClient().setKey(API_KEY));
}

/** Client scoped to one signed-in user; row permissions apply. */
export function userTables(jwt: string): TablesDB {
  if (!jwt) throw new Error("An Appwrite JWT is required for user-scoped access.");
  return new TablesDB(baseClient().setJWT(jwt));
}

/* ------------------------------------------------------------------ */
/* Row helpers                                                         */
/* ------------------------------------------------------------------ */

/** The system columns every row carries. */
export type RowMeta = {
  $id: string;
  $createdAt: string;
  $updatedAt: string;
  $permissions: string[];
};

// Appwrite ids: 36 chars max, [a-zA-Z0-9._-], and never a leading separator.
const APPWRITE_ID = /^[a-zA-Z0-9][a-zA-Z0-9._-]{0,35}$/;

/**
 * Read/write/delete for one owner, so a row stays reachable by its user once
 * Appwrite Auth is wired to the UI. Ids that Appwrite would reject (the local
 * mock accounts, for instance) yield no permissions rather than a 400 — the
 * worker's API key can still reach the row either way.
 */
export function ownerPermissions(userId: string): string[] {
  if (!APPWRITE_ID.test(userId)) return [];
  const owner = Role.user(userId);
  return [Permission.read(owner), Permission.update(owner), Permission.delete(owner)];
}

/**
 * A deterministic row id, so a natural key can be upserted instead of
 * queried-then-written. TablesDB has no composite primary key; hashing the
 * parts gives the same idempotence in 32 hex characters.
 */
export function rowKey(...parts: string[]): string {
  return createHash("sha256").update(parts.join(" ")).digest("hex").slice(0, 32);
}

/**
 * TablesDB columns are typed, so the free-form config blobs that were `jsonb`
 * in Postgres are stored as longtext JSON. These two functions are the only
 * place that knows it.
 */
export function encodeJson(value: unknown): string {
  return JSON.stringify(value ?? {});
}

export function decodeJson<T>(raw: string | null | undefined, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

/** Appwrite rejects a page larger than this, whatever the caller asks for. */
const MAX_PAGE = 1000;

export type GenericRow = Record<string, unknown> & RowMeta;

/**
 * Reads up to `cap` rows, paging with a cursor. `listRows` is capped per call,
 * and the dedupe history is the one query here that can outgrow a single page.
 */
export async function listRowsPaged(
  db: TablesDB,
  tableId: string,
  queries: string[],
  cap: number,
): Promise<GenericRow[]> {
  const collected: GenericRow[] = [];
  let cursor: string | undefined;

  while (collected.length < cap) {
    const pageSize = Math.min(MAX_PAGE, cap - collected.length);
    const page = await db.listRows({
      databaseId: DATABASE_ID,
      tableId,
      queries: [
        ...queries,
        Query.limit(pageSize),
        ...(cursor ? [Query.cursorAfter(cursor)] : []),
      ],
    });

    const rows = page.rows as unknown as GenericRow[];
    collected.push(...rows);

    if (rows.length < pageSize) break;
    cursor = rows[rows.length - 1].$id;
  }

  return collected;
}
