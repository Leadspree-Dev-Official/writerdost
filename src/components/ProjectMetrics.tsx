"use client";

import React, { useState } from "react";

interface ProjectMetricsProps {
  project: {
    outlineDuration?: number;
    draftDuration?: number;
    tokensUsed?: number;
  };
}

export const ProjectMetrics: React.FC<ProjectMetricsProps> = ({ project }) => {
  const [isOpen, setIsOpen] = useState(false);
  const totalTokens = project.tokensUsed || 0;
  const creditsConsumed = Number((totalTokens * 0.015).toFixed(1));
  const creditLabel = creditsConsumed >= 1000
    ? `${(creditsConsumed / 1000).toFixed(1)}k cr`
    : `${creditsConsumed} cr`;

  return (
    <div className="rounded-[var(--radius-lg)] border border-outline-variant/10 overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 bg-surface-container-highest/30 hover:bg-surface-container-highest/50 transition-colors"
        type="button"
      >
        <div className="flex items-center gap-2">
          <span className="material-symbols-outlined text-primary text-sm">query_stats</span>
          <span className="text-[10px] font-semibold text-on-surface-variant">Project Metrics</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="chip chip-neutral text-[9px] px-1.5 py-0.5 flex items-center gap-0.5">
            <span className="material-symbols-outlined text-[11px] text-amber-500">monetization_on</span>
            <span>~{creditLabel}</span>
          </span>
          <span className={`material-symbols-outlined text-slate-400 text-sm transition-transform ${isOpen ? "rotate-180" : ""}`}>
            expand_more
          </span>
        </div>
      </button>

      {isOpen && (
        <div className="px-3.5 py-2.5 space-y-2 bg-surface-container-highest/10">
          <dl className="panel panel-pad !p-2 space-y-1.5 text-xs">
            <div className="kv text-[11px]">
              <dt className="text-slate-400">Outline time</dt>
              <dd className="num font-semibold text-on-surface">
                {project.outlineDuration !== undefined ? `${Math.floor(project.outlineDuration / 60)}m ${project.outlineDuration % 60}s` : "0m 0s"}
              </dd>
            </div>
            <div className="kv text-[11px]">
              <dt className="text-slate-400">Drafting time</dt>
              <dd className="num font-semibold text-on-surface">
                {project.draftDuration !== undefined ? `${Math.floor(project.draftDuration / 60)}m ${project.draftDuration % 60}s` : "0m 0s"}
              </dd>
            </div>
            <div className="kv text-[11px]">
              <dt className="text-slate-400 flex items-center gap-1">
                <span className="material-symbols-outlined text-[13px] text-amber-500">monetization_on</span>
                <span>Est. Credits used</span>
              </dt>
              <dd className="num font-semibold text-amber-600 dark:text-amber-400">
                ~{creditsConsumed.toLocaleString()} cr
              </dd>
            </div>
          </dl>
          <p className="text-[10px] text-slate-500 italic px-1">
            * Deducted via BizAI Gateway. 0 credits if generated with your own BYOK keys.
          </p>
        </div>
      )}
    </div>
  );
};
