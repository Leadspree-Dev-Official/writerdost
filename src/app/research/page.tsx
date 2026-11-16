"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore, type ResearchSource } from "@/lib/app-store";
import { apiFetch } from "@/lib/api-client";
import { downloadTxt } from "@/lib/export-utils";
import clsx from "clsx";

type ResearchDossier = {
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

type SavedDossier = {
  id: string;
  createdAt: string;
  dossier: ResearchDossier;
};

const SAMPLE_TOPICS = [
  {
    title: "Neuroscience of Deep Focus",
    topic: "The Neurobiology of Deep Work: How dopamine receptors, myelination, and prefrontal cortex exhaustion dictate modern cognitive stamina.",
    audience: "Knowledge workers, software engineers, and ambitious creators",
    lenses: ["theses", "facts_stats", "contrarian", "case_studies", "chapter_seeds", "glossary"],
  },
  {
    title: "The Solo Founder Playbook",
    topic: "Bootstrapping Micro-SaaS to $1M ARR: Asymmetric leverage, programmatic distribution, and lean customer acquisition without VC dilution.",
    audience: "Solo founders, technical entrepreneurs, and indie hackers",
    lenses: ["theses", "facts_stats", "contrarian", "case_studies", "chapter_seeds"],
  },
  {
    title: "Stoic Psychology Under Pressure",
    topic: "Ancient Stoicism in High-Volatility Environments: Epictetus, Marcus Aurelius, and modern cognitive behavioral therapies applied to risk management.",
    audience: "Executives, traders, founders, and decision-makers in high-stress roles",
    lenses: ["theses", "contrarian", "case_studies", "chapter_seeds", "glossary"],
  },
];

const LENS_OPTIONS = [
  { id: "theses", label: "Core Theses", icon: "psychology", desc: "Foundational mental models & core principles" },
  { id: "facts_stats", label: "Facts & Stats", icon: "analytics", desc: "Empirically verified metrics & citations" },
  { id: "contrarian", label: "Contrarian Angles", icon: "bolt", desc: "Counter-intuitive takes that bust common myths" },
  { id: "case_studies", label: "Case Studies", icon: "history_edu", desc: "Real-world stories & historical precedents" },
  { id: "chapter_seeds", label: "Chapter Blueprint", icon: "account_tree", desc: "Proposed chapter-by-chapter narrative progression" },
  { id: "glossary", label: "Domain Lexicon", icon: "dictionary", desc: "Specialist terminology & definitions" },
];

const AUDIENCE_PRESETS = [
  "Knowledge workers & creative professionals",
  "Early-stage founders & entrepreneurs",
  "Beginners & curious general readers",
  "Domain specialists & academic practitioners",
];

const RESEARCH_STEPS = [
  "Analyzing book thesis & semantic parameters...",
  "Querying empirical literature & statistical data...",
  "Uncovering contrarian angles & non-obvious hooks...",
  "Extracting real-world case studies & anecdotes...",
  "Structuring chapter progression seeds & glossary...",
  "Synthesizing editorial research dossier...",
];

export default function ResearchPage() {
  const router = useRouter();
  const api = useAppStore((state) => state.api);
  const currentUser = useAppStore((state) => state.currentUser);
  const appCredits = useAppStore((state) => state.userCredits);
  const userCredits = currentUser?.credits ?? appCredits ?? 50_000;
  void userCredits; // referenced for quota awareness
  const updateCreateDraft = useAppStore((state) => state.updateCreateDraft);
  const updateRewrite = useAppStore((state) => state.updateRewrite);
  const recordUsage = useAppStore((state) => state.recordUsage);

  // Form State
  const [topic, setTopic] = useState("");
  const [targetAudience, setTargetAudience] = useState(AUDIENCE_PRESETS[0]);
  const [depth, setDepth] = useState<"quick" | "comprehensive" | "academic">("comprehensive");
  const [selectedLenses, setSelectedLenses] = useState<string[]>([
    "theses",
    "facts_stats",
    "contrarian",
    "case_studies",
    "chapter_seeds",
    "glossary",
  ]);
  const [specificQuestions, setSpecificQuestions] = useState("");

  // Grounding Sources
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [activeSourceTab, setActiveSourceTab] = useState<"link" | "file" | "youtube" | "notes">("link");
  const [sourceInput, setSourceInput] = useState("");

  // Generation & Results State
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [dossier, setDossier] = useState<ResearchDossier | null>(null);
  const [activeDossierTab, setActiveDossierTab] = useState<
    "overview" | "facts" | "contrarian" | "cases" | "chapters" | "glossary" | "markdown"
  >("overview");
  const [copied, setCopied] = useState(false);

  // Saved Dossiers State (Persisted in localStorage)
  const [savedDossiers, setSavedDossiers] = useState<SavedDossier[]>([]);
  const [showSavedDrawer, setShowSavedDrawer] = useState(false);

  // Load saved dossiers on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("writerdost_saved_dossiers");
      if (stored) {
        const timer = setTimeout(() => {
          setSavedDossiers(JSON.parse(stored));
        }, 0);
        return () => clearTimeout(timer);
      }
    } catch {
      // Ignore storage errors
    }
  }, []);

  // Cycle progress steps while loading
  useEffect(() => {
    if (!loading) return;
    const interval = setInterval(() => {
      setProgressStep((prev) => (prev + 1) % RESEARCH_STEPS.length);
    }, 2800);
    return () => clearInterval(interval);
  }, [loading]);

  const toggleLens = (id: string) => {
    setSelectedLenses((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const handleAddSource = () => {
    if (!sourceInput.trim()) return;
    const newSource: ResearchSource = {
      id: Math.random().toString(36).substring(7),
      type: activeSourceTab === "notes" ? "file" : activeSourceTab,
      value: sourceInput.trim(),
      label:
        activeSourceTab === "notes"
          ? `Author Notes: ${sourceInput.trim().substring(0, 30)}...`
          : sourceInput.trim(),
    };
    setSources((prev) => [...prev, newSource]);
    setSourceInput("");
  };

  const handleRemoveSource = (id: string) => {
    setSources((prev) => prev.filter((s) => s.id !== id));
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      const newSource: ResearchSource = {
        id: Math.random().toString(36).substring(7),
        type: "file",
        value: content.substring(0, 10_000), // First 10k chars
        label: `${file.name} (${Math.round(file.size / 1024)} KB)`,
      };
      setSources((prev) => [...prev, newSource]);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  const handleLoadSample = (sample: (typeof SAMPLE_TOPICS)[0]) => {
    setTopic(sample.topic);
    setTargetAudience(sample.audience);
    setSelectedLenses(sample.lenses);
    setError(null);
  };

  const handleRunResearch = async () => {
    if (!topic.trim()) {
      setError("Please provide a research topic or book thesis.");
      return;
    }
    setError(null);
    setLoading(true);
    setProgressStep(0);

    try {
      const res = await apiFetch("/api/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api,
          topic: topic.trim(),
          targetAudience,
          depth,
          lenses: selectedLenses,
          sources,
          specificQuestions: specificQuestions.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to generate research dossier.");
      }

      setDossier(data.dossier);
      setActiveDossierTab("overview");

      // Record usage for credit deduction
      if (data.usage?.total_tokens) {
        recordUsage(data.usage.total_tokens, api.provider, api.model);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  };

  const handleSaveDossier = () => {
    if (!dossier) return;
    const newEntry: SavedDossier = {
      id: Date.now().toString(),
      createdAt: new Date().toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      }),
      dossier,
    };
    const updated = [newEntry, ...savedDossiers.slice(0, 19)]; // Keep up to 20
    setSavedDossiers(updated);
    try {
      localStorage.setItem("writerdost_saved_dossiers", JSON.stringify(updated));
    } catch {
      // Ignore storage errors
    }
  };

  const handleExportToNewEbook = () => {
    if (!dossier) return;
    const formattedSynthesis = `RESEARCH DOSSIER SYNTHESIS:
Topic: ${dossier.topic}
Target Audience: ${dossier.targetAudience}

Executive Summary:
${dossier.executiveSummary}

Key Theses:
${dossier.coreTheses.map((t, idx) => `${idx + 1}. ${t.title}: ${t.explanation}`).join("\n")}

Empirical Proof Points:
${dossier.factsAndStats.map((f) => `• [${f.stat}] ${f.context} (Source: ${f.citation})`).join("\n")}

Contrarian Angles:
${dossier.contrarianAngles.map((c) => `• Angle: ${c.angle} -> ${c.counterIntuitiveTruth}`).join("\n")}
`;

    updateCreateDraft({
      vision: `${dossier.topic}\n\n${formattedSynthesis}`,
      audience: dossier.targetAudience,
      researchSources: sources,
    });
    router.push("/create");
  };

  const handleExportToRewrite = () => {
    if (!dossier) return;
    const outlineText = dossier.chapterSeeds
      .map(
        (ch) =>
          `Chapter ${ch.chapterNumber}: ${ch.title}\nHook: ${ch.hook}\nKey Points:\n${ch.keyPoints.map((kp) => `  - ${kp}`).join("\n")}\nResearch Angle: ${ch.researchAngle}`
      )
      .join("\n\n");

    updateRewrite({
      title: dossier.topic.split(":")[0]?.trim() || dossier.topic,
      audience: dossier.targetAudience,
      manuscript: outlineText,
      flow: "Outline",
    });
    router.push("/rewrite");
  };

  const buildMarkdownDossier = (): string => {
    if (!dossier) return "";
    let md = `# Research Dossier: ${dossier.topic}\n\n`;
    md += `**Target Audience:** ${dossier.targetAudience}\n`;
    md += `**Research Depth:** ${dossier.depth}\n`;
    md += `**Date:** ${new Date().toLocaleDateString()}\n\n`;
    md += `## Executive Summary\n${dossier.executiveSummary}\n\n`;

    if (dossier.coreTheses?.length) {
      md += `## Core Theses & Mental Models\n`;
      dossier.coreTheses.forEach((t, i) => {
        md += `### ${i + 1}. ${t.title}\n${t.explanation}\n\n**Takeaway for Author:** ${t.takeaway}\n\n`;
      });
    }

    if (dossier.factsAndStats?.length) {
      md += `## Empirical Facts & Statistics\n`;
      dossier.factsAndStats.forEach((f) => {
        md += `* **${f.stat}**: ${f.context}\n  *Citation:* ${f.citation}\n  *Relevance:* ${f.relevance}\n\n`;
      });
    }

    if (dossier.contrarianAngles?.length) {
      md += `## Contrarian & Provocative Angles\n`;
      dossier.contrarianAngles.forEach((c) => {
        md += `### ${c.angle}\n`;
        md += `* **Conventional View:** ${c.conventionalView}\n`;
        md += `* **Counter-Intuitive Truth:** ${c.counterIntuitiveTruth}\n`;
        md += `* **Narrative Hook:** ${c.narrativeHook}\n\n`;
      });
    }

    if (dossier.caseStudies?.length) {
      md += `## Real-World Case Studies\n`;
      dossier.caseStudies.forEach((cs) => {
        md += `### ${cs.title} (${cs.subject})\n${cs.storySummary}\n\n**Key Lesson:** ${cs.keyLesson}\n\n`;
      });
    }

    if (dossier.chapterSeeds?.length) {
      md += `## Chapter Blueprint & Narrative Progression\n`;
      dossier.chapterSeeds.forEach((ch) => {
        md += `### Chapter ${ch.chapterNumber}: ${ch.title}\n`;
        md += `* **Hook:** ${ch.hook}\n`;
        md += `* **Key Topics:**\n`;
        ch.keyPoints.forEach((kp) => {
          md += `  - ${kp}\n`;
        });
        md += `* **Research Angle:** ${ch.researchAngle}\n\n`;
      });
    }

    if (dossier.glossary?.length) {
      md += `## Domain Lexicon & Terminology\n`;
      dossier.glossary.forEach((g) => {
        md += `* **${g.term}**: ${g.definition} *(Usage: ${g.usageTip})*\n`;
      });
      md += `\n`;
    }

    if (dossier.recommendedReadings?.length) {
      md += `## Recommended Primary Literature & Citations\n`;
      dossier.recommendedReadings.forEach((r) => {
        md += `* **${r.title}** [${r.type}] — ${r.whyItMatters}\n`;
      });
      md += `\n`;
    }

    if (dossier.authorNotes?.length) {
      md += `## Editorial Directives for Author\n`;
      dossier.authorNotes.forEach((n) => {
        md += `* ${n}\n`;
      });
      md += `\n`;
    }

    return md;
  };

  const handleCopyMarkdown = () => {
    const md = buildMarkdownDossier();
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownloadMarkdown = () => {
    const md = buildMarkdownDossier();
    const slug = dossier?.topic.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "-").toLowerCase() || "research-dossier";
    downloadTxt(`${slug}-dossier.md`, md, "text/markdown");
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
      {/* Top Header & Breadcrumb */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[var(--hairline)] pb-5">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="material-symbols-outlined text-[20px] text-primary">
              travel_explore
            </span>
            <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
              Writerdost Investigation Hub
            </span>
            <span className="badge badge-subtle text-[10.5px]">Author Control</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-on-surface">
            Deep Research Lab
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant mt-0.5">
            Empirically ground your book, discover contrarian angles, extract statistics, and build rock-solid chapter blueprints before drafting.
          </p>
        </div>

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="rounded-full px-3 py-1 bg-surface-container-high border border-[var(--hairline)] flex items-center gap-2 text-xs text-on-surface-variant shadow-xs">
            <span className="material-symbols-outlined text-[15px] text-amber-500">
              monetization_on
            </span>
            <span>Est. ~1 credit</span>
            <span className="text-on-surface-variant/40">•</span>
            <span className="text-[11px] font-medium text-emerald-500">Free with BYOK</span>
          </div>

          <button
            type="button"
            onClick={() => setShowSavedDrawer(!showSavedDrawer)}
            className="btn btn-secondary text-xs flex items-center gap-1.5"
          >
            <span className="material-symbols-outlined text-[16px]">bookmark</span>
            <span>Saved ({savedDossiers.length})</span>
          </button>
        </div>
      </div>

      {/* Saved Dossiers Quick Drawer / Bar */}
      {showSavedDrawer && (
        <div className="panel p-4 bg-surface-container-low border border-[var(--hairline-strong)] animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-[18px] text-primary">
                folder_open
              </span>
              <h2 className="text-xs font-bold uppercase tracking-wider text-on-surface">
                Saved Research Dossiers ({savedDossiers.length})
              </h2>
            </div>
            <button
              type="button"
              onClick={() => setShowSavedDrawer(false)}
              className="text-on-surface-variant hover:text-on-surface p-1"
            >
              <span className="material-symbols-outlined text-[16px]">close</span>
            </button>
          </div>

          {savedDossiers.length === 0 ? (
            <p className="text-xs text-on-surface-variant py-2">
              No saved dossiers yet. Run your first research inquiry below and click &quot;Save Dossier&quot; to keep it here.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto">
              {savedDossiers.map((item) => (
                <div
                  key={item.id}
                  onClick={() => {
                    setDossier(item.dossier);
                    setTopic(item.dossier.topic);
                    setTargetAudience(item.dossier.targetAudience);
                    setShowSavedDrawer(false);
                  }}
                  className="p-2.5 rounded-lg border border-[var(--hairline)] hover:border-primary/50 bg-surface-container hover:bg-surface-container-high transition-all cursor-pointer group"
                >
                  <p className="text-xs font-semibold text-on-surface truncate group-hover:text-primary transition-colors">
                    {item.dossier.topic}
                  </p>
                  <div className="flex items-center justify-between text-[10.5px] text-on-surface-variant mt-1.5">
                    <span>{item.createdAt}</span>
                    <span className="capitalize text-primary/80">{item.dossier.depth}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Main Grid: Left Controls, Right Dossier */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Writer Control Panel (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Panel 1: Topic & Inspiration */}
          <div className="panel overflow-hidden">
            <div className="panel-head">
              <span className="panel-title flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-primary">edit</span>
                1. Research Topic & Thesis
              </span>
              <span className="text-[11px] text-on-surface-variant">Required</span>
            </div>

            <div className="panel-pad space-y-3">
              <div>
                <label htmlFor="topic-input" className="block text-xs font-medium text-on-surface-variant mb-1">
                  Book Idea, Thesis Statement, or Investigation Query
                </label>
                <textarea
                  id="topic-input"
                  rows={3}
                  className="textarea w-full text-xs"
                  placeholder="e.g. How dopamine fasting influences neural neuroplasticity and daily creative output in modern knowledge workers..."
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                />
              </div>

              {/* Sample Topics Pills */}
              <div>
                <span className="text-[10.5px] font-semibold text-on-surface-variant/80 uppercase tracking-wider block mb-1.5">
                  Try Sample Themes:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {SAMPLE_TOPICS.map((sample) => (
                    <button
                      key={sample.title}
                      type="button"
                      onClick={() => handleLoadSample(sample)}
                      className="px-2 py-1 rounded-md text-[11px] font-medium bg-on-surface/[0.04] hover:bg-primary/10 hover:text-primary transition-colors border border-[var(--hairline)]"
                    >
                      {sample.title}
                    </button>
                  ))}
                </div>
              </div>

              {/* Target Audience */}
              <div>
                <label htmlFor="audience-input" className="block text-xs font-medium text-on-surface-variant mb-1">
                  Target Reader Profile
                </label>
                <input
                  id="audience-input"
                  type="text"
                  className="input w-full text-xs mb-1.5"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  placeholder="Who is this manuscript written for?"
                />
                <div className="flex flex-wrap gap-1">
                  {AUDIENCE_PRESETS.map((preset) => (
                    <button
                      key={preset}
                      type="button"
                      onClick={() => setTargetAudience(preset)}
                      className={clsx(
                        "px-2 py-0.5 rounded text-[10px] font-medium transition-colors border",
                        targetAudience === preset
                          ? "bg-primary/15 border-primary/40 text-primary"
                          : "border-[var(--hairline)] bg-surface text-on-surface-variant hover:text-on-surface"
                      )}
                    >
                      {preset}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Panel 2: Research Depth & Focus Lenses */}
          <div className="panel overflow-hidden">
            <div className="panel-head">
              <span className="panel-title flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-amber-500">tune</span>
                2. Depth & Research Lenses
              </span>
              <span className="text-[11px] text-on-surface-variant">{selectedLenses.length} active</span>
            </div>

            <div className="panel-pad space-y-3.5">
              {/* Depth Segmented Picker */}
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
                  Investigation Depth
                </label>
                <div className="grid grid-cols-3 gap-1.5 p-1 rounded-lg bg-surface border border-[var(--hairline)]">
                  {[
                    { id: "quick", label: "Quick Brief", meta: "~600w" },
                    { id: "comprehensive", label: "Comprehensive", meta: "~1.5kw" },
                    { id: "academic", label: "Deep Study", meta: "~2.5kw" },
                  ].map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDepth(d.id as typeof depth)}
                      className={clsx(
                        "py-1.5 px-2 rounded-md text-center transition-all flex flex-col items-center",
                        depth === d.id
                          ? "bg-primary text-white font-semibold shadow-xs"
                          : "text-on-surface-variant hover:text-on-surface hover:bg-on-surface/[0.04]"
                      )}
                    >
                      <span className="text-[11.5px] leading-tight">{d.label}</span>
                      <span className={clsx("text-[9.5px]", depth === d.id ? "text-white/80" : "text-on-surface-variant/60")}>
                        {d.meta}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Lenses Multi-select */}
              <div>
                <label className="block text-xs font-medium text-on-surface-variant mb-1.5">
                  Select Exploration Dimensions
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {LENS_OPTIONS.map((lens) => {
                    const active = selectedLenses.includes(lens.id);
                    return (
                      <button
                        key={lens.id}
                        type="button"
                        onClick={() => toggleLens(lens.id)}
                        className={clsx(
                          "p-2 rounded-lg border text-left transition-all flex items-start gap-2",
                          active
                            ? "border-primary/50 bg-primary/[0.06] text-on-surface"
                            : "border-[var(--hairline)] bg-surface-container opacity-60 hover:opacity-100"
                        )}
                      >
                        <span
                          className={clsx(
                            "material-symbols-outlined text-[16px] shrink-0 mt-0.5",
                            active ? "text-primary" : "text-on-surface-variant"
                          )}
                        >
                          {lens.icon}
                        </span>
                        <div className="min-w-0">
                          <p className="text-[11px] font-semibold leading-snug">{lens.label}</p>
                          <p className="text-[9.5px] text-on-surface-variant line-clamp-1">{lens.desc}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>

          {/* Panel 3: Sources & Ingestion */}
          <div className="panel overflow-hidden">
            <div className="panel-head">
              <span className="panel-title flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-sky-500">attach_file</span>
                3. Grounding Sources (Optional)
              </span>
              <span className="text-[11px] text-on-surface-variant">{sources.length} sources</span>
            </div>

            <div className="panel-pad space-y-2.5">
              <div className="tabs !mb-2">
                {(["link", "youtube", "file", "notes"] as const).map((tab) => (
                  <button
                    key={tab}
                    type="button"
                    className="tab text-xs"
                    data-active={activeSourceTab === tab}
                    onClick={() => setActiveSourceTab(tab)}
                  >
                    <span className="material-symbols-outlined text-[14px]">
                      {tab === "link" ? "link" : tab === "youtube" ? "smart_display" : tab === "file" ? "upload_file" : "notes"}
                    </span>
                    {tab === "link" ? "Link" : tab === "youtube" ? "YouTube" : tab === "file" ? "File" : "Notes"}
                  </button>
                ))}
              </div>

              {activeSourceTab === "file" ? (
                <label className="flex flex-col items-center justify-center gap-1 py-3 px-3 border border-dashed border-[var(--hairline-strong)] rounded-lg cursor-pointer hover:border-primary/50 hover:bg-primary/[0.03] transition-colors text-center">
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant">upload</span>
                  <span className="text-[11.5px] font-medium text-on-surface">Upload Research Document</span>
                  <span className="text-[10px] text-on-surface-variant">TXT, MD, PDF, or DOCX text</span>
                  <input className="hidden" type="file" accept=".txt,.md,.json,.pdf,.docx" onChange={handleFileUpload} />
                </label>
              ) : activeSourceTab === "notes" ? (
                <div className="space-y-1.5">
                  <textarea
                    rows={2}
                    className="textarea w-full text-xs"
                    placeholder="Paste author thoughts, interview excerpts, or draft excerpts..."
                    value={sourceInput}
                    onChange={(e) => setSourceInput(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={handleAddSource}
                    disabled={!sourceInput.trim()}
                    className="btn btn-secondary text-xs w-full"
                  >
                    Add Author Note
                  </button>
                </div>
              ) : (
                <div className="flex gap-1.5">
                  <input
                    type="url"
                    className="input w-full text-xs"
                    placeholder={activeSourceTab === "youtube" ? "https://youtube.com/watch?v=..." : "https://example.com/article..."}
                    value={sourceInput}
                    onChange={(e) => setSourceInput(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleAddSource()}
                  />
                  <button
                    type="button"
                    onClick={handleAddSource}
                    disabled={!sourceInput.trim()}
                    className="btn btn-secondary text-xs shrink-0"
                  >
                    Add
                  </button>
                </div>
              )}

              {/* Source List */}
              {sources.length > 0 && (
                <div className="space-y-1 pt-1 max-h-32 overflow-y-auto">
                  {sources.map((s) => (
                    <div
                      key={s.id}
                      className="flex items-center justify-between gap-2 px-2 py-1 rounded bg-surface border border-[var(--hairline)] text-xs"
                    >
                      <div className="flex items-center gap-1.5 min-w-0">
                        <span className="material-symbols-outlined text-[13px] text-sky-500 shrink-0">
                          {s.type === "youtube" ? "smart_display" : s.type === "file" ? "description" : "link"}
                        </span>
                        <span className="text-[11px] text-on-surface truncate">{s.label}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveSource(s.id)}
                        className="text-on-surface-variant hover:text-red-400 p-0.5"
                      >
                        <span className="material-symbols-outlined text-[13px]">close</span>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Panel 4: Specific Inquiry Questions (Optional) */}
          <div className="panel overflow-hidden">
            <div className="panel-head">
              <span className="panel-title flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[15px] text-emerald-500">help</span>
                4. Writer Inquiries (Optional)
              </span>
            </div>
            <div className="panel-pad">
              <textarea
                rows={2}
                className="textarea w-full text-xs"
                placeholder="Specific questions or counter-arguments you want the research agent to investigate..."
                value={specificQuestions}
                onChange={(e) => setSpecificQuestions(e.target.value)}
              />
            </div>
          </div>

          {/* Action & Run Button */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-[16px] shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}

          <button
            type="button"
            disabled={loading || !topic.trim()}
            onClick={handleRunResearch}
            className={clsx(
              "btn btn-primary w-full py-3 text-sm font-semibold flex items-center justify-center gap-2 shadow-md transition-all",
              loading && "opacity-80 cursor-wait"
            )}
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined text-[18px] animate-spin">refresh</span>
                <span>Synthesizing Dossier...</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[18px]">travel_explore</span>
                <span>Conduct Deep Research</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Research Dossier Workbench (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {loading ? (
            <div className="panel p-8 text-center space-y-4 min-h-[460px] flex flex-col items-center justify-center">
              <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center text-primary animate-pulse">
                <span className="material-symbols-outlined text-[28px] animate-spin">travel_explore</span>
              </div>
              <div className="space-y-1.5 max-w-sm">
                <h3 className="text-sm font-bold text-on-surface">Deep Research Agent Active</h3>
                <p className="text-xs text-primary font-medium transition-all">
                  {RESEARCH_STEPS[progressStep]}
                </p>
                <p className="text-[11px] text-on-surface-variant mt-2">
                  Analyzing primary theses, extracting verified statistics, and assembling the author outline seeds.
                </p>
              </div>

              {/* Step indicator pills */}
              <div className="flex gap-1 mt-3">
                {RESEARCH_STEPS.map((_, i) => (
                  <div
                    key={i}
                    className={clsx(
                      "w-2 h-2 rounded-full transition-all",
                      i === progressStep ? "bg-primary scale-125" : "bg-on-surface/[0.12]"
                    )}
                  />
                ))}
              </div>
            </div>
          ) : !dossier ? (
            /* Empty State */
            <div className="panel p-8 text-center space-y-5 min-h-[460px] flex flex-col items-center justify-center border-dashed">
              <div className="w-14 h-14 rounded-2xl bg-surface-container-high border border-[var(--hairline)] flex items-center justify-center text-on-surface-variant">
                <span className="material-symbols-outlined text-[28px]">biotech</span>
              </div>
              <div className="space-y-1 max-w-md">
                <h3 className="text-base font-bold text-on-surface">Your Author Research Dossier</h3>
                <p className="text-xs text-on-surface-variant leading-relaxed">
                  Enter your topic on the left to extract empirical statistics, contrarian arguments, real-world case studies, and chapter outline blueprints before drafting.
                </p>
              </div>

              {/* Three Value Proposition Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 w-full max-w-lg text-left mt-2">
                <div className="p-3 rounded-lg bg-surface-container border border-[var(--hairline)]">
                  <span className="material-symbols-outlined text-[18px] text-primary mb-1">analytics</span>
                  <p className="text-xs font-semibold text-on-surface">Empirical Proof</p>
                  <p className="text-[10.5px] text-on-surface-variant mt-0.5">Verified data points & study citations.</p>
                </div>
                <div className="p-3 rounded-lg bg-surface-container border border-[var(--hairline)]">
                  <span className="material-symbols-outlined text-[18px] text-amber-500 mb-1">bolt</span>
                  <p className="text-xs font-semibold text-on-surface">Contrarian Edge</p>
                  <p className="text-[10.5px] text-on-surface-variant mt-0.5">Myth-busting angles that hook readers.</p>
                </div>
                <div className="p-3 rounded-lg bg-surface-container border border-[var(--hairline)]">
                  <span className="material-symbols-outlined text-[18px] text-emerald-500 mb-1">account_tree</span>
                  <p className="text-xs font-semibold text-on-surface">Chapter Seeds</p>
                  <p className="text-[10.5px] text-on-surface-variant mt-0.5">Direct 1-click export to New Ebook.</p>
                </div>
              </div>
            </div>
          ) : (
            /* Active Dossier Display */
            <div className="space-y-4">
              {/* Dossier Header Toolbar */}
              <div className="panel p-4 bg-surface-container-low border border-[var(--hairline)]">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="badge badge-primary text-[10px] capitalize">{dossier.depth} Study</span>
                      <span className="text-[11px] text-on-surface-variant">{dossier.targetAudience}</span>
                    </div>
                    <h2 className="text-sm sm:text-base font-bold text-on-surface mt-1 truncate">
                      {dossier.topic}
                    </h2>
                  </div>

                  {/* Actions Bar */}
                  <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                    <button
                      type="button"
                      onClick={handleExportToNewEbook}
                      className="btn btn-primary text-xs flex items-center gap-1 shadow-xs"
                      title="Transfer research directly into New Ebook generator"
                    >
                      <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                      <span>Send to New Ebook</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleExportToRewrite}
                      className="btn btn-secondary text-xs flex items-center gap-1"
                      title="Transfer outline blueprint into Rewrite Studio"
                    >
                      <span className="material-symbols-outlined text-[15px]">auto_awesome_motion</span>
                      <span>Send to Outline</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleSaveDossier}
                      className="btn btn-ghost text-xs p-2"
                      title="Save dossier to library"
                    >
                      <span className="material-symbols-outlined text-[16px]">bookmark_add</span>
                    </button>

                    <button
                      type="button"
                      onClick={handleCopyMarkdown}
                      className="btn btn-ghost text-xs p-2"
                      title="Copy full dossier as Markdown"
                    >
                      <span className="material-symbols-outlined text-[16px]">
                        {copied ? "check" : "content_copy"}
                      </span>
                    </button>

                    <button
                      type="button"
                      onClick={handleDownloadMarkdown}
                      className="btn btn-ghost text-xs p-2"
                      title="Download Markdown file"
                    >
                      <span className="material-symbols-outlined text-[16px]">download</span>
                    </button>
                  </div>
                </div>

                {/* Dossier Tabs */}
                <div className="flex items-center gap-1 overflow-x-auto pt-3 border-t border-[var(--hairline)] mt-3">
                  {[
                    { id: "overview", label: "Executive Synthesis", icon: "psychology" },
                    { id: "facts", label: "Data & Stats", icon: "analytics", count: dossier.factsAndStats?.length },
                    { id: "contrarian", label: "Contrarian Angles", icon: "bolt", count: dossier.contrarianAngles?.length },
                    { id: "cases", label: "Case Studies", icon: "history_edu", count: dossier.caseStudies?.length },
                    { id: "chapters", label: "Chapter Blueprint", icon: "account_tree", count: dossier.chapterSeeds?.length },
                    { id: "glossary", label: "Glossary & Readings", icon: "dictionary" },
                    { id: "markdown", label: "Full Markdown", icon: "code" },
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      onClick={() => setActiveDossierTab(tab.id as typeof activeDossierTab)}
                      className={clsx(
                        "px-2.5 py-1.5 rounded-md text-xs font-medium whitespace-nowrap transition-colors flex items-center gap-1.5",
                        activeDossierTab === tab.id
                          ? "bg-primary/15 text-primary border border-primary/30"
                          : "text-on-surface-variant hover:text-on-surface hover:bg-on-surface/[0.04]"
                      )}
                    >
                      <span className="material-symbols-outlined text-[14px]">{tab.icon}</span>
                      <span>{tab.label}</span>
                      {typeof tab.count === "number" && tab.count > 0 && (
                        <span className="px-1.5 py-0.2 rounded-full text-[9px] bg-on-surface/[0.08] text-on-surface-variant">
                          {tab.count}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tab Content Display */}
              <div className="panel p-5 bg-surface-container-lowest border border-[var(--hairline)] min-h-[400px]">
                {/* 1. Overview Tab */}
                {activeDossierTab === "overview" && (
                  <div className="space-y-5">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-1.5">
                        Executive Summary & Core Premise
                      </h3>
                      <p className="text-xs sm:text-sm text-on-surface leading-relaxed whitespace-pre-line bg-surface-container p-3.5 rounded-lg border border-[var(--hairline)]">
                        {dossier.executiveSummary}
                      </p>
                    </div>

                    {dossier.coreTheses?.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface mb-2.5">
                          Foundational Theses & Mental Models
                        </h3>
                        <div className="space-y-3">
                          {dossier.coreTheses.map((thesis, i) => (
                            <div
                              key={i}
                              className="p-3.5 rounded-lg border border-[var(--hairline)] bg-surface hover:border-primary/40 transition-colors"
                            >
                              <div className="flex items-center gap-2 mb-1">
                                <span className="w-5 h-5 rounded-full bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                                  {i + 1}
                                </span>
                                <h4 className="text-xs font-bold text-on-surface">{thesis.title}</h4>
                              </div>
                              <p className="text-xs text-on-surface-variant pl-7 leading-relaxed mb-2">
                                {thesis.explanation}
                              </p>
                              <div className="pl-7 flex items-center gap-1.5 text-[11px] text-emerald-500 font-medium">
                                <span className="material-symbols-outlined text-[14px]">lightbulb</span>
                                <span>Author Takeaway: {thesis.takeaway}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {dossier.authorNotes?.length > 0 && (
                      <div className="p-3.5 rounded-lg bg-amber-500/[0.06] border border-amber-500/20">
                        <div className="flex items-center gap-1.5 text-xs font-bold text-amber-500 mb-2">
                          <span className="material-symbols-outlined text-[16px]">campaign</span>
                          <span>Editorial Guidance for Author</span>
                        </div>
                        <ul className="space-y-1 text-xs text-on-surface-variant list-disc list-inside">
                          {dossier.authorNotes.map((note, idx) => (
                            <li key={idx}>{note}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}

                {/* 2. Facts & Stats Tab */}
                {activeDossierTab === "facts" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-primary">
                        Empirical Facts & Verifiable Metrics ({dossier.factsAndStats?.length})
                      </h3>
                      <span className="text-[11px] text-on-surface-variant">Use these as proof points in your manuscript</span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {dossier.factsAndStats?.map((stat, i) => (
                        <div
                          key={i}
                          className="p-3.5 rounded-lg border border-[var(--hairline)] bg-surface space-y-2 hover:border-primary/40 transition-colors"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="text-xs font-bold text-primary bg-primary/10 px-2 py-0.5 rounded">
                              {stat.stat}
                            </span>
                          </div>
                          <p className="text-xs text-on-surface leading-snug">{stat.context}</p>
                          <div className="pt-1 border-t border-[var(--hairline)] space-y-0.5">
                            <p className="text-[10px] text-on-surface-variant truncate">
                              <span className="font-semibold text-on-surface">Citation:</span> {stat.citation}
                            </p>
                            <p className="text-[10px] text-emerald-500">
                              <span className="font-semibold">Relevance:</span> {stat.relevance}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 3. Contrarian Angles Tab */}
                {activeDossierTab === "contrarian" && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
                        Contrarian Angles & Myth-Busters
                      </h3>
                      <p className="text-xs text-on-surface-variant">
                        High-leverage books challenge the consensus. Use these counter-intuitive truths to structure your book&apos;s strongest hooks.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {dossier.contrarianAngles?.map((angle, i) => (
                        <div
                          key={i}
                          className="p-4 rounded-lg border border-[var(--hairline)] bg-surface space-y-2.5"
                        >
                          <div className="flex items-center gap-2">
                            <span className="material-symbols-outlined text-[16px] text-amber-500">bolt</span>
                            <h4 className="text-xs font-bold text-on-surface">{angle.angle}</h4>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-2.5 rounded-md bg-surface-container text-xs">
                            <div>
                              <span className="text-[10px] font-bold uppercase text-on-surface-variant/70 block mb-0.5">
                                Mainstream Myth:
                              </span>
                              <p className="text-on-surface-variant line-through opacity-75">{angle.conventionalView}</p>
                            </div>
                            <div>
                              <span className="text-[10px] font-bold uppercase text-primary block mb-0.5">
                                Counter-Intuitive Truth:
                              </span>
                              <p className="text-on-surface font-medium">{angle.counterIntuitiveTruth}</p>
                            </div>
                          </div>

                          <div className="text-[11px] text-primary/90 flex items-center gap-1.5">
                            <span className="font-semibold text-on-surface">Narrative Hook:</span>
                            <span>{angle.narrativeHook}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 4. Case Studies Tab */}
                {activeDossierTab === "cases" && (
                  <div className="space-y-4">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-1">
                        Real-World Case Studies & Anecdotes
                      </h3>
                      <p className="text-xs text-on-surface-variant">
                        Stories drive book retention. Weave these case summaries directly into chapter introductions.
                      </p>
                    </div>

                    <div className="space-y-3">
                      {dossier.caseStudies?.map((cs, i) => (
                        <div
                          key={i}
                          className="p-4 rounded-lg border border-[var(--hairline)] bg-surface space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <h4 className="text-xs font-bold text-on-surface">{cs.title}</h4>
                            <span className="text-[10.5px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded">
                              {cs.subject}
                            </span>
                          </div>
                          <p className="text-xs text-on-surface-variant leading-relaxed">{cs.storySummary}</p>
                          <div className="pt-2 border-t border-[var(--hairline)] flex items-center gap-1.5 text-xs text-emerald-500 font-medium">
                            <span className="material-symbols-outlined text-[14px]">school</span>
                            <span>Key Takeaway: {cs.keyLesson}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 5. Chapter Blueprint Tab */}
                {activeDossierTab === "chapters" && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-0.5">
                          Chapter Blueprint Seeds ({dossier.chapterSeeds?.length} Chapters)
                        </h3>
                        <p className="text-xs text-on-surface-variant">
                          Synthesized thematic progression derived from your research parameters.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={handleExportToNewEbook}
                        className="btn btn-secondary text-xs flex items-center gap-1"
                      >
                        <span className="material-symbols-outlined text-[14px]">auto_awesome</span>
                        <span>Open in New Ebook</span>
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {dossier.chapterSeeds?.map((ch) => (
                        <div
                          key={ch.chapterNumber}
                          className="p-3.5 rounded-lg border border-[var(--hairline)] bg-surface space-y-2 hover:border-primary/40 transition-colors"
                        >
                          <div className="flex items-center gap-2">
                            <span className="w-6 h-6 rounded-md bg-primary/10 text-primary flex items-center justify-center text-xs font-bold shrink-0">
                              {ch.chapterNumber}
                            </span>
                            <h4 className="text-xs font-bold text-on-surface">{ch.title}</h4>
                          </div>

                          <div className="pl-8 space-y-1.5 text-xs">
                            <p className="text-on-surface-variant">
                              <span className="font-semibold text-on-surface">Hook:</span> {ch.hook}
                            </p>
                            {ch.keyPoints?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 pt-1">
                                {ch.keyPoints.map((kp, idx) => (
                                  <span
                                    key={idx}
                                    className="px-2 py-0.5 rounded text-[10.5px] bg-on-surface/[0.04] border border-[var(--hairline)] text-on-surface-variant"
                                  >
                                    • {kp}
                                  </span>
                                ))}
                              </div>
                            )}
                            <p className="text-[11px] text-sky-500 font-medium pt-1">
                              Investigation Focus: {ch.researchAngle}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* 6. Glossary & Readings Tab */}
                {activeDossierTab === "glossary" && (
                  <div className="space-y-5">
                    {dossier.glossary?.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-primary mb-2.5">
                          Domain Terminology & Lexicon
                        </h3>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {dossier.glossary.map((g, i) => (
                            <div
                              key={i}
                              className="p-3 rounded-lg border border-[var(--hairline)] bg-surface space-y-1"
                            >
                              <h4 className="text-xs font-bold text-on-surface">{g.term}</h4>
                              <p className="text-xs text-on-surface-variant">{g.definition}</p>
                              <p className="text-[10px] text-emerald-500 pt-0.5">Author Tip: {g.usageTip}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {dossier.recommendedReadings?.length > 0 && (
                      <div>
                        <h3 className="text-xs font-bold uppercase tracking-wider text-on-surface mb-2.5">
                          Recommended Primary Readings & Literature
                        </h3>
                        <div className="space-y-2">
                          {dossier.recommendedReadings.map((r, i) => (
                            <div
                              key={i}
                              className="p-3 rounded-lg border border-[var(--hairline)] bg-surface flex items-start justify-between gap-3 text-xs"
                            >
                              <div>
                                <p className="font-semibold text-on-surface">{r.title}</p>
                                <p className="text-on-surface-variant text-[11px] mt-0.5">{r.whyItMatters}</p>
                              </div>
                              <span className="text-[10px] font-medium text-primary bg-primary/10 px-2 py-0.5 rounded shrink-0">
                                {r.type}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* 7. Markdown Tab */}
                {activeDossierTab === "markdown" && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-on-surface-variant">
                        Clean Markdown Source
                      </span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={handleCopyMarkdown}
                          className="btn btn-secondary text-xs flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">
                            {copied ? "check" : "content_copy"}
                          </span>
                          <span>{copied ? "Copied!" : "Copy"}</span>
                        </button>
                        <button
                          type="button"
                          onClick={handleDownloadMarkdown}
                          className="btn btn-secondary text-xs flex items-center gap-1"
                        >
                          <span className="material-symbols-outlined text-[14px]">download</span>
                          <span>Download .md</span>
                        </button>
                      </div>
                    </div>

                    <pre className="p-4 rounded-lg bg-surface font-mono text-xs text-on-surface-variant overflow-x-auto max-h-[500px] border border-[var(--hairline)] whitespace-pre-wrap">
                      {buildMarkdownDossier()}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
