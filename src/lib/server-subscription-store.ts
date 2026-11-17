import {
  Coupon,
  DEFAULT_FOUNDER_CAMPAIGN,
  DEFAULT_CONTEXT_ROUTING,
  DEFAULT_BIZAI_GATEWAY_CONFIG,
  FounderCampaignConfig,
  ContextRoutingConfig,
  BizAiGatewayConfig,
  ReferralRecord,
  SubscriptionOrder,
} from "./store-types";
import { DEFAULT_COUPONS } from "./subscription-service";

// In-memory persistent server state
declare global {
  var __writerdost_coupons: Coupon[] | undefined;
  var __writerdost_referrals: ReferralRecord[] | undefined;
  var __writerdost_subscriptions: SubscriptionOrder[] | undefined;
  var __writerdost_founder_campaign: FounderCampaignConfig | undefined;
  var __writerdost_context_routing: ContextRoutingConfig | undefined;
  var __writerdost_bizai_gateway: BizAiGatewayConfig | undefined;
}

if (!globalThis.__writerdost_bizai_gateway) {
  globalThis.__writerdost_bizai_gateway = { ...DEFAULT_BIZAI_GATEWAY_CONFIG };
}

if (!globalThis.__writerdost_context_routing) {
  globalThis.__writerdost_context_routing = { ...DEFAULT_CONTEXT_ROUTING };
}

if (!globalThis.__writerdost_founder_campaign) {
  globalThis.__writerdost_founder_campaign = { ...DEFAULT_FOUNDER_CAMPAIGN };
}

if (!globalThis.__writerdost_coupons) {
  globalThis.__writerdost_coupons = [...DEFAULT_COUPONS];
}

if (!globalThis.__writerdost_referrals) {
  globalThis.__writerdost_referrals = [];
}

if (!globalThis.__writerdost_subscriptions) {
  globalThis.__writerdost_subscriptions = [];
}

export function getAllCoupons(): Coupon[] {
  if (!globalThis.__writerdost_coupons || globalThis.__writerdost_coupons.length === 0) {
    globalThis.__writerdost_coupons = [...DEFAULT_COUPONS];
  }
  // Ensure default coupons like WELCOME20 and WELCOME50 are present
  for (const def of DEFAULT_COUPONS) {
    if (!globalThis.__writerdost_coupons.some((c) => c.code === def.code)) {
      globalThis.__writerdost_coupons.push(def);
    }
  }
  return globalThis.__writerdost_coupons || [];
}

export function addCoupon(coupon: Coupon): Coupon {
  globalThis.__writerdost_coupons = [coupon, ...(globalThis.__writerdost_coupons || [])];
  return coupon;
}

export function updateCoupon(id: string, updates: Partial<Coupon>): Coupon | null {
  const coupons = globalThis.__writerdost_coupons || [];
  const idx = coupons.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const updated = { ...coupons[idx], ...updates };
  coupons[idx] = updated;
  globalThis.__writerdost_coupons = coupons;
  return updated;
}

export function deleteCoupon(id: string): boolean {
  const coupons = globalThis.__writerdost_coupons || [];
  const next = coupons.filter((c) => c.id !== id);
  if (next.length === coupons.length) return false;
  globalThis.__writerdost_coupons = next;
  return true;
}

export function getAllReferrals(): ReferralRecord[] {
  return globalThis.__writerdost_referrals || [];
}

export function addReferral(record: ReferralRecord): ReferralRecord {
  globalThis.__writerdost_referrals = [record, ...(globalThis.__writerdost_referrals || [])];
  return record;
}

export function getUserReferrals(userId: string): ReferralRecord[] {
  return (globalThis.__writerdost_referrals || []).filter(
    (r) => r.referrerUserId === userId
  );
}

export function getAllSubscriptions(): SubscriptionOrder[] {
  return globalThis.__writerdost_subscriptions || [];
}

export function getUserSubscriptions(userId: string): SubscriptionOrder[] {
  return (globalThis.__writerdost_subscriptions || []).filter(
    (s) => s.userId === userId
  );
}

export function addSubscription(order: SubscriptionOrder): SubscriptionOrder {
  globalThis.__writerdost_subscriptions = [order, ...(globalThis.__writerdost_subscriptions || [])];
  return order;
}

export function getFounderCampaign(): FounderCampaignConfig {
  const config = globalThis.__writerdost_founder_campaign || { ...DEFAULT_FOUNDER_CAMPAIGN };
  
  // Calculate rolling cycle if autoRenew is enabled
  if (config.isEnabled && config.autoRenew && config.durationDays > 0) {
    const cycleMs = config.durationDays * 24 * 60 * 60 * 1000;
    const startTime = new Date(config.cycleStartedAt).getTime();
    const now = Date.now();
    const elapsed = now - startTime;
    
    if (elapsed > cycleMs) {
      // Advance cycle
      const cyclesPassed = Math.floor(elapsed / cycleMs);
      const newStart = new Date(startTime + cyclesPassed * cycleMs).toISOString();
      config.cycleStartedAt = newStart;
      globalThis.__writerdost_founder_campaign = config;
    }
  }

  return config;
}

