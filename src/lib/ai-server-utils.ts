import { resolveUpstream, UpstreamNotAllowedError } from "@/lib/ai-upstream";
import type { ApiSettings } from "@/lib/store-types";

export type ChatResponse = {
  text: string;
  usage: {
    total_tokens: number;
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
  };
}

function readPayload(payload: ProviderPayload, isClaude: boolean): ChatResponse {
  if (isClaude && Array.isArray(payload.content)) {
    return {
      text: payload.content
        .map((item) => item.text ?? "")
        .join("\n")
        .trim(),
      usage: {
        total_tokens: (payload.usage?.input_tokens || 0) + (payload.usage?.output_tokens || 0),
      },
    };
  }

  return {
    text: (payload.choices?.[0]?.message?.content || "").trim(),
    usage: { total_tokens: payload.usage?.total_tokens || 0 },
  };
}

/**
 * Calls the configured AI provider. The endpoint is validated by
 * `resolveUpstream` before any request leaves the server; transient failures
 * (429 / 5xx) are retried with exponential backoff, definitive 4xx are not.
 */
export async function callModel({
  api,
  systemPrompt,
  userPrompt,
  temperature = 0.7,
  topP = 0.9,
}: {
  api: ApiSettings;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  topP?: number;
}): Promise<ChatResponse> {
  const upstream = await resolveUpstream(api);
  const isClaude = upstream.provider === "claude";
  const headers = buildHeaders(upstream, isClaude);
  const bodyData = buildBody(upstream, isClaude, systemPrompt, userPrompt, temperature, topP);

  let retries = 3;
  let delay = 1000;

  while (retries > 0) {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    try {
      const response = await fetch(upstream.baseUrl, {
        method: "POST",
        headers,
        body: JSON.stringify(bodyData),
        signal: controller.signal,
      });

      let payload: ProviderPayload = {};
      const contentType = response.headers.get("content-type") || "";
      if (contentType.includes("application/json")) {
        try {
          payload = (await response.json()) as ProviderPayload;
        } catch {
          payload = {};
        }
      } else {
        const text = await response.text();
        payload = { error: { message: text || response.statusText || `HTTP ${response.status}` } };
      }

      if (!response.ok) {
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
      // A blocked endpoint is a configuration problem — never retry it.
      if (error instanceof UpstreamNotAllowedError) throw error;

      const err = error as ProviderError;
      if (err.name === "AbortError") {
        throw new Error("The AI provider timed out.");
      }

      retries -= 1;
      const status = err.status;
      const isDefinitive4xx = typeof status === "number" && status >= 400 && status < 500 && status !== 429;

      if (retries === 0 || isDefinitive4xx) {
        throw new Error(err.message || "Network error while connecting to AI provider.");
      }

      await new Promise((resolve) => setTimeout(resolve, delay));
      delay *= 2;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  throw new Error("Failed to call AI model after maximum retries.");
}
