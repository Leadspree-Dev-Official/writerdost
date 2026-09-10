"use client";

import React, { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import type { Project } from "@/lib/app-store";
import {
  STAGES,
  STAGE_ACTIONS,
  getStageGuidance,
  type StageActionId,
} from "@/lib/project-stage";

export type StageActionConfig = {
  onClick: () => void;
  /** Overrides the default copy — the publish action's label is dynamic. */
  label?: string;
  icon?: string;
  disabled?: boolean;
  title?: string;
};

interface StageBarProps {
  project: Project;
  isGenerating: boolean;
  actions: Partial<Record<StageActionId, StageActionConfig>>;
  /** Extra line under the bar — a listing id, a failed publish, etc. */
  statusNote?: React.ReactNode;
}

export const StageBar: React.FC<StageBarProps> = ({
  project,
  isGenerating,
  actions,
  statusNote,
}) => {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  // Same dismissal contract as the header's export menu.
  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [menuOpen]);

  const guidance = getStageGuidance(project, { isGenerating });

  const resolve = (id: StageActionId) => {
    const config = actions[id];
    if (!config) return null;
    const defaults = STAGE_ACTIONS[id];
    return {
      id,
      label: config.label ?? defaults.label,
      icon: config.icon ?? defaults.icon,
      onClick: config.onClick,
      disabled: config.disabled ?? false,
      title: config.title,
    };
  };

  const primary = guidance.primaryId ? resolve(guidance.primaryId) : null;
  const secondary = guidance.secondaryIds
    .map(resolve)
    .filter((item): item is NonNullable<ReturnType<typeof resolve>> => item !== null);

  return (
    <div className="shrink-0 border-b border-[var(--hairline)] bg-surface/60 px-4 md:px-8 py-2 no-print">
      <div className="flex items-center gap-3">
        {/* Where the book is. Full strip when there's room, one chip when not. */}
        <ol className="stage-strip hidden lg:flex" aria-label="Project stage">
          {STAGES.map((stage, index) => {
            const state =
              index < guidance.currentIndex
                ? "done"
                : index === guidance.currentIndex
                  ? "current"
                  : "todo";
            return (
              <li key={stage.key} className="flex items-center">
                <span
                  className="stage"
                  data-state={state}
                  aria-current={state === "current" ? "step" : undefined}
                >
                  <span className="stage-dot" />
                  {stage.label}
                </span>
                {index < STAGES.length - 1 && <span className="stage-sep" />}
              </li>
            );
          })}
        </ol>
        <span className="chip chip-neutral lg:hidden shrink-0">
          {STAGES[guidance.currentIndex]?.label ?? project.status}
        </span>

        <span className="w-px h-4 bg-[var(--hairline-strong)] hidden sm:block" />

        <p className="flex-1 min-w-0 truncate text-[12.5px] text-on-surface-variant">
          {guidance.hint}
        </p>

        {primary && (
          <button
            className="btn btn-primary btn-sm shrink-0"
            onClick={primary.onClick}
            disabled={primary.disabled}
            title={primary.title}
            type="button"
          >
            <span className="material-symbols-outlined">{primary.icon}</span>
            <span className="hidden sm:inline">{primary.label}</span>
          </button>
        )}

        {secondary.length > 0 && (
          <div className="relative shrink-0" ref={menuRef}>
            <button
              className={clsx("btn btn-ghost btn-icon btn-sm", menuOpen && "bg-on-surface/[0.07]")}
              onClick={() => setMenuOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={menuOpen}
              aria-label="Other actions for this stage"
              type="button"
            >
              <span className="material-symbols-outlined">more_horiz</span>
            </button>

            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 top-[calc(100%+4px)] z-50 w-56 p-1 rounded-[var(--radius-lg)] bg-surface-container-lowest dark:bg-[#16162a] border border-[var(--hairline-strong)] shadow-xl"
              >
                {secondary.map((item) => (
                  <button
                    key={item.id}
                    role="menuitem"
                    onClick={() => {
                      setMenuOpen(false);
                      item.onClick();
                    }}
                    disabled={item.disabled}
                    title={item.title}
                    className="w-full flex items-center gap-2 h-7 px-2 rounded-[var(--radius)] text-[12.5px] text-on-surface hover:bg-on-surface/[0.06] disabled:opacity-45 transition-colors text-left"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                      {item.icon}
                    </span>
                    {item.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {statusNote ? <div className="mt-1.5">{statusNote}</div> : null}
    </div>
  );
};
