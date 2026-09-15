/**
 * Shared outbound-request guard.
 *
 * The automation engine fetches URLs the user supplies (RSS feeds, sitemaps,
 * article pages) and posts to endpoints the user supplies (WordPress, Ghost,
 * webhooks). Every one of those is an SSRF vector: without validation the
 * server can be pointed at an internal host or the cloud metadata endpoint.
 *
 * The AI layer already had this protection; this module is the shared
 * implementation so feed fetching and publishing get exactly the same checks.
 */
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class BlockedRequestError extends Error {
  readonly status = 400;
}

export function denyRequest(message: string): never {
  throw new BlockedRequestError(message);
}

export function isPrivateIpv4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  if (a === 10 || a === 127 || a === 0) return true;
  if (a === 172 && b >= 16 && b <= 31) return true;
  if (a === 192 && b === 168) return true;
  if (a === 169 && b === 254) return true; // link-local / cloud metadata
  if (a === 100 && b >= 64 && b <= 127) return true; // CGNAT
  return a >= 224; // multicast + reserved
}

export function isPrivateIpv6(ip: string): boolean {
  const addr = ip.toLowerCase();
  if (addr === "::1" || addr === "::") return true;
  if (addr.startsWith("fc") || addr.startsWith("fd")) return true; // unique-local
  if (addr.startsWith("fe80")) return true; // link-local
  const mapped = addr.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIpv4(mapped[1]);
  return false;
}

export function isLoopbackAddress(ip: string): boolean {
  return ip === "::1" || ip.startsWith("127.");
}

/**
 * Resolves the hostname and rejects any address inside the network the server
 * itself sits on. Resolving here — rather than trusting the hostname — is what
 * stops a public DNS record that points at private space.
 */
export async function assertPublicHost(
  hostname: string,
  { allowLoopback = false, label = "endpoint" }: { allowLoopback?: boolean; label?: string } = {},
): Promise<void> {
  let addresses: { address: string }[];

  if (isIP(hostname)) {
    addresses = [{ address: hostname }];
  } else {
    try {
      addresses = await lookup(hostname, { all: true });
    } catch {
      denyRequest(`Could not resolve ${label} host "${hostname}".`);
    }
  }

  for (const { address } of addresses) {
    const priv = isIP(address) === 6 ? isPrivateIpv6(address) : isPrivateIpv4(address);
    if (!priv) continue;
    if (isLoopbackAddress(address) && allowLoopback) continue;
    denyRequest(`The ${label} "${hostname}" resolves to a private network address.`);
  }
}

/**
 * Validates a user-supplied URL before the server fetches or posts to it.
 * Returns the parsed URL so callers use the normalised form.
 */
export async function assertSafeUrl(
  raw: string,
  {
    label = "URL",
    allowHttp = false,
    allowLoopback = false,
  }: { label?: string; allowHttp?: boolean; allowLoopback?: boolean } = {},
): Promise<URL> {
  const trimmed = (raw || "").trim();
  if (!trimmed) denyRequest(`A ${label} is required.`);

  let url: URL;
  try {
    url = new URL(trimmed);
  } catch {
    denyRequest(`The ${label} is not a valid URL.`);
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    denyRequest(`The ${label} must use http or https.`);
  }

  const isDev = process.env.NODE_ENV !== "production";
  const effectiveAllowHttp =
    allowHttp || (isDev && (url.hostname === "localhost" || url.hostname === "127.0.0.1"));
  const effectiveAllowLoopback = allowLoopback || isDev;

  if (url.protocol === "http:" && !effectiveAllowHttp) {
    denyRequest(`The ${label} must use https.`);
  }

  await assertPublicHost(url.hostname.toLowerCase(), { label, allowLoopback: effectiveAllowLoopback });
  return url;
}

/** Caps how much of a remote document we will pull into memory. */
export const MAX_FETCH_BYTES = 3_000_000;

/**
 * Fetches a validated URL with a timeout and a hard size ceiling. Redirects
 * are followed manually so each hop is re-validated — otherwise a public URL
 * could 302 the server straight to an internal address.
 */
export async function safeFetch(
  rawUrl: string,
  init: RequestInit & {
    timeoutMs?: number;
    maxBytes?: number;
    label?: string;
    allowHttp?: boolean;
    allowLoopback?: boolean;
  } = {},
): Promise<{ url: string; status: number; contentType: string; body: string }> {
  const {
    timeoutMs = 20_000,
    maxBytes = MAX_FETCH_BYTES,
    label = "URL",
    allowHttp,
    allowLoopback,
    ...requestInit
  } = init;

  let current = await assertSafeUrl(rawUrl, { label, allowHttp, allowLoopback });
  let response: Response | null = null;

  for (let hop = 0; hop < 5; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    try {
      response = await fetch(current.toString(), {
        ...requestInit,
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": "WriterdostBot/1.0 (+content automation)",
          ...(requestInit.headers as Record<string, string> | undefined),
        },
      });
    } catch (error) {
      if ((error as Error).name === "AbortError") denyRequest(`Timed out fetching ${label}.`);
      throw error;
    } finally {
      clearTimeout(timer);
    }

    const location = response.headers.get("location");
    if (response.status >= 300 && response.status < 400 && location) {
      // Re-validate every hop: this is the check that makes redirects safe.
      current = await assertSafeUrl(new URL(location, current).toString(), { label });
      continue;
    }
    break;
  }

  if (!response) denyRequest(`Could not fetch ${label}.`);

  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > maxBytes) denyRequest(`The ${label} response is too large.`);

  const text = await response.text();
  if (text.length > maxBytes) denyRequest(`The ${label} response is too large.`);

  return {
    url: current.toString(),
    status: response.status,
    contentType: response.headers.get("content-type") || "",
    body: text,
  };
}
