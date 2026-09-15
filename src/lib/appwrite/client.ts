/**
 * Appwrite access for the browser.
 *
 * The browser talks to Appwrite for one thing only: the account. Sessions,
 * sign-up, sign-out and the short-lived JWT that authenticates this app's own
 * API routes all come from here.
 *
 * Data deliberately does NOT go through this client. Destination tokens and
 * the AI key an automation spends are encrypted with a server-held key before
 * they are stored, so every write goes through a route in src/app/api that
 * holds that key. The browser never sees ciphertext and never sees the key.
 */
import { Account, Client } from "appwrite";

const ENDPOINT =
  process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "https://sgp.cloud.appwrite.io/v1";
const PROJECT_ID =
  process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "6aa84ecb00304c7935ad";

/** True when the browser has enough configuration to reach Appwrite. */
export function appwriteBrowserConfigured(): boolean {
  return Boolean(ENDPOINT && PROJECT_ID);
}

let cached: Account | null = null;

/**
 * The Account client, built once. Throws rather than failing later with an
 * opaque network error, so a missing NEXT_PUBLIC_ variable is obvious.
 */
export function account(): Account {
  if (!appwriteBrowserConfigured()) {
    throw new Error(
      "Appwrite is not configured. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and " +
        "NEXT_PUBLIC_APPWRITE_PROJECT_ID.",
    );
  }
  if (!cached) {
    cached = new Account(new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID));
  }
  return cached;
}

/**
 * A JWT for calling this app's API routes.
 *
 * Appwrite JWTs last 15 minutes. One is reused for five, which keeps the
 * workspace autosave from minting a token every time the author pauses typing
 * while staying far enough inside the lifetime that a cached token cannot
 * expire in flight. `clearAuthCache` drops it whenever the account changes.
 */
const JWT_REUSE_MS = 5 * 60_000;

let cachedJwt: { token: string; mintedAt: number } | null = null;

export function clearAuthCache(): void {
  cachedJwt = null;
}

export async function authHeader(): Promise<Record<string, string>> {
  if (cachedJwt && Date.now() - cachedJwt.mintedAt < JWT_REUSE_MS) {
    return { authorization: `Bearer ${cachedJwt.token}` };
  }

  const { jwt } = await account().createJWT();
  cachedJwt = { token: jwt, mintedAt: Date.now() };
  return { authorization: `Bearer ${jwt}` };
}

/**
 * Appwrite errors carry a useful `message`; anything else gets a generic one
 * so a stray object never reaches the UI as "[object Object]".
 */
export function appwriteMessage(error: unknown, fallback: string): string {
  if (error && typeof error === "object" && "message" in error) {
    const message = (error as { message?: unknown }).message;
    if (typeof message === "string" && message.trim()) return message;
  }
  return fallback;
}
