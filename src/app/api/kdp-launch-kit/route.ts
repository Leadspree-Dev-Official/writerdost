import { NextRequest, NextResponse } from "next/server";
import { guardCostlyRequest } from "@/lib/costly-route";
import { callModel } from "@/lib/ai-server-utils";
import {
  buildKdpSystemPrompt,
  buildKdpUserPrompt,
  generateLocalKdpFallback,
  type GenerateKdpInput,
} from "@/lib/kdp-launch-service";
import type { KdpLaunchKit } from "@/lib/kdp-types";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { denied } = await guardCostlyRequest(req, "kdp-launch-kit", 10);
  if (denied) return denied;

  try {
    const body = await req.json();
    const { project, api, settings } = body;

    if (!project || !project.title) {
      return NextResponse.json(
        { error: "Project with title is required" },
        { status: 400 },
      );
    }

    const input: GenerateKdpInput = {
      title: project.title,
      description: project.description || project.metaDescription,
      audience: project.audience,
      tone: project.tone,
      genre: project.genre || "Non-Fiction",
      chapters: (project.chapters || []).map((c: { title: string; content?: string }) => ({
        title: c.title,
        content: typeof c.content === "string" ? c.content.slice(0, 300) : "",
      })),
    };

    let launchKit: KdpLaunchKit | null = null;

    try {
      const response = await callModel({
        api,
        systemPrompt: buildKdpSystemPrompt(),
        userPrompt: buildKdpUserPrompt(input),
        temperature: settings?.temperature ?? 0.7,
        topP: settings?.topP ?? 0.9,
      });

      if (response && response.text) {
        // Parse cleaned JSON from response
        const cleanText = response.text
          .trim()
          .replace(/^```json\s*/i, "")
          .replace(/^```\s*/i, "")
          .replace(/\s*```$/i, "")
          .trim();

        launchKit = JSON.parse(cleanText) as KdpLaunchKit;
        launchKit.generatedAt = new Date().toISOString();
      }
    } catch (aiErr) {
      console.warn("AI generation for KDP Launch Kit failed, falling back to local strategist template:", aiErr);
    }

    if (!launchKit || !launchKit.headline) {
      launchKit = generateLocalKdpFallback(input);
    }

    return NextResponse.json({
      success: true,
      launchKit,
    });
  } catch (error) {
    console.error("KDP Launch Kit API error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate KDP Launch Kit" },
      { status: 500 },
    );
  }
}
