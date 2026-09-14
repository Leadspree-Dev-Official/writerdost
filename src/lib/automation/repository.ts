/**
 * Appwrite data access for the automation engine.
 *
 * The store is Appwrite 2.0 TablesDB. Two things differ from a SQL backend and
 * shape most of this file:
 *
 *  - there are no joins, so an automation's destination is fetched in a second
 *    query and stitched on. Runs read a handful of automations at a time, so
 *    that is one extra round trip per tick, not one per row;
 *  - columns are typed, so what used to be `jsonb` is longtext holding JSON.
 *    `encodeJson` / `decodeJson` in src/lib/appwrite/server.ts are the seam.
 *
 * Everything here runs with the API key, which ignores row permissions on
 * purpose: the scheduler acts for every user at once. It must never be
 * reachable from the browser.
 */
import type { TablesDB } from "node-appwrite";
import { nextCronRun, nextRunFor } from "./schedule";
import { decryptSecret } from "@/lib/secure-store";
import {
  DATABASE_ID,
  ID,
  Query,
  TABLES,
  appwriteConfigured,
  decodeJson,
  encodeJson,
  listRowsPaged,
  ownerPermissions,
  rowKey,
  workerTables,
  type GenericRow,
} from "@/lib/appwrite/server";
import type { ApiSettings, AutomationFrequency } from "@/lib/store-types";
import type {
  Automation,
  AutomationSource,
  ContentConfig,
  Destination,
  DestinationKind,
  GeneratedPost,
  PublishMode,
  SourceConfig,
} from "./types";
import type { PipelineOutcome, QualityReport } from "./pipeline";

/** True when Appwrite is configured, so the UI can show a setup notice. */
export function automationBackendReady(): boolean {
  return appwriteConfigured();
}

export { workerTables, userTables } from "@/lib/appwrite/server";

/* ------------------------------------------------------------------ */
/* Scheduling                                                          */
/* ------------------------------------------------------------------ */

/**
 * Next fire time for a cron expression in a given timezone.
 * Returns null when the expression is invalid, so one bad automation cannot
 * take the whole scheduler down.
 */
export function nextRunAt(cron: string, timezone: string, from: Date = new Date()): Date | null {
  return nextCronRun(cron, timezone, from);
}

/** Validates a cron expression for the UI before it is saved. */
export function describeSchedule(cron: string, timezone: string): { valid: boolean; next?: string } {
  const next = nextRunAt(cron, timezone);
  return next ? { valid: true, next: next.toISOString() } : { valid: false };
}

/* ------------------------------------------------------------------ */
/* Row mapping                                                         */
/* ------------------------------------------------------------------ */

type DestinationRow = {
  $id: string;
  name: string;
  kind: DestinationKind;
  /** JSON. */
  config: string | null;
  secretCipher: string | null;
};

type AutomationRow = {
  $id: string;
  userId: string;
  name: string;
  enabled: boolean;
  sourceKind: AutomationSource;
  /** JSON. */
  sourceConfig: string | null;
  /** JSON. */
  contentConfig: string | null;
  /** JSON. */
  aiConfig: string | null;
  aiSecretCipher: string | null;
  destinationId: string | null;
  publish: PublishMode;
  frequency: AutomationFrequency | null;
  startDate: string | null;
  startTime: string | null;
  scheduleCron: string;
  timezone: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
};

/** Decrypts a stored credential, returning undefined rather than throwing. */
function safeDecrypt(cipher: string | null): string | undefined {
  if (!cipher) return undefined;
  try {
    return decryptSecret(cipher);
  } catch {
    return undefined;
  }
}

function toDestination(row: DestinationRow | null): Destination | null {
  if (!row) return null;
  return {
    id: row.$id,
    name: row.name,
    kind: row.kind,
    config: decodeJson<Record<string, unknown>>(row.config, {}),
    secret: safeDecrypt(row.secretCipher),
  };
}

