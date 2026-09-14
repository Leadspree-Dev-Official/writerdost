import { NextRequest, NextResponse } from "next/server";
import { guardRequest, readJsonBody } from "@/lib/api-guard";
import { checkCredentials, simulateLatency, type Credentials } from "@/lib/marketplace-mock";

/** Verifies marketplace credentials and returns the seller they belong to. */
export async function POST(req: NextRequest) {
  const blocked = guardRequest(req, { limit: 15 });
  if (blocked) return blocked;

  try {
    const body = await readJsonBody<Credentials>(req, 20_000);
    const checked = checkCredentials(body);
    if ("error" in checked) return checked.error;

    await simulateLatency(700);

    const { sellerId } = checked.ok;
    return NextResponse.json({
      seller: {
        sellerId,
        displayName: `${sellerId} store`,
        storeUrl: `https://bundlekart.market/s/${encodeURIComponent(sellerId)}`,
        plan: "Seller (mock)",
      },
      mock: true,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not reach the marketplace." },
      { status: 400 },
    );
  }
}
