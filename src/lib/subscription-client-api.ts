import { authHeader } from "@/lib/appwrite/client";
import type { Coupon, ReferralRecord, SubscriptionOrder, UserPlan } from "./store-types";

async function authFetch<T>(url: string, init: RequestInit = {}): Promise<T> {
  let headers: Record<string, string> = {
    "content-type": "application/json",
  };
  try {
    const auth = await authHeader();
    headers = { ...headers, ...auth };
  } catch {
    // offline or anonymous
  }

  const res = await fetch(url, {
    ...init,
    headers: {
      ...headers,
      ...(init.headers as Record<string, string> | undefined),
    },
  });

  const text = await res.text();
  const body = text ? JSON.parse(text) : {};
  if (!res.ok) {
    throw new Error(body.error || `Request failed (${res.status})`);
  }
  return body as T;
}

export async function fetchCoupons(): Promise<Coupon[]> {
  const data = await authFetch<{ coupons: Coupon[] }>("/api/coupons");
  return data.coupons || [];
}

export async function createCoupon(coupon: Partial<Coupon>): Promise<Coupon> {
  const data = await authFetch<{ success: boolean; coupon: Coupon }>("/api/coupons", {
    method: "POST",
    body: JSON.stringify(coupon),
  });
  return data.coupon;
}

export async function updateCouponApi(id: string, updates: Partial<Coupon>): Promise<Coupon> {
  const data = await authFetch<{ success: boolean; coupon: Coupon }>("/api/coupons", {
    method: "PATCH",
    body: JSON.stringify({ id, ...updates }),
  });
  return data.coupon;
}

export async function deleteCouponApi(id: string): Promise<void> {
  await authFetch<{ success: boolean }>(`/api/coupons?id=${encodeURIComponent(id)}`, {
    method: "DELETE",
  });
}

export async function fetchReferrals(showAll = false): Promise<{
  referralCode: string;
  referrals: ReferralRecord[];
  totalReferred: number;
  completedReferrals: number;
}> {
  return await authFetch<{
    referralCode: string;
    referrals: ReferralRecord[];
    totalReferred: number;
    completedReferrals: number;
  }>(`/api/referrals${showAll ? "?all=true" : ""}`);
}

export async function recordReferralAttribution(referralCode: string, plan: UserPlan): Promise<ReferralRecord> {
  const data = await authFetch<{ success: boolean; referral: ReferralRecord }>("/api/referrals", {
    method: "POST",
    body: JSON.stringify({ referralCode, plan }),
  });
  return data.referral;
}

export async function fetchSubscriptions(showAll = false): Promise<SubscriptionOrder[]> {
  const data = await authFetch<{ subscriptions: SubscriptionOrder[] }>(
    `/api/subscriptions${showAll ? "?all=true" : ""}`
  );
  return data.subscriptions || [];
}

export async function purchaseSubscriptionApi(payload: {
  plan: UserPlan;
  billingInterval: "monthly" | "yearly";
  couponCode?: string;
  referralCode?: string;
}): Promise<{
  success: boolean;
  order: SubscriptionOrder;
  plan: UserPlan;
  allowedFeatures: Record<string, boolean>;
}> {
  return await authFetch("/api/subscriptions", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
