import { useAppStore } from "@/lib/app-store";
import { apiFetch } from "@/lib/api-client";
import type { ApiSettings } from "@/lib/store-types";

type GenerateTextOptions = {
  api: ApiSettings;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  topP?: number;
};

export async function generateAiText({
  api,
  systemPrompt,
  userPrompt,
  temperature,
  topP,
}: GenerateTextOptions) {
  const response = await apiFetch("/api/ai", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      api,
      systemPrompt,
      userPrompt,
      temperature,
      topP,
    }),
  });

  const payload = (await response.json()) as { 
    text?: string; 
    usage?: { total_tokens: number; input_tokens?: number; output_tokens?: number };
    error?: string;
  };

  if (!response.ok || !payload.text) {
    throw new Error(payload.error || "AI generation failed.");
  }

  // Record real-time usage
  const recordUsage = useAppStore.getState().recordUsage;
  recordUsage(payload.usage?.total_tokens || 0, api.provider, api.model, {
    inputTokens: payload.usage?.input_tokens,
    outputTokens: payload.usage?.output_tokens,
  });

  return payload.text;
}
