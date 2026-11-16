import {
  Coupon,
  DEFAULT_FOUNDER_CAMPAIGN,
  DEFAULT_CONTEXT_ROUTING,
  FounderCampaignConfig,
  ContextRoutingConfig,
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

export function getContextRouting(): ContextRoutingConfig {
  return globalThis.__writerdost_context_routing || { ...DEFAULT_CONTEXT_ROUTING };
}

export function updateContextRouting(updates: Partial<ContextRoutingConfig>): ContextRoutingConfig {
  const current = getContextRouting();
  const next: ContextRoutingConfig = {
    ...current,
    ...updates,
  };
  globalThis.__writerdost_context_routing = next;
  return next;
}
