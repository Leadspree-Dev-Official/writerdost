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
  GatewayAnalytics,
  GatewayProviderMetric,
  GatewayFallbackTier,
  ApiProvider,
  UserPlan,
} from "./store-types";
import { DEFAULT_COUPONS } from "./subscription-service";
import { getModelDefaultRates } from "./ai-providers";
import { DATABASE_ID, TABLES, workerTables, Query, ID, ownerPermissions } from "./appwrite/server";

type SubscriptionRow = {
  $id: string;
  userId: string;
  userEmail: string;
  plan: string;
  billingInterval: "monthly" | "yearly";
  amountPaid: number;
  currency: string;
  couponCode?: string | null;
  discountAmount?: number | null;
  referralCode?: string | null;
  paymentProvider: "simulated" | "paypal" | "stripe";
  status: "active" | "cancelled" | "expired";
  startDate: string;
  renewDate: string;
  $createdAt: string;
};

type CouponRow = {
  $id: string;
  code: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  validUntil?: string | null;
  maxUses?: number | null;
  timesUsed: number;
  isActive: boolean;
  minPlan?: string | null;
  $createdAt: string;
};

type ReferralRow = {
  $id: string;
  referrerUserId: string;
  referrerCode: string;
  refereeUserId: string;
  refereeEmail?: string | null;
  plan: string;
  discountApplied: number;
  status: "pending" | "completed";
  $createdAt: string;
};

function toSubscription(row: SubscriptionRow): SubscriptionOrder {
  return {
    id: row.$id,
    userId: row.userId,
    userEmail: row.userEmail,
    plan: row.plan as UserPlan,
    billingInterval: row.billingInterval,
    amountPaid: Number(row.amountPaid),
    currency: row.currency,
    couponCode: row.couponCode || undefined,
    discountAmount: row.discountAmount != null ? Number(row.discountAmount) : undefined,
    referralCode: row.referralCode || undefined,
    paymentProvider: row.paymentProvider,
    status: row.status,
    startDate: row.startDate,
    renewDate: row.renewDate,
    createdAt: row.$createdAt,
  };
}

function toCoupon(row: CouponRow): Coupon {
  return {
    id: row.$id,
    code: row.code,
    discountType: row.discountType,
    discountValue: Number(row.discountValue),
    validUntil: row.validUntil || null,
    maxUses: row.maxUses != null ? Number(row.maxUses) : null,
    timesUsed: Number(row.timesUsed || 0),
    isActive: Boolean(row.isActive),
    minPlan: (row.minPlan as UserPlan) || undefined,
    createdAt: row.$createdAt,
  };
}

function toReferral(row: ReferralRow): ReferralRecord {
  return {
    id: row.$id,
    referrerUserId: row.referrerUserId,
    referrerCode: row.referrerCode,
    refereeUserId: row.refereeUserId,
    refereeEmail: row.refereeEmail || undefined,
    plan: row.plan as UserPlan,
    discountApplied: Number(row.discountApplied),
    status: row.status,
    createdAt: row.$createdAt,
  };
}

// In-memory persistent server state
declare global {
  var __writerdost_coupons: Coupon[] | undefined;
  var __writerdost_referrals: ReferralRecord[] | undefined;
  var __writerdost_subscriptions: SubscriptionOrder[] | undefined;
  var __writerdost_founder_campaign: FounderCampaignConfig | undefined;
  var __writerdost_context_routing: ContextRoutingConfig | undefined;
  var __writerdost_bizai_gateway: BizAiGatewayConfig | undefined;
  var __writerdost_gateway_analytics: GatewayAnalytics | undefined;
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

export async function getAllCoupons(): Promise<Coupon[]> {
  try {
    const res = await workerTables().listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.coupons,
      queries: [Query.limit(100)],
    });
    const rows = res.rows as unknown as CouponRow[];
    if (rows.length > 0) {
      const coupons = rows.map(toCoupon);
      globalThis.__writerdost_coupons = coupons;
      return coupons;
    }
    // Seed default coupons into Appwrite if empty
    for (const def of DEFAULT_COUPONS) {
      await addCoupon(def);
    }
  } catch {
    // Non-blocking fallback to in-memory
  }

  if (!globalThis.__writerdost_coupons || globalThis.__writerdost_coupons.length === 0) {
    globalThis.__writerdost_coupons = [...DEFAULT_COUPONS];
  }
  for (const def of DEFAULT_COUPONS) {
    if (!globalThis.__writerdost_coupons.some((c) => c.code === def.code)) {
      globalThis.__writerdost_coupons.push(def);
    }
  }
  return globalThis.__writerdost_coupons || [];
}

