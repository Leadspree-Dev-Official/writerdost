/**
 * The signed-in user's workspace.
 *
 * GET returns the whole thing on sign-in; PUT saves a patch — the settings
 * blob, whichever manuscripts changed, and the ids of any that were deleted.
 * The store calls PUT on a debounce, so this route sees one write per pause in
 * typing rather than one per keystroke.
 *
 * Both act through the caller's own JWT, so Appwrite's row permissions decide
 * what is reachable.
 */
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/appwrite/session";
import { appwritePublicConfigured } from "@/lib/appwrite/server";
import { loadWorkspace, saveWorkspace } from "@/lib/workspace/repository";
import type { WorkspacePatch } from "@/lib/workspace/wire";

export const dynamic = "force-dynamic";

/** A whole workspace, including manuscripts. Large, but bounded by the plan. */
const MAX_BODY_BYTES = 24_000_000;

function failed(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "The request failed." },
    { status: 500 },
  );
}

export async function GET(request: Request) {
  const { session, denied } = await requireUser(request);
  if (denied) return denied;

  if (!appwritePublicConfigured()) {
    return NextResponse.json({ error: "Appwrite is not configured." }, { status: 503 });
  }

  try {
    return NextResponse.json(await loadWorkspace(session.tables, session.user.id));
  } catch (error) {
    return failed(error);
  }
}

export async function PUT(request: Request) {
  const { session, denied } = await requireUser(request);
  if (denied) return denied;

  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > MAX_BODY_BYTES) {
    return NextResponse.json({ error: "That workspace is too large to save." }, { status: 413 });
  }

  try {
    const patch = (await request.json()) as WorkspacePatch;
    const { secretsDropped } = await saveWorkspace(session.tables, session.user.id, patch);
    return NextResponse.json({ saved: true, secretsDropped });
  } catch (error) {
    return failed(error);
  }
}
