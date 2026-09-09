"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/lib/app-store";
import { statusChipClasses, calculateProjectWords } from "@/lib/app-utils";
import type { Project } from "@/lib/app-store";

export default function ProjectsPage() {
  const router = useRouter();
  const projects = useAppStore((state) => state.projects);
  const setCurrentProject = useAppStore((state) => state.setCurrentProject);
  const deleteProject = useAppStore((state) => state.deleteProject);

  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");

  const formatSecs = (s: number) => {
    if (!s) return "—";
    if (s < 60) return `${s}s`;
    const m = Math.floor(s / 60);
    const rs = s % 60;
    return rs > 0 ? `${m}m ${rs}s` : `${m}m`;
  };

  const visible = projects.filter((project) => {
    const matchesQuery =
      !query ||
      project.title.toLowerCase().includes(query.toLowerCase()) ||
      project.description.toLowerCase().includes(query.toLowerCase());
    const matchesStatus = statusFilter === "all" || project.status === statusFilter;
    return matchesQuery && matchesStatus;
  });

  const totalWords = projects.reduce((sum, p) => sum + calculateProjectWords(p), 0);

  const open = (id: string) => {
    setCurrentProject(id);
    router.push("/editor");
  };

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Projects</h1>
          <p className="page-sub">
            {projects.length} project{projects.length === 1 ? "" : "s"} ·{" "}
            {totalWords.toLocaleString()} words total
          </p>
        </div>
        <Link href="/create" className="btn btn-primary btn-lg">
          <span className="material-symbols-outlined">add</span>
          New ebook
        </Link>
      </div>

      {/* Filters sit on the page, above the table, not in a card */}
      <div className="flex items-center gap-2 mb-3 flex-wrap">
        <div className="relative flex-1 min-w-[12rem] max-w-xs">
          <span className="material-symbols-outlined absolute left-2 top-1/2 -translate-y-1/2 text-[16px] text-on-surface-variant pointer-events-none">
            search
          </span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search projects"
            aria-label="Search projects"
            className="input pl-7"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          aria-label="Filter by status"
          className="select w-auto min-w-[8rem]"
        >
          <option value="all">All statuses</option>
          <option value="Planning">Planning</option>
          <option value="Drafting">Drafting</option>
          <option value="Editing">Editing</option>
          <option value="Ready">Ready</option>
        </select>
        {(query || statusFilter !== "all") && (
          <span className="row-meta">
            {visible.length} of {projects.length}
          </span>
        )}
      </div>

      <div className="panel overflow-hidden">
        {/* Column header — the row grid below matches it exactly */}
        <div className="hidden md:flex items-center gap-4 h-8 px-3 border-b border-[var(--hairline)] bg-on-surface/[0.02] text-[11px] font-semibold text-on-surface-variant">
          <span className="flex-1 min-w-0">Project</span>
          <span className="w-20">Status</span>
          <span className="w-20 text-right">Words</span>
          <span className="w-16 text-right">Tokens</span>
          <span className="w-16 text-right">Outline</span>
          <span className="w-16 text-right">Draft</span>
          <span className="w-28">Progress</span>
          <span className="w-7" />
        </div>

        {visible.length === 0 ? (
          <p className="empty">
            {projects.length === 0 ? (
              <>
                No projects yet.{" "}
                <Link href="/create" className="text-primary font-semibold hover:underline">
                  Create your first
                </Link>
                .
              </>
            ) : (
              "No projects match these filters."
            )}
          </p>
        ) : (
          visible.map((project) => (
            <div key={project.id} className="row px-3 gap-4">
              <button
                type="button"
                onClick={() => open(project.id)}
                className="flex-1 min-w-0 text-left cursor-pointer"
              >
                <span className="block row-title truncate">{project.title}</span>
                <span className="block row-meta truncate mt-0.5">
                  {project.tone} · {project.audience} · edited {project.updatedLabel}
                </span>
              </button>

              <span className="w-20 shrink-0 hidden md:block">
                <span className={`chip ${statusChipClasses[project.status] ?? "chip-neutral"}`}>
                  {project.status}
                </span>
              </span>
              <span className="w-20 shrink-0 row-meta text-right hidden md:block">
                {calculateProjectWords(project).toLocaleString()}
              </span>
              <span className="w-16 shrink-0 row-meta text-right hidden md:block">
                {project.tokensUsed?.toLocaleString() ?? "—"}
              </span>
              <span className="w-16 shrink-0 row-meta text-right hidden md:block">
                {formatSecs(project.outlineDuration ?? 0)}
              </span>
              <span className="w-16 shrink-0 row-meta text-right hidden md:block">
                {formatSecs(project.draftDuration ?? 0)}
              </span>

              <span className="w-28 shrink-0 hidden md:flex items-center gap-2">
                <span className="flex-1 h-1 rounded-full bg-on-surface/10 overflow-hidden">
                  <span
                    className="block h-full rounded-full bg-primary"
                    style={{ width: `${project.progress}%` }}
                  />
                </span>
                <span className="row-meta w-8 text-right">{project.progress}%</span>
              </span>

              <button
                type="button"
                onClick={() => setProjectToDelete(project)}
                title={`Delete ${project.title}`}
                aria-label={`Delete ${project.title}`}
                className="btn btn-ghost btn-icon btn-sm shrink-0 hover:text-error"
              >
                <span className="material-symbols-outlined text-[16px]">delete</span>
              </button>
            </div>
          ))
        )}
      </div>

      {projectToDelete && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="delete-title"
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-[2px] p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) setProjectToDelete(null);
          }}
        >
          <div className="w-full max-w-sm rounded-[var(--radius-lg)] bg-surface-container-lowest dark:bg-[#16162a] border border-[var(--hairline-strong)] shadow-2xl p-4">
            <h2 id="delete-title" className="text-[14px] font-semibold text-on-surface">
              Delete this project?
            </h2>
            <p className="text-[12.5px] text-on-surface-variant mt-1.5 leading-relaxed">
              <span className="font-semibold text-on-surface">{projectToDelete.title}</span> and all of its
              chapters will be removed. This cannot be undone.
            </p>
            <div className="flex justify-end gap-2 mt-4">
              <button type="button" className="btn btn-secondary" onClick={() => setProjectToDelete(null)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary !bg-error hover:!bg-error/85"
                onClick={() => {
                  deleteProject(projectToDelete.id);
                  setProjectToDelete(null);
                }}
              >
                Delete project
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
