"use client";

import { ChangeEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/app-store";
import { robustParseJson, STREAM_DELIMITER } from "@/lib/app-utils";

import { TONES, TONE_GUIDE } from "@/lib/tone-standards";
import { LANGUAGE_GROUPS, DEFAULT_LANGUAGE } from "@/lib/languages";


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
  
  const [linkInput, setLinkInput] = useState("");
  const [activeTab, setActiveTab] = useState<"file" | "link" | "youtube">("file");
  
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

  const handleGenerateWithAI = async () => {
    startGeneration({ 
      title: "Writing your ebook",
      subtitle: "Researching, outlining and drafting. This usually takes a few minutes."
    });
    setGenerationProgress(5);
    setActiveAgent("System");
    
    // Initialize AbortController
    const controller = new AbortController();
    abortControllerRef.current = controller;
    useAppStore.getState().setCancelGeneration(handleCancel);

    try {
      const response = await fetch("/api/generate-ebook", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          api,
          settings,
          draft: createDraft,
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
              useAppStore.getState().recordUsage(event.tokens, api.provider, api.model);
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
          <div className="flex items-center gap-2">
            <button
              className="btn btn-secondary btn-lg"
              onClick={() => {
                const project = createProjectFromDraft();
                setMessage(`Created "${project.title}".`);
                router.push("/editor");
              }}
              type="button"
            >
              Quick draft
            </button>
            <button
              className="btn btn-primary btn-lg"
              onClick={handleGenerateWithAI}
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
              <label htmlFor="vision" className="label">
                What is the book about?
              </label>
              <textarea
                id="vision"
                className="textarea min-h-[12rem] text-[14px] leading-relaxed p-3.5"
                placeholder="The core topic, the problem it solves, or the story you want to tell."
                value={createDraft.vision}
                onChange={(event) => updateCreateDraft({ vision: event.target.value })}
              />
              <p className="hint">The agents use this as the brief for research and chapter planning.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="panel panel-pad">
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
              </div>

              <div className="panel panel-pad">
                <div className="flex items-baseline justify-between">
                  <label htmlFor="length" className="label">
                    Length
                  </label>
                  <span className="text-[12.5px] font-semibold text-on-surface num">
                    {createDraft.length.toLocaleString()} words
                  </span>
                </div>
                <input
                  id="length"
                  className="w-full h-1 mt-2 bg-on-surface/12 rounded-full appearance-none cursor-pointer accent-primary"
                  max="100000"
                  min="1000"
                  step="1000"
                  type="range"
                  value={createDraft.length}
                  onChange={(event) => updateCreateDraft({ length: Number(event.target.value) })}
                />
                <div className="flex justify-between text-[11px] text-on-surface-variant mt-1.5">
                  <span>1k</span>
                  <span>100k</span>
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
                        className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100 text-on-surface-variant hover:text-error transition-opacity shrink-0"
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
    </>
  );
}
