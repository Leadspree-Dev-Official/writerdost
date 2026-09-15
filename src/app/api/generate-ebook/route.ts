import type { ApiSettings, GeneratedProjectPayload, OutlinePoint } from "@/lib/store-types";
import { robustParseJson, slugify, sendStreamEvent, type StreamEvent } from "@/lib/app-utils";
import { getToneDirective } from "@/lib/tone-standards";
import { getLanguageDirective, DEFAULT_LANGUAGE } from "@/lib/languages";
import { callModel } from "@/lib/ai-server-utils";
import { guardRequest } from "@/lib/api-guard";

type RequestPayload = {
  api: ApiSettings;
  settings: {
    temperature: number;
    topP: number;
    creativeMode: boolean;
    longFormFocus: boolean;
  };
  draft: {
    vision: string;
    audience: string;
    length: number;
    tone: string;
    language?: string;
    researchSources: Array<{ type: string; value: string; label: string }>;
  };
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));


type Blueprint = {
  title: string;
  description: string;
  audience?: string;
  tone?: string;
  positioning: string;
  chapterCount: number;
  seoKeywords: string[];
  metaDescription: string;
  blogTitle: string;
  blogDraft: string;
  chapters: Array<{
    title: string;
    summary: string;
    focus?: string;
    outline: string[];
  }>;
};

