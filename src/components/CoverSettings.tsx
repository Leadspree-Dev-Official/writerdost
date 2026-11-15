"use client";

import React, { useRef, useState } from "react";
import { useAppStore } from "@/lib/app-store";
import { CoverStudioModal } from "./CoverStudioModal";

interface CoverSettingsProps {
  projectId: string;
}

/**
 * Covers are stored as data URLs inside the project row, so a large upload
 * inflates every autosave of that manuscript. 1.5 MB of source file is roughly
 * 2 MB once base64-encoded, which leaves room for the prose.
 */
const MAX_COVER_BYTES = 1.5 * 1024 * 1024;

export const CoverSettings: React.FC<CoverSettingsProps> = ({ projectId }) => {
  const projects = useAppStore((state) => state.projects);
  const setProjectCover = useAppStore((state) => state.setProjectCover);
  const project = projects.find((p) => p.id === projectId);

  const inputRef = useRef<HTMLInputElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isStudioOpen, setIsStudioOpen] = useState(false);
  const [error, setError] = useState("");

  if (!project) return null;

  const cover = project.coverImage;

  const handleFile = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    // Clear immediately so picking the same file twice still fires onChange.
    event.target.value = "";
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      setError("That file is not an image.");
      return;
    }
    if (file.size > MAX_COVER_BYTES) {
      setError(`Cover must be under 1.5 MB — that one is ${(file.size / 1024 / 1024).toFixed(1)} MB.`);
      return;
    }

    const reader = new FileReader();
    reader.onerror = () => setError("Could not read that file.");
    reader.onloadend = () => {
      setError("");
      setProjectCover(projectId, reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <>
      <div className="rounded-[var(--radius-lg)] border border-outline-variant/10 overflow-hidden">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="w-full flex items-center justify-between px-3.5 py-2.5 bg-surface-container-highest/30 hover:bg-surface-container-highest/50 transition-colors"
          type="button"
        >
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-sm">image</span>
            <span className="text-[10px] font-semibold text-on-surface-variant">Cover Image</span>
          </div>
          <div className="flex items-center gap-1.5">
            {cover && <span className="chip chip-neutral text-[9px] px-1.5 py-0.5">Set</span>}
            <span className={`material-symbols-outlined text-slate-400 text-sm transition-transform ${isOpen ? "rotate-180" : ""}`}>
              expand_more
            </span>
          </div>
        </button>

        {isOpen && (
          <div className="px-3.5 py-2.5 space-y-3 bg-surface-container-highest/10 max-h-80 overflow-y-auto">
            {/* AI Cover Studio Launch Button */}
            <button
              type="button"
              onClick={() => setIsStudioOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-[var(--radius)] bg-gradient-to-r from-indigo-600/15 via-primary/20 to-amber-500/15 border border-primary/30 hover:border-primary text-primary font-bold text-xs transition-all shadow-sm"
            >
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              <span>Open Cover Studio</span>
            </button>

            <input
              ref={inputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFile}
            />

            {cover ? (
              <div className="space-y-2.5">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={cover}
                  alt="Manuscript cover"
                  className="w-full rounded-[var(--radius)] border border-outline-variant/20 object-cover shadow-sm"
                  style={{ aspectRatio: "2 / 3" }}
                />
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => inputRef.current?.click()}
                    className="btn btn-secondary btn-sm flex-1 text-[11px]"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-xs">upload</span>
                    Upload
                  </button>
                  <button
                    onClick={() => {
                      setError("");
                      setProjectCover(projectId, undefined);
                    }}
                    className="btn btn-ghost btn-sm btn-danger text-[11px]"
                    title="Remove cover"
                    type="button"
                  >
                    <span className="material-symbols-outlined text-xs">delete</span>
                  </button>
                </div>
              </div>
            ) : (
              <button
                onClick={() => inputRef.current?.click()}
                className="w-full flex flex-col items-center justify-center gap-1.5 py-4 rounded-[var(--radius)] border border-dashed border-outline-variant/40 text-on-surface-variant hover:border-primary/45 hover:text-primary transition-colors"
                type="button"
              >
                <span className="material-symbols-outlined text-lg">add_photo_alternate</span>
                <span className="text-[11px] font-semibold">Or upload custom file</span>
              </button>
            )}

            {error ? (
              <p className="text-[10px] leading-snug text-rose-500">{error}</p>
            ) : (
              <p className="hint text-[10px]">
                Rendered as page one of EPUB &amp; PDF exports. Kindle standard 1:1.6 proportion.
              </p>
            )}
          </div>
        )}
      </div>

      <CoverStudioModal
        projectId={projectId}
        isOpen={isStudioOpen}
        onClose={() => setIsStudioOpen(false)}
      />
    </>
  );
};
