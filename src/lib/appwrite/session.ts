/**
 * Turning a request into a user, server-side.
 *
 * The browser mints a short-lived Appwrite JWT and sends it as a bearer token.
 * This module hands that JWT straight back to Appwrite and asks who it belongs
 * to. Appwrite verifies the signature and expiry, so nothing here has to: an
 * expired or forged token simply fails the `account.get()` call.
 *
 * Two things come back from `requireUser`:
 *  - the resolved user, so a route can stamp `userId` on what it writes;
 *  - a TablesDB client carrying the same JWT, so Appwrite's own row
 *    permissions decide what the caller can reach. A bug in a route's filter
 *    therefore cannot leak another user's rows — the database refuses first.
 *
 * The API-key worker client is NOT used for user-facing routes for exactly
 * that reason. It appears only where acting for everyone is the point: the
 * scheduler, and the admin screens.
 */
import { Account, Client, Users, type TablesDB } from "node-appwrite";
import { NextResponse } from "next/server";
import { isAdminAccount, toUser } from "@/lib/auth/profile";
import type { User } from "@/lib/store-types";
import { userTables } from "./server";

const ENDPOINT =
  process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const API_KEY = process.env.APPWRITE_API_KEY || "";

export type Session = {
  user: User;
  /** Scoped to this user: row permissions apply to every read and write. */
  tables: TablesDB;
  jwt: string;
};

/** Reads the bearer token. Returns "" when the header is absent or malformed. */
function bearer(request: Request): string {
  const header = request.headers.get("authorization") || "";
  const match = /^Bearer\s+(.+)$/i.exec(header.trim());
  return match ? match[1].trim() : "";
}

/** The Users API. Server-only: it can read and modify any account. */
export function adminUsers(): Users {
  if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
    throw new Error("Appwrite is not configured for administrative access.");
  }
  return new Users(new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY));
}

/**
 * Resolves the caller, or null when the token is missing, expired or invalid.
 * Routes should prefer `requireUser`, which turns that null into a 401.
 */
export async function currentUser(request: Request): Promise<Session | null> {
  const jwt = bearer(request);
  if (!jwt || !ENDPOINT || !PROJECT_ID) return null;

  try {
    const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setJWT(jwt);
    const account = await new Account(client).get();
    return { user: toUser(account), tables: userTables(jwt), jwt };
  } catch {
    // A bad or expired JWT is an ordinary 401, not something to log loudly.
    return null;
  }
}

export type Guarded<T> = { session: T; denied: null } | { session: null; denied: NextResponse };

/** `const { session, denied } = await requireUser(request); if (denied) return denied;` */
export async function requireUser(request: Request): Promise<Guarded<Session>> {
  const session = await currentUser(request);
  if (!session) {
    return {
      session: null,
      denied: NextResponse.json({ error: "Sign in to continue." }, { status: 401 }),
    };
  }
  return { session, denied: null };
}

/**
 * Same, but the caller must be an administrator.
 *
 * Administrator means one thing: the account carries the `admin` *label*.
 * Labels are set only through the server Users API, which needs the
 * `users.write` scope — Appwrite exposes no account-side endpoint for them, so
 * a signed-in user cannot give themselves one.
 *
 * It is deliberately NOT account preferences. Prefs are writable by the
 * account holder, and re-reading them through the Users API does not launder
 * them: that call returns the same bag the user just wrote. An earlier version
 * of this function did exactly that, and any signed-up account could take over
 * the admin screens by PATCHing its own /account/prefs.
 */
export async function requireAdmin(request: Request): Promise<Guarded<Session>> {
  const { session, denied } = await requireUser(request);
  if (denied) return { session: null, denied };

  try {
    const authoritative = await adminUsers().get({ userId: session.user.id });
    if (!isAdminAccount(authoritative)) {
      return {
        session: null,
        denied: NextResponse.json({ error: "Administrators only." }, { status: 403 }),
      };
    }
    return { session: { ...session, user: toUser(authoritative) }, denied: null };
  } catch {
    return {
      session: null,
      denied: NextResponse.json({ error: "Administrators only." }, { status: 403 }),
    };
  }
}