/** Turns a stored row into the shape the pipeline expects. */
export function toAutomation(row: AutomationRow, destination: Destination | null): Automation {
  const content = decodeJson<Partial<ContentConfig>>(row.contentConfig, {});
  const ai = decodeJson<Partial<ApiSettings>>(row.aiConfig, {});

  return {
    id: row.$id,
    userId: row.userId,
    name: row.name,
    enabled: row.enabled,
    sourceKind: row.sourceKind,
    sourceConfig: decodeJson<SourceConfig>(row.sourceConfig, {}),
    contentConfig: {
      tone: content.tone || "Professional",
      audience: content.audience || "",
      targetWords: content.targetWords || 1000,
      language: content.language || "English",
      keywords: content.keywords || [],
      citeSource: content.citeSource ?? true,
      styleNotes: content.styleNotes,
    },
    api: {
      provider: ai.provider || "openai",
      apiKey: safeDecrypt(row.aiSecretCipher) || "",
      baseUrl: ai.baseUrl || "",
      model: ai.model || "",
      appName: ai.appName || "Writerdost AI",
      siteUrl: ai.siteUrl || "",
    },
    destination,
    publish: row.publish,
    // Rows written before the frequency column existed default to daily,
    // which is what their cron already said.
    frequency: row.frequency ?? "daily",
    startDate: row.startDate ?? "",
    startTime: row.startTime ?? "09:00",
    scheduleCron: row.scheduleCron,
    timezone: row.timezone,
    lastRunAt: row.lastRunAt,
    nextRunAt: row.nextRunAt,
  };
}

/**
 * Loads the destinations for a batch of automations in one query.
 * `Query.equal` on `$id` takes a list, which is the closest TablesDB gets to
 * the embedded select the SQL schema used.
 */
async function loadDestinations(
  db: TablesDB,
  rows: AutomationRow[],
): Promise<Map<string, Destination>> {
  const ids = [...new Set(rows.map((row) => row.destinationId).filter(Boolean))] as string[];
  if (ids.length === 0) return new Map();

  const page = await db.listRows({
    databaseId: DATABASE_ID,
    tableId: TABLES.destinations,
    queries: [Query.equal("$id", ids), Query.limit(ids.length)],
  });

  const found = new Map<string, Destination>();
  for (const raw of page.rows as unknown as DestinationRow[]) {
    const destination = toDestination(raw);
    if (destination) found.set(raw.$id, destination);
  }
  return found;
}

async function hydrate(db: TablesDB, rows: AutomationRow[]): Promise<Automation[]> {
  const destinations = await loadDestinations(db, rows);
  return rows.map((row) =>
    toAutomation(row, row.destinationId ? destinations.get(row.destinationId) ?? null : null),
  );
}

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

/** Automations whose next run has come due. */
export async function findDueAutomations(limit = 5): Promise<Automation[]> {
  const db = workerTables();

  try {
    // Rows with no nextRunAt — a spent one-off campaign — are excluded by the
    // comparison itself, the same way the partial index used to exclude them.
    const page = await db.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.automations,
      queries: [
        Query.equal("enabled", true),
        Query.lessThanEqual("nextRunAt", new Date().toISOString()),
        Query.orderAsc("nextRunAt"),
        Query.limit(limit),
      ],
    });

    return await hydrate(db, page.rows as unknown as AutomationRow[]);
  } catch (error) {
    throw new Error(`Could not load due automations: ${messageFor(error)}`);
  }
}

export async function loadAutomation(id: string): Promise<Automation | null> {
  const db = workerTables();

  try {
    const row = (await db.getRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.automations,
      rowId: id,
    })) as unknown as AutomationRow;

    const [automation] = await hydrate(db, [row]);
    return automation ?? null;
  } catch (error) {
    // A missing row is a 404, not a failure worth propagating.
    if (isNotFound(error)) return null;
    throw new Error(`Could not load automation: ${messageFor(error)}`);
  }
}

/** URL hashes this automation has already written about. */
export async function loadSeenHashes(automationId: string): Promise<Set<string>> {
  const db = workerTables();

  try {
    const rows = await listRowsPaged(
      db,
      TABLES.seen,
      [Query.equal("automationId", automationId), Query.orderDesc("seenAt")],
      2000,
    );
    return new Set(rows.map((row) => String(row.urlHash)));
  } catch (error) {
    throw new Error(`Could not load dedupe history: ${messageFor(error)}`);
  }
}

