import { describe, it, expect } from "vitest";
import {
  calculateDiscount,
  validateCoupon,
  getPlanQuotas,
  isQuotaExceeded,
  generateReferralCode,
} from "@/lib/subscription-service";
import type { Coupon, UserPlan } from "@/lib/store-types";

describe("Subscription Service", () => {
  describe("Plan Quotas", () => {
    it("returns correct limits for Free plan", () => {
      const limits = getPlanQuotas("Free");
      expect(limits.maxProjectsPerMonth).toBe(2);
      expect(limits.maxBlogsPerMonth).toBe(2);
    });

    it("checks quota limits correctly", () => {
      // Free allows 2
      expect(isQuotaExceeded("Free", "project", 1)).toBe(false);
      expect(isQuotaExceeded("Free", "project", 2)).toBe(true);
      expect(isQuotaExceeded("Free", "blog", 1)).toBe(false);
      expect(isQuotaExceeded("Free", "blog", 2)).toBe(true);

      // Enterprise is unlimited (-1)
      expect(isQuotaExceeded("Enterprise", "project", 500)).toBe(false);
      expect(isQuotaExceeded("Enterprise", "blog", 10000)).toBe(false);
    });
  });

  describe("Coupon Validation and Discount Calculation", () => {
    const validPercentCoupon: Coupon = {
      id: "c-1",
      code: "SAVE20",
      discountType: "percent",
      discountValue: 20,
      timesUsed: 5,
      maxUses: 10,
      isActive: true,
      validUntil: "2099-12-31T23:59:59Z",
      createdAt: new Date().toISOString(),
    };

    const validFixedCoupon: Coupon = {
      id: "c-2",
      code: "OFF10",
      discountType: "fixed",
      discountValue: 10,
      timesUsed: 0,
      isActive: true,
      createdAt: new Date().toISOString(),
    };

    it("calculates percentage discount accurately", () => {
      const discount = calculateDiscount(100, validPercentCoupon);
      expect(discount).toBe(20);
    });

    it("calculates fixed discount accurately", () => {
      const discount = calculateDiscount(29, validFixedCoupon);
      expect(discount).toBe(10);
    });

    it("clamps fixed discount to base price", () => {
      const discount = calculateDiscount(5, validFixedCoupon);
      expect(discount).toBe(5);
    });

    it("validates active and unexpired coupons", () => {
      const result = validateCoupon("SAVE20", [validPercentCoupon], "Pro");
      expect(result.valid).toBe(true);
      expect(result.coupon?.code).toBe("SAVE20");
    });

    it("rejects invalid, inactive, or expired coupons", () => {
      const expiredCoupon: Coupon = {
        ...validPercentCoupon,
        code: "EXPIRED",
        validUntil: "2020-01-01T00:00:00Z",
      };
      const inactiveCoupon: Coupon = {
        ...validPercentCoupon,
        code: "INACTIVE",
        isActive: false,
      };
      const maxedCoupon: Coupon = {
        ...validPercentCoupon,
        code: "MAXED",
        timesUsed: 10,
        maxUses: 10,
      };

      expect(validateCoupon("NOPE", [validPercentCoupon], "Pro").valid).toBe(false);
      expect(validateCoupon("EXPIRED", [expiredCoupon], "Pro").valid).toBe(false);
      expect(validateCoupon("INACTIVE", [inactiveCoupon], "Pro").valid).toBe(false);
      expect(validateCoupon("MAXED", [maxedCoupon], "Pro").valid).toBe(false);
    });
  });

  describe("Referral System", () => {
    it("generates deterministic or valid referral code from userId", () => {
      const code = generateReferralCode("user_abc123");
      expect(code.length).toBeGreaterThanOrEqual(6);
      expect(typeof code).toBe("string");
    });
  });

  describe("Payment Processing Adapter", () => {
    it("simulates subscription payment and activates order", async () => {
      const { processSubscriptionPayment } = await import("@/lib/subscription-service");
      const res = await processSubscriptionPayment({
        plan: "Pro",
        billingInterval: "monthly",
        amount: 29,
        currency: "USD",
        userId: "test-user-id",
        provider: "simulated",
      });

      expect(res.success).toBe(true);
      expect(res.order?.plan).toBe("Pro");
      expect(res.order?.status).toBe("active");
      expect(res.order?.amountPaid).toBe(29);
    });
  });
});
