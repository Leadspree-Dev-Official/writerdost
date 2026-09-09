import { robustParseJson, sendStreamEvent, slugify } from "@/lib/app-utils";
import { mdToHtml } from "@/lib/markdown-utils";
import type { ApiSettings } from "@/lib/store-types";
import { providerDefaults } from "@/lib/ai-providers";
import { EBOOK_FORMATTING_STANDARDS } from "@/lib/ebook-standards";
import { getToneDirective } from "@/lib/tone-standards";
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
  topP: number;
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

    let payload: any = {};
    const contentType = response.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      try {
        payload = await response.json();
      } catch (e) {
        console.error("Failed to parse JSON response:", e);
      }
    } else {
      const text = await response.text();
      payload = { error: { message: text || response.statusText || `HTTP ${response.status}` } };
    }

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

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
  const { project, api, settings } = await req.json();

  if (!project || !api || !settings) {
    return new Response(JSON.stringify({ error: "Missing required payload." }), {
      status: 400,
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: any) => sendStreamEvent(controller, data);
      const heartbeat = setInterval(() => sendEvent({ type: "ping" }), 20000);

      try {
        sendEvent({ type: "active_agent", agent: "Writing Agent" });
        sendEvent({ type: "log", agent: "Writing Agent", message: `Beginning drafting phase for ${project.chapters.length} chapters...`, status: "pending" });

        const writingResults = [];
        const TOTAL_TARGET_WORDS = project.targetLength || 10000;
        const CHAPTER_COUNT = Math.max(1, project.chapters.length);
        // Quota formula: Target sections ≈ Total Words / 900 (sweet spot for high quality)
        const SECTIONS_PER_CHAPTER = Math.max(1, Math.round((TOTAL_TARGET_WORDS / 900) / CHAPTER_COUNT));
        const SECTION_WORD_GOAL = Math.floor(TOTAL_TARGET_WORDS / (CHAPTER_COUNT * SECTIONS_PER_CHAPTER));

        sendEvent({ 
          type: "log", 
          agent: "Quota Manager", 
          message: `Calculated quota: ${SECTIONS_PER_CHAPTER} sections per chapter at ~${SECTION_WORD_GOAL} words each. Total target: ${TOTAL_TARGET_WORDS} words.`, 
          status: "success" 
        });

        let chapterIndex = 1;
        let cumulativeActualWords = 0;
        let lastSectionTail = "";

        for (const chapter of (project.chapters ?? [])) {
          const isWrapperPage = ["title page", "copyright", "table of contents", "next steps / cta", "next steps"].includes(chapter.title.toLowerCase());
          
          if (isWrapperPage) {
            sendEvent({ type: "log", agent: "Writing Agent", message: `Skipping prose generation for structure page: ${chapter.title}`, status: "success" });
            writingResults.push({ ...chapter, status: "Done" });
            continue;
          }

          sendEvent({ type: "chapter_started", index: chapterIndex, total: project.chapters.length, title: chapter.title });
          sendEvent({ type: "log", agent: "Writing Agent", message: `Expanding Chapter ${chapterIndex} into ${SECTIONS_PER_CHAPTER} sections...`, status: "pending" });
          
          let chapterContent = `<h2>${chapter.title}</h2>\n`;
          let chapterWordCount = 0;

          for (let sectionIndex = 1; sectionIndex <= SECTIONS_PER_CHAPTER; sectionIndex++) {
            // Memory Agent: Adjust target word count based on performance
            const wordsRemaining = TOTAL_TARGET_WORDS - cumulativeActualWords;
            const sectionsRemaining = ((CHAPTER_COUNT - chapterIndex + 1) * SECTIONS_PER_CHAPTER) - sectionIndex + 1;
            const adjustedSectionGoal = Math.min(1200, Math.max(700, Math.floor(wordsRemaining / sectionsRemaining)));

            sendEvent({ 
              type: "log", 
              agent: "Memory Agent", 
              message: `Section ${sectionIndex}/${SECTIONS_PER_CHAPTER} target: ${adjustedSectionGoal} words. (Book Pacing: ${cumulativeActualWords}/${TOTAL_TARGET_WORDS})`, 
              status: "pending" 
            });

            // --- SUB-SWARM EXECUTION ---
            
            // 1. Prose Drafter (Now includes Formatting & Wrap-up if applicable)
            sendEvent({ type: "active_agent", agent: "Writing Agent" });
            
            const isLastSection = sectionIndex === SECTIONS_PER_CHAPTER;
            const wrapUpInstruction = isLastSection ? `
              Since this is the final section of the chapter, conclude your prose with a "Chapter Wrap-Up" structured exactly as follows:
              ### Chapter Wrap-Up
              **Key Takeaways:**
              * [Point 1]
              * [Point 2]
              * [Point 3]

              **Your Action Step:** [Specific task]
            ` : "";

            const { text: rawProse, usage: draftUsage } = await callModel({
              api,
              systemPrompt: `You are the Writerdost Prose Drafter. Write a deep, granular section for a manuscript.
              Current Goal: ${adjustedSectionGoal} words.
              Context: This is Section ${sectionIndex} of ${SECTIONS_PER_CHAPTER} for the chapter "${chapter.title}".
              ${getToneDirective(project.tone)}
              ${lastSectionTail ? "PREVIOUS CONTEXT (Bridge from here): " + lastSectionTail : ""}
              DO NOT use summaries. Use vivid examples, case studies, and detailed arguments.
              
              CRITICAL FORMATTING INSTRUCTIONS:
              You MUST apply mandatory eBook formatting to your output.
              ${EBOOK_FORMATTING_STANDARDS}
              Return the text in Markdown with H3/H4 headers and lists.
              DO NOT include the chapter title or "Chapter X" heading in your response, as it is automatically added by the system.
              DO NOT use Markdown tables. Use bulleted lists for comparisons or data points instead.
              ${wrapUpInstruction}`,
              userPrompt: `Book: ${project.title}\nChapter: ${chapter.title}\nOutline context: ${chapter.content}\n\nContinue the narrative seamlessly.`,
              temperature: settings.temperature,
              topP: settings.topP,
            });
            sendEvent({ type: "usage", tokens: draftUsage.total_tokens });
            lastSectionTail = rawProse.slice(-1200); // Capture tail for next section bridge

            // 2. QA Critic (Internal word count check and quality)
            let finalSectionContent = rawProse;
            const sectionWords = finalSectionContent.split(/\s+/).filter(Boolean).length;

            if (sectionWords < adjustedSectionGoal * 0.7) {
              sendEvent({ 
                type: "log", 
                agent: "QA Agent", 
                message: `Word count deficit detected (${sectionWords}/${adjustedSectionGoal}). Activating Depth Expansion...`, 
                status: "pending" 
              });
              
              const { text: expandedProse, usage: qaUsage } = await callModel({
                api,
                systemPrompt: `You are the Writerdost QA Depth Agent. The previous prose was too brief. 
                Target: ${adjustedSectionGoal} words. Current: ${sectionWords} words.
                Your task: Expand the provided text by adding more granular details, examples, and deep analysis. 
                Do NOT summarize. Broaden the scope of the discussion to meet the length requirement while maintaining the professional tone.
                
                CRITICAL FORMATTING INSTRUCTIONS:
                You MUST apply mandatory eBook formatting to your expanded output.
                ${EBOOK_FORMATTING_STANDARDS}
                Return the expanded text in Markdown with H3/H4 headers and lists.
                DO NOT include the chapter title or "Chapter X" heading in your response.`,
                userPrompt: finalSectionContent,
                temperature: settings.temperature,
                topP: settings.topP,
              });
              sendEvent({ type: "usage", tokens: qaUsage.total_tokens });
              
              finalSectionContent = expandedProse;
            }

            const sectionHtml = mdToHtml(finalSectionContent);
            chapterContent += sectionHtml;
            cumulativeActualWords += finalSectionContent.split(/\s+/).filter(Boolean).length;
            chapterWordCount += finalSectionContent.split(/\s+/).filter(Boolean).length;
          }

          writingResults.push({
            ...chapter,
            content: chapterContent,
            status: "Done" as const,
            wordCount: chapterWordCount,
          });

          sendEvent({ type: "log", agent: "Writing Agent", message: `Completed Chapter ${chapterIndex}: ${chapterWordCount} words total.`, status: "success" });
          sendEvent({ type: "chapter_completed", index: chapterIndex, total: project.chapters.length, title: chapter.title });
          
          chapterIndex++;
        }

        await delay(500);
        sendEvent({ type: "active_agent", agent: "Manuscript Agent" });
        sendEvent({ type: "log", agent: "Manuscript Agent", message: "Assembling final drafted project...", status: "pending" });

        const draftedProject = {
          ...project,
          chapters: writingResults,
        };

        sendEvent({ type: "log", agent: "System", message: "Drafting complete.", status: "success" });
        sendEvent({ type: "final", project: draftedProject, mode: "draft-update" });
        clearInterval(heartbeat);
        controller.close();
      } catch (error) {
        clearInterval(heartbeat);
        console.error("Stream error in drafting:", error);
        sendEvent({ 
          type: "error", 
          message: error instanceof Error ? error.message : "Drafting failed.",
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
