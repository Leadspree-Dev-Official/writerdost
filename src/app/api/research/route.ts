import { NextResponse } from "next/server";
import { callModel } from "@/lib/ai-server-utils";
import { UpstreamNotAllowedError } from "@/lib/ai-upstream";
import { readJsonBody } from "@/lib/api-guard";
import { guardCostlyRequest } from "@/lib/costly-route";
import { getContextRouting } from "@/lib/server-subscription-store";
import { providerDefaults } from "@/lib/ai-providers";
import { robustParseJson } from "@/lib/app-utils";
import type { ApiSettings } from "@/lib/store-types";

export type ResearchDossier = {
  topic: string;
  targetAudience: string;
  depth: "quick" | "comprehensive" | "academic";
  executiveSummary: string;
  coreTheses: Array<{ title: string; explanation: string; takeaway: string }>;
  factsAndStats: Array<{ stat: string; context: string; citation: string; relevance: string }>;
  contrarianAngles: Array<{ angle: string; conventionalView: string; counterIntuitiveTruth: string; narrativeHook: string }>;
  caseStudies: Array<{ title: string; subject: string; storySummary: string; keyLesson: string }>;
  chapterSeeds: Array<{ chapterNumber: number; title: string; hook: string; keyPoints: string[]; researchAngle: string }>;
  glossary: Array<{ term: string; definition: string; usageTip: string }>;
  recommendedReadings: Array<{ title: string; type: string; whyItMatters: string }>;
  authorNotes: string[];
};

type ResearchRequestPayload = {
  api: ApiSettings;
  topic: string;
  targetAudience?: string;
  depth?: "quick" | "comprehensive" | "academic";
  lenses?: string[];
  sources?: Array<{ type: string; value: string; label: string }>;
  specificQuestions?: string;
};

