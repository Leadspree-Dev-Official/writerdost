"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { generateAiText } from "@/lib/ai-client";
import { useAppStore } from "@/lib/app-store";
import { STREAM_DELIMITER, robustParseJson } from "@/lib/app-utils";
import { GenerationOverlay } from "@/components/ui/GenerationOverlay";
import { TONES } from "@/lib/tone-standards";

const recentManuscripts = [
  {
    label: "The Future of AI.epub",
    summary: "A technology manuscript on trust, product design, and AI systems.",
  },
  {
    label: "Marketing 101.docx",
    summary: "A practical guide for modern growth teams looking to sharpen copy and messaging.",
  },
  {
    label: "Nature Ethics.pdf",
    summary: "An essay collection focused on stewardship, ecology, and moral imagination.",
  },
];

export default function RewritePage() {
  const router = useRouter();
  const rewrite = useAppStore((state) => state.rewrite);
  const api = useAppStore((state) => state.api);
  const settings = useAppStore((state) => state.settings);
  const projects = useAppStore((state) => state.projects);
  const currentProjectId = useAppStore((state) => state.currentProjectId);
  const updateRewrite = useAppStore((state) => state.updateRewrite);
  const generateRewritePreview = useAppStore((state) => state.generateRewritePreview);
  const applyRewriteToCurrentProject = useAppStore((state) => state.applyRewriteToCurrentProject);
  
  const outlineGenerator = useAppStore((state) => state.outlineGenerator);
  const updateOutlineGenerator = useAppStore((state) => state.updateOutlineGenerator);
  const addOutlineChapter = useAppStore((state) => state.addOutlineChapter);
  const removeOutlineChapter = useAppStore((state) => state.removeOutlineChapter);
  const updateOutlineChapter = useAppStore((state) => state.updateOutlineChapter);
  const importOutlineFromText = useAppStore((state) => state.importOutlineFromText);
  const addGeneratedProject = useAppStore((state) => state.addGeneratedProject);

  const [message, setMessage] = useState("");
  const [generating, setGenerating] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [metrics, setMetrics] = useState({ outlineTime: 0, draftingTime: 0, tokens: 0 });
  const [showSmartImport, setShowSmartImport] = useState(false);
  const [importTitle, setImportTitle] = useState("");
  const [importDescription, setImportDescription] = useState("");
  const [importOutlineText, setImportOutlineText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  // Generation Overlay Actions
  const startGeneration = useAppStore((state) => state.startGeneration);
  const addGenerationLog = useAppStore((state) => state.addGenerationLog);
  const setGenerationProgress = useAppStore((state) => state.setGenerationProgress);
  const finishGeneration = useAppStore((state) => state.finishGeneration);
  const setActiveAgent = useAppStore((state) => state.setActiveAgent);
  const isGenerating = useAppStore((state) => state.generationStatus.isGenerating);

  const currentProject = projects.find((project) => project.id === currentProjectId) ?? projects[0];

  const formatTime = (seconds: number) => {
    if (!seconds) return "0s";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      addGenerationLog({ agent: "System", message: "Process cancelled by user.", status: "error" });
      setTimeout(() => finishGeneration(), 1000);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Limit to 10MB
    const MAX_SIZE = 10 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      setMessage("File is too large. Please limit to 10MB.");
      return;
    }

    setExtracting(true);
    setMessage(`Extracting text from ${file.name}...`);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/extract-text", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Extraction failed");
      }

      const { text } = await response.json();
      updateRewrite({ manuscript: text });
      setMessage(`Successfully extracted ${text.split(/\s+/).length} words.`);
    } catch (error) {
      console.error("Upload error:", error);
      setMessage(error instanceof Error ? error.message : "Failed to extract text.");
    } finally {
      setExtracting(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleDeepRewrite = async () => {
    if (!rewrite.manuscript.trim()) {
      setMessage("Please provide a manuscript first.");
      return;
    }

    const startTime = Date.now();

    startGeneration({ 
      title: "Deep Swarm Rewrite Pipeline", 
      subtitle: "Deconstructing and rebuilding your manuscript with swarm logic." 
    });
    setGenerationProgress(5);
    setActiveAgent("System");

    const controller = new AbortController();
    abortControllerRef.current = controller;
    useAppStore.getState().setCancelGeneration(handleCancel);

    try {
      // Chunking logic (approx 1000 words per chunk)
      const words = rewrite.manuscript.split(/\s+/);
      const CHUNK_SIZE = 1000;
      const chunks: string[] = [];
      for (let i = 0; i < words.length; i += CHUNK_SIZE) {
        chunks.push(words.slice(i, i + CHUNK_SIZE).join(" "));
      }

      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setMetrics(prev => ({ ...prev, draftingTime: elapsed }));
      }, 1000);

      const totalInputWords = rewrite.manuscript.split(/\s+/).filter(Boolean).length;
      const expansionRatio = (rewrite.length || 20000) / (totalInputWords || 1);
      const CHUNK_SIZE_VAR = 1000;
      const targetChunkWords = Math.round(CHUNK_SIZE_VAR * expansionRatio);

      let accumulatedContent = "";
      const totalChunks = chunks.length;

      for (let i = 0; i < totalChunks; i++) {
        const chunkNum = i + 1;
        addGenerationLog({ agent: "System", message: `Starting processing for part ${chunkNum} of ${totalChunks}...`, status: "pending" });
        
        const response = await fetch("/api/rewrite-swarm", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            api,
            chunk: chunks[i],
            tone: rewrite.tone,
            targetChunkWords: targetChunkWords,
            settings: { temperature: settings.temperature, topP: settings.topP },
          }),
          signal: controller.signal,
        });

        const reader = response.body?.getReader();
        if (!reader) throw new Error("Failed to initialize stream.");

        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const parts = buffer.split(STREAM_DELIMITER);
          buffer = parts.pop() || "";

          for (const part of parts) {
            if (!part.trim()) continue;
            const event = robustParseJson(part);
            if (!event) continue;

            if (event.type === "active_agent") setActiveAgent(event.agent);
            else if (event.type === "usage" && event.tokens) {
              useAppStore.getState().recordUsage(event.tokens, api.provider, api.model);
              setMetrics(prev => ({ ...prev, tokens: prev.tokens + event.tokens }));
            }
            else if (event.type === "log") {
              addGenerationLog({ agent: event.agent, message: event.message, status: event.status || "success" });
            } else if (event.type === "final") {
              accumulatedContent += (accumulatedContent ? "\n\n" : "") + event.content;
            } else if (event.type === "error") {
              throw new Error(event.message);
            }
          }
        }
        
        setGenerationProgress(Math.round(((i + 1) / totalChunks) * 95));
      }

      updateRewrite({ preview: accumulatedContent });
      
      addGenerationLog({ agent: "System", message: "Full deep rewrite completed. Finalizing project...", status: "success" });
      setGenerationProgress(100);

      const duration = Math.floor((Date.now() - startTime) / 1000);
      const estimatedTokens = Math.floor(accumulatedContent.split(/\s+/).length * 1.35);
      setMetrics(prev => ({ ...prev, draftingTime: duration, tokens: estimatedTokens }));

      // Auto-save and redirect to Editor
      setTimeout(() => {
        const store = useAppStore.getState();
        store.createProjectFromRewrite();
        finishGeneration();
        router.push("/editor");
      }, 1500);
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      addGenerationLog({ agent: "System", message: error instanceof Error ? error.message : "Deep rewrite failed.", status: "error" });
    } finally {
      abortControllerRef.current = null;
      // @ts-ignore
      if (typeof interval !== 'undefined') clearInterval(interval);
    }
  };

  const handleGenerateFromOutline = async () => {
    if (!outlineGenerator.title.trim()) {
      setMessage("Please provide a project title.");
      return;
    }

    const startTime = Date.now();

    startGeneration({ 
      title: "Blueprint Intelligence Pipeline", 
      subtitle: "Architecting your creative vision from the blueprint up." 
    });
    setGenerationProgress(5);
    setActiveAgent("System");

    const controller = new AbortController();
    abortControllerRef.current = controller;
    useAppStore.getState().setCancelGeneration(handleCancel);

    try {
      const response = await fetch("/api/generate-from-outline", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api,
          settings,
          outline: {
            title: outlineGenerator.title,
            audience: outlineGenerator.audience,
            tone: outlineGenerator.tone,
            targetLength: outlineGenerator.targetLength,
            chapters: outlineGenerator.chapters,
          }
        }),
        signal: controller.signal,
      });

      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setMetrics(prev => ({ ...prev, draftingTime: elapsed }));
      }, 1000);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Failed to initialize stream.");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split(STREAM_DELIMITER);
        buffer = parts.pop() || "";

        for (const part of parts) {
          if (!part.trim()) continue;
          const event = robustParseJson(part);
          if (!event) continue;

          if (event.type === "active_agent") setActiveAgent(event.agent);
          else if (event.type === "usage" && event.tokens) {
            useAppStore.getState().recordUsage(event.tokens, api.provider, api.model);
            setMetrics(prev => ({ ...prev, tokens: prev.tokens + event.tokens }));
          }
          else if (event.type === "log") {
            addGenerationLog({ agent: event.agent, message: event.message, status: event.status || "success" });
          } else if (event.type === "final" && event.project) {
            const duration = Math.floor((Date.now() - startTime) / 1000);
            const tokensUsed = useAppStore.getState().generationStatus.sessionTokens || 0;
            setMetrics(prev => ({ ...prev, draftingTime: duration, tokens: tokensUsed }));
            
            addGeneratedProject({
              ...event.project,
              tokensUsed,
            });
            setGenerationProgress(100);
            setTimeout(() => {
              finishGeneration();
              router.push("/editor");
            }, 1500);
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      addGenerationLog({ agent: "System", message: error instanceof Error ? error.message : "Outline generation failed.", status: "error" });
    } finally {
      abortControllerRef.current = null;
      // @ts-ignore
      if (typeof interval !== 'undefined') clearInterval(interval);
    }
  };

  const handleTranslateProject = async () => {
    if (!rewrite.translateProjectId) {
      setMessage("Please select a project to translate.");
      return;
    }

    const projectToTranslate = projects.find(p => p.id === rewrite.translateProjectId);
    if (!projectToTranslate) {
      setMessage("Selected project not found.");
      return;
    }

    const startTime = Date.now();

    startGeneration({ 
      title: "Universal Contextual Translator", 
      subtitle: `Translating project into ${rewrite.targetLanguage}...` 
    });
    setGenerationProgress(5);
    setActiveAgent("System");

    const controller = new AbortController();
    abortControllerRef.current = controller;
    useAppStore.getState().setCancelGeneration(handleCancel);

    try {
      const response = await fetch("/api/translate-project", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          api,
          settings,
          project: projectToTranslate,
          targetLanguage: rewrite.targetLanguage,
          tone: rewrite.tone,
        }),
        signal: controller.signal,
      });

      const interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setMetrics(prev => ({ ...prev, draftingTime: elapsed }));
      }, 1000);

      const reader = response.body?.getReader();
      if (!reader) throw new Error("Failed to initialize stream.");

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split(STREAM_DELIMITER);
        buffer = parts.pop() || "";

        for (const part of parts) {
          if (!part.trim()) continue;
          const event = robustParseJson(part);
          if (!event) continue;

          if (event.type === "active_agent") setActiveAgent(event.agent);
          else if (event.type === "usage" && event.tokens) {
            useAppStore.getState().recordUsage(event.tokens, api.provider, api.model);
            setMetrics(prev => ({ ...prev, tokens: prev.tokens + event.tokens }));
          }
          else if (event.type === "log") {
            addGenerationLog({ agent: event.agent, message: event.message, status: event.status || "success" });
          } else if (event.type === "final" && event.project) {
            const duration = Math.floor((Date.now() - startTime) / 1000);
            const tokensUsed = useAppStore.getState().generationStatus.sessionTokens || 0;
            setMetrics(prev => ({ ...prev, draftingTime: duration, tokens: tokensUsed }));
            
            addGeneratedProject({
              ...event.project,
              tokensUsed,
            });
            setGenerationProgress(100);
            setTimeout(() => {
              finishGeneration();
              router.push("/editor");
            }, 1500);
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      addGenerationLog({ agent: "System", message: error instanceof Error ? error.message : "Translation failed.", status: "error" });
    } finally {
      abortControllerRef.current = null;
      // @ts-ignore
      if (typeof interval !== 'undefined') clearInterval(interval);
    }
  };

  return (
    <>
      <div className="flex-1 p-8 max-w-6xl mx-auto w-full animate-in fade-in duration-700">
        <div className="mb-12 lg:flex lg:items-end lg:justify-between border-b border-outline-variant/5 pb-8">
          <div>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
                <span className="material-symbols-outlined">auto_fix_high</span>
              </div>
              <h2 className="text-4xl font-black tracking-tight text-on-surface">Rewrite Ebook</h2>
            </div>
            <p className="text-on-surface-variant max-w-2xl leading-relaxed text-sm">
              Premium manuscript transformation powered by <span className="text-primary font-bold">Deep Swarm Intelligence</span>.
            </p>
          </div>
          <div className="flex bg-surface-container-low/80 backdrop-blur-md p-1.5 rounded-2xl gap-1 mt-6 lg:mt-0 shadow-inner border border-white/5">
            {[
              { id: "Simple", label: "Quick Fix", icon: "bolt" },
              { id: "Deep", label: "Deep Swarm", icon: "account_tree" },
              { id: "Outline", label: "From Outline", icon: "auto_awesome_motion" },
              { id: "Translate", label: "Translate", icon: "translate" }
            ].map((flow) => (
              <button
                key={flow.id}
                className={`px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all flex items-center gap-2 ${
                  rewrite.flow === flow.id
                    ? "bg-white dark:bg-white/[0.08] shadow-xl shadow-primary/5 dark:shadow-none text-primary dark:text-indigo-300 scale-[1.02]"
                    : "text-on-surface-variant hover:text-on-surface hover:bg-white/40 dark:hover:bg-white/[0.04]"
                }`}
                onClick={() => updateRewrite({ flow: flow.id as any })}
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">{flow.icon}</span>
                {flow.label}
              </button>
            ))}
          </div>
        </div>

        {message ? (
          <div className="mb-8 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 p-4 text-sm text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
            {message}
            <button onClick={() => setMessage("")} className="text-emerald-900/40 dark:text-emerald-400/40 hover:text-emerald-900 dark:hover:text-emerald-300 transition-colors">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-12 gap-8">
          {/* Main Workspace */}
          <div className="col-span-12 lg:col-span-8 space-y-8">
            {rewrite.flow === "Outline" ? (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-700 fill-mode-both">
                <div className="bg-white/40 dark:bg-white/[0.03] backdrop-blur-xl rounded-[2.5rem] p-10 border border-white/60 dark:border-white/[0.06] shadow-2xl shadow-primary/5 dark:shadow-none relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-8 opacity-[0.03] pointer-events-none">
                    <span className="material-symbols-outlined text-[120px]">architecture</span>
                  </div>
                  
                  <h3 className="text-2xl font-black mb-8 flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                      <span className="material-symbols-outlined text-xl">architecture</span>
                    </span>
                    Creative Blueprints
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10">
                    <div className="group">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] block mb-3 pl-1">Ebook Master Title</label>
                      <input
                        className="w-full bg-white/80 dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06] rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary/20 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 text-on-surface"
                        placeholder="e.g. The Architecture of Tomorrow"
                        type="text"
                        value={outlineGenerator.title || ""}
                        onChange={(e) => updateOutlineGenerator({ title: e.target.value })}
                      />
                    </div>
                    <div className="group">
                      <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] block mb-3 pl-1">Primary Audience</label>
                      <input
                        className="w-full bg-white/80 dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06] rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary/20 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 text-on-surface"
                        placeholder="e.g. Tech Visionaries & Architects"
                        type="text"
                        value={outlineGenerator.audience || ""}
                        onChange={(e) => updateOutlineGenerator({ audience: e.target.value })}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-6">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 px-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.3em]">Curriculum Staging</span>
                        <span className="px-2 py-0.5 bg-slate-900 dark:bg-primary text-white rounded text-[9px] font-black">{outlineGenerator.chapters.length} Units</span>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => setShowSmartImport(true)} 
                          className="h-10 px-5 rounded-xl border-2 border-slate-900 dark:border-primary text-slate-900 dark:text-primary text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-slate-900 dark:hover:bg-primary hover:text-white transition-all active:scale-95 shadow-sm dark:shadow-none"
                        >
                          <span className="material-symbols-outlined text-sm">text_fields</span> Smart Import
                        </button>
                        <button 
                          onClick={addOutlineChapter} 
                          className="h-10 px-5 rounded-xl bg-slate-900 dark:bg-primary text-white text-[10px] font-black uppercase tracking-widest flex items-center gap-2 hover:bg-primary dark:hover:bg-indigo-400 transition-all hover:shadow-lg hover:shadow-primary/20 active:scale-95 shadow-sm"
                        >
                          <span className="material-symbols-outlined text-sm">add_circle</span> New Chapter
                        </button>
                      </div>
                    </div>


                    
                    <div className="grid grid-cols-1 gap-4">
                      {outlineGenerator.chapters.map((ch, idx) => (
                        <div key={ch.id} className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-sm rounded-3xl p-6 border border-white dark:border-white/[0.06] shadow-sm dark:shadow-none group hover:shadow-md transition-all hover:border-primary/10 dark:hover:border-primary/20">
                          <div className="flex items-center gap-5 mb-4">
                            <span className="w-10 h-10 bg-slate-100 dark:bg-white/[0.06] rounded-2xl flex items-center justify-center text-xs font-black text-slate-500 dark:text-slate-400 group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                              {String(idx + 1).padStart(2, '0')}
                            </span>
                            <div className="flex-1">
                              <input
                                className="bg-transparent border-0 font-black text-base w-full focus:ring-0 outline-none text-on-surface"
                                placeholder={`Chapter ${idx + 1} Title`}
                                value={ch.title || ""}
                                onChange={(e) => updateOutlineChapter(ch.id, { title: e.target.value })}
                              />
                            </div>
                            <button 
                              onClick={() => removeOutlineChapter(ch.id)} 
                              className="w-10 h-10 rounded-xl flex items-center justify-center text-slate-300 dark:text-slate-600 hover:text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-500/10 transition-all"
                            >
                               <span className="material-symbols-outlined text-lg">delete_outline</span>
                            </button>
                          </div>
                          <textarea
                            className="w-full bg-slate-50/50 dark:bg-white/[0.03] rounded-2xl p-5 text-xs text-on-surface-variant font-medium min-h-24 resize-none focus:ring-4 focus:ring-primary/5 focus:bg-white dark:focus:bg-white/[0.06] outline-none border border-transparent focus:border-primary/10 transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600"
                            placeholder="Briefly list the key insights and topics for this chapter..."
                            value={ch.topics || ""}
                            onChange={(e) => updateOutlineChapter(ch.id, { topics: e.target.value })}
                          />
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            ) : rewrite.flow === "Translate" ? (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both">
                <div className="bg-white dark:bg-white/[0.03] rounded-[2.5rem] p-1.5 shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-white/[0.06] overflow-hidden relative">
                  <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/5 dark:bg-primary/[0.03] rounded-full blur-3xl pointer-events-none" />
                  <div className="bg-slate-50/50 dark:bg-transparent backdrop-blur-sm rounded-[2rem] border border-white dark:border-white/[0.04] p-8 md:p-12 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-start gap-8">
                      <div className="w-20 h-20 bg-white dark:bg-white/[0.06] rounded-3xl flex items-center justify-center shadow-xl dark:shadow-none shadow-primary/10 border border-primary/5 dark:border-white/[0.06] shrink-0">
                        <span className="material-symbols-outlined text-primary text-4xl">translate</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                          <h3 className="text-2xl font-black tracking-tight leading-none text-on-surface">Universal Translator</h3>
                        </div>
                        <p className="text-on-surface-variant text-sm mb-6 max-w-xl leading-relaxed font-medium">
                          Select an existing project and seamlessly translate it into a new language. The AI acts as a contextual translator, preserving your tone, cultural nuances, and precise formatting.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-8">
                          <div className="group">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] block mb-3 pl-1">Source Project</label>
                            <select
                              className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary/20 outline-none transition-all shadow-inner dark:shadow-none text-on-surface"
                              value={rewrite.translateProjectId || ""}
                              onChange={(e) => updateRewrite({ translateProjectId: e.target.value })}
                            >
                              <option value="" disabled>Select a project...</option>
                              {projects.map((p) => (
                                <option key={p.id} value={p.id}>{p.title}</option>
                              ))}
                            </select>
                          </div>
                          <div className="group">
                            <label className="text-[10px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] block mb-3 pl-1">Target Language</label>
                            <select
                              className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] rounded-2xl px-5 py-4 text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary/20 outline-none transition-all shadow-inner dark:shadow-none text-on-surface"
                              value={rewrite.targetLanguage || "Spanish"}
                              onChange={(e) => updateRewrite({ targetLanguage: e.target.value })}
                            >
                              {["Spanish", "French", "German", "Hindi", "Bengali", "Gujarati", "Portuguese", "Chinese", "Japanese", "Arabic", "Russian"].map((lang) => (
                                <option key={lang} value={lang}>{lang}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both">
                <div className="bg-white dark:bg-white/[0.03] rounded-[2.5rem] p-1.5 shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-white/[0.06] overflow-hidden relative">
                  <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/5 dark:bg-primary/[0.03] rounded-full blur-3xl pointer-events-none" />
                  <div className="bg-slate-50/50 dark:bg-transparent backdrop-blur-sm rounded-[2rem] border border-white dark:border-white/[0.04] p-8 md:p-12 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-start gap-8">
                      <div className="w-20 h-20 bg-white dark:bg-white/[0.06] rounded-3xl flex items-center justify-center shadow-xl dark:shadow-none shadow-primary/10 border border-primary/5 dark:border-white/[0.06] shrink-0">
                        <span className="material-symbols-outlined text-primary text-4xl">
                          {rewrite.flow === "Deep" ? "account_tree" : "content_paste_go"}
                        </span>
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                          <h3 className="text-2xl font-black tracking-tight leading-none text-on-surface">
                            {rewrite.flow === "Deep" ? "Manuscript Core" : "Quick Text Entry"}
                          </h3>
                          
                          <div className="flex items-center gap-2">
                             <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileUpload} 
                                className="hidden" 
                                accept=".pdf,.docx,.txt,.md"
                             />
                             <button 
                                onClick={() => fileInputRef.current?.click()}
                                disabled={extracting}
                                className="flex items-center gap-2 px-6 py-3 bg-white/80 dark:bg-white/[0.04] hover:bg-white dark:hover:bg-white/[0.08] border border-slate-200 dark:border-white/[0.06] rounded-2xl text-[10px] font-black uppercase tracking-widest text-slate-500 dark:text-slate-400 hover:text-primary transition-all shadow-sm dark:shadow-none active:scale-95 disabled:opacity-50"
                             >
                                <span className={extracting ? 'animate-spin' : ''}>
                                  <span className="material-symbols-outlined text-[16px]">
                                    {extracting ? 'sync' : 'upload_file'}
                                  </span>
                                </span>
                                {extracting ? 'Extracting Intelligence...' : 'Upload Manuscript'}
                             </button>
                          </div>
                        </div>
                        <p className="text-on-surface-variant text-sm mb-6 max-w-xl leading-relaxed font-medium">
                          {rewrite.flow === "Deep" 
                            ? "Upload a file or provide your full manuscript. Our swarm will deconstruct it into conceptual units before rebuilding it."
                            : "Upload a draft or paste specific passages to polish rhythm, enhance tone, and improve professional flow."}
                        </p>
                        <div className="relative group">
                          <textarea
                            className="w-full min-h-80 rounded-3xl bg-white dark:bg-white/[0.04] p-8 border border-slate-200 dark:border-white/[0.06] outline-none focus:ring-8 focus:ring-primary/5 focus:border-primary/20 resize-none shadow-inner dark:shadow-none text-sm font-medium leading-relaxed transition-all text-on-surface"
                            value={rewrite.manuscript || ""}
                            onChange={(event) => updateRewrite({ manuscript: event.target.value })}
                            placeholder={rewrite.flow === "Deep" ? "Drop your full book content here..." : "Paste content to polish..."}
                          />
                          <div className="absolute bottom-6 right-6 opacity-40 text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">
                             {rewrite.manuscript.split(/\s+/).filter(Boolean).length} Words
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="col-span-12 lg:col-span-4 space-y-8">
            <div className="space-y-4">
              <button
                className="w-full bg-slate-900 dark:bg-primary text-white py-6 rounded-[2rem] font-black uppercase tracking-[0.3em] shadow-2xl shadow-slate-300 dark:shadow-primary/20 flex items-center justify-center gap-4 group transition-all hover:bg-primary dark:hover:bg-indigo-400 active:scale-95 disabled:opacity-50 relative overflow-hidden text-xs"
                onClick={async () => {
                  if (rewrite.flow === "Deep") {
                     handleDeepRewrite();
                     return;
                  }
                  if (rewrite.flow === "Outline") {
                     handleGenerateFromOutline();
                     return;
                  }

                  if (rewrite.flow === "Translate") {
                     handleTranslateProject();
                     return;
                  }

                  if (!api.baseUrl || !api.model || (!api.apiKey && api.provider !== "ollama")) {
                    generateRewritePreview();
                    setMessage("Rewrite preview generated with local fallback.");
                    return;
                  }

                  setGenerating(true);
                  const startTime = Date.now();
                  try {
                    const text = await generateAiText({
                      api,
                      systemPrompt: "You rewrite manuscript passages for professional authors. If the content provided is an existing author's work, you MUST use it as inspiration but completely rebrand and rewrite it to be original while maintaining the winning structure and logical progression. Do not plagiarize phrasing.",
                      userPrompt: `Rewrite this manuscript in a "${rewrite.tone}" tone.\n\nTarget length for this output: ${rewrite.length || 20000} words.\n\nHumanize: ${rewrite.humanize}.\nAvoid plagiarism: ${rewrite.avoidPlagiarism}.\n\nText:\n${rewrite.manuscript}`,
                      temperature: settings.temperature,
                      topP: settings.topP,
                    });
                    
                    const duration = Math.floor((Date.now() - startTime) / 1000);
                    const estimatedTokens = Math.floor(text.split(/\s+/).length * 1.35);
                    setMetrics(prev => ({ ...prev, draftingTime: duration, tokens: estimatedTokens }));

                    updateRewrite({ preview: text });
                    
                    // Auto-save and redirect
                    const store = useAppStore.getState();
                    const project = store.createProjectFromRewrite();
                    router.push("/editor");
                  } catch (error) {
                    generateRewritePreview();
                    setMessage(`AI request failed. Falling back to local.`);
                  } finally {
                    setGenerating(false);
                  }
                }}
                disabled={generating || isGenerating}
                type="button"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 -translate-x-full group-hover:animate-shimmer duration-1000" />
                <span className="material-symbols-outlined text-xl group-hover:rotate-12 transition-transform">
                  {rewrite.flow === "Deep" ? "account_tree" : rewrite.flow === "Outline" ? "auto_awesome_motion" : rewrite.flow === "Translate" ? "translate" : "auto_fix_high"}
                </span>
                {generating || isGenerating 
                  ? "Agents Initializing..." 
                  : rewrite.flow === "Deep" 
                    ? "Launch Swarm Intelligence" 
                    : rewrite.flow === "Outline" 
                      ? "Generate Masterpiece" 
                      : rewrite.flow === "Translate"
                        ? "Translate Project"
                        : "Generate Preview"}
              </button>
            </div>

            {/* PROJECT METADATA CARD (RETURNED TO SIDEBAR) */}
            <div className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl rounded-[2rem] p-8 border border-white dark:border-white/[0.06] shadow-xl dark:shadow-none animate-in slide-in-from-right-4 duration-500">
               <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shadow-lg shadow-primary/5">
                  <span className="material-symbols-outlined text-xl">folder_managed</span>
                </div>
                <div className="flex flex-col">
                  <h4 className="font-black text-xs uppercase tracking-widest text-on-surface">Project Metadata</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">Draft Identity</p>
                </div>
              </div>
              <div className="space-y-6">
                <div>
                  <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] block mb-2 pl-1">Project Master Title</label>
                  <input
                    className="w-full bg-slate-50/50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06] rounded-xl px-4 py-3 text-xs font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary/20 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 shadow-inner dark:shadow-none text-on-surface"
                    placeholder={rewrite.flow === "Outline" ? "Using Blueprint Title..." : "e.g. My Rewritten Concept"}
                    type="text"
                    disabled={rewrite.flow === "Outline"}
                    value={(rewrite.flow === "Outline" ? outlineGenerator.title : rewrite.title) || ""}
                    onChange={(e) => rewrite.flow === "Outline" ? updateOutlineGenerator({ title: e.target.value }) : updateRewrite({ title: e.target.value })}
                  />
                </div>
                <div>
                  <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] block mb-2 pl-1">Primary Audience</label>
                  <input
                    className="w-full bg-slate-50/50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06] rounded-xl px-4 py-3 text-xs font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary/20 outline-none transition-all placeholder:text-slate-300 dark:placeholder:text-slate-600 shadow-inner dark:shadow-none text-on-surface"
                    placeholder="e.g. Aspiring Developers"
                    type="text"
                    disabled={rewrite.flow === "Outline"}
                    value={(rewrite.flow === "Outline" ? outlineGenerator.audience : rewrite.audience) || ""}
                    onChange={(e) => rewrite.flow === "Outline" ? updateOutlineGenerator({ audience: e.target.value }) : updateRewrite({ audience: e.target.value })}
                  />
                </div>
                
                <div className="pt-2">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase tracking-[0.2em] pl-1">Estimated Words</label>
                    <span className="text-primary font-bold text-[10px]">
                      ~{(rewrite.flow === "Outline" ? (outlineGenerator.targetLength || 15000) : (rewrite.length || 20000)).toLocaleString()}
                    </span>
                  </div>
                  <input
                    className="w-full h-1 bg-slate-100 dark:bg-white/[0.06] rounded-lg appearance-none cursor-pointer accent-primary"
                    max="100000"
                    min="1000"
                    step="1000"
                    type="range"
                    value={rewrite.flow === "Outline" ? (outlineGenerator.targetLength || 15000) : (rewrite.length || 20000)}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (rewrite.flow === "Outline") {
                        updateOutlineGenerator({ targetLength: val });
                      } else {
                        updateRewrite({ length: val });
                      }
                    }}
                  />
                </div>
              </div>
            </div>

            {/* CREATIVE VOICE DROPDOWN */}
            <div className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl rounded-[2rem] p-8 border border-white dark:border-white/[0.06] shadow-xl dark:shadow-none">
              <div className="flex items-center gap-4 mb-8">
                <div className="w-10 h-10 rounded-xl bg-slate-900 dark:bg-primary text-white flex items-center justify-center shadow-lg shadow-slate-200 dark:shadow-primary/20">
                  <span className="material-symbols-outlined text-xl">psychology</span>
                </div>
                <div className="flex flex-col">
                  <h4 className="font-black text-xs uppercase tracking-widest text-on-surface">Creative Voice</h4>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">Tone Configuration</p>
                </div>
              </div>
              
              <div className="relative group">
                <select
                  className="w-full appearance-none bg-slate-50/50 dark:bg-white/[0.04] border border-slate-100 dark:border-white/[0.06] rounded-2xl px-6 py-4 text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 focus:ring-4 focus:ring-primary/5 focus:border-primary/20 outline-none cursor-pointer hover:bg-white dark:hover:bg-white/[0.06] transition-all shadow-sm dark:shadow-none"
                  value={(rewrite.flow === "Outline" ? outlineGenerator.tone : rewrite.tone) || "Professional"}
                  onChange={(e) => rewrite.flow === "Outline" ? updateOutlineGenerator({ tone: e.target.value }) : updateRewrite({ tone: e.target.value })}
                >
                  {TONES.map((tone) => (
                    <option key={tone} value={tone}>
                      {tone}
                    </option>
                  ))}
                </select>
                <div className="absolute right-6 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400 dark:text-slate-500 group-hover:text-primary transition-colors">
                  <span className="material-symbols-outlined text-sm">expand_more</span>
                </div>
              </div>
            </div>

            {rewrite.flow !== "Outline" && (
              <div className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl rounded-[2rem] p-8 border border-white dark:border-white/[0.06] shadow-xl dark:shadow-none">
                <div className="flex items-center gap-4 mb-10">
                  <div className="w-12 h-12 rounded-2xl bg-primary text-white flex items-center justify-center shadow-lg shadow-primary/20">
                    <span className="material-symbols-outlined text-2xl">verified_user</span>
                  </div>
                  <div className="flex flex-col">
                    <h4 className="font-black text-xs uppercase tracking-widest text-on-surface">Audit Layers</h4>
                    <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold uppercase tracking-tighter">Safety & Style</p>
                  </div>
                </div>
                <div className="space-y-8">
                  <div className="flex items-center justify-between group">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 group-hover:text-primary transition-colors">Humanize</span>
                    <button
                      onClick={() => updateRewrite({ humanize: !rewrite.humanize })}
                      className={`w-14 h-7 rounded-full transition-all relative p-1 ${rewrite.humanize ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-slate-200 dark:bg-white/[0.06]'}`}
                      type="button"
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-all transform ${rewrite.humanize ? 'translate-x-7 shadow-sm' : 'translate-x-0'}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between group">
                    <span className="text-xs font-black uppercase tracking-widest text-slate-600 dark:text-slate-300 group-hover:text-primary transition-colors">Zero Plagiarism</span>
                    <button
                      onClick={() => updateRewrite({ avoidPlagiarism: !rewrite.avoidPlagiarism })}
                      className={`w-14 h-7 rounded-full transition-all relative p-1 ${rewrite.avoidPlagiarism ? 'bg-primary shadow-lg shadow-primary/20' : 'bg-slate-200 dark:bg-white/[0.06]'}`}
                      type="button"
                    >
                      <div className={`w-5 h-5 bg-white rounded-full transition-all transform ${rewrite.avoidPlagiarism ? 'translate-x-7 shadow-sm' : 'translate-x-0'}`} />
                    </button>
                  </div>
                </div>
              </div>
            )}


            <div className="bg-white/60 dark:bg-white/[0.03] backdrop-blur-xl rounded-[2rem] p-8 border border-white dark:border-white/[0.06] shadow-xl dark:shadow-none">
              <h4 className="font-black text-xs uppercase tracking-widest text-on-surface mb-6">Rewrite Metrics</h4>
              <div className="space-y-4 bg-slate-50/50 dark:bg-white/[0.03] p-5 rounded-2xl border border-slate-100 dark:border-white/[0.06]">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Outline Time</span>
                  <span className="text-xs font-bold text-emerald-500">{formatTime(metrics.outlineTime)}</span>
                </div>
                <div className="h-px bg-slate-200/50 dark:bg-white/[0.04] w-full" />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Drafting Time</span>
                  <span className="text-xs font-bold text-indigo-500">{formatTime(metrics.draftingTime)}</span>
                </div>
                <div className="h-px bg-slate-200/50 dark:bg-white/[0.04] w-full" />
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-500">Tokens Used</span>
                  <span className="text-xs font-bold text-slate-900 dark:text-slate-200">{metrics.tokens.toLocaleString()}</span>
                </div>
              </div>
            </div>

          </div>
        </div>
      </div>
      {/* Smart Import Modal — rendered at top level to avoid backdrop-blur/overflow clipping */}
      {showSmartImport && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowSmartImport(false); }}
        >
          <div 
            className="bg-white dark:bg-[#1a1a2e] rounded-3xl sm:rounded-[2.5rem] w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-white/10 animate-in zoom-in-95 fade-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white dark:bg-[#1a1a2e] rounded-t-3xl sm:rounded-t-[2.5rem] px-8 sm:px-10 pt-8 pb-5 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center shadow-lg shadow-indigo-500/20">
                    <span className="material-symbols-outlined text-2xl">auto_awesome</span>
                  </div>
                  <div>
                    <h4 className="font-black text-lg tracking-tight text-slate-900 dark:text-white">Smart Blueprint Import</h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Import existing book structure to regenerate</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSmartImport(false)}
                  className="w-10 h-10 rounded-xl bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors"
                >
                  <span className="material-symbols-outlined text-xl">close</span>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-8 sm:px-10 py-8 space-y-7">
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Provide the <span className="text-indigo-600 dark:text-indigo-400 font-bold">Title, Description, and Curriculum/Outline</span> from an existing book. 
                The system will parse chapters and topics, then regenerate an original outline for your new project.
              </p>

              {/* Title Field */}
              <div>
                <label className="flex items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] mb-2.5 pl-1">
                  <span className="material-symbols-outlined text-sm text-indigo-500">title</span>
                  Ebook Title
                </label>
                <input
                  className="w-full bg-slate-50 dark:bg-white/[0.05] px-5 py-4 rounded-2xl text-sm font-semibold border border-slate-200 dark:border-white/[0.08] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all"
                  placeholder="e.g., Marketing Psychology Decoded"
                  value={importTitle}
                  onChange={(e) => setImportTitle(e.target.value)}
                />
              </div>

              {/* Description Field */}
              <div>
                <label className="flex items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] mb-2.5 pl-1">
                  <span className="material-symbols-outlined text-sm text-indigo-500">description</span>
                  Description / Audience
                </label>
                <textarea
                  className="w-full h-32 bg-slate-50 dark:bg-white/[0.05] px-5 py-4 rounded-2xl text-sm font-medium border border-slate-200 dark:border-white/[0.08] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 resize-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all leading-relaxed"
                  placeholder="Exploring consumer behavior, persuasion triggers, and marketing psychology for digital marketers and copywriters..."
                  value={importDescription}
                  onChange={(e) => setImportDescription(e.target.value)}
                />
              </div>

              {/* Outline / Curriculum Field */}
              <div>
                <label className="flex items-center gap-2 text-[11px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] mb-2.5 pl-1">
                  <span className="material-symbols-outlined text-sm text-indigo-500">list_alt</span>
                  Curriculum / Outline
                </label>
                <textarea
                  className="w-full h-56 bg-slate-50 dark:bg-white/[0.05] px-5 py-4 rounded-2xl text-sm font-medium border border-slate-200 dark:border-white/[0.08] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 resize-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all font-mono leading-relaxed"
                  placeholder={"1. Delving into Minds\n* The psychology of attention\n* Cognitive biases in decision making\n\n2. Persuasion Triggers\n* Social proof and authority\n* Scarcity and urgency"}
                  value={importOutlineText}
                  onChange={(e) => setImportOutlineText(e.target.value)}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-[#1a1a2e] rounded-b-3xl sm:rounded-b-[2.5rem] px-8 sm:px-10 pb-8 pt-5 border-t border-slate-100 dark:border-white/[0.06]">
              <button 
                className="w-full bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-500 hover:to-violet-500 text-white py-5 rounded-2xl text-xs font-black uppercase tracking-[0.2em] transition-all active:scale-[0.98] shadow-xl shadow-indigo-500/20 flex items-center justify-center gap-3 disabled:opacity-50"
                disabled={!importTitle.trim() && !importOutlineText.trim()}
                onClick={() => {
                  const combinedText = `${importTitle}\nDESCRIPTION\n${importDescription}\nCURRICULUM\n${importOutlineText}`;
                  importOutlineFromText(combinedText);
                  setShowSmartImport(false);
                  setImportTitle("");
                  setImportDescription("");
                  setImportOutlineText("");
                  setMessage("Blueprint imported and mapped successfully!");
                }}
              >
                <span className="material-symbols-outlined text-lg">auto_mode</span>
                Regenerate Outline & Save to Project
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
