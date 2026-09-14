/**
 * One automation.
 *
 * Ownership is not checked here on purpose: the JWT-scoped client can only
 * reach rows whose permissions name this user, so a request for someone
 * else's campaign fails inside Appwrite as a 404 rather than being caught by
 * a comparison this file could get wrong.
 *
 * Note the static siblings — `preview`, `tick` — win over this dynamic segment
 * in Next's router, which is correct: Appwrite ids are random and never
 * collide with those words.
 */
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/appwrite/session";
import { deleteAutomation, updateAutomation } from "@/lib/automation/user-repository";
import type { AutomationInput } from "@/lib/automation/wire";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

function failed(error: unknown) {
  const code = (error as { code?: number })?.code;
  if (code === 404) {
    return NextResponse.json({ error: "That campaign no longer exists." }, { status: 404 });
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "The request failed." },
    { status: 500 },
  );
}

export async function PATCH(request: Request, { params }: Context) {
  const { session, denied } = await requireUser(request);
  if (denied) return denied;

  try {
    const { id } = await params;
    const input = (await request.json()) as AutomationInput;
    return NextResponse.json({ automation: await updateAutomation(session.tables, id, input) });
  } catch (error) {
    return failed(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const { session, denied } = await requireUser(request);
  if (denied) return denied;

  try {
    const { id } = await params;
    await deleteAutomation(session.tables, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failed(error);
  }
}
