import { NextResponse } from "next/server";
import { getAllCoupons } from "@/lib/server-subscription-store";
import { calculateDiscount, validateCoupon } from "@/lib/subscription-service";
import { PLAN_DEFINITIONS, UserPlan } from "@/lib/store-types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const { code, plan, interval } = (await request.json()) as {
      code: string;
      plan: UserPlan;
      interval?: "monthly" | "yearly";
    };

    if (!code) {
      return NextResponse.json({ valid: false, error: "Coupon code is required." }, { status: 400 });
    }

    const coupons = getAllCoupons();
    const result = validateCoupon(code, coupons, plan);

    if (!result.valid || !result.coupon) {
      return NextResponse.json({ valid: false, error: result.error || "Invalid coupon." });
    }

    const planDef = plan !== "Custom" ? PLAN_DEFINITIONS[plan] : null;
    let basePrice = 0;
    if (planDef) {
      basePrice = interval === "yearly" ? planDef.priceYearly : planDef.priceMonthly;
    }

    const discountAmount = calculateDiscount(basePrice, result.coupon);
    const finalPrice = Math.max(0, Math.round((basePrice - discountAmount) * 100) / 100);

    return NextResponse.json({
      valid: true,
      coupon: result.coupon,
      discountAmount,
      basePrice,
      finalPrice,
    });
  } catch (error) {
    return NextResponse.json(
      { valid: false, error: error instanceof Error ? error.message : "Validation failed." },
      { status: 500 }
    );
  }
}
