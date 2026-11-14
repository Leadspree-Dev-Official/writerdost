import { NextResponse } from "next/server";
import { requireUser } from "@/lib/appwrite/session";
import {
  getAllReferrals,
  getUserReferrals,
  addReferral,
} from "@/lib/server-subscription-store";
import { generateReferralCode } from "@/lib/subscription-service";
import type { ReferralRecord, UserPlan } from "@/lib/store-types";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { session, denied } = await requireUser(request);
  if (denied) return denied;

  const user = session.user;
  const userReferrals = getUserReferrals(user.id);
  const referralCode = generateReferralCode(user.id);

  // If user is admin, allow fetching all referrals via ?all=true
  const { searchParams } = new URL(request.url);
  const showAll = searchParams.get("all") === "true" && user.role === "admin";

  return NextResponse.json({
    referralCode,
    referrals: showAll ? getAllReferrals() : userReferrals,
    totalReferred: userReferrals.length,
    completedReferrals: userReferrals.filter((r) => r.status === "completed").length,
  });
}

export async function POST(request: Request) {
  const { session, denied } = await requireUser(request);
  if (denied) return denied;

  try {
    const { referralCode, plan } = (await request.json()) as {
      referralCode: string;
      plan: UserPlan;
    };

    if (!referralCode) {
      return NextResponse.json({ error: "Referral code is required." }, { status: 400 });
    }

    const cleanCode = referralCode.trim().toUpperCase();

    // Check if referring oneself
    const userReferralCode = generateReferralCode(session.user.id);
    if (cleanCode === userReferralCode) {
      return NextResponse.json(
        { error: "You cannot use your own referral code." },
        { status: 400 }
      );
    }

    const record: ReferralRecord = {
      id: `ref_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      referrerUserId: cleanCode,
      referrerCode: cleanCode,
      refereeUserId: session.user.id,
      refereeEmail: session.user.email,
      plan: plan || "Basic",
      discountApplied: 10, // 10% referral discount
      status: "completed",
      createdAt: new Date().toISOString(),
    };

    const saved = addReferral(record);
    return NextResponse.json({ success: true, referral: saved });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to record referral." },
      { status: 500 }
    );
  }
}
