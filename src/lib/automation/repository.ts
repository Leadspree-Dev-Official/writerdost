/**
 * Supabase data access for the automation engine.
 *
 * Two clients, deliberately:
 *  - the request client carries the caller's JWT, so row level security
 *    decides what they can see;
 *  - the worker client uses the service-role key and bypasses RLS, because
 *    the scheduler acts for every user at once. It must never be reachable
 *    from the browser.
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { nextCronRun, nextRunFor } from "./schedule";
import { decryptSecret } from "@/lib/secure-store";
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

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || "";
const ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

/** True when Supabase is configured, so the UI can show a setup notice. */
export function automationBackendReady(): boolean {
  return Boolean(SUPABASE_URL && SERVICE_ROLE_KEY);
}

/** Service-role client. Server only — bypasses row level security. */
export function workerClient(): SupabaseClient {
  if (!automationBackendReady()) {
    throw new Error(
      "Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  return createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

/** Client scoped to one signed-in user; RLS applies. */
export function userClient(accessToken: string): SupabaseClient {
  if (!SUPABASE_URL || !ANON_KEY) {
    throw new Error("Supabase is not configured for browser access.");
  }
  return createClient(SUPABASE_URL, ANON_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${accessToken}` } },
  });
}

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
  id: string;
  name: string;
  kind: DestinationKind;
  config: Record<string, unknown>;
  secret_cipher: string | null;
};

type AutomationRow = {
  id: string;
  user_id: string;
  name: string;
  enabled: boolean;
  source_kind: AutomationSource;
  source_config: SourceConfig;
  content_config: Partial<ContentConfig>;
  ai_config: Partial<ApiSettings>;
  ai_secret_cipher: string | null;
  publish: PublishMode;
  frequency: AutomationFrequency;
  schedule_cron: string;
  timezone: string;
  last_run_at: string | null;
  next_run_at: string | null;
  destinations: DestinationRow | DestinationRow[] | null;
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
    id: row.id,
    name: row.name,
    kind: row.kind,
    config: row.config || {},
    secret: safeDecrypt(row.secret_cipher),
  };
}

/** Turns a joined DB row into the shape the pipeline expects. */
export function toAutomation(row: AutomationRow): Automation {
  const content = row.content_config || {};
  const ai = row.ai_config || {};

  // Supabase returns an embedded row as an object or a one-element array
  // depending on the relationship; normalise both.
  const destinationRow = Array.isArray(row.destinations)
    ? row.destinations[0] ?? null
    : row.destinations;

  return {
    id: row.id,
    userId: row.user_id,
    name: row.name,
    enabled: row.enabled,
    sourceKind: row.source_kind,
    sourceConfig: row.source_config || {},
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
      apiKey: safeDecrypt(row.ai_secret_cipher) || "",
      baseUrl: ai.baseUrl || "",
      model: ai.model || "",
      appName: ai.appName || "Writerdost AI",
      siteUrl: ai.siteUrl || "",
    },
    destination: toDestination(destinationRow),
    publish: row.publish,
    // Rows written before the frequency column existed default to daily,
    // which is what their cron already said.
    frequency: row.frequency ?? "daily",
    scheduleCron: row.schedule_cron,
    timezone: row.timezone,
    lastRunAt: row.last_run_at,
    nextRunAt: row.next_run_at,
  };
}

const AUTOMATION_SELECT = `
  id, user_id, name, enabled, source_kind, source_config, content_config,
  ai_config, ai_secret_cipher, publish, frequency, schedule_cron, timezone,
  last_run_at, next_run_at,
  destinations ( id, name, kind, config, secret_cipher )
`;

/* ------------------------------------------------------------------ */
/* Queries                                                             */
/* ------------------------------------------------------------------ */

/** Automations whose next run has come due. */
export async function findDueAutomations(limit = 5): Promise<Automation[]> {
  const db = workerClient();
  const { data, error } = await db
    .from("automations")
    .select(AUTOMATION_SELECT)
    .eq("enabled", true)
    .lte("next_run_at", new Date().toISOString())
    .order("next_run_at", { ascending: true })
    .limit(limit);

  if (error) throw new Error(`Could not load due automations: ${error.message}`);
  return (data as unknown as AutomationRow[]).map(toAutomation);
}

export async function loadAutomation(id: string): Promise<Automation | null> {
  const db = workerClient();
  const { data, error } = await db
    .from("automations")
    .select(AUTOMATION_SELECT)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Could not load automation: ${error.message}`);
  return data ? toAutomation(data as unknown as AutomationRow) : null;
}

/** URL hashes this automation has already written about. */
export async function loadSeenHashes(automationId: string): Promise<Set<string>> {
  const db = workerClient();
  const { data, error } = await db
    .from("seen_sources")
    .select("url_hash")
    .eq("automation_id", automationId)
    .order("seen_at", { ascending: false })
    .limit(2000);

  if (error) throw new Error(`Could not load dedupe history: ${error.message}`);
  return new Set((data || []).map((row) => (row as { url_hash: string }).url_hash));
}

export async function openRun(
  automation: Automation,
  trigger: "schedule" | "manual",
): Promise<string> {
  const db = workerClient();
  const { data, error } = await db
    .from("automation_runs")
    .insert({ automation_id: automation.id, user_id: automation.userId, trigger })
    .select("id")
    .single();

  if (error) throw new Error(`Could not start a run: ${error.message}`);
  return (data as { id: string }).id;
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
  const db = workerClient();

  if (outcome.posts.length > 0) {
    const rows = outcome.posts.map((entry) => ({
      automation_id: automation.id,
      run_id: runId,
      user_id: automation.userId,
      title: entry.post.title,
      slug: entry.post.slug,
      body_html: entry.post.bodyHtml,
      body_markdown: entry.post.bodyMarkdown,
      excerpt: entry.post.excerpt,
      meta_description: entry.post.metaDescription,
      keywords: entry.post.keywords,
      source_url: entry.post.sourceUrl ?? null,
      source_title: entry.post.sourceTitle ?? null,
      state: entry.state,
      remote_id: entry.remoteId ?? null,
      remote_url: entry.remoteUrl ?? null,
      quality: entry.quality as unknown as Record<string, unknown>,
    }));

    const { error } = await db.from("generated_posts").insert(rows);
    if (error) throw new Error(`Could not save generated posts: ${error.message}`);

    // Mark sources as handled only once the post is safely stored, so a crash
    // mid-run leaves the item to be retried rather than silently skipped.
    const seen = outcome.posts
      .filter((entry) => entry.state !== "failed")
      .map((entry) => ({
        automation_id: automation.id,
        url_hash: entry.sourceHash,
        url: entry.post.sourceUrl || `topic:${entry.post.title}`,
      }));

    if (seen.length > 0) {
      await db.from("seen_sources").upsert(seen, { onConflict: "automation_id,url_hash" });
    }
  }

  await db
    .from("automation_runs")
    .update({
      status: outcome.status,
      detail: outcome.detail,
      tokens_used: outcome.tokens,
      finished_at: new Date().toISOString(),
    })
    .eq("id", runId);

  const now = new Date();
  const next = nextRunFor({ ...automation, lastRunAt: now.toISOString() }, now);
  await db
    .from("automations")
    .update({
      last_run_at: now.toISOString(),
      next_run_at: next?.toISOString() ?? null,
      ...(next ? {} : { enabled: false }),
    })
    .eq("id", automation.id);
}

/** Records a run that failed before the pipeline produced anything. */
export async function failRun(
  automation: Automation,
  runId: string,
  message: string,
): Promise<void> {
  const db = workerClient();
  const now = new Date();

  await db
    .from("automation_runs")
    .update({ status: "error", detail: message, finished_at: now.toISOString() })
    .eq("id", runId);

  // Still advance the schedule, otherwise a permanently broken automation is
  // retried on every tick forever.
  await db
    .from("automations")
    .update({
      last_run_at: now.toISOString(),
      next_run_at: nextRunAt(automation.scheduleCron, automation.timezone, now)?.toISOString() ?? null,
    })
    .eq("id", automation.id);
}

export type StoredPost = GeneratedPost & {
  id: string;
  state: string;
  remoteUrl?: string;
  quality: QualityReport;
  createdAt: string;
};
