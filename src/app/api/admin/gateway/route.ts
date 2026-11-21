import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/appwrite/session";
import {
  getMaskedBizAiGatewayConfig,
  updateBizAiGatewayConfig,
  getGatewayAnalytics,
  resetGatewayAnalytics,
  hydrateGatewayConfigFromKv,
  persistGatewayConfigToKv,
  getBizAiGatewayConfig,
} from "@/lib/server-subscription-store";
import { DEFAULT_BIZAI_GATEWAY_CONFIG, type BizAiGatewayConfig } from "@/lib/store-types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { denied } = await requireAdmin(request);
  if (denied) return denied;

  try {
    await hydrateGatewayConfigFromKv();
    const config = getMaskedBizAiGatewayConfig();
    const analytics = getGatewayAnalytics();
    return NextResponse.json({
      config: config || DEFAULT_BIZAI_GATEWAY_CONFIG,
      analytics,
    });
  } catch (error) {
    return NextResponse.json(
      {
        config: DEFAULT_BIZAI_GATEWAY_CONFIG,
        analytics: getGatewayAnalytics(),
        error: error instanceof Error ? error.message : "Failed to load gateway config",
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  const { denied } = await requireAdmin(request);
  if (denied) return denied;

  try {
    await hydrateGatewayConfigFromKv();
    const body = (await request.json()) as Partial<BizAiGatewayConfig> & { action?: string };

    if (body.action === "reset_analytics") {
      const analytics = resetGatewayAnalytics();
      return NextResponse.json({ success: true, analytics });
    }

    const updates: Partial<BizAiGatewayConfig> = {};

    if (body.primaryProvider !== undefined) updates.primaryProvider = body.primaryProvider || undefined;
    if (body.primaryModel !== undefined) updates.primaryModel = body.primaryModel;
    if (body.primaryInstanceId !== undefined) updates.primaryInstanceId = body.primaryInstanceId || undefined;

    if (Array.isArray(body.instances)) {
      updates.instances = body.instances.map((inst) => ({
        id: String(inst.id || `inst_${inst.provider}_${Date.now()}`),
        provider: inst.provider,
        label: inst.label ? String(inst.label) : undefined,
        model: String(inst.model || ""),
        apiKey: typeof inst.apiKey === "string" ? inst.apiKey : "",
        customEndpoint: typeof inst.customEndpoint === "string" ? inst.customEndpoint : undefined,
        isFree: typeof inst.isFree === "boolean" ? inst.isFree : false,
        role: inst.role === "primary" ? "primary" : "standby",
        standbyPriority: typeof inst.standbyPriority === "number" ? inst.standbyPriority : undefined,
        tier: inst.tier === "primary" ? "primary" : inst.tier === "fallback" ? "fallback" : "unassigned",
        planTiers: Array.isArray(inst.planTiers) ? inst.planTiers : ["Free", "Basic", "Pro", "Enterprise"],
        fallbackTiers: Array.isArray(inst.fallbackTiers) ? inst.fallbackTiers.map(Number) : undefined,
        createdAt: typeof inst.createdAt === "number" ? inst.createdAt : Date.now(),
      }));
    }

    if (Array.isArray(body.configuredProviders)) {
      updates.configuredProviders = body.configuredProviders;
    }

    if (body.serverKeys && typeof body.serverKeys === "object") {
      updates.serverKeys = body.serverKeys;
    }

    if (body.customEndpoints && typeof body.customEndpoints === "object") {
      updates.customEndpoints = body.customEndpoints;
    }

    if (body.providerModels && typeof body.providerModels === "object") {
      updates.providerModels = body.providerModels;
    }

    if (body.freeProviders && typeof body.freeProviders === "object") {
      updates.freeProviders = body.freeProviders;
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
    const unmaskedConfig = getBizAiGatewayConfig();
    await persistGatewayConfigToKv(unmaskedConfig);
    const maskedConfig = getMaskedBizAiGatewayConfig();
    const analytics = getGatewayAnalytics();
    return NextResponse.json({ config: maskedConfig, analytics, success: true });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to update BizAI Gateway configuration" },
      { status: 500 }
    );
  }
}
