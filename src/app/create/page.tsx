"use client";

import { ChangeEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/app-store";
import { robustParseJson, STREAM_DELIMITER } from "@/lib/app-utils";

import { TONES, TONE_GUIDE } from "@/lib/tone-standards";

const tones = TONES;

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
      title: "Masterpiece Generation Pipeline", 
      subtitle: "Our Swarm Intelligence is architecting your eBook concept into a structured manuscript." 
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
      <div className="flex-1 p-10 max-w-5xl mx-auto w-full">
        <div className="mb-12">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-bold tracking-[0.2em] text-primary uppercase">Step 01 of 09: Concept Generation</span>
            <span className="text-[10px] font-bold tracking-[0.2em] text-on-surface-variant uppercase">
              Progress: {Math.min(95, Math.round((createDraft.vision.length / 6 + createDraft.audience.length / 3) / 2))}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-surface-container-high rounded-full overflow-hidden flex gap-1">
            <div
              className="h-full bg-gradient-to-br from-primary to-primary-container rounded-full transition-all duration-500"
              style={{ width: `${Math.min(95, Math.round((createDraft.vision.length / 6 + createDraft.audience.length / 3) / 2))}%` }}
            />
            <div className="flex-1 h-full bg-surface-container/50 rounded-full" />
          </div>
        </div>

        <div className="mb-10 text-center">
          <h2 className="text-4xl md:text-5xl font-extrabold text-on-surface tracking-tight mb-4">Start Your New Masterpiece</h2>
          <p className="text-on-surface-variant text-lg max-w-2xl mx-auto leading-relaxed">
            Define the vision once, then move directly into an editable project with working chapters, blog support, and settings tied to your profile.
          </p>
        </div>

        {message ? (
          <div className="mb-8 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 p-4 text-sm text-emerald-500">{message}</div>
        ) : null}

        <div className="grid grid-cols-12 gap-6">
          <div className="col-span-12 md:col-span-8">
            <div className="bg-surface-container-lowest rounded-xl p-8 shadow-sm h-full border border-transparent hover:border-primary/20 transition-colors">
              <label className="block text-[10px] font-bold tracking-widest text-slate-400 uppercase mb-4">The Vision</label>
              <textarea
                className="w-full bg-surface-container-low border-0 rounded-xl p-6 text-on-surface placeholder-slate-400 focus:ring-2 focus:ring-primary/20 text-lg resize-none outline-none"
                placeholder="What's your ebook about? Describe the core topic, the problems it solves, or the story you want to tell..."
                rows={8}
                value={createDraft.vision}
                onChange={(event) => updateCreateDraft({ vision: event.target.value })}
              />
            </div>
          </div>

          <div className="col-span-12 md:col-span-4">
            <div className="bg-surface-container-lowest rounded-xl p-6 shadow-sm h-full border border-transparent flex flex-col">
              <div className="flex items-center justify-between mb-4">
                <label className="text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">Research Hub</label>
                <div className="flex gap-1 bg-surface-container p-1 rounded-lg">
                  {(["file", "link", "youtube"] as const).map((t) => (
                    <button
                      key={t}
                      className={`px-4 py-2 rounded-full text-xs font-bold border transition-all ${
                        activeTab === t
                          ? "bg-primary text-white border-primary shadow-md shadow-primary/10"
                          : "bg-white dark:bg-white/[0.04] text-slate-500 dark:text-slate-400 border-slate-100 dark:border-white/[0.06] hover:border-primary/20"
                      }`}
                      onClick={() => setActiveTab(t)}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-sm">
                        {t === "file" ? "upload_file" : t === "link" ? "link" : "smart_display"}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex-1">
                {activeTab === "file" ? (
                  <label className="border-2 border-dashed border-outline-variant rounded-xl p-6 flex flex-col items-center justify-center text-center cursor-pointer hover:border-primary/40 transition-colors">
                    <span className="material-symbols-outlined text-on-surface-variant mb-2">cloud_upload</span>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase">Upload PDF, TXT, DOCX</p>
                    <input className="hidden" multiple type="file" onChange={handleFileChange} />
                  </label>
                ) : (
                  <div className="flex gap-2">
                    <input
                      className="flex-1 bg-surface-container-low border-0 rounded-lg px-3 py-2 text-xs focus:ring-1 focus:ring-primary/20 outline-none"
                      placeholder={activeTab === "youtube" ? "Paste YouTube URL..." : "Paste Website URL..."}
                      type="text"
                      value={linkInput}
                      onChange={(e) => setLinkInput(e.target.value)}
                      onKeyDown={(e) => e.key === "Enter" && handleAddLink()}
                    />
                    <button
                      className="bg-primary text-white p-2 rounded-lg hover:opacity-90 transition-opacity"
                      onClick={handleAddLink}
                      type="button"
                    >
                      <span className="material-symbols-outlined text-sm">add</span>
                    </button>
                  </div>
                )}

                <div className="mt-4 space-y-2 max-h-[180px] overflow-y-auto pr-1 thin-scrollbar">
                  {(createDraft.researchSources || []).map((source) => (
                    <div key={source.id} className="flex items-center justify-between bg-surface-container-low p-2.5 rounded-xl group animate-in fade-in slide-in-from-right-2 duration-300">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className={`material-symbols-outlined text-sm ${
                          source.type === 'file' ? 'text-blue-500' : source.type === 'youtube' ? 'text-red-500' : 'text-emerald-500'
                        }`}>
                          {source.type === "file" ? "description" : source.type === "youtube" ? "play_circle" : "public"}
                        </span>
                        <span className="text-[11px] font-medium text-on-surface-variant truncate">{source.label}</span>
                      </div>
                      <button
                        className="text-slate-300 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100"
                        onClick={() => removeResearchSource(source.id)}
                        type="button"
                      >
                        <span className="material-symbols-outlined text-xs">close</span>
                      </button>
                    </div>
                  ))}
                  {!(createDraft.researchSources?.length) && (
                    <div className="py-8 text-center">
                      <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">No sources added</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="col-span-12 md:col-span-6">
            <div className="bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-transparent">
              <label className="block text-[10px] font-bold tracking-widest text-on-surface-variant uppercase mb-4">Target Audience</label>
              <input
                className="w-full bg-white dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06] rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary/20 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 text-on-surface"
                placeholder="e.g. Early-stage startup founders, High-school teachers..."
                type="text"
                value={createDraft.audience}
                onChange={(event) => updateCreateDraft({ audience: event.target.value })}
              />
            </div>
          </div>

          <div className="col-span-12 md:col-span-6">
            <div className="bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-transparent">
              <div className="flex justify-between items-center mb-4">
                <label className="block text-[10px] font-bold tracking-widest text-on-surface-variant uppercase">Estimated Length</label>
                <span className="text-primary font-bold text-sm">~{createDraft.length.toLocaleString()} words</span>
              </div>
              <input
                className="w-full h-1.5 bg-surface-container-high rounded-lg appearance-none cursor-pointer accent-primary"
                max="100000"
                min="1000"
                step="1000"
                type="range"
                value={createDraft.length}
                onChange={(event) => updateCreateDraft({ length: Number(event.target.value) })}
              />
              <div className="flex justify-between text-[10px] text-on-surface-variant mt-2 font-medium">
                <span>SHORT READ</span>
                <span>FULL MASTERPIECE</span>
              </div>
            </div>
          </div>

          <div className="col-span-12">
            <div className="bg-surface-container-lowest rounded-xl p-8 shadow-sm border border-transparent">
              <label className="block text-[10px] font-bold tracking-widest text-on-surface-variant uppercase mb-6">Tone & Style</label>
              <div className="flex flex-wrap gap-4">
                {TONES.map((tone) => (
                  <button
                    key={tone}
                    className={
                      createDraft.tone === tone
                        ? "flex items-center gap-2 px-6 py-3 rounded-xl bg-primary/10 border border-primary/20 text-primary font-bold text-sm transition-all scale-[1.02] shadow-sm shadow-primary/10"
                        : "flex items-center gap-2 px-6 py-3 rounded-xl bg-surface-container-low text-on-surface-variant hover:bg-surface-container transition-all font-semibold text-sm"
                    }
                    onClick={() => updateCreateDraft({ tone })}
                    title={`${TONE_GUIDE[tone].objective}\n\nRules: ${TONE_GUIDE[tone].execution}`}
                    type="button"
                  >
                    <span className="material-symbols-outlined text-lg">
                      {TONE_GUIDE[tone].icon}
                    </span>
                    {tone}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="mt-12 flex items-center justify-between pb-12">
          <button
            className="flex items-center gap-2 text-on-surface-variant font-bold text-sm hover:text-on-surface transition-colors"
            onClick={() => {
              resetCreateDraft();
              setMessage("Draft inputs cleared.");
            }}
            type="button"
          >
            <span className="material-symbols-outlined">arrow_back</span>
            Discard Draft
          </button>
          <div className="flex gap-3">
            <button
              className="border border-primary/20 text-primary px-6 py-4 rounded-xl font-bold flex items-center gap-3 hover:bg-primary/5 transition-all"
              onClick={() => {
                const project = createProjectFromDraft();
                setMessage(`Project "${project.title}" created from the local draft. Opening the editor next.`);
                router.push("/editor");
              }}
              type="button"
            >
              Quick Draft
            </button>
            <button
              className="bg-gradient-to-br from-primary to-primary-container text-white px-8 py-4 rounded-xl font-bold flex items-center gap-3 shadow-xl shadow-primary/20 hover:opacity-90 active:scale-95 transition-all disabled:opacity-60"
              onClick={handleGenerateWithAI}
              disabled={isGenerating}
              type="button"
            >
              {isGenerating ? "Running AI Agents..." : "Generate With AI Agents"}
              <span className="material-symbols-outlined">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>

      <div className="fixed top-0 right-0 -z-10 w-[500px] h-[500px] bg-primary/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2" />
      <div className="fixed bottom-0 left-0 -z-10 w-[300px] h-[300px] bg-primary/10 blur-[100px] rounded-full -translate-x-1/4 translate-y-1/4" />
    </>
  );
}
