import { NextResponse } from "next/server";
import { normalizeApi } from "@/lib/ai-server-utils";
import type { ApiSettings } from "@/lib/store-types";

type RequestPayload = {
  api: ApiSettings;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  topP?: number;
};

type ChatCompletionResponse = {
  choices?: Array<{
    message?: {
      content?: ChatContent;
    };
  }>;
  error?: {
    message?: string;
    metadata?: Record<string, unknown>;
  };
};

type ChatContent =
  | string
  | Array<{
      type?: string;
      text?: string;
    }>;

function extractTextContent(content: ChatContent | undefined) {
  if (typeof content === "string") {
    return content.trim();
  }

  if (Array.isArray(content)) {
    return content
      .map((item) => item.text?.trim())
      .filter(Boolean)
      .join("\n")
      .trim();
  }

  return "";
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as RequestPayload;
    const { api, systemPrompt, userPrompt, temperature, topP } = body;

    const normalizedApi = normalizeApi(api);
    console.log("[Test Connection] Raw API:", api.provider, api.baseUrl);
    console.log("[Test Connection] Normalized URL:", normalizedApi.baseUrl);

    if (!normalizedApi?.baseUrl || !normalizedApi?.model) {
      return NextResponse.json({ error: "API base URL and model are required." }, { status: 400 });
    }

    if (normalizedApi.provider !== "ollama" && normalizedApi.provider !== "ollama_cloud" && !normalizedApi.apiKey) {
      return NextResponse.json({ error: "API key is required for the selected provider." }, { status: 400 });
    }

    const isClaude = normalizedApi.provider === "claude";
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (normalizedApi.apiKey) {
      if (isClaude) {
        headers["x-api-key"] = normalizedApi.apiKey;
        headers["anthropic-version"] = "2023-06-01";
      } else {
        headers.Authorization = `Bearer ${normalizedApi.apiKey}`;
      }
    }

    if (normalizedApi.provider === "openrouter") {
      if (normalizedApi.siteUrl) headers["HTTP-Referer"] = normalizedApi.siteUrl;
      if (normalizedApi.appName) headers["X-Title"] = normalizedApi.appName;
      headers["User-Agent"] = `${normalizedApi.appName || "Writerdost AI"} (${normalizedApi.siteUrl || "http://localhost:3000"})`;
    }

    const bodyData: any = isClaude
      ? {
          model: normalizedApi.model,
          system: systemPrompt,
          messages: [{ role: "user", content: userPrompt }],
          max_tokens: 4096,
          temperature: temperature ?? 0.7,
          top_p: topP ?? 0.9,
        }
      : {
          model: normalizedApi.model,
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: temperature ?? 0.7,
          top_p: topP ?? 0.9,
        };

    const upstreamResponse = await fetch(normalizedApi.baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(bodyData),
    });

    const payload = await upstreamResponse.json();

    if (!upstreamResponse.ok) {
      const errorMessage = payload.error?.message || (isClaude ? payload.error?.msg : null) || "The AI provider returned an error.";
      return NextResponse.json(
        { error: errorMessage },
        { status: upstreamResponse.status },
      );
    }

    let text = "";
    let usage = { total_tokens: 0 };

    if (isClaude && Array.isArray(payload.content)) {
      text = payload.content.map((item: any) => item.text).join("\n").trim();
      usage.total_tokens = (payload.usage?.input_tokens || 0) + (payload.usage?.output_tokens || 0);
    } else {
      text = extractTextContent(payload.choices?.[0]?.message?.content);
      usage.total_tokens = payload.usage?.total_tokens || 0;
    }

    if (!text) {
      return NextResponse.json({ error: "The AI provider returned an empty response." }, { status: 502 });
    }

    return NextResponse.json({ text, usage });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to reach AI provider." },
      { status: 500 },
    );
  }
}
