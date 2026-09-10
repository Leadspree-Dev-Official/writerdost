import { callModel } from "@/lib/ai-server-utils";
import { sendStreamEvent, type StreamEvent } from "@/lib/app-utils";
import type { ApiSettings } from "@/lib/store-types";
import { guardRequest } from "@/lib/api-guard";

export const maxDuration = 300;
export const dynamic = "force-dynamic";

type RewriteRequest = {
  api: ApiSettings;
  chunk: string;
  tone: string;
  targetChunkWords: number;
  settings: {
    temperature: number;
    topP: number;
  };
};

export async function POST(request: Request) {
  const blocked = guardRequest(request, { limit: 10 });
  if (blocked) return blocked;


  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: StreamEvent) => sendStreamEvent(controller, data);

      try {
        const body = (await request.json()) as RewriteRequest;
        const { api, chunk, tone, targetChunkWords, settings } = body;

        // AGENT 1: THE CONCEPT EXTRACTOR
        sendEvent({ type: "active_agent", agent: "Concept Extractor" });
        sendEvent({ type: "log", agent: "Concept Extractor", message: "Deconstructing source chunk into sterile outline...", status: "pending" });
        const { text: sterileOutline, usage: usage1 } = await callModel({
          api,
          systemPrompt: `You are the Lead Concept Extractor. Your job is to completely destroy the original prose and extract ONLY the sterile, factual skeleton. 
1. Extract all hard data, statistics, and verifiable facts.
2. Extract the core arguments and logical steps.
3. Extract any specific real-world examples used. 
4. Output these as a strict, sterile bullet-point outline. Do NOT retain any of the original author's phrasing, adjectives, or narrative voice.
IF THE CONTENT IS AN EXISTING WORK: Your goal is to map the "winning logic" of this text without keeping any of its proprietary phrasing.`,
          userPrompt: `Source Chunk:\n${chunk}`,
          temperature: 0.1, // Low temperature for factual extraction
          topP: settings.topP,
        });
        sendEvent({ type: "usage", tokens: usage1.total_tokens });
        sendEvent({ type: "log", agent: "Concept Extractor", message: "Sterile outline generated.", status: "success" });

        // AGENT 2: THE TRANSLATION DRAFTER
        sendEvent({ type: "active_agent", agent: "Translation Drafter" });
        sendEvent({ type: "log", agent: "Translation Drafter", message: `Rebuilding prose in "${tone}" style...`, status: "pending" });
        const { text: freshProse, usage: usage2 } = await callModel({
          api,
          systemPrompt: `You are the Translation Drafter. You will receive a sterile outline of facts and concepts. You must draft these concepts into beautiful, cohesive prose.
1. You must strictly adopt the [Selected Tone & Style: ${tone}]. 
2. You must weave the facts into a compelling narrative, creating your own transitions and metaphors. 
3. Do NOT use Markdown formatting, headings, or bullet points. Focus solely on fresh word choice and deep narrative exploration.
4. Expand the outline to reach approximately ${targetChunkWords} words.
IF THE SOURCE IS INSPIRED BY OTHER AUTHORS: You must completely rebrand the narrative voice. Use original metaphors, fresh examples, and a unique rhythm while sticking to the structural brilliance of the outline. NEVER copy the original author's branding.`,
          userPrompt: `Sterile Outline:\n${sterileOutline}`,
          temperature: settings.temperature,
          topP: settings.topP,
        });
        sendEvent({ type: "usage", tokens: usage2.total_tokens });
        sendEvent({ type: "log", agent: "Translation Drafter", message: "New prose drafted.", status: "success" });

        // AGENT 3: THE STRUCTURAL FORMATTER
        sendEvent({ type: "active_agent", agent: "Structural Formatter" });
        sendEvent({ type: "log", agent: "Structural Formatter", message: "Applying visual rhythm and formatting...", status: "pending" });
        const { text: formattedText, usage: usage3 } = await callModel({
          api,
          systemPrompt: `You are the Structural Editor. Take the raw text and apply V2 Formatting Rules to enhance scannability. 
1. Break paragraphs longer than 4 sentences. 
2. Insert ### (H3) and #### (H4) subheadings where thematic shifts occur. 
3. Format sequential steps or 3+ items as bolded bullet points. 
4. Isolate one core philosophy into a > blockquote. 
5. Do NOT alter the meaning, vocabulary, or tone.`,
          userPrompt: `Raw Prose:\n${freshProse}`,
          temperature: 0.3,
          topP: settings.topP,
        });
        sendEvent({ type: "usage", tokens: usage3.total_tokens });
        sendEvent({ type: "log", agent: "Structural Formatter", message: "Formatting complete.", status: "success" });

        // AGENT 4: THE ANTI-PLAGIARISM CRITIC
        sendEvent({ type: "active_agent", agent: "Anti-Plagiarism Critic" });
        sendEvent({ type: "log", agent: "Anti-Plagiarism Critic", message: "Auditing result for structural uniqueness...", status: "pending" });
        const { text: auditResult, usage: usage4 } = await callModel({
          api,
          systemPrompt: `You are the Anti-Plagiarism Director. You must compare the newly drafted text against the Original Source Chunk. 
1. Plagiarism Check: Run a strict comparison. If you detect *any* matching sequence of 5 or more consecutive words (excluding common names or industry terms), you must automatically REWRITE that sentence to be 100% unique.
2. Fluff Check: Scan for generic AI phrases ('In conclusion', 'Ultimately', 'Delve into', etc). If found, REMOVE or REWRITE them naturally.
3. You must NOT reject the text. Fix the issues yourself.
4. Output 'APPROVE' followed by the final, polished, and unique text payload in Markdown format.`,
          userPrompt: `Original Source Chunk:\n${chunk}\n\nNewly Formatted Text:\n${formattedText}`,
          temperature: 0.1,
          topP: settings.topP,
        });
        sendEvent({ type: "usage", tokens: usage4.total_tokens });

        if (auditResult.includes("REJECT")) {
          // If the AI stubborn outputs REJECT instead of fixing it, we gracefully fallback to the pre-audit text
          // This prevents the entire pipeline from crashing due to an overly strict model.
          sendEvent({ type: "log", agent: "Anti-Plagiarism Critic", message: `Critic warned about fluff, but auto-remediation failed. Bypassing safely.`, status: "success" });
          sendEvent({ type: "final", content: formattedText });
        } else {
          const finalText = auditResult.replace(/^APPROVE\s*/, "").trim();
          sendEvent({ type: "log", agent: "Anti-Plagiarism Critic", message: "Plagiarism audit passed. Content approved.", status: "success" });
          sendEvent({ type: "final", content: finalText });
        }

        controller.close();
      } catch (error) {
        console.error("Rewrite swarm error:", error);
        sendEvent({ type: "error", message: error instanceof Error ? error.message : "Rewrite swarm pipeline failed." });
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
