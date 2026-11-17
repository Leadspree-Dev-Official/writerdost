"use client";

import { ChangeEvent, useRef, useState, useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/lib/app-store";
import { apiFetch } from "@/lib/api-client";
import { robustParseJson, STREAM_DELIMITER } from "@/lib/app-utils";

import { TONES, TONE_GUIDE } from "@/lib/tone-standards";
import { LANGUAGE_GROUPS, DEFAULT_LANGUAGE } from "@/lib/languages";
import { AiEngineSelectorModal } from "@/components/AiEngineSelectorModal";
import type { GenerationEngine } from "@/lib/store-types";
import { BOOK_TEMPLATES, type BookTemplate } from "@/lib/book-templates";
import { getDisplayedCreditEstimate } from "@/lib/store-types";
import { CoinsIcon } from "@/components/ui/CoinsIcon";
import {
  getSavedDossiers,
  formatDossierSynthesis,
  type SavedDossier,
} from "@/lib/research-store";

export default function NewBookPage() {
  const router = useRouter();
  const createDraft = useAppStore((state) => state.createDraft);
  const api = useAppStore((state) => state.api);
  const settings = useAppStore((state) => state.settings);
  const updateCreateDraft = useAppStore((state) => state.updateCreateDraft);
  const createProjectFromDraft = useAppStore((state) => state.createProjectFromDraft);
  const addGeneratedProject = useAppStore((state) => state.addGeneratedProject);
  const resetCreateDraft = useAppStore((state) => state.resetCreateDraft);
  const addResearchSource = useAppStore((state) => state.addResearchSource);
  const removeResearchSource = useAppStore((state) => state.removeResearchSource);
  const checkQuota = useAppStore((state) => state.checkQuota);
  const recordMonthlyUsage = useAppStore((state) => state.recordMonthlyUsage);
  const preferredEngine = useAppStore((state) => state.preferredEngine);
  const isByokMode = preferredEngine === "byok" || Boolean(api.apiKey || api.provider === "ollama");

  const [linkInput, setLinkInput] = useState("");
  const [activeTab, setActiveTab] = useState<"file" | "link" | "youtube">("file");
  const [engineModalOpen, setEngineModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [researchModalOpen, setResearchModalOpen] = useState(false);
  const [savedDossiers, setSavedDossiers] = useState<SavedDossier[]>([]);
  const [researchSearchQuery, setResearchSearchQuery] = useState("");
  const [selectedGenreFilter, setSelectedGenreFilter] = useState<string>("All");
  const [isExtendedOmnibus, setIsExtendedOmnibus] = useState<boolean>(createDraft.length > 100000);

  const filteredDossiers = useMemo(() => {
    if (!researchSearchQuery.trim()) return savedDossiers;
    const q = researchSearchQuery.toLowerCase();
    return savedDossiers.filter((entry) => {
      const d = entry.dossier;
      return (
        d.topic?.toLowerCase().includes(q) ||
        d.executiveSummary?.toLowerCase().includes(q) ||
        d.targetAudience?.toLowerCase().includes(q) ||
        d.depth?.toLowerCase().includes(q) ||
        entry.createdAt?.toLowerCase().includes(q) ||
        d.coreTheses?.some(
          (t) =>
            t.title?.toLowerCase().includes(q) ||
            t.explanation?.toLowerCase().includes(q) ||
            t.takeaway?.toLowerCase().includes(q)
        ) ||
        d.factsAndStats?.some(
          (f) =>
            f.stat?.toLowerCase().includes(q) ||
            f.context?.toLowerCase().includes(q) ||
            f.citation?.toLowerCase().includes(q)
        ) ||
        d.contrarianAngles?.some(
          (a) =>
            a.angle?.toLowerCase().includes(q) ||
            a.counterIntuitiveTruth?.toLowerCase().includes(q)
        ) ||
        d.chapterSeeds?.some(
          (c) => c.title?.toLowerCase().includes(q) || c.hook?.toLowerCase().includes(q)
        )
      );
    });
  }, [savedDossiers, researchSearchQuery]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setSavedDossiers(getSavedDossiers());
    }, 0);
    return () => clearTimeout(timer);
  }, []);

  // Generation State Actions
  const startGeneration = useAppStore((state) => state.startGeneration);
  const addGenerationLog = useAppStore((state) => state.addGenerationLog);
  const setGenerationProgress = useAppStore((state) => state.setGenerationProgress);
  const finishGeneration = useAppStore((state) => state.finishGeneration);
  const setActiveAgent = useAppStore((state) => state.setActiveAgent);
  const isGenerating = useAppStore((state) => state.generationStatus.isGenerating);

  const [message, setMessage] = useState("");
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleFileUpload = (event: ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files) {
      Array.from(files).forEach((file) => {
        addResearchSource({
          type: "file",
          value: file.name,
          label: file.name,
        });
      });
    }
  };

  const handleAddLink = () => {
    if (!linkInput.trim()) return;

    const isYouTube = linkInput.includes("youtube.com") || linkInput.includes("youtu.be");
    addResearchSource({
      type: isYouTube ? "youtube" : "link",
      value: linkInput,
      label: linkInput.replace(/^https?:\/\//, "").split("/")[0],
    });
    setLinkInput("");
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      addGenerationLog({
        agent: "System",
        message: "Generation process cancelled by user.",
        status: "error",
      });
      setTimeout(() => finishGeneration(), 1000);
    }
  };

  const executeGenerateWithAI = async (engine: GenerationEngine) => {
    setEngineModalOpen(false);
    const quota = checkQuota("project", engine);

    if (engine === "bizai" && quota.source === "credits") {
      const currentCredits = quota.userCredits ?? 0;
      if (currentCredits <= 0) {
        setMessage(
          `Cannot start generation: Your wallet has 0 credits. Please top up credits or use BYOK.`
        );
        return;
      }
      if (currentCredits < 5) {
        setMessage(
          `Wallet balance too low (${currentCredits.toLocaleString()} credits available). A minimum of 5 credits is required to initiate generation. Please top up your wallet.`
        );
        return;
      }
    }

    if (!quota.allowed) {
      setMessage(
        quota.source === "none"
          ? `Monthly project limit reached (${quota.used}/${quota.limit}) and insufficient credits (${(
              quota.userCredits ?? 0
            ).toLocaleString()} credits available). Please top up credits or use BYOK.`
          : `Monthly project limit reached on your ${quota.plan} plan. Please upgrade or top up credits.`
      );
      return;
    }

    if (engine === "bizai") {
      if (quota.source === "plan_quota") {
        recordMonthlyUsage("project");
      }
    }

    startGeneration({ 
      title: "Writing your book",
      subtitle: engine === "byok"
        ? `Researching & drafting via BYOK (${api.provider.toUpperCase()} • Unlimited)`
        : "Researching, outlining and drafting via BizAI Managed Gateway."
    });
    setGenerationProgress(5);
    setActiveAgent("System");
    
    // Initialize AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;
    useAppStore.getState().setCancelGeneration(handleCancel);

    try {
      const response = await apiFetch("/api/generate-ebook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api,
          settings,
          draft: createDraft,
          engine,
        }),
        signal: controller.signal,
      });

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Failed to initialize Agent stream.");

      const decoder = new TextDecoder();
      let buffer = "";

      let outlineEndTime = 0;
      let draftEndTime = 0;
      const processStartTime = Date.now();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split(STREAM_DELIMITER);
        buffer = parts.pop() || "";

        for (const part of parts) {
          if (!part.trim()) continue;
          try {
            const event = robustParseJson(part);
            if (!event) continue;
            
            if (event.type === "active_agent" && typeof event.agent === 'string') {
              setActiveAgent(event.agent);
              
              if (event.agent === "Outline Agent" && !outlineEndTime) {
                outlineEndTime = Date.now();
              }
              if (event.agent === "Manuscript Agent" && !draftEndTime) {
                draftEndTime = Date.now();
              }
            } else if (event.type === "log" && typeof event.message === 'string') {
              addGenerationLog({
                agent: String(event.agent || "System"),
                message: event.message,
                status: event.status || "success",
              });
              
              if (event.agent === "Manuscript Agent" && (event.message.includes("assembled") || event.message.includes("complete"))) {
                draftEndTime = Date.now();
              }

              if (event.agent === "Research Agent") setGenerationProgress(15);
              if (event.agent === "Planning Agent") setGenerationProgress(30);
              if (event.agent === "Outline Agent") setGenerationProgress(45);
              if (event.agent === "Writing Agent") {
                const p = useAppStore.getState().generationStatus?.progress || 0;
                if (event.message.includes("Parallel execution enabled")) setGenerationProgress(55);
                if (event.message.includes("sequential drafting")) setGenerationProgress(50);
                if (event.message.includes("Drafting Chapter")) setGenerationProgress(Math.min(85, p + 2));
                if (event.message.includes("Completed Chapter")) setGenerationProgress(Math.min(92, p + 3));
              }
              if (event.agent === "Manuscript Agent") setGenerationProgress(98);
            } else if (event.type === "usage" && typeof event.tokens === "number") {
              const usageRes = useAppStore.getState().recordUsage(event.tokens, api.provider, api.model, engine === "byok");
              if (engine === "bizai" && !usageRes.allowed) {
                controller.abort();
                setActiveAgent("Wallet Guard");
                addGenerationLog({
                  agent: "Wallet Guard",
                  message: `⚠️ Generation halted: Credit balance exhausted (0 credits remaining). Live deduction: ${usageRes.creditsDeducted.toLocaleString()} credits. Please top up credits to resume.`,
                  status: "error",
                });
                setMessage("Generation halted: Your credit balance ran out during drafting. Please top up your wallet to continue.");
                break;
              }
            } else if (event.type === "final" && event.project) {
              setActiveAgent("System");
              setGenerationProgress(100);
              
              const finalDraftTime = draftEndTime || Date.now();
              const finalOutlineTime = outlineEndTime || finalDraftTime;
              
              const outlineDuration = Math.round((finalOutlineTime - processStartTime) / 1000);
              const draftDuration = Math.round((finalDraftTime - finalOutlineTime) / 1000);
              
              useAppStore.getState().recordTiming(outlineDuration, draftDuration, createDraft.length);
              
              const tokensUsed = useAppStore.getState().generationStatus.sessionTokens || 0;
              
              addGeneratedProject({
                ...event.project,
                outlineDuration,
                draftDuration,
                tokensUsed,
                isByok: engine === "byok",
                engine: engine,
              });
              
              setTimeout(() => {
                router.push("/editor");
              }, 1500);
            } else if (event.type === "error") {
              setActiveAgent("System");
              addGenerationLog({
                agent: "System",
                message: `Error: ${String(event.message)}`,
                status: "error",
              });
              throw new Error(String(event.message));
            }
          } catch (e) {
            console.error("Failed to parse stream event", e);
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
         return;
      }
      addGenerationLog({
        agent: "System",
        message: error instanceof Error ? error.message : "Connection lost.",
        status: "error",
      });
    } finally {
      abortControllerRef.current = null;
      const state = useAppStore.getState();
      const hasError = state.generationStatus.logs.some(l => l.status === 'error');
      if (!hasError) {
        setTimeout(() => finishGeneration(), 2000);
      }
    }
  };

  return (
    <>
      <div className="page">
        <div className="page-head">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-primary text-[22px]">menu_book</span>
              <h1 className="page-title">New Book</h1>
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Up to 300,000 Words
              </span>
            </div>
            <p className="page-sub">
              Author trade non-fiction, memoirs, technical handbooks, or multi-volume epic novels.
              Our specialized AI Agents research, outline, and write every chapter with deep narrative memory.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <button
              className="btn btn-secondary btn-lg w-full sm:w-auto justify-center min-h-[44px]"
              onClick={() => {
                setSavedDossiers(getSavedDossiers());
                setResearchSearchQuery("");
                setResearchModalOpen(true);
              }}
              disabled={isGenerating}
              type="button"
            >
              <span className="material-symbols-outlined">travel_explore</span>
              Import Research ({savedDossiers.length})
            </button>
            <button
              className="btn btn-secondary btn-lg w-full sm:w-auto justify-center min-h-[44px]"
              onClick={() => setTemplateModalOpen(true)}
              disabled={isGenerating}
              type="button"
            >
              <span className="material-symbols-outlined">library_books</span>
              Book Frameworks
            </button>
            <button
              className="btn btn-secondary btn-lg w-full sm:w-auto justify-center min-h-[44px]"
              onClick={() => {
                const quota = checkQuota("project");
                if (!quota.allowed) {
                  setMessage(
                    `Monthly project limit reached (${quota.used}/${quota.limit}) on your ${quota.plan} plan. Please upgrade to create more books.`
                  );
                  return;
                }
                const project = createProjectFromDraft();
                setMessage(`Created "${project.title}".`);
                router.push("/editor");
              }}
              type="button"
            >
              Quick draft
            </button>
            <button
              className="btn btn-primary btn-lg w-full sm:w-auto justify-center min-h-[44px]"
              onClick={() => setEngineModalOpen(true)}
              disabled={isGenerating}
              type="button"
            >
              <span className="material-symbols-outlined">auto_awesome</span>
              {isGenerating ? "Running Agents…" : "Generate with Agents"}
            </button>
          </div>
        </div>

        {message && (
          <p
            role="status"
            className="mb-4 px-3 py-2 rounded-[var(--radius)] bg-emerald-500/10 border border-emerald-500/25 text-[12.5px] text-emerald-700 dark:text-emerald-400"
          >
            {message}
          </p>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 min-w-0 space-y-4">
            <div className="panel panel-pad">
              <label htmlFor="vision" className="label">
                What is the book about?
              </label>
              <textarea
                id="vision"
                className="textarea min-h-[12rem] text-[14px] leading-relaxed p-3.5"
                placeholder="The overarching theme, core conflict, protagonists, central thesis, or domain knowledge you want to synthesize into a book."
                value={createDraft.vision}
                onChange={(event) => updateCreateDraft({ vision: event.target.value })}
              />
              <p className="hint">The Agents use this as the brief for deep research and chapter planning.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-stretch">
              <div className="panel p-3.5 sm:p-4 flex flex-col justify-between">
                <div>
                  <div className="space-y-3">
                    <div className="flex flex-col">
                      <label htmlFor="audience" className="label !mb-1 text-[12px] font-medium">
                        Target readership
                      </label>
                      <input
                        id="audience"
                        className="input !py-1.5 !px-2.5 text-xs w-full"
                        placeholder="Leaders, researchers, fantasy readers, founders…"
                        type="text"
                        value={createDraft.audience}
                        onChange={(event) => updateCreateDraft({ audience: event.target.value })}
                      />
                      <p className="hint !mt-1 text-[11px] text-on-surface-variant leading-snug">
                        Calibrates intellectual depth & narrative framing.
                      </p>
                    </div>

                    <div className="flex flex-col">
                      <label htmlFor="language" className="label !mb-1 text-[12px] font-medium">
                        Language
                      </label>
                      <select
                        id="language"
                        className="input !py-1.5 !px-2.5 text-xs w-full"
                        value={createDraft.language || DEFAULT_LANGUAGE}
                        onChange={(event) => updateCreateDraft({ language: event.target.value })}
                      >
                        {LANGUAGE_GROUPS.map((group) => (
                          <optgroup key={group.label} label={group.label}>
                            {group.options.map((language) => (
                              <option key={language} value={language}>
                                {language}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                      <p className="hint !mt-1 text-[11px] text-on-surface-variant leading-snug">
                        Language for all synthesized chapters & outline.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Target Length & Extended 300k Ceiling */}
              <div className="panel p-3.5 sm:p-4 flex flex-col justify-between space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <label htmlFor="length" className="label !mb-0 font-medium">
                      Target length
                    </label>
                    <span className="badge badge-neutral text-[10px] px-1.5 py-0.5">
                      ~{createDraft.length.toLocaleString()} words
                    </span>
                  </div>
                  <span className="text-[11px] font-bold text-primary flex items-center gap-1">
                    <CoinsIcon className="w-3 h-3" />
                    {isByokMode ? "0 (BYOK)" : `${getDisplayedCreditEstimate(createDraft.length)} est.`}
                  </span>
                </div>

                {/* Inline Page Calculator Pill */}
                <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-[var(--radius)] bg-surface-variant/30 border border-[var(--hairline)]">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <span className="material-symbols-outlined text-[15px] text-primary shrink-0">menu_book</span>
                    <span className="text-[11.5px] text-on-surface font-medium whitespace-nowrap">Equivalent Volume:</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <div className="relative flex items-center">
                      <input
                        id="page-count-input"
                        type="number"
                        min="4"
                        max={isExtendedOmnibus ? 1200 : 400}
                        value={Math.round(createDraft.length / 250)}
                        onChange={(e) => {
                          const pages = Math.max(1, parseInt(e.target.value) || 1);
                          const maxAllowed = isExtendedOmnibus ? 300000 : 100000;
                          const calculatedWords = Math.min(maxAllowed, Math.max(1000, pages * 250));
                          updateCreateDraft({ length: calculatedWords });
                        }}
                        className="input !py-0.5 !px-1 text-xs w-14 text-center font-bold bg-surface"
                        placeholder="Pages"
                      />
                    </div>
                    <span className="text-[11px] text-on-surface-variant font-medium whitespace-nowrap">
                      pages <span className="opacity-60 text-[10px]">(250 w/p)</span>
                    </span>
                  </div>
                </div>

                {/* Slider */}
                <div className="space-y-1">
                  <input
                    id="length"
                    className="w-full h-1.5 bg-on-surface/12 rounded-full appearance-none cursor-pointer accent-primary"
                    max={isExtendedOmnibus ? "300000" : "100000"}
                    min="1000"
                    step="1000"
                    type="range"
                    value={createDraft.length}
                    onChange={(event) => updateCreateDraft({ length: Number(event.target.value) })}
                  />
                  <div className="flex justify-between items-center text-[10px] text-on-surface-variant">
                    <span>1,000 words</span>
                    <span className="text-[10px] text-on-surface-variant font-medium">Pay-as-you-go • 0 with BYOK</span>
                    <span>{isExtendedOmnibus ? "300,000 words" : "100,000 words"}</span>
                  </div>
                </div>

                {/* Subtle Warning for > 275k words */}
                {createDraft.length > 275000 && (
                  <div className="flex items-start gap-2 p-2.5 rounded-[var(--radius)] bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-400 text-[11.5px] leading-relaxed animate-fadeIn">
                    <span className="material-symbols-outlined text-[16px] text-amber-500 shrink-0 mt-0.5">warning</span>
                    <div>
                      <span className="font-semibold block text-amber-800 dark:text-amber-300">
                        Not Recommended (275,000+ words)
                      </span>
                      <span>
                        Manuscripts of this volume face high generation latency and stream timeout risks. For optimal narrative coherence and reader engagement, consider splitting your book into a multi-volume series.
                      </span>
                    </div>
                  </div>
                )}

                {/* Extended Omnibus Toggle Checkbox */}
                <div className="pt-2 border-t border-[var(--hairline)]">
                  <label className="flex items-start gap-2 cursor-pointer group select-none">
                    <input
                      type="checkbox"
                      checked={isExtendedOmnibus}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setIsExtendedOmnibus(checked);
                        if (!checked && createDraft.length > 100000) {
                          updateCreateDraft({ length: 100000 });
                        }
                      }}
                      className="checkbox mt-0.5 accent-primary shrink-0"
                    />
                    <div className="text-[11.5px] leading-tight">
                      <span className="font-semibold text-on-surface group-hover:text-primary transition-colors flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[14px] text-amber-500">auto_stories</span>
                        Epic Tome / Multi-Volume Omnibus (Unlock 3 Lakh Words)
                      </span>
                      <p className="text-[10.5px] text-on-surface-variant mt-0.5 leading-snug">
                        Extends slider ceiling up to 300,000 words (~1,200 print pages).
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="panel panel-pad">
              <span className="label">Tone</span>
              <div className="flex flex-wrap gap-1.5">
                {TONES.map((tone) => (
                  <button
                    key={tone}
                    className={
                      createDraft.tone === tone
                        ? "btn btn-sm bg-primary/12 text-primary border-primary/25"
                        : "btn btn-sm btn-secondary"
                    }
                    aria-pressed={createDraft.tone === tone}
                    onClick={() => updateCreateDraft({ tone })}
                    title={`${TONE_GUIDE[tone].objective}\n\n${TONE_GUIDE[tone].execution}`}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[15px]">{TONE_GUIDE[tone].icon}</span>
                    {tone}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="min-w-0">
            <div className="panel overflow-hidden">
              <div className="panel-head">
                <span className="panel-title">Research sources</span>
                <span className="row-meta">{createDraft.researchSources?.length ?? 0}</span>
              </div>

              <div className="panel-pad">
                <div className="tabs !mb-3">
                  {(["file", "link", "youtube"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      className="tab"
                      data-active={activeTab === t}
                      onClick={() => setActiveTab(t)}
                    >
                      <span className="material-symbols-outlined text-[15px] capitalize">
                        {t === "file" ? "upload_file" : t === "link" ? "link" : "play_circle"}
                      </span>
                      {t === "youtube" ? "YouTube" : t}
                    </button>
                  ))}
                </div>

                {activeTab === "file" && (
                  <label className="dropzone !py-5 cursor-pointer block text-center">
                    <span className="material-symbols-outlined dropzone-icon !text-[24px]">cloud_upload</span>
                    <p className="dropzone-text !text-[12.5px]">Upload book research notes, outlines or drafts</p>
                    <p className="dropzone-sub !text-[11px]">PDF, DOCX, TXT, EPUB</p>
                    <input
                      type="file"
                      className="hidden"
                      multiple
                      accept=".pdf,.docx,.txt,.epub,.md"
                      onChange={handleFileUpload}
                    />
                  </label>
                )}

                {(activeTab === "link" || activeTab === "youtube") && (
                  <div className="flex gap-1.5">
                    <input
                      className="input !py-1.5 !px-2.5 text-xs flex-1"
                      placeholder={activeTab === "link" ? "https://..." : "https://youtube.com/watch?v=..."}
                      type="url"
                      value={linkInput}
                      onChange={(e) => setLinkInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          handleAddLink();
                        }
                      }}
                    />
                    <button className="btn btn-secondary btn-sm" onClick={handleAddLink} type="button">
                      Add
                    </button>
                  </div>
                )}

                <div className="mt-3 divide-y divide-[var(--hairline)]">
                  {createDraft.researchSources?.map((src) => (
                    <div key={src.id} className="flex items-center justify-between py-1.5 gap-2 text-xs">
                      <span className="truncate text-on-surface font-medium">{src.label}</span>
                      <button
                        className="btn btn-ghost btn-icon !w-6 !h-6"
                        onClick={() => removeResearchSource(src.id)}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  ))}
                  {!createDraft.researchSources?.length && (
                    <p className="text-[12px] text-on-surface-variant py-2">
                      Optional. Sources ground the Research Agent in your verified source material.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <button
              className="btn btn-ghost btn-sm mt-3"
              onClick={() => {
                resetCreateDraft();
                setMessage("Book draft cleared.");
              }}
              type="button"
            >
              Clear draft
            </button>
          </div>
        </div>
      </div>

      {/* Book Frameworks Modal */}
      {templateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-[var(--hairline-strong)] rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
            {/* Modal Header */}
            <div className="p-4 px-6 border-b border-[var(--hairline)] flex items-center justify-between bg-surface-variant/30">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[24px]">library_books</span>
                <div>
                  <h3 className="font-bold text-base text-on-surface">Book Architectural Blueprints</h3>
                  <p className="text-xs text-on-surface-variant">
                    Battle-tested macro structures for trade books, memoirs, technical handbooks, and epic novels.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => setTemplateModalOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Genre Filter Tabs */}
            <div className="px-6 py-2 border-b border-[var(--hairline)] flex items-center gap-2 overflow-x-auto bg-surface">
              {(["All", "Non-Fiction & Thought Leadership", "Epic Fiction & Sci-Fi", "Memoir & Narrative", "Technical & Educational"] as const).map(
                (genre) => (
                  <button
                    key={genre}
                    type="button"
                    onClick={() => setSelectedGenreFilter(genre)}
                    className={`px-3 py-1 rounded-full text-xs font-medium whitespace-nowrap transition-colors ${
                      selectedGenreFilter === genre
                        ? "bg-primary text-white shadow-sm"
                        : "bg-surface-variant/50 text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {genre}
                  </button>
                )
              )}
            </div>

            {/* Blueprints Grid */}
            <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {BOOK_TEMPLATES.filter(
                  (tpl) => selectedGenreFilter === "All" || tpl.genre === selectedGenreFilter
                ).map((tpl) => (
                  <div
                    key={tpl.id}
                    className="p-4 rounded-xl border border-[var(--hairline)] bg-surface hover:border-primary/50 transition-all flex flex-col justify-between group shadow-sm hover:shadow-md"
                  >
                    <div className="space-y-2">
                      <div className="flex items-start justify-between gap-2">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                          {tpl.badge}
                        </span>
                        <span className="text-[11px] font-semibold text-on-surface-variant flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">format_align_left</span>
                          ~{tpl.suggestedLength.toLocaleString()} words
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <span className="material-symbols-outlined text-primary text-[20px]">{tpl.icon}</span>
                        <h4 className="font-bold text-[14px] text-on-surface group-hover:text-primary transition-colors">
                          {tpl.name}
                        </h4>
                      </div>

                      <p className="text-xs text-on-surface font-medium leading-snug">{tpl.headline}</p>
                      <p className="text-[11.5px] text-on-surface-variant leading-relaxed line-clamp-2">
                        {tpl.description}
                      </p>

                      <div className="pt-2 border-t border-[var(--hairline)] space-y-1">
                        <span className="text-[10.5px] font-semibold text-on-surface uppercase tracking-wider block">
                          Architectural Highlights
                        </span>
                        {tpl.structureHighlights.map((highlight, idx) => (
                          <div key={idx} className="flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                            <span className="material-symbols-outlined text-emerald-500 text-[13px]">check_circle</span>
                            <span>{highlight}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <button
                      className="btn btn-primary btn-sm w-full mt-4"
                      type="button"
                      onClick={() => {
                        updateCreateDraft({
                          vision: tpl.visionPrompt,
                          audience: tpl.audience,
                          length: tpl.suggestedLength,
                          tone: tpl.tone,
                        });
                        if (tpl.suggestedLength > 100000) {
                          setIsExtendedOmnibus(true);
                        }
                        setTemplateModalOpen(false);
                        setMessage(`Loaded "${tpl.name}" framework. Click "Generate with Agents" to begin!`);
                      }}
                    >
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Use This Book Blueprint
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-3.5 px-6 bg-surface-variant/40 border-t border-[var(--hairline)] text-[12px] text-on-surface-variant flex items-center justify-between">
              <span>💡 Designed for commercial publishing, Amazon KDP Print/Kindle, and comprehensive hardcovers.</span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setTemplateModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Research Dossier Import Modal */}
      {researchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="bg-surface border border-[var(--hairline-strong)] rounded-2xl max-w-3xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-fadeIn">
            <div className="p-4 px-6 border-b border-[var(--hairline)] flex items-center justify-between bg-surface-variant/30">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-[22px]">travel_explore</span>
                <div>
                  <h3 className="font-bold text-base text-on-surface">Import Saved Research Dossier</h3>
                  <p className="text-xs text-on-surface-variant">
                    Ground this book in an existing deep research investigation from your Research Lab.
                  </p>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-icon"
                onClick={() => setResearchModalOpen(false)}
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            <div className="p-4 border-b border-[var(--hairline)] bg-surface">
              <div className="relative">
                <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[18px]">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Filter saved research topics, summaries, or citations…"
                  value={researchSearchQuery}
                  onChange={(e) => setResearchSearchQuery(e.target.value)}
                  className="input !pl-9 !py-2 text-xs w-full"
                />
              </div>
            </div>

            <div className="p-6 overflow-y-auto max-h-[50vh] space-y-3">
              {filteredDossiers.length === 0 ? (
                <div className="text-center py-10 text-on-surface-variant space-y-2">
                  <span className="material-symbols-outlined text-4xl opacity-40">find_in_page</span>
                  <p className="text-sm font-medium">No saved research dossiers match your search.</p>
                  <p className="text-xs">
                    Run a research topic in{" "}
                    <Link href="/research" className="text-primary hover:underline">
                      Workspace → Research Lab
                    </Link>{" "}
                    first.
                  </p>
                </div>
              ) : (
                filteredDossiers.map((entry) => {
                  const d = entry.dossier;
                  return (
                    <div
                      key={entry.id}
                      className="p-4 rounded-xl border border-[var(--hairline)] bg-surface hover:border-primary/40 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm hover:shadow"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-bold text-sm text-on-surface truncate">{d.topic}</h4>
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-primary/10 text-primary uppercase">
                            {d.depth || "Comprehensive"}
                          </span>
                        </div>
                        <p className="text-xs text-on-surface-variant line-clamp-2 leading-relaxed">
                          {d.executiveSummary || "Deep research synthesis."}
                        </p>
                        <div className="flex items-center gap-3 text-[11px] text-on-surface-variant pt-1">
                          <span>{entry.createdAt ? new Date(entry.createdAt).toLocaleDateString() : "Saved"}</span>
                          <span>•</span>
                          <span>{d.coreTheses?.length || 0} Core Theses</span>
                          <span>•</span>
                          <span>{d.factsAndStats?.length || 0} Stats</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        className="btn btn-primary btn-sm shrink-0"
                        onClick={() => {
                          const synthesis = formatDossierSynthesis(d);
                          addResearchSource({
                            type: "file",
                            value: synthesis,
                            label: `Research: ${d.topic}`,
                          });
                          updateCreateDraft({
                            vision: `Theme: ${d.topic}\n\nCore Thesis: ${d.executiveSummary || ""}\n\nKey Insights to Explore:\n${(
                              d.coreTheses || []
                            )
                              .map((t) => `- ${t.title}: ${t.takeaway}`)
                              .join("\n")}`,
                            audience: d.targetAudience || createDraft.audience,
                          });
                          setResearchModalOpen(false);
                          setMessage(
                            `Loaded research dossier: "${d.topic}". Agents will ground your book in these insights!`
                          );
                        }}
                      >
                        <span className="material-symbols-outlined text-[15px]">add_circle</span>
                        Import into Book
                      </button>
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-3 px-6 bg-surface-variant/40 border-t border-[var(--hairline)] flex items-center justify-between">
              <span className="text-xs text-on-surface-variant">
                Total saved in Research Lab: {savedDossiers.length}
              </span>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={() => setResearchModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AI Engine Selection Modal */}
      <AiEngineSelectorModal
        isOpen={engineModalOpen}
        onClose={() => setEngineModalOpen(false)}
        onConfirm={executeGenerateWithAI}
        taskType="project"
        taskTitle={createDraft.vision.slice(0, 45) || "New Book"}
        targetWords={createDraft.length}
      />
    </>
  );
}
