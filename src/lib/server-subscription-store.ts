import { Coupon, ReferralRecord, SubscriptionOrder } from "./store-types";
import { DEFAULT_COUPONS } from "./subscription-service";

// In-memory persistent server state
declare global {
  // eslint-disable-next-line no-var
  var __writerdost_coupons: Coupon[] | undefined;
  // eslint-disable-next-line no-var
  var __writerdost_referrals: ReferralRecord[] | undefined;
  // eslint-disable-next-line no-var
  var __writerdost_subscriptions: SubscriptionOrder[] | undefined;
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
