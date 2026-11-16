"use client";

import Link from "next/link";
import Editor from "@/components/ui/Editor";
import { CoverSettings } from "@/components/CoverSettings";
import { StageBar } from "@/components/StageBar";
import { fontStack, findFont, loadGoogleFont, DEFAULT_BODY_FONT, DEFAULT_HEADING_FONT } from "@/lib/fonts";
import { DesignSettings } from "@/components/DesignSettings";
import { ProjectMetrics } from "@/components/ProjectMetrics";
import SafeHtml from "@/components/SafeHtml";
import { generateAiText } from "@/lib/ai-client";
import { apiFetch } from "@/lib/api-client";
import { useAppStore, type ProjectChapter } from "@/lib/app-store";
import { findChapterById, findProjectById, calculateProjectWords, robustParseJson, STREAM_DELIMITER } from "@/lib/app-utils";
import { htmlToText, mdToHtml } from "@/lib/markdown-utils";
import { PublishDialog } from "@/components/PublishDialog";
import { KdpLaunchModal } from "@/components/KdpLaunchModal";
import { MARKETPLACE, isMarketplaceReady, marketplaceBlocker, publishToMarketplace } from "@/lib/marketplace";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
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
  const [kdpModalOpen, setKdpModalOpen] = useState(false);
  const [mobileChaptersOpen, setMobileChaptersOpen] = useState(false);
  const [mobileToolsOpen, setMobileToolsOpen] = useState(false);
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  // Declared before the effects below: a dependency array is evaluated during
  // render, so anything a hook reads must already be initialized at that point.
  const project = findProjectById(projects, currentProjectId ?? "");

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

  useEffect(() => {
    if (project?.designSettings?.bodyFont) {
      const bf = findFont(project.designSettings.bodyFont, DEFAULT_BODY_FONT);
      if (bf?.isGoogleFont) loadGoogleFont(bf.family);
    }
    if (project?.designSettings?.headingFont) {
      const hf = findFont(project.designSettings.headingFont, DEFAULT_HEADING_FONT);
      if (hf?.isGoogleFont) loadGoogleFont(hf.family);
    }
  }, [project?.designSettings?.bodyFont, project?.designSettings?.headingFont]);

  const handleDraftContent = async () => {
    if (!project) return;
    startGeneration({ 
      title: "Drafting this chapter",
      subtitle: "Writing the section from your outline and project settings."
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

      const response = await apiFetch("/api/draft-chapters", {
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
            } else if (event.type === "usage" && typeof event.tokens === "number") {
              const usageRes = useAppStore.getState().recordUsage(event.tokens, api.provider, api.model);
              if (useAppStore.getState().preferredEngine === "bizai" && !usageRes.allowed) {
                controller.abort();
                addGenerationLog({
                  agent: "Wallet Guard",
                  message: `⚠️ Drafting halted: Credit balance exhausted (0 credits remaining). Live deduction: ${usageRes.creditsDeducted.toLocaleString()} cr. Please top up your wallet to continue.`,
                  status: "error",
                });
                break;
              }
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
      title: "Adding front and back matter",
      subtitle: "Title page, copyright, dedication and closing pages."
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

      const response = await apiFetch("/api/generate-wrappers", {
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

  const chapter = findChapterById(project, activeChapterId ?? "");
  const chapterIndex = project?.chapters.findIndex((item) => item.id === chapter?.id) ?? 0;
  const listed = project?.publish?.status === "published";
 
  if (!project || !chapter) {
    // The ordinary state for a new account: there is nothing to edit until a
    // book exists, so point at the two ways to make one.
    return (
      <div className="page">
        <div className="panel panel-pad text-center py-12">
          <span className="material-symbols-outlined text-[28px] text-on-surface-variant">
            menu_book
          </span>
          <h1 className="page-title mt-2">
            {projects.length === 0 ? "No ebooks yet" : "No ebook open"}
          </h1>
          <p className="page-sub mx-auto max-w-md">
            {projects.length === 0
              ? "Describe a book on the New ebook page and the agents will research, plan and draft it for you."
              : "Pick a project to carry on writing, or start a new one."}
          </p>
          <div className="flex items-center justify-center gap-2 mt-5">
            <Link href="/create" className="btn btn-primary btn-lg">
              <span className="material-symbols-outlined">auto_awesome</span>
              New ebook
            </Link>
            {projects.length > 0 && (
              <Link href="/projects" className="btn btn-secondary btn-lg">
                Open a project
              </Link>
            )}
          </div>
        </div>
      </div>
    );
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
              className="bg-white shadow-2xl shadow-black/10 relative w-full max-w-[816px] min-h-[500px] sm:min-h-[1056px] p-6 sm:p-16 md:p-24 box-border mx-auto"
            >
              <div className="flex flex-col items-center justify-center h-full min-h-[360px] sm:min-h-[864px]">
                <h1 className="text-3xl sm:text-5xl font-bold text-slate-900 text-center mb-6 leading-tight">{project.title}</h1>
                <p className="text-base sm:text-lg text-slate-500 italic text-center">Manuscript Version 1.0</p>
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
              className="bg-white shadow-2xl shadow-black/10 relative chapter-page w-full max-w-[816px] min-h-[500px] sm:min-h-[1056px] p-5 sm:p-14 md:p-24 box-border mx-auto"
            >
              <SafeHtml
                className="prose max-w-none text-slate-800 prose-headings:text-slate-900 prose-headings:font-bold"
                style={{
                  color: "#1e293b",
                  fontFamily: "var(--body-font)",
                }}
                html={ch.content}
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
        "hidden md:flex bg-surface-container-low overflow-x-hidden border-r border-transparent no-print transition-all duration-300 flex-col h-full shrink-0",
        isEditorSidebarCollapsed ? "w-14 px-1.5 py-2 items-center" : "w-64"
      )}>
        {/* Top Section: Settings & Tools (Placed on Top) */}
        <div className={clsx("shrink-0 w-full", isEditorSidebarCollapsed ? "mb-2" : "px-3 pt-3 pb-2 space-y-2.5")}>
          {/* Header Row: Title & Collapse Button */}
          <div className={clsx("flex items-center w-full", isEditorSidebarCollapsed ? "mb-2 justify-center" : "justify-between")}>
            {!isEditorSidebarCollapsed && (
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">Project Tools</span>
            )}
            <button 
              onClick={toggleEditorSidebar}
              className="btn btn-ghost btn-icon btn-sm shrink-0"
              aria-label={isEditorSidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <span className="material-symbols-outlined text-[17px]">{isEditorSidebarCollapsed ? 'left_panel_open' : 'left_panel_close'}</span>
            </button>
          </div>

          {!isEditorSidebarCollapsed ? (
            /* Compact Collapsible Tools Stack on Top */
            <div className="space-y-1.5">
              <CoverSettings projectId={project.id} />
              <DesignSettings projectId={project.id} />
              <ProjectMetrics project={project} />

              {/* Amazon KDP Launch Kit Launch Button */}
              <button
                type="button"
                onClick={() => setKdpModalOpen(true)}
                className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-[var(--radius-lg)] border border-amber-500/30 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent hover:border-amber-500/60 transition-all text-left group"
              >
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-amber-500 text-sm group-hover:scale-110 transition-transform">
                    rocket_launch
                  </span>
                  <span className="text-[10px] font-bold text-on-surface">
                    KDP Launch Kit
                  </span>
                </div>
                <span className="material-symbols-outlined text-slate-400 text-xs group-hover:translate-x-0.5 transition-transform">
                  chevron_right
                </span>
              </button>
            </div>
          ) : (
            /* Quick Access Icon Buttons When Collapsed */
            <div className="flex flex-col items-center gap-1.5 mb-2">
              <button
                onClick={toggleEditorSidebar}
                title="Cover Image"
                className="w-9 h-9 rounded-[var(--radius)] flex items-center justify-center text-slate-400 hover:text-primary hover:bg-surface-container-highest/40 transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">image</span>
              </button>
              <button
                onClick={toggleEditorSidebar}
                title="Typography & Spacing"
                className="w-9 h-9 rounded-[var(--radius)] flex items-center justify-center text-slate-400 hover:text-primary hover:bg-surface-container-highest/40 transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">text_fields</span>
              </button>
              <button
                onClick={toggleEditorSidebar}
                title={`Project Metrics (~${Math.round((project.tokensUsed || 0) * 1.5).toLocaleString()} cr)`}
                className="w-9 h-9 rounded-[var(--radius)] flex items-center justify-center text-slate-400 hover:text-primary hover:bg-surface-container-highest/40 transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">query_stats</span>
              </button>
              <button
                onClick={() => setKdpModalOpen(true)}
                title="Amazon KDP Launch Kit"
                className="w-9 h-9 rounded-[var(--radius)] flex items-center justify-center text-amber-500 hover:bg-amber-500/15 transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
              </button>
            </div>
          )}

          {/* Chapters Section Header & Actions */}
          <div className={clsx("pt-2 border-t border-outline-variant/10", isEditorSidebarCollapsed ? "w-full" : "")}>
            <div className={clsx("flex items-center w-full mb-1.5", isEditorSidebarCollapsed ? "justify-center" : "justify-between")}>
              {!isEditorSidebarCollapsed && (
                <span className="section-title flex items-center gap-1.5">
                  Chapters
                  <span className="text-[10px] font-normal text-slate-500">
                    ({project.chapters.length})
                  </span>
                </span>
              )}
            </div>
            <div className={clsx("flex w-full", isEditorSidebarCollapsed ? "flex-col items-center gap-2" : "items-center justify-between gap-1.5")}>
               <button 
                 onClick={() => setFullView(true)}
                 title="Full Manuscript View"
                 className={clsx(
                   "text-primary transition-all flex items-center",
                   isEditorSidebarCollapsed ? "w-10 h-10 justify-center bg-primary/10 rounded-[var(--radius)] hover:bg-primary/20" : "text-[10px] font-semibold hover:underline gap-1 py-1"
                 )}
                 type="button"
               >
                 <span className={clsx("material-symbols-outlined", isEditorSidebarCollapsed ? "text-lg" : "text-xs")}>auto_stories</span>
                 {!isEditorSidebarCollapsed && "FULL VIEW"}
               </button>
               <button 
                 onClick={() => {
                   const title = window.prompt("Chapter Title:");
                   if (title && project) addChapter(project.id, title);
                 }}
                 title="Add Chapter"
                 className={clsx(
                   "text-emerald-600 transition-all flex items-center",
                   isEditorSidebarCollapsed ? "w-10 h-10 justify-center bg-emerald-600/10 rounded-[var(--radius)] hover:bg-emerald-600/20" : "text-[10px] font-semibold hover:scale-105 gap-1 py-1"
                 )}
                 type="button"
               >
                 <span className={clsx("material-symbols-outlined", isEditorSidebarCollapsed ? "text-lg" : "text-xs")}>add_circle</span>
                 {!isEditorSidebarCollapsed && "ADD CHAPTER"}
               </button>
            </div>
          </div>
        </div>

        {/* Scrollable Chapter List */}
        <div className={clsx(
          "flex-1 min-h-0 overflow-y-auto overflow-x-hidden pt-1 pb-4",
          isEditorSidebarCollapsed ? "w-full px-1.5" : "px-3"
        )}>
          <div className="space-y-1.5 w-full">
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
                  !isEditorSidebarCollapsed && "mr-1 text-sm",
                  isEditorSidebarCollapsed && "text-xl",
                  item.status === "Done" ? "text-primary" : item.status === "In Progress" ? "text-indigo-400" : "text-slate-300 dark:text-slate-600 group-hover:text-slate-400"
                )}>
                  {item.status === "Done" ? "check_circle" : item.status === "In Progress" ? "pending" : "circle"}
                </span>
                {!isEditorSidebarCollapsed && (
                  <>
                    <div className="flex-1 min-w-0 pr-1">
                      <p className={`text-xs font-semibold truncate ${item.id === chapter.id ? "text-on-surface" : "text-on-surface-variant"}`}>{item.title}</p>
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
                      type="button"
                    >
                      delete
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
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
        {/* Mobile Sub-Header: Chapter Selector & Navigation (md:hidden) */}
        <div className="md:hidden shrink-0 border-b border-[var(--hairline)] bg-surface-container-low/95 backdrop-blur-md px-3 py-2 flex items-center justify-between gap-2 no-print">
          <button
            type="button"
            onClick={() => setMobileChaptersOpen(true)}
            className="flex-1 min-w-0 flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-on-surface/[0.05] active:bg-on-surface/[0.09] text-left transition-colors"
          >
            <span className="material-symbols-outlined text-[18px] text-primary shrink-0">
              menu_book
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[12px] font-semibold text-on-surface truncate">
                {chapter.title}
              </p>
              <p className="text-[10px] text-on-surface-variant truncate">
                Chapter {project.chapters.findIndex((c) => c.id === chapter.id) + 1} of {project.chapters.length} · {chapter.wordCount.toLocaleString()} words
              </p>
            </div>
            <span className="material-symbols-outlined text-[16px] text-on-surface-variant shrink-0">
              unfold_more
            </span>
          </button>

          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              disabled={project.chapters.findIndex((c) => c.id === chapter.id) <= 0}
              onClick={() => {
                const idx = project.chapters.findIndex((c) => c.id === chapter.id);
                if (idx > 0) setActiveChapter(project.chapters[idx - 1].id);
              }}
              aria-label="Previous Chapter"
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-on-surface/[0.05] active:scale-95 text-on-surface disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_left</span>
            </button>
            <button
              type="button"
              disabled={project.chapters.findIndex((c) => c.id === chapter.id) >= project.chapters.length - 1}
              onClick={() => {
                const idx = project.chapters.findIndex((c) => c.id === chapter.id);
                if (idx < project.chapters.length - 1) setActiveChapter(project.chapters[idx + 1].id);
              }}
              aria-label="Next Chapter"
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-on-surface/[0.05] active:scale-95 text-on-surface disabled:opacity-30 disabled:pointer-events-none transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">chevron_right</span>
            </button>
            <button
              type="button"
              onClick={() => setMobileToolsOpen(true)}
              aria-label="Project Tools"
              className="w-8 h-8 rounded-lg flex items-center justify-center bg-on-surface/[0.05] active:scale-95 text-on-surface hover:text-primary transition-all"
            >
              <span className="material-symbols-outlined text-[18px]">tune</span>
            </button>
          </div>
        </div>
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

    {/* Mobile Chapters Drawer */}
    <AnimatePresence>
      {mobileChaptersOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileChaptersOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative z-10 w-full max-h-[85vh] bg-surface-container-high border-t border-[var(--hairline)] rounded-t-[28px] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Grab Handle */}
            <div className="pt-3 pb-1 flex justify-center">
              <div className="w-10 h-1 rounded-full bg-on-surface/20" />
            </div>

            {/* Header */}
            <div className="px-5 py-3 flex items-center justify-between border-b border-[var(--hairline)]">
              <div>
                <h3 className="text-base font-bold text-on-surface">Manuscript Chapters</h3>
                <p className="text-xs text-on-surface-variant">
                  {project.chapters.length} chapter{project.chapters.length === 1 ? "" : "s"} · {calculateProjectWords(project).toLocaleString()} total words
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setFullView(!fullView);
                    setMobileChaptersOpen(false);
                  }}
                  className={clsx(
                    "px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors min-h-[38px]",
                    fullView ? "bg-primary text-on-primary" : "bg-on-surface/[0.08] text-on-surface"
                  )}
                >
                  <span className="material-symbols-outlined text-[16px]">menu_book</span>
                  <span>{fullView ? "Chapter" : "Full View"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => setMobileChaptersOpen(false)}
                  className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-on-surface/[0.08]"
                  aria-label="Close"
                >
                  <span className="material-symbols-outlined text-[20px]">close</span>
                </button>
              </div>
            </div>

            {/* Chapters List */}
            <div className="flex-1 overflow-y-auto px-4 py-3 space-y-2">
              {project.chapters.map((item, index) => {
                const isActive = item.id === chapter.id && !fullView;
                return (
                  <div
                    key={item.id}
                    onClick={() => {
                      setMessage("");
                      setFullView(false);
                      setActiveChapter(item.id);
                      setMobileChaptersOpen(false);
                    }}
                    role="button"
                    tabIndex={0}
                    className={clsx(
                      "w-full p-3.5 rounded-2xl flex items-center gap-3 text-left transition-all cursor-pointer border min-h-[56px]",
                      isActive
                        ? "bg-primary/10 border-primary/40 shadow-sm"
                        : "bg-surface-container border-[var(--hairline)] hover:bg-surface-container-highest"
                    )}
                  >
                    <div
                      className={clsx(
                        "w-8 h-8 rounded-xl flex items-center justify-center font-bold text-xs shrink-0",
                        isActive ? "bg-primary text-on-primary" : "bg-on-surface/10 text-on-surface-variant"
                      )}
                    >
                      {index + 1}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={clsx("text-sm font-semibold truncate", isActive ? "text-primary" : "text-on-surface")}>
                        {item.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-on-surface-variant">
                          {item.wordCount.toLocaleString()} words
                        </span>
                        <span className="text-[11px] text-on-surface-variant">·</span>
                        <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-md bg-on-surface/[0.06] text-on-surface-variant">
                          {item.status}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      {isActive && (
                        <span className="material-symbols-outlined text-primary text-[20px]">
                          check_circle
                        </span>
                      )}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (window.confirm(`Delete "${item.title}"?`)) {
                            deleteChapter(project.id, item.id);
                          }
                        }}
                        className="w-9 h-9 rounded-xl flex items-center justify-center text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                        aria-label={`Delete ${item.title}`}
                      >
                        <span className="material-symbols-outlined text-[18px]">delete</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bottom Sheet Actions */}
            <div className="p-4 border-t border-[var(--hairline)] bg-surface-container-high/90 backdrop-blur-sm pb-[max(1.25rem,env(safe-area-inset-bottom))]">
              <button
                type="button"
                onClick={() => {
                  const title = window.prompt("Chapter Title:");
                  if (title && project) {
                    addChapter(project.id, title);
                    setMessage(`Added chapter "${title}".`);
                  }
                }}
                className="w-full h-12 rounded-2xl bg-primary text-on-primary font-semibold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.99] transition-transform"
              >
                <span className="material-symbols-outlined text-[20px]">add</span>
                <span>Add Chapter</span>
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {/* Mobile Project Tools Drawer */}
    <AnimatePresence>
      {mobileToolsOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex flex-col justify-end">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            onClick={() => setMobileToolsOpen(false)}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 28, stiffness: 300 }}
            className="relative z-10 w-full max-h-[85vh] bg-surface-container-high border-t border-[var(--hairline)] rounded-t-[28px] shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Grab Handle */}
            <div className="pt-3 pb-1 flex justify-center">
              <div className="w-10 h-1 rounded-full bg-on-surface/20" />
            </div>

            {/* Header */}
            <div className="px-5 py-3 flex items-center justify-between border-b border-[var(--hairline)]">
              <div>
                <h3 className="text-base font-bold text-on-surface">Project Tools</h3>
                <p className="text-xs text-on-surface-variant">Design, cover & manuscript settings</p>
              </div>
              <button
                type="button"
                onClick={() => setMobileToolsOpen(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center text-on-surface-variant hover:bg-on-surface/[0.08]"
                aria-label="Close"
              >
                <span className="material-symbols-outlined text-[20px]">close</span>
              </button>
            </div>

            {/* Tools Content */}
            <div className="flex-1 overflow-y-auto p-4 space-y-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
              <div className="bg-surface-container rounded-2xl p-4 border border-[var(--hairline)]">
                <CoverSettings projectId={project.id} />
              </div>
              <div className="bg-surface-container rounded-2xl p-4 border border-[var(--hairline)]">
                <DesignSettings projectId={project.id} />
              </div>
              <div className="bg-surface-container rounded-2xl p-4 border border-[var(--hairline)]">
                <ProjectMetrics project={project} />
              </div>
              <div className="bg-surface-container rounded-2xl p-4 border border-amber-500/30 bg-amber-500/5">
                <button
                  type="button"
                  onClick={() => {
                    setMobileToolsOpen(false);
                    setKdpModalOpen(true);
                  }}
                  className="w-full flex items-center justify-between text-left"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-8 h-8 rounded-lg bg-amber-500 text-white flex items-center justify-center">
                      <span className="material-symbols-outlined text-sm">rocket_launch</span>
                    </span>
                    <div>
                      <h4 className="text-xs font-bold text-on-surface">Amazon KDP Launch Kit</h4>
                      <p className="text-[10px] text-on-surface-variant">Keywords, description, BISAC categories</p>
                    </div>
                  </div>
                  <span className="material-symbols-outlined text-slate-400 text-sm">chevron_right</span>
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>

    {publishOpen && (
      <PublishDialog
        projectId={project.id}
        onClose={() => setPublishOpen(false)}
        onDone={setMessage}
      />
    )}

    {kdpModalOpen && (
      <KdpLaunchModal
        projectId={project.id}
        isOpen={kdpModalOpen}
        onClose={() => setKdpModalOpen(false)}
      />
    )}
  </div>
);
}
