"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/app-store";

/**
 * Where the workspace stands with the server.
 *
 * Nothing is kept in this browser any more, so "saved" is not something the
 * author can take for granted the way a local draft was. This says plainly
 * whether the last edit reached Appwrite, and stays quiet once it has.
 */
export default function WorkspaceStatus() {
  const status = useAppStore((state) => state.workspaceStatus);
  const saving = useAppStore((state) => state.workspaceSaving);
  const error = useAppStore((state) => state.workspaceError);
  const savedAt = useAppStore((state) => state.workspaceSavedAt);
  const saveNow = useAppStore((state) => state.saveWorkspaceNow);

  // "Saved" is worth a moment of confirmation, not a permanent badge: each
  // save shows briefly, then the timer retires that timestamp.
  const [retired, setRetired] = useState("");
  const justSaved = Boolean(savedAt) && savedAt !== retired && !error;

  useEffect(() => {
    if (!justSaved) return;
    const timer = setTimeout(() => setRetired(savedAt), 2500);
    return () => clearTimeout(timer);
  }, [justSaved, savedAt]);

  if (status === "idle") return null;

  if (saving) {
    return (
      <span className="flex items-center gap-1 h-6 px-2 rounded-full text-[11px] text-on-surface-variant">
        <span className="material-symbols-outlined text-[13px] animate-spin">sync</span>
        <span className="hidden sm:inline">Saving…</span>
      </span>
    );
  }

  if (error) {
    return (
      <button
        type="button"
        onClick={() => void saveNow(true)}
        title={error}
        className="flex items-center gap-1 h-6 px-2 rounded-full text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-amber-500/10 border border-amber-500/25 hover:bg-amber-500/15 transition-colors cursor-pointer"
      >
        <span className="material-symbols-outlined text-[13px]">cloud_off</span>
        <span className="hidden sm:inline">Not saved — retry</span>
      </button>
    );
  }

  const label = status === "loading" ? "Loading…" : justSaved ? "Saved" : null;
  if (!label) return null;

  return (
    <span className="flex items-center gap-1 h-6 px-2 rounded-full text-[11px] text-on-surface-variant">
      <span className="material-symbols-outlined text-[13px]">
        {label === "Saved" ? "cloud_done" : "cloud_sync"}
      </span>
      <span className="hidden sm:inline">{label}</span>
    </span>
  );
}
