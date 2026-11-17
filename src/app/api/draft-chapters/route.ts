import { sendStreamEvent, robustParseJson, type StreamEvent } from "@/lib/app-utils";
import { mdToHtml } from "@/lib/markdown-utils";
import { EBOOK_FORMATTING_STANDARDS } from "@/lib/ebook-standards";
import { getToneDirective } from "@/lib/tone-standards";
import { getLanguageDirective } from "@/lib/languages";
import { callModel } from "@/lib/ai-server-utils";
import { guardCostlyRequest } from "@/lib/costly-route";
import { clampInt, LIMITS } from "@/lib/validation";
import type { BookMemoryBank } from "@/lib/store-types";

const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export async function POST(req: Request) {
  const { denied } = await guardCostlyRequest(req, "draft-chapters", 6);
  if (denied) return denied;

  const { project, api, settings } = await req.json();

  if (!project || !api || !settings) {
    return new Response(JSON.stringify({ error: "Missing required payload." }), {
      status: 400,
    });
  }

  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: StreamEvent) => sendStreamEvent(controller, data);
      const heartbeat = setInterval(() => sendEvent({ type: "ping" }), 20000);

      try {
        const languageDirective = getLanguageDirective(project.language);

        sendEvent({ type: "active_agent", agent: "Writing Agent" });
        sendEvent({ type: "log", agent: "Writing Agent", message: `Beginning drafting phase for ${project.chapters.length} chapters...`, status: "pending" });

        const writingResults = [];
        const TOTAL_TARGET_WORDS = clampInt(project.targetLength, 10_000, 1_000, LIMITS.targetWords);
        const CHAPTER_COUNT = Math.min(
          LIMITS.chapters,
          Math.max(1, project.chapters.length),
        );
        // Quota formula: Target sections ≈ Total Words / 900 (sweet spot for high quality)
        const SECTIONS_PER_CHAPTER = Math.min(
          LIMITS.sectionsPerChapter,
          Math.max(1, Math.round(TOTAL_TARGET_WORDS / 900 / CHAPTER_COUNT)),
        );
        const SECTION_WORD_GOAL = Math.floor(
          TOTAL_TARGET_WORDS / (CHAPTER_COUNT * SECTIONS_PER_CHAPTER),
        );

        sendEvent({ 
          type: "log", 
          agent: "Quota Manager", 
          message: `Calculated quota: ${SECTIONS_PER_CHAPTER} sections per chapter at ~${SECTION_WORD_GOAL} words each. Total target: ${TOTAL_TARGET_WORDS} words.`, 
          status: "success" 
        });

        let chapterIndex = 1;
        let cumulativeActualWords = 0;
        let lastSectionTail = "";

        // Persistent Book Memory Bank for cross-chapter continuity
        let activeMemoryBank: BookMemoryBank = project.memoryBank || {
          characters: [],
          timelineEvents: [],
          unresolvedThreads: [],
          thematicDirectives: [
            `Audience: ${project.audience || "General Readers"}`,
            `Tone: ${project.tone || "Professional"}`,
          ],
          pacingIntensity: 5,
          lastChapterSummary: "",
        };

        for (const chapter of (project.chapters ?? []).slice(0, LIMITS.chapters)) {
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
            const isFirstSection = sectionIndex === 1;
            const heroVisualInstruction = isFirstSection ? `
              At the very beginning of your section, include a single HTML comment with a recommended hero illustration prompt for this chapter:
              <!-- HERO_VISUAL_PROMPT: Clean modern vector editorial illustration depicting the core concept of "${chapter.title}", minimalist flat palette -->
            ` : "";

            const wrapUpInstruction = isLastSection ? `
              Since this is the final section of the chapter, conclude your prose with a "Chapter Wrap-Up" structured exactly as follows (translate these labels into the output language):
              ### Chapter Wrap-Up
              **Key Takeaways:**
              * [Point 1]
              * [Point 2]
              * [Point 3]

              **Your Action Step:** [Specific task]
            ` : "";

            const memoryDirective = `
              CROSS-CHAPTER CONTINUITY DIRECTIVES (Book Memory Bank):
              ${activeMemoryBank.lastChapterSummary ? "- PRECEDING CHAPTER SUMMARY: " + activeMemoryBank.lastChapterSummary : ""}
              ${activeMemoryBank.characters?.length ? "- ESTABLISHED CHARACTERS: " + activeMemoryBank.characters.map((c) => `${c.name} (${c.role}; traits: ${c.traits.join(", ")}; status: ${c.arcStatus || "active"})`).join("; ") : ""}
              ${activeMemoryBank.timelineEvents?.length ? "- ESTABLISHED TIMELINE & EVENTS: " + activeMemoryBank.timelineEvents.slice(-5).join(" -> ") : ""}
              ${activeMemoryBank.unresolvedThreads?.length ? "- PENDING PLOT/ARGUMENT THREADS: " + activeMemoryBank.unresolvedThreads.slice(0, 3).join("; ") : ""}
              Pacing intensity: ${activeMemoryBank.pacingIntensity}/10.
              CRITICAL: Maintain absolute narrative consistency. Do NOT contradict established facts, character roles, or decisions from earlier chapters.`;

            const { text: rawProse, usage: draftUsage } = await callModel({
              api,
              systemPrompt: `You are the Writerdost Prose Drafter. Write a deep, granular section for a manuscript.
              Current Goal: ${adjustedSectionGoal} words.
              Context: This is Section ${sectionIndex} of ${SECTIONS_PER_CHAPTER} for the chapter "${chapter.title}".
              ${getToneDirective(project.tone)}
              ${languageDirective}
              ${memoryDirective}
              ${heroVisualInstruction}
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
                ${languageDirective}
                
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
          
          // Synchronize cross-chapter Book Memory Bank
          try {
            sendEvent({
              type: "log",
              agent: "Memory Agent",
              message: `Updating cross-chapter Memory Bank from Chapter ${chapterIndex}...`,
              status: "pending",
            });

            const { text: memUpdateText, usage: memUsage } = await callModel({
              api,
              systemPrompt: `You are the Writerdost Book Memory Agent. Your role is to maintain cross-chapter narrative & factual continuity.
Analyze the chapter just written and update the persistent Memory Bank tracking characters, timeline milestones, and unresolved plot/argument threads.
Return ONLY valid JSON matching this exact structure:
{
  "characters": [{"name": "string", "role": "string", "traits": ["string"], "arcStatus": "string"}],
  "timelineEvents": ["string"],
  "unresolvedThreads": ["string"],
  "thematicDirectives": ["string"],
  "pacingIntensity": 7,
  "lastChapterSummary": "2-sentence recap of what happened in this chapter"
}`,
              userPrompt: `Current Book Memory Bank:
${JSON.stringify(activeMemoryBank, null, 2)}

Chapter ${chapterIndex} ("${chapter.title}") Content:
${chapterContent.slice(0, 4000)}...`,
              temperature: 0.3,
            });

            sendEvent({ type: "usage", tokens: memUsage.total_tokens });
            const parsedMem = robustParseJson(memUpdateText) as Partial<BookMemoryBank> | null;
            if (parsedMem && Array.isArray(parsedMem.characters)) {
              activeMemoryBank = {
                characters: parsedMem.characters.length ? parsedMem.characters : activeMemoryBank.characters,
                timelineEvents: parsedMem.timelineEvents?.length ? parsedMem.timelineEvents : activeMemoryBank.timelineEvents,
                unresolvedThreads: parsedMem.unresolvedThreads || activeMemoryBank.unresolvedThreads,
                thematicDirectives: parsedMem.thematicDirectives || activeMemoryBank.thematicDirectives,
                pacingIntensity: typeof parsedMem.pacingIntensity === "number" ? parsedMem.pacingIntensity : activeMemoryBank.pacingIntensity,
                lastChapterSummary: parsedMem.lastChapterSummary || `Chapter ${chapterIndex}: ${chapter.title} concluded.`,
              };
              sendEvent({
                type: "log",
                agent: "Memory Agent",
                message: `Memory Bank synchronized: ${activeMemoryBank.characters.length} characters tracked, ${activeMemoryBank.timelineEvents.length} milestones logged.`,
                status: "success",
              });
            }
          } catch (memErr) {
            console.warn("Memory bank update non-fatal error:", memErr);
          }

          chapterIndex++;
        }

        await delay(500);
        sendEvent({ type: "active_agent", agent: "Manuscript Agent" });
        sendEvent({ type: "log", agent: "Manuscript Agent", message: "Assembling final drafted project...", status: "pending" });

        const draftedProject = {
          ...project,
          chapters: writingResults,
          memoryBank: activeMemoryBank,
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
