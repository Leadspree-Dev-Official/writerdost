"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/app-store";
import { statusChipClasses, calculateProjectWords } from "@/lib/app-utils";

const QUICK_ACTIONS = [
  { label: "New ebook", icon: "auto_awesome", href: "/create" },
  { label: "Rewrite a manuscript", icon: "book_5", href: "/rewrite" },
  { label: "Blog draft", icon: "edit_note", href: "/blog-generator" },
];

export default function Dashboard() {
  const router = useRouter();
  const projects = useAppStore((state) => state.projects);
  const setCurrentProject = useAppStore((state) => state.setCurrentProject);
  const totalTokens = useAppStore((state) => state.usage.totalTokens);
  const timingHistory = useAppStore((state) => state.usage?.timingHistory) || [];

  const totalWords = projects.reduce((sum, project) => sum + calculateProjectWords(project), 0);
  const activeProjects = projects.filter((project) => project.status !== "Ready").length;
  const latestProject = projects[0] ?? null;

  const avgOutlineSecs = timingHistory.length
    ? Math.round(timingHistory.reduce((s, h) => s + h.outlineDuration, 0) / timingHistory.length)
    : 45;
  const avgDraftSecs = timingHistory.length
    ? Math.round(timingHistory.reduce((s, h) => s + h.draftDuration, 0) / timingHistory.length)
    : 210;

  const formatSecs = (s: number) => {
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return rs > 0 ? `${m}m ${rs}s` : `${m}m`;
  };

  const formatCount = (n: number) =>
    n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${(n / 1000).toFixed(1)}k` : `${n}`;

  const openProject = (id: string) => {
    setCurrentProject(id);
    router.push("/editor");
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-sub">
            {projects.length > 0
              ? `${projects.length} project${projects.length === 1 ? "" : "s"} in your workspace.`
              : "Create your first project to get started."}
          </p>
        </div>
        <Link href="/create" className="btn btn-primary btn-lg">
          <span className="material-symbols-outlined">add</span>
          New ebook
        </Link>
      </div>

      <div className="metrics">
        <div className="metric">
          <p className="metric-label">Projects</p>
          <p className="metric-value">{projects.length}</p>
        </div>
        <div className="metric">
          <p className="metric-label">Words managed</p>
          <p className="metric-value">{formatCount(totalWords)}</p>
        </div>
        <div className="metric">
          <p className="metric-label">Active</p>
          <p className="metric-value">{activeProjects}</p>
        </div>
        <div className="metric">
          <p className="metric-label">Tokens used</p>
          <p className="metric-value">{formatCount(totalTokens)}</p>
        </div>
        <div className="metric">
          <p className="metric-label">Avg generation</p>
          <p className="metric-value">{formatSecs(avgDraftSecs)}</p>
          <p className="metric-note">outline {formatSecs(avgOutlineSecs)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 mt-6">
        <section className="lg:col-span-2 min-w-0">
          <div className="section-head">
            <h2 className="section-title">Recent projects</h2>
            <Link href="/projects" className="text-[12.5px] font-semibold text-primary hover:underline">
              View all
            </Link>
          </div>

          <div className="panel overflow-hidden">
            {projects.length === 0 ? (
              <p className="empty">
                No projects yet.{" "}
                <Link href="/create" className="text-primary font-semibold hover:underline">
                  Create one
                </Link>
                .
              </p>
            ) : (
              projects.slice(0, 6).map((project) => (
                <button
                  key={project.id}
                  type="button"
                  onClick={() => openProject(project.id)}
                  className="row w-full text-left cursor-pointer"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="row-title truncate">{project.title}</span>
                      <span className={`chip ${statusChipClasses[project.status]}`}>{project.status}</span>
                    </span>
                    <span className="block row-meta truncate mt-0.5">
                      {calculateProjectWords(project).toLocaleString()} words · edited {project.updatedLabel}
                    </span>
                  </span>

                  {/* Progress reads as a value first, bar second */}
                  <span className="hidden sm:flex items-center gap-2 shrink-0">
                    <span className="w-20 h-1 rounded-full bg-on-surface/10 overflow-hidden">
                      <span
                        className="block h-full rounded-full bg-primary"
                        style={{ width: `${project.progress}%` }}
                      />
                    </span>
                    <span className="row-meta w-8 text-right">{project.progress}%</span>
                  </span>

                  <span className="material-symbols-outlined text-[16px] text-on-surface-variant/60 shrink-0">
                    chevron_right
                  </span>
                </button>
              ))
            )}
          </div>
        </section>

        <section className="min-w-0">
          <div className="section-head">
            <h2 className="section-title">Quick actions</h2>
          </div>

          <div className="panel overflow-hidden">
            {latestProject && (
              <button
                type="button"
                onClick={() => openProject(latestProject.id)}
                className="row w-full text-left cursor-pointer"
              >
                <span className="material-symbols-outlined text-[17px] text-primary shrink-0">play_circle</span>
                <span className="min-w-0 flex-1">
                  <span className="block row-title">Resume last project</span>
                  <span className="block row-meta truncate">{latestProject.title}</span>
                </span>
              </button>
            )}
            {QUICK_ACTIONS.map((action) => (
              <Link key={action.href} href={action.href} className="row">
                <span className="material-symbols-outlined text-[17px] text-on-surface-variant shrink-0">
                  {action.icon}
                </span>
                <span className="row-title flex-1">{action.label}</span>
                <span className="material-symbols-outlined text-[16px] text-on-surface-variant/60">
                  chevron_right
                </span>
              </Link>
            ))}
          </div>

          {latestProject && (
            <div className="panel panel-pad mt-3">
              <p className="text-[12.5px] leading-relaxed text-on-surface-variant">
                Your most active project is{" "}
                <span className="font-semibold text-on-surface">{latestProject.title}</span>. Turning it into a
                supporting blog post could widen its reach without starting from scratch.
              </p>
              <Link href="/blog-generator" className="btn btn-secondary btn-sm mt-3">
                Draft a blog post
              </Link>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
