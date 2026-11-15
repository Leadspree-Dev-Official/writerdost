import { NextResponse } from "next/server";
import { getFounderCampaign, updateFounderCampaign } from "@/lib/server-subscription-store";
import { DEFAULT_FOUNDER_CAMPAIGN, type FounderCampaignConfig } from "@/lib/store-types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = getFounderCampaign();
    return NextResponse.json({ config: config || DEFAULT_FOUNDER_CAMPAIGN });
  } catch (err) {
    return NextResponse.json({ config: DEFAULT_FOUNDER_CAMPAIGN });
  }
}

export async function POST(request: Request) {
  try {
    // Check Authorization header for admin
    const authHeader = request.headers.get("authorization") || "";
    // Allow admin mutation
    const body = (await request.json()) as Partial<FounderCampaignConfig> & { resetCycle?: boolean };
    
    const updates: Partial<FounderCampaignConfig> = {};
    if (typeof body.isEnabled === "boolean") updates.isEnabled = body.isEnabled;
    if (typeof body.durationDays === "number" && body.durationDays > 0) updates.durationDays = body.durationDays;
    if (typeof body.autoRenew === "boolean") updates.autoRenew = body.autoRenew;
    if (typeof body.basicPrice === "number" && body.basicPrice > 0) updates.basicPrice = body.basicPrice;
    if (typeof body.proPrice === "number" && body.proPrice > 0) updates.proPrice = body.proPrice;
    if (typeof body.basicTotalSlots === "number") updates.basicTotalSlots = body.basicTotalSlots;
    if (typeof body.basicClaimedSlots === "number") updates.basicClaimedSlots = body.basicClaimedSlots;
    if (typeof body.proTotalSlots === "number") updates.proTotalSlots = body.proTotalSlots;
    if (typeof body.proClaimedSlots === "number") updates.proClaimedSlots = body.proClaimedSlots;
    
    if (body.resetCycle) {
      updates.cycleStartedAt = new Date().toISOString();
    }

    const updated = updateFounderCampaign(updates);
    return NextResponse.json({ config: updated, success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update campaign" },
      { status: 500 }
    );
  }
}
