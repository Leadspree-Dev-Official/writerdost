/** One destination. Row permissions decide reachability; see the list route. */
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/appwrite/session";
import { deleteDestination, updateDestination } from "@/lib/automation/user-repository";
import { encryptionAvailable } from "@/lib/secure-store";
import type { DestinationInput } from "@/lib/automation/wire";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

function failed(error: unknown) {
  const code = (error as { code?: number })?.code;
  if (code === 404) {
    return NextResponse.json({ error: "That destination no longer exists." }, { status: 404 });
  }
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "The request failed." },
    { status: 500 },
  );
}

export async function PUT(request: Request, { params }: Context) {
  const { session, denied } = await requireUser(request);
  if (denied) return denied;

  const input = (await request.json()) as DestinationInput;
  if (input.config?.secret && !encryptionAvailable()) {
    return NextResponse.json(
      { error: "WRITERDOST_ENCRYPTION_KEY is not set, so credentials cannot be stored." },
      { status: 503 },
    );
  }

  try {
    const { id } = await params;
    return NextResponse.json({ destination: await updateDestination(session.tables, id, input) });
  } catch (error) {
    return failed(error);
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const { session, denied } = await requireUser(request);
  if (denied) return denied;

  try {
    const { id } = await params;
    await deleteDestination(session.tables, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    return failed(error);
  }
}
