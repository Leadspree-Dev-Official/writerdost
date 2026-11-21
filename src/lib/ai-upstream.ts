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
import { getBizAiGatewayConfig } from "@/lib/server-subscription-store";
import type { ApiProvider, ApiSettings } from "@/lib/store-types";

/** Providers whose default endpoint is pre-configured by us. */
const PINNED_PROVIDERS = new Set(["openai", "claude", "gemini", "deepseek", "groq", "commandcode", "openrouter", "experiential"]);

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

/** Resolves the server-managed gateway key for a provider from admin config or env. */
export function getServerGatewayKeyForProvider(provider: ApiProvider): string {
  try {
    const gateway = getBizAiGatewayConfig();
    const serverKey =
      provider === "claude" ? gateway?.serverKeys?.anthropic :
      provider === "openai" ? gateway?.serverKeys?.openai :
      provider === "gemini" ? gateway?.serverKeys?.gemini :
      provider === "deepseek" ? gateway?.serverKeys?.deepseek :
      provider === "groq" ? gateway?.serverKeys?.groq :
      provider === "commandcode" ? gateway?.serverKeys?.commandcode :
      provider === "openrouter" ? gateway?.serverKeys?.openrouter :
      provider === "experiential" ? gateway?.serverKeys?.experiential : "";
    if (serverKey) return serverKey;
  } catch {
    // ignore
  }

  if (provider === "claude") return process.env.ANTHROPIC_API_KEY || process.env.BIZAI_GATEWAY_KEY || "";
  if (provider === "openai") return process.env.OPENAI_API_KEY || process.env.BIZAI_GATEWAY_KEY || "";
  if (provider === "gemini") return process.env.GEMINI_API_KEY || process.env.BIZAI_GATEWAY_KEY || "";
  if (provider === "deepseek") return process.env.DEEPSEEK_API_KEY || process.env.BIZAI_GATEWAY_KEY || "";
  if (provider === "groq") return process.env.GROQ_API_KEY || process.env.BIZAI_GATEWAY_KEY || "";
  if (provider === "commandcode") return process.env.COMMANDCODE_API_KEY || process.env.BIZAI_GATEWAY_KEY || "";
  if (provider === "openrouter") return process.env.OPENROUTER_API_KEY || process.env.BIZAI_GATEWAY_KEY || "";
  if (provider === "experiential") return process.env.EXPLABS_API_KEY || process.env.EXPERIENTIAL_API_KEY || process.env.BIZAI_GATEWAY_KEY || "";

  return process.env.BIZAI_GATEWAY_KEY || "";
}

/** Validates and canonicalizes any arbitrary or custom AI endpoint URL against SSRF rules. */
async function validateEndpointUrl(rawUrl: string, provider: ApiProvider): Promise<string> {
  const ollamaShorthand: Record<string, string> = {
    "https://ollama.com": "https://ollama.com/v1/chat/completions",
    "https://ollama.com/api": "https://ollama.com/v1/chat/completions",
    "https://ollama.com/api/": "https://ollama.com/v1/chat/completions",
    "http://localhost:11434": "http://localhost:11434/v1/chat/completions",
    "http://localhost:11434/api": "http://localhost:11434/v1/chat/completions",
    "http://localhost:11434/api/": "http://localhost:11434/v1/chat/completions",
  };
  const normalizedRaw = ollamaShorthand[rawUrl] ?? rawUrl;

  let url: URL;
  try {
    url = new URL(normalizedRaw);
  } catch {
    deny("The AI endpoint URL is not a valid URL.");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    deny("The AI endpoint URL must use http or https.");
  }

  // Normalize OpenAI-compatible base URLs ending with /v1 or /v1/ to chat/completions (except for claude native format)
  if (provider !== "claude" && (url.pathname.endsWith("/v1") || url.pathname.endsWith("/v1/"))) {
    url.pathname = url.pathname.replace(/\/+$/, "") + "/chat/completions";
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

  return url.toString();
}

/**
 * Returns the settings to actually call the provider with. For known providers
 * the default endpoint is standard, but custom proxy endpoints are validated and
 * accepted. For custom/self-hosted providers the client URL is parsed,
 * scheme-checked and resolved before it is trusted.
 */
export async function resolveUpstream(api: ApiSettings): Promise<ApiSettings> {
  if (!api || typeof api !== "object") deny("Missing AI provider settings.");

  const provider = api.provider;
  if (!provider || !(provider in providerDefaults)) {
    deny(`Unknown AI provider "${String(provider)}".`);
  }

  // Pinned providers: use default standard endpoint, or custom endpoint if supplied by user.
  if (PINNED_PROVIDERS.has(provider)) {
    const defaults = providerDefaults[provider];
    const serverFallbackKey = getServerGatewayKeyForProvider(provider);
    const effectiveApiKey = api.apiKey || serverFallbackKey;

    if (!effectiveApiKey) {
      deny("An API key is required for the selected provider. Add your personal BYOK key in Settings or set up the BizAI Gateway server key in Admin.");
    }

    let targetBaseUrl = defaults.baseUrl;
    const clientBaseUrl = (api.baseUrl || "").trim();
    if (clientBaseUrl && clientBaseUrl !== defaults.baseUrl) {
      targetBaseUrl = await validateEndpointUrl(clientBaseUrl, provider);
    } else {
      try {
        const gateway = getBizAiGatewayConfig();
        const customGatewayEndpoint = gateway?.customEndpoints?.[provider]?.trim();
        if (customGatewayEndpoint && customGatewayEndpoint !== defaults.baseUrl) {
          targetBaseUrl = await validateEndpointUrl(customGatewayEndpoint, provider);
        }
      } catch {
        // ignore
      }
    }

    return {
      ...api,
      apiKey: effectiveApiKey,
      baseUrl: targetBaseUrl,
      model: api.model || defaults.model,
    };
  }

  // Ollama / custom: the user supplies the endpoint, so validate it.
  const raw = (api.baseUrl || "").trim();
  if (!raw) deny("A base URL is required for this provider.");
  const validatedBaseUrl = await validateEndpointUrl(raw, provider);

  if (provider !== "ollama" && !api.apiKey) {
    deny("An API key is required for the selected provider.");
  }

  if (!api.model) deny("A model name is required.");

  return { ...api, baseUrl: validatedBaseUrl };
}
