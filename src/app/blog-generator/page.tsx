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

  return (
    <div className="page grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
      <div className="lg:col-span-4 flex flex-col gap-4">
        <section className="bg-surface-container-low p-4 rounded-[var(--radius)] flex flex-col gap-4">
          <h2 className="text-xs font-bold text-on-surface-variant uppercase">Context</h2>
          <div className="flex flex-col gap-2">
            <label className="text-sm font-semibold text-on-surface/70">Select Project / Ebook</label>
            <div className="relative">
              <select
                className="w-full bg-surface-container-lowest border-none rounded-[var(--radius)] py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20 appearance-none outline-none"
                value={blog.projectId || ""}
                onChange={(event) => loadBlogFromProject(event.target.value)}
              >
                {projects.map((project) => (
                  <option key={project.id} value={project.id}>
                    {project.title}
                  </option>
                ))}
              </select>
              <span className="material-symbols-outlined absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none text-on-surface-variant">expand_more</span>
            </div>
          </div>
        </section>

        <section className="bg-surface-container-low p-4 rounded-[var(--radius)] flex flex-col gap-4">
          <h2 className="text-xs font-bold text-on-surface-variant uppercase">Length Setting</h2>
          <div className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold text-on-surface/70">Estimated Words</span>
              <span className="text-sm font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-md">{targetWords}</span>
            </div>
            <input 
              type="range" 
              min="500" 
              max="3000" 
              step="100" 
              value={targetWords} 
              onChange={(e) => updateBlog({ targetWords: parseInt(e.target.value) })}
              className="w-full h-2 bg-surface-container-lowest rounded-[var(--radius)] appearance-none cursor-pointer accent-primary"
            />
            <div className="flex justify-between text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-tighter">
              <span>500 words</span>
              <span>3000 words</span>
            </div>
          </div>
        </section>

        <section className="bg-surface-container-low p-4 rounded-[var(--radius)] flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-xs font-bold text-on-surface-variant uppercase">AI Title Suggestions</h2>
            <button
              className="text-primary text-xs font-bold hover:underline disabled:opacity-60"
              onClick={async () => {
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
              }}
              disabled={generatingSuggestions}
              type="button"
            >
              {generatingSuggestions ? "Refreshing..." : "Refresh"}
            </button>
          </div>
          <div className="flex flex-col gap-3">
            {suggestions.map((suggestion) => (
              <button
                key={suggestion}
                className="bg-surface-container-lowest dark:bg-white/[0.03] p-2.5 rounded-[var(--radius)] border border-[var(--hairline-strong)] hover:border-primary hover:bg-primary/[0.05] transition-colors cursor-pointer group text-left"
                onClick={() => updateBlog({ title: suggestion })}
                type="button"
              >
                <span className="block text-[12.5px] font-medium leading-snug text-on-surface group-hover:text-primary">
                  {suggestion}
                </span>
              </button>
            ))}
          </div>
        </section>

        <section className="bg-surface-container-low p-4 rounded-[var(--radius)] flex flex-col gap-4">
          <h2 className="text-xs font-bold text-on-surface-variant uppercase">SEO Strategy</h2>
          <div className="flex flex-wrap gap-2">
            {keywords.map((keyword) => (
              <button
                key={keyword}
                className="bg-primary/10 text-primary px-3 py-1 rounded-full text-xs font-semibold hover:bg-primary/20 transition-all"
                onClick={() => updateBlog({ draft: `${blog.draft || ""}<p><strong>Keyword to emphasize:</strong> ${keyword}</p>` })}
                type="button"
              >
                {keyword}
              </button>
            ))}
          </div>
          <div className="mt-2">
            <label className="text-xs font-semibold text-on-surface/50 mb-1 block">Meta Description</label>
            <textarea
              className="w-full min-h-24 rounded-[var(--radius)] bg-surface-container-lowest p-4 text-xs outline-none focus:ring-2 focus:ring-primary/20"
              value={blog.metaDescription || ""}
              onChange={(event) => updateBlog({ metaDescription: event.target.value })}
            />
          </div>
        </section>

        <section className="bg-surface-container-low p-4 rounded-[var(--radius)] flex flex-col gap-4">
          <h2 className="text-xs font-bold text-on-surface-variant uppercase">Blog Metrics</h2>
          <div className="flex flex-col gap-4 bg-surface-container-lowest p-4 rounded-[var(--radius)] border border-outline-variant/10">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-400">Drafting Time</span>
              <span className="text-xs font-bold text-indigo-500">{blogDraftTime !== null ? formatTime(blogDraftTime) : "0m 0s"}</span>
            </div>
            <div className="h-px bg-slate-100 dark:bg-white/[0.04] w-full" />
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-semibold text-slate-400">Tokens Used</span>
              <span className="text-xs font-bold text-slate-900 dark:text-slate-200">{blogTokens.toLocaleString()}</span>
            </div>
          </div>
        </section>

        <section className="bg-slate-900 dark:bg-primary/10 text-white dark:text-on-surface p-4 rounded-[var(--radius)] border border-transparent dark:border-primary/20">
          <p className="text-xs uppercase text-slate-400 font-bold mb-2">Source Project</p>
          <h3 className="text-2xl font-semibold">{selectedProject?.title}</h3>
          <p className="text-sm text-slate-300 mt-3">{selectedProject?.description}</p>
          <button
            className="mt-5 rounded-full bg-white/10 px-4 py-2 text-xs font-bold"
            onClick={() => {
              if (selectedProject) {
                setCurrentProject(selectedProject.id);
              }
              router.push("/editor");
            }}
            type="button"
          >
            Open Source Draft
          </button>
        </section>
      </div>

      <div className="lg:col-span-8">
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

        <div className="bg-white dark:bg-white/[0.03] shadow-sm dark:shadow-none ring-1 ring-black/5 dark:ring-white/[0.06] rounded-[var(--radius-lg)] min-h-[800px] flex flex-col border border-outline-variant/10 dark:border-white/[0.06] overflow-hidden">
          <div className="px-8 py-2 flex items-center justify-between border-b border-surface-container-low">
            <div className="flex items-center gap-2 text-on-surface-variant/40">
              <span className="material-symbols-outlined text-sm">schedule</span>
              <span className="text-xs font-medium">Last saved: {blog.lastSavedLabel}</span>
            </div>
            <div className="flex items-center gap-4">
              <button
                className="text-[10px] font-semibold tracking-wider uppercase text-on-surface-variant hover:text-primary transition-colors disabled:opacity-60"
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
    </div>
  );
}
