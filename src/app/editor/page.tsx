"use client";

import Editor from "@/components/ui/Editor";
import { CoverSettings } from "@/components/CoverSettings";
import { StageBar } from "@/components/StageBar";
import { fontStack, DEFAULT_BODY_FONT, DEFAULT_HEADING_FONT } from "@/lib/fonts";
import { DesignSettings } from "@/components/DesignSettings";
import { generateAiText } from "@/lib/ai-client";
import { useAppStore, type ProjectChapter } from "@/lib/app-store";
import { findChapterById, findProjectById, calculateProjectWords, robustParseJson, STREAM_DELIMITER } from "@/lib/app-utils";
import { htmlToText, mdToHtml } from "@/lib/markdown-utils";
import { PublishDialog } from "@/components/PublishDialog";
import { MARKETPLACE, isMarketplaceReady, marketplaceBlocker, publishToMarketplace } from "@/lib/marketplace";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import clsx from "clsx";


export default function EditorPage() {
  const projects = useAppStore((state) => state.projects);
  const currentProjectId = useAppStore((state) => state.currentProjectId);
  const activeChapterId = useAppStore((state) => state.activeChapterId);
  const api = useAppStore((state) => state.api);
  const settings = useAppStore((state) => state.settings);
  const setActiveChapter = useAppStore((state) => state.setActiveChapter);
  const finalizeProject = useAppStore((state) => state.finalizeProject);
  const unfinalizeProject = useAppStore((state) => state.unfinalizeProject);
  const updateChapterContent = useAppStore((state) => state.updateChapterContent);
  const updateChapterContentById = useAppStore((state) => state.updateChapterContentById);
  const startGeneration = useAppStore((state) => state.startGeneration);
  const finishGeneration = useAppStore((state) => state.finishGeneration);
  const applyDraftToProject = useAppStore((state) => state.applyDraftToProject);
  const addGenerationLog = useAppStore((state) => state.addGenerationLog);
  const setGenerationProgress = useAppStore((state) => state.setGenerationProgress);
  const setActiveAgent = useAppStore((state) => state.setActiveAgent);
  const setCurrentTask = useAppStore((state) => state.setCurrentTask);
  const addChapter = useAppStore((state) => state.addChapter);
  const profile = useAppStore((state) => state.profile);
  const deleteChapter = useAppStore((state) => state.deleteChapter);
  const isEditorSidebarCollapsed = useAppStore((state) => state.isEditorSidebarCollapsed);
  const toggleEditorSidebar = useAppStore((state) => state.toggleEditorSidebar);
  const isGenerating = useAppStore((state) => state.generationStatus.isGenerating);
  // Lives in the store, not local state: the header's PDF export switches the
  // editor into full view so the export is the whole book, not one chapter.
  const fullView = useAppStore((state) => state.isManuscriptFullView);
  const setFullView = useAppStore((state) => state.setManuscriptFullView);
  
  const platform = useAppStore((state) => state.platform);
  const setProjectPublishState = useAppStore((state) => state.setProjectPublishState);

  const router = useRouter();
  const [aiAssistLoading, setAiAssistLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [publishOpen, setPublishOpen] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (activeChapterId) {
      // Immediate reset
      if (scrollContainerRef.current) scrollContainerRef.current.scrollTop = 0;
      window.scrollTo(0, 0);

      // Delayed reset to ensure dynamic content has finished layout
      const timer = setTimeout(() => {
        if (scrollContainerRef.current) {
          scrollContainerRef.current.scrollTop = 0;
        }
        window.scrollTo(0, 0);
      }, 100);
      
      return () => clearTimeout(timer);
    }
  }, [activeChapterId]);

  const handleDraftContent = async () => {
    if (!project) return;
    startGeneration({ 
      title: "Manuscript Drafting Phase", 
      subtitle: "Agents collaborating in real-time to refine your manuscript." 
    });
    setGenerationProgress(5);
    setActiveAgent("Writing Agent");

    try {
      // eslint-disable-next-line react-hooks/purity -- runs in a click handler, not during render
      const draftStartTime = Date.now();
      const controller = new AbortController();
      setAbortController(controller);
      // Read outside the render path (this runs in a click handler), so the
      // store snapshot cannot desync from what React rendered.
      useAppStore.getState().setCancelGeneration(handleCancelGeneration);

      const response = await fetch("/api/draft-chapters", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, api, settings }),
        signal: controller.signal,
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split(STREAM_DELIMITER);
        buffer = parts.pop() || "";

        for (const part of parts) {
          if (!part.trim()) continue;
          if (part.includes("[DONE]")) continue;

          try {
            const event = robustParseJson(part);
            if (!event) continue;
            if (event.type === "active_agent") {
              setActiveAgent(event.agent);
            } else if (event.type === "chapter_started") {
              setCurrentTask(`Working on Chapter ${event.index} of ${event.total}: ${event.title}`);
              const p = useAppStore.getState().generationStatus?.progress || 0;
              setGenerationProgress(Math.max(p, Math.round(((event.index - 0.5) / event.total) * 85) + 10));
            } else if (event.type === "chapter_completed") {
              const currentProgress = Math.round((event.index / event.total) * 85) + 10;
              setGenerationProgress(currentProgress);
              setCurrentTask(`Finished drafting Chapter ${event.index}: ${event.title}`);
              addGenerationLog({ 
                agent: "Writing Agent", 
                message: `Progress: ${event.index} of ${event.total} chapters completed.`, 
                status: "success" 
              });
            } else if (event.type === "log") {
              addGenerationLog({ agent: event.agent, message: event.message, status: event.status });
              if (event.agent === "Manuscript Agent") {
                 setGenerationProgress(98);
                 setCurrentTask("Finalizing manuscript...");
              }
            } else if (event.type === "ping") {
               // Heartbeat received, helps UI know server is still alive
               console.log("Pipeline heartbeat received.");
            } else if (event.type === "usage" && typeof event.tokens === "number") {
              useAppStore.getState().recordUsage(event.tokens, api.provider, api.model);
            } else if (event.type === "final" && event.project) {
              setGenerationProgress(100);
              const draftedWordCount = calculateProjectWords(event.project);
              
              // Record timing in the global history with word count
              // eslint-disable-next-line react-hooks/purity -- runs in a click handler, not during render
              const sessionDuration = Math.round((Date.now() - draftStartTime) / 1000);
              const sessionTokens = useAppStore.getState().generationStatus.sessionTokens || 0;
              
              useAppStore.getState().recordTiming(0, sessionDuration, draftedWordCount);
              
              applyDraftToProject(project.id, {
                ...event.project,
                draftDuration: (project.draftDuration || 0) + sessionDuration,
                tokensUsed: (project.tokensUsed || 0) + sessionTokens,
              });
            } else if (event.type === "error") {
              throw new Error(String(event.message));
            }
          } catch (e) {
            console.error("Parse error:", e);
          }
        }
      }
    } catch (error: unknown) {
      if (error instanceof Error && error.name === "AbortError") {
        addGenerationLog({ agent: "System", message: "Drafting paused.", status: "error" });
      } else {
        addGenerationLog({ agent: "System", message: (error instanceof Error ? error.message : String(error)) || "Drafting failed.", status: "error" });
      }
    } finally {
      setTimeout(() => {
        finishGeneration();
        setAbortController(null);
      }, 1500);
    }
  };

  const handleGenerateWrappers = async () => {
    if (!project) return;
    startGeneration({ 
      title: "eBook Wrapper Pipeline", 
      subtitle: "Designing professional front and back matter for your eBook." 
    });
    setGenerationProgress(5);
    setActiveAgent("Manuscript Agent");

    try {
      // eslint-disable-next-line react-hooks/purity -- runs in a click handler, not during render
      const wrapperStartTime = Date.now();
      const controller = new AbortController();
      setAbortController(controller);
      // Read outside the render path (this runs in a click handler), so the
      // store snapshot cannot desync from what React rendered.
      useAppStore.getState().setCancelGeneration(handleCancelGeneration);

      const response = await fetch("/api/generate-wrappers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ project, api, settings, profile }),
        signal: controller.signal,
      });

      if (!response.body) throw new Error("No response body");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const parts = buffer.split(STREAM_DELIMITER);
        buffer = parts.pop() || "";

        for (const part of parts) {
          if (!part.trim()) continue;
          try {
            const event = robustParseJson(part);
            if (!event) continue;
            if (event.type === "active_agent") {
              setActiveAgent(event.agent);
            } else if (event.type === "log") {
              addGenerationLog({ agent: event.agent, message: event.message, status: event.status });
            } else if (event.type === "final" && event.wrappers) {
              setGenerationProgress(100);
              
              const newChapters = [...project.chapters];
              
              // Smart merge to handle placeholders and correct positioning
              event.wrappers.forEach((wrapper: ProjectChapter) => {
                // Find if a placeholder with a similar title exists
                const existingIndex = newChapters.findIndex(ch => 
                  ch.title.toLowerCase() === wrapper.title.toLowerCase() || 
                  (ch.title.toLowerCase().includes("next steps") && wrapper.title.toLowerCase().includes("next steps")) ||
                  (ch.title.toLowerCase().includes("copyright") && wrapper.title.toLowerCase().includes("copyright"))
                );
                
                if (existingIndex !== -1) {
                  // Replace the placeholder with the generated content.
                  // We use the new wrapper ID so the UI knows the wrappers have been generated (hides the button).
                  newChapters[existingIndex] = { ...newChapters[existingIndex], ...wrapper, id: wrapper.id };
                } else {
                  // No placeholder found, insert it in the correct position
                  if (wrapper.id.startsWith("front-")) {
                    // Insert after the last front-matter chapter, or at the very beginning
                    let insertIndex = 0;
                    for (let i = 0; i < newChapters.length; i++) {
                      if (newChapters[i].id.startsWith("front-")) {
                        insertIndex = i + 1;
                      } else {
                        break;
                      }
                    }
                    newChapters.splice(insertIndex, 0, wrapper);
                  } else {
                    // Back matter (CTA) goes at the very end
                    newChapters.push(wrapper);
                  }
                }
              });

              // eslint-disable-next-line react-hooks/purity -- runs in a click handler, not during render
              const sessionDuration = Math.round((Date.now() - wrapperStartTime) / 1000);
              const sessionTokens = useAppStore.getState().generationStatus.sessionTokens || 0;

              applyDraftToProject(project.id, {
                chapters: newChapters,
                draftDuration: (project.draftDuration || 0) + sessionDuration,
                tokensUsed: (project.tokensUsed || 0) + sessionTokens,
              });
              setMessage("eBook wrappers (Front/Back matter) successfully generated and added.");
            } else if (event.type === "error") {
              throw new Error(String(event.message));
            }
          } catch (e) {
            console.error("Parse error:", e);
          }
        }
      }
    } catch (error: unknown) {
      setMessage((error instanceof Error ? error.message : String(error)) || "Wrapper generation failed.");
      addGenerationLog({ agent: "System", message: (error instanceof Error ? error.message : String(error)) || "Wrapper generation failed.", status: "error" });
    } finally {
      setTimeout(() => {
        finishGeneration();
        setAbortController(null);
      }, 1500);
    }
  };

  const handleCancelGeneration = () => {
    if (abortController) abortController.abort();
  };

  /**
   * Runs when the author marks a project Ready and Settings → API has
   * auto-publish on. No dialog: it uses the saved listing defaults.
   */
  const handleAutoPublish = async () => {
    if (!project) return;
    setProjectPublishState(project.id, { status: "publishing", error: undefined });
    try {
      const result = await publishToMarketplace(
        project,
        platform,
        {
          price: platform.defaultPrice,
          currency: platform.currency,
          category: platform.defaultCategory,
          license: platform.defaultLicense,
          formats: platform.defaultFormats,
          visibility: platform.defaultVisibility,
          summary: project.description,
          keywords: project.seoKeywords,
        },
        project.publish?.revision ?? 0,
      );
      setProjectPublishState(project.id, {
        status: "published",
        listingId: result.listingId,
        listingUrl: result.listingUrl,
        publishedAt: result.publishedAt,
        revision: result.revision,
        price: platform.defaultPrice,
        currency: platform.currency,
        category: platform.defaultCategory,
        license: platform.defaultLicense,
        formats: platform.defaultFormats,
        visibility: result.visibility,
        error: undefined,
      });
      setMessage(`Published to ${MARKETPLACE.shortName} as ${result.listingId}.`);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Publishing failed.";
      setProjectPublishState(project.id, { status: "failed", error: text });
      setMessage(`Auto-publish failed: ${text}`);
    }
  };

  const project = findProjectById(projects, currentProjectId ?? "");
  const chapter = findChapterById(project, activeChapterId ?? "");
  const chapterIndex = project?.chapters.findIndex((item) => item.id === chapter?.id) ?? 0;
  const listed = project?.publish?.status === "published";
 
  if (!project || !chapter) {
    return <div className="p-8">No project loaded.</div>;
  }

  const handleFinish = () => {
    if (isGenerating) {
      handleCancelGeneration();
      finishGeneration();
    }
    finalizeProject(project.id);
    setMessage("Project marked as 'Ready'. You can now export the manuscript from the header.");
    if (platform.autoPublishOnReady && isMarketplaceReady(platform)) {
      void handleAutoPublish();
    }
  };

  const handleReopen = () => {
    unfinalizeProject(project.id);
    setMessage("Project re-opened for generation and editing.");
  };

  const publishBlocker = marketplaceBlocker(platform);
  const publishLabel = publishBlocker
    ? "Set up publishing"
    : listed
      ? "Update listing"
      : `Publish to ${MARKETPLACE.shortName}`;
 
  if (fullView) {
    return (
      <div 
        className="flex-1 bg-slate-200 dark:bg-[#2a2a2a] overflow-y-auto manuscript-container custom-typography-container"
        style={{
          "--body-font": fontStack(project.designSettings?.bodyFont, DEFAULT_BODY_FONT),
          "--heading-font": fontStack(project.designSettings?.headingFont, DEFAULT_HEADING_FONT),
          "--h1-size": project.designSettings?.h1Size || "48px",
          "--h2-size": project.designSettings?.h2Size || "32px",
          "--h3-size": project.designSettings?.h3Size || "24px",
          "--h4-size": project.designSettings?.h4Size || "20px",
          "--p-size": project.designSettings?.pSize || "16px",
          "--line-height": project.designSettings?.lineHeight || "1.6",
          "--p-margin-before": project.designSettings?.paragraphBefore || "0px",
          "--p-margin-after": project.designSettings?.paragraphAfter || "12px",
        } as React.CSSProperties}
      >
        {/* Fixed Back Button */}
        <div className="fixed top-24 right-8 z-50 no-print">
          <button 
            onClick={() => setFullView(false)}
            className="flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-full text-xs font-bold shadow-xl shadow-primary/30 hover:shadow-primary/50 hover:scale-105 active:scale-95 transition-all"
          >
            <span className="material-symbols-outlined text-sm">edit_note</span>
            Back to Editor
          </button>
        </div>

        {/* Pages */}
        <div className="py-10 flex flex-col items-center gap-10">
          {/* Cover art. Page one of the book and of the exported PDF. */}
          {project.coverImage && (
            <div
              className="bg-white shadow-2xl shadow-black/10 relative overflow-hidden cover-page"
              style={{
                width: "816px",
                height: "1056px",
                boxSizing: "border-box",
              }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={project.coverImage}
                alt={`${project.title} cover`}
                className="w-full h-full object-cover"
              />
            </div>
          )}

          {/* Auto Title Page (if no custom title page exists) */}
          {!project.chapters.find(ch => ch.id === 'front-title-page') && (
            <div 
              className="bg-white shadow-2xl shadow-black/10 relative"
              style={{ 
                width: "816px", 
                minHeight: "1056px", 
                padding: "96px",
                boxSizing: "border-box",
              }}
            >
              <div className="flex flex-col items-center justify-center h-full" style={{ minHeight: "864px" }}>
                <h1 className="text-5xl font-bold text-slate-900 text-center mb-6 leading-tight">{project.title}</h1>
                <p className="text-lg text-slate-500 italic text-center">Manuscript Version 1.0</p>
              </div>
              <div className="absolute bottom-8 left-0 right-0 text-center">
                <span className="text-[10px] text-slate-300 font-medium">i</span>
              </div>
            </div>
          )}

          {/* Chapter Pages */}
          {(project?.chapters ?? []).map((ch, idx) => (
            <div 
              key={ch.id}
              className="bg-white shadow-2xl shadow-black/10 relative chapter-page"
              style={{ 
                width: "816px", 
                minHeight: "1056px", 
                padding: "96px",
                boxSizing: "border-box",
              }}
            >
              <div 
                className="prose max-w-none text-slate-800 prose-headings:text-slate-900 prose-headings:font-bold"
                style={{ 
                  color: "#1e293b",
                  fontFamily: "var(--body-font)",
                }}
                dangerouslySetInnerHTML={{ __html: ch.content }}
              />
              {/* Page Number */}
              <div className="absolute bottom-8 left-0 right-0 text-center">
                <span className="text-[10px] text-slate-300 font-medium">
                  {!project.chapters.find(c => c.id === 'front-title-page') ? idx + 2 : idx + 1}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 overflow-hidden h-full">
      <aside className={clsx(
        "bg-surface-container-low overflow-x-hidden border-r border-transparent no-print transition-all duration-300 flex flex-col h-full",
        isEditorSidebarCollapsed ? "w-14 px-1.5 py-2 items-center" : "w-60"
      )}>
        {/* Fixed Top */}
        <div className={clsx("shrink-0", isEditorSidebarCollapsed ? "mb-2 w-full" : "px-3 pt-3 pb-2")}>
          <div className={clsx("flex items-center w-full", isEditorSidebarCollapsed ? "mb-3 justify-center" : "mb-4 justify-between")}>
            {!isEditorSidebarCollapsed && <span className="section-title">Chapters</span>}
            <button 
              onClick={toggleEditorSidebar}
              className="btn btn-ghost btn-icon btn-sm shrink-0"
              aria-label={isEditorSidebarCollapsed ? "Expand chapter list" : "Collapse chapter list"}
            >
              <span className="material-symbols-outlined text-[17px]">{isEditorSidebarCollapsed ? 'left_panel_open' : 'left_panel_close'}</span>
            </button>
          </div>
          <div className={clsx("flex w-full", isEditorSidebarCollapsed ? "flex-col items-center gap-3" : "items-center justify-between")}>
             <button 
               onClick={() => setFullView(true)}
               title="Full Manuscript View"
               className={clsx(
                 "text-primary transition-all flex items-center",
                 isEditorSidebarCollapsed ? "w-12 h-12 justify-center bg-primary/10 rounded-[var(--radius)] hover:bg-primary/20" : "text-[10px] font-semibold hover:underline gap-1"
               )}
             >
               <span className={clsx("material-symbols-outlined", isEditorSidebarCollapsed ? "text-xl" : "text-xs")}>auto_stories</span>
               {!isEditorSidebarCollapsed && "FULL MANUSCRIPT VIEW"}
             </button>
             <button 
               onClick={() => {
                 const title = window.prompt("Chapter Title:");
                 if (title && project) addChapter(project.id, title);
               }}
               title="Add Chapter"
               className={clsx(
                 "text-emerald-600 transition-all flex items-center",
                 isEditorSidebarCollapsed ? "w-12 h-12 justify-center bg-emerald-600/10 rounded-[var(--radius)] hover:bg-emerald-600/20" : "text-[10px] font-semibold hover:scale-105 gap-1"
               )}
             >
               <span className={clsx("material-symbols-outlined", isEditorSidebarCollapsed ? "text-xl" : "text-xs")}>add_circle</span>
               {!isEditorSidebarCollapsed && "ADD CHAPTER"}
             </button>
          </div>
        </div>

        {/* Scrollable Chapter List */}
        <div className={clsx(
          "flex-1 min-h-0 overflow-y-auto overflow-x-hidden",
          isEditorSidebarCollapsed ? "w-full px-2" : "px-6"
        )}>
          <div className="space-y-2 w-full">
            {(project?.chapters ?? []).map((item) => (
              <div
                key={item.id}
                className={
                  item.id === chapter.id
                    ? "group flex items-center gap-2 p-2 rounded-[var(--radius)] bg-primary/10 text-primary w-full text-left cursor-pointer"
                    : "group flex items-center gap-2 p-2 rounded-[var(--radius)] hover:bg-on-surface/[0.055] transition-colors w-full text-left cursor-pointer"
                }
                title={isEditorSidebarCollapsed ? `${item.title} (${item.wordCount} words)` : undefined}
                onClick={() => {
                  setMessage("");
                  setActiveChapter(item.id);
                }}
                role="button"
                tabIndex={0}
              >
                <span className={clsx(
                  "material-symbols-outlined font-bold shrink-0 transition-colors", 
                  !isEditorSidebarCollapsed && "mr-3 text-sm",
                  isEditorSidebarCollapsed && "text-xl",
                  item.status === "Done" ? "text-primary" : item.status === "In Progress" ? "text-indigo-400" : "text-slate-300 dark:text-slate-600 group-hover:text-slate-400"
                )}>
                  {item.status === "Done" ? "check_circle" : item.status === "In Progress" ? "pending" : "circle"}
                </span>
                {!isEditorSidebarCollapsed && (
                  <>
                    <div className="flex-1 min-w-0 pr-2">
                      <p className={`text-xs font-bold truncate ${item.id === chapter.id ? "text-on-surface" : "text-on-surface-variant"}`}>{item.title}</p>
                      <p className="text-[10px] text-slate-500">{item.wordCount.toLocaleString()} words • {item.status}</p>
                    </div>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm(`Delete "${item.title}"?`)) {
                          deleteChapter(project.id, item.id);
                        }
                      }}
                      className="material-symbols-outlined text-slate-300 dark:text-slate-600 hover:text-rose-400 text-sm transition-colors p-1"
                    >
                      delete
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Fixed Bottom: Cover, Typography + Metrics */}
        <div className={clsx(
          "shrink-0 border-t border-outline-variant/10 overflow-y-auto",
          isEditorSidebarCollapsed ? "w-full px-2 py-3 max-h-[40%]" : "px-6 py-4 space-y-3 max-h-[50%]"
        )}>
          {!isEditorSidebarCollapsed && (
            <div className="space-y-3 pt-3">
              <CoverSettings projectId={project.id} />
              <DesignSettings projectId={project.id} />
              <div className="w-full">
                <p className="rail-title">Project Metrics</p>
                <dl className="panel panel-pad">
                  <div className="kv">
                    <dt>Outline time</dt>
                    <dd className="num">{project.outlineDuration !== undefined ? `${Math.floor(project.outlineDuration / 60)}m ${project.outlineDuration % 60}s` : "0m 0s"}</dd>
                  </div>
                  <div className="kv">
                    <dt>Drafting time</dt>
                    <dd className="num">{project.draftDuration !== undefined ? `${Math.floor(project.draftDuration / 60)}m ${project.draftDuration % 60}s` : "0m 0s"}</dd>
                  </div>
                  <div className="kv">
                    <dt>Tokens used</dt>
                    <dd className="num">{project.tokensUsed?.toLocaleString() || "0"}</dd>
                  </div>
                </dl>
              </div>
            </div>
          )}
        </div>
      </aside>

      <main 
        className="flex-1 flex flex-col h-full bg-surface-container-lowest relative"
        style={{
          "--body-font": fontStack(project.designSettings?.bodyFont, DEFAULT_BODY_FONT),
          "--heading-font": fontStack(project.designSettings?.headingFont, DEFAULT_HEADING_FONT),
          "--h1-size": project.designSettings?.h1Size || "48px",
          "--h2-size": project.designSettings?.h2Size || "32px",
          "--h3-size": project.designSettings?.h3Size || "24px",
          "--h4-size": project.designSettings?.h4Size || "20px",
          "--p-size": project.designSettings?.pSize || "16px",
          "--line-height": project.designSettings?.lineHeight || "1.6",
          "--p-margin-before": project.designSettings?.paragraphBefore || "0px",
          "--p-margin-after": project.designSettings?.paragraphAfter || "12px",
        } as React.CSSProperties}
      >
        <StageBar
          project={project}
          isGenerating={isGenerating}
          actions={{
            draft: { onClick: handleDraftContent },
            wrappers: { onClick: handleGenerateWrappers },
            finish: { onClick: handleFinish },
            preview: { onClick: () => setFullView(true) },
            reopen: { onClick: handleReopen },
            publish: {
              label: publishLabel,
              title:
                publishBlocker ??
                (listed
                  ? `Update the ${MARKETPLACE.shortName} listing`
                  : `Publish to ${MARKETPLACE.shortName}`),
              onClick: () => {
                if (publishBlocker) {
                  router.push("/settings?tab=api");
                  return;
                }
                setPublishOpen(true);
              },
            },
          }}
          statusNote={
            listed && project.publish?.listingId ? (
              <p className="text-[11px] text-emerald-600 dark:text-emerald-400 font-semibold">
                Listed as {project.publish.listingId} · rev {project.publish.revision}
              </p>
            ) : project.publish?.status === "failed" ? (
              <p className="text-[11px] text-error font-semibold">
                Last publish failed: {project.publish.error}
              </p>
            ) : null
          }
        />

        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 scroll-smooth custom-typography-container">
          <div className="w-full max-w-[46rem] mx-auto">
            <div className="flex items-baseline justify-between gap-4 mb-4 no-print">
              <h2 className="text-[17px] font-semibold tracking-[-0.017em] text-on-surface truncate">
                {chapter.title}
              </h2>
              <span className="row-meta shrink-0 whitespace-nowrap">
                {chapter.wordCount.toLocaleString()} / {calculateProjectWords(project).toLocaleString()} words
              </span>
            </div>

          {message ? (
            <div
              className={`mb-4 rounded-[var(--radius-lg)] p-4 text-sm ${
                message.toLowerCase().includes("error") ||
                message.toLowerCase().includes("failed") ||
                message.toLowerCase().includes("rate-limit")
                  ? "border border-rose-100 dark:border-rose-500/20 bg-rose-50 dark:bg-rose-500/10 text-rose-700 dark:text-rose-400"
                  : "border border-emerald-100 dark:border-emerald-500/20 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-400"
              }`}
            >
              {message}
            </div>
          ) : null}

          <Editor
            content={chapter.content}
            onChange={updateChapterContent}
            aiAssistLoading={aiAssistLoading}
            onAiAssist={async (instruction, selection, mode, targetWords, insertReplacement) => {
              const targetProjectId = project.id;
              const targetChapterId = chapter.id;

              if (!api.baseUrl || !api.model || (!api.apiKey && api.provider !== "ollama")) {
                setMessage("Please add API settings to use Interactive AI Assist.");
                return;
              }

              const isExpand = mode === "expand";
              setAiAssistLoading(true);
              
              startGeneration();
              setGenerationProgress(15);
              setActiveAgent("Editorial Agent");
              setCurrentTask(isExpand ? "Expanding chapter content..." : `Executing instruction`);
              addGenerationLog({
                agent: "Editorial Agent",
                message: isExpand ? `Expanding content by ~${targetWords} words...` : `Instruction: "${instruction}"`,
                status: "pending"
              });

              try {
                const fullChapterText = htmlToText(chapter.content);
                
                const text = await generateAiText({
                  api,
                  systemPrompt: `You are the Writerdost Editorial Agent. 
                  Task: ${isExpand ? "EXPAND the content" : "Execute the author's instruction"}.
                  Context: 
                  - Book Title: ${project.title}
                  - Target Tone: ${project.tone}
                  - Chapter: ${chapter.title}
                  ${isExpand ? `- TARGET LENGTH: Aim for approximately ${targetWords || 500} words.` : ""}
                  
                  Rules:
                  - ${isExpand ? "Generate substantial new prose that fits perfectly into the existing chapter flow. Do not repeat existing content." : "Return ONLY the revised version of the text. Do not explain."}
                  - NEVER include meta-commentary like "Here is the revised text".
                  - Return Markdown format (matches Tiptap).`,
                  userPrompt: isExpand 
                    ? `Instruction: ${instruction || "Add more related context and depth to this chapter."}
                       
                       FULL CHAPTER CONTEXT:
                       """
                       ${fullChapterText}
                       """
                       
                       Please write ~${targetWords || 500} new words of related content that would logically follow the current narrative or expand on the core themes.`
                    : `Instruction: ${instruction || "Improve this text."}
                       ${selection ? `Text to edit: "${selection}"` : `Context (last 500 chars): "${fullChapterText.slice(-500)}"`}`,
                  temperature: 0.7,
                  topP: 1,
                });

                const resultHtml = mdToHtml(text);

                if (isExpand) {
                   // Always append for expansion
                   updateChapterContentById(targetProjectId, targetChapterId, `${chapter.content}${resultHtml}`);
                   addGenerationLog({ agent: "Editorial Agent", message: `Expanded the chapter by ~${targetWords} words.`, status: "success" });
                   setMessage(`AI successfully expanded the chapter by ~${targetWords} words.`);
                } else if (selection && insertReplacement) {
                   // Let Editor correctly replace the targeted text block
                   insertReplacement(resultHtml);
                   addGenerationLog({ agent: "Editorial Agent", message: `Instruction executed successfully.`, status: "success" });
                   setMessage(`AI successfully executed: "${instruction}"`);
                } else {
                   updateChapterContentById(targetProjectId, targetChapterId, `${chapter.content}${resultHtml}`);
                   addGenerationLog({ agent: "Editorial Agent", message: `AI added new content based on your instruction.`, status: "success" });
                   setMessage("AI added new content based on your instruction.");
                }
                
                setGenerationProgress(100);
              } catch (error) {
                addGenerationLog({ agent: "Editorial Agent", message: error instanceof Error ? (error instanceof Error ? error.message : String(error)) : "AI assist failed.", status: "error" });
                setMessage(error instanceof Error ? (error instanceof Error ? error.message : String(error)) : "AI assist failed.");
              } finally {
                setAiAssistLoading(false);
                setTimeout(() => finishGeneration(), 2000);
              }
            }}
          />

          <div className="mt-12 flex items-center justify-between px-8 no-print">
            <button
              className="flex items-center text-slate-400 hover:text-primary transition-colors disabled:opacity-30"
              disabled={chapterIndex <= 0}
              onClick={() => {
                const previous = project.chapters[chapterIndex - 1];
                if (previous) {
                  setMessage("");
                  setActiveChapter(previous.id);
                }
              }}
              type="button"
            >
              <span className="material-symbols-outlined mr-2">arrow_back</span>
              <span className="text-sm font-bold">{project.chapters[chapterIndex - 1]?.title ?? "Previous"}</span>
            </button>
            <div className="text-slate-300 text-sm font-medium">
              {chapterIndex + 1} / {project.chapters.length} Chapters
            </div>
            <button
              className="flex items-center text-slate-400 hover:text-primary transition-colors disabled:opacity-30"
              disabled={chapterIndex >= project.chapters.length - 1}
              onClick={() => {
                const next = project.chapters[chapterIndex + 1];
                if (next) {
                  setMessage("");
                  setActiveChapter(next.id);
                }
              }}
              type="button"
            >
              <span className="text-sm font-bold">{project.chapters[chapterIndex + 1]?.title ?? "Next"}</span>
              <span className="material-symbols-outlined ml-2">arrow_forward</span>
            </button>
          </div>
        </div>
      </div>
    </main>

    {publishOpen && (
      <PublishDialog
        projectId={project.id}
        onClose={() => setPublishOpen(false)}
        onDone={setMessage}
      />
    )}
  </div>
);
}
