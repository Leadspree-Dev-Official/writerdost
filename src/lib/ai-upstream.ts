/**
 * Server-only guard for outbound AI provider calls.
 *
 * The browser sends the whole `ApiSettings` object (including `baseUrl`) with
 * every request. Without validation that turns each API route into an open
 * proxy: an attacker can point `baseUrl` at an internal host and have the
 * server fetch it (SSRF). Everything that leaves this app for an AI provider
 * must go through `resolveUpstream` first.
 */
import { lookup } from "node:dns/promises";
import { isIP } from "node:net";
import { isPrivateIpv4, isPrivateIpv6, isLoopbackAddress } from "@/lib/net-guard";
import { providerDefaults } from "@/lib/ai-providers";
import type { ApiSettings } from "@/lib/store-types";

/** Providers whose endpoint is fixed by us and never taken from the client. */
const PINNED_PROVIDERS = new Set(["openai", "claude", "gemini", "deepseek", "openrouter"]);

/**
 * Extra hosts a self-hoster may allow for `custom` / `ollama_cloud`.
 * Comma-separated, e.g. WRITERDOST_ALLOWED_AI_HOSTS="ai.internal.example.com".
 */
const envAllowedHosts = (process.env.WRITERDOST_ALLOWED_AI_HOSTS || "")
  .split(",")
  .map((h) => h.trim().toLowerCase())
  .filter(Boolean);

/** Loopback AI servers (Ollama) are only reachable when explicitly enabled. */
const allowLoopback = process.env.WRITERDOST_ALLOW_LOCAL_AI !== "false";

export class UpstreamNotAllowedError extends Error {
  readonly status = 400;
}

function deny(message: string): never {
  throw new UpstreamNotAllowedError(message);
}

/**
 * Resolves the hostname and rejects any address that lands inside the
 * network the server itself sits on. Resolving here (rather than trusting the
 * hostname) is what stops DNS entries that point at private space.
 */
async function assertPublicHost(hostname: string): Promise<void> {
  let addresses: { address: string }[];

  if (isIP(hostname)) {
    addresses = [{ address: hostname }];
  } else {
    try {
      addresses = await lookup(hostname, { all: true });
    } catch {
      deny(`Could not resolve AI host "${hostname}".`);
    }
  }

  for (const { address } of addresses) {
    const priv = isIP(address) === 6 ? isPrivateIpv6(address) : isPrivateIpv4(address);
    if (!priv) continue;
    if (isLoopbackAddress(address) && allowLoopback) continue;
    deny(
      `The AI endpoint "${hostname}" resolves to a private network address. ` +
        `Use a public provider endpoint, or add the host to WRITERDOST_ALLOWED_AI_HOSTS.`,
    );
  }
}

/**
 * Returns the settings to actually call the provider with. For known providers
 * the endpoint is ours; for custom/self-hosted ones the client URL is parsed,
 * scheme-checked and resolved before it is trusted.
 */
export async function resolveUpstream(api: ApiSettings): Promise<ApiSettings> {
  if (!api || typeof api !== "object") deny("Missing AI provider settings.");

  const provider = api.provider;
  if (!provider || !(provider in providerDefaults)) {
    deny(`Unknown AI provider "${String(provider)}".`);
  }

  // Pinned providers: ignore whatever baseUrl the client sent.
  if (PINNED_PROVIDERS.has(provider)) {
    const defaults = providerDefaults[provider];
    if (!api.apiKey) deny("An API key is required for the selected provider.");
    return {
      ...api,
      baseUrl: defaults.baseUrl,
      model: api.model || defaults.model,
    };
  }

  // Ollama / custom: the user supplies the endpoint, so validate it.
  let raw = (api.baseUrl || "").trim();
  if (!raw) deny("A base URL is required for this provider.");

  // Accept the bare Ollama roots people paste and complete them.
  const ollamaShorthand: Record<string, string> = {
    "https://ollama.com": "https://ollama.com/v1/chat/completions",
    "https://ollama.com/api": "https://ollama.com/v1/chat/completions",
    "https://ollama.com/api/": "https://ollama.com/v1/chat/completions",
    "http://localhost:11434": "http://localhost:11434/v1/chat/completions",
    "http://localhost:11434/api": "http://localhost:11434/v1/chat/completions",
    "http://localhost:11434/api/": "http://localhost:11434/v1/chat/completions",
  };
  raw = ollamaShorthand[raw] ?? raw;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    deny("The AI base URL is not a valid URL.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    deny("The AI base URL must use http or https.");
  }

  const host = url.hostname.toLowerCase();
  const explicitlyAllowed = envAllowedHosts.includes(host);

  // Plain http is only acceptable for a local model server.
  if (url.protocol === "http:" && !isLoopbackAddress(host) && host !== "localhost" && !explicitlyAllowed) {
    deny("Remote AI endpoints must use https.");
  }

  if (!explicitlyAllowed) {
    await assertPublicHost(host);
  }

  if (provider !== "ollama" && !api.apiKey) {
    deny("An API key is required for the selected provider.");
  }

  if (!api.model) deny("A model name is required.");

  return { ...api, baseUrl: url.toString() };
}
