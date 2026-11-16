import {
  Coupon,
  PlanLimits,
  PLAN_DEFINITIONS,
  UserPlan,
  SubscriptionOrder,
} from "./store-types";

/**
 * Returns the monthly limits for projects and blog generations for a plan.
 */
export function getPlanQuotas(plan: UserPlan): PlanLimits {
  if (plan === "Custom") {
    return {
      maxProjectsPerMonth: 20,
      maxBlogsPerMonth: 50,
    };
  }
  const def = PLAN_DEFINITIONS[plan] || PLAN_DEFINITIONS.Free;
  return def.limits;
}

/**
 * Returns true if the user's current month usage has met or exceeded their quota.
 * Unlimited plans have limits set to -1.
 */
export function isQuotaExceeded(
  plan: UserPlan,
  type: "project" | "blog",
  currentUsageCount: number
): boolean {
  const quotas = getPlanQuotas(plan);
  const limit = type === "project" ? quotas.maxProjectsPerMonth : quotas.maxBlogsPerMonth;
  if (limit === -1) return false; // Unlimited
  return currentUsageCount >= limit;
}

/**
 * Calculates the numeric discount amount for a given base price and coupon.
 */
export function calculateDiscount(basePrice: number, coupon: Coupon): number {
  if (basePrice <= 0) return 0;
  if (coupon.discountType === "percent") {
    const raw = (basePrice * coupon.discountValue) / 100;
    return Math.min(basePrice, Math.max(0, Math.round(raw * 100) / 100));
  }
  // fixed amount
  return Math.min(basePrice, Math.max(0, coupon.discountValue));
}

/**
 * Validates a coupon code against a list of coupons and optional plan constraints.
 */
export function validateCoupon(
  code: string,
  coupons: Coupon[],
  plan?: UserPlan
): { valid: boolean; coupon?: Coupon; error?: string } {
  if (!code || !code.trim()) {
    return { valid: false, error: "Please enter a coupon code." };
  }

  const clean = code.trim().toUpperCase();
  const match = coupons.find((c) => c.code.toUpperCase() === clean);

  if (!match) {
    return { valid: false, error: "Coupon code does not exist." };
  }

  if (!match.isActive) {
    return { valid: false, error: "This coupon is currently inactive." };
  }

  if (match.maxUses != null && match.timesUsed >= match.maxUses) {
    return { valid: false, error: "Coupon usage limit has been reached." };
  }

  if (match.validUntil) {
    const expiry = new Date(match.validUntil).getTime();
    if (Date.now() > expiry) {
      return { valid: false, error: "This coupon has expired." };
    }
  }

  if (match.minPlan && plan && plan !== match.minPlan && plan === "Free") {
    return {
      valid: false,
      error: `This coupon requires a minimum ${match.minPlan} plan.`,
    };
  }

  return { valid: true, coupon: match };
}

/**
 * Generates a clean, readable referral code from a user identifier.
 */
export function generateReferralCode(userId: string): string {
  const sanitized = userId.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const suffix = sanitized.slice(-6);
  return `WD-${suffix.padEnd(6, "X")}`;
}

/**
 * Standard seed coupons available out of the box.
 */
export const DEFAULT_COUPONS: Coupon[] = [
  {
    id: "coupon-welcome50",
    code: "WELCOME50",
    discountType: "percent",
    discountValue: 50,
    timesUsed: 0,
    maxUses: 1000,
    isActive: true,
    validUntil: "2030-12-31T23:59:59Z",
    createdAt: new Date().toISOString(),
  },
  {
    id: "coupon-welcome20",
    code: "WELCOME20",
    discountType: "percent",
    discountValue: 20,
    timesUsed: 0,
    maxUses: 5000,
    isActive: true,
    validUntil: "2030-12-31T23:59:59Z",
    createdAt: new Date().toISOString(),
  },
  {
    id: "coupon-writer20",
    code: "WRITER20",
    discountType: "percent",
    discountValue: 20,
    timesUsed: 0,
    maxUses: null,
    isActive: true,
    validUntil: "2030-12-31T23:59:59Z",
    createdAt: new Date().toISOString(),
  },
  {
    id: "coupon-save10",
    code: "SAVE10",
    discountType: "fixed",
    discountValue: 10,
    timesUsed: 0,
    maxUses: null,
    isActive: true,
    validUntil: "2030-12-31T23:59:59Z",
    createdAt: new Date().toISOString(),
  },
];

/**
 * Payment processor abstraction. Ready to hook into PayPal or Stripe.
 */
export interface PaymentIntentOptions {
  plan: UserPlan;
  billingInterval: "monthly" | "yearly";
  amount: number;
  currency: string;
  userId: string;
  couponCode?: string;
  referralCode?: string;
  provider: "simulated" | "paypal" | "stripe";
}

export async function processSubscriptionPayment(
  options: PaymentIntentOptions
): Promise<{ success: boolean; order?: SubscriptionOrder; error?: string }> {
  // Tomorrow the user will plug their PayPal client ID / secret here.
  // For now, this handles immediate activation and returns a completed order.
  const now = new Date();
  const renew = new Date(now);
  if (options.billingInterval === "yearly") {
    renew.setFullYear(renew.getFullYear() + 1);
  } else {
    renew.setMonth(renew.getMonth() + 1);
  }

  const order: SubscriptionOrder = {
    id: `sub_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    userId: options.userId,
    userEmail: "",
    plan: options.plan,
    billingInterval: options.billingInterval,
    amountPaid: options.amount,
    currency: options.currency,
    couponCode: options.couponCode,
    referralCode: options.referralCode,
    paymentProvider: options.provider,
    status: "active",
    startDate: now.toISOString(),
    renewDate: renew.toISOString(),
    createdAt: now.toISOString(),
  };

  return { success: true, order };
}
