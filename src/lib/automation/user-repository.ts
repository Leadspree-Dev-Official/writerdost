/**
 * User-scoped data access for automations.
 *
 * The sibling `repository.ts` acts for *everyone* with an API key, because the
 * scheduler must. Everything in this file acts for exactly one signed-in user
 * through a JWT-bearing client, so Appwrite's row permissions — not a `where`
 * clause written by hand — decide which rows are reachable. A filter mistake
 * here yields an empty list, never someone else's campaign.
 *
 * Credentials are encrypted on the way in and never travel back out: the read
 * shapes report `secretSet` / `aiConfigured` booleans instead.
 */
import type { TablesDB } from "node-appwrite";
import {
  DATABASE_ID,
  ID,
  Query,
  TABLES,
  decodeJson,
  encodeJson,
  ownerPermissions,
} from "@/lib/appwrite/server";
import { encryptSecret } from "@/lib/secure-store";
import { cronForFrequency, nextRunFor } from "./schedule";
import type { AutomationInput, AutomationWire, DestinationInput, DestinationWire, PostInput, PostWire } from "./wire";
import type { ApiSettings, BlogAutomation, CampaignPost } from "@/lib/store-types";

/** Appwrite rejects a page larger than this. */
const PAGE = 100;

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/* ------------------------------------------------------------------ */
/* Destinations                                                        */
/* ------------------------------------------------------------------ */

type DestinationRow = {
  $id: string;
  name: string;
  kind: DestinationWire["kind"];
  config: string | null;
  secretCipher: string | null;
};

function toDestinationWire(row: DestinationRow): DestinationWire {
  return {
    id: row.$id,
    name: row.name,
    kind: row.kind,
    config: decodeJson<Record<string, string>>(row.config, {}),
    secretSet: Boolean(row.secretCipher),
  };
}

/** Splits the credential out of a config bag. Every adapter names it `secret`. */
function splitSecret(config: Record<string, string>): {
  plain: Record<string, string>;
  secret: string;
} {
  const { secret = "", ...plain } = config || {};
  return { plain, secret };
}

export async function listDestinations(db: TablesDB, userId: string): Promise<DestinationWire[]> {
  try {
    const page = await db.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.destinations,
      queries: [Query.equal("userId", userId), Query.limit(PAGE)],
    });
    return (page.rows as unknown as DestinationRow[]).map(toDestinationWire);
  } catch (error) {
    throw new Error(`Could not load destinations: ${message(error)}`);
  }
}

export async function createDestination(
  db: TablesDB,
  userId: string,
  input: DestinationInput,
): Promise<DestinationWire> {
  const { plain, secret } = splitSecret(input.config);

  const row = (await db.createRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.destinations,
    rowId: ID.unique(),
    data: {
      userId,
      name: input.name,
      kind: input.kind,
      config: encodeJson(plain),
      secretCipher: secret ? encryptSecret(secret) : null,
    },
    permissions: ownerPermissions(userId),
  })) as unknown as DestinationRow;

  return toDestinationWire(row);
}

export async function updateDestination(
  db: TablesDB,
  id: string,
  input: DestinationInput,
): Promise<DestinationWire> {
  const { plain, secret } = splitSecret(input.config);

  const row = (await db.updateRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.destinations,
    rowId: id,
    data: {
      name: input.name,
      kind: input.kind,
      config: encodeJson(plain),
      // An empty secret means "keep what is stored", so a user editing the
      // site URL does not have to retype an application password they cannot
      // read back. Clearing a credential is done by deleting the destination.
      ...(secret ? { secretCipher: encryptSecret(secret) } : {}),
    },
  })) as unknown as DestinationRow;

  return toDestinationWire(row);
}

export async function deleteDestination(db: TablesDB, id: string): Promise<void> {
  await db.deleteRow({ databaseId: DATABASE_ID, tableId: TABLES.destinations, rowId: id });
}

/* ------------------------------------------------------------------ */
/* Automations                                                         */
/* ------------------------------------------------------------------ */

type AutomationRow = {
  $id: string;
  $createdAt: string;
  name: string;
  enabled: boolean;
  sourceKind: BlogAutomation["sourceKind"];
  sourceConfig: string | null;
  contentConfig: string | null;
  aiConfig: string | null;
  aiSecretCipher: string | null;
  destinationId: string | null;
  publish: BlogAutomation["publish"];
  frequency: BlogAutomation["frequency"] | null;
  startDate: string | null;
  startTime: string | null;
  scheduleCron: string;
  timezone: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
};

