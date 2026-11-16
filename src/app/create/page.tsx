"use client";

import { ChangeEvent, useRef, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/lib/app-store";
import { apiFetch } from "@/lib/api-client";
import { robustParseJson, STREAM_DELIMITER } from "@/lib/app-utils";

import { TONES, TONE_GUIDE } from "@/lib/tone-standards";
import { LANGUAGE_GROUPS, DEFAULT_LANGUAGE } from "@/lib/languages";
import { AiEngineSelectorModal } from "@/components/AiEngineSelectorModal";
import type { GenerationEngine } from "@/lib/store-types";
import { AD_EBOOK_TEMPLATES } from "@/lib/ad-ebook-templates";
import { getDisplayedCreditEstimate } from "@/lib/store-types";
import {
  getSavedDossiers,
  formatDossierSynthesis,
  type SavedDossier,
} from "@/lib/research-store";


export default function IdeaAndInput() {
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
  
  const [linkInput, setLinkInput] = useState("");
  const [activeTab, setActiveTab] = useState<"file" | "link" | "youtube">("file");
  const [engineModalOpen, setEngineModalOpen] = useState(false);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [researchModalOpen, setResearchModalOpen] = useState(false);
  const [savedDossiers, setSavedDossiers] = useState<SavedDossier[]>([]);
  const [selectedNicheFilter, setSelectedNicheFilter] = useState<string>("All");
  const [isExtendedOmnibus, setIsExtendedOmnibus] = useState<boolean>(createDraft.length > 100000);

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

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
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
        setMessage(`Cannot start generation: Your wallet has 0 credits. Please top up credits or use BYOK.`);
        return;
      }
      if (currentCredits < 5) {
        setMessage(`Wallet balance too low (${currentCredits.toLocaleString()} cr available). A minimum of 5 credits is required to initiate generation. Please top up your wallet.`);
        return;
      }
    }

    if (!quota.allowed) {
      setMessage(
        quota.source === "none"
          ? `Monthly project limit reached (${quota.used}/${quota.limit}) and insufficient credits (${(quota.userCredits ?? 0).toLocaleString()} cr available). Please top up credits or use BYOK.`
          : `Monthly project limit reached on your ${quota.plan} plan. Please upgrade or top up credits.`
      );
      return;
    }

    if (engine === "bizai") {
      if (quota.source === "plan_quota") {
        recordMonthlyUsage("project");
      }
      // Note: If using credits, credits are deducted continuously per token at 1.5x during stream
    }

    startGeneration({ 
      title: "Writing your ebook",
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
      if (!reader) throw new Error("Failed to initialize agent stream.");

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
              
              // Capture Transition from Planning to Outline Architecture
              if (event.agent === "Outline Agent" && !outlineEndTime) {
                outlineEndTime = Date.now();
              }
              
              // Capture Transition from Outline to Final Assembly
              if (event.agent === "Manuscript Agent" && !draftEndTime) {
                draftEndTime = Date.now();
              }
            } else if (event.type === "log" && typeof event.message === 'string') {
              addGenerationLog({
                agent: String(event.agent || "System"),
                message: event.message,
                status: event.status || "success",
              });
              
              // Final assembly marker
              if (event.agent === "Manuscript Agent" && (event.message.includes("assembled") || event.message.includes("complete"))) {
                draftEndTime = Date.now();
              }

              // Refined progress estimation for Master Architect (Parallel & Sequential)
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
              const usageRes = useAppStore.getState().recordUsage(event.tokens, api.provider, api.model);
              if (engine === "bizai" && !usageRes.allowed) {
                controller.abort();
                setActiveAgent("Wallet Guard");
                addGenerationLog({
                  agent: "Wallet Guard",
                  message: `⚠️ Generation halted: Credit balance exhausted (0 credits remaining). Live deduction: ${usageRes.creditsDeducted.toLocaleString()} cr. Please top up credits to resume.`,
                  status: "error",
                });
                setMessage("Generation halted: Your credit balance ran out during drafting. Please top up your wallet to continue.");
                break;
              }
            } else if (event.type === "final" && event.project) {
              setActiveAgent("System");
              setGenerationProgress(100);
              
              // Finalize and record timings
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
              });
              // Small delay to let user see 100%
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
            <h1 className="page-title">New ebook</h1>
            <p className="page-sub">
              Describe the book once. Quick draft creates the project immediately; the agents research,
              plan and write the chapters for you.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 w-full sm:w-auto">
            <button
              className="btn btn-secondary btn-lg w-full sm:w-auto justify-center min-h-[44px] border-primary/40 hover:border-primary text-primary hover:bg-primary/5 flex items-center gap-1.5 cursor-pointer"
              onClick={() => {
                setSavedDossiers(getSavedDossiers());
                setResearchModalOpen(true);
              }}
              disabled={isGenerating}
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">travel_explore</span>
              Import Research ({savedDossiers.length})
            </button>
            <button
              className="btn btn-secondary btn-lg w-full sm:w-auto justify-center min-h-[44px] border-primary/40 hover:border-primary text-primary hover:bg-primary/5"
              onClick={() => setTemplateModalOpen(true)}
              disabled={isGenerating}
              type="button"
            >
              <span className="material-symbols-outlined text-[20px]">auto_stories</span>
              FB Ad Micro-Ebook Templates
            </button>
            <button
              className="btn btn-secondary btn-lg w-full sm:w-auto justify-center min-h-[44px]"
              onClick={() => {
                const quota = checkQuota("project");
                if (!quota.allowed) {
                  setMessage(`Monthly project limit reached (${quota.used}/${quota.limit}) on your ${quota.plan} plan. Please upgrade to create more ebooks.`);
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
              {isGenerating ? "Running agents…" : "Generate with agents"}
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
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="vision" className="label !mb-0">
                  What is the book about?
                </label>
                {savedDossiers.length > 0 && (
                  <button
                    type="button"
                    onClick={() => {
                      setSavedDossiers(getSavedDossiers());
                      setResearchModalOpen(true);
                    }}
                    className="text-[12px] text-primary hover:underline font-semibold flex items-center gap-1 cursor-pointer"
                  >
                    <span className="material-symbols-outlined text-[15px]">travel_explore</span>
                    Use saved research ({savedDossiers.length})
                  </button>
                )}
              </div>
              <textarea
                id="vision"
                className="textarea min-h-[12rem] text-[14px] leading-relaxed p-3.5"
                placeholder="The core topic, the problem it solves, or the story you want to tell."
                value={createDraft.vision}
                onChange={(event) => updateCreateDraft({ vision: event.target.value })}
              />
              <p className="hint">The agents use this as the brief for research and chapter planning.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-stretch">
              <div className="panel panel-pad flex flex-col">
                <label htmlFor="audience" className="label">
                  Target audience
                </label>
                <input
                  id="audience"
                  className="input"
                  placeholder="Early-stage founders, high-school teachers…"
                  type="text"
                  value={createDraft.audience}
                  onChange={(event) => updateCreateDraft({ audience: event.target.value })}
                />
                <p className="hint mt-2 text-[11.5px] text-on-surface-variant leading-relaxed">
                  Defines the reading level, industry context, and framing used across every chapter.
                </p>
                <div className="mt-auto pt-3 border-t border-[var(--hairline)] flex items-center gap-1.5 text-[11px] text-on-surface-variant">
                  <span className="material-symbols-outlined text-[15px] text-primary">psychology</span>
                  <span>Directs persona & tone calibration</span>
                </div>
              </div>

              <div className="panel panel-pad flex flex-col justify-between space-y-3">
                {/* Header */}
                <div className="flex items-center justify-between gap-2">
                  <label htmlFor="length" className="label !mb-0 font-medium">
                    Target Length
                  </label>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[13px] font-bold text-on-surface num">
                      {createDraft.length.toLocaleString()} words
                    </span>
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 border border-amber-500/20 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[13px]">monetization_on</span>
                      ~{getDisplayedCreditEstimate(createDraft.length).toLocaleString()} credits
                    </span>
                  </div>
                </div>

                {/* Inline Page Calculator Pill */}
                <div className="flex items-center justify-between gap-2 px-3 py-2 rounded-[var(--radius)] bg-surface-variant/30 border border-[var(--hairline)]">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="material-symbols-outlined text-[17px] text-primary shrink-0">menu_book</span>
                    <span className="text-[12px] text-on-surface font-medium whitespace-nowrap">Equivalent Volume:</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <div className="relative flex items-center">
                      <input
                        id="page-count-input"
                        type="number"
                        min="4"
                        max={isExtendedOmnibus ? 800 : 400}
                        value={Math.round(createDraft.length / 250)}
                        onChange={(e) => {
                          const pages = Math.max(1, parseInt(e.target.value) || 1);
                          const maxAllowed = isExtendedOmnibus ? 200000 : 100000;
                          const calculatedWords = Math.min(maxAllowed, Math.max(1000, pages * 250));
                          updateCreateDraft({ length: calculatedWords });
                        }}
                        className="input !py-0.5 !px-1.5 text-xs w-16 text-center font-bold bg-surface"
                        placeholder="Pages"
                      />
                    </div>
                    <span className="text-[11.5px] text-on-surface-variant font-medium whitespace-nowrap">
                      pages <span className="opacity-60 text-[10.5px]">(250 w/p)</span>
                    </span>
                  </div>
                </div>

                {/* Slider */}
                <div className="space-y-1.5">
                  <input
                    id="length"
                    className="w-full h-1.5 bg-on-surface/12 rounded-full appearance-none cursor-pointer accent-primary"
                    max={isExtendedOmnibus ? "200000" : "100000"}
                    min="1000"
                    step="1000"
                    type="range"
                    value={createDraft.length}
                    onChange={(event) => updateCreateDraft({ length: Number(event.target.value) })}
                  />
                  <div className="flex justify-between items-center text-[10.5px] text-on-surface-variant">
                    <span>1k (~21 cr)</span>
                    <span className="text-[10px] text-slate-500">Pay-as-you-go • 0 with BYOK</span>
                    <span>{isExtendedOmnibus ? "200k (~4.2k cr)" : "100k (~2.1k cr)"}</span>
                  </div>
                </div>

                {/* Extended Omnibus Toggle Checkbox */}
                <div className="pt-2.5 border-t border-[var(--hairline)]">
                  <label className="flex items-start gap-2.5 cursor-pointer group select-none">
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
                    <div className="text-[12px] leading-tight">
                      <span className="font-semibold text-on-surface group-hover:text-primary transition-colors flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-[15px] text-amber-500">auto_stories</span>
                        Full-Length Omnibus (Unlock 2 Lakh Words)
                      </span>
                      <p className="text-[11px] text-on-surface-variant mt-0.5 leading-snug">
                        Extends slider ceiling up to 200,000 words (~800 print pages).
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>

            <div className="panel panel-pad">
              <label htmlFor="language" className="label">
                Language
              </label>
              <select
                id="language"
                className="input max-w-xs"
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
              <p className="hint">
                Every chapter, heading and outline is written in this language.
              </p>
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
                      <span className="material-symbols-outlined text-[15px]">
                        {t === "file" ? "upload_file" : t === "link" ? "link" : "smart_display"}
                      </span>
                      {t === "file" ? "File" : t === "link" ? "Link" : "YouTube"}
                    </button>
                  ))}
                </div>

                {activeTab === "file" ? (
                  <label className="flex flex-col items-center justify-center gap-1 py-4 px-3 border border-dashed border-[var(--hairline-strong)] rounded-[var(--radius)] cursor-pointer hover:border-primary/50 hover:bg-primary/[0.03] transition-colors text-center">
                    <span className="material-symbols-outlined text-[18px] text-on-surface-variant">
                      upload
                    </span>
                    <span className="text-[12.5px] font-medium text-on-surface">Add a file</span>
                    <span className="text-[11px] text-on-surface-variant">PDF, DOCX, TXT or MD</span>
                    <input className="hidden" multiple type="file" onChange={handleFileChange} />
                  </label>
                ) : (
                  <div className="flex gap-1.5">
                    <input
                      className="input"
                      aria-label={activeTab === "youtube" ? "YouTube URL" : "Website URL"}
                      placeholder={activeTab === "youtube" ? "YouTube URL" : "Website URL"}
                      type="url"
                      value={linkInput}
                      onChange={(e) => setLinkInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddLink()}
                    />
                    <button className="btn btn-secondary shrink-0" onClick={handleAddLink} type="button">
                      Add
                    </button>
                  </div>
                )}

                <div className="mt-3 space-y-1 max-h-[13rem] overflow-y-auto">
                  {(createDraft.researchSources || []).map((source) => (
                    <div
                      key={source.id}
                      className="group flex items-center gap-2 h-7 px-2 rounded-[var(--radius)] hover:bg-on-surface/[0.05] transition-colors"
                    >
                      <span
                        className={`material-symbols-outlined text-[15px] shrink-0 ${
                          source.type === "file"
                            ? "text-sky-500"
                            : source.type === "youtube"
                              ? "text-rose-500"
                              : "text-emerald-500"
                        }`}
                      >
                        {source.type === "file"
                          ? "description"
                          : source.type === "youtube"
                            ? "play_circle"
                            : "public"}
                      </span>
                      <span className="text-[12px] text-on-surface-variant truncate flex-1">
                        {source.label}
                      </span>
                      <button
                        className="opacity-70 sm:opacity-0 sm:group-hover:opacity-100 focus-visible:opacity-100 text-on-surface-variant hover:text-error transition-opacity shrink-0 p-1 min-w-[32px] min-h-[32px] flex items-center justify-center"
                        onClick={() => removeResearchSource(source.id)}
                        aria-label={`Remove ${source.label}`}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-[14px]">close</span>
                      </button>
                    </div>
                  ))}
                  {!createDraft.researchSources?.length && (
                    <p className="text-[12px] text-on-surface-variant py-2">
                      Optional. Sources ground the research agent in your own material.
                    </p>
                  )}
                </div>
              </div>
            </div>

            <button
              className="btn btn-ghost btn-sm mt-3"
              onClick={() => {
                resetCreateDraft();
                setMessage("Draft cleared.");
              }}
              type="button"
            >
              Clear draft
            </button>
          </div>
        </div>
      </div>

      <AiEngineSelectorModal
        isOpen={engineModalOpen}
        onClose={() => setEngineModalOpen(false)}
        onConfirm={executeGenerateWithAI}
        taskType="project"
        taskTitle={createDraft.vision.slice(0, 45) || "New Ebook"}
        targetWords={createDraft.length}
      />

      {/* FB Ad Low-Ticket Ebook Templates Modal */}
      {templateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="bg-surface border border-[var(--hairline)] rounded-[var(--radius-xl)] shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden">
            {/* Header */}
            <div className="p-5 border-b border-[var(--hairline)] flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[24px]">rocket_launch</span>
                  <h2 className="text-[18px] font-semibold text-on-surface">
                    FB Ads & Micro-Niche Ebook Templates
                  </h2>
                </div>
                <p className="text-[13px] text-on-surface-variant mt-1">
                  Proven blueprints modeled after viral micro-books sold directly via Facebook/Instagram Ads at ₹99 – ₹499 impulse price points.
                </p>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-sm -mr-2"
                onClick={() => setTemplateModalOpen(false)}
                aria-label="Close template modal"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>

            {/* Filter bar */}
            <div className="px-5 py-3 border-b border-[var(--hairline)] bg-surface-variant/20 flex items-center gap-1.5 flex-wrap">
              {["All", "Business & Freelancing", "Marketing & Ads", "Health & Fitness", "Productivity & Wealth", "Creator Economy"].map((niche) => (
                <button
                  key={niche}
                  type="button"
                  onClick={() => setSelectedNicheFilter(niche)}
                  className={`btn btn-xs ${
                    selectedNicheFilter === niche ? "btn-primary" : "btn-ghost"
                  }`}
                >
                  {niche}
                </button>
              ))}
            </div>

            {/* Template Grid */}
            <div className="p-5 overflow-y-auto space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {AD_EBOOK_TEMPLATES.filter(
                  (t) => selectedNicheFilter === "All" || t.niche === selectedNicheFilter
                ).map((tpl) => (
                  <div
                    key={tpl.id}
                    className="panel panel-pad flex flex-col gap-3 border border-[var(--hairline)] hover:border-primary/50 transition-all rounded-[var(--radius-lg)] group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="w-9 h-9 rounded-[var(--radius)] bg-primary/10 text-primary flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[20px]">{tpl.icon}</span>
                      </div>
                      <div className="flex items-center gap-1.5 flex-wrap justify-end">
                        <span className="chip text-[11px] font-semibold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                          {tpl.pricePoint} Ad Price
                        </span>
                        <span className="chip text-[11px] bg-on-surface/5 text-on-surface-variant">
                          {tpl.niche}
                        </span>
                      </div>
                    </div>

                    <div>
                      <h3 className="tile-name text-[15px] font-bold text-on-surface group-hover:text-primary transition-colors">
                        {tpl.name}
                      </h3>
                      <p className="text-[12px] font-medium text-primary mt-0.5">
                        {tpl.headline}
                      </p>
                      <p className="text-[12.5px] text-on-surface-variant mt-1.5 line-clamp-2">
                        {tpl.description}
                      </p>
                    </div>

                    {/* Chapters preview */}
                    <div className="bg-surface-variant/30 rounded-[var(--radius-sm)] p-2.5 space-y-1 text-[11.5px] text-on-surface-variant">
                      <span className="font-semibold text-on-surface block text-[11px] uppercase tracking-wider">
                        Included Blueprint Modules:
                      </span>
                      {tpl.chaptersPreview.slice(0, 3).map((ch, i) => (
                        <div key={i} className="flex items-center gap-1.5 truncate">
                          <span className="text-primary font-bold">•</span>
                          <span className="truncate">{ch}</span>
                        </div>
                      ))}
                      {tpl.chaptersPreview.length > 3 && (
                        <p className="text-[11px] text-primary pt-0.5 font-medium">
                          + {tpl.chaptersPreview.length - 3} more modules
                        </p>
                      )}
                    </div>

                    <div className="flex items-center justify-between text-[11.5px] text-on-surface-variant mt-auto pt-2 border-t border-[var(--hairline)]">
                      <span>Target: ~{tpl.suggestedLength.toLocaleString()} words</span>
                      <span>Tone: {tpl.tone}</span>
                    </div>

                    <button
                      className="btn btn-primary btn-sm w-full mt-1"
                      type="button"
                      onClick={() => {
                        updateCreateDraft({
                          vision: tpl.visionPrompt,
                          audience: tpl.audience,
                          length: tpl.suggestedLength,
                          tone: tpl.tone,
                        });
                        setTemplateModalOpen(false);
                        setMessage(`Loaded "${tpl.name}" template (${tpl.pricePoint} funnel format). Click "Generate with agents" to start!`);
                      }}
                    >
                      <span className="material-symbols-outlined text-[16px]">check_circle</span>
                      Use This Ebook Funnel Blueprint
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer notice */}
            <div className="p-3.5 px-5 bg-surface-variant/40 border-t border-[var(--hairline)] text-[12px] text-on-surface-variant flex items-center justify-between">
              <span>💡 Designed for instant-delivery low-ticket funnels via Meta Ads (Instamojo, Razorpay, Gumroad, Stripe).</span>
              <button
                type="button"
                className="btn btn-ghost btn-xs"
                onClick={() => setTemplateModalOpen(false)}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Research Import Modal */}
      {researchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/60 backdrop-blur-sm overflow-y-auto">
          <div className="panel max-w-3xl w-full my-8 p-5 sm:p-6 space-y-4 bg-surface border border-[var(--hairline)] shadow-2xl rounded-[var(--radius-lg)]">
            <div className="flex items-start justify-between gap-3 border-b border-[var(--hairline)] pb-3">
              <div>
                <h2 className="text-[18px] font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[22px]">travel_explore</span>
                  Import Research Dossier
                </h2>
                <p className="text-[12px] text-on-surface-variant mt-0.5">
                  Select an inquiry from your Research Lab to ground this ebook in empirical theses, facts, and citations.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setResearchModalOpen(false)}
                className="btn btn-ghost btn-icon btn-sm text-slate-400 hover:text-on-surface cursor-pointer"
              >
                ✕
              </button>
            </div>

            {savedDossiers.length === 0 ? (
              <div className="p-8 text-center space-y-3">
                <p className="text-[13px] text-on-surface-variant">
                  No research dossiers saved yet. Run Deep Research in the lab to investigate your topic.
                </p>
                <Link
                  href="/research"
                  className="btn btn-primary btn-sm inline-flex items-center gap-1.5"
                  onClick={() => setResearchModalOpen(false)}
                >
                  <span className="material-symbols-outlined text-[16px]">travel_explore</span>
                  Go to Research Lab
                </Link>
              </div>
            ) : (
              <div className="max-h-[60vh] overflow-y-auto space-y-3 pr-1">
                {savedDossiers.map((entry) => {
                  const d = entry.dossier;
                  return (
                    <div
                      key={entry.id}
                      className="p-4 rounded-[var(--radius)] bg-surface-variant/20 hover:bg-surface-variant/35 border border-[var(--hairline)] transition-all flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap mb-1">
                          <span className="chip chip-neutral text-[9px] uppercase font-bold">
                            {d.depth}
                          </span>
                          <span className="text-[11px] text-on-surface-variant font-mono">
                            {entry.createdAt}
                          </span>
                        </div>
                        <h4 className="text-[14px] font-bold text-on-surface leading-tight">
                          {d.topic}
                        </h4>
                        <p className="text-[12px] text-on-surface-variant line-clamp-2 mt-1">
                          {d.executiveSummary}
                        </p>
                        <div className="flex items-center gap-2 text-[11px] text-primary mt-1.5 flex-wrap">
                          <span>{d.coreTheses?.length || 0} theses</span>
                          <span>·</span>
                          <span>{d.factsAndStats?.length || 0} facts & stats</span>
                          <span>·</span>
                          <span>{d.chapterSeeds?.length || 0} chapters planned</span>
                          <span>·</span>
                          <span className="text-on-surface-variant">Audience: {d.targetAudience}</span>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => {
                          const formattedSynthesis = formatDossierSynthesis(d);
                          const readingsSources = (d.recommendedReadings || []).map((r, i) => ({
                            id: `rec-${i}`,
                            type: "link" as const,
                            label: r.title,
                            value: `${r.title} (${r.type}): ${r.whyItMatters}`,
                          }));
                          updateCreateDraft({
                            vision: `${d.topic}\n\n${formattedSynthesis}`,
                            audience: d.targetAudience,
                            researchSources: readingsSources,
                          });
                          setResearchModalOpen(false);
                          setMessage(`Loaded research dossier: "${d.topic}". Agents will ground your book in these insights!`);
                        }}
                        className="btn btn-primary btn-sm shrink-0 flex items-center gap-1.5 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">menu_book</span>
                        <span>Use this Research</span>
                      </button>
                    </div>
                  );
                })}
              </div>
            )}

            <div className="p-3 bg-surface-variant/30 border-t border-[var(--hairline)] rounded-[var(--radius)] text-[12px] text-on-surface-variant flex items-center justify-between">
              <span>Want to investigate a new topic or hypothesis?</span>
              <Link
                href="/research"
                className="text-primary font-bold hover:underline flex items-center gap-1"
                onClick={() => setResearchModalOpen(false)}
              >
                <span>Open Research Lab</span>
                <span>→</span>
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
