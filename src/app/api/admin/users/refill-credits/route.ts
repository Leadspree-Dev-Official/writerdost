/**
 * Admin batch/individual credit refill endpoint.
 *
 * Automatically refills or resets user credits according to their assigned plan:
 * - Free: 500 credits
 * - Basic: 2,000 credits
 * - Pro: 6,000 credits
 * - Enterprise: 25,000 credits
 * Users marked with unlimitedCredits are maintained with unlimited status.
 */
import { NextResponse } from "next/server";
import { adminUsers, requireAdmin } from "@/lib/appwrite/session";
import { toUser } from "@/lib/auth/profile";
import type { AccountPrefs } from "@/lib/auth/profile";
import { PLAN_DEFAULT_CREDITS, type UserPlan } from "@/lib/store-types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const { denied } = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = (await request.json().catch(() => ({}))) as {
      userId?: string;
      mode?: "reset" | "topup";
    };

    const usersApi = adminUsers();
    const mode = body.mode || "reset";

    if (body.userId) {
      // Single user refill
      const userDoc = await usersApi.get({ userId: body.userId });
      const prefs = (await usersApi.getPrefs({ userId: body.userId })) as AccountPrefs;
      const plan = (prefs.plan as UserPlan) || "Basic";
      const planQuota = PLAN_DEFAULT_CREDITS[plan] ?? 500;

      const isUnlimited = Boolean(prefs.unlimitedCredits);
      let newCredits = typeof prefs.credits === "number" ? prefs.credits : planQuota;

      if (isUnlimited) {
        newCredits = 999999999;
      } else if (mode === "topup") {
        newCredits = Math.max(0, newCredits + planQuota);
      } else {
        // "reset" restores the standard monthly quota for their plan
        newCredits = Math.max(newCredits, planQuota);
      }

      await usersApi.updatePrefs({
        userId: body.userId,
        prefs: {
          ...prefs,
          credits: newCredits,
          unlimitedCredits: isUnlimited,
        },
      });

      const updated = await usersApi.get({ userId: body.userId });
      return NextResponse.json({
        success: true,
        count: 1,
        message: `Successfully refilled credits for ${updated.name || updated.email}.`,
        user: toUser(updated),
      });
    }

    // Batch refill all active accounts
    const page = await usersApi.list();
    let updatedCount = 0;

    for (const user of page.users) {
      if (!user.status) continue; // Skip disabled / suspended accounts

      const prefs = (user.prefs ?? {}) as AccountPrefs;
      const plan = (prefs.plan as UserPlan) || "Basic";
      const planQuota = PLAN_DEFAULT_CREDITS[plan] ?? 500;
      const isUnlimited = Boolean(prefs.unlimitedCredits);

      let newCredits = typeof prefs.credits === "number" ? prefs.credits : planQuota;
      if (isUnlimited) {
        newCredits = 999999999;
      } else if (mode === "topup") {
        newCredits = Math.max(0, newCredits + planQuota);
      } else {
        // Reset or guarantee at least full monthly quota
        newCredits = Math.max(newCredits, planQuota);
      }

      await usersApi.updatePrefs({
        userId: user.$id,
        prefs: {
          ...prefs,
          credits: newCredits,
          unlimitedCredits: isUnlimited,
        },
      });
      updatedCount++;
    }

    return NextResponse.json({
      success: true,
      count: updatedCount,
      message: `Successfully refreshed monthly credits for ${updatedCount} user(s).`,
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Credit refill failed." },
      { status: 500 },
    );
  }
}
