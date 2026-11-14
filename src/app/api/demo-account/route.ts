import { NextResponse } from "next/server";
import { ID, Query } from "node-appwrite";
import { adminUsers } from "@/lib/appwrite/session";
import { PLAN_FEATURES } from "@/lib/auth/profile";
import type { UserPlan } from "@/lib/store-types";

export const dynamic = "force-dynamic";

const DEMO_CONFIGS: Record<
  string,
  {
    plan: UserPlan;
    name: string;
    email: string;
    password: string;
    role: "user" | "admin";
    labels: string[];
  }
> = {
  free: {
    plan: "Free",
    name: "Demo Free User",
    email: "demo-free@writerdost.com",
    password: "Password123!",
    role: "user",
    labels: [],
  },
  basic: {
    plan: "Basic",
    name: "Demo Basic Creator",
    email: "demo-basic@writerdost.com",
    password: "Password123!",
    role: "user",
    labels: [],
  },
  pro: {
    plan: "Pro",
    name: "Demo Pro Writer",
    email: "demo-pro@writerdost.com",
    password: "Password123!",
    role: "user",
    labels: [],
  },
  enterprise: {
    plan: "Enterprise",
    name: "Demo Enterprise Partner",
    email: "demo-enterprise@writerdost.com",
    password: "Password123!",
    role: "user",
    labels: [],
  },
  admin: {
    plan: "Enterprise",
    name: "Demo Administrator",
    email: "demo-admin@writerdost.com",
    password: "Password123!",
    role: "admin",
    labels: ["admin"],
  },
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as { plan?: string };
    const key = (body.plan || "free").toLowerCase();
    const config = DEMO_CONFIGS[key];

    if (!config) {
      return NextResponse.json(
        { error: "Invalid demo plan requested. Choose from free, basic, pro, enterprise, admin." },
        { status: 400 },
      );
    }

    const users = adminUsers();

    // Find existing account
    const found = await users.list({
      queries: [Query.equal("email", config.email), Query.limit(1)],
    });

    let userId: string;
    if (found.total > 0 && found.users[0]) {
      userId = found.users[0].$id;
      // Ensure password and name are consistent
      await users.updatePassword({ userId, password: config.password });
      await users.updateName({ userId, name: config.name });
    } else {
      userId = ID.unique();
      await users.create({
        userId,
        email: config.email,
        password: config.password,
        name: config.name,
      });
    }

    // Always mark verified
    await users.updateEmailVerification({ userId, emailVerification: true });

    // Set preferences
    const planKey = (config.plan === "Custom" ? "Basic" : config.plan) as Exclude<UserPlan, "Custom">;
    await users.updatePrefs({
      userId,
      prefs: {
        plan: config.plan,
        allowedFeatures: PLAN_FEATURES[planKey] || PLAN_FEATURES.Basic,
      },
    });

    // Set labels
    await users.updateLabels({ userId, labels: config.labels });

    return NextResponse.json({
      success: true,
      email: config.email,
      password: config.password,
      plan: config.plan,
      role: config.role,
      name: config.name,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Failed to provision demo account" },
      { status: 500 },
    );
  }
}
