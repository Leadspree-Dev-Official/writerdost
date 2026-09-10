/**
 * Stand-in for the InstaGuru Marketplace API.
 *
 * InstaGuru is still being built, so these routes answer locally instead of
 * calling a live host. They validate the same fields the real service will
 * require and return the same shapes, so the app's publish flow is exercised
 * end to end. Nothing is stored and nothing leaves this machine.
 */
import { NextResponse } from "next/server";

export type Credentials = {
  baseUrl?: unknown;
  apiKey?: unknown;
  sellerId?: unknown;
};

/** Keys the real service will issue. Anything shorter is a typo, not a key. */
const MIN_KEY_LENGTH = 12;
const KEY_PREFIX = "ig_";

export type CheckedCredentials = { apiKey: string; sellerId: string; baseUrl: string };

/**
 * Mirrors the marketplace's own auth errors. Returns a response to send back,
 * or the cleaned credentials when the request may proceed.
 */
export function checkCredentials(
  body: Credentials,
): { error: NextResponse } | { ok: CheckedCredentials } {
  const apiKey = typeof body.apiKey === "string" ? body.apiKey.trim() : "";
  const sellerId = typeof body.sellerId === "string" ? body.sellerId.trim() : "";
  const baseUrl = typeof body.baseUrl === "string" ? body.baseUrl.trim() : "";

  if (!apiKey) {
    return { error: NextResponse.json({ error: "Missing API key." }, { status: 401 }) };
  }
  if (apiKey.length < MIN_KEY_LENGTH) {
    return {
      error: NextResponse.json(
        { error: `That key is too short to be valid (expected at least ${MIN_KEY_LENGTH} characters).` },
        { status: 401 },
      ),
    };
  }
  if (!apiKey.startsWith(KEY_PREFIX)) {
    return {
      error: NextResponse.json(
        { error: `Marketplace keys start with "${KEY_PREFIX}". Copy the key from your seller dashboard.` },
        { status: 401 },
      ),
    };
  }
  if (!sellerId) {
    return { error: NextResponse.json({ error: "Missing seller ID." }, { status: 400 }) };
  }

  return { ok: { apiKey, sellerId, baseUrl } };
}

/** Same id for the same project, so republishing updates one listing. */
export function listingIdFor(sellerId: string, projectId: string): string {
  let hash = 0;
  for (const char of `${sellerId}:${projectId}`) {
    hash = (hash * 31 + char.charCodeAt(0)) | 0;
  }
  return `lst_${Math.abs(hash).toString(36).padStart(7, "0")}`;
}

/** A little latency, so the UI's pending states are actually visible. */
export const simulateLatency = (ms = 850) => new Promise((resolve) => setTimeout(resolve, ms));
