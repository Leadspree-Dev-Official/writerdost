import { resolveUpstream, UpstreamNotAllowedError, getServerGatewayKeyForProvider } from "@/lib/ai-upstream";
import { BlockedRequestError, safeFetch } from "@/lib/net-guard";
import { providerDefaults } from "@/lib/ai-providers";
import { getBizAiGatewayConfig, hydrateGatewayConfigFromKv } from "@/lib/server-subscription-store";
import type { ApiSettings, BizAiGatewayConfig, ApiProvider } from "@/lib/store-types";

export type ChatResponse = {
  text: string;
  usage: {
    total_tokens: number;
    input_tokens?: number;
    output_tokens?: number;
  };
};

/** Shape of the pieces of a provider response we actually read. */
type ProviderPayload = {
  choices?: Array<{ message?: { content?: string } }>;
  content?: Array<{ text?: string }>;
  usage?: {
    total_tokens?: number;
    input_tokens?: number;
    output_tokens?: number;
    prompt_tokens?: number;
    completion_tokens?: number;
  };
  error?: { message?: string; msg?: string };
};

type ProviderError = Error & { status?: number };

/** How long a single upstream call may run before it is aborted. */
const REQUEST_TIMEOUT_MS = 300_000;

/**
 * Only true local Ollama (localhost) can skip an API key. Ollama Cloud is a
 * hosted, authenticated service and must be treated like every other provider.
 */
export function isLiveAiReady(api: ApiSettings): boolean {
  return Boolean(api.baseUrl && api.model && (api.apiKey || api.provider === "ollama"));
}

function buildHeaders(api: ApiSettings, isClaude: boolean): Record<string, string> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };

  if (api.apiKey) {
    if (isClaude) {
      headers["x-api-key"] = api.apiKey;
      headers["anthropic-version"] = "2023-06-01";
    } else {
      headers.Authorization = `Bearer ${api.apiKey}`;
    }
  }

  if (api.provider === "openrouter") {
    if (api.siteUrl) headers["HTTP-Referer"] = api.siteUrl;
    headers["X-Title"] = api.appName || "Writerdost AI";
  }

  return headers;
}

function buildBody(
  api: ApiSettings,
  isClaude: boolean,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  topP: number,
) {
  if (isClaude) {
    return {
      model: api.model,
      system: systemPrompt,
      messages: [{ role: "user", content: userPrompt }],
      max_tokens: 4096,
      temperature,
      top_p: topP,
    };
  }

  return {
    model: api.model,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userPrompt },
    ],
    temperature,
    top_p: topP,
    max_tokens: 4096,
  };
}

function readPayload(payload: ProviderPayload, isClaude: boolean): ChatResponse {
  if (isClaude && Array.isArray(payload.content)) {
    const input = payload.usage?.input_tokens ?? payload.usage?.prompt_tokens ?? 0;
    const output = payload.usage?.output_tokens ?? payload.usage?.completion_tokens ?? 0;
    const total = payload.usage?.total_tokens ?? (input + output);
    return {
      text: payload.content
        .map((item) => item.text ?? "")
        .join("\n")
        .trim(),
      usage: {
        total_tokens: total,
        input_tokens: input,
        output_tokens: output,
      },
    };
  }

  const input = payload.usage?.prompt_tokens ?? payload.usage?.input_tokens ?? 0;
  const output = payload.usage?.completion_tokens ?? payload.usage?.output_tokens ?? 0;
  const total = payload.usage?.total_tokens ?? (input + output);

  return {
    text: (payload.choices?.[0]?.message?.content || "").trim(),
    usage: {
      total_tokens: total,
      input_tokens: input,
      output_tokens: output,
    },
  };
}

/** Exported strictly for unit testing payload parsing logic. */
export const readPayloadForTest = readPayload;

/**
 * Executes a single AI provider call against a resolved upstream.
 * Transient failures (5xx) are retried; definitive 4xx are thrown immediately.
 */