export async function addCoupon(coupon: Coupon): Promise<Coupon> {
  const rowId = (coupon.id || ID.unique()).slice(0, 36).replace(/[^a-zA-Z0-9._-]/g, "");
  try {
    const created = await workerTables().createRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.coupons,
      rowId,
      data: {
        code: coupon.code,
        discountType: coupon.discountType,
        discountValue: coupon.discountValue,
        validUntil: coupon.validUntil || null,
        maxUses: coupon.maxUses != null ? coupon.maxUses : null,
        timesUsed: coupon.timesUsed || 0,
        isActive: coupon.isActive !== false,
        minPlan: coupon.minPlan || null,
      },
      permissions: [],
    });
    const saved = toCoupon(created as unknown as CouponRow);
    globalThis.__writerdost_coupons = [saved, ...(globalThis.__writerdost_coupons || []).filter((c) => c.id !== saved.id)];
    return saved;
  } catch {
    // Fallback
  }
  const fallback = { ...coupon, id: rowId };
  globalThis.__writerdost_coupons = [fallback, ...(globalThis.__writerdost_coupons || []).filter((c) => c.id !== fallback.id)];
  return fallback;
}

export async function updateCoupon(id: string, updates: Partial<Coupon>): Promise<Coupon | null> {
  try {
    const data: Record<string, unknown> = {};
    if (updates.code) data.code = updates.code;
    if (updates.discountType) data.discountType = updates.discountType;
    if (updates.discountValue != null) data.discountValue = updates.discountValue;
    if (updates.validUntil !== undefined) data.validUntil = updates.validUntil;
    if (updates.maxUses !== undefined) data.maxUses = updates.maxUses;
    if (updates.timesUsed !== undefined) data.timesUsed = updates.timesUsed;
    if (updates.isActive !== undefined) data.isActive = updates.isActive;
    if (updates.minPlan !== undefined) data.minPlan = updates.minPlan;

    const updatedRow = await workerTables().updateRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.coupons,
      rowId: id,
      data,
    });
    const saved = toCoupon(updatedRow as unknown as CouponRow);
    globalThis.__writerdost_coupons = (globalThis.__writerdost_coupons || []).map((c) => (c.id === id ? saved : c));
    return saved;
  } catch {
    // Fallback
  }
  const coupons = globalThis.__writerdost_coupons || [];
  const idx = coupons.findIndex((c) => c.id === id);
  if (idx === -1) return null;
  const updated = { ...coupons[idx], ...updates };
  coupons[idx] = updated;
  globalThis.__writerdost_coupons = coupons;
  return updated;
}

export async function deleteCoupon(id: string): Promise<boolean> {
  try {
    await workerTables().deleteRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.coupons,
      rowId: id,
    });
  } catch {
    // Fallback
  }
  const coupons = globalThis.__writerdost_coupons || [];
  const next = coupons.filter((c) => c.id !== id);
  if (next.length === coupons.length) return false;
  globalThis.__writerdost_coupons = next;
  return true;
}

export async function getAllReferrals(): Promise<ReferralRecord[]> {
  try {
    const res = await workerTables().listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.referrals,
      queries: [Query.orderDesc("$createdAt"), Query.limit(100)],
    });
    const referrals = (res.rows as unknown as ReferralRow[]).map(toReferral);
    globalThis.__writerdost_referrals = referrals;
    return referrals;
  } catch {
    // Fallback
  }
  return globalThis.__writerdost_referrals || [];
}

export async function getUserReferrals(userId: string): Promise<ReferralRecord[]> {
  try {
    const res = await workerTables().listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.referrals,
      queries: [
        Query.equal("referrerUserId", userId),
        Query.orderDesc("$createdAt"),
        Query.limit(100),
      ],
    });
    return (res.rows as unknown as ReferralRow[]).map(toReferral);
  } catch {
    // Fallback
  }
  return (globalThis.__writerdost_referrals || []).filter(
    (r) => r.referrerUserId === userId
  );
}

