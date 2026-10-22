/**
 * Shared outbound-request guard.
 *
 * The automation engine fetches URLs the user supplies (RSS feeds, sitemaps,
 * article pages) and posts to endpoints the user supplies (WordPress, Ghost,
 * webhooks). Every one of those is an SSRF vector: without validation the
 * server can be pointed at an internal host or the cloud metadata endpoint.
 *
 * Validation is done against the resolved address, and the connection is
 * pinned to that same address so DNS cannot rebind between the check and the
 * request. Redirects are followed manually and revalidated on every hop.
 */
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { fetch as undiciFetch } from "undici";
import {
  isLoopbackAddress,
  isPublicAddress,
  normalizeHost,
  pinnedAgent,
} from "@/lib/outbound-policy";

export class BlockedRequestError extends Error {
  readonly status = 400;
}

export function denyRequest(message: string): never {
  throw new BlockedRequestError(message);
}

export function isPrivateIpv4(ip: string): boolean {
  return !isPublicAddress(ip);
}

export function isPrivateIpv6(ip: string): boolean {
  return !isPublicAddress(ip);
}

export { isLoopbackAddress };

/**
 * Resolves the hostname and rejects any address inside the network the server
 * itself sits on. Returns the validated addresses so the caller can pin the
 * connection to one of them.
 */
export async function assertPublicHost(
  hostname: string,
  { allowLoopback = false, label = "endpoint" }: { allowLoopback?: boolean; label?: string } = {},
): Promise<string[]> {
  const host = normalizeHost(hostname);
  let addresses: { address: string }[];

  if (isIP(host)) {
    addresses = [{ address: host }];
  } else {
    try {
      addresses = await lookup(host, { all: true });
    } catch {
      denyRequest(`Could not resolve ${label} host "${hostname}".`);
    }
  }

  if (addresses.length === 0) denyRequest(`Could not resolve ${label} host "${hostname}".`);

  for (const { address } of addresses) {
    if (isPublicAddress(address)) continue;
    if (allowLoopback && isLoopbackAddress(address)) continue;
    denyRequest(`The ${label} "${hostname}" resolves to a private network address.`);
  }

  return addresses.map(({ address }) => address);
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
  if (url.protocol === "http:" && !allowHttp) {
    denyRequest(`The ${label} must use https.`);
  }

  await assertPublicHost(url.hostname.toLowerCase(), { label, allowLoopback });
  return url;
}

/** Caps how much of a remote document we will pull into memory. */
export const MAX_FETCH_BYTES = 3_000_000;

const SENSITIVE_HEADERS = ["authorization", "cookie", "x-api-key", "x-cron-secret"];

function stripSensitive(headers: Headers): void {
  for (const key of SENSITIVE_HEADERS) headers.delete(key);
}

/**
 * Fetches a validated URL with a timeout and a hard size ceiling. Redirects
 * are followed manually so each hop is re-validated and credentials are not
 * forwarded to a different origin.
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

  const headers = new Headers(requestInit.headers);
  if (!headers.has("user-agent")) {
    headers.set("User-Agent", "WriterdostBot/1.0 (+content automation)");
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    for (let hop = 0; hop < 5; hop += 1) {
      const addresses = await assertPublicHost(current.hostname.toLowerCase(), {
        label,
        allowLoopback,
      });
      const dispatcher = pinnedAgent(addresses[0]);

      try {
        const response = await undiciFetch(current.toString(), {
          method: requestInit.method || "GET",
          body: requestInit.body as BodyInit | null | undefined,
          headers,
          redirect: "manual",
          signal: controller.signal,
          dispatcher,
        } as Parameters<typeof undiciFetch>[1]);

        const location = response.headers.get("location");
        if (response.status >= 300 && response.status < 400 && location) {
          await response.body?.cancel();
          const next = new URL(location, current);
          if (next.origin !== current.origin) stripSensitive(headers);
          current = await assertSafeUrl(next.toString(), {
            label,
            allowHttp,
            allowLoopback,
          });
          continue;
        }

        const declared = Number(response.headers.get("content-length") || 0);
        if (declared > maxBytes) denyRequest(`The ${label} response is too large.`);

        const contentType = response.headers.get("content-type") || "";
        const reader = response.body?.getReader();
        if (!reader) {
          return { url: current.toString(), status: response.status, contentType, body: "" };
        }

        const decoder = new TextDecoder();
        let body = "";
        let total = 0;
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          total += value.byteLength;
          if (total > maxBytes) {
            controller.abort();
            denyRequest(`The ${label} response is too large.`);
          }
          body += decoder.decode(value, { stream: true });
        }
        body += decoder.decode();

        return { url: current.toString(), status: response.status, contentType, body };
      } finally {
        await dispatcher.close();
      }
    }

    denyRequest(`Too many redirects while fetching ${label}.`);
  } catch (error) {
    if ((error as Error).name === "AbortError") denyRequest(`Timed out fetching ${label}.`);
    throw error;
  } finally {
    clearTimeout(timer);
  }
}
