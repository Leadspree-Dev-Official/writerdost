import { NextRequest, NextResponse } from "next/server";
import { guardRequest, readJsonBody } from "@/lib/api-guard";
import { checkCredentials, simulateLatency, type Credentials } from "@/lib/marketplace-mock";

/** Takes a listing off the storefront. The project itself is untouched. */
export async function POST(req: NextRequest) {
  const blocked = guardRequest(req, { limit: 10 });
  if (blocked) return blocked;

  try {
    const body = await readJsonBody<Credentials & { listingId?: unknown }>(req, 20_000);
    const checked = checkCredentials(body);
    if ("error" in checked) return checked.error;

    const listingId = typeof body.listingId === "string" ? body.listingId.trim() : "";
    if (!listingId) {
      return NextResponse.json({ error: "Missing listing id." }, { status: 422 });
    }

    await simulateLatency(600);
    return NextResponse.json({ listingId, mock: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not remove the listing." },
      { status: 400 },
    );
  }
}