export async function addReferral(record: ReferralRecord): Promise<ReferralRecord> {
  const rowId = (record.id || ID.unique()).slice(0, 36).replace(/[^a-zA-Z0-9._-]/g, "");
  try {
    const created = await workerTables().createRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.referrals,
      rowId,
      data: {
        referrerUserId: record.referrerUserId,
        referrerCode: record.referrerCode,
        refereeUserId: record.refereeUserId,
        refereeEmail: record.refereeEmail || null,
        plan: record.plan,
        discountApplied: record.discountApplied,
        status: record.status,
      },
      permissions: ownerPermissions(record.refereeUserId),
    });
    const saved = toReferral(created as unknown as ReferralRow);
    globalThis.__writerdost_referrals = [saved, ...(globalThis.__writerdost_referrals || [])];
    return saved;
  } catch {
    // Fallback
  }
  const fallback = { ...record, id: rowId };
  globalThis.__writerdost_referrals = [fallback, ...(globalThis.__writerdost_referrals || [])];
  return fallback;
}

export async function getAllSubscriptions(): Promise<SubscriptionOrder[]> {
  try {
    const res = await workerTables().listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.subscriptions,
      queries: [Query.orderDesc("$createdAt"), Query.limit(100)],
    });
    const orders = (res.rows as unknown as SubscriptionRow[]).map(toSubscription);
    globalThis.__writerdost_subscriptions = orders;
    return orders;
  } catch {
    // Fallback
  }
  return globalThis.__writerdost_subscriptions || [];
}

export async function getUserSubscriptions(userId: string): Promise<SubscriptionOrder[]> {
  try {
    const res = await workerTables().listRows({
      databaseId: DATABASE_ID,
      tableId: TABLES.subscriptions,
      queries: [
        Query.equal("userId", userId),
        Query.orderDesc("$createdAt"),
        Query.limit(100),
      ],
    });
    return (res.rows as unknown as SubscriptionRow[]).map(toSubscription);
  } catch {
    // Fallback
  }
  return (globalThis.__writerdost_subscriptions || []).filter(
    (s) => s.userId === userId
  );
}

export async function addSubscription(order: SubscriptionOrder): Promise<SubscriptionOrder> {
  const rowId = (order.id || ID.unique()).slice(0, 36).replace(/[^a-zA-Z0-9._-]/g, "");
  try {
    const created = await workerTables().createRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.subscriptions,
      rowId,
      data: {
        userId: order.userId,
        userEmail: order.userEmail,
        plan: order.plan,
        billingInterval: order.billingInterval,
        amountPaid: order.amountPaid,
        currency: order.currency,
        couponCode: order.couponCode || null,
        discountAmount: order.discountAmount || null,
        referralCode: order.referralCode || null,
        paymentProvider: order.paymentProvider,
        status: order.status,
        startDate: order.startDate,
        renewDate: order.renewDate,
      },
      permissions: ownerPermissions(order.userId),
    });
    const saved = toSubscription(created as unknown as SubscriptionRow);
    globalThis.__writerdost_subscriptions = [saved, ...(globalThis.__writerdost_subscriptions || [])];
    return saved;
  } catch {
    // Fallback
  }
  const fallback = { ...order, id: rowId };
  globalThis.__writerdost_subscriptions = [fallback, ...(globalThis.__writerdost_subscriptions || [])];
  return fallback;
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

interface KvNamespaceLike {
  get: (key: string, type?: "json" | "text") => Promise<unknown>;
  put: (key: string, value: string) => Promise<void>;
}

async function getCloudflareKv(): Promise<KvNamespaceLike | null> {
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    const ctx = await getCloudflareContext({ async: true });
    const envRecord = ctx?.env as Record<string, unknown> | undefined;
    const kv = envRecord?.WRITERDOST_KV;
    if (kv && typeof kv === "object" && "get" in kv && "put" in kv) {
      return kv as unknown as KvNamespaceLike;
    }
    return null;
  } catch {
    return null;
  }
}

export async function hydrateGatewayConfigFromKv(): Promise<BizAiGatewayConfig> {
  try {
    const kv = await getCloudflareKv();
    if (kv) {
      const stored = (await kv.get("writerdost_bizai_gateway", "json")) as Partial<BizAiGatewayConfig> | null;
      if (stored && typeof stored === "object") {
        const current = getBizAiGatewayConfig();
        const mergedKeys = {
          ...DEFAULT_BIZAI_GATEWAY_CONFIG.serverKeys,
          ...(current.serverKeys || {}),
          ...(stored.serverKeys || {}),
        };
        const next: BizAiGatewayConfig = {
          ...DEFAULT_BIZAI_GATEWAY_CONFIG,
          ...current,
          ...stored,
          serverKeys: mergedKeys,
        };
        globalThis.__writerdost_bizai_gateway = next;
      }
    }
  } catch {
    // Non-blocking fallback to memory
  }
  return getBizAiGatewayConfig();
}

