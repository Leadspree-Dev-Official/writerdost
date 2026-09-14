/**
 * Generated posts for the signed-in user.
 *
 * Both the scheduler and the browser write here: the scheduler through the
 * worker client when a run finishes, the browser through this route when a
 * preview is kept. Both stamp the same per-row owner permissions, so a post
 * reads the same either way.
 */
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/appwrite/session";
import { automationBackendReady } from "@/lib/automation/repository";
import { listPosts, savePost } from "@/lib/automation/user-repository";
import type { PostInput } from "@/lib/automation/wire";

export const dynamic = "force-dynamic";

function failed(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "The request failed." },
    { status: 500 },
  );
}

export async function GET(request: Request) {
  const { session, denied } = await requireUser(request);
  if (denied) return denied;
  if (!automationBackendReady()) {
    return NextResponse.json({ error: "Appwrite is not configured." }, { status: 503 });
  }

  try {
    return NextResponse.json({ posts: await listPosts(session.tables, session.user.id) });
  } catch (error) {
    return failed(error);
  }
}

export async function POST(request: Request) {
  const { session, denied } = await requireUser(request);
  if (denied) return denied;

  try {
    const input = (await request.json()) as PostInput;
    return NextResponse.json({ post: await savePost(session.tables, session.user.id, input) });
  } catch (error) {
    return failed(error);
  }
}
