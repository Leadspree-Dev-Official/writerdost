/**
 * Publishing destinations for the signed-in user.
 *
 * The credential a destination carries (a WordPress application password, a
 * Ghost admin key) is encrypted with a server-held key before it is stored and
 * is never sent back. The browser learns only `secretSet`.
 */
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/appwrite/session";
import { automationBackendReady } from "@/lib/automation/repository";
import { createDestination, listDestinations } from "@/lib/automation/user-repository";
import { encryptionAvailable } from "@/lib/secure-store";
import type { DestinationInput } from "@/lib/automation/wire";

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
    return NextResponse.json({
      destinations: await listDestinations(session.tables, session.user.id),
    });
  } catch (error) {
    return failed(error);
  }
}

export async function POST(request: Request) {
  const { session, denied } = await requireUser(request);
  if (denied) return denied;

  const input = (await request.json()) as DestinationInput;

  // Refuse rather than store a token in the clear: a destination saved without
  // encryption would put a live publishing credential in the database.
  if (input.config?.secret && !encryptionAvailable()) {
    return NextResponse.json(
      { error: "WRITERDOST_ENCRYPTION_KEY is not set, so credentials cannot be stored." },
      { status: 503 },
    );
  }

  try {
    const destination = await createDestination(session.tables, session.user.id, input);
    return NextResponse.json({ destination }, { status: 201 });
  } catch (error) {
    return failed(error);
  }
}