export async function persistGatewayConfigToKv(config: BizAiGatewayConfig): Promise<void> {
  try {
    const kv = await getCloudflareKv();
    if (kv) {
      await kv.put("writerdost_bizai_gateway", JSON.stringify(config));
    }
  } catch {
    // Non-blocking
  }
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

  const maskedInstances = (config.instances || []).map((inst) => {
    const activeKey = inst.apiKey || "";
    let maskedKey = "";
    if (activeKey) {
      if (activeKey.length > 8) {
        maskedKey = `${activeKey.slice(0, 4)}••••••••${activeKey.slice(-4)}`;
      } else {
        maskedKey = "••••••••";
      }
    }
    return {
      ...inst,
      apiKey: maskedKey,
    };
  });

  return {
    ...config,
    serverKeys: maskedKeys,
    instances: maskedInstances,
    configuredProviders: config.configuredProviders || [],
    customEndpoints: config.customEndpoints || {},
    providerModels: config.providerModels || {},
    freeProviders: config.freeProviders || {},
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

  let updatedInstances = current.instances || [];
  if (updates.instances) {
    updatedInstances = updates.instances.map((incoming) => {
      const existing = (current.instances || []).find((i) => i.id === incoming.id);
      let effectiveKey = incoming.apiKey?.trim() || "";
      if (effectiveKey.includes("••••") && existing?.apiKey) {
        effectiveKey = existing.apiKey;
      }
      return {
        ...incoming,
        apiKey: effectiveKey,
      };
    });
  }

  let nextPrimaryProvider = updates.primaryProvider !== undefined ? updates.primaryProvider : current.primaryProvider;
  let nextPrimaryModel = updates.primaryModel !== undefined ? updates.primaryModel : current.primaryModel;
  let nextPrimaryInstanceId = updates.primaryInstanceId !== undefined ? updates.primaryInstanceId : current.primaryInstanceId;

  const primaryInst = updatedInstances.find((i) => i.tier === "primary" || i.id === nextPrimaryInstanceId);
  if (primaryInst) {
    nextPrimaryProvider = primaryInst.provider;
    nextPrimaryModel = primaryInst.model;
    nextPrimaryInstanceId = primaryInst.id;
  }

  let nextFallbacks = updates.fallbacks !== undefined ? updates.fallbacks : current.fallbacks;
  if (updates.instances && updatedInstances.length > 0) {
    const fallbackList: GatewayFallbackTier[] = [];
    const fallbackInsts = updatedInstances.filter(
      (i) => i.tier === "fallback" || (i.fallbackTiers && i.fallbackTiers.length > 0)
    );
    const tierEntries: Array<{ tierNum: number; inst: (typeof fallbackInsts)[0] }> = [];
    for (const inst of fallbackInsts) {
      const tiers = inst.fallbackTiers && inst.fallbackTiers.length > 0 ? inst.fallbackTiers : [1];
      for (const t of tiers) {
        tierEntries.push({ tierNum: t, inst });
      }
    }
    tierEntries.sort((a, b) => a.tierNum - b.tierNum);
    for (const entry of tierEntries) {
      fallbackList.push({
        enabled: true,
        provider: entry.inst.provider,
        model: entry.inst.model,
        label: entry.inst.label || `Tier ${entry.tierNum} (${entry.inst.provider})`,
        instanceId: entry.inst.id,
      });
    }
    if (fallbackList.length > 0) {
      nextFallbacks = fallbackList;
    }
  }

  const next: BizAiGatewayConfig = {
    ...current,
    ...updates,
    serverKeys: updatedKeys,
    instances: updatedInstances,
    primaryProvider: nextPrimaryProvider,
    primaryModel: nextPrimaryModel,
    primaryInstanceId: nextPrimaryInstanceId,
    fallbacks: nextFallbacks,
    configuredProviders: updates.configuredProviders !== undefined ? updates.configuredProviders : (current.configuredProviders || []),
    customEndpoints: updates.customEndpoints !== undefined ? updates.customEndpoints : (current.customEndpoints || {}),
    providerModels: updates.providerModels !== undefined ? updates.providerModels : (current.providerModels || {}),
    freeProviders: updates.freeProviders !== undefined ? updates.freeProviders : (current.freeProviders || {}),
  };

  globalThis.__writerdost_bizai_gateway = next;

  // Persist to Cloudflare KV asynchronously
  persistGatewayConfigToKv(next).catch(() => {});

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

// -------------------------------------------------------------
// Gateway Cost & Throughput Analytics
// -------------------------------------------------------------

function createInitialGatewayAnalytics(): GatewayAnalytics {
  const initialProviders: Record<string, GatewayProviderMetric> = {};
  const standardProviders: ApiProvider[] = [
    "claude",
    "openai",
    "gemini",
    "deepseek",
    "groq",
    "commandcode",
    "openrouter",
    "ollama",
  ];

  for (const p of standardProviders) {
    initialProviders[p] = {
      provider: p,
      totalRequests: 0,
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalCost: 0,
      recentTimestamps: [],
      isFree: p === "ollama",
    };
  }

  return {
    totalRequests: 0,
    totalTokens: 0,
    inputTokens: 0,
    outputTokens: 0,
    totalCost: 0,
    freeRequests: 0,
    freeTokens: 0,
    requestsPerMinute: 0,
    providers: initialProviders,
  };
}

export function getGatewayAnalytics(): GatewayAnalytics {
  if (!globalThis.__writerdost_gateway_analytics) {
    globalThis.__writerdost_gateway_analytics = createInitialGatewayAnalytics();
  }

  const analytics = globalThis.__writerdost_gateway_analytics;
  const now = Date.now();
  const oneMinuteAgo = now - 60_000;

  // Prune old timestamps and calculate RPM
  let totalRecent = 0;
  for (const pKey of Object.keys(analytics.providers)) {
    const prov = analytics.providers[pKey];
    prov.recentTimestamps = (prov.recentTimestamps || []).filter((t) => t > oneMinuteAgo);
    totalRecent += prov.recentTimestamps.length;
  }
  analytics.requestsPerMinute = totalRecent;

  return analytics;
}

export function recordGatewayUsage(
  provider: ApiProvider,
  model: string,
  inputTokens: number,
  outputTokens: number,
  isExplicitFree?: boolean
) {
  const analytics = getGatewayAnalytics();
  const now = Date.now();
  const rates = getModelDefaultRates(provider, model);
  const isFree = Boolean(
    isExplicitFree ||
    provider === "ollama" ||
    provider === "ollama_cloud" ||
    (rates.inputRate === 0 && rates.outputRate === 0)
  );

  const cost = isFree
    ? 0
    : Number(
        (
          (Math.max(0, inputTokens) / 1_000_000) * rates.inputRate +
          (Math.max(0, outputTokens) / 1_000_000) * rates.outputRate
        ).toFixed(6)
      );

  const totalTokens = Math.max(0, inputTokens) + Math.max(0, outputTokens);

  analytics.totalRequests += 1;
  analytics.totalTokens += totalTokens;
  analytics.inputTokens += Math.max(0, inputTokens);
  analytics.outputTokens += Math.max(0, outputTokens);
  analytics.totalCost = Number((analytics.totalCost + cost).toFixed(6));

  if (isFree) {
    analytics.freeRequests += 1;
    analytics.freeTokens += totalTokens;
  }

  if (!analytics.providers[provider]) {
    analytics.providers[provider] = {
      provider,
      model,
      totalRequests: 0,
      totalTokens: 0,
      inputTokens: 0,
      outputTokens: 0,
      totalCost: 0,
      recentTimestamps: [],
      isFree,
    };
  }

  const pMetric = analytics.providers[provider];
  pMetric.model = model;
  pMetric.totalRequests += 1;
  pMetric.totalTokens += totalTokens;
  pMetric.inputTokens += Math.max(0, inputTokens);
  pMetric.outputTokens += Math.max(0, outputTokens);
  pMetric.totalCost = Number((pMetric.totalCost + cost).toFixed(6));
  pMetric.lastUsedTimestamp = now;
  pMetric.recentTimestamps = (pMetric.recentTimestamps || []).filter((t) => t > now - 60_000);
  pMetric.recentTimestamps.push(now);
  pMetric.isFree = isFree;

  globalThis.__writerdost_gateway_analytics = analytics;
}

export function resetGatewayAnalytics(): GatewayAnalytics {
  globalThis.__writerdost_gateway_analytics = createInitialGatewayAnalytics();
  return globalThis.__writerdost_gateway_analytics;
}
