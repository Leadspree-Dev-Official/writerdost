import type { ApiProvider } from "@/lib/store-types";

export const providerDefaults: Record<ApiProvider, { baseUrl: string; model: string }> = {
  openai: {
    baseUrl: "https://api.openai.com/v1/chat/completions",
    model: "gpt-6.1-sol",
  },
  claude: {
    baseUrl: "https://api.anthropic.com/v1/messages",
    model: "claude-sonnet-5-5",
  },
  gemini: {
    baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions",
    model: "gemini-3.8-flash",
  },
  deepseek: {
    baseUrl: "https://api.deepseek.com/v1/chat/completions",
    model: "deepseek-flash",
  },
  groq: {
    baseUrl: "https://api.groq.com/openai/v1/chat/completions",
    model: "llama-3.3-70b-versatile",
  },
  commandcode: {
    baseUrl: "https://api.commandcode.ai/provider/v1/chat/completions",
    model: "command-code",
  },
  openrouter: {
    baseUrl: "https://openrouter.ai/api/v1/chat/completions",
    model: "anthropic/claude-sonnet-5.5",
  },
  experiential: {
    baseUrl: "https://api.experientiallabs.ai/v1/chat/completions",
    model: "gpt-6-luna",
  },
  ollama: {
    baseUrl: "http://localhost:11434/v1/chat/completions",
    model: "llama3.3:70b",
  },
  ollama_cloud: {
    baseUrl: "https://ollama.com/api",
    model: "llama3.3:70b",
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
  { match: "gpt-6-astra", inputRate: 10.00, outputRate: 50.00 },
  { match: "gpt-6.1-sol", inputRate: 2.00, outputRate: 10.00 },
  { match: "gpt-6.1-terra", inputRate: 1.00, outputRate: 5.00 },
  { match: "gpt-6-luna", inputRate: 0.00, outputRate: 0.00 },
  { match: "gpt-5-turbo", inputRate: 2.00, outputRate: 8.00 },
  { match: "gpt-5", inputRate: 2.50, outputRate: 10.00 },
  { match: "gpt-4.5", inputRate: 75.00, outputRate: 150.00 },
  { match: "gpt-4o-mini", inputRate: 0.15, outputRate: 0.60 },
  { match: "gpt-4o", inputRate: 2.50, outputRate: 10.00 },
  { match: "o4-mini", inputRate: 1.10, outputRate: 4.40 },
  { match: "o3-mini", inputRate: 1.10, outputRate: 4.40 },
  { match: "o1-mini", inputRate: 1.10, outputRate: 4.40 },
  { match: "o1", inputRate: 15.00, outputRate: 60.00 },
  { match: "gpt-4-turbo", inputRate: 10.00, outputRate: 30.00 },
  { match: "gpt-4", inputRate: 30.00, outputRate: 60.00 },

  // Claude
  { match: "claude-fable-5-2", inputRate: 8.00, outputRate: 40.00 },
  { match: "claude-fable-5.2", inputRate: 8.00, outputRate: 40.00 },
  { match: "claude-opus-5-5", inputRate: 4.00, outputRate: 20.00 },
  { match: "claude-opus-5.5", inputRate: 4.00, outputRate: 20.00 },
  { match: "claude-sonnet-5-5", inputRate: 2.00, outputRate: 10.00 },
  { match: "claude-sonnet-5.5", inputRate: 2.00, outputRate: 10.00 },
  { match: "claude-haiku-5.5", inputRate: 0.10, outputRate: 0.50 },
  { match: "claude-haiku-5-5", inputRate: 0.10, outputRate: 0.50 },
  { match: "claude-3-7-sonnet", inputRate: 3.00, outputRate: 15.00 },
  { match: "claude-3-5-sonnet", inputRate: 3.00, outputRate: 15.00 },
  { match: "claude-3-5-haiku", inputRate: 0.80, outputRate: 4.00 },
  { match: "claude-3-haiku", inputRate: 0.25, outputRate: 1.25 },
  { match: "claude-3-opus", inputRate: 15.00, outputRate: 75.00 },

  // Gemini
  { match: "gemini-4-carbon", inputRate: 2.00, outputRate: 8.00 },
  { match: "gemini-4-argon", inputRate: 1.25, outputRate: 5.00 },
  { match: "gemini-4-hydrogen", inputRate: 0.20, outputRate: 0.80 },
  { match: "gemini-3.8-flash", inputRate: 0.10, outputRate: 0.40 },
  { match: "gemini-3.5-flash-lite", inputRate: 0.03, outputRate: 0.12 },
  { match: "gemini-3.5-flash", inputRate: 0.075, outputRate: 0.30 },
  { match: "gemini-2.5-pro", inputRate: 1.25, outputRate: 5.00 },
  { match: "gemini-2.5-flash", inputRate: 0.075, outputRate: 0.30 },
  { match: "gemini-2.0-flash-lite", inputRate: 0.075, outputRate: 0.30 },
  { match: "gemini-2.0-flash", inputRate: 0.10, outputRate: 0.40 },
  { match: "gemini-1.5-flash", inputRate: 0.075, outputRate: 0.30 },
  { match: "gemini-1.5-pro", inputRate: 1.25, outputRate: 5.00 },

  // DeepSeek & Experiential catalog
  { match: "deepseek-v4.1-flash-1017-uncensored", inputRate: 0.10, outputRate: 0.20 },
  { match: "deepseek-v4-pro", inputRate: 0.25, outputRate: 0.50 },
  { match: "deepseek-v4.1-flash", inputRate: 0.10, outputRate: 0.20 },
  { match: "deepseek-flash", inputRate: 0.10, outputRate: 0.20 },
  { match: "deepseek-v4-flash", inputRate: 0.08, outputRate: 0.16 },
  { match: "deepseek-reasoner", inputRate: 0.55, outputRate: 2.19 },
  { match: "deepseek-chat", inputRate: 0.14, outputRate: 0.28 },

  // Experiential / Open Catalog Additions
  { match: "tencent-hy4-flash", inputRate: 0.06, outputRate: 0.12 },
  { match: "jev", inputRate: 0.05, outputRate: 0.10 },
  { match: "glm-5.3-flash-uncensored", inputRate: 0.08, outputRate: 0.16 },
  { match: "glm-5.3-uncensored", inputRate: 0.15, outputRate: 0.30 },
  { match: "qwen3.8-27b", inputRate: 0.20, outputRate: 0.40 },

  // Groq
  { match: "llama-4-scout", inputRate: 0.20, outputRate: 0.30 },
  { match: "llama-3.3-70b-versatile", inputRate: 0.59, outputRate: 0.79 },
  { match: "llama-3.1-8b-instant", inputRate: 0.05, outputRate: 0.08 },
  { match: "deepseek-r1-distill-llama-70b", inputRate: 0.75, outputRate: 0.99 },
  { match: "qwen/qwen3.8-27b", inputRate: 0.29, outputRate: 0.39 },
  { match: "qwen-qwq-32b", inputRate: 0.29, outputRate: 0.39 },
  { match: "minimax-m2.7", inputRate: 0.25, outputRate: 0.50 },
  { match: "openai/gpt-oss-120b", inputRate: 0.49, outputRate: 0.79 },
  { match: "openai/gpt-oss-20b", inputRate: 0.10, outputRate: 0.15 },

  // CommandCode
  { match: "command-code", inputRate: 2.00, outputRate: 6.00 },
  { match: "taste-1", inputRate: 1.50, outputRate: 5.00 },
];

export function getModelDefaultRates(provider: ApiProvider, model: string): ModelRate {
  if (provider === "ollama" || provider === "ollama_cloud" || provider === "groq") {
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
      return { inputRate: 0.10, outputRate: 0.20 };
    case "commandcode":
      return { inputRate: 2.00, outputRate: 6.00 };
    case "gemini":
      return { inputRate: 0.10, outputRate: 0.40 };
    case "claude":
      return { inputRate: 2.00, outputRate: 10.00 };
    case "openai":
      return { inputRate: 2.00, outputRate: 10.00 };
    default:
      return { inputRate: 1.00, outputRate: 2.00 };
  }
}

export function calculateModelCost(
  inputTokens: number,
  outputTokens: number,
  inputRate: number,
  outputRate: number,
  isFree?: boolean
): number {
  if (isFree) return 0;
  const inCost = (Math.max(0, inputTokens) / 1_000_000) * Math.max(0, inputRate);
  const outCost = (Math.max(0, outputTokens) / 1_000_000) * Math.max(0, outputRate);
  return Number((inCost + outCost).toFixed(6));
}