export async function POST(request: Request) {
  const { denied } = await guardCostlyRequest(request, "research", 20);
  if (denied) return denied;

  try {
    const body = await readJsonBody<ResearchRequestPayload>(request, 600_000);
    let api = body.api;
    const {
      topic,
      targetAudience = "Curious non-fiction readers and practitioners",
      depth = "comprehensive",
      lenses = ["theses", "facts_stats", "contrarian", "case_studies", "chapter_seeds", "glossary"],
      sources = [],
      specificQuestions = "",
    } = body;

    if (!topic || typeof topic !== "string" || !topic.trim()) {
      return NextResponse.json({ error: "A research topic or book thesis is required." }, { status: 400 });
    }

    const bibliographyText = sources.length
      ? sources.map((s, idx) => `[${idx + 1}] (${s.type.toUpperCase()}) ${s.label}: ${s.value}`).join("\n")
      : "No user-supplied URLs or files provided. Rely on domain knowledge graph, empirical literature, and verified frameworks.";

    const depthDirective =
      depth === "quick"
        ? "QUICK BRIEF: Deliver a punchy, high-leverage 600-word synopsis covering the essential findings and 3 standout angles."
        : depth === "academic"
          ? "ACADEMIC & MASTERCLASS DEEP-DIVE: Deliver an exhaustive, highly rigorous 2,000+ word study with empirical citations, nuanced counterarguments, and technical taxonomy."
          : "COMPREHENSIVE DOSSIER: Deliver a rich 1,200-word multi-dimensional dossier balanced with data points, narrative hooks, and strategic outlines.";

    const lensesDirective = `
ACTIVE RESEARCH LENSES:
${lenses.includes("theses") ? "- CORE THESES: Extract the 3-4 foundational pillars and conceptual mental models that define this subject." : ""}
${lenses.includes("facts_stats") ? "- EMPIRICAL FACTS & STATS: Extract 4-6 quantifiable metrics, studies, or historical data points with attribution." : ""}
${lenses.includes("contrarian") ? "- CONTRARIAN & UNCONVENTIONAL ANGLES: Challenge mainstream cliches. Detail non-obvious truths that hook cynical readers." : ""}
${lenses.includes("case_studies") ? "- REAL-WORLD CASE STUDIES: Provide 2-4 real-world examples, corporate anecdotes, or biographical case stories." : ""}
${lenses.includes("chapter_seeds") ? "- CHAPTER OUTLINE SEEDS: Map out a proposed 5-8 chapter narrative progression with gripping hooks." : ""}
${lenses.includes("glossary") ? "- TERMINOLOGY & LEXICON: Define 4-8 specialized terms or jargon every authoritative book on this topic must define." : ""}
`;

    const systemPrompt = `You are the Writerdost Senior Investigative Research Agent and Master Editorial Strategist.
Your mission is to equip authors, ghostwriters, and educators with an authoritative, grounded, high-leverage research dossier before they write their book manuscript.

${depthDirective}

${lensesDirective}

CRITICAL FORMATTING INSTRUCTIONS:
You must respond with pure valid JSON matching this schema exactly. Do not include markdown code fence formatting like \`\`\`json. Return pure JSON:
{
  "topic": "...",
  "targetAudience": "...",
  "depth": "${depth}",
  "executiveSummary": "A crisp, compelling executive summary of why this topic matters now and the overarching thesis.",
  "coreTheses": [
    { "title": "...", "explanation": "...", "takeaway": "..." }
  ],
  "factsAndStats": [
    { "stat": "...", "context": "...", "citation": "...", "relevance": "..." }
  ],
  "contrarianAngles": [
    { "angle": "...", "conventionalView": "...", "counterIntuitiveTruth": "...", "narrativeHook": "..." }
  ],
  "caseStudies": [
    { "title": "...", "subject": "...", "storySummary": "...", "keyLesson": "..." }
  ],
  "chapterSeeds": [
    { "chapterNumber": 1, "title": "...", "hook": "...", "keyPoints": ["..."], "researchAngle": "..." }
  ],
  "glossary": [
    { "term": "...", "definition": "...", "usageTip": "..." }
  ],
  "recommendedReadings": [
    { "title": "...", "type": "Book / Paper / Case", "whyItMatters": "..." }
  ],
  "authorNotes": [
    "Key strategic recommendation for voice and pacing",
    "Pitfall to avoid when writing about this subject"
  ]
}`;

    const userPrompt = `RESEARCH TOPIC:
${topic.trim()}

TARGET AUDIENCE:
${targetAudience}

SPECIFIC QUESTIONS / HYPOTHESES TO INVESTIGATE:
${specificQuestions?.trim() ? specificQuestions.trim() : "Extract the most compelling, empirically grounded insights and book-length angles for this topic."}

USER-PROVIDED BIBLIOGRAPHY & SOURCES:
${bibliographyText}

Generate the comprehensive research dossier JSON now.`;

    // Apply context routing if applicable
    const estimatedPromptTokens = Math.ceil((systemPrompt.length + userPrompt.length) / 4);
    const routingConfig = getContextRouting();
    let routed = false;
    const originalModel = api.model;

    if (
      routingConfig.enabled &&
      estimatedPromptTokens >= routingConfig.thresholdTokens &&
      api.provider === "claude"
    ) {
      const fallbackDefaults = providerDefaults[routingConfig.fallbackProvider];
      api = {
        ...api,
        provider: routingConfig.fallbackProvider,
        model: routingConfig.fallbackModel || fallbackDefaults?.model || "deepseek-chat",
        baseUrl: fallbackDefaults?.baseUrl || api.baseUrl,
      };
      routed = true;
    }

    const result = await callModel({
      api,
      systemPrompt,
      userPrompt,
      temperature: 0.7,
      topP: 0.9,
    });

    let dossier: ResearchDossier;
    try {
      dossier = robustParseJson(result.text) as ResearchDossier;
    } catch {
      // Clean fallback if model returned raw text or slight JSON syntax issues
      let cleaned = result.text.trim();
      if (cleaned.startsWith("```json")) cleaned = cleaned.replace(/^```json\s*/, "");
      if (cleaned.startsWith("```")) cleaned = cleaned.replace(/^```\s*/, "");
      if (cleaned.endsWith("```")) cleaned = cleaned.replace(/```$/, "");
      dossier = robustParseJson(cleaned) as ResearchDossier;
    }

    // Ensure baseline fields exist
    if (!dossier || typeof dossier !== "object") {
      throw new Error("Failed to parse valid research dossier from the AI response.");
    }
    if (!dossier.topic) dossier.topic = topic;
    if (!dossier.targetAudience) dossier.targetAudience = targetAudience;
    if (!dossier.depth) dossier.depth = depth;
    if (!Array.isArray(dossier.coreTheses)) dossier.coreTheses = [];
    if (!Array.isArray(dossier.factsAndStats)) dossier.factsAndStats = [];
    if (!Array.isArray(dossier.contrarianAngles)) dossier.contrarianAngles = [];
    if (!Array.isArray(dossier.caseStudies)) dossier.caseStudies = [];
    if (!Array.isArray(dossier.chapterSeeds)) dossier.chapterSeeds = [];
    if (!Array.isArray(dossier.glossary)) dossier.glossary = [];
    if (!Array.isArray(dossier.recommendedReadings)) dossier.recommendedReadings = [];
    if (!Array.isArray(dossier.authorNotes)) dossier.authorNotes = [];

    return NextResponse.json({
      success: true,
      dossier,
      usage: result.usage,
      meta: {
        routed,
        originalModel: routed ? originalModel : undefined,
        activeModel: api.model,
        tokens: result.usage.total_tokens,
      },
    });
  } catch (error) {
    if (error instanceof UpstreamNotAllowedError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to generate research dossier." },
      { status: 500 },
    );
  }
}
