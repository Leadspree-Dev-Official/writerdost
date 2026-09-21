import { callModel } from "@/lib/ai-server-utils";
import { sendStreamEvent, slugify, type StreamEvent } from "@/lib/app-utils";
import { mdToHtml } from "@/lib/markdown-utils";
import { getToneDirective } from "@/lib/tone-standards";
import { getLanguageDirective } from "@/lib/languages";
import type { ApiSettings, GeneratedProjectPayload, GeneratedChapter } from "@/lib/store-types";
import { guardRequest } from "@/lib/api-guard";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

type RequestPayload = {
  api: ApiSettings;
  settings: {
    temperature: number;
    topP: number;
  };
  outline: {
    title: string;
    audience: string;
    tone: string;
    language?: string;
    targetLength: number;
    chapters: Array<{
      title: string;
      topics: string; // User provided topics/bullets for this chapter
    }>;
  };
};

export async function POST(request: Request) {
  const blocked = guardRequest(request, { limit: 6 });
  if (blocked) return blocked;


  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: StreamEvent) => sendStreamEvent(controller, data);

      try {
        const body = (await request.json()) as RequestPayload;
        const { api, settings, outline } = body;

        sendEvent({ type: "active_agent", agent: "Architect Agent" });
        sendEvent({ type: "log", agent: "Architect Agent", message: "Spinning and rebranding the provided curriculum...", status: "pending" });

        const language = outline.language || "English (India)";

        const { text: spunOutlineText, usage: architectUsage } = await callModel({
          api,
          systemPrompt: `You are the Writerdost Architect Agent. The user is providing a competitor's or existing book's Table of Contents and sub-topics.
Your job is to COMPLETELY REBRAND AND SPIN this curriculum so it is 100% original and avoids plagiarism, while keeping the logical learning progression.
${getLanguageDirective(language)}
1. Rename every chapter title.
2. Rewrite every sub-topic into original bullet points.
3. Keep the exact same number of chapters.
You must return a JSON array exactly matching this format:
[
  { "title": "New Chapter Title", "topics": "- Rebranded Topic 1\n- Rebranded Topic 2" }
]
Do NOT return anything except the JSON array. Do not use markdown blocks like \`\`\`json.`,
          userPrompt: `Target Audience: ${outline.audience}\nTone: ${outline.tone}\n\nOriginal Curriculum to Spin:\n${JSON.stringify(outline.chapters, null, 2)}`,
          temperature: settings.temperature,
          topP: settings.topP,
        });

        sendEvent({ type: "usage", tokens: architectUsage.total_tokens });

        let spunChapters = outline.chapters;
        try {
          const parsed = JSON.parse(spunOutlineText.trim());
          if (Array.isArray(parsed) && parsed.length > 0) {
            spunChapters = parsed;
          }
        } catch (e) {
          console.error("Failed to parse spun outline, falling back to original:", e);
        }

        const chapters: GeneratedChapter[] = [];
        const totalChapters = spunChapters.length;
        const wordsPerChapter = Math.round(outline.targetLength / (totalChapters || 1));

        for (let i = 0; i < totalChapters; i++) {
          const chapterData = spunChapters[i];
          const chapterNum = i + 1;
          
          sendEvent({ type: "active_agent", agent: "Writing Agent" });
          sendEvent({ type: "log", agent: "Writing Agent", message: `Drafting Chapter ${chapterNum}: ${chapterData.title}...`, status: "pending" });

          const systemPrompt = `You are the Lead Manuscript Writer. Your task is to write a high-quality, professional ebook chapter based on the provided title and topics.
${getToneDirective(outline.tone)}
${getLanguageDirective(language)}
Follow Ebook Formatting Standards:
1. Use ### (H3) and #### (H4) headings.
2. Use bolded bullet points for frameworks.
3. Use blockquotes for core insights.
4. Target a word count of approximately ${wordsPerChapter} words for this chapter.
5. Return the output in clean Markdown.
6. DO NOT include the chapter title or "Chapter X" heading in your response, as it is automatically added by the system.
IF THE PROVIDED TOPICS ARE FROM AN EXISTING AUTHOR: You must use them as inspiration but completely rewrite and rebrand the content to be original. Maintain the logical structure but use unique phrasing, fresh metaphors, and a distinct narrative voice. Do not plagiarize the source.`;

          const userPrompt = `Book Title: ${outline.title}
Target Audience: ${outline.audience}
Chapter ${chapterNum}: ${chapterData.title}
Topics to Cover:
${chapterData.topics}

Instructions: Expand these topics into deep, insightful prose. Do not just list the topics; explore them with depth and authority.`;

          const { text: proseMd, usage } = await callModel({
            api,
            systemPrompt,
            userPrompt,
            temperature: settings.temperature,
            topP: settings.topP,
          });

          sendEvent({ type: "usage", tokens: usage.total_tokens });

          const chapterTitleHeader = `<h2>${chapterData.title}</h2>\n`;

          chapters.push({
            id: slugify(chapterData.title),
            title: chapterData.title,
            outline: [],
            status: "Done" as const,
            wordCount: proseMd.split(/\s+/).filter(Boolean).length,
            content: chapterTitleHeader + mdToHtml(proseMd),
            summary: `Content generated from provided topics for ${chapterData.title}.`,
          });

          sendEvent({ type: "log", agent: "Writing Agent", message: `Chapter ${chapterNum} complete.`, status: "success" });
        }

        const project: GeneratedProjectPayload = {
          title: outline.title,
          description: `An ebook generated from a custom curriculum about ${outline.title}.`,
          audience: outline.audience,
          tone: outline.tone,
          language: language,
          positioning: "Direct curriculum derivation",
          targetLength: outline.targetLength,
          chapterCount: totalChapters,
          chapters: chapters,
          seoKeywords: [outline.title, outline.tone, "custom ebook"],
          metaDescription: `A deep dive into ${outline.title} for ${outline.audience}.`,
          blogTitle: `Inside ${outline.title}: A New Perspective`,
          blogDraft: `This ebook explores ${outline.title} with a focus on structured learning and practical topics.`,
        };

        sendEvent({ type: "log", agent: "System", message: "Project generation complete.", status: "success" });
        sendEvent({ type: "final", project });
        controller.close();
      } catch (error) {
        console.error("Outline generation error:", error);
        sendEvent({ type: "error", message: error instanceof Error ? error.message : "Failed to generate project from outline." });
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
