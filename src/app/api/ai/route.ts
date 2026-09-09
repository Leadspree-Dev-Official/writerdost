import { NextResponse } from "next/server";
import { callModel } from "@/lib/ai-server-utils";
import { UpstreamNotAllowedError } from "@/lib/ai-upstream";
import { guardRequest, readJsonBody } from "@/lib/api-guard";
import type { ApiSettings } from "@/lib/store-types";

type RequestPayload = {
  api: ApiSettings;
  systemPrompt: string;
  userPrompt: string;
  temperature?: number;
  topP?: number;
};

export async function POST(request: Request) {
  const blocked = guardRequest(request, { limit: 30 });
  if (blocked) return blocked;

  try {
    const { api, systemPrompt, userPrompt, temperature, topP } =
      await readJsonBody<RequestPayload>(request);

    if (typeof systemPrompt !== "string" || typeof userPrompt !== "string") {
      return NextResponse.json({ error: "A system and user prompt are required." }, { status: 400 });
    }

    const result = await callModel({ api, systemPrompt, userPrompt, temperature, topP });
    return NextResponse.json(result);
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
