export type ResearchDepth = "quick" | "comprehensive" | "academic";

export interface ResearchDossier {
  topic: string;
  targetAudience: string;
  depth: ResearchDepth;
  executiveSummary: string;
  coreTheses: Array<{ title: string; explanation: string; takeaway: string }>;
  factsAndStats: Array<{ stat: string; context: string; citation: string; relevance: string }>;
  contrarianAngles: Array<{ angle: string; conventionalView: string; counterIntuitiveTruth: string; narrativeHook: string }>;
  caseStudies: Array<{ title: string; subject: string; storySummary: string; keyLesson: string }>;
  chapterSeeds: Array<{ chapterNumber: number; title: string; hook: string; keyPoints: string[]; researchAngle: string }>;
  glossary: Array<{ term: string; definition: string; usageTip: string }>;
  recommendedReadings: Array<{ title: string; type: string; whyItMatters: string }>;
  authorNotes: string[];
}

export interface SavedDossier {
  id: string;
  createdAt: string;
  dossier: ResearchDossier;
  tokensUsed?: number;
  creditsUsed?: number;
}

const STORAGE_KEY = "writerdost_saved_dossiers";

export const SAMPLE_INITIAL_DOSSIER: SavedDossier = {
  id: "sample-deep-work",
  createdAt: "Sample Dossier",
  tokensUsed: 2950,
  creditsUsed: 44,
  dossier: {
    topic: "The Neurobiology of Deep Work & Cognitive Endurance",
    targetAudience: "Knowledge workers, software engineers, and ambitious creators",
    depth: "comprehensive",
    executiveSummary:
      "Modern knowledge work suffers from chronic attention fragmentation. By examining prefrontal cortex glucose metabolism, dopamine receptor downregulation, and myelin sheath formation, this dossier establishes how high-performance writers build sustained cognitive stamina without burnout.",
    coreTheses: [
      {
        title: "Myelination Governs Skill Velocity",
        explanation: "Deep, unbroken concentration triggers oligodendrocytes to wrap myelin around neural circuits, accelerating signal transmission by up to 100x.",
        takeaway: "Structure chapters around sustained 90-minute ultradian cycles rather than scattered micro-sessions.",
      },
      {
        title: "Dopamine Fasting Restores Baseline Motivation",
        explanation: "Constant digital notifications create tonic dopamine depletion, lowering the brain's threshold for boredom tolerance.",
        takeaway: "Frame distraction not as a moral failing, but as a predictable neurochemical adaptation to hyper-stimulating stimuli.",
      },
      {
        title: "Context Switching Has a 23-Minute Biological Tax",
        explanation: "Attention residue lingers in the working memory whenever an individual switches tasks before completing the primary objective.",
        takeaway: "Empirical proof point to open Chapter 1 and hook executive readers.",
      },
    ],
    factsAndStats: [
      {
        stat: "23 min 15 sec",
        context: "Average time required to return to a focused task after a single electronic interruption.",
        citation: "Dr. Gloria Mark, University of California, Irvine (Department of Informatics)",
        relevance: "Hooks reader in Chapter 1 with concrete empirical urgency.",
      },
      {
        stat: "40% Drop in Productivity",
        context: "Loss in cognitive throughput when attempting to multitask between complex analytical tasks.",
        citation: "American Psychological Association (APA Research Bulletin)",
        relevance: "Disproves the common executive myth of effective multitasking.",
      },
      {
        stat: "90 Minutes",
        context: "Natural limit of the human ultradian rhythm for high-frequency prefrontal cortex focus.",
        citation: "Nathaniel Kleitman, Sleep & Chronobiology Laboratory",
        relevance: "Provides the biological foundation for chapter drafting schedules.",
      },
    ],
    contrarianAngles: [
      {
        angle: "Willpower is a Biological Illusion",
        conventionalView: "Productive authors possess immense internal grit and willpower.",
        counterIntuitiveTruth: "Top performers deplete minimal willpower; they engineer physical environments where distraction is biologically frictionless to avoid.",
        narrativeHook: "Stop training your discipline; start designing your physical room.",
      },
      {
        angle: "Boredom is the Necessary Precursor to Original Synthesis",
        conventionalView: "Unoccupied downtime is wasted time that should be filled with educational podcasts or audiobooks.",
        counterIntuitiveTruth: "The Default Mode Network (DMN) only consolidates novel cross-disciplinary breakthroughs when sensory inputs drop to near-zero.",
        narrativeHook: "Why your best ideas arrive in the shower, and how to trigger them on demand.",
      },
    ],
    caseStudies: [
      {
        title: "Carl Jung's Bollingen Tower",
        subject: "Architectural Isolation as Cognitive Infrastructure",
        storySummary: "In 1922, Carl Jung retreated to a rural lakeside stone tower without electricity or phone lines to author the foundations of analytical psychology.",
        keyLesson: "Deep work demands deliberate physical friction between the thinker and the outside world.",
      },
      {
        title: "The Bell Labs Transistor Breakthrough (1947)",
        subject: "Interdisciplinary Proximity Without Cognitive Interference",
        storySummary: "Mervin Kelly engineered Bell Labs so theoretical physicists and metallurgists crossed paths in long corridors but possessed soundproof individual retreat offices.",
        keyLesson: "Serendipity belongs in the hallway; deep production belongs in sensory isolation.",
      },
    ],
    chapterSeeds: [
      {
        chapterNumber: 1,
        title: "The Fragmented Mind: Quantifying the Cost of Modern Distraction",
        hook: "You are not tired from thinking too much; you are depleted from switching tasks too often.",
        keyPoints: [
          "The neurochemistry of attention residue",
          "Gloria Mark's 23-minute penalty",
          "Why shallow work feels deceptively productive",
        ],
        researchAngle: "Empirical study on cognitive switching penalties and glucose depletion.",
      },
      {
        chapterNumber: 2,
        title: "The Myelin Protocol: How Deep Focus Physically Rewires the Brain",
        hook: "Skill is not an abstract virtue; it is a physical layer of insulation wrapped around your thoughts.",
        keyPoints: [
          "Oligodendrocytes and deliberate practice",
          "The 90-minute ultradian sprint framework",
          "Building cognitive stamina like an endurance athlete",
        ],
        researchAngle: "Neurobiological imaging of neural pathways under sustained deliberate practice.",
      },
      {
        chapterNumber: 3,
        title: "Architectures of Solitude: Designing the Distraction-Free Fortress",
        hook: "If you need discipline to resist your phone, your environment has already defeated you.",
        keyPoints: [
          "Friction engineering for high-stakes writers",
          "Lessons from Jung's Bollingen Tower",
          "The digital air-gap strategy for book production",
        ],
        researchAngle: "Behavioral psychology of default-choice architecture.",
      },
    ],
    glossary: [
      {
        term: "Attention Residue",
        definition: "The lingering cognitive trace left behind in working memory when switching from an incomplete task to a new task.",
        usageTip: "Use when explaining why checking email before deep writing destroys creative flow.",
      },
      {
        term: "Ultradian Rhythm",
        definition: "Biological cycles recurring within a 24-hour day, typically 90 to 120 minutes of peak energy followed by 20 minutes of dip.",
        usageTip: "Recommend to readers as the scientific basis for time-blocking book writing sessions.",
      },
    ],
    recommendedReadings: [
      {
        title: "Deep Work: Rules for Focused Success in a Distracted World",
        type: "Book",
        whyItMatters: "Seminal modern manifesto on intellectual output and attention economics.",
      },
      {
        title: "The Shallows: What the Internet Is Doing to Our Brains",
        type: "Book",
        whyItMatters: "Comprehensive historical and neurobiological study of digital neuroplasticity.",
      },
    ],
    authorNotes: [
      "Target tone: Authoritative, empirically grounded, yet direct and actionable.",
      "Emphasize environmental design over moralistic willpower advice.",
    ],
  },
};

