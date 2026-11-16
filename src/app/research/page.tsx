"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAppStore, type ResearchSource } from "@/lib/app-store";
import { apiFetch } from "@/lib/api-client";
import { downloadTxt } from "@/lib/export-utils";
import {
  type ResearchDossier,
  type SavedDossier,
  type ResearchDepth,
  getSavedDossiers,
  saveDossierToStorage,
  deleteDossierFromStorage,
  formatDossierSynthesis,
  buildMarkdownFromDossier,
  calculateDossierCredits,
  getDisplayedResearchCreditEstimate,
} from "@/lib/research-store";
import { CoinsIcon } from "@/components/ui/CoinsIcon";
import clsx from "clsx";

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
  { id: "chapter_seeds", label: "Chapter Blueprint", icon: "account_tree", desc: "Proposed chapter narrative progression" },
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
  const updateCreateDraft = useAppStore((state) => state.updateCreateDraft);
  const updateRewrite = useAppStore((state) => state.updateRewrite);
  const startBlogFromResearch = useAppStore((state) => state.startBlogFromResearch);
  const recordUsage = useAppStore((state) => state.recordUsage);

  // Saved Dossiers State (Just like projects in ProjectsPage)
  const [savedDossiers, setSavedDossiers] = useState<SavedDossier[]>([]);
  const [selectedDossier, setSelectedDossier] = useState<SavedDossier | null>(null);
  const [dossierToDelete, setDossierToDelete] = useState<SavedDossier | null>(null);

  // Filters & Search
  const [query, setQuery] = useState("");
  const [depthFilter, setDepthFilter] = useState<string>("all");
  const [notice, setNotice] = useState("");

  // Modal / Creator State
  const [showCreator, setShowCreator] = useState(false);

  // Form State for Deep Research Creator
  const [topic, setTopic] = useState("");
  const [targetAudience, setTargetAudience] = useState(AUDIENCE_PRESETS[0]);
  const [depth, setDepth] = useState<ResearchDepth>("comprehensive");
  const [selectedLenses, setSelectedLenses] = useState<string[]>([
    "theses",
    "facts_stats",
    "contrarian",
    "case_studies",
    "chapter_seeds",
    "glossary",
  ]);
  const [specificQuestions, setSpecificQuestions] = useState("");
  const [sources, setSources] = useState<ResearchSource[]>([]);
  const [activeSourceTab, setActiveSourceTab] = useState<"link" | "file" | "youtube">("link");
  const [sourceInput, setSourceInput] = useState("");

  // Generation State
  const [loading, setLoading] = useState(false);
  const [progressStep, setProgressStep] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Viewer State
  const [activeViewerTab, setActiveViewerTab] = useState<
    "overview" | "theses" | "facts" | "contrarian" | "cases" | "chapters" | "glossary" | "markdown"
  >("overview");
  const [copied, setCopied] = useState(false);

  // Load dossiers on mount & listen for storage updates
  useEffect(() => {
    const timer = setTimeout(() => {
      setSavedDossiers(getSavedDossiers());
    }, 0);

    const handleUpdate = () => {
      setSavedDossiers(getSavedDossiers());
    };
    window.addEventListener("writerdost_dossiers_updated", handleUpdate);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("writerdost_dossiers_updated", handleUpdate);
    };
  }, []);

  // Filtered Dossiers List
  const visible = savedDossiers.filter((item) => {
    const matchesQuery =
      !query ||
      item.dossier.topic.toLowerCase().includes(query.toLowerCase()) ||
      item.dossier.executiveSummary.toLowerCase().includes(query.toLowerCase()) ||
      item.dossier.targetAudience.toLowerCase().includes(query.toLowerCase());
    const matchesDepth = depthFilter === "all" || item.dossier.depth === depthFilter;
    return matchesQuery && matchesDepth;
  });

  const totalTheses = savedDossiers.reduce((sum, d) => sum + (d.dossier.coreTheses?.length || 0), 0);
  const totalFacts = savedDossiers.reduce((sum, d) => sum + (d.dossier.factsAndStats?.length || 0), 0);

  // Source Add / Remove
  const handleAddSource = () => {
    if (!sourceInput.trim()) return;
    const newSource: ResearchSource = {
      id: `src-${Date.now()}`,
      type: activeSourceTab,
      label: sourceInput.trim(),
      value: sourceInput.trim(),
    };
    setSources([...sources, newSource]);
    setSourceInput("");
  };

  const handleRemoveSource = (id: string) => {
    setSources(sources.filter((s) => s.id !== id));
  };

  const handleApplyPreset = (preset: (typeof SAMPLE_TOPICS)[0]) => {
    setTopic(preset.topic);
    setTargetAudience(preset.audience);
    setSelectedLenses(preset.lenses);
  };

  // Run Deep Research API
  const handleRunDeepResearch = async () => {
    if (!topic.trim()) {
      setError("Please enter a research topic or central thesis.");
      return;
    }

    setError(null);
    setLoading(true);
    setProgressStep(0);

    const ticker = setInterval(() => {
      setProgressStep((prev) => (prev < RESEARCH_STEPS.length - 1 ? prev + 1 : prev));
    }, 2800);

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

      // Record credit consumption & save token metadata
      const tokensConsumed = data.usage?.total_tokens || (depth === "academic" ? 4800 : depth === "quick" ? 1500 : 3200);
      if (data.usage?.total_tokens) {
        recordUsage(data.usage.total_tokens, api.provider, api.model);
      }

      // Automatically save to persistent dossiers list (just like Projects!)
      const savedEntry = saveDossierToStorage(data.dossier, tokensConsumed);
      setSavedDossiers(getSavedDossiers());
      setSelectedDossier(savedEntry);
      setShowCreator(false);
      setNotice(`Research complete! Saved "${data.dossier.topic.slice(0, 48)}..." to your Research Library.`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred.");
    } finally {
      clearInterval(ticker);
      setLoading(false);
    }
  };

  // 1-Click Reusability: Draft Book with Research
  const handleDraftBook = (dossier: ResearchDossier) => {
    const formattedSynthesis = formatDossierSynthesis(dossier);
    const readingsSources: ResearchSource[] = (dossier.recommendedReadings || []).map((r, i) => ({
      id: `reading-${i}`,
      type: "link",
      label: r.title,
      value: `${r.title} (${r.type}): ${r.whyItMatters}`,
    }));

    updateCreateDraft({
      vision: `${dossier.topic}\n\n${formattedSynthesis}`,
      audience: dossier.targetAudience,
      researchSources: readingsSources,
    });
    router.push("/create");
  };

  // 1-Click Reusability: Expand in Rewrite Studio
  const handleUseInRewrite = (dossier: ResearchDossier) => {
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

  // 1-Click Reusability: Write Blog Post in Blog Generator
  const handleWriteBlog = (dossier: ResearchDossier, dossierId?: string) => {
    startBlogFromResearch(dossier, dossierId);
    router.push("/blog-generator");
  };

  // Delete Dossier Action
  const handleDeleteConfirm = () => {
    if (!dossierToDelete) return;
    const updated = deleteDossierFromStorage(dossierToDelete.id);
    setSavedDossiers(updated);
    if (selectedDossier?.id === dossierToDelete.id) {
      setSelectedDossier(null);
    }
    setDossierToDelete(null);
    setNotice("Research dossier deleted.");
  };

  // Copy Markdown
  const handleCopyMarkdown = (dossier: ResearchDossier) => {
    const md = buildMarkdownFromDossier(dossier);
    navigator.clipboard.writeText(md);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Download Markdown
  const handleDownloadMarkdown = (dossier: ResearchDossier) => {
    const md = buildMarkdownFromDossier(dossier);
    const slug = dossier.topic
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .slice(0, 36);
    downloadTxt(`research-dossier-${slug}.md`, md, "text/markdown");
  };

  return (
    <div className="page pb-24">
      {/* -------------------------------------------------------------
          VIEW A: FULLSCREEN / EXPANDED INTERACTIVE DOSSIER VIEWER
          ------------------------------------------------------------- */}
      {selectedDossier ? (
        <div className="space-y-4">
          {/* Top Return / Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-[var(--radius-lg)] bg-surface border border-[var(--hairline)]">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setSelectedDossier(null)}
                className="btn btn-secondary btn-sm flex items-center gap-1.5 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">arrow_back</span>
                Research Library
              </button>
              <span className="text-[12px] text-on-surface-variant font-mono">
                {selectedDossier.createdAt}
              </span>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => handleDraftBook(selectedDossier.dossier)}
                className="btn btn-primary btn-sm flex items-center gap-1.5 cursor-pointer"
                title="Populate New Ebook with this research dossier and navigate to /create"
              >
                <span className="material-symbols-outlined text-[17px]">menu_book</span>
                <span>Draft Book</span>
              </button>

              <button
                type="button"
                onClick={() => handleUseInRewrite(selectedDossier.dossier)}
                className="btn btn-secondary btn-sm flex items-center gap-1.5 cursor-pointer"
                title="Send chapter outline seeds to Rewrite Studio"
              >
                <span className="material-symbols-outlined text-[17px]">edit_note</span>
                <span>Use in Rewrite</span>
              </button>

              <button
                type="button"
                onClick={() => handleWriteBlog(selectedDossier.dossier, selectedDossier.id)}
                className="btn btn-secondary btn-sm flex items-center gap-1.5 cursor-pointer"
                title="Write a blog post grounded in this research in Blog Generator"
              >
                <span className="material-symbols-outlined text-[17px]">article</span>
                <span>Write Blog</span>
              </button>

              <button
                type="button"
                onClick={() => handleCopyMarkdown(selectedDossier.dossier)}
                className="btn btn-secondary btn-sm flex items-center gap-1 cursor-pointer"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {copied ? "check" : "content_copy"}
                </span>
                <span>{copied ? "Copied" : "Copy Markdown"}</span>
              </button>

              <button
                type="button"
                onClick={() => handleDownloadMarkdown(selectedDossier.dossier)}
                className="btn btn-secondary btn-icon btn-sm cursor-pointer"
                title="Download .md file"
              >
                <span className="material-symbols-outlined text-[18px]">download</span>
              </button>
            </div>
          </div>

          {/* Dossier Header Info */}
          <div className="panel panel-pad space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="chip chip-neutral uppercase tracking-wider text-[10px] font-bold">
                {selectedDossier.dossier.depth}
              </span>
              <span className="text-[12px] text-on-surface-variant font-medium">
                Audience: <strong className="text-on-surface">{selectedDossier.dossier.targetAudience}</strong>
              </span>
              <span className="text-[12px] text-on-surface-variant">·</span>
              <span className="text-[11px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                <CoinsIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                <span>~{calculateDossierCredits(selectedDossier)} credits used • Free with BYOK</span>
              </span>
            </div>
            <h1 className="text-[20px] sm:text-[24px] font-bold text-on-surface leading-tight">
              {selectedDossier.dossier.topic}
            </h1>
          </div>

          {/* Navigation Tabs */}
          <div className="flex items-center gap-1 border-b border-[var(--hairline)] overflow-x-auto pb-px">
            {[
              { id: "overview", label: "Overview & Summary", icon: "subject" },
              {
                id: "theses",
                label: `Core Theses (${selectedDossier.dossier.coreTheses?.length || 0})`,
                icon: "psychology",
              },
              {
                id: "facts",
                label: `Facts & Stats (${selectedDossier.dossier.factsAndStats?.length || 0})`,
                icon: "analytics",
              },
              {
                id: "contrarian",
                label: `Contrarian (${selectedDossier.dossier.contrarianAngles?.length || 0})`,
                icon: "bolt",
              },
              {
                id: "cases",
                label: `Case Studies (${selectedDossier.dossier.caseStudies?.length || 0})`,
                icon: "history_edu",
              },
              {
                id: "chapters",
                label: `Chapter Seeds (${selectedDossier.dossier.chapterSeeds?.length || 0})`,
                icon: "account_tree",
              },
              {
                id: "glossary",
                label: `Lexicon (${selectedDossier.dossier.glossary?.length || 0})`,
                icon: "dictionary",
              },
              { id: "markdown", label: "Raw Markdown", icon: "code" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setActiveViewerTab(tab.id as typeof activeViewerTab)}
                className={clsx(
                  "px-3.5 py-2 text-[12px] font-medium whitespace-nowrap border-b-2 flex items-center gap-1.5 transition-colors cursor-pointer",
                  activeViewerTab === tab.id
                    ? "border-primary text-primary font-bold"
                    : "border-transparent text-on-surface-variant hover:text-on-surface"
                )}
              >
                <span className="material-symbols-outlined text-[16px]">{tab.icon}</span>
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content Display */}
          <div className="panel panel-pad min-h-[400px]">
            {activeViewerTab === "overview" && (
              <div className="space-y-6">
                <div>
                  <h3 className="text-[14px] font-bold uppercase tracking-wider text-primary mb-2 flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-[18px]">verified</span>
                    Executive Summary
                  </h3>
                  <p className="text-[14.5px] text-on-surface leading-relaxed whitespace-pre-line bg-surface-container-highest/20 p-4 rounded-[var(--radius)] border border-[var(--hairline)]">
                    {selectedDossier.dossier.executiveSummary}
                  </p>
                </div>

                {selectedDossier.dossier.authorNotes?.length > 0 && (
                  <div>
                    <h4 className="text-[12.5px] font-bold text-on-surface mb-2">Editorial Directives</h4>
                    <ul className="space-y-1.5">
                      {selectedDossier.dossier.authorNotes.map((note, idx) => (
                        <li key={idx} className="text-[13px] text-on-surface-variant flex items-start gap-2">
                          <span className="text-primary font-bold">›</span>
                          <span>{note}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}

                {selectedDossier.dossier.recommendedReadings?.length > 0 && (
                  <div>
                    <h4 className="text-[12.5px] font-bold text-on-surface mb-2">Recommended Literature</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {selectedDossier.dossier.recommendedReadings.map((r, idx) => (
                        <div key={idx} className="p-3 rounded-[var(--radius)] bg-surface-variant/20 border border-[var(--hairline)]">
                          <div className="flex items-center justify-between text-xs font-semibold text-on-surface">
                            <span>{r.title}</span>
                            <span className="chip chip-neutral text-[9px] py-0 px-1">{r.type}</span>
                          </div>
                          <p className="text-[11.5px] text-on-surface-variant mt-1">{r.whyItMatters}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {activeViewerTab === "theses" && (
              <div className="space-y-4">
                <p className="text-[12px] text-on-surface-variant">
                  Core mental models and central hypotheses that drive the narrative argument of each chapter.
                </p>
                <div className="space-y-3">
                  {selectedDossier.dossier.coreTheses.map((thesis, idx) => (
                    <div key={idx} className="p-4 rounded-[var(--radius)] bg-surface border border-[var(--hairline)] space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center">
                          {idx + 1}
                        </span>
                        <h4 className="text-[15px] font-bold text-on-surface">{thesis.title}</h4>
                      </div>
                      <p className="text-[13px] text-on-surface-variant leading-relaxed pl-8">
                        {thesis.explanation}
                      </p>
                      <div className="mt-2 pl-8 pt-2 border-t border-[var(--hairline)] flex items-center gap-2 text-[12px] text-primary">
                        <span className="material-symbols-outlined text-[16px]">lightbulb</span>
                        <span>
                          <strong>Author Takeaway:</strong> {thesis.takeaway}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeViewerTab === "facts" && (
              <div className="space-y-4">
                <p className="text-[12px] text-on-surface-variant">
                  Hard numerical benchmarks, laboratory citations, and empirical studies to establish authority.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedDossier.dossier.factsAndStats.map((fact, idx) => (
                    <div key={idx} className="p-4 rounded-[var(--radius)] bg-surface border border-[var(--hairline)] flex flex-col justify-between space-y-3">
                      <div>
                        <span className="text-[20px] font-extrabold text-amber-600 dark:text-amber-400 font-mono">
                          {fact.stat}
                        </span>
                        <p className="text-[13px] text-on-surface mt-1 leading-snug">{fact.context}</p>
                      </div>
                      <div className="pt-2 border-t border-[var(--hairline)] text-[11px] space-y-1">
                        <div className="text-on-surface-variant font-mono truncate">
                          Citation: {fact.citation}
                        </div>
                        <div className="text-primary font-medium">Relevance: {fact.relevance}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeViewerTab === "contrarian" && (
              <div className="space-y-4">
                <p className="text-[12px] text-on-surface-variant">
                  Counter-intuitive hooks that challenge industry dogmas and hook readers in introductions.
                </p>
                <div className="space-y-3">
                  {selectedDossier.dossier.contrarianAngles.map((c, idx) => (
                    <div key={idx} className="p-4 rounded-[var(--radius)] bg-surface border border-[var(--hairline)] space-y-2">
                      <h4 className="text-[14.5px] font-bold text-on-surface flex items-center gap-2">
                        <span className="material-symbols-outlined text-[18px] text-amber-500">bolt</span>
                        {c.angle}
                      </h4>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[12.5px] mt-2">
                        <div className="p-2.5 rounded bg-surface-variant/20 border border-outline-variant/10">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 block">
                            Conventional Belief
                          </span>
                          <span className="text-on-surface-variant mt-0.5 block">{c.conventionalView}</span>
                        </div>
                        <div className="p-2.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
                            Counter-Intuitive Truth
                          </span>
                          <span className="text-emerald-700 dark:text-emerald-300 font-medium mt-0.5 block">
                            {c.counterIntuitiveTruth}
                          </span>
                        </div>
                      </div>
                      <p className="text-[12px] italic text-primary/90 mt-2">
                        <strong>Narrative Hook:</strong> &ldquo;{c.narrativeHook}&rdquo;
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeViewerTab === "cases" && (
              <div className="space-y-4">
                <p className="text-[12px] text-on-surface-variant">
                  Story-driven precedents and case studies to humanize complex technical frameworks.
                </p>
                <div className="space-y-3">
                  {selectedDossier.dossier.caseStudies.map((cs, idx) => (
                    <div key={idx} className="p-4 rounded-[var(--radius)] bg-surface border border-[var(--hairline)] space-y-2">
                      <div className="flex items-center justify-between">
                        <h4 className="text-[14.5px] font-bold text-on-surface">{cs.title}</h4>
                        <span className="chip chip-neutral text-[10px]">{cs.subject}</span>
                      </div>
                      <p className="text-[13px] text-on-surface-variant leading-relaxed">{cs.storySummary}</p>
                      <div className="p-2 rounded bg-surface-variant/20 border border-[var(--hairline)] text-[12px] text-primary flex items-center gap-2">
                        <span className="material-symbols-outlined text-[16px]">psychology</span>
                        <span>
                          <strong>Core Lesson:</strong> {cs.keyLesson}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeViewerTab === "chapters" && (
              <div className="space-y-4">
                <p className="text-[12px] text-on-surface-variant">
                  Proposed narrative progression structured from introductory hooks to tactical playbooks.
                </p>
                <div className="space-y-3">
                  {selectedDossier.dossier.chapterSeeds.map((ch) => (
                    <div key={ch.chapterNumber} className="p-4 rounded-[var(--radius)] bg-surface border border-[var(--hairline)] space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded bg-primary/10 text-primary text-[11px] font-bold font-mono">
                          Chapter {ch.chapterNumber}
                        </span>
                        <h4 className="text-[14.5px] font-bold text-on-surface">{ch.title}</h4>
                      </div>
                      <p className="text-[12.5px] italic text-on-surface-variant">
                        <strong>Hook:</strong> &ldquo;{ch.hook}&rdquo;
                      </p>
                      <ul className="space-y-1 text-[12.5px] text-on-surface-variant list-disc pl-5">
                        {ch.keyPoints.map((kp, kIdx) => (
                          <li key={kIdx}>{kp}</li>
                        ))}
                      </ul>
                      <div className="text-[11px] text-on-surface-variant pt-2 border-t border-[var(--hairline)]">
                        <strong>Research Angle:</strong> {ch.researchAngle}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeViewerTab === "glossary" && (
              <div className="space-y-4">
                <p className="text-[12px] text-on-surface-variant">
                  High-leverage domain terms to elevate intellectual authority and establish vocabulary standards.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {selectedDossier.dossier.glossary.map((g, idx) => (
                    <div key={idx} className="p-3.5 rounded-[var(--radius)] bg-surface border border-[var(--hairline)] space-y-1">
                      <h4 className="text-[13.5px] font-bold text-on-surface">{g.term}</h4>
                      <p className="text-[12.5px] text-on-surface-variant">{g.definition}</p>
                      <p className="text-[11px] text-primary italic pt-1">Tip: {g.usageTip}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeViewerTab === "markdown" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-on-surface-variant font-mono">
                    Markdown Format · Ready for Obsidian, Notion, or LLM System Prompts
                  </span>
                  <button
                    type="button"
                    onClick={() => handleCopyMarkdown(selectedDossier.dossier)}
                    className="btn btn-secondary btn-sm flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">
                      {copied ? "check" : "content_copy"}
                    </span>
                    <span>{copied ? "Copied" : "Copy"}</span>
                  </button>
                </div>
                <textarea
                  readOnly
                  value={buildMarkdownFromDossier(selectedDossier.dossier)}
                  className="input font-mono text-xs w-full h-[480px] p-4 bg-surface-container-lowest"
                />
              </div>
            )}
          </div>
        </div>
      ) : (
        /* -------------------------------------------------------------
           VIEW B: RESEARCH LIBRARY TABLE (JUST LIKE PROJECTS PAGE!)
           ------------------------------------------------------------- */
        <div className="space-y-4">
          {/* Page Head */}
          <div className="page-head">
            <div>
              <h1 className="page-title flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[28px]">travel_explore</span>
                Research Dossiers
              </h1>
              <p className="page-sub">
                {savedDossiers.length} dossier{savedDossiers.length === 1 ? "" : "s"} · {totalTheses} core theses & {totalFacts} verified citations · Ready for 1-click book drafting & rewriting
              </p>
            </div>
            <button
              onClick={() => setShowCreator(true)}
              className="btn btn-primary btn-lg flex items-center gap-1.5 cursor-pointer"
              type="button"
            >
              <span className="material-symbols-outlined">add</span>
              Deep Research
            </button>
          </div>

          {notice && (
            <div
              role="status"
              className="px-3.5 py-2.5 rounded-[var(--radius)] bg-emerald-500/10 border border-emerald-500/25 text-[12.5px] text-emerald-700 dark:text-emerald-400 flex items-center justify-between"
            >
              <span>{notice}</span>
              <button
                type="button"
                onClick={() => setNotice("")}
                className="text-emerald-700 dark:text-emerald-400 hover:opacity-80 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Search & Filter Bar (Matching Projects Page) */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="relative flex-1 min-w-[14rem] max-w-sm">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant pointer-events-none">
                search
              </span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search research dossiers..."
                aria-label="Search research dossiers"
                className="input pl-8"
              />
            </div>

            <select
              value={depthFilter}
              onChange={(e) => setDepthFilter(e.target.value)}
              aria-label="Filter by depth"
              className="select w-auto min-w-[9rem]"
            >
              <option value="all">All depths</option>
              <option value="quick">Quick (~600w)</option>
              <option value="comprehensive">Comprehensive (~1.5kw)</option>
              <option value="academic">Academic (~2.5kw)</option>
            </select>

            {(query || depthFilter !== "all") && (
              <span className="row-meta">
                {visible.length} of {savedDossiers.length}
              </span>
            )}
          </div>

          {/* Table / List Container (Matching Projects Page Table) */}
          <div className="panel overflow-hidden">
            <div className="overflow-x-auto">
              {/* Table Header Row */}
              <div className="hidden md:flex items-center gap-4 h-9 px-3.5 border-b border-[var(--hairline)] bg-on-surface/[0.02] text-[11px] font-semibold text-on-surface-variant min-w-[880px]">
                <span className="flex-1 min-w-[200px]">Topic & Synthesis</span>
                <span className="w-24 shrink-0">Depth</span>
                <span className="w-12 shrink-0 text-center">Theses</span>
                <span className="w-12 shrink-0 text-center">Stats</span>
                <span className="w-14 shrink-0 text-center">Chapters</span>
                <span className="w-24 shrink-0 text-right flex items-center justify-end gap-1.5" title="Estimated credits deducted">
                  <CoinsIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                  <span className="text-[10px] font-semibold uppercase tracking-wider text-on-surface-variant">Credits</span>
                </span>
                <span className="w-56 shrink-0 text-right pr-2">Actions</span>
              </div>

            {visible.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <p className="text-[13.5px] text-on-surface-variant">
                  {savedDossiers.length === 0
                    ? "No research dossiers yet. Click Deep Research to investigate your first topic."
                    : "No research dossiers match your search filter."}
                </p>
                {savedDossiers.length === 0 && (
                  <button
                    type="button"
                    onClick={() => setShowCreator(true)}
                    className="btn btn-primary btn-sm inline-flex items-center gap-1.5 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[16px]">travel_explore</span>
                    Start Deep Research
                  </button>
                )}
              </div>
            ) : (
              visible.map((entry) => {
                const { id, createdAt, dossier: d } = entry;
                return (
                  <div
                    key={id}
                    className="row px-3.5 py-3 gap-4 border-b border-[var(--hairline)] last:border-0 hover:bg-surface-variant/20 transition-colors min-w-[880px]"
                  >
                    {/* Title & Preview (Clickable to open viewer) */}
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedDossier(entry);
                        setActiveViewerTab("overview");
                      }}
                      className="flex-1 min-w-[200px] text-left cursor-pointer group py-1"
                    >
                      <div className="flex items-center gap-2">
                        <span className="row-title font-bold group-hover:text-primary transition-colors truncate">
                          {d.topic}
                        </span>
                        <span className="chip chip-neutral md:hidden text-[9px] uppercase">
                          {d.depth}
                        </span>
                      </div>
                      <p className="text-[12px] text-on-surface-variant line-clamp-1 mt-0.5">
                        {d.executiveSummary}
                      </p>
                      <div className="row-meta text-[11px] mt-1 flex items-center gap-2 flex-wrap">
                        <span>Audience: {d.targetAudience}</span>
                        <span>·</span>
                        <span>{createdAt}</span>
                      </div>
                    </button>

                    {/* Depth Chip */}
                    <span className="w-24 shrink-0 hidden md:flex items-center">
                      <span className="chip chip-neutral text-[10px] uppercase font-bold">
                        {d.depth}
                      </span>
                    </span>

                    {/* Counts */}
                    <span className="w-12 shrink-0 row-meta text-center hidden md:block font-mono">
                      {d.coreTheses?.length || 0}
                    </span>
                    <span className="w-12 shrink-0 row-meta text-center hidden md:block font-mono">
                      {d.factsAndStats?.length || 0}
                    </span>
                    <span className="w-14 shrink-0 row-meta text-center hidden md:block font-mono">
                      {d.chapterSeeds?.length || 0}
                    </span>

                    {/* Credits */}
                    <span className="w-24 shrink-0 row-meta text-right hidden md:block">
                      <span
                        className="text-amber-600 dark:text-amber-400 font-medium inline-flex items-center justify-end gap-1 px-2 py-0.5 rounded-md bg-amber-500/10 border border-amber-500/20 font-mono text-[11px]"
                        title={`Dossier generation: ~${calculateDossierCredits(entry)} credits`}
                      >
                        <CoinsIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                        <span>~{calculateDossierCredits(entry)}</span>
                      </span>
                    </span>

                    {/* 1-Click Action Buttons */}
                    <span className="w-56 shrink-0 flex items-center justify-end gap-1.5">
                      {/* Draft Book Button */}
                      <button
                        type="button"
                        onClick={() => handleDraftBook(d)}
                        className="btn btn-primary btn-sm !px-2.5 !py-1 text-[11px] flex items-center gap-1 cursor-pointer shrink-0 shadow-sm"
                        title="Draft Book from this Research: populates New Ebook with this dossier and navigates to /create"
                      >
                        <span className="material-symbols-outlined text-[15px]">menu_book</span>
                        <span className="hidden xl:inline">Draft</span>
                      </button>

                      {/* Use in Rewrite Button */}
                      <button
                        type="button"
                        onClick={() => handleUseInRewrite(d)}
                        className="btn btn-secondary btn-icon btn-sm cursor-pointer shrink-0"
                        title="Use in Rewrite Studio: transfers chapter seeds to /rewrite"
                      >
                        <span className="material-symbols-outlined text-[17px]">edit_note</span>
                      </button>

                      {/* Write Blog Post Button */}
                      <button
                        type="button"
                        onClick={() => handleWriteBlog(d, entry.id)}
                        className="btn btn-secondary btn-icon btn-sm cursor-pointer shrink-0"
                        title="Write Blog Post: starts a blog draft from this research"
                      >
                        <span className="material-symbols-outlined text-[17px]">article</span>
                      </button>

                      {/* View Dossier Button */}
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedDossier(entry);
                          setActiveViewerTab("overview");
                        }}
                        className="btn btn-ghost btn-icon btn-sm cursor-pointer shrink-0"
                        title="View Full Dossier"
                      >
                        <span className="material-symbols-outlined text-[17px]">visibility</span>
                      </button>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={() => setDossierToDelete(entry)}
                        className="btn btn-ghost btn-icon btn-sm text-rose-500 hover:bg-rose-500/10 cursor-pointer shrink-0"
                        title="Delete Dossier"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </span>
                  </div>
                );
              })
            )}
            </div>
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL: DEEP RESEARCH CREATOR WORKBENCH
          ------------------------------------------------------------- */}
      {showCreator && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="panel max-w-3xl w-full my-8 p-5 sm:p-6 space-y-5 bg-surface border border-[var(--hairline)] shadow-2xl rounded-[var(--radius-lg)]">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--hairline)] pb-3">
              <div>
                <h2 className="text-[18px] font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[22px]">travel_explore</span>
                  Deep Research Workbench
                </h2>
                <p className="text-[12px] text-on-surface-variant mt-0.5">
                  Multi-lens editorial inquiry with empirical facts, counter-intuitive angles, and chapter blueprints.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  if (!loading) setShowCreator(false);
                }}
                className="btn btn-ghost btn-icon btn-sm text-slate-400 hover:text-on-surface cursor-pointer"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 rounded-[var(--radius)] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                <span className="material-symbols-outlined text-[16px]">error</span>
                <span>{error}</span>
              </div>
            )}

            {loading ? (
              <div className="py-12 px-4 text-center space-y-4">
                <div className="inline-flex p-4 rounded-full bg-primary/10 text-primary animate-pulse">
                  <span className="material-symbols-outlined text-[32px]">travel_explore</span>
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-on-surface">Running Deep Research...</h3>
                  <p className="text-[12px] text-primary font-medium mt-1">
                    {RESEARCH_STEPS[progressStep]}
                  </p>
                </div>
                <div className="w-full max-w-xs mx-auto h-1.5 rounded-full bg-surface-variant/40 overflow-hidden">
                  <div
                    className="h-full bg-primary transition-all duration-700 ease-out"
                    style={{ width: `${((progressStep + 1) / RESEARCH_STEPS.length) * 100}%` }}
                  />
                </div>
                <p className="text-[11px] text-on-surface-variant">
                  Investigating academic citations, contrarian angles, and chapter blueprints...
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {/* Sample Topic Presets */}
                <div>
                  <label className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1.5">
                    Quick Sample Presets
                  </label>
                  <div className="flex flex-wrap gap-1.5">
                    {SAMPLE_TOPICS.map((preset) => (
                      <button
                        key={preset.title}
                        type="button"
                        onClick={() => handleApplyPreset(preset)}
                        className="px-2.5 py-1 rounded-[var(--radius)] bg-surface-variant/30 hover:bg-primary/10 hover:text-primary border border-[var(--hairline)] text-[11.5px] text-on-surface transition-colors cursor-pointer"
                      >
                        {preset.title}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Topic / Central Thesis */}
                <div>
                  <label htmlFor="topic-input" className="label">
                    Research Topic or Central Book Thesis <span className="text-primary">*</span>
                  </label>
                  <textarea
                    id="topic-input"
                    rows={3}
                    value={topic}
                    onChange={(e) => setTopic(e.target.value)}
                    placeholder="e.g. The Neurobiology of Deep Work: How dopamine receptors and prefrontal cortex exhaustion dictate modern cognitive stamina..."
                    className="input w-full resize-none text-[13px]"
                  />
                </div>

                {/* Target Audience & Depth Tier */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="audience-input" className="label">
                      Target Audience
                    </label>
                    <input
                      id="audience-input"
                      type="text"
                      value={targetAudience}
                      onChange={(e) => setTargetAudience(e.target.value)}
                      placeholder="e.g. Knowledge workers, early founders..."
                      className="input w-full text-[13px]"
                    />
                  </div>

                  <div>
                    <label className="label">Research Depth</label>
                    <div className="grid grid-cols-3 gap-1">
                      {[
                        { id: "quick", label: "Quick", sub: "~600w" },
                        { id: "comprehensive", label: "Deep", sub: "~1.5k w" },
                        { id: "academic", label: "Academic", sub: "~2.5k w" },
                      ].map((tier) => (
                        <button
                          key={tier.id}
                          type="button"
                          onClick={() => setDepth(tier.id as ResearchDepth)}
                          className={clsx(
                            "py-1.5 px-2 rounded-[var(--radius)] text-center border text-xs transition-colors cursor-pointer",
                            depth === tier.id
                              ? "bg-primary/10 border-primary text-primary font-bold"
                              : "bg-surface border-[var(--hairline)] text-on-surface-variant hover:text-on-surface"
                          )}
                        >
                          <div className="font-semibold">{tier.label}</div>
                          <div className="text-[10px] opacity-75">{tier.sub}</div>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>

                {/* 6 Research Lenses */}
                <div>
                  <label className="label">Investigation Lenses</label>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {LENS_OPTIONS.map((lens) => {
                      const selected = selectedLenses.includes(lens.id);
                      return (
                        <button
                          key={lens.id}
                          type="button"
                          onClick={() => {
                            if (selected) {
                              if (selectedLenses.length > 1) {
                                setSelectedLenses(selectedLenses.filter((id) => id !== lens.id));
                              }
                            } else {
                              setSelectedLenses([...selectedLenses, lens.id]);
                            }
                          }}
                          className={clsx(
                            "p-2.5 rounded-[var(--radius)] border text-left flex items-start gap-2 transition-colors cursor-pointer",
                            selected
                              ? "bg-primary/10 border-primary/40 text-on-surface"
                              : "bg-surface-variant/20 border-[var(--hairline)] text-on-surface-variant hover:text-on-surface"
                          )}
                        >
                          <span
                            className={clsx(
                              "material-symbols-outlined text-[18px] shrink-0 mt-0.5",
                              selected ? "text-primary" : "text-slate-400"
                            )}
                          >
                            {lens.icon}
                          </span>
                          <div className="min-w-0">
                            <div className="text-[12px] font-bold leading-tight">{lens.label}</div>
                            <div className="text-[10.5px] text-on-surface-variant line-clamp-1 mt-0.5">
                              {lens.desc}
                            </div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Optional Grounding Sources */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="label !mb-0">Grounding Sources (Optional)</label>
                    <span className="text-[11px] text-on-surface-variant">
                      {sources.length} source{sources.length === 1 ? "" : "s"} attached
                    </span>
                  </div>

                  <div className="flex items-center gap-1 mb-2">
                    {(["link", "youtube", "file"] as const).map((tab) => (
                      <button
                        key={tab}
                        type="button"
                        onClick={() => setActiveSourceTab(tab)}
                        className={clsx(
                          "px-2.5 py-1 rounded text-[11px] font-medium capitalize transition-colors cursor-pointer",
                          activeSourceTab === tab
                            ? "bg-primary text-on-primary font-bold"
                            : "bg-surface-variant/30 text-on-surface-variant hover:text-on-surface"
                        )}
                      >
                        {tab === "link"
                          ? "Web Article"
                          : tab === "youtube"
                          ? "YouTube URL"
                          : "Reference File"}
                      </button>
                    ))}
                  </div>

                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={sourceInput}
                      onChange={(e) => setSourceInput(e.target.value)}
                      placeholder={
                        activeSourceTab === "link"
                          ? "https://example.com/article"
                          : activeSourceTab === "youtube"
                          ? "https://youtube.com/watch?v=..."
                          : "File reference or filename..."
                      }
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddSource();
                        }
                      }}
                      className="input flex-1 text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleAddSource}
                      className="btn btn-secondary btn-sm cursor-pointer"
                    >
                      Attach
                    </button>
                  </div>

                  {sources.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {sources.map((s) => (
                        <span
                          key={s.id}
                          className="chip chip-neutral text-[11px] py-0.5 px-2 flex items-center gap-1.5"
                        >
                          <span className="truncate max-w-[200px]">{s.label}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveSource(s.id)}
                            className="hover:text-rose-500 font-bold cursor-pointer"
                          >
                            ×
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Specific Questions Input */}
                <div>
                  <label htmlFor="questions-input" className="label">
                    Specific Questions to Answer (Optional)
                  </label>
                  <input
                    id="questions-input"
                    type="text"
                    value={specificQuestions}
                    onChange={(e) => setSpecificQuestions(e.target.value)}
                    placeholder="e.g. What is the latest empirical study on myelination? What are common myths about willpower?"
                    className="input w-full text-xs"
                  />
                </div>

                {/* Footer Buttons */}
                <div className="flex items-center justify-between pt-3 border-t border-[var(--hairline)]">
                  <span className="text-[11.5px] text-amber-600 dark:text-amber-400 font-medium flex items-center gap-1">
                    <CoinsIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    ~{getDisplayedResearchCreditEstimate(depth)} approx. credits • Free with BYOK
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setShowCreator(false)}
                      className="btn btn-secondary btn-sm cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleRunDeepResearch}
                      className="btn btn-primary btn-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[16px]">travel_explore</span>
                      <span>Run Deep Research</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* -------------------------------------------------------------
          MODAL: CONFIRM DELETE
          ------------------------------------------------------------- */}
      {dossierToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="panel max-w-md w-full p-5 space-y-4 bg-surface border border-[var(--hairline)] shadow-xl rounded-[var(--radius-lg)]">
            <h3 className="text-[16px] font-bold text-on-surface">Delete Research Dossier?</h3>
            <p className="text-[13px] text-on-surface-variant leading-relaxed">
              Are you sure you want to delete the research dossier for{" "}
              <strong>&ldquo;{dossierToDelete.dossier.topic}&rdquo;</strong>? This action cannot be undone.
            </p>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDossierToDelete(null)}
                className="btn btn-secondary btn-sm cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleDeleteConfirm}
                className="btn btn-primary btn-sm !bg-rose-600 hover:!bg-rose-700 !border-rose-600 cursor-pointer"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
