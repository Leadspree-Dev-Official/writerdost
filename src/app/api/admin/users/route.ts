/**
 * User administration.
 *
 * Backed by Appwrite's Users API with the server key, because an admin must
 * see accounts that are not their own — the one place in the app where acting
 * for everyone is the point rather than a hazard.
 *
 * `requireAdmin` re-reads the caller's role from that same API rather than
 * believing the role in their JWT's prefs, which the account holder can edit.
 */
import { NextResponse } from "next/server";
import { ID } from "node-appwrite";
import { adminUsers, requireAdmin } from "@/lib/appwrite/session";
import { ADMIN_LABEL, PLAN_FEATURES, defaultPrefs, toUser } from "@/lib/auth/profile";
import type { UserPlan } from "@/lib/store-types";

export const dynamic = "force-dynamic";

function failed(error: unknown) {
  return NextResponse.json(
    { error: error instanceof Error ? error.message : "The request failed." },
    { status: 500 },
  );
}

export async function GET(request: Request) {
  const { denied } = await requireAdmin(request);
  if (denied) return denied;

  try {
    const page = await adminUsers().list();
    return NextResponse.json({ users: page.users.map(toUser) });
  } catch (error) {
    return failed(error);
  }
}

export async function POST(request: Request) {
  const { denied } = await requireAdmin(request);
  if (denied) return denied;

  try {
    const body = (await request.json()) as {
      fullName?: string;
      email?: string;
      password?: string;
      role?: "user" | "admin";
      plan?: UserPlan;
    };

    if (!body.email || !body.password) {
      return NextResponse.json({ error: "An email and password are required." }, { status: 400 });
    }
    // Appwrite's own minimum. Rejecting here gives a clearer message than the
    // 400 the SDK would raise.
    if (body.password.length < 8) {
      return NextResponse.json(
        { error: "The password must be at least 8 characters." },
        { status: 400 },
      );
    }

    const plan = body.plan ?? "Basic";
    const created = await adminUsers().create({
      userId: ID.unique(),
      email: body.email,
      password: body.password,
      name: body.fullName || body.email,
    });

    await adminUsers().updatePrefs({
      userId: created.$id,
      prefs: {
        ...defaultPrefs(),
        plan,
        allowedFeatures: plan === "Custom" ? PLAN_FEATURES.Basic : PLAN_FEATURES[plan],
      },
    });

    // The role is a label, never a preference. See requireAdmin.
    if (body.role === "admin") {
      await adminUsers().updateLabels({ userId: created.$id, labels: [ADMIN_LABEL] });
    }

    const fresh = await adminUsers().get({ userId: created.$id });
    return NextResponse.json({ user: toUser(fresh) }, { status: 201 });
  } catch (error) {
    // 409 is a duplicate email, which is a user error rather than a fault.
    if ((error as { code?: number })?.code === 409) {
      return NextResponse.json({ error: "That email is already registered." }, { status: 409 });
    }
    return failed(error);
  }
}