export function updateFounderCampaign(updates: Partial<FounderCampaignConfig>): FounderCampaignConfig {
  const current = getFounderCampaign();
  const next: FounderCampaignConfig = {
    ...current,
    ...updates,
  };
  globalThis.__writerdost_founder_campaign = next;
  return next;
}

export function getBizAiGatewayConfig(): BizAiGatewayConfig {
  if (!globalThis.__writerdost_bizai_gateway) {
    globalThis.__writerdost_bizai_gateway = { ...DEFAULT_BIZAI_GATEWAY_CONFIG };
  }
  return globalThis.__writerdost_bizai_gateway;
}

export function getMaskedBizAiGatewayConfig(): BizAiGatewayConfig {
  const config = getBizAiGatewayConfig();
  const maskedKeys: Record<string, string> = {};

  const providers = ["anthropic", "openai", "gemini", "deepseek", "groq", "commandcode", "openrouter"] as const;
  for (const p of providers) {
    const directKey = config.serverKeys?.[p];
    const envKey =
      p === "anthropic" ? process.env.ANTHROPIC_API_KEY :
      p === "openai" ? process.env.OPENAI_API_KEY :
      p === "gemini" ? process.env.GEMINI_API_KEY :
      p === "deepseek" ? process.env.DEEPSEEK_API_KEY :
      p === "groq" ? process.env.GROQ_API_KEY :
      p === "commandcode" ? process.env.COMMANDCODE_API_KEY :
      p === "openrouter" ? process.env.OPENROUTER_API_KEY : "";

    const activeKey = directKey || envKey || "";
    if (activeKey) {
      if (activeKey.length > 8) {
        maskedKeys[p] = `${activeKey.slice(0, 4)}••••••••${activeKey.slice(-4)}`;
      } else {
        maskedKeys[p] = "••••••••";
      }
    } else {
      maskedKeys[p] = "";
    }
  }

  return {
    ...config,
    serverKeys: maskedKeys,
  };
}

export function updateBizAiGatewayConfig(updates: Partial<BizAiGatewayConfig>): BizAiGatewayConfig {
  const current = getBizAiGatewayConfig();

  const updatedKeys = { ...current.serverKeys };
  if (updates.serverKeys) {
    for (const [k, v] of Object.entries(updates.serverKeys)) {
      const keyName = k as keyof BizAiGatewayConfig["serverKeys"];
      if (typeof v === "string") {
        const trimmed = v.trim();
        // If empty string or includes bullets (masked indicator), don't overwrite if it was already set
        if (trimmed.includes("••••")) {
          continue;
        }
        updatedKeys[keyName] = trimmed;
      }
    }
  }

  const next: BizAiGatewayConfig = {
    ...current,
    ...updates,
    serverKeys: updatedKeys,
  };

  globalThis.__writerdost_bizai_gateway = next;

  // Keep context routing synchronized
  if (updates.contextThresholdEnabled !== undefined || updates.contextThresholdTokens !== undefined || updates.contextFallbackProvider !== undefined || updates.contextFallbackModel !== undefined) {
    globalThis.__writerdost_context_routing = {
      enabled: next.contextThresholdEnabled,
      thresholdTokens: next.contextThresholdTokens,
      fallbackProvider: next.contextFallbackProvider,
      fallbackModel: next.contextFallbackModel,
    };
  }

  return next;
}

export function getContextRouting(): ContextRoutingConfig {
  const gateway = getBizAiGatewayConfig();
  return {
    enabled: gateway.contextThresholdEnabled,
    thresholdTokens: gateway.contextThresholdTokens,
    fallbackProvider: gateway.contextFallbackProvider,
    fallbackModel: gateway.contextFallbackModel,
  };
}

export function updateContextRouting(updates: Partial<ContextRoutingConfig>): ContextRoutingConfig {
  const current = getBizAiGatewayConfig();
  const next = updateBizAiGatewayConfig({
    contextThresholdEnabled: updates.enabled !== undefined ? updates.enabled : current.contextThresholdEnabled,
    contextThresholdTokens: updates.thresholdTokens !== undefined ? updates.thresholdTokens : current.contextThresholdTokens,
    contextFallbackProvider: updates.fallbackProvider !== undefined ? updates.fallbackProvider : current.contextFallbackProvider,
    contextFallbackModel: updates.fallbackModel !== undefined ? updates.fallbackModel : current.contextFallbackModel,
  });
  return {
    enabled: next.contextThresholdEnabled,
    thresholdTokens: next.contextThresholdTokens,
    fallbackProvider: next.contextFallbackProvider,
    fallbackModel: next.contextFallbackModel,
  };
}
