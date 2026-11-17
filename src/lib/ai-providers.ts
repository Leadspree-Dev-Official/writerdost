import type { ApiProvider } from "@/lib/store-types";

export const providerDefaults: Record<ApiProvider, { baseUrl: string; model: string }> = {
  openai: {
    baseUrl: "https://api.openai.com/v1/chat/completions",
    model: "gpt-4o-mini",
  },
  claude: {
    baseUrl: "https://api.anthropic.com/v1/messages",
    model: "claude-3-5-sonnet-20240620",
  },
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    model: "gemini-1.5-flash",
  },
  deepseek: {
    baseUrl: "https://api.deepseek.com/v1/chat/completions",
    model: "deepseek-chat",
  },
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    model: "openai/gpt-4o-mini",
  },
  ollama: {
    baseUrl: "http://localhost:11434/v1/chat/completions",
    model: "llama3.1:8b",
  },
  ollama_cloud: {
    baseUrl: "https://ollama.com/api",
    model: "llama3.1:8b",
  },
  custom: {
    baseUrl: "",
    model: "",
  },
};

export type ModelRate = {
  inputRate: number; // USD per 1M tokens
  outputRate: number; // USD per 1M tokens
};

/** Default input/output rates per million tokens */
const MODEL_RATE_TABLE: Array<{ match: string; inputRate: number; outputRate: number }> = [
  // OpenAI
  { match: "gpt-4o-mini", inputRate: 0.15, outputRate: 0.60 },
  { match: "gpt-4o", inputRate: 2.50, outputRate: 10.00 },
  { match: "gpt-4-turbo", inputRate: 10.00, outputRate: 30.00 },
  { match: "o1-mini", inputRate: 3.00, outputRate: 12.00 },
  { match: "o1-preview", inputRate: 15.00, outputRate: 60.00 },
  { match: "gpt-4", inputRate: 30.00, outputRate: 60.00 },

  // Claude
  { match: "claude-3-5-sonnet", inputRate: 3.00, outputRate: 15.00 },
  { match: "claude-haiku", inputRate: 0.80, outputRate: 4.00 },
  { match: "claude-3-haiku", inputRate: 0.25, outputRate: 1.25 },
  { match: "claude-3-opus", inputRate: 15.00, outputRate: 75.00 },

  // DeepSeek
  { match: "deepseek-reasoner", inputRate: 0.55, outputRate: 2.19 },
  { match: "deepseek-chat", inputRate: 0.14, outputRate: 0.28 },

  // Gemini
  { match: "gemini-1.5-flash", inputRate: 0.075, outputRate: 0.30 },
  { match: "gemini-2.0-flash", inputRate: 0.10, outputRate: 0.40 },
  { match: "gemini-1.5-pro", inputRate: 1.25, outputRate: 5.00 },
];

export function getModelDefaultRates(provider: ApiProvider, model: string): ModelRate {
  if (provider === "ollama" || provider === "ollama_cloud") {
    return { inputRate: 0, outputRate: 0 };
  }

  const normalized = (model || "").toLowerCase();
  for (const entry of MODEL_RATE_TABLE) {
    if (normalized.includes(entry.match)) {
      return { inputRate: entry.inputRate, outputRate: entry.outputRate };
    }
  }

  // Fallbacks by provider
  switch (provider) {
    case "deepseek":
      return { inputRate: 0.14, outputRate: 0.28 };
    case "gemini":
      return { inputRate: 0.075, outputRate: 0.30 };
    case "claude":
      return { inputRate: 3.00, outputRate: 15.00 };
    case "openai":
      return { inputRate: 2.50, outputRate: 10.00 };
    default:
      return { inputRate: 1.00, outputRate: 2.00 };
  }
}

export function calculateModelCost(
  inputTokens: number,
  outputTokens: number,
  inputRate: number,
  outputRate: number
): number {
  const inCost = (Math.max(0, inputTokens) / 1_000_000) * Math.max(0, inputRate);
  const outCost = (Math.max(0, outputTokens) / 1_000_000) * Math.max(0, outputRate);
  return Number((inCost + outCost).toFixed(6));
}
