/**
 * Shared entry checks for the API routes.
 *
 * These routes spend the caller's API credits and reach out to third-party
 * providers, so they must not be callable by arbitrary origins or hammered in
 * a loop. This is deliberately dependency-free and in-process: it protects a
 * single instance. A multi-instance deployment needs a shared store (Redis)
 * behind the same interface.
 */
import { NextResponse } from "next/server";

export type GuardOptions = {
  /** Requests allowed per window, per client. */
  limit?: number;
  /** Window length in milliseconds. */
  windowMs?: number;
};

const DEFAULT_LIMIT = 20;
const DEFAULT_WINDOW_MS = 60_000;

const hits = new Map<string, number[]>();
let lastSweep = Date.now();

function sweep(now: number, windowMs: number) {
  if (now - lastSweep < windowMs) return;
  lastSweep = now;
  for (const [key, stamps] of hits) {
    const live = stamps.filter((t) => now - t < windowMs);
    if (live.length === 0) hits.delete(key);
    else hits.set(key, live);
  }
}

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();
  return request.headers.get("x-real-ip") || "local";
}

/**
 * Rejects cross-origin calls. Browsers always send Origin on a cross-origin
 * POST, so a mismatch means the request did not come from this app.
 */
function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return true; // same-origin fetches and server-side callers

  const host = request.headers.get("host");
  if (!host) return false;

  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Runs the shared checks. Returns a response to send back when the request
 * should be rejected, or `null` when the route may proceed.
 */
export function guardRequest(request: Request, options: GuardOptions = {}): NextResponse | null {
  if (!isSameOrigin(request)) {
    return NextResponse.json({ error: "Cross-origin requests are not allowed." }, { status: 403 });
  }

  const limit = options.limit ?? DEFAULT_LIMIT;
  const windowMs = options.windowMs ?? DEFAULT_WINDOW_MS;
  const now = Date.now();

  sweep(now, windowMs);

  const key = clientKey(request);
  const recent = (hits.get(key) || []).filter((t) => now - t < windowMs);

  if (recent.length >= limit) {
    const retryAfter = Math.ceil((windowMs - (now - recent[0])) / 1000);
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(retryAfter) } },
    );
  }

  recent.push(now);
  hits.set(key, recent);
  return null;
}

/** Reads a JSON body with an upper bound so a large POST cannot exhaust memory. */
export async function readJsonBody<T>(request: Request, maxBytes = 2_000_000): Promise<T> {
  const declared = Number(request.headers.get("content-length") || 0);
  if (declared > maxBytes) {
    throw new Error("Request body is too large.");
  }

  const text = await request.text();
  if (text.length > maxBytes) {
    throw new Error("Request body is too large.");
  }

  return JSON.parse(text) as T;
}
