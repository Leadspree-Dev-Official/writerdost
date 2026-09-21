"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { generateAiText } from "@/lib/ai-client";
import { useAppStore, type RewriteFlow } from "@/lib/app-store";
import { LANGUAGE_GROUPS, DEFAULT_LANGUAGE, getLanguageDirective } from "@/lib/languages";
import { STREAM_DELIMITER, robustParseJson } from "@/lib/app-utils";
import { TONES } from "@/lib/tone-standards";
import type { GeneratedChapter } from "@/lib/store-types";

export default function RewritePage() {
  const router = useRouter();
  const rewrite = useAppStore((state) => state.rewrite);
  const api = useAppStore((state) => state.api);
  const settings = useAppStore((state) => state.settings);
  const projects = useAppStore((state) => state.projects);
  const updateRewrite = useAppStore((state) => state.updateRewrite);
  const generateRewritePreview = useAppStore((state) => state.generateRewritePreview);
  
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
  const [importLanguage, setImportLanguage] = useState(DEFAULT_LANGUAGE);

  const openSmartImport = () => {
    setImportLanguage(outlineGenerator.language || DEFAULT_LANGUAGE);
    setShowSmartImport(true);
  };
  const fileInputRef = useRef<HTMLInputElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const outlineCompletedChaptersRef = useRef<GeneratedChapter[]>([]);
  const outlineSpunChaptersRef = useRef<Array<{ title: string; topics: string }> | null>(null);
  const outlineTotalChaptersRef = useRef<number>(0);
  const outlineStartTimeRef = useRef<number>(0);

  // Generation Overlay Actions
  const startGeneration = useAppStore((state) => state.startGeneration);
  const addGenerationLog = useAppStore((state) => state.addGenerationLog);
  const setGenerationProgress = useAppStore((state) => state.setGenerationProgress);
  const finishGeneration = useAppStore((state) => state.finishGeneration);
  const setActiveAgent = useAppStore((state) => state.setActiveAgent);
  const setCurrentTask = useAppStore((state) => state.setCurrentTask);
  const setPaused = useAppStore((state) => state.setPaused);
  const setResumeGeneration = useAppStore((state) => state.setResumeGeneration);
  const isGenerating = useAppStore((state) => state.generationStatus.isGenerating);


  const formatTime = (seconds: number) => {
    if (!seconds) return "0s";
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const handleCancel = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
      if (outlineCompletedChaptersRef.current.length > 0) {
        setPaused(true);
        const saved = outlineCompletedChaptersRef.current.length;
        const total = outlineTotalChaptersRef.current || outlineGenerator.chapters.length;
        setCurrentTask(`Paused at Chapter ${saved} of ${total}`);
        addGenerationLog({
          agent: "System",
          message: `Generation paused by user. ${saved} of ${total} chapters saved safely.`,
          status: "pending",
        });
        setResumeGeneration(() => runOutlineStream({ isResume: true }));
      } else {
        addGenerationLog({ agent: "System", message: "Process cancelled by user.", status: "error" });
        setTimeout(() => finishGeneration(), 1000);
      }
    }
  };

  // Ensure no legacy seeded/placeholder chapters exist at the beginning
  useEffect(() => {
    if (outlineGenerator.chapters?.length > 0) {
      const hasSeeded = outlineGenerator.chapters.some(
        (ch) =>
          ch.title === "Next Chapter Title" ||
          ch.topics === "Explain key concepts for this section..." ||
          ch.title === "Chapter 1: The Foundation" ||
          ch.title === "Chapter 2: Strategy",
      );
      if (hasSeeded) {
        const cleaned = outlineGenerator.chapters.filter(
          (ch) =>
            ch.title !== "Next Chapter Title" &&
            ch.topics !== "Explain key concepts for this section..." &&
            ch.title !== "Chapter 1: The Foundation" &&
            ch.title !== "Chapter 2: Strategy",
        );
        updateOutlineGenerator({ chapters: cleaned });
      }
    }
  }, [outlineGenerator.chapters, updateOutlineGenerator]);

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
    // Declared here (not inside `try`) so the `finally` block can clear it.
    let interval: ReturnType<typeof setInterval> | undefined;

    if (!rewrite.manuscript.trim()) {
      setMessage("Please provide a manuscript first.");
      return;
    }

    const startTime = Date.now();

    startGeneration({ 
      title: "Rewriting your manuscript",
      subtitle: "Taking the source apart and rebuilding it in your voice."
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

      interval = setInterval(() => {
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
            language: rewrite.language || DEFAULT_LANGUAGE,
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
      if (interval) clearInterval(interval);
    }
  };

  const runOutlineStream = async ({ isResume = false }: { isResume?: boolean } = {}) => {
    let interval: ReturnType<typeof setInterval> | undefined;

    if (!isResume) {
      if (!outlineGenerator.title.trim()) {
        setMessage("Add a project title first.");
        return;
      }

      if (outlineGenerator.chapters.length === 0) {
        setMessage("Add at least one chapter, or use Smart import to build the outline from text.");
        return;
      }

      outlineCompletedChaptersRef.current = [];
      outlineSpunChaptersRef.current = null;
      outlineTotalChaptersRef.current = outlineGenerator.chapters.length;
      outlineStartTimeRef.current = Date.now();

      startGeneration({ 
        title: "Building from your outline",
        subtitle: "Turning the chapter blueprint into a full draft."
      });
      setGenerationProgress(5);
      setCurrentTask("Architect Agent spinning and rebranding curriculum...");
      setActiveAgent("System");
      setPaused(false);
      setResumeGeneration(null);
    } else {
      setPaused(false);
      const savedCount = outlineCompletedChaptersRef.current.length;
      const total = outlineTotalChaptersRef.current || outlineGenerator.chapters.length;
      setCurrentTask(`Resuming generation at Chapter ${savedCount + 1} of ${total}...`);
      setActiveAgent("Writing Agent");
      addGenerationLog({
        agent: "System",
        message: `Resuming generation from Chapter ${savedCount + 1} of ${total}...`,
        status: "pending",
      });
    }

    const controller = new AbortController();
    abortControllerRef.current = controller;
    useAppStore.getState().setCancelGeneration(handleCancel);
    setResumeGeneration(null);

    const startTime = outlineStartTimeRef.current || Date.now();
    let receivedFinal = false;

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
            language: outlineGenerator.language || DEFAULT_LANGUAGE,
            targetLength: outlineGenerator.targetLength,
            chapters: outlineGenerator.chapters,
          },
          startChapterIndex: outlineCompletedChaptersRef.current.length,
          spunChapters: outlineSpunChaptersRef.current,
          completedChapters: outlineCompletedChaptersRef.current,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Server error (${response.status}): ${errText || response.statusText}`);
      }

      interval = setInterval(() => {
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

          if (event.type === "ping") {
            continue;
          } else if (event.type === "spun_outline" && Array.isArray(event.spunChapters)) {
            outlineSpunChaptersRef.current = event.spunChapters;
            outlineTotalChaptersRef.current = event.spunChapters.length;
          } else if (event.type === "active_agent") {
            setActiveAgent(event.agent);
          } else if (event.type === "usage" && event.tokens) {
            useAppStore.getState().recordUsage(event.tokens, api.provider, api.model);
            setMetrics(prev => ({ ...prev, tokens: prev.tokens + event.tokens }));
          } else if (event.type === "chapter_started") {
            outlineTotalChaptersRef.current = event.total;
            setCurrentTask(`Drafting Chapter ${event.index} of ${event.total}: ${event.title}`);
            const currentProg = Math.max(5, Math.round(((event.index - 0.7) / event.total) * 85) + 10);
            setGenerationProgress(currentProg);
          } else if (event.type === "chapter_completed") {
            if (event.chapter) {
              const ch = event.chapter as GeneratedChapter;
              const existing = outlineCompletedChaptersRef.current.filter(
                (c) => c.id !== ch.id && c.title !== ch.title
              );
              outlineCompletedChaptersRef.current = [...existing, ch];
            }
            outlineTotalChaptersRef.current = event.total;
            setCurrentTask(`Completed Chapter ${event.index} of ${event.total}: ${event.title}`);
            const currentProg = Math.round((event.index / event.total) * 85) + 10;
            setGenerationProgress(currentProg);
          } else if (event.type === "log") {
            addGenerationLog({ agent: event.agent, message: event.message, status: event.status || "success" });
          } else if (event.type === "final" && event.project) {
            receivedFinal = true;
            setPaused(false);
            setResumeGeneration(null);
            const duration = Math.floor((Date.now() - startTime) / 1000);
            const tokensUsed = useAppStore.getState().generationStatus.sessionTokens || 0;
            setMetrics(prev => ({ ...prev, draftingTime: duration, tokens: tokensUsed }));
            
            addGeneratedProject({
              ...event.project,
              tokensUsed,
            });
            setGenerationProgress(100);
            setCurrentTask("Project generation complete!");
            setTimeout(() => {
              finishGeneration();
              router.push("/editor");
            }, 1500);
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      }

      if (!receivedFinal) {
        const savedCount = outlineCompletedChaptersRef.current.length;
        const total = outlineTotalChaptersRef.current || outlineGenerator.chapters.length;

        if (savedCount > 0) {
          setPaused(true);
          setCurrentTask(`Paused at Chapter ${savedCount + 1} of ${total} (interrupted)`);
          addGenerationLog({
            agent: "System",
            message: `Connection interrupted after Chapter ${savedCount} of ${total}. All completed chapters are safely saved. Click Resume to continue.`,
            status: "error",
          });
          setResumeGeneration(() => runOutlineStream({ isResume: true }));
        } else {
          throw new Error("Connection closed unexpectedly before chapters could be drafted.");
        }
      }
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") return;
      const savedCount = outlineCompletedChaptersRef.current.length;
      const total = outlineTotalChaptersRef.current || outlineGenerator.chapters.length;

      if (savedCount > 0) {
        setPaused(true);
        setCurrentTask(`Paused at Chapter ${savedCount + 1} of ${total} (error)`);
        addGenerationLog({
          agent: "System",
          message: `${error instanceof Error ? error.message : "Generation was interrupted"}. ${savedCount} chapters are safely saved. Click Resume to retry.`,
          status: "error",
        });
        setResumeGeneration(() => runOutlineStream({ isResume: true }));
      } else {
        addGenerationLog({
          agent: "System",
          message: error instanceof Error ? error.message : "Outline generation failed.",
          status: "error",
        });
      }
    } finally {
      abortControllerRef.current = null;
      if (interval) clearInterval(interval);
    }
  };

  const handleGenerateFromOutline = () => runOutlineStream({ isResume: false });

  const handleTranslateProject = async () => {
    // Declared here (not inside `try`) so the `finally` block can clear it.
    let interval: ReturnType<typeof setInterval> | undefined;

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
      title: "Translating your project",
      subtitle: `Rewriting every chapter in ${rewrite.targetLanguage}.`
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

      interval = setInterval(() => {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        setMetrics(prev => ({ ...prev, draftingTime: elapsed }));
      }, 1000);

      let receivedFinal = false;
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
            if (typeof event.message === "string" && event.message.includes("Translating")) {
              setCurrentTask(event.message);
            }
          } else if (event.type === "final" && event.project) {
            receivedFinal = true;
            const duration = Math.floor((Date.now() - startTime) / 1000);
            const tokensUsed = useAppStore.getState().generationStatus.sessionTokens || 0;
            setMetrics(prev => ({ ...prev, draftingTime: duration, tokens: tokensUsed }));
            
            addGeneratedProject({
              ...event.project,
              tokensUsed,
            });
            setGenerationProgress(100);
            setCurrentTask("Translation complete!");
            setTimeout(() => {
              finishGeneration();
              router.push("/editor");
            }, 1500);
          } else if (event.type === "error") {
            throw new Error(event.message);
          }
        }
      }

      if (!receivedFinal) {
        throw new Error("Translation connection closed unexpectedly before completion.");
      }
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') return;
      addGenerationLog({ agent: "System", message: error instanceof Error ? error.message : "Translation failed.", status: "error" });
    } finally {
      abortControllerRef.current = null;
      if (interval) clearInterval(interval);
    }
  };

  return (
    <>
      <div className="page">
        <div className="page-head">
          <div>
            <h1 className="page-title">Rewrite</h1>
            <p className="page-sub">
              Transform an existing manuscript: a quick pass, a multi-agent rewrite, a rebuild from an
              outline, or a translation.
            </p>
          </div>
          <div className="segmented" role="tablist" aria-label="Rewrite mode">
            {[
              { id: "Outline", label: "From outline", icon: "auto_awesome_motion" },
              { id: "Simple", label: "Quick fix", icon: "bolt" },
              { id: "Deep", label: "Deep swarm", icon: "account_tree" },
              { id: "Translate", label: "Translate", icon: "translate" },
            ].map((flow) => (
              <button
                key={flow.id}
                role="tab"
                aria-selected={rewrite.flow === flow.id}
                className="segment"
                data-active={rewrite.flow === flow.id}
                onClick={() => updateRewrite({ flow: flow.id as RewriteFlow })}
                type="button"
              >
                <span className="material-symbols-outlined text-[15px]">{flow.icon}</span>
                {flow.label}
              </button>
            ))}
          </div>
        </div>

        {message ? (
          <div className="mb-4 rounded-[var(--radius-lg)] bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 p-4 text-sm text-emerald-700 dark:text-emerald-400 flex items-center justify-between">
            {message}
            <button onClick={() => setMessage("")} className="text-emerald-900/40 dark:text-emerald-400/40 hover:text-emerald-900 dark:hover:text-emerald-300 transition-colors">
              <span className="material-symbols-outlined text-sm">close</span>
            </button>
          </div>
        ) : null}

        <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_17rem] gap-4 items-start">
          {/* Work surface */}
          <div className="min-w-0">
            {rewrite.flow === "Outline" ? (
              <div className="space-y-3">
                <div className="panel panel-pad">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-x-4 gap-y-3 mb-4">
                    <div>
                      <label htmlFor="ol-title" className="label">Ebook title</label>
                      <input
                        id="ol-title"
                        className="input"
                        placeholder="The Architecture of Tomorrow"
                        type="text"
                        value={outlineGenerator.title || ""}
                        onChange={(e) => updateOutlineGenerator({ title: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor="ol-audience" className="label">Audience</label>
                      <input
                        id="ol-audience"
                        className="input"
                        placeholder="Tech visionaries and architects"
                        type="text"
                        value={outlineGenerator.audience || ""}
                        onChange={(e) => updateOutlineGenerator({ audience: e.target.value })}
                      />
                    </div>
                    <div>
                      <label htmlFor="ol-language" className="label">Language</label>
                      <select
                        id="ol-language"
                        className="select"
                        value={outlineGenerator.language || DEFAULT_LANGUAGE}
                        onChange={(e) => updateOutlineGenerator({ language: e.target.value })}
                      >
                        {LANGUAGE_GROUPS.map((group) => (
                          <optgroup key={group.label} label={group.label}>
                            {group.options.map((lang) => (
                              <option key={lang} value={lang}>{lang}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                      <span className="section-title">
                        Chapters
                        {outlineGenerator.chapters.length > 0 && (
                          <span className="row-meta font-normal ml-1.5">
                            ({outlineGenerator.chapters.length})
                          </span>
                        )}
                      </span>
                      <div className="flex items-center gap-2">
                        <button onClick={openSmartImport} className="btn btn-secondary" type="button">
                          <span className="material-symbols-outlined">text_fields</span>
                          Smart import
                        </button>
                        <button onClick={addOutlineChapter} className="btn btn-secondary" type="button">
                          <span className="material-symbols-outlined">add</span>
                          Add chapter
                        </button>
                      </div>
                    </div>


                    
                    {outlineGenerator.chapters.length === 0 ? (
                      <div className="panel py-8 px-4 text-center">
                        <p className="text-[13px] font-medium text-on-surface">No chapters yet</p>
                        <p className="text-[12.5px] text-on-surface-variant mt-1 max-w-sm mx-auto">
                          Add chapters one at a time, or paste an existing outline and let Smart import
                          build them for you.
                        </p>
                        <div className="flex items-center justify-center gap-2 mt-3">
                          <button onClick={addOutlineChapter} className="btn btn-primary" type="button">
                            <span className="material-symbols-outlined">add</span>
                            Add chapter
                          </button>
                          <button
                            onClick={openSmartImport}
                            className="btn btn-secondary"
                            type="button"
                          >
                            Smart import
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="panel overflow-hidden">
                        {outlineGenerator.chapters.map((ch, idx) => (
                          <div
                            key={ch.id}
                            className="group p-3 border-b border-[var(--hairline)] last:border-b-0"
                          >
                            <div className="flex items-center gap-2.5">
                              <span className="w-5 shrink-0 row-meta text-center">{idx + 1}</span>
                              <input
                                className="flex-1 min-w-0 bg-transparent border-0 outline-none text-[13px] font-semibold text-on-surface placeholder:text-on-surface-variant placeholder:font-normal"
                                placeholder={`Chapter ${idx + 1} title`}
                                aria-label={`Chapter ${idx + 1} title`}
                                value={ch.title || ""}
                                onChange={(e) => updateOutlineChapter(ch.id, { title: e.target.value })}
                              />
                              <button
                                onClick={() => removeOutlineChapter(ch.id)}
                                aria-label={`Remove chapter ${idx + 1}`}
                                className="btn btn-ghost btn-icon btn-sm shrink-0 opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-error"
                                type="button"
                              >
                                <span className="material-symbols-outlined text-[16px]">delete</span>
                              </button>
                            </div>
                            <textarea
                              className="w-full mt-1.5 ml-7 pr-7 bg-transparent border-0 outline-none resize-none text-[12.5px] leading-relaxed text-on-surface-variant placeholder:text-on-surface-variant/70 min-h-[2.5rem]"
                              style={{ width: "calc(100% - 1.75rem)" }}
                              placeholder="What this chapter covers"
                              aria-label={`Chapter ${idx + 1} topics`}
                              value={ch.topics || ""}
                              onChange={(e) => updateOutlineChapter(ch.id, { topics: e.target.value })}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : rewrite.flow === "Translate" ? (
              <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-700 fill-mode-both">
                <div className="bg-white dark:bg-white/[0.03] rounded-[var(--radius-lg)] p-1.5 shadow-2xl shadow-slate-200/50 dark:shadow-none border border-slate-100 dark:border-white/[0.06] overflow-hidden relative">
                  <div className="absolute -top-24 -left-24 w-64 h-64 bg-primary/5 dark:bg-primary/[0.03] rounded-full blur-3xl pointer-events-none" />
                  <div className="bg-slate-50/50 dark:bg-transparent backdrop-blur-sm rounded-[2rem] border border-white dark:border-white/[0.04] p-4 md:p-12 relative z-10">
                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                      <div className="w-8 h-8 rounded-[var(--radius)] bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-primary text-[18px]">translate</span>
                      </div>
                      <div className="flex-1">
                        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
                          <h3 className="text-[15px] font-semibold tracking-[-0.012em] text-on-surface">Universal Translator</h3>
                        </div>
                        <p className="text-on-surface-variant text-sm mb-6 max-w-xl leading-relaxed font-medium">
                          Select an existing project and seamlessly translate it into a new language. The AI acts as a contextual translator, preserving your tone, cultural nuances, and precise formatting.
                        </p>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8">
                          <div className="group">
                            <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase block mb-3 pl-1">Source Project</label>
                            <select
                              className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] rounded-[var(--radius-lg)] px-5 py-2 text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary/20 outline-none transition-all shadow-inner dark:shadow-none text-on-surface"
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
                            <label className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 uppercase block mb-3 pl-1">Target Language</label>
                            <select
                              className="w-full bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] rounded-[var(--radius-lg)] px-5 py-2 text-sm font-bold focus:ring-4 focus:ring-primary/5 focus:border-primary/20 outline-none transition-all shadow-inner dark:shadow-none text-on-surface"
                              value={rewrite.targetLanguage || rewrite.language || "Spanish"}
                              onChange={(e) => updateRewrite({ targetLanguage: e.target.value, language: e.target.value })}
                            >
                              {LANGUAGE_GROUPS.map((group) => (
                                <optgroup key={group.label} label={group.label}>
                                  {group.options.map((lang) => (
                                    <option key={lang} value={lang}>{lang}</option>
                                  ))}
                                </optgroup>
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
              <div className="panel overflow-hidden flex flex-col">
                {/* Toolbar: what this is, plus the two ways to fill it */}
                <div className="panel-head">
                  <span className="panel-title">
                    {rewrite.flow === "Deep" ? "Manuscript" : "Source text"}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className="row-meta">
                      {(rewrite.manuscript || "").split(/\s+/).filter(Boolean).length.toLocaleString()} words
                    </span>
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
                      className="btn btn-secondary btn-sm"
                      type="button"
                    >
                      <span
                        className={`material-symbols-outlined text-[15px] ${extracting ? "animate-spin" : ""}`}
                      >
                        {extracting ? "sync" : "upload_file"}
                      </span>
                      {extracting ? "Extracting…" : "Upload"}
                    </button>
                  </div>
                </div>

                {/* The work surface fills the column instead of floating in it */}
                <textarea
                  aria-label={rewrite.flow === "Deep" ? "Manuscript" : "Source text"}
                  className="w-full flex-1 min-h-[18rem] lg:min-h-[calc(100vh-14rem)] resize-none bg-transparent border-0 outline-none p-4 text-[14px] leading-[1.65] text-on-surface placeholder:text-on-surface-variant"
                  value={rewrite.manuscript || ""}
                  onChange={(event) => updateRewrite({ manuscript: event.target.value })}
                  placeholder={
                    rewrite.flow === "Deep"
                      ? "Paste the full book here, or upload a file. The swarm breaks it into conceptual units before rebuilding it."
                      : "Paste the passages you want polished, or upload a draft."
                  }
                />
              </div>
            )}
          </div>

          {/* Settings rail: one panel, hairline-divided, action pinned last */}
          <aside className="min-w-0 lg:sticky lg:top-[calc(var(--app-header-h)+1rem)]">
            <div className="panel rail overflow-hidden">
              <div className="rail-section">
                <p className="rail-title">Project</p>
                <div className="space-y-2.5">
                  <div>
                    <label htmlFor="rw-title" className="label">Title</label>
                    <input
                      id="rw-title"
                      className="input"
                      placeholder={rewrite.flow === "Outline" ? "From the blueprint" : "My rewritten concept"}
                      type="text"
                      disabled={rewrite.flow === "Outline"}
                      value={(rewrite.flow === "Outline" ? outlineGenerator.title : rewrite.title) || ""}
                      onChange={(e) =>
                        rewrite.flow === "Outline"
                          ? updateOutlineGenerator({ title: e.target.value })
                          : updateRewrite({ title: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <label htmlFor="rw-audience" className="label">Audience</label>
                    <input
                      id="rw-audience"
                      className="input"
                      placeholder="Aspiring developers"
                      type="text"
                      disabled={rewrite.flow === "Outline"}
                      value={(rewrite.flow === "Outline" ? outlineGenerator.audience : rewrite.audience) || ""}
                      onChange={(e) =>
                        rewrite.flow === "Outline"
                          ? updateOutlineGenerator({ audience: e.target.value })
                          : updateRewrite({ audience: e.target.value })
                      }
                    />
                  </div>
                  <div>
                    <div className="flex items-baseline justify-between">
                      <label htmlFor="rw-length" className="label !mb-0">Target length</label>
                      <span className="text-[12px] font-semibold text-on-surface num">
                        {(rewrite.flow === "Outline"
                          ? outlineGenerator.targetLength || 15000
                          : rewrite.length || 20000
                        ).toLocaleString()}
                      </span>
                    </div>
                    <input
                      id="rw-length"
                      className="w-full h-1 mt-2 bg-on-surface/12 rounded-full appearance-none cursor-pointer accent-primary"
                      max="100000"
                      min="1000"
                      step="1000"
                      type="range"
                      value={
                        rewrite.flow === "Outline"
                          ? outlineGenerator.targetLength || 15000
                          : rewrite.length || 20000
                      }
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

              <div className="rail-section">
                <div className="flex items-center justify-between mb-1">
                  <p className="rail-title !mb-0">
                    {rewrite.flow === "Translate" ? "Target language" : "Language"}
                  </p>
                </div>
                <label htmlFor="rw-rail-language" className="sr-only">Language</label>
                <select
                  id="rw-rail-language"
                  className="select"
                  value={
                    rewrite.flow === "Outline"
                      ? outlineGenerator.language || DEFAULT_LANGUAGE
                      : rewrite.flow === "Translate"
                        ? rewrite.targetLanguage || rewrite.language || "Spanish"
                        : rewrite.language || DEFAULT_LANGUAGE
                  }
                  onChange={(e) => {
                    const selected = e.target.value;
                    if (rewrite.flow === "Outline") {
                      updateOutlineGenerator({ language: selected });
                    } else if (rewrite.flow === "Translate") {
                      updateRewrite({ language: selected, targetLanguage: selected });
                    } else {
                      updateRewrite({ language: selected });
                    }
                  }}
                >
                  {LANGUAGE_GROUPS.map((group) => (
                    <optgroup key={group.label} label={group.label}>
                      {group.options.map((lang) => (
                        <option key={lang} value={lang}>{lang}</option>
                      ))}
                    </optgroup>
                  ))}
                </select>
                <p className="hint">
                  {rewrite.flow === "Translate"
                    ? "Chapters will be translated into this language."
                    : "The output manuscript will be written in this language."}
                </p>
              </div>

              <div className="rail-section">
                <p className="rail-title">Voice</p>
                <label htmlFor="rw-tone" className="sr-only">Tone</label>
                <select
                  id="rw-tone"
                  className="select"
                  value={(rewrite.flow === "Outline" ? outlineGenerator.tone : rewrite.tone) || "Professional"}
                  onChange={(e) =>
                    rewrite.flow === "Outline"
                      ? updateOutlineGenerator({ tone: e.target.value })
                      : updateRewrite({ tone: e.target.value })
                  }
                >
                  {TONES.map((tone) => (
                    <option key={tone} value={tone}>{tone}</option>
                  ))}
                </select>
              </div>

              {rewrite.flow !== "Outline" && (
                <div className="rail-section">
                  <p className="rail-title">Audit</p>
                  <div className="space-y-1">
                    <div className="setting">
                      <span className="setting-label">Humanize</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={rewrite.humanize}
                        aria-label="Humanize"
                        className="switch"
                        data-on={rewrite.humanize}
                        onClick={() => updateRewrite({ humanize: !rewrite.humanize })}
                      />
                    </div>
                    <div className="setting">
                      <span className="setting-label">Avoid plagiarism</span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={rewrite.avoidPlagiarism}
                        aria-label="Avoid plagiarism"
                        className="switch"
                        data-on={rewrite.avoidPlagiarism}
                        onClick={() => updateRewrite({ avoidPlagiarism: !rewrite.avoidPlagiarism })}
                      />
                    </div>
                  </div>
                </div>
              )}

              {(metrics.outlineTime > 0 || metrics.draftingTime > 0 || metrics.tokens > 0) && (
                <div className="rail-section">
                  <p className="rail-title">Last run</p>
                  <dl className="space-y-0.5">
                    <div className="kv">
                      <dt>Outline</dt>
                      <dd>{formatTime(metrics.outlineTime)}</dd>
                    </div>
                    <div className="kv">
                      <dt>Drafting</dt>
                      <dd>{formatTime(metrics.draftingTime)}</dd>
                    </div>
                    <div className="kv">
                      <dt>Tokens</dt>
                      <dd>{metrics.tokens.toLocaleString()}</dd>
                    </div>
                  </dl>
                </div>
              )}

              <div className="rail-section">
                <button
                  className="btn btn-primary btn-lg w-full"
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
                      const currentLang = rewrite.language || DEFAULT_LANGUAGE;
                      const text = await generateAiText({
                        api,
                        systemPrompt:
                          `You rewrite manuscript passages for professional authors. If the content provided is an existing author's work, you MUST use it as inspiration but completely rebrand and rewrite it to be original while maintaining the winning structure and logical progression. Do not plagiarize phrasing.\n\n${getLanguageDirective(currentLang)}`,
                        userPrompt: `Rewrite this manuscript in a "${rewrite.tone}" tone in ${currentLang}.\n\nTarget length for this output: ${rewrite.length || 20000} words.\n\nHumanize: ${rewrite.humanize}.\nAvoid plagiarism: ${rewrite.avoidPlagiarism}.\n\nText:\n${rewrite.manuscript}`,
                        temperature: settings.temperature,
                        topP: settings.topP,
                      });

                      const duration = Math.floor((Date.now() - startTime) / 1000);
                      const estimatedTokens = Math.floor(text.split(/\s+/).length * 1.35);
                      setMetrics((prev) => ({ ...prev, draftingTime: duration, tokens: estimatedTokens }));

                      updateRewrite({ preview: text });

                      useAppStore.getState().createProjectFromRewrite();
                      router.push("/editor");
                    } catch {
                      generateRewritePreview();
                      setMessage("AI request failed. Falling back to local.");
                    } finally {
                      setGenerating(false);
                    }
                  }}
                  disabled={generating || isGenerating}
                  type="button"
                >
                  <span className="material-symbols-outlined">
                    {rewrite.flow === "Deep"
                      ? "account_tree"
                      : rewrite.flow === "Outline"
                        ? "auto_awesome_motion"
                        : rewrite.flow === "Translate"
                          ? "translate"
                          : "auto_fix_high"}
                  </span>
                  {generating || isGenerating
                    ? "Working…"
                    : rewrite.flow === "Deep"
                      ? "Run deep swarm"
                      : rewrite.flow === "Outline"
                        ? "Generate from outline"
                        : rewrite.flow === "Translate"
                          ? "Translate project"
                          : "Rewrite"}
                </button>
              </div>
            </div>
          </aside>
        </div>
      </div>
      {/* Smart Import Modal — rendered at top level to avoid backdrop-blur/overflow clipping */}
      {showSmartImport && (
        <div 
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-4"
          style={{ backgroundColor: 'rgba(15, 23, 42, 0.75)' }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowSmartImport(false); }}
        >
          <div 
            className="bg-white dark:bg-[#1a1a2e] rounded-[var(--radius-lg)] sm:rounded-[var(--radius-lg)] w-full max-w-3xl max-h-[92vh] overflow-y-auto shadow-2xl border border-slate-200 dark:border-white/10 animate-in zoom-in-95 fade-in duration-300"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-white dark:bg-[#1a1a2e] rounded-t-3xl sm:rounded-t-[2.5rem] px-8 sm:px-10 pt-8 pb-5 border-b border-slate-100 dark:border-white/[0.06]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div className="w-7 h-7 rounded-[var(--radius)] bg-primary text-white flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                  </div>
                  <div>
                    <h4 className="font-semibold text-lg tracking-tight text-slate-900 dark:text-white">Smart Blueprint Import</h4>
                    <p className="text-xs text-slate-400 dark:text-slate-500 font-semibold">Import existing book structure to regenerate</p>
                  </div>
                </div>
                <button 
                  onClick={() => setShowSmartImport(false)}
                  className="w-10 h-10 rounded-[var(--radius)] bg-slate-100 dark:bg-white/[0.06] hover:bg-slate-200 dark:hover:bg-white/[0.1] flex items-center justify-center text-slate-500 dark:text-slate-400 transition-colors"
                >
                  <span className="material-symbols-outlined text-[17px]">close</span>
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="px-8 sm:px-10 py-8 space-y-7">
              <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
                Provide the <span className="text-indigo-600 dark:text-indigo-400 font-bold">Title, Description, and Curriculum/Outline</span> from an existing book. 
                The system will parse chapters and topics, then regenerate an original outline for your new project.
              </p>

              {/* Title & Language Row */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] mb-2.5 pl-1">
                    <span className="material-symbols-outlined text-sm text-indigo-500">title</span>
                    Ebook Title
                  </label>
                  <input
                    className="w-full min-h-[2.625rem] bg-slate-50 dark:bg-white/[0.05] px-5 py-2.5 rounded-[var(--radius-lg)] text-sm font-semibold border border-slate-200 dark:border-white/[0.08] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all"
                    placeholder="e.g., Marketing Psychology Decoded"
                    value={importTitle}
                    onChange={(e) => setImportTitle(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="smart-import-language" className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] mb-2.5 pl-1">
                    <span className="material-symbols-outlined text-sm text-indigo-500">language</span>
                    Output Language
                  </label>
                  <select
                    id="smart-import-language"
                    className="w-full min-h-[2.625rem] bg-slate-50 dark:bg-[#1a1a2e] px-4 py-2.5 rounded-[var(--radius-lg)] text-sm font-semibold border border-slate-200 dark:border-white/[0.08] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 text-slate-900 dark:text-white transition-all cursor-pointer"
                    value={importLanguage}
                    onChange={(e) => setImportLanguage(e.target.value)}
                  >
                    {LANGUAGE_GROUPS.map((group) => (
                      <optgroup key={group.label} label={group.label} className="bg-white dark:bg-[#1a1a2e] text-slate-900 dark:text-white font-semibold">
                        {group.options.map((lang) => (
                          <option key={lang} value={lang} className="bg-white dark:bg-[#1a1a2e] text-slate-900 dark:text-white">
                            {lang}
                          </option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>
              </div>

              {/* Description Field */}
              <div>
                <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] mb-2.5 pl-1">
                  <span className="material-symbols-outlined text-sm text-indigo-500">description</span>
                  Description / Audience
                </label>
                <textarea
                  className="w-full h-36 bg-slate-50 dark:bg-white/[0.05] px-5 py-3 rounded-[var(--radius-lg)] text-sm font-medium border border-slate-200 dark:border-white/[0.08] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 resize-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all leading-relaxed"
                  placeholder="Exploring consumer behavior, persuasion triggers, and marketing psychology for digital marketers and copywriters..."
                  value={importDescription}
                  onChange={(e) => setImportDescription(e.target.value)}
                />
              </div>

              {/* Outline / Curriculum Field */}
              <div>
                <label className="flex items-center gap-2 text-[11px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-[0.15em] mb-2.5 pl-1">
                  <span className="material-symbols-outlined text-sm text-indigo-500">list_alt</span>
                  Curriculum / Outline
                </label>
                <textarea
                  className="w-full h-64 bg-slate-50 dark:bg-white/[0.05] px-5 py-3 rounded-[var(--radius-lg)] text-sm font-medium border border-slate-200 dark:border-white/[0.08] outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500/30 resize-none text-slate-900 dark:text-white placeholder:text-slate-400 dark:placeholder:text-slate-600 transition-all font-mono leading-relaxed"
                  placeholder={"1. Delving into Minds\n* The psychology of attention\n* Cognitive biases in decision making\n\n2. Persuasion Triggers\n* Social proof and authority\n* Scarcity and urgency"}
                  value={importOutlineText}
                  onChange={(e) => setImportOutlineText(e.target.value)}
                />
              </div>
            </div>

            {/* Footer */}
            <div className="sticky bottom-0 bg-white dark:bg-[#1a1a2e] rounded-b-3xl sm:rounded-b-[2.5rem] px-8 sm:px-10 pb-8 pt-5 border-t border-slate-100 dark:border-white/[0.06]">
              <button 
                className="btn btn-primary btn-lg w-full"
                disabled={!importTitle.trim() && !importOutlineText.trim()}
                onClick={() => {
                  const combinedText = `${importTitle}\nDESCRIPTION\n${importDescription}\nCURRICULUM\n${importOutlineText}`;
                  importOutlineFromText(combinedText, importLanguage);
                  updateOutlineGenerator({ language: importLanguage });
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