export function getSavedDossiers(): SavedDossier[] {
  if (typeof window === "undefined") return [SAMPLE_INITIAL_DOSSIER];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      // Seed with sample dossier so user sees how it looks
      localStorage.setItem(STORAGE_KEY, JSON.stringify([SAMPLE_INITIAL_DOSSIER]));
      return [SAMPLE_INITIAL_DOSSIER];
    }
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
    return [SAMPLE_INITIAL_DOSSIER];
  } catch {
    return [SAMPLE_INITIAL_DOSSIER];
  }
}

export function saveDossierToStorage(
  dossier: ResearchDossier,
  tokensUsed?: number,
  creditsUsed?: number,
): SavedDossier {
  const current = getSavedDossiers();
  const calculatedCredits = creditsUsed ?? (tokensUsed ? Number((tokensUsed * 0.015).toFixed(1)) : undefined);
  const newEntry: SavedDossier = {
    id: `dossier-${Date.now()}`,
    createdAt: new Date().toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    dossier,
    tokensUsed,
    creditsUsed: calculatedCredits,
  };

  const updated = [newEntry, ...current.filter((d) => d.id !== SAMPLE_INITIAL_DOSSIER.id || current.length === 1)];
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("writerdost_dossiers_updated"));
    } catch {
      // Ignore quota errors
    }
  }
  return newEntry;
}

