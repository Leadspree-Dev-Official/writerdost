import { NextResponse } from "next/server";
import { getMaskedBizAiGatewayConfig, updateBizAiGatewayConfig } from "@/lib/server-subscription-store";
import { DEFAULT_BIZAI_GATEWAY_CONFIG, type BizAiGatewayConfig } from "@/lib/store-types";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const config = getMaskedBizAiGatewayConfig();
    return NextResponse.json({ config: config || DEFAULT_BIZAI_GATEWAY_CONFIG });
  } catch (error) {
    return NextResponse.json(
      { config: DEFAULT_BIZAI_GATEWAY_CONFIG, error: error instanceof Error ? error.message : "Failed to load gateway config" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Partial<BizAiGatewayConfig>;
    const updates: Partial<BizAiGatewayConfig> = {};

    if (body.primaryProvider) updates.primaryProvider = body.primaryProvider;
    if (body.primaryModel) updates.primaryModel = body.primaryModel;

    if (body.serverKeys && typeof body.serverKeys === "object") {
      updates.serverKeys = body.serverKeys;
    }

    if (typeof body.failoverEnabled === "boolean") {
      updates.failoverEnabled = body.failoverEnabled;
    }

    if (body.failoverTriggers && typeof body.failoverTriggers === "object") {
      updates.failoverTriggers = {
        rateLimit429: Boolean(body.failoverTriggers.rateLimit429),
        serverErrors5xx: Boolean(body.failoverTriggers.serverErrors5xx),
        timeout: Boolean(body.failoverTriggers.timeout),
      };
    }

    if (Array.isArray(body.fallbacks)) {
      updates.fallbacks = body.fallbacks.map((tier) => ({
        enabled: Boolean(tier.enabled),
        provider: tier.provider,
        model: tier.model,
        label: tier.label || "Fallback Tier",
      }));
    }

    if (typeof body.contextThresholdEnabled === "boolean") {
      updates.contextThresholdEnabled = body.contextThresholdEnabled;
    }
    if (typeof body.contextThresholdTokens === "number" && body.contextThresholdTokens > 0) {
      updates.contextThresholdTokens = body.contextThresholdTokens;
    }
    if (body.contextFallbackProvider) {
      updates.contextFallbackProvider = body.contextFallbackProvider;
    }
    if (body.contextFallbackModel) {
      updates.contextFallbackModel = body.contextFallbackModel;
    }

    updateBizAiGatewayConfig(updates);
    const maskedConfig = getMaskedBizAiGatewayConfig();
    return NextResponse.json({ config: maskedConfig, success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update BizAI Gateway configuration" },
      { status: 500 }
    );
  }
}
