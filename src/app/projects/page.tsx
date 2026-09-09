"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/app-store";
import { statusChipClasses, calculateProjectWords } from "@/lib/app-utils";
import type { Project } from "@/lib/app-store";

export default function ProjectsPage() {
  const router = useRouter();
  const projects = useAppStore((state) => state.projects);
  const setCurrentProject = useAppStore((state) => state.setCurrentProject);
  const deleteProject = useAppStore((state) => state.deleteProject);

  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  const totalWords = projects.reduce((sum, p) => sum + calculateProjectWords(p), 0);
  const projectsWithOutlines = projects.filter(p => (p.outlineDuration || 0) > 0);
  const avgOutlineSecs = projectsWithOutlines.length > 0
    ? Math.round((projectsWithOutlines.reduce((s, p) => s + (p.outlineDuration || 0), 0) / projectsWithOutlines.reduce((s, p) => s + calculateProjectWords(p), 0)) * 10000)
    : 145;
  
  const projectsWithDrafts = projects.filter(p => (p.draftDuration || 0) > 0);
  const avgDraftSecs = projectsWithDrafts.length > 0
    ? Math.round((projectsWithDrafts.reduce((s, p) => s + (p.draftDuration || 0), 0) / projectsWithDrafts.reduce((s, p) => s + calculateProjectWords(p), 0)) * 10000)
    : 210;

  const formatSecs = (s: number) => {
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return rs > 0 ? `${m}m ${rs}s` : `${m}m`;
  };

  return (
    <div className="flex-1 p-8 max-w-7xl mx-auto w-full relative">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-8">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-on-surface">My Projects</h2>
          <p className="text-on-surface-variant mt-2">Every project is now editable, routable, and connected to the rest of the application.</p>
        </div>
        
        {/* Generation Metrics Showcase */}
        <div className="flex bg-surface-container-low rounded-2xl p-4 gap-6 border border-outline-variant/10 shadow-sm">
           <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Total Output</span>
              <span className="text-lg font-black text-primary">{(totalWords / 1000).toFixed(1)}k Words</span>
           </div>
           <div className="w-px bg-outline-variant/20" />
           <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Avg. Blueprint Time</span>
              <span className="text-lg font-black text-emerald-500">~{formatSecs(avgOutlineSecs)}</span>
           </div>
           <div className="w-px bg-outline-variant/20" />
           <div className="flex flex-col">
              <span className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1">Avg. Draft Time</span>
              <span className="text-lg font-black text-indigo-500">~{formatSecs(avgDraftSecs)} <span className="text-xs text-slate-500 font-medium">/ 10k words</span></span>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {(projects ?? []).map((project) => (
          <div
            key={project.id}
            className="rounded-3xl bg-surface-container-lowest border border-outline-variant/10 p-8 shadow-sm hover:shadow-lg transition-all flex flex-col"
          >
            <div className="flex items-start justify-between mb-6">
              <div className="flex-1">
                <h3 className="text-2xl font-black text-on-surface mb-2">{project.title}</h3>
                <div className="flex flex-wrap gap-2">
                  <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-[10px] font-bold ${statusChipClasses[project.status] || "bg-slate-100 text-slate-700"}`}>
                    {project.status}
                  </span>
                  <span className="rounded-full bg-surface-container-low px-2.5 py-0.5 text-[10px] font-bold text-on-surface-variant border border-outline-variant/10">{project.tone}</span>
                  <span className="rounded-full bg-surface-container-low px-2.5 py-0.5 text-[10px] font-bold text-on-surface-variant border border-outline-variant/10">{project.audience}</span>
                  <span className="rounded-full bg-primary/10 px-2.5 py-0.5 text-[10px] font-bold text-primary border border-primary/20">
                    {calculateProjectWords(project).toLocaleString()} words
                  </span>
                </div>
              </div>
              <button
                className="p-2 text-slate-300 dark:text-slate-600 hover:text-rose-500 transition-colors bg-surface-container hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg ml-4"
                onClick={() => setProjectToDelete(project)}
                type="button"
                title="Delete Project"
              >
                <span className="material-symbols-outlined text-xl">delete</span>
              </button>
            </div>

            <p className="text-sm text-on-surface-variant leading-relaxed mb-6 flex-1">{project.description}</p>

            {true && (
              <div className="flex gap-6 mb-8 bg-surface-container-low p-3 rounded-xl border border-outline-variant/10">
                <div className="flex flex-col">
                   <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Outline Time</span>
                   <span className="text-xs font-bold text-emerald-500">{project.outlineDuration !== undefined ? formatSecs(project.outlineDuration) : "0m 0s"}</span>
                </div>
                <div className="flex flex-col">
                   <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5">Drafting Time</span>
                   <span className="text-xs font-bold text-indigo-500">{project.draftDuration !== undefined ? formatSecs(project.draftDuration) : "0m 0s"}</span>
                </div>
                <div className="flex flex-col ml-auto">
                   <span className="text-[9px] font-black uppercase tracking-widest text-slate-400 mb-0.5 text-right">Tokens Used</span>
                   <span className="text-xs font-bold text-slate-700 dark:text-slate-300 text-right">{project.tokensUsed?.toLocaleString() || "0"}</span>
                </div>
              </div>
            )}

            <div className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between text-[10px] font-black uppercase tracking-widest">
                  <span className="text-on-surface-variant">Progress</span>
                  <span className="text-primary">{project.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-container-high overflow-hidden">
                  <div className="h-full rounded-full bg-primary" style={{ width: `${project.progress}%` }} />
                </div>
              </div>

              <button
                onClick={() => {
                  setCurrentProject(project.id);
                  router.push("/editor");
                }}
                className="w-full bg-on-surface text-surface py-4 rounded-2xl font-bold text-sm shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2 group border-none"
              >
                <span className="material-symbols-outlined text-xl group-hover:translate-x-1 transition-transform">play_circle</span>
                Resume Writing
              </button>
            </div>
          </div>
        ))}
        {projects.length === 0 && (
           <div className="col-span-full py-20 flex flex-col items-center justify-center bg-surface-container border border-dashed border-outline-variant/30 rounded-3xl">
              <span className="material-symbols-outlined text-6xl text-slate-300 dark:text-slate-600 mb-4">folder_open</span>
              <h3 className="text-xl font-bold text-on-surface mb-2">No Projects Yet</h3>
              <p className="text-slate-500 dark:text-slate-400 mb-6">Create a new ebook to get started.</p>
              <button onClick={() => router.push('/create')} className="bg-primary text-white px-6 py-3 rounded-xl font-bold">Start Writing</button>
           </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {projectToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 dark:bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white dark:bg-[#141420] rounded-[32px] p-8 max-w-md w-full shadow-2xl border border-outline-variant/10 dark:border-white/[0.06] animate-in zoom-in-95 duration-200">
             <div className="w-16 h-16 rounded-full bg-rose-100 dark:bg-rose-500/10 flex items-center justify-center text-rose-500 mb-6 mx-auto">
               <span className="material-symbols-outlined text-3xl">warning</span>
             </div>
             <h3 className="text-2xl font-black text-center text-on-surface mb-2">Delete Project?</h3>
             <p className="text-center text-on-surface-variant mb-8 line-clamp-2 px-4">
                Are you sure you want to permanently delete <strong>&quot;{projectToDelete.title}&quot;</strong>? This action cannot be undone.
             </p>
             <div className="flex gap-3">
                <button
                  className="flex-1 py-3.5 rounded-xl font-bold text-slate-600 dark:text-slate-300 bg-surface-container hover:bg-surface-container-high transition-colors"
                  onClick={() => setProjectToDelete(null)}
                >
                  Cancel
                </button>
                <button
                  className="flex-1 py-3.5 rounded-xl font-bold text-white bg-rose-500 hover:bg-rose-600 shadow-lg shadow-rose-500/20 transition-all border-none"
                  onClick={() => {
                    deleteProject(projectToDelete.id);
                    setProjectToDelete(null);
                  }}
                >
                  Yes, Delete It
                </button>
             </div>
          </div>
        </div>
      )}
    </div>
  );
}
