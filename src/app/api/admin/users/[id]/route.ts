/**
 * Updating or removing one account.
 *
 * Role, plan and feature gates live in the account's preferences, so they are
 * merged into the existing bag rather than replacing it — overwriting would
 * silently drop any preference this app does not yet know about.
 */
import { NextResponse } from "next/server";
import { adminUsers, requireAdmin } from "@/lib/appwrite/session";
import { ADMIN_LABEL, PLAN_FEATURES, readFeatures, toUser } from "@/lib/auth/profile";
import type { AccountPrefs } from "@/lib/auth/profile";
import type { User, UserFeatures, UserPlan } from "@/lib/store-types";

export const dynamic = "force-dynamic";

type Context = { params: Promise<{ id: string }> };

type Patch = {
  fullName?: string;
  role?: User["role"];
  status?: User["status"];
  plan?: UserPlan;
  allowedFeatures?: UserFeatures;
};

export async function PATCH(request: Request, { params }: Context) {
  const { session, denied } = await requireAdmin(request);
  if (denied) return denied;

  try {
    const { id } = await params;
    const patch = (await request.json()) as Patch;
    const users = adminUsers();

    // An admin who demotes or suspends themselves locks everyone out of this
    // screen, since there may be no other administrator to undo it.
    if (id === session.user.id && (patch.role === "user" || patch.status === "suspended")) {
      return NextResponse.json(
        { error: "You cannot remove your own access." },
        { status: 400 },
      );
    }

    if (patch.fullName !== undefined) {
      await users.updateName({ userId: id, name: patch.fullName });
    }
    if (patch.status !== undefined) {
      await users.updateStatus({ userId: id, status: patch.status === "active" });
    }

    // The role is a label, not a preference: labels are the one attribute the
    // account holder cannot write, which is what makes the admin check mean
    // anything. Other labels are preserved so this never clobbers a label set
    // by something outside this app.
    if (patch.role !== undefined) {
      const { labels = [] } = await users.get({ userId: id });
      const without = labels.filter((label) => label !== ADMIN_LABEL);
      await users.updateLabels({
        userId: id,
        labels: patch.role === "admin" ? [...without, ADMIN_LABEL] : without,
      });
    }

    if (patch.plan !== undefined || patch.allowedFeatures) {
      const existing = (await users.getPrefs({ userId: id })) as AccountPrefs;
      const plan = patch.plan ?? existing.plan ?? "Basic";

      const allowedFeatures =
        patch.allowedFeatures ??
        // Changing the plan without naming features resets the gates to that
        // plan's defaults; "Custom" keeps whatever was there.
        (patch.plan && patch.plan !== "Custom"
          ? PLAN_FEATURES[patch.plan]
          : readFeatures(existing.allowedFeatures, plan));

      await users.updatePrefs({ userId: id, prefs: { ...existing, plan, allowedFeatures } });
    }

    return NextResponse.json({ user: toUser(await users.get({ userId: id })) });
  } catch (error) {
    if ((error as { code?: number })?.code === 404) {
      return NextResponse.json({ error: "That account no longer exists." }, { status: 404 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The request failed." },
      { status: 500 },
    );
  }
}

export async function DELETE(request: Request, { params }: Context) {
  const { session, denied } = await requireAdmin(request);
  if (denied) return denied;

  try {
    const { id } = await params;
    if (id === session.user.id) {
      return NextResponse.json({ error: "You cannot delete your own account." }, { status: 400 });
    }

    await adminUsers().delete({ userId: id });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if ((error as { code?: number })?.code === 404) return NextResponse.json({ ok: true });
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The request failed." },
      { status: 500 },
    );
  }
}
