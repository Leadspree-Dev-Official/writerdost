/** Deleting one generated post. */
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/appwrite/session";
import { deletePost } from "@/lib/automation/user-repository";

export const dynamic = "force-dynamic";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { session, denied } = await requireUser(request);
  if (denied) return denied;

  try {
    const { id } = await params;
    await deletePost(session.tables, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const code = (error as { code?: number })?.code;
    if (code === 404) return NextResponse.json({ ok: true });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The request failed." },
      { status: 500 },
    );
  }
}
