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
