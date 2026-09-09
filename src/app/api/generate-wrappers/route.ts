import { NextRequest } from "next/server";
import { providerDefaults } from "@/lib/ai-providers";
import type { ApiSettings } from "@/lib/store-types";
import { STREAM_DELIMITER, robustParseJson } from "@/lib/app-utils";
import { slugify } from "@/lib/app-utils";
import { normalizeApi } from "@/lib/ai-server-utils";

async function callModel({
  api,
  systemPrompt,
  userPrompt,
  temperature,
  topP,
}: {
  api: ApiSettings;
  systemPrompt: string;
  userPrompt: string;
  temperature: number;
  topP?: number;
}) {
  const normalizedApi = normalizeApi(api);
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
  }

  const bodyData: any = isClaude
    ? {
        model: normalizedApi.model,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
        max_tokens: 4096,
        temperature,
        topP,
      }
    : {
        model: normalizedApi.model,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userPrompt },
        ],
        temperature,
        top_p: topP,
      };

  let text = "";
  let total_tokens = 0;

  const abortController = new AbortController();
  const timeoutId = setTimeout(() => abortController.abort(), 300000); // 5 minutes

  try {
    const response = await fetch(normalizedApi.baseUrl, {
      method: "POST",
      headers,
      body: JSON.stringify(bodyData),
      signal: abortController.signal,
    });
    clearTimeout(timeoutId);

    const payload = await response.json();

    if (!response.ok) {
      const errorMsg = payload.error?.message || (isClaude ? payload.error?.msg : null) || "The AI provider returned an error.";
      throw new Error(errorMsg);
    }

    if (isClaude && Array.isArray(payload.content)) {
      text = payload.content.map((item: any) => item.text).join("\n").trim();
      total_tokens = (payload.usage?.input_tokens || 0) + (payload.usage?.output_tokens || 0);
    } else {
      text = payload.choices?.[0]?.message?.content?.trim();
      total_tokens = payload.usage?.total_tokens || 0;
    }

    if (!text) {
      throw new Error("The AI provider returned an empty response.");
    }

    return { text, usage: { total_tokens } };
  } catch (error: any) {
    clearTimeout(timeoutId);
    if (error.name === "AbortError") {
      throw new Error("AI provider timed out after 5 minutes.");
    }
    throw error;
  }
}

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const { project, api, settings, profile } = await req.json();

  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => {
        controller.enqueue(encoder.encode(JSON.stringify(data) + STREAM_DELIMITER));
      };

      try {
        sendEvent({ type: "active_agent", agent: "Manuscript Agent" });
        sendEvent({ type: "log", agent: "System", message: "Designing professional eBook wrappers...", status: "pending" });

        const ebookTitle = project.title || "Untitled Manuscript";
        const currentYear = new Date().getFullYear();

        const authorName = profile?.penName || profile?.fullName || "Writerdost AI";
        const detailsParts = [profile?.bio, profile?.website].filter(Boolean);
        const authorDetails = detailsParts.length > 0 ? detailsParts.join(" • ") : "Professional Writer & Content Strategist";

        // 1. Generate Contextual CTA
        sendEvent({ type: "log", agent: "Writing Agent", message: "Crafting contextual Call to Action...", status: "pending" });
        const { text: ctaContent } = await callModel({
          api,
          systemPrompt: `You are the Writerdost Marketing Agent. Write a professional "Next Steps" or "Call to Action" page for an ebook.
          Focus on providing value and encouraging the reader to engage further with the author.
          Avoid generic fluff. Use the book's title and audience as context.`,
          userPrompt: `Book Title: ${ebookTitle}\nAudience: ${project.audience}\n\nGenerate the content for the final page of the book. Include placeholders for links.`,
          temperature: 0.7,
        });

        // 2. Assemble Frontend structure
        const wrappers = [
          {
            id: 'front-title-page',
            title: 'Title Page',
            outline: [],
            content: `<h1 style="text-align: center;">${ebookTitle}</h1>\n<p style="text-align: center;">A Professional Manuscript</p>\n<hr>\n<p style="text-align: center;"><strong>Written by ${authorName}</strong></p>\n<p style="text-align: center;">${authorDetails}</p>`,
            summary: "Title Page",
            status: "Done" as const,
            wordCount: 20
          },
          {
            id: 'front-copyright',
            title: 'Copyright',
            outline: [],
            content: `<h2>Copyright</h2>\n<p>© ${currentYear} All rights reserved.</p>\n<p>No part of this publication may be reproduced, distributed, or transmitted in any form or by any means, including photocopying, recording, or other electronic or mechanical methods, without the prior written permission of the publisher, except in the case of brief quotations embodied in critical reviews.</p>\n<p><strong>Disclaimer:</strong> This work is an original creation and does not infringe upon any existing copyrights. All information and references used have been sourced from publicly available data and curated for accuracy.</p>`,
            summary: "Standard Copyright Disclaimer",
            status: "Done" as const,
            wordCount: 75
          },
          {
            id: 'front-toc',
            title: 'Table of Contents',
            outline: [],
            content: `<h2>Table of Contents</h2>\n<ul>\n${project.chapters.map((ch: any) => `<li><strong>${ch.title}</strong></li>`).join('\n')}\n</ul>\n<blockquote><p><em>✏️ Note: Page numbers and live anchors will be generated automatically upon PDF export.</em></p></blockquote>`,
            summary: "Auto-generated Table of Contents",
            status: "Done" as const,
            wordCount: project.chapters.length * 5
          },
          {
            id: 'back-cta',
            title: 'Next Steps / CTA',
            outline: [],
            content: ctaContent.startsWith('<') ? ctaContent : `<h2>Next Steps</h2>\n${ctaContent.replace(/\n\n/g, '</p><p>').replace(/\n/g, '<br/>')}`,
            summary: "Contextual Call to Action",
            status: "Done" as const,
            wordCount: ctaContent.split(/\s+/).filter(Boolean).length
          }
        ];

        sendEvent({ type: "log", agent: "System", message: "Wrappers generated and ready to merge.", status: "success" });
        sendEvent({ type: "final", wrappers });
        controller.close();
      } catch (error) {
        console.error("Wrapper generation error:", error);
        sendEvent({ type: "error", message: "Failed to generate wrappers." });
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      "Connection": "keep-alive",
    },
  });
}
