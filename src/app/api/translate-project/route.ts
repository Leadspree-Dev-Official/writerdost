import { NextResponse } from "next/server";
import { callModel } from "@/lib/ai-server-utils";
import { sendStreamEvent, slugify } from "@/lib/app-utils";
import type { ApiSettings, GeneratedProjectPayload } from "@/lib/store-types";

export const maxDuration = 300; // 5 minutes max duration for serverless functions
export const dynamic = "force-dynamic";

type RequestPayload = {
  api: ApiSettings;
  settings: {
    temperature: number;
    topP: number;
  };
  project: any;
  targetLanguage: string;
  tone: string;
};

export async function POST(request: Request) {
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => sendStreamEvent(controller, data);

      try {
        const body = (await request.json()) as RequestPayload;
        const { api, settings, project, targetLanguage, tone } = body;

        sendEvent({ type: "active_agent", agent: "Translation Agent" });
        sendEvent({ type: "log", agent: "Translation Agent", message: `Initializing Universal Contextual Translator for ${targetLanguage}...`, status: "pending" });

        const systemPrompt = `You are the Universal Contextual Translator. Your task is to translate English text into ${targetLanguage}.
        
Strictly adhere to these directives:
1. High-Fidelity Translation: Translate the text into ${targetLanguage} without adding new information, omitting existing details, or summarizing.
2. Cultural Nuance over Literal Translation: Find the closest cultural equivalent for idioms that conveys the exact same meaning and emotion.
3. Formatting Preservation: Maintain all structural elements, including bullet points, bolding, italics, paragraphs, headings, and HTML tags.
4. Grammar and Fluency: Ensure the final output follows the exact grammatical rules, syntax, and natural phrasing of ${targetLanguage}.
5. Tone: Maintain a "${tone}" tone.

Return ONLY the translated text. Do not include any conversational filler.`;

        // Translate Metadata
        sendEvent({ type: "log", agent: "Translation Agent", message: "Translating project metadata...", status: "pending" });
        
        const metadataPrompt = `Translate the following project metadata into ${targetLanguage}.
Title: ${project.title}
Description: ${project.description}`;

        const { text: translatedMetadataStr, usage: metadataUsage } = await callModel({
          api,
          systemPrompt,
          userPrompt: metadataPrompt,
          temperature: settings.temperature,
          topP: settings.topP,
        });
        
        sendEvent({ type: "usage", tokens: metadataUsage.total_tokens });
        
        // Very basic parsing for metadata if the model returns it as lines
        let translatedTitle = `${project.title} (${targetLanguage})`;
        let translatedDescription = project.description;
        
        const lines = translatedMetadataStr.split('\n');
        for (const line of lines) {
          if (line.toLowerCase().startsWith('title:')) translatedTitle = line.substring(6).trim();
          else if (line.toLowerCase().startsWith('description:')) translatedDescription = line.substring(12).trim();
        }

        const translatedChapters: any[] = [];
        
        // Translate Chapters
        for (let i = 0; i < project.chapters.length; i++) {
          const chapter = project.chapters[i];
          const chapterNum = i + 1;
          
          sendEvent({ type: "log", agent: "Translation Agent", message: `Translating Chapter ${chapterNum} of ${project.chapters.length}...`, status: "pending" });

          const chapterPrompt = `Translate the following chapter into ${targetLanguage}. Preserve ALL HTML tags exactly as they appear (like <h2>, <p>, <ul>, <li>, <strong>).

${chapter.content}`;

          const { text: translatedContent, usage: chapterUsage } = await callModel({
            api,
            systemPrompt,
            userPrompt: chapterPrompt,
            temperature: settings.temperature,
            topP: settings.topP,
          });

          sendEvent({ type: "usage", tokens: chapterUsage.total_tokens });

          // Also try to translate the chapter title separately for the sidebar
          const titlePrompt = `Translate this chapter title into ${targetLanguage}:\n${chapter.title}`;
          const { text: translatedChapterTitle } = await callModel({
            api,
            systemPrompt,
            userPrompt: titlePrompt,
            temperature: 0.3,
            topP: 1,
          });

          translatedChapters.push({
            id: slugify(translatedChapterTitle) + `-${Date.now()}`,
            title: translatedChapterTitle.replace(/^['"]|['"]$/g, ''), // Strip quotes if any
            status: "Done",
            wordCount: translatedContent.split(/\s+/).filter(Boolean).length,
            content: translatedContent,
            summary: `Translated to ${targetLanguage}.`,
          });

          sendEvent({ type: "log", agent: "Translation Agent", message: `Chapter ${chapterNum} translated successfully.`, status: "success" });
        }

        const newProject: GeneratedProjectPayload = {
          title: translatedTitle,
          description: translatedDescription,
          audience: project.audience,
          tone: tone,
          positioning: "Translated version",
          targetLength: project.targetLength,
          chapterCount: project.chapterCount,
          chapters: translatedChapters,
          seoKeywords: project.seoKeywords,
          metaDescription: project.metaDescription,
          blogTitle: project.blogTitle,
          blogDraft: project.blogDraft,
        };

        sendEvent({ type: "log", agent: "System", message: "Translation complete. Building new project...", status: "success" });
        sendEvent({ type: "final", project: newProject });
        controller.close();
      } catch (error) {
        console.error("Translation generation error:", error);
        sendEvent({ type: "error", message: error instanceof Error ? error.message : "Failed to translate project." });
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