async function executeUpstreamAttempt(
  upstream: ApiSettings,
  systemPrompt: string,
  userPrompt: string,
  temperature: number,
  topP: number
): Promise<ChatResponse> {
  const isClaude = upstream.provider === "claude";
  const headers = buildHeaders(upstream, isClaude);
  const bodyData = buildBody(upstream, isClaude, systemPrompt, userPrompt, temperature, topP);
  const allowHttp = upstream.baseUrl.startsWith("http://");
  const allowLoopback =
    process.env.WRITERDOST_ALLOW_LOCAL_AI === "true" &&
    (process.env.WRITERDOST_SELF_HOSTED === "true" || process.env.NODE_ENV === "development");

  let retries = 2;
  let delay = 1000;

  while (retries >= 0) {
    try {
      const response = await safeFetch(upstream.baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(bodyData),
        timeoutMs: REQUEST_TIMEOUT_MS,
        maxBytes: 10_000_000,
        label: "AI provider",
        allowHttp,
        allowLoopback,
      });

      let payload: ProviderPayload = {};
      if (response.contentType.includes("application/json")) {
        try {
          payload = JSON.parse(response.body) as ProviderPayload;
        } catch {
          payload = {};
        }
      } else {
        payload = {
          error: { message: response.body || `HTTP ${response.status}` },
        };
      }

      if (response.status < 200 || response.status >= 300) {
        const message =
          payload.error?.message ||
          (isClaude ? payload.error?.msg : null) ||
          `The AI provider returned ${response.status}.`;
        const error = new Error(message) as ProviderError;
        error.status = response.status;
        throw error;
      }

      const result = readPayload(payload, isClaude);
      if (!result.text) {
        throw new Error("The AI provider returned an empty response.");
      }

      return result;
    } catch (error) {
      if (error instanceof UpstreamNotAllowedError) throw error;
      if (error instanceof BlockedRequestError) {
        if (error.message.startsWith("Timed out")) {
          const timeoutErr = new Error("The AI provider timed out.") as ProviderError;
          timeoutErr.status = 504;
          throw timeoutErr;
        }
        throw new UpstreamNotAllowedError(error.message);
      }

      const err = error as ProviderError;
      const status = err.status;
      const isDefinitive4xx = typeof status === "number" && status >= 400 && status < 500 && status !== 429;

      // For rate limits (429), fail fast to let failover chain immediately activate
      if (status === 429 || retries === 0 || isDefinitive4xx) {
        throw err;
      }

      retries -= 1;
      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    }
  }

  throw new Error("Failed to call AI model after maximum retries.");
}

function shouldTriggerFailover(
  error: unknown,
  triggers: BizAiGatewayConfig["failoverTriggers"]
): boolean {
  const err = error as ProviderError;
  const status = err?.status;
  const message = (err?.message || "").toLowerCase();

  if (
    triggers.rateLimit429 &&
    (status === 429 ||
      message.includes("429") ||
      message.includes("rate limit") ||
      message.includes("rate_limit") ||
      message.includes("quota exceeded") ||
      message.includes("resource has been exhausted") ||
      message.includes("too many requests"))
  ) {
    return true;
  }

  if (
    triggers.serverErrors5xx &&
    ((typeof status === "number" && status >= 500 && status < 600) ||
      message.includes("500") ||
      message.includes("502") ||
      message.includes("503") ||
      message.includes("504") ||
      message.includes("upstream error") ||
      message.includes("bad gateway") ||
      message.includes("service unavailable") ||
      message.includes("internal server error"))
  ) {
    return true;
  }

  if (
    triggers.timeout &&
    (status === 504 ||
      message.includes("timed out") ||
      message.includes("timeout") ||
      message.includes("aborted"))
  ) {
    return true;
  }

  return false;
}

/**
 * Calls the configured AI provider with Multi-Model Outage / 429 Failover Chain.
 * If Primary hits a rate limit (429), server error (500/503), or timeout,
 * it seamlessly fails over in real-time to Secondary and Tertiary tiers
 * so user book generation never halts mid-manuscript.
 */
