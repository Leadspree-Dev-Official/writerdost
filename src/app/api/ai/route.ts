import { NextResponse } from "next/server";
import { callModel } from "@/lib/ai-server-utils";
import { UpstreamNotAllowedError } from "@/lib/ai-upstream";
import { readJsonBody } from "@/lib/api-guard";
import { guardCostlyRequest } from "@/lib/costly-route";
import { getContextRouting } from "@/lib/server-subscription-store";
import { providerDefaults } from "@/lib/ai-providers";
import type { ApiSettings } from "@/lib/store-types";

type RequestPayload = {
  api: ApiSettings;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  topP?: number;
};

export async function POST(request: Request) {
  const { denied } = await guardCostlyRequest(request, "ai", 30);
  if (denied) return denied;

  try {
    const body = await readJsonBody<RequestPayload>(request, 500_000);
    let api = body.api;
    const { systemPrompt, userPrompt, temperature, topP } = body;

    if (typeof systemPrompt !== "string" || typeof userPrompt !== "string") {
      return NextResponse.json({ error: "A system and user prompt are required." }, { status: 400 });
    }

    // Context-routing check (Admin configurable)
    // Approximate prompt token length (1 token ~= 4 chars or 0.75 words)
    const estimatedPromptTokens = Math.ceil((systemPrompt.length + userPrompt.length) / 4);
    const routingConfig = getContextRouting();

    let routed = false;
    const originalModel = api.model;

    if (
      routingConfig.enabled &&
      estimatedPromptTokens >= routingConfig.thresholdTokens &&
      api.provider === "claude"
    ) {
      // Switch to configured fallback provider & model (default DeepSeek Flash) to avoid the 5x cost cliff
      const fallbackDefaults = providerDefaults[routingConfig.fallbackProvider];
      api = {
        ...api,
        provider: routingConfig.fallbackProvider,
        model: routingConfig.fallbackModel || fallbackDefaults?.model || "deepseek-flash",
        baseUrl: fallbackDefaults?.baseUrl || api.baseUrl,
      };
      routed = true;
    }

    const result = await callModel({ api, systemPrompt, userPrompt, temperature, topP });
    return NextResponse.json({
      ...result,
      meta: {
        routed,
        originalModel: routed ? originalModel : undefined,
        activeModel: api.model,
        estimatedPromptTokens,
      },
    });
  } catch (error) {
    if (error instanceof UpstreamNotAllowedError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reach AI provider." },
      { status: 502 },
    );
  }
}
