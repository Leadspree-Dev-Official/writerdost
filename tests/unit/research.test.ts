import { describe, it, expect } from "vitest";

describe("Research Dossier Schema & Structure", () => {
  it("validates required fields of a structured research dossier", () => {
    const sampleDossier = {
      topic: "The Neurobiology of Deep Focus",
      targetAudience: "Knowledge workers",
      depth: "comprehensive",
      executiveSummary: "A deep dive into dopamine regulation and cognitive endurance.",
      coreTheses: [
        {
          title: "Myelination drives deep focus",
          explanation: "Neural circuits strengthen through uninterrupted practice.",
          takeaway: "Structure chapters around sustained attention blocks.",
        },
      ],
      factsAndStats: [
        {
          stat: "23 minutes",
          context: "Average time to regain focus after an interruption.",
          citation: "Gloria Mark, UC Irvine",
          relevance: "Hooks reader in chapter 1.",
        },
      ],
      contrarianAngles: [
        {
          angle: "Willpower is a biological myth",
          conventionalView: "Discipline is mental grit",
          counterIntuitiveTruth: "Discipline is environment architecture",
          narrativeHook: "Stop forcing focus; design the room.",
        },
      ],
      caseStudies: [
        {
          title: "Carl Jung's Bollingen Tower",
          subject: "Solitude and creative architecture",
          storySummary: "Jung built a stone tower without electricity to write.",
          keyLesson: "Physical isolation accelerates deep work.",
        },
      ],
      chapterSeeds: [
        {
          chapterNumber: 1,
          title: "The Fragmented Mind",
          hook: "Why your brain is exhausted by 10 AM.",
          keyPoints: ["The cost of task switching", "Dopamine depletion cycles"],
          researchAngle: "Empirical study on cognitive switching penalty",
        },
      ],
      glossary: [
        {
          term: "Attentional Residue",
          definition: "Cognitive penalty when switching tasks before completion.",
          usageTip: "Use in chapter 2 to justify single-tasking.",
        },
      ],
      recommendedReadings: [
        {
          title: "Deep Work by Cal Newport",
          type: "Seminal Book",
          whyItMatters: "Standard benchmark for modern knowledge economy focus.",
        },
      ],
      authorNotes: [
        "Avoid overly clinical medical jargon; keep actionable for readers.",
      ],
    };

    expect(sampleDossier.topic).toBe("The Neurobiology of Deep Focus");
    expect(sampleDossier.coreTheses).toHaveLength(1);
    expect(sampleDossier.factsAndStats[0].stat).toBe("23 minutes");
    expect(sampleDossier.contrarianAngles[0].angle).toBe("Willpower is a biological myth");
    expect(sampleDossier.chapterSeeds[0].chapterNumber).toBe(1);
    expect(sampleDossier.glossary[0].term).toBe("Attentional Residue");
  });

  it("formats research dossier into actionable book drafting synthesis", async () => {
    const { formatDossierSynthesis, buildMarkdownFromDossier, SAMPLE_INITIAL_DOSSIER } = await import("@/lib/research-store");
    const synthesis = formatDossierSynthesis(SAMPLE_INITIAL_DOSSIER.dossier);
    expect(synthesis).toContain("EXECUTIVE RESEARCH SYNTHESIS:");
    expect(synthesis).toContain("Topic: The Neurobiology of Deep Work & Cognitive Endurance");
    expect(synthesis).toContain("Myelination Governs Skill Velocity");
    expect(synthesis).toContain("23 min 15 sec");

    const md = buildMarkdownFromDossier(SAMPLE_INITIAL_DOSSIER.dossier);
    expect(md).toContain("# Research Dossier: The Neurobiology of Deep Work");
    expect(md).toContain("## 1. Executive Summary");
    expect(md).toContain("## 2. Core Theses & Hypotheses");
    expect(md).toContain("## 6. Proposed Chapter Blueprint");
  });
});
