"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { generateAiText } from "@/lib/ai-client";
import { useAppStore } from "@/lib/app-store";
import Editor from "@/components/ui/Editor";
import { mdToHtml } from "@/lib/markdown-utils";

export default function BlogGeneratorPage() {
  const router = useRouter();
  const projects = useAppStore((state) => state.projects);
  const blog = useAppStore((state) => state.blog);
  const api = useAppStore((state) => state.api);
  const settings = useAppStore((state) => state.settings);
  const regenerateBlogSuggestions = useAppStore((state) => state.regenerateBlogSuggestions);
  const updateBlog = useAppStore((state) => state.updateBlog);
  const loadBlogFromProject = useAppStore((state) => state.loadBlogFromProject);
  const setCurrentProject = useAppStore((state) => state.setCurrentProject);
  const [message, setMessage] = useState("");
  const [generatingSuggestions, setGeneratingSuggestions] = useState(false);
  const [generatingDraft, setGeneratingDraft] = useState(false);
  const [blogDraftTime, setBlogDraftTime] = useState<number | null>(null);
  const [blogTokens, setBlogTokens] = useState<number>(0);

  const selectedProject = projects.find((project) => project.id === blog.projectId) ?? projects[0];
  const suggestions = blog?.suggestions || [];
  const keywords = blog?.keywords || [];
  const targetWords = blog?.targetWords || 1000;

  useEffect(() => {
    if (projects.length > 0 && (!blog.projectId || !projects.find(p => p.id === blog.projectId))) {
      loadBlogFromProject(projects[0].id);
    }
  }, [projects, blog.projectId, loadBlogFromProject]);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}m ${s}s`;
  };

  if (!blog || !projects) return null;

  const handleRefreshSuggestions = async () => {
                if (!selectedProject || !api.baseUrl || !api.model || (!api.apiKey && api.provider !== "ollama")) {
                  regenerateBlogSuggestions();
                  setMessage("Generated local title suggestions. Add API settings for live AI suggestions.");
                  return;
                }

                setGeneratingSuggestions(true);
                try {
                  const text = await generateAiText({
                    api,
                    systemPrompt:
                      "You create blog headline options for authors turning ebook concepts into content marketing. Return exactly three distinct titles, one per line.",
                    userPrompt: `Project title: ${selectedProject.title}\nAudience: ${selectedProject.audience}\nTone: ${selectedProject.tone}\nDescription: ${selectedProject.description}`,
                    temperature: settings.temperature,
                    topP: settings.topP,
                  });
                  const suggestions = text
                    .split("\n")
                    .map((line) => line.replace(/^[\-\d\.\)\s]+/, "").trim())
                    .filter(Boolean)
                    .slice(0, 3);
                  updateBlog({ suggestions: suggestions.length ? suggestions : (blog?.suggestions || []) });
                  setMessage("Fresh AI title suggestions generated.");
                } catch (error) {
                  regenerateBlogSuggestions();
                  setMessage(
                    `AI suggestions failed, so local suggestions were used instead. ${
                      error instanceof Error ? error.message : "Unknown error."
                    }`,
                  );
                } finally {
                  setGeneratingSuggestions(false);
                }
                };

  return (
    <div className="page grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_17rem] gap-4 items-start">
      <div className="min-w-0">
        <AnimatePresence>
          {message && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mb-6 rounded-[var(--radius-lg)] bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 p-4 text-sm text-emerald-700 dark:text-emerald-400 overflow-hidden"
            >
              {message}
            </motion.div>
          )}
        </AnimatePresence>

        <div className="panel min-h-[calc(100vh-8rem)] flex flex-col overflow-hidden">
          <div className="panel-head">
            <span className="row-meta">Saved {blog.lastSavedLabel}</span>
            <div className="flex items-center gap-1">
              <button
                className="btn btn-ghost btn-sm"
                onClick={async () => {
                  if (!selectedProject) return;
                  if (!api.baseUrl || !api.model || (!api.apiKey && api.provider !== "ollama")) {
                    setMessage("Add API settings first to generate a live AI draft.");
                    return;
                  }

                  setGeneratingDraft(true);
                  const startTime = Date.now();
                  try {
                    const text = await generateAiText({
                      api,
                      systemPrompt:
                        "You write polished blog drafts that repurpose ebook concepts into clear, engaging articles. Return only the draft body. Use Markdown for formatting.",
                      userPrompt: `Write a blog post based on this source project.\n\nTitle: ${blog.title}\nProject: ${selectedProject.title}\nAudience: ${selectedProject.audience}\nTone: ${selectedProject.tone}\nDescription: ${selectedProject.description}\nKeywords: ${keywords.join(", ")}\nMeta description: ${blog.metaDescription}\n\nTarget length: about ${targetWords} words.`,
                      temperature: 0.7,
                      topP: 1,
                    });
                    
                    const duration = Math.floor((Date.now() - startTime) / 1000);
                    const wordCount = text.split(/\s+/).length;
                    const estimatedTokens = Math.floor(wordCount * 1.35);

                    updateBlog({ draft: mdToHtml(text) });
                    setBlogDraftTime(duration);
                    setBlogTokens(estimatedTokens);
                    setMessage(`AI draft (~${targetWords} words) generated and inserted into the canvas.`);
                  } catch (error) {
                    setMessage(error instanceof Error ? error.message : "AI draft generation failed.");
                  } finally {
                    setGeneratingDraft(false);
                  }
                }}
                disabled={generatingDraft}
                type="button"
              >
                {generatingDraft ? "Drafting..." : "Draft With AI"}
              </button>
              <button
                className="text-[10px] font-semibold tracking-wider uppercase text-on-surface-variant hover:text-primary transition-colors"
                onClick={() => {
                  if (typeof window === "undefined") return;
                  const blob = new Blob([`${blog.title}\n\n${blog.draft}`], { type: "text/plain" });
                  const url = window.URL.createObjectURL(blob);
                  const link = document.createElement("a");
                  link.href = url;
                  link.download = `${blog.title.toLowerCase().replace(/[^a-z0-9]+/g, "-") || "writerdost-blog"}.txt`;
                  link.click();
                  window.URL.revokeObjectURL(url);
                }}
                type="button"
              >
                Export
              </button>
              <button
                className="text-[10px] font-semibold tracking-wider uppercase text-on-surface-variant hover:text-rose-500 transition-colors"
                onClick={() => {
                  if (window.confirm("Are you sure you want to clear the entire blog canvas? This cannot be undone.")) {
                    updateBlog({ title: "", draft: "" });
                    setMessage("Blog canvas has been reset.");
                  }
                }}
                type="button"
              >
                Reset
              </button>
            </div>
          </div>

          <div className="px-4 py-3 flex flex-col gap-2.5 bg-surface-container-lowest flex-1 min-w-0">
            <input
              className="w-full text-[19px] font-semibold tracking-[-0.018em] outline-none bg-transparent text-on-surface placeholder:text-on-surface-variant"
              value={blog.title || ""}
              onChange={(event) => updateBlog({ title: event.target.value })}
              aria-label="Post title"
              placeholder="Post title"
            />
            <div className="flex flex-wrap gap-2">
              {keywords.map((keyword) => (
                <span key={keyword} className="rounded-full bg-surface-container-low px-2 py-0.5 text-[10px] font-bold text-slate-500 dark:text-slate-400 border border-outline-variant/10 dark:border-white/[0.06]">
                  {keyword}
                </span>
              ))}
            </div>
            
            <div className="mt-2 border-t border-surface-container-low pt-4">
              <Editor 
                content={blog.draft || ""}
                onChange={(content) => updateBlog({ draft: content })}
              />
            </div>
          </div>
        </div>
      </div>

      <aside className="min-w-0 lg:sticky lg:top-[calc(var(--app-header-h)+1rem)]">
        <div className="panel rail overflow-hidden">
          <div className="rail-section">
            <label htmlFor="bg-project" className="label">Source project</label>
            <select
              id="bg-project"
              className="select"
              value={blog.projectId || ""}
              onChange={(event) => loadBlogFromProject(event.target.value)}
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.title}</option>
              ))}
            </select>
            {selectedProject && (
              <button
                className="btn btn-ghost btn-sm mt-1.5 -ml-2"
                onClick={() => {
                  setCurrentProject(selectedProject.id);
                  router.push("/editor");
                }}
                type="button"
              >
                Open source draft
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </button>
            )}
          </div>

          <div className="rail-section">
            <div className="flex items-baseline justify-between">
              <label htmlFor="bg-length" className="label !mb-0">Target length</label>
              <span className="text-[12px] font-semibold text-on-surface num">{targetWords} words</span>
            </div>
            <input
              id="bg-length"
              type="range"
              min="500"
              max="3000"
              step="100"
              value={targetWords}
              onChange={(e) => updateBlog({ targetWords: parseInt(e.target.value) })}
              className="w-full h-1 mt-2 bg-on-surface/12 rounded-full appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[11px] text-on-surface-variant mt-1.5">
              <span>500</span>
              <span>3,000</span>
            </div>
          </div>

          <div className="rail-section">
            <div className="flex items-center justify-between mb-2">
              <p className="rail-title !mb-0">Title ideas</p>
              <button
                className="btn btn-ghost btn-sm -mr-1.5"
                onClick={handleRefreshSuggestions}
                disabled={generatingSuggestions}
                type="button"
              >
                {generatingSuggestions ? "Refreshing…" : "Refresh"}
              </button>
            </div>
            <div className="space-y-1">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion}
                  className="w-full text-left p-2 rounded-[var(--radius)] border border-[var(--hairline)] hover:border-primary hover:bg-primary/[0.05] transition-colors cursor-pointer group"
                  onClick={() => updateBlog({ title: suggestion })}
                  type="button"
                >
                  <span className="block text-[12.5px] leading-snug text-on-surface group-hover:text-primary">
                    {suggestion}
                  </span>
                </button>
              ))}
              {suggestions.length === 0 && (
                <p className="text-[12px] text-on-surface-variant">No suggestions yet.</p>
              )}
            </div>
          </div>

          <div className="rail-section">
            <p className="rail-title">SEO</p>
            <div className="flex flex-wrap gap-1 mb-3">
              {keywords.map((keyword) => (
                <button
                  key={keyword}
                  className="chip bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                  title={`Add "${keyword}" to the draft`}
                  onClick={() =>
                    updateBlog({
                      draft: `${blog.draft || ""}<p><strong>Keyword to emphasize:</strong> ${keyword}</p>`,
                    })
                  }
                  type="button"
                >
                  {keyword}
                </button>
              ))}
            </div>
            <label htmlFor="bg-meta" className="label">Meta description</label>
            <textarea
              id="bg-meta"
              className="textarea min-h-[4.5rem] text-[12px]"
              value={blog.metaDescription || ""}
              onChange={(event) => updateBlog({ metaDescription: event.target.value })}
            />
          </div>

          {(blogDraftTime !== null || blogTokens > 0) && (
            <div className="rail-section">
              <p className="rail-title">Last run</p>
              <dl className="space-y-0.5">
                <div className="kv">
                  <dt>Drafting</dt>
                  <dd>{blogDraftTime !== null ? formatTime(blogDraftTime) : "—"}</dd>
                </div>
                <div className="kv">
                  <dt>Tokens</dt>
                  <dd>{blogTokens.toLocaleString()}</dd>
                </div>
              </dl>
            </div>
          )}
        </div>
      </aside>
    </div>
  );
}
