import { NextResponse } from "next/server";
import { adminUsers, requireUser } from "@/lib/appwrite/session";
import { PLAN_FEATURES, type AccountPrefs } from "@/lib/auth/profile";
import {
  getAllSubscriptions,
  getUserSubscriptions,
  addSubscription,
  getAllCoupons,
  updateCoupon,
  addReferral,
} from "@/lib/server-subscription-store";
import {
  calculateDiscount,
  generateReferralCode,
  processSubscriptionPayment,
  validateCoupon,
} from "@/lib/subscription-service";
import { PLAN_DEFINITIONS, type UserPlan } from "@/lib/store-types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { session, denied } = await requireUser(request);
  if (denied) return denied;

  const { searchParams } = new URL(request.url);
  const showAll = searchParams.get("all") === "true" && session.user.role === "admin";

  const orders = showAll
    ? getAllSubscriptions()
    : getUserSubscriptions(session.user.id);

  return NextResponse.json({ subscriptions: orders });
}

export async function POST(request: Request) {
  const { session, denied } = await requireUser(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as {
      plan: UserPlan;
      billingInterval?: "monthly" | "yearly";
      couponCode?: string;
      referralCode?: string;
    };

    const plan = body.plan;
    if (!plan || plan === "Custom" || !PLAN_DEFINITIONS[plan]) {
      return NextResponse.json({ error: "Invalid plan selected." }, { status: 400 });
    }

    const interval = body.billingInterval === "yearly" ? "yearly" : "monthly";
    const planDef = PLAN_DEFINITIONS[plan];
    const basePrice = interval === "yearly" ? planDef.priceYearly : planDef.priceMonthly;

    let discountAmount = 0;
    let validatedCoupon = null;

    // Apply coupon if provided
    if (body.couponCode) {
      const coupons = getAllCoupons();
      const validation = validateCoupon(body.couponCode, coupons, plan);
      if (validation.valid && validation.coupon) {
        validatedCoupon = validation.coupon;
        discountAmount += calculateDiscount(basePrice, validatedCoupon);
        // Increment coupon timesUsed
        updateCoupon(validatedCoupon.id, { timesUsed: validatedCoupon.timesUsed + 1 });
      }
    }

    // Apply referral discount if provided (e.g. additional 10% off for referee)
    if (body.referralCode) {
      const ownCode = generateReferralCode(session.user.id);
      if (body.referralCode.trim().toUpperCase() !== ownCode) {
        const refDiscount = Math.round(basePrice * 0.1 * 100) / 100;
        discountAmount += refDiscount;
        addReferral({
          id: `ref_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
          referrerUserId: body.referralCode.trim().toUpperCase(),
          referrerCode: body.referralCode.trim().toUpperCase(),
          refereeUserId: session.user.id,
          refereeEmail: session.user.email,
          plan,
          discountApplied: refDiscount,
          status: "completed",
          createdAt: new Date().toISOString(),
        });
      }
    }

    const finalAmount = Math.max(0, Math.round((basePrice - discountAmount) * 100) / 100);

    // Process payment intent (ready for PayPal tomorrow)
    const paymentResult = await processSubscriptionPayment({
      plan,
      billingInterval: interval,
      amount: finalAmount,
      currency: "USD",
      userId: session.user.id,
      couponCode: validatedCoupon?.code,
      referralCode: body.referralCode,
      provider: "simulated",
    });

    if (!paymentResult.success || !paymentResult.order) {
      return NextResponse.json(
        { error: paymentResult.error || "Payment processing failed." },
        { status: 500 }
      );
    }

    const order = paymentResult.order;
    order.userEmail = session.user.email;
    order.discountAmount = discountAmount;
    addSubscription(order);

    // Update user preferences in Appwrite if server client is available
    const allowedFeatures = PLAN_FEATURES[plan];
    try {
      const users = adminUsers();
      const existing = (await users.getPrefs({ userId: session.user.id })) as AccountPrefs;
      await users.updatePrefs({
        userId: session.user.id,
        prefs: { ...existing, plan, allowedFeatures },
      });
    } catch {
      // Appwrite might not be connected in offline/testing environment; proceed smoothly
    }

    return NextResponse.json({
      success: true,
      order,
      plan,
      allowedFeatures,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Subscription checkout failed." },
      { status: 500 }
    );
  }
}
