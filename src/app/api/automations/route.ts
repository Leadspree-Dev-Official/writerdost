/**
 * The signed-in user's automations.
 *
 * Reads and writes go through a JWT-scoped TablesDB client, so Appwrite's row
 * permissions are the access control — this route never has to trust its own
 * filtering. The AI key an automation spends is encrypted before storage by
 * the repository and is never returned.
 */
import { NextResponse } from "next/server";
import { requireUser } from "@/lib/appwrite/session";
import { automationBackendReady } from "@/lib/automation/repository";
import { createAutomation, listAutomations } from "@/lib/automation/user-repository";
import type { AutomationInput } from "@/lib/automation/wire";

export const dynamic = "force-dynamic";

function notConfigured() {
  return NextResponse.json(
    { error: "Appwrite is not configured, so campaigns cannot be stored." },
    { status: 503 },
  );
}

function failed(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "The request failed." },
    { status: 500 },
  );
}

export async function GET(request: Request) {
  const { session, denied } = await requireUser(request);
  if (denied) return denied;
  if (!automationBackendReady()) return notConfigured();

  try {
    return NextResponse.json({ automations: await listAutomations(session.tables, session.user.id) });
  } catch (error) {
    return failed(error);
  }
}

export async function POST(request: Request) {
  const { session, denied } = await requireUser(request);
  if (denied) return denied;
  if (!automationBackendReady()) return notConfigured();

  try {
    const input = (await request.json()) as AutomationInput;
    const automation = await createAutomation(session.tables, session.user.id, input);
    return NextResponse.json({ automation }, { status: 201 });
  } catch (error) {
    return failed(error);
  }
}