export function deleteDossierFromStorage(id: string): SavedDossier[] {
  const current = getSavedDossiers();
  const updated = current.filter((item) => item.id !== id);
  if (typeof window !== "undefined") {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new Event("writerdost_dossiers_updated"));
    } catch {
      // Ignore quota errors
    }
  }
  return updated;
}

export function formatDossierSynthesis(dossier: ResearchDossier): string {
  const theses = dossier.coreTheses
    .map((t, idx) => `${idx + 1}. ${t.title}: ${t.explanation} (Takeaway: ${t.takeaway})`)
    .join("\n");

  const facts = dossier.factsAndStats
    .map((f) => `• [${f.stat}] ${f.context} (Citation: ${f.citation})`)
    .join("\n");

  const contrarian = dossier.contrarianAngles
    .map((c) => `• Conventional: ${c.conventionalView} -> Counter-Intuitive Truth: ${c.counterIntuitiveTruth}`)
    .join("\n");

  const cases = dossier.caseStudies
    .map((cs) => `• ${cs.title} (${cs.subject}): ${cs.storySummary} [Key Lesson: ${cs.keyLesson}]`)
    .join("\n");

  return `EXECUTIVE RESEARCH SYNTHESIS:
Topic: ${dossier.topic}
Target Audience: ${dossier.targetAudience}

Executive Summary:
${dossier.executiveSummary}

Key Theses:
${theses}

Empirical Proof Points & Stats:
${facts}

Contrarian Angles:
${contrarian}

Case Studies & Precedents:
${cases}`;
}

