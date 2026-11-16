import { NextResponse } from "next/server";
import { getContextRouting, updateContextRouting } from "@/lib/server-subscription-store";
import { DEFAULT_CONTEXT_ROUTING, type ContextRoutingConfig } from "@/lib/store-types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = getContextRouting();
    return NextResponse.json({ config: config || DEFAULT_CONTEXT_ROUTING });
  } catch {
    return NextResponse.json({ config: DEFAULT_CONTEXT_ROUTING });
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<ContextRoutingConfig>;
    const updates: Partial<ContextRoutingConfig> = {};

    if (typeof body.enabled === "boolean") updates.enabled = body.enabled;
    if (typeof body.thresholdTokens === "number" && body.thresholdTokens > 0) {
      updates.thresholdTokens = body.thresholdTokens;
    }
    if (typeof body.fallbackProvider === "string") {
      updates.fallbackProvider = body.fallbackProvider;
    }
    if (typeof body.fallbackModel === "string") {
      updates.fallbackModel = body.fallbackModel;
    }

    const updated = updateContextRouting(updates);
    return NextResponse.json({ config: updated, success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update context routing config" },
      { status: 500 }
    );
  }
}