export async function openRun(
  automation: Automation,
  trigger: "schedule" | "manual",
): Promise<string> {
  const db = workerTables();

  try {
    const row = (await db.createRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.runs,
      rowId: ID.unique(),
      data: {
        automationId: automation.id,
        userId: automation.userId,
        trigger,
        status: "running",
        tokensUsed: 0,
        startedAt: new Date().toISOString(),
      },
      permissions: ownerPermissions(automation.userId),
    })) as unknown as GenericRow;

    return row.$id;
  } catch (error) {
    throw new Error(`Could not start a run: ${messageFor(error)}`);
  }
}

/**
 * Writes the results of a run: the posts, the dedupe marks, the run record,
 * and the automation's next fire time.
 */
export async function closeRun(
  automation: Automation,
  runId: string,
  outcome: PipelineOutcome,
): Promise<void> {
  const db = workerTables();
  const permissions = ownerPermissions(automation.userId);

  if (outcome.posts.length > 0) {
    const rows = outcome.posts.map((entry) => ({
      $id: ID.unique(),
      $permissions: permissions,
      automationId: automation.id,
      runId,
      userId: automation.userId,
      title: entry.post.title,
      slug: entry.post.slug,
      bodyHtml: entry.post.bodyHtml,
      bodyMarkdown: entry.post.bodyMarkdown,
      excerpt: entry.post.excerpt,
      metaDescription: entry.post.metaDescription,
      keywords: entry.post.keywords,
      sourceUrl: entry.post.sourceUrl ?? null,
      sourceTitle: entry.post.sourceTitle ?? null,
      state: entry.state,
      remoteId: entry.remoteId ?? null,
      remoteUrl: entry.remoteUrl ?? null,
      quality: encodeJson(entry.quality),
    }));

    try {
      // One call for the batch: TablesDB writes rows in bulk, and a run that
      // drafted five posts should not cost five round trips.
      await db.createRows({ databaseId: DATABASE_ID, tableId: TABLES.posts, rows });
    } catch (error) {
      throw new Error(`Could not save generated posts: ${messageFor(error)}`);
    }

    // Mark sources as handled only once the post is safely stored, so a crash
    // mid-run leaves the item to be retried rather than silently skipped.
    const seen = outcome.posts
      .filter((entry) => entry.state !== "failed")
      .map((entry) => ({
        // Deterministic id instead of the old (automation_id, url_hash)
        // primary key, so re-seeing a source overwrites rather than duplicates.
        $id: rowKey(automation.id, entry.sourceHash),
        $permissions: permissions,
        automationId: automation.id,
        urlHash: entry.sourceHash,
        url: entry.post.sourceUrl || `topic:${entry.post.title}`,
        seenAt: new Date().toISOString(),
      }));

    if (seen.length > 0) {
      await db.upsertRows({ databaseId: DATABASE_ID, tableId: TABLES.seen, rows: seen });
    }
  }

  await db.updateRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.runs,
    rowId: runId,
    data: {
      status: outcome.status,
      detail: outcome.detail,
      tokensUsed: outcome.tokens,
      finishedAt: new Date().toISOString(),
    },
  });

  const now = new Date();
  const next = nextRunFor({ ...automation, lastRunAt: now.toISOString() }, now);
  await db.updateRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.automations,
    rowId: automation.id,
    data: {
      lastRunAt: now.toISOString(),
      nextRunAt: next?.toISOString() ?? null,
      ...(next ? {} : { enabled: false }),
    },
  });
}

/** Records a run that failed before the pipeline produced anything. */
export async function failRun(
  automation: Automation,
  runId: string,
  message: string,
): Promise<void> {
  const db = workerTables();
  const now = new Date();

  await db.updateRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.runs,
    rowId: runId,
    data: { status: "error", detail: message, finishedAt: now.toISOString() },
  });

  // Still advance the schedule, otherwise a permanently broken automation is
  // retried on every tick forever.
  await db.updateRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.automations,
    rowId: automation.id,
    data: {
      lastRunAt: now.toISOString(),
      nextRunAt:
        nextRunAt(automation.scheduleCron, automation.timezone, now)?.toISOString() ?? null,
    },
  });
}

/* ------------------------------------------------------------------ */
/* Errors                                                              */
/* ------------------------------------------------------------------ */

/** AppwriteException carries the HTTP status; anything else is unexpected. */
function isNotFound(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 404;
}

function messageFor(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

export type StoredPost = GeneratedPost & {
  id: string;
  state: string;
  remoteUrl?: string;
  quality: QualityReport;
  createdAt: string;
};