export function buildMarkdownFromDossier(dossier: ResearchDossier): string {
  let md = `# Research Dossier: ${dossier.topic}\n\n`;
  md += `**Target Audience:** ${dossier.targetAudience}\n`;
  md += `**Depth Tier:** ${dossier.depth.toUpperCase()}\n`;
  md += `**Generated:** ${new Date().toLocaleDateString()}\n\n`;
  md += `---\n\n`;

  md += `## 1. Executive Summary\n${dossier.executiveSummary}\n\n`;

  if (dossier.coreTheses?.length > 0) {
    md += `## 2. Core Theses & Hypotheses\n`;
    dossier.coreTheses.forEach((t, i) => {
      md += `### ${i + 1}. ${t.title}\n${t.explanation}\n\n*Key Takeaway:* **${t.takeaway}**\n\n`;
    });
  }

  if (dossier.factsAndStats?.length > 0) {
    md += `## 3. Empirical Facts & Statistics\n`;
    dossier.factsAndStats.forEach((f) => {
      md += `- **${f.stat}**: ${f.context}\n  *Citation:* \`${f.citation}\` · *Book Relevance:* ${f.relevance}\n\n`;
    });
  }

  if (dossier.contrarianAngles?.length > 0) {
    md += `## 4. Contrarian & Counter-Intuitive Angles\n`;
    dossier.contrarianAngles.forEach((c) => {
      md += `### ${c.angle}\n- **Conventional Belief:** ${c.conventionalView}\n- **Counter-Intuitive Truth:** ${c.counterIntuitiveTruth}\n- **Narrative Hook:** *"${c.narrativeHook}"*\n\n`;
    });
  }

  if (dossier.caseStudies?.length > 0) {
    md += `## 5. Case Studies & Real-World Precedents\n`;
    dossier.caseStudies.forEach((cs) => {
      md += `### ${cs.title} (${cs.subject})\n${cs.storySummary}\n\n*Core Lesson:* **${cs.keyLesson}**\n\n`;
    });
  }

  if (dossier.chapterSeeds?.length > 0) {
    md += `## 6. Proposed Chapter Blueprint\n`;
    dossier.chapterSeeds.forEach((ch) => {
      md += `### Chapter ${ch.chapterNumber}: ${ch.title}\n`;
      md += `*Hook:* ${ch.hook}\n\n**Key Points:**\n`;
      ch.keyPoints.forEach((kp) => {
        md += `- ${kp}\n`;
      });
      md += `\n*Research Angle:* ${ch.researchAngle}\n\n`;
    });
  }

  if (dossier.glossary?.length > 0) {
    md += `## 7. Domain Lexicon\n`;
    dossier.glossary.forEach((g) => {
      md += `- **${g.term}**: ${g.definition} *(Usage: ${g.usageTip})*\n`;
    });
    md += `\n`;
  }

  if (dossier.recommendedReadings?.length > 0) {
    md += `## 8. Recommended Readings & Literature\n`;
    dossier.recommendedReadings.forEach((r) => {
      md += `- **${r.title}** (${r.type}): ${r.whyItMatters}\n`;
    });
    md += `\n`;
  }

  return md;
}

/**
 * Calculates actual/historical credits consumed by a dossier.
 * Uses exact tokensUsed (tokens * 0.015) if available, or accurately calculates
 * based on the compiled dossier word count (~2 tokens/word * 0.015) or depth fallback.
 */
export function calculateDossierCredits(entry: SavedDossier): number {
  if (typeof entry.creditsUsed === "number" && entry.creditsUsed > 1) {
    return Math.round(entry.creditsUsed);
  }
  if (typeof entry.tokensUsed === "number" && entry.tokensUsed > 100) {
    return Math.round(entry.tokensUsed * 0.015);
  }

  const d = entry.dossier;
  if (!d) return 45;

  const totalWords = [
    d.topic || "",
    d.executiveSummary || "",
    ...(d.coreTheses || []).map((t) => `${t.title} ${t.explanation} ${t.takeaway}`),
    ...(d.factsAndStats || []).map((f) => `${f.stat} ${f.context} ${f.citation} ${f.relevance}`),
    ...(d.contrarianAngles || []).map((a) => `${a.angle} ${a.conventionalView} ${a.counterIntuitiveTruth}`),
    ...(d.caseStudies || []).map((c) => `${c.title} ${c.subject} ${c.storySummary} ${c.keyLesson}`),
    ...(d.chapterSeeds || []).map((c) => `${c.title} ${c.hook} ${(c.keyPoints || []).join(" ")} ${c.researchAngle}`),
  ].join(" ").split(/\s+/).filter(Boolean).length;

  if (totalWords > 50) {
    const estimatedTokens = Math.round(totalWords * 2.0);
    return Math.max(5, Math.round(estimatedTokens * 0.015));
  }

  switch (d.depth) {
    case "quick":
      return 23;
    case "academic":
      return 72;
    case "comprehensive":
    default:
      return 45;
  }
}

/**
 * Psychological pre-generation estimate displayed to the user (40% lower than assumed actual cost).
 */
export function getDisplayedResearchCreditEstimate(depth: ResearchDepth): number {
  switch (depth) {
    case "quick":
      return 14;
    case "academic":
      return 43;
    case "comprehensive":
    default:
      return 27;
  }
}
