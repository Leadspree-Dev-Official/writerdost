/**
 * The bridge between an Appwrite account and this app's `User`.
 *
 * Appwrite owns identity — id, name, email, created-at, enabled/blocked.
 * Everything this app adds is split across two very different places, and the
 * difference is the whole point:
 *
 *  - **role lives in Appwrite labels.** Labels are writable only through the
 *    server Users API (`users.updateLabels`, which needs the `users.write`
 *    scope). There is no account-side endpoint for them at all, so the account
 *    holder cannot grant themselves one. This is why the role is trustworthy.
 *
 *  - **plan and feature gates live in account preferences.** Preferences are
 *    writable by the account holder, so they are NOT a security boundary — a
 *    determined user can unlock their own feature flags. That is tolerable
 *    only because those flags gate client-side navigation over the user's own
 *    BYO AI key: no server route spends this app's money on the strength of
 *    them. Do not move anything that costs money, or grants access to another
 *    person's data, into this bag. Put it in a label or a permissioned row.
 *
 * The role used to live in prefs too, which meant any signed-up user could set
 * `role: "admin"` on themselves and take over the admin screens — reading it
 * back "authoritatively" through the Users API did not help, because that API
 * returns the very bag the user just wrote.
 *
 * Isomorphic on purpose: the browser reads labels and prefs off its session,
 * the server reads the same two through the Users API, and both must agree.
 */
import type { User, UserFeatures, UserPlan } from "@/lib/store-types";

/** Feature gates by plan. `Custom` is whatever an admin last saved. */
export const PLAN_FEATURES: Record<Exclude<UserPlan, "Custom">, UserFeatures> = {
  Basic: {
    createEbook: true,
    rewriteEbook: false,
    blogGenerator: false,
    advancedModels: false,
  },
  Pro: {
    createEbook: true,
    rewriteEbook: true,
    blogGenerator: true,
    advancedModels: false,
  },
  Enterprise: {
    createEbook: true,
    rewriteEbook: true,
    blogGenerator: true,
    advancedModels: true,
  },
};

/**
 * What this app keeps in an Appwrite account's preferences. Note the absence
 * of `role`: see the note above — it is a label, precisely so that this bag
 * cannot grant it.
 */
export type AccountPrefs = {
  plan?: UserPlan;
  allowedFeatures?: Partial<UserFeatures>;
};

/** The label that marks an administrator. */
export const ADMIN_LABEL = "admin";

/** The subset of an Appwrite account object both runtimes agree on. */
export type AppwriteAccount = {
  $id: string;
  $createdAt?: string;
  name?: string;
  email?: string;
  /** Appwrite models a blocked account as `status: false`. */
  status?: boolean;
  /** Server-assigned. Present on `account.get()` as well as the Users API. */
  labels?: string[] | null;
  prefs?: AccountPrefs | Record<string, unknown> | null;
};

/** The one authoritative role check. Labels cannot be self-assigned. */
export function isAdminAccount(account: AppwriteAccount): boolean {
  return Array.isArray(account.labels) && account.labels.includes(ADMIN_LABEL);
}

const PLANS: UserPlan[] = ["Basic", "Pro", "Enterprise", "Custom"];

function readPlan(value: unknown): UserPlan {
  return PLANS.includes(value as UserPlan) ? (value as UserPlan) : "Basic";
}

/** Fills in every gate, so a half-written prefs bag cannot crash a guard. */
export function readFeatures(value: unknown, plan: UserPlan): UserFeatures {
  const base = plan === "Custom" ? PLAN_FEATURES.Basic : PLAN_FEATURES[plan];
  const given = (value ?? {}) as Partial<UserFeatures>;

  return {
    createEbook: given.createEbook ?? base.createEbook,
    rewriteEbook: given.rewriteEbook ?? base.rewriteEbook,
    blogGenerator: given.blogGenerator ?? base.blogGenerator,
    advancedModels: given.advancedModels ?? base.advancedModels,
  };
}

/** Turns an Appwrite account into the `User` the UI already knows how to render. */
export function toUser(account: AppwriteAccount): User {
  const prefs = (account.prefs ?? {}) as AccountPrefs;
  const plan = readPlan(prefs.plan);

  return {
    id: account.$id,
    fullName: account.name || account.email || "Unnamed",
    email: account.email || "",
    role: isAdminAccount(account) ? "admin" : "user",
    // `status` is absent on the account endpoint the browser calls and present
    // on the Users API the admin screen calls; absent means "not blocked".
    status: account.status === false ? "suspended" : "active",
    registeredAt: account.$createdAt || new Date().toISOString(),
    plan,
    allowedFeatures: readFeatures(prefs.allowedFeatures, plan),
  };
}

/**
 * The prefs bag for a brand-new account. No role: a new account is an ordinary
 * user by virtue of carrying no admin label, and there is nothing to write.
 */
export function defaultPrefs(): Required<AccountPrefs> {
  return { plan: "Basic", allowedFeatures: PLAN_FEATURES.Basic };
}