export async function callModel({
  api,
  systemPrompt,
  userPrompt,
  temperature = 0.7,
  topP = 0.9,
  engine,
}: {
  api: ApiSettings;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  topP?: number;
  engine?: "bizai" | "byok";
}): Promise<ChatResponse> {
  const effectiveApi = { ...api };
  let gatewayConfig: BizAiGatewayConfig | null = null;
  try {
    gatewayConfig = await hydrateGatewayConfigFromKv();
  } catch {
    gatewayConfig = getBizAiGatewayConfig();
  }

  // Check if current provider has a usable key (either from client BYOK or from server gateway config)
  const serverKeyForCurrent = effectiveApi.provider
    ? getServerGatewayKeyForProvider(effectiveApi.provider)
    : "";
  const hasUsableKey = Boolean(
    effectiveApi.apiKey || serverKeyForCurrent || effectiveApi.provider === "ollama"
  );

  const primaryInstance = gatewayConfig?.instances?.find(
    (i) => i.tier === "primary" || i.id === gatewayConfig.primaryInstanceId
  );

  // If engine is explicitly 'bizai' OR if user has no usable key for the requested provider:
  // Route to the BizAI Gateway's configured primary provider / instance!
  if ((engine === "bizai" || !hasUsableKey)) {
    if (primaryInstance) {
      effectiveApi.provider = primaryInstance.provider;
      effectiveApi.model =
        primaryInstance.model ||
        providerDefaults[primaryInstance.provider]?.model ||
        "";
      effectiveApi.baseUrl =
        primaryInstance.customEndpoint ||
        providerDefaults[primaryInstance.provider]?.baseUrl ||
        "";
      effectiveApi.apiKey = primaryInstance.apiKey || "";
    } else if (gatewayConfig?.primaryProvider) {
      effectiveApi.provider = gatewayConfig.primaryProvider;
      effectiveApi.model =
        gatewayConfig.providerModels?.[gatewayConfig.primaryProvider] ||
        gatewayConfig.primaryModel ||
        providerDefaults[gatewayConfig.primaryProvider]?.model ||
        "";
      effectiveApi.baseUrl =
        gatewayConfig.customEndpoints?.[gatewayConfig.primaryProvider] ||
        providerDefaults[gatewayConfig.primaryProvider]?.baseUrl ||
        "";
      effectiveApi.apiKey = ""; // resolved by resolveUpstream using server gateway keys
    }
  }

  const primaryUpstream = await resolveUpstream(effectiveApi);

  try {
    return await executeUpstreamAttempt(
      primaryUpstream,
      systemPrompt,
      userPrompt,
      temperature,
      topP
    );
  } catch (primaryError) {
    // Check if failover chain is applicable
    if (
      gatewayConfig &&
      gatewayConfig.failoverEnabled &&
      shouldTriggerFailover(primaryError, gatewayConfig.failoverTriggers)
    ) {
      console.warn(
        `[BizAI Gateway Failover] Primary model (${primaryUpstream.provider}/${primaryUpstream.model}) failed: ${(primaryError as Error).message}. Initiating multi-tier failover chain...`
      );

      let activeFallbacks: Array<{ provider: ApiProvider; model: string; label: string; apiKey?: string; baseUrl?: string }> = [];

      if (gatewayConfig.instances && gatewayConfig.instances.length > 0) {
        const fallbackInsts = gatewayConfig.instances.filter(
          (i) => i.tier === "fallback" || (i.fallbackTiers && i.fallbackTiers.length > 0)
        );
        const tierEntries: Array<{ tierNum: number; inst: (typeof fallbackInsts)[0] }> = [];
        for (const inst of fallbackInsts) {
          const tiers = inst.fallbackTiers && inst.fallbackTiers.length > 0 ? inst.fallbackTiers : [1];
          for (const t of tiers) {
            tierEntries.push({ tierNum: t, inst });
          }
        }
        tierEntries.sort((a, b) => a.tierNum - b.tierNum);
        activeFallbacks = tierEntries
          .filter((e) => e.inst.id !== primaryInstance?.id)
          .map((e) => ({
            provider: e.inst.provider,
            model: e.inst.model,
            label: e.inst.label || `Tier ${e.tierNum} (${e.inst.provider})`,
            apiKey: e.inst.apiKey,
            baseUrl: e.inst.customEndpoint,
          }));
      }

      if (activeFallbacks.length === 0 && gatewayConfig.fallbacks && gatewayConfig.fallbacks.length > 0) {
        activeFallbacks = gatewayConfig.fallbacks
          .filter(
            (f) =>
              f.enabled &&
              (f.provider !== primaryUpstream.provider || f.model !== primaryUpstream.model)
          )
          .map((f) => ({
            provider: f.provider,
            model: f.model,
            label: f.label || "Fallback",
          }));
      }

      for (const fallback of activeFallbacks) {
        try {
          console.warn(
            `[BizAI Gateway Failover] Attempting ${fallback.label || "Fallback"} (${fallback.provider}/${fallback.model})...`
          );

          const fallbackSettings: ApiSettings = {
            provider: fallback.provider,
            model: fallback.model,
            baseUrl: fallback.baseUrl || (providerDefaults as Record<string, { baseUrl: string; model: string }>)[fallback.provider]?.baseUrl || "",
            apiKey: fallback.apiKey || effectiveApi.apiKey || "", // instance key or BYOK or server gateway key
            appName: effectiveApi.appName || "Writerdost AI",
            siteUrl: effectiveApi.siteUrl || "",
          };

          const fallbackUpstream = await resolveUpstream(fallbackSettings);
          const fallbackResult = await executeUpstreamAttempt(
            fallbackUpstream,
            systemPrompt,
            userPrompt,
            temperature,
            topP
          );

          console.info(
            `[BizAI Gateway Failover] SUCCESS: Generation safely recovered by ${fallback.label || "Fallback"} (${fallback.provider}/${fallback.model})!`
          );
          return fallbackResult;
        } catch (fallbackError) {
          console.error(
            `[BizAI Gateway Failover] Tier (${fallback.provider}/${fallback.model}) failed: ${(fallbackError as Error).message}. Continuing to next tier...`
          );
        }
      }
    }

    // If failover was not enabled or all tiers failed, rethrow the original primary error
    throw primaryError;
  }
}