export async function POST(request: Request) {
  const blocked = guardRequest(request, { limit: 6 });
  if (blocked) return blocked;

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: StreamEvent) => sendStreamEvent(controller, data);

      try {
        const body = (await request.json()) as RequestPayload;
        const { api, settings, draft } = body;
        const readyForLiveAi = Boolean(api.baseUrl && api.model && (api.apiKey || api.provider === "ollama" || api.provider === "ollama_cloud"));
        if (!readyForLiveAi) {
          sendEvent({
            type: "error",
            message:
              "No AI provider is configured. Add a provider, model and API key in Settings → API, then run the agents again.",
          });
          controller.close();
          return;
        }

        const bibliography = (draft.researchSources || [])
          .map((s) => `- [${s.type.toUpperCase()}] ${s.label}${s.type !== 'file' ? `: ${s.value}` : ''}`)
          .join("\n") || "None";

        const languageDirective = getLanguageDirective(draft.language);

        const sharedPrompt = `Vision: ${draft.vision}
Audience: ${draft.audience || "General readers"}
Tone: ${draft.tone}
Language: ${draft.language || DEFAULT_LANGUAGE}
Target length: ${draft.length} words
Research Bibliography:
${bibliography}
`;

        // PHASE 1: STRATEGY & PLANNING
        await sleep(500);
        sendEvent({ type: "active_agent", agent: "Research Agent" });
        sendEvent({ type: "log", agent: "Research Agent", message: "Deep-diving into topic architecture...", status: "pending" });
        const { text: researchNotes, usage: researchUsage } = await callModel({
          api,
          systemPrompt: `You are the Writerdost Research Agent. Your task is to extract relevant facts, keywords, and semantic concepts for a specific book concept.
          ${settings.creativeMode ? "CREATIVE MODE ACTIVE: Look for interesting, surprising connections and unconventional research angles." : ""}
          ${languageDirective}
          You must respond in valid JSON format.`,
          userPrompt: `Title/Topic: ${draft.vision}\nAudience: ${draft.audience}\nTone: ${draft.tone}\n\nBibliography:\n${bibliography}\n\nGenerate deep research notes and structural insights derived from these specific sources to support a ${draft.length} word manuscript.`,
          temperature: settings.temperature,
          topP: settings.topP,
        });
        sendEvent({ type: "usage", tokens: researchUsage.total_tokens });
        sendEvent({ type: "log", agent: "Research Agent", message: "Research phase complete.", status: "success" });

        await sleep(500);
        sendEvent({ type: "active_agent", agent: "Planning Agent" });
        sendEvent({ type: "log", agent: "Planning Agent", message: "Designing structural blueprint...", status: "pending" });
        const { text: planningText, usage: planningUsage } = await callModel({
          api,
          systemPrompt: `You are the Writerdost Planning Agent. Your task is to generate a detailed, structured outline for a professional manuscript.
          IF THE USER PROVIDES AN EXISTING OUTLINE OR TABLE OF CONTENTS: You must use it as inspiration but completely rewrite and rebrand the titles, descriptions, and structure. Do not copy their exact phrasing. Create a unique, original blueprint that follows the same winning logic without plagiarizing the source.
          ${settings.creativeMode ? "CREATIVE MODE ACTIVE: Propose unique, non-obvious chapter topics and hooks." : ""}
          ${settings.longFormFocus ? "LONG-FORM FOCUS ACTIVE: Ensure chapter transitions and logical flow are optimized for a continuous book-length experience." : ""}
          ${languageDirective}
          You must respond in valid JSON format exactly matching this structure:
          {
            "title": "A strong, marketable title",
            "description": "A 2-3 sentence overview of the book's core premise",
            "audience": "The exact target demographic",
            "positioning": "How this book sits in the market",
            "chapterCount": The estimated number of chapters,
            "chapters": [
              {
                "title": "Rebranded Chapter Title",
                "focus": "A short sentence on what this specific chapter covers"
              }
            ],
            "seoKeywords": ["key", "words", "here"],
            "metaDescription": "A 150-character meta description for the book",
            "blogTitle": "A catchy blog post title promoting the book",
            "blogDraft": "A short 1-2 paragraph description for a promotional blog post"
          }`,
          userPrompt:
            sharedPrompt +
            (researchNotes
              ? `\n\nRESEARCH NOTES (from the Research Agent — build the blueprint on these):\n${researchNotes}`
              : "") +
            `\n\nCRITICAL: If I provided an explicit list of chapters/curriculum in my Vision, your 'chapters' array MUST map directly to my provided structure, but you MUST rebrand and rename every chapter title and focus to be 100% original.`,
          temperature: settings.temperature,
          topP: settings.topP,
        });
        sendEvent({ type: "usage", tokens: planningUsage.total_tokens });
        const planningResult = robustParseJson(planningText) || {};
        const planning = planningResult as Partial<Blueprint>;
        sendEvent({ type: "log", agent: "Planning Agent", message: "Book blueprint and TOC finalized.", status: "success" });

        await sleep(500);
        sendEvent({ type: "active_agent", agent: "Outline Agent" });
        
        let targetChapterCount = 0;
        let usePlannedChapters = false;
        
        if (planning.chapters && Array.isArray(planning.chapters) && planning.chapters.length > 0) {
          targetChapterCount = planning.chapters.length;
          usePlannedChapters = true;
        } else {
          targetChapterCount = Math.max(3, Math.min(60, Math.round(draft.length / 1000)));
        }

        sendEvent({ type: "log", agent: "Outline Agent", message: `Generating comprehensive outlines for ${targetChapterCount} chapters sequentially to ensure stability...`, status: "pending" });
        
        const chapterPlan: Blueprint["chapters"] = [];
        let previousChaptersContext = "";

        let bulletPointTarget = "a minimum of 4 (and maximum as per the topic)";
        let subBulletTarget = "minimum 3 sub-bullet points for each";
        if (draft.length >= 60000) {
          bulletPointTarget = "a minimum of 12 (and maximum as per the topic)";
          subBulletTarget = "minimum 10 sub-bullet points for each";
        } else if (draft.length >= 25000) {
          bulletPointTarget = "a minimum of 8 (and maximum as per the topic)";
          subBulletTarget = "minimum 6 sub-bullet points for each";
        }

        for (let i = 1; i <= targetChapterCount; i++) {
          const plannedChapter = usePlannedChapters ? planning.chapters?.[i - 1] ?? null : null;
          const chapterContextTitle = plannedChapter ? plannedChapter.title : `Chapter ${i}`;
          
          sendEvent({ type: "log", agent: "Outline Agent", message: `Architecting ${chapterContextTitle}...`, status: "pending" });
          
          const { text: chapterText, usage: outlineUsage } = await callModel({
            api,
            systemPrompt: `You are the Writerdost Outline Agent (Ebook Architect System). Your job is to create a detailed, scalable plan for ONE specific chapter.
IF THE USER PROVIDED AN EXISTING OUTLINE AS INSPIRATION: You must rewrite the bullet points and topics to be completely original. Maintain the core lesson/structure but rebrand the concepts, use your own phrasing, and do not plagiarize the source.
${settings.creativeMode ? "CREATIVE MODE ACTIVE: Design experimental structures and non-linear narrative arcs." : ""}
${settings.longFormFocus ? "LONG-FORM FOCUS ACTIVE: Ensure this chapter bridges perfectly with the previously generated chapters." : ""}
${getToneDirective(draft.tone)}
${languageDirective}
You must return a single JSON object (NOT an array). Return raw JSON. Do NOT wrap it in a markdown block. Do NOT use H2/H3 headings. Just output the JSON.
It must contain exactly: { "title": "...", "summary": "...", "outline": [ { "point": "...", "subpoints": ["...", "...", "..."] } ] }.`,
            userPrompt: `${sharedPrompt}\n\n${previousChaptersContext ? `PREVIOUSLY PLANNED CHAPTERS:\n${previousChaptersContext}\n\n` : ''}Task: Generate the complete architectural plan for Chapter ${i}.
${plannedChapter ? `MANDATORY CHAPTER TITLE: ${plannedChapter.title}\nMANDATORY CHAPTER FOCUS: ${plannedChapter.focus}` : ''}
CRITICAL DEPTH REQUIREMENT: You MUST generate ${bulletPointTarget} and for every single main point, you MUST generate ${subBulletTarget}. Do not abbreviate. We are building a high-wordcount, professional manuscript.`,
            temperature: settings.temperature,
            topP: settings.topP,
          });
          
          sendEvent({ type: "usage", tokens: outlineUsage.total_tokens });
          
          const chapterResult = robustParseJson(chapterText) || {
            title: `Chapter ${i}`,
            summary: "Content pending due to generation hiccup.",
            outline: ["Pending outline point"]
          };
          
          // Type guard/normalization
          const formattedChapterData = {
            title: String(chapterResult.title || `Chapter ${i}`),
            summary: String(chapterResult.summary || "Content pending."),
            outline: Array.isArray(chapterResult.outline) ? chapterResult.outline : [String(chapterResult.outline || "Pending")]
          };
          
          chapterPlan.push(formattedChapterData);
          
          // Build context for the next iteration to maintain structural flow
          previousChaptersContext += `\nChapter ${i}: ${formattedChapterData.title} - ${formattedChapterData.summary.substring(0, 50)}...`;
        }
        
        sendEvent({ type: "log", agent: "Outline Agent", message: `All ${targetChapterCount} chapter outlines verified and assembled.`, status: "success" });

        // PHASE 2: PAUSED FOR AUTHOR REVIEW
        await sleep(500);
        sendEvent({ type: "active_agent", agent: "Manuscript Agent" });
        sendEvent({ type: "log", agent: "Manuscript Agent", message: "Assembling blueprint for author review...", status: "pending" });

        const mainChapters = chapterPlan.map((chapter, index) => {
          let coreTitle = chapter.title || "Untitled Chapter";
          // Clarity fix: Prepend "Chapter X:" if not explicitly included by AI
          if (!/^Chapter\s*\d+/i.test(coreTitle)) {
             coreTitle = `Chapter ${index + 1}: ${coreTitle}`;
          }
          
          const summary = chapter.summary || "No summary provided.";
          const outline = chapter.outline || [];
           const chapterNum = index + 1;
           let outlineListHtml = "";
           if (Array.isArray(outline) && outline.length > 0) {
             outlineListHtml = `<ul style="list-style-type: none; padding-left: 0;">\n${outline.map((o: OutlinePoint, idx: number) => {
               if (typeof o === 'string') return `<li>${o}</li>`;
               if (o.point && Array.isArray(o.subpoints)) {
                   // Clean up existing numbers AI might have added to avoid triple numbering
                   let pointText = o.point.replace(/^\d+\.\s*/, "").replace(/^\d+\.\d+\.?\s*/, "").trim();
                   // Use Chapter Number as root (e.g. 2.1)
                   pointText = `${chapterNum}.${idx + 1}. ${pointText}`;
                   
                   // Enforce sub-point numbering (e.g. 2.1.1)
                   const subsHtml = o.subpoints.map((sub: string, subIdx: number) => {
                       let subText = sub.replace(/^\d+(\.\d+)+\.?\s*/, "").trim();
                       subText = `${chapterNum}.${idx + 1}.${subIdx + 1}. ${subText}`;
                       return `<li>${subText}</li>`;
                   }).join('\n');
                   
                   return `<li style="margin-bottom: 0.5rem;"><strong>${pointText}</strong>\n<ul style="list-style-type: none; padding-left: 1.5rem; margin-top: 0.25rem;">\n${subsHtml}\n</ul>\n</li>`;
               }
               return `<li>${JSON.stringify(o)}</li>`;
            }).join("\n")}\n</ul>`;
           }

           const outlineHtml = `<h2>${coreTitle}</h2>\n<p><strong>Chapter Summary:</strong> ${summary}</p>\n<h3>Working Outline:</h3>\n${outlineListHtml}\n<blockquote><p><em>✏️ Review and edit this outline. The Writing Agent will follow the Ebook Formatting Standards V2 (H3/H4 headings, bulleted frameworks, numbered steps, tables, blockquotes, and a Chapter Wrap-Up) when generating the full prose. Click "Draft All Content" when ready.</em></p></blockquote>`;
          
          return {
            id: slugify(coreTitle),
            title: coreTitle,
            outline: outline,
            content: outlineHtml, // Load outline into the editor content
            summary: summary,
            status: "Not started" as const,
            wordCount: outlineHtml.split(/\s+/).filter(Boolean).length,
          };
        });

        const ebookTitle = planning.title || draft.vision.split(".")[0] || "Untitled Writerdost Project";

        // Reintroduce Front/Back matter placeholders for the Outline Sidebar
        const frontMatter = [
          { id: "front-title", title: "Title Page", outline: [], content: `<p><em>Title Page Placeholder. Add content during Finish phase.</em></p>`, summary: "Book Title", status: "Done" as const, wordCount: 0 },
          { id: "front-copyright", title: "Copyright", outline: [], content: `<p><em>Copyright Placeholder. Add content during Finish phase.</em></p>`, summary: "Legal Notice", status: "Done" as const, wordCount: 0 },
          { id: "front-toc", title: "Table of Contents", outline: [], content: `<p><em>Table of Contents Placeholder. Generated automatically upon export.</em></p>`, summary: "TOC", status: "Done" as const, wordCount: 0 },
        ];

        const backMatter = [
          { id: "back-next-steps", title: "Next Steps / CTA", outline: [], content: `<p><em>Next Steps Placeholder. Add content during Finish phase.</em></p>`, summary: "Call to Action", status: "Done" as const, wordCount: 0 },
        ];

        const formattedChapters = [...frontMatter, ...mainChapters, ...backMatter];

        const finalProject: GeneratedProjectPayload = {
          title: ebookTitle,
          description: planning.description || draft.vision,
          audience: planning.audience || draft.audience || "General readers",
          tone: planning.tone || draft.tone,
          language: draft.language || DEFAULT_LANGUAGE,
          targetLength: draft.length,
          positioning: planning.positioning || "Standard Authoritative positioning",
          chapterCount: planning.chapterCount || chapterPlan.length || 0,
          chapters: formattedChapters,
          seoKeywords: planning.seoKeywords || [],
          metaDescription: planning.metaDescription || "A professional ebook project draft.",
          blogTitle: planning.blogTitle || `Why ${planning.title || 'this book'} matters`,
          blogDraft: planning.blogDraft || "Developing more content...",
        };

        sendEvent({ type: "log", agent: "System", message: "Full generation process complete.", status: "success" });
        sendEvent({ type: "final", project: finalProject, mode: "live" });
        controller.close();
      } catch (error) {
        console.error("Stream error:", error);
        sendEvent({
          type: "error",
          message: error instanceof Error ? error.message : "Generation failed.",
        });
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