const DEFAULT_CONTENT: BlogAutomation["contentConfig"] = {
  tone: "Professional",
  audience: "",
  targetWords: 1000,
  language: "English",
  keywords: [],
  citeSource: true,
};

function toAutomationWire(row: AutomationRow): AutomationWire {
  const ai = decodeJson<Partial<ApiSettings>>(row.aiConfig, {});
  const content = decodeJson<Partial<BlogAutomation["contentConfig"]>>(row.contentConfig, {});

  return {
    id: row.$id,
    name: row.name,
    enabled: row.enabled,
    sourceKind: row.sourceKind,
    sourceConfig: decodeJson<BlogAutomation["sourceConfig"]>(row.sourceConfig, {}),
    contentConfig: { ...DEFAULT_CONTENT, ...content },
    destinationId: row.destinationId,
    publish: row.publish,
    frequency: row.frequency ?? "daily",
    startDate: row.startDate ?? "",
    startTime: row.startTime ?? "09:00",
    scheduleCron: row.scheduleCron,
    timezone: row.timezone,
    createdAt: row.$createdAt,
    aiConfigured: Boolean(row.aiSecretCipher),
    aiProvider: ai.provider || "",
    aiModel: ai.model || "",
    lastRunAt: row.lastRunAt,
    nextRunAt: row.nextRunAt,
  };
}

/**
 * Turns an input patch into columns, recomputing the cron and the next fire
 * time whenever anything the schedule depends on moved.
 *
 * `current` is the row being edited (absent on create) so a partial patch —
 * "just flip enabled" — still schedules against the values already stored
 * rather than against defaults.
 */
function toColumns(
  input: AutomationInput,
  current?: AutomationRow,
): Record<string, unknown> {
  const frequency = input.frequency ?? current?.frequency ?? "daily";
  const startDate = input.startDate ?? current?.startDate ?? "";
  const startTime = input.startTime ?? current?.startTime ?? "09:00";
  const timezone = input.timezone ?? current?.timezone ?? "UTC";
  const rawCron = input.scheduleCron ?? current?.scheduleCron ?? "0 9 * * *";
  const enabled = input.enabled ?? current?.enabled ?? true;

  // `custom` keeps whatever cron the user typed; every other frequency derives
  // it, so the stored cron can never drift from the frequency it represents.
  const scheduleCron = cronForFrequency(frequency, { scheduleCron: rawCron, startDate, startTime });

  const shape = {
    frequency,
    scheduleCron,
    timezone,
    startDate,
    startTime,
    lastRunAt: current?.lastRunAt ?? null,
    enabled,
  };
  // A disabled automation has no next run: leaving a stale timestamp would put
  // it back in the scheduler's due query the moment it is re-enabled.
  const next = enabled ? nextRunFor(shape) : null;

  const columns: Record<string, unknown> = {
    enabled,
    frequency,
    startDate,
    startTime,
    scheduleCron,
    timezone,
    nextRunAt: next?.toISOString() ?? null,
  };

  if (input.name !== undefined) columns.name = input.name;
  if (input.sourceKind !== undefined) columns.sourceKind = input.sourceKind;
  if (input.sourceConfig !== undefined) columns.sourceConfig = encodeJson(input.sourceConfig);
  if (input.contentConfig !== undefined) columns.contentConfig = encodeJson(input.contentConfig);
  if (input.destinationId !== undefined) columns.destinationId = input.destinationId || null;
  if (input.publish !== undefined) columns.publish = input.publish;

  if (input.api) {
    const { apiKey, ...rest } = input.api;
    columns.aiConfig = encodeJson(rest);
    // Same rule as destination credentials: an empty key leaves the stored one
    // alone, so saving a schedule change does not wipe the scheduler's key.
    if (apiKey) columns.aiSecretCipher = encryptSecret(apiKey);
  }

  return columns;
}

export async function listAutomations(db: TablesDB, userId: string): Promise<AutomationWire[]> {
  try {
    const page = await db.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.automations,
      queries: [Query.equal("userId", userId), Query.orderDesc("$createdAt"), Query.limit(PAGE)],
    });
    return (page.rows as unknown as AutomationRow[]).map(toAutomationWire);
  } catch (error) {
    throw new Error(`Could not load automations: ${message(error)}`);
  }
}

