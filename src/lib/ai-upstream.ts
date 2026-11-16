/**
 * Server-only guard for outbound AI provider calls.
 *
 * The browser sends the whole `ApiSettings` object (including `baseUrl`) with
 * every request. Without validation that turns each API route into an open
 * proxy: an attacker can point `baseUrl` at an internal host and have the
 * server fetch it (SSRF). Everything that leaves this app for an AI provider
 * must go through `resolveUpstream` first.
 */
import { assertPublicHost as assertPublicAddresses } from "@/lib/net-guard";
import { isLoopbackAddress } from "@/lib/outbound-policy";
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

/** Loopback AI servers (Ollama) are opt-in; production also requires self-hosted mode. */
const allowLoopback =
  process.env.WRITERDOST_ALLOW_LOCAL_AI === "true" &&
  (process.env.WRITERDOST_SELF_HOSTED === "true" || process.env.NODE_ENV === "development");

export class UpstreamNotAllowedError extends Error {
  readonly status = 400;
}

function deny(message: string): never {
  throw new UpstreamNotAllowedError(message);
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
    const serverFallbackKey =
      process.env.BIZAI_GATEWAY_KEY ||
      process.env.OPENROUTER_API_KEY ||
      process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.GEMINI_API_KEY;
    const effectiveApiKey = api.apiKey || serverFallbackKey;

    if (!effectiveApiKey) {
      deny("An API key is required for the selected provider. Add your personal BYOK key in Settings or set up the BizAI Gateway server key.");
    }
    return {
      ...api,
      apiKey: effectiveApiKey,
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
    try {
      await assertPublicAddresses(host, { allowLoopback, label: "AI endpoint" });
    } catch (error) {
      deny(error instanceof Error ? error.message : `Could not validate AI host "${host}".`);
    }
  }

  if (provider !== "ollama" && !api.apiKey) {
    deny("An API key is required for the selected provider.");
  }

  if (!api.model) deny("A model name is required.");

  return { ...api, baseUrl: url.toString() };
}
