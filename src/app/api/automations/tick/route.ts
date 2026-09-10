/**
 * The scheduler entry point.
 *
 * pg_cron pokes this every five minutes; this route decides which automations
 * are actually due and runs them. Keeping the decision here means one cron
 * entry to operate instead of one per automation.
 *
 * Authentication is a shared secret, NOT a user session — the caller is a
 * database job, not a browser.
 */
import { NextResponse } from "next/server";
import { timingSafeEqual } from "node:crypto";
import {
  closeRun,
  failRun,
  findDueAutomations,
  loadSeenHashes,
  openRun,
  automationBackendReady,
} from "@/lib/automation/repository";
import { runAutomation } from "@/lib/automation/pipeline";
import type { Automation } from "@/lib/automation/types";

// Drafting several posts takes minutes, not seconds.
export const maxDuration = 300;
export const dynamic = "force-dynamic";

/** How many automations one tick will process, to bound the runtime. */
const MAX_PER_TICK = 3;

/** Constant-time compare so the secret cannot be guessed by timing. */
function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function authorize(request: Request): NextResponse | null {
  const expected = process.env.WRITERDOST_CRON_SECRET || "";
  if (!expected) {
    return NextResponse.json(
      { error: "WRITERDOST_CRON_SECRET is not set, so the scheduler is disabled." },
      { status: 503 },
    );
  }

  const provided =
    request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";

  if (!provided || !secretMatches(provided, expected)) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  return null;
}

/** Runs one automation, recording the result whatever happens. */
async function execute(automation: Automation, trigger: "schedule" | "manual") {
  const runId = await openRun(automation, trigger);

  try {
    const seen = await loadSeenHashes(automation.id);
    const outcome = await runAutomation(automation, seen);
    await closeRun(automation, runId, outcome);

    return {
      automation: automation.name,
      status: outcome.status,
      detail: outcome.detail,
      posts: outcome.posts.length,
      tokens: outcome.tokens,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "The run failed.";
    await failRun(automation, runId, message);
    return { automation: automation.name, status: "error" as const, detail: message };
  }
}

export async function POST(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;

  if (!automationBackendReady()) {
    return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  }

  try {
    const due = await findDueAutomations(MAX_PER_TICK);

    if (due.length === 0) {
      return NextResponse.json({ ran: 0, results: [] });
    }

    // Sequential on purpose: these calls spend the user's AI credits, and
    // running several book-length jobs at once is how you blow a rate limit.
    const results = [];
    for (const automation of due) {
      results.push(await execute(automation, "schedule"));
    }

    return NextResponse.json({ ran: results.length, results });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The scheduler failed." },
      { status: 500 },
    );
  }
}

/** Health check, so you can confirm the secret works without firing a run. */
export async function GET(request: Request) {
  const denied = authorize(request);
  if (denied) return denied;

  return NextResponse.json({
    ok: true,
    backendConfigured: automationBackendReady(),
    checkedAt: new Date().toISOString(),
  });
}