export async function createAutomation(
  db: TablesDB,
  userId: string,
  input: AutomationInput,
): Promise<AutomationWire> {
  const row = (await db.createRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.automations,
    rowId: ID.unique(),
    data: {
      userId,
      name: input.name || "Untitled campaign",
      sourceKind: input.sourceKind ?? "topic",
      sourceConfig: encodeJson(input.sourceConfig ?? {}),
      contentConfig: encodeJson({ ...DEFAULT_CONTENT, ...(input.contentConfig ?? {}) }),
      publish: input.publish ?? "draft",
      ...toColumns(input),
    },
    permissions: ownerPermissions(userId),
  })) as unknown as AutomationRow;

  return toAutomationWire(row);
}

export async function updateAutomation(
  db: TablesDB,
  id: string,
  input: AutomationInput,
): Promise<AutomationWire> {
  // Read first so a partial patch schedules against the stored values. The
  // read is permission-checked too, so this doubles as the ownership guard.
  const current = (await db.getRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.automations,
    rowId: id,
  })) as unknown as AutomationRow;

  const row = (await db.updateRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.automations,
    rowId: id,
    data: toColumns(input, current),
  })) as unknown as AutomationRow;

  return toAutomationWire(row);
}

export async function deleteAutomation(db: TablesDB, id: string): Promise<void> {
  await db.deleteRow({ databaseId: DATABASE_ID, tableId: TABLES.automations, rowId: id });
}

/* ------------------------------------------------------------------ */
/* Generated posts                                                     */
/* ------------------------------------------------------------------ */

type PostRow = {
  $id: string;
  $createdAt: string;
  automationId: string | null;
  title: string;
  slug: string | null;
  bodyHtml: string | null;
  bodyMarkdown: string | null;
  excerpt: string | null;
  metaDescription: string | null;
  keywords: string[] | null;
  sourceUrl: string | null;
  sourceTitle: string | null;
  state: CampaignPost["state"];
  remoteUrl: string | null;
  quality: string | null;
};

function toPostWire(row: PostRow): PostWire {
  return {
    id: row.$id,
    automationId: row.automationId ?? "",
    title: row.title,
    slug: row.slug ?? "",
    bodyHtml: row.bodyHtml ?? "",
    bodyMarkdown: row.bodyMarkdown ?? "",
    excerpt: row.excerpt ?? "",
    metaDescription: row.metaDescription ?? "",
    keywords: row.keywords ?? [],
    sourceUrl: row.sourceUrl ?? undefined,
    sourceTitle: row.sourceTitle ?? undefined,
    state: row.state,
    remoteUrl: row.remoteUrl ?? undefined,
    quality: decodeJson<CampaignPost["quality"]>(row.quality, undefined),
    createdAt: row.$createdAt,
  };
}

export async function listPosts(db: TablesDB, userId: string): Promise<PostWire[]> {
  try {
    const page = await db.listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.posts,
      queries: [Query.equal("userId", userId), Query.orderDesc("$createdAt"), Query.limit(PAGE)],
    });
    return (page.rows as unknown as PostRow[]).map(toPostWire);
  } catch (error) {
    throw new Error(`Could not load generated posts: ${message(error)}`);
  }
}

export async function savePost(db: TablesDB, userId: string, input: PostInput): Promise<PostWire> {
  const data = {
    userId,
    automationId: input.automationId || null,
    title: input.title,
    slug: input.slug || null,
    bodyHtml: input.bodyHtml || null,
    bodyMarkdown: input.bodyMarkdown || null,
    excerpt: input.excerpt || null,
    metaDescription: input.metaDescription || null,
    keywords: input.keywords ?? [],
    sourceUrl: input.sourceUrl || null,
    sourceTitle: input.sourceTitle || null,
    state: input.state,
    remoteUrl: input.remoteUrl || null,
    quality: encodeJson(input.quality ?? null),
  };

  const row = input.id
    ? ((await db.updateRow({
        databaseId: DATABASE_ID,
        tableId: TABLES.posts,
        rowId: input.id,
        data,
      })) as unknown as PostRow)
    : ((await db.createRow({
        databaseId: DATABASE_ID,
        tableId: TABLES.posts,
        rowId: ID.unique(),
        data,
        permissions: ownerPermissions(userId),
      })) as unknown as PostRow);

  return toPostWire(row);
}

export async function deletePost(db: TablesDB, id: string): Promise<void> {
  await db.deleteRow({ databaseId: DATABASE_ID, tableId: TABLES.posts, rowId: id });
}
