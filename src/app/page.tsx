"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/app-store";
import { statusChipClasses, calculateProjectWords } from "@/lib/app-utils";

export default function Dashboard() {
  const router = useRouter();
  const projects = useAppStore((state) => state.projects);
  const setCurrentProject = useAppStore((state) => state.setCurrentProject);

  const totalWords = projects.reduce((sum, project) => sum + calculateProjectWords(project), 0);
  const totalTokens = useAppStore((state) => state.usage.totalTokens);
  const activeProjects = projects.filter((project) => project.status !== "Ready").length;
  const latestProject = projects.length > 0 ? projects[0] : null;
  const timingHistoryRaw = useAppStore((state) => state.usage?.timingHistory);
  const timingHistory = timingHistoryRaw || [];
  
  const avgOutlineSecs = timingHistory.length > 0 
    ? Math.round(timingHistory.reduce((s, h) => s + h.outlineDuration, 0) / timingHistory.length)
    : 45; // default fallback
  
  const avgDraftSecs = timingHistory.length > 0
    ? Math.round(timingHistory.reduce((s, h) => s + h.draftDuration, 0) / timingHistory.length)
    : 210; // default fallback (3.5 min)

  const formatSecs = (s: number) => {
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return rs > 0 ? `${m}m ${rs}s` : `${m}m`;
  };

  return (
    <main className="flex-1 p-4 sm:p-8 max-w-7xl mx-auto w-full">
      <section className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
        <div>
          <h2 className="text-4xl font-extrabold tracking-tight text-on-surface mb-2">Welcome back, Author!</h2>
          <p className="text-lg text-slate-500 dark:text-slate-400 max-w-lg">
            Your editorial workspace is now fully connected. Projects, rewrites, blog drafts, and profile preferences all move together.
          </p>
        </div>
        <Link
          href="/create"
          className="bg-gradient-to-br from-primary to-primary-container text-on-primary px-8 py-4 rounded-xl font-bold shadow-xl hover:scale-[1.02] active:scale-95 transition-all flex items-center gap-3"
        >
          <span className="material-symbols-outlined">edit_square</span>
          Create New Ebook
        </Link>
      </section>

      <section className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-6 mb-12">
        {/* Projects */}
        <div className="bg-surface-container-low p-6 rounded-2xl flex items-center gap-5 transition-all hover:bg-surface-container shadow-sm border border-outline-variant/5">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-3xl">auto_stories</span>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Projects</p>
            <p className="text-3xl font-black text-on-surface">{projects.length}</p>
          </div>
        </div>

        {/* Words Managed */}
        <div className="bg-surface-container-low p-6 rounded-2xl flex items-center gap-5 transition-all hover:bg-surface-container shadow-sm border border-outline-variant/5">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-3xl">history_edu</span>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Words Managed</p>
            <p className="text-3xl font-black text-on-surface">{(totalWords / 1000).toFixed(1)}k</p>
          </div>
        </div>

        {/* Tokens Used */}
        <div className="bg-surface-container-low p-6 rounded-2xl flex items-center gap-5 transition-all hover:bg-surface-container shadow-sm border border-outline-variant/5">
          <div className="w-14 h-14 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-500">
            <span className="material-symbols-outlined text-3xl">generating_tokens</span>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Tokens Used</p>
            <p className="text-3xl font-black text-on-surface">
              {totalTokens >= 1000000 
                ? `${(totalTokens / 1000000).toFixed(1)}M` 
                : totalTokens >= 1000 
                  ? `${(totalTokens / 1000).toFixed(1)}k` 
                  : totalTokens}
            </p>
          </div>
        </div>

        {/* Active Projects */}
        <div className="bg-surface-container-low p-6 rounded-2xl flex items-center gap-5 transition-all hover:bg-surface-container shadow-sm border border-outline-variant/5">
          <div className="w-14 h-14 rounded-xl bg-primary/10 flex items-center justify-center text-primary">
            <span className="material-symbols-outlined text-3xl">pending_actions</span>
          </div>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-on-surface-variant mb-1">Active Projects</p>
            <p className="text-3xl font-black text-on-surface">{activeProjects}</p>
          </div>
        </div>

        {/* Avg Gen Time */}
        <div className="bg-surface-container-low p-6 rounded-2xl flex items-center gap-5 transition-all hover:bg-surface-container shadow-sm border border-outline-variant/5">
          <div className="w-14 h-14 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-500">
            <span className="material-symbols-outlined text-3xl">timer</span>
          </div>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 mb-1">Avg Generation Time</p>
            <p className="text-xs font-black text-on-surface leading-tight">Outline <span className="text-emerald-500">~{formatSecs(avgOutlineSecs)}</span></p>
            <p className="text-xs font-black text-on-surface leading-tight">Draft <span className="text-indigo-500">~{formatSecs(avgDraftSecs)}</span></p>
          </div>
        </div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-8">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-bold text-on-surface flex items-center gap-2">
              Recent Projects
              <span className="text-xs font-medium px-2 py-1 bg-surface-container-high rounded-full">Viewing {projects.length}</span>
            </h3>
            <Link className="text-sm font-semibold text-primary hover:underline" href="/projects">
              View All
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {projects.slice(0, 4).map((project) => (
              <div
                key={project.id}
                className="group bg-surface-container-lowest rounded-2xl p-6 shadow-sm hover:shadow-xl transition-all duration-300 border border-transparent hover:border-primary/20 flex flex-col"
              >
                <div className="flex justify-between items-start mb-4">
                  <h4 className="font-extrabold text-on-surface text-lg line-clamp-1">{project.title}</h4>
                  <div className="flex flex-col items-end gap-1">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${statusChipClasses[project.status]}`}>
                      {project.status}
                    </span>
                    <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                      {calculateProjectWords(project).toLocaleString()} words
                    </span>
                  </div>
                </div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-2">Last edited {project.updatedLabel}</p>
                <p className="text-sm text-on-surface-variant line-clamp-2 mb-6 flex-1">{project.description}</p>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black uppercase tracking-widest">
                      <span className="text-slate-400 dark:text-slate-500">Progress</span>
                      <span className="text-primary">{project.progress}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-surface-container-high rounded-full overflow-hidden">
                      <div className="h-full bg-primary rounded-full transition-all duration-500" style={{ width: `${project.progress}%` }} />
                    </div>
                  </div>
                  
                  <button
                    onClick={() => {
                      setCurrentProject(project.id);
                      router.push("/editor");
                    }}
                    className="w-full bg-on-surface text-surface py-3 rounded-xl font-bold text-xs shadow-lg hover:scale-[1.02] active:scale-95 transition-all flex items-center justify-center gap-2"
                  >
                    <span className="material-symbols-outlined text-base">play_circle</span>
                    Resume
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="lg:col-span-4">
          <h3 className="text-xl font-bold text-on-surface mb-6">Quick Actions</h3>
          <div className="space-y-4">
            <button
              className="w-full flex items-center justify-between p-5 bg-surface-container-lowest rounded-2xl hover:bg-primary hover:text-white transition-all group shadow-sm dark:shadow-none border border-transparent hover:border-primary/20 dark:border-white/[0.04] dark:hover:border-primary/20"
              onClick={() => {
                if (latestProject) {
                  setCurrentProject(latestProject.id);
                }
                router.push("/editor");
              }}
              type="button"
            >
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-primary group-hover:text-white">play_circle</span>
                <span className="font-bold text-sm group-hover:text-white">Resume Last Project</span>
              </div>
              <span className="material-symbols-outlined text-sm opacity-50 group-hover:opacity-100 group-hover:text-white">arrow_forward_ios</span>
            </button>
            <button
              className="w-full flex items-center justify-between p-5 bg-surface-container-lowest rounded-2xl hover:bg-primary hover:text-white transition-all group shadow-sm dark:shadow-none border border-transparent hover:border-primary/20 dark:border-white/[0.04] dark:hover:border-primary/20"
              onClick={() => router.push("/create")}
              type="button"
            >
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-primary group-hover:text-white">library_books</span>
                <span className="font-bold text-sm group-hover:text-white">Build New Outline</span>
              </div>
              <span className="material-symbols-outlined text-sm opacity-50 group-hover:opacity-100 group-hover:text-white">arrow_forward_ios</span>
            </button>
            <button
              className="w-full flex items-center justify-between p-5 bg-surface-container-lowest rounded-2xl hover:bg-primary hover:text-white transition-all group shadow-sm dark:shadow-none border border-transparent hover:border-primary/20 dark:border-white/[0.04] dark:hover:border-primary/20"
              onClick={() => router.push("/blog-generator")}
              type="button"
            >
              <div className="flex items-center gap-4">
                <span className="material-symbols-outlined text-primary group-hover:text-white">analytics</span>
                <span className="font-bold text-sm group-hover:text-white">Generate Blog Draft</span>
              </div>
              <span className="material-symbols-outlined text-sm opacity-50 group-hover:opacity-100 group-hover:text-white">arrow_forward_ios</span>
            </button>
          </div>

          <div className="mt-10 p-6 bg-primary/10 rounded-3xl relative overflow-hidden">
            <div className="relative z-10">
              <span className="inline-block px-3 py-1 bg-primary text-white text-[10px] font-black uppercase tracking-widest rounded-full mb-3 shadow-sm">AI Insight</span>
              <h4 className="text-primary font-bold mb-2">Need a spark?</h4>
              <p className="text-on-surface-variant text-sm mb-4 leading-relaxed">
                {latestProject
                  ? `Your most active project is ${latestProject.title}. Turning it into a supporting blog post could widen its reach without starting from scratch.`
                  : "Create your first project and Writerdost will start tailoring prompts and recommendations."}
              </p>
              <button
                className="text-xs font-black text-primary border-b-2 border-primary pb-0.5 hover:opacity-70 transition-opacity"
                onClick={() => router.push("/blog-generator")}
                type="button"
              >
                Explore Prompt
              </button>
            </div>
            <div className="absolute -right-4 -bottom-4 opacity-10">
              <span className="material-symbols-outlined text-9xl text-primary">auto_awesome</span>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
