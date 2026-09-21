"use client";

import { useAppStore } from "@/lib/app-store";
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/** Exponential ease-out: fast to settle, no bounce. */
const EASE_OUT = [0.16, 1, 0.3, 1] as const;

/** mm:ss, the one clock format this overlay uses. */
const clock = (seconds: number) =>
  `${Math.floor(seconds / 60)
    .toString()
    .padStart(2, "0")}:${(seconds % 60).toString().padStart(2, "0")}`;

/** An agent's icon. Falls back to the generic one for pipelines we don't name. */
const agentIcon = (agent: string) => {
  if (agent.includes("Writing")) return "edit_note";
  if (agent.includes("Manuscript")) return "auto_stories";
  if (agent.includes("Research")) return "travel_explore";
  if (agent.includes("Outline") || agent.includes("Planning")) return "list_alt";
  return "smart_toy";
};

export function GenerationOverlay({
  onCancel,
  onResume,
  title: propTitle,
  subtitle: propSubtitle,
}: {
  onCancel?: () => void;
  onResume?: () => void;
  title?: string;
  subtitle?: string;
}) {
  const isGenerating = useAppStore((state) => state.generationStatus.isGenerating);
  const isPaused = useAppStore((state) => state.generationStatus.isPaused);
  const storeResume = useAppStore((state) => state.resumeGeneration);
  const handleResume = onResume || storeResume;
  const logs = useAppStore((state) => state.generationStatus.logs);
  const progress = useAppStore((state) => state.generationStatus.progress);
  const activeAgent = useAppStore((state) => state.generationStatus.activeAgent);
  const currentTask = useAppStore((state) => state.generationStatus.currentTask);
  const startTime = useAppStore((state) => state.generationStatus.startTime);
  const pipelineTitle = useAppStore((state) => state.generationStatus.pipelineTitle);
  const pipelineSubtitle = useAppStore((state) => state.generationStatus.pipelineSubtitle);
  const isMinimized = useAppStore((state) => state.generationStatus.isMinimized);
  const sessionTokens = useAppStore((state) => state.generationStatus.sessionTokens);
  const setMinimized = useAppStore((state) => state.setMinimized);
  const api = useAppStore((state) => state.api);
  const finishGeneration = useAppStore((state) => state.finishGeneration);

  const title = pipelineTitle || propTitle || "Working";
  const subtitle = pipelineSubtitle || propSubtitle || "This usually takes a few minutes.";

  const reduceMotion = useReducedMotion();
  const scrollRef = useRef<HTMLDivElement>(null);
  const dialogRef = useRef<HTMLDivElement>(null);

  // "Finished while minimised" is fully derived: dismissing the pill clears
  // isMinimized, which is what made this true in the first place.
  const localFinished = !isGenerating && isMinimized;

  // Only the interval reads the clock, so render stays pure. The run's start
  // is stored alongside the count: when a new run begins, the previous count
  // no longer matches and the label falls back to zero without a state write.
  const [ticker, setTicker] = useState({ start: 0, seconds: 0 });

  useEffect(() => {
    if (!isGenerating || !startTime || isPaused) return;
    const begin = Number(startTime);
    const update = () =>
      setTicker({ start: begin, seconds: Math.max(0, Math.floor((Date.now() - begin) / 1000)) });

    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [isGenerating, startTime, isPaused]);

  const seconds = ticker.start === Number(startTime) ? ticker.seconds : 0;
  const elapsed = !isGenerating || !startTime ? "00:00" : clock(seconds);

  const entries = Array.isArray(logs) ? logs : [];
  const hasError = entries.some((log) => log.status === "error");
  // The same check the pages run before calling the model. Without it the
  // server answers from the fallback writer, so saying "Live" would be a lie.
  const isLive = Boolean(
    api.baseUrl && api.model && (api.apiKey || api.provider === "ollama" || api.provider === "ollama_cloud"),
  );

  const view = isGenerating && !isMinimized ? "dialog" : isGenerating ? "pill" : localFinished ? "done" : null;

  // The log pins to the newest line like a terminal, but only while the reader
  // is already there: scrolling back to re-read an earlier step releases it.
  const stickToEnd = useRef(true);
  const onActivityScroll = () => {
    const container = scrollRef.current;
    if (!container) return;
    stickToEnd.current = container.scrollHeight - container.scrollTop - container.clientHeight < 24;
  };

  useLayoutEffect(() => {
    if (view !== "dialog" || !stickToEnd.current) return;
    const container = scrollRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [entries.length, view]);

  // Escape minimises rather than cancels: the run is expensive and losing it
  // to a stray keypress is not a recoverable mistake.
  useEffect(() => {
    if (view !== "dialog") return;
    dialogRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        setMinimized(true);
        return;
      }

      // The backdrop already blocks the page behind from being clicked; Tab
      // stays inside for the same reason.
      if (event.key !== "Tab") return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = dialog.querySelectorAll<HTMLElement>("button:not([disabled]), [href], [tabindex]:not([tabindex='-1'])");
      if (focusable.length === 0) return;

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;

      if (!dialog.contains(active)) {
        event.preventDefault();
        (event.shiftKey ? last : first).focus();
      } else if (event.shiftKey && active === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && active === last) {
        event.preventDefault();
        first.focus();
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [view, setMinimized]);

  const rise = useCallback(
    (distance: number) => (reduceMotion ? { opacity: 0 } : { opacity: 0, y: distance }),
    [reduceMotion],
  );

  return (
    // Views swap outright rather than through AnimatePresence: an exiting
    // dialog that never reports completion would strand the whole overlay,
    // and this one gates a run the author is waiting on.
    <>
      {view === "done" ? (
        <motion.button
          key="done"
          type="button"
          initial={rise(12)}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: EASE_OUT }}
          onClick={() => setMinimized(false)}
          className="no-print fixed bottom-5 right-5 z-[100] flex items-center gap-3 rounded-[var(--radius-lg)] border border-[var(--hairline-strong)] bg-surface-container-lowest px-3 py-2.5 text-left shadow-[0_10px_28px_-12px_rgb(0_0_0/0.35)] transition-colors hover:bg-surface-container dark:bg-surface-container dark:hover:bg-surface-container-high"
        >
          <span className="material-symbols-outlined text-[20px] text-emerald-600 dark:text-emerald-400">
            check_circle
          </span>
          <span className="min-w-0">
            <span className="block text-[0.8125rem] font-semibold leading-tight text-on-surface">
              Generation finished
            </span>
            <span className="row-meta block leading-tight">Click to dismiss</span>
          </span>
        </motion.button>
      ) : view === "pill" ? (
        <motion.div
          key="pill"
          initial={rise(12)}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.24, ease: EASE_OUT }}
          className="no-print fixed bottom-5 right-5 z-[100] w-[19.5rem] rounded-[var(--radius-lg)] border border-[var(--hairline-strong)] bg-surface-container-lowest p-3 shadow-[0_10px_28px_-12px_rgb(0_0_0/0.35)] dark:bg-surface-container"
        >
          <div className="flex items-center gap-2">
            <span
              className={`h-1.5 w-1.5 shrink-0 rounded-full ${
                isPaused ? "bg-amber-500" : "bg-primary"
              } ${reduceMotion || isPaused ? "" : "animate-pulse"}`}
            />
            <p className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold text-on-surface">
              {isPaused ? `Paused: ${currentTask || "Generation paused"}` : currentTask || activeAgent || "Working"}
            </p>
            <button
              type="button"
              className="btn btn-ghost btn-icon -mr-1 shrink-0"
              onClick={() => setMinimized(false)}
              title="Expand"
              aria-label="Expand generation progress"
            >
              <span className="material-symbols-outlined">open_in_full</span>
            </button>
          </div>

          <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-[var(--hairline-strong)]">
            <motion.div
              className={`h-full rounded-full ${isPaused ? "bg-amber-500" : "bg-primary"}`}
              initial={false}
              animate={{ width: `${progress}%` }}
              transition={{ duration: reduceMotion ? 0 : 0.4, ease: EASE_OUT }}
            />
          </div>
          <div className="mt-1.5 flex items-center justify-between">
            <span className="row-meta">{progress}%</span>
            <span className="row-meta">{isPaused ? "Paused" : elapsed}</span>
          </div>
        </motion.div>
      ) : view === "dialog" ? (
        <motion.div
          key="dialog"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.18 }}
          className="no-print fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-slate-900/25 p-4 backdrop-blur-[2px] dark:bg-black/55"
        >
          <motion.div
            ref={dialogRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby="generation-title"
            aria-busy={isGenerating && !isPaused}
            tabIndex={-1}
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 10, scale: 0.985 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.28, ease: EASE_OUT }}
            className="flex max-h-[86dvh] min-h-[20rem] w-full max-w-[38rem] flex-col overflow-hidden rounded-[var(--radius-lg)] border border-[var(--hairline-strong)] bg-surface-container-lowest shadow-[0_24px_64px_-24px_rgb(0_0_0/0.45)] outline-none dark:bg-surface-container"
          >
            {/* Header: what is running, how long it has been running, and out. */}
            <div className="flex items-start gap-3 border-b border-[var(--hairline)] px-4 py-3">
              <span
                className={`mt-[0.4375rem] h-2 w-2 shrink-0 rounded-full ${
                  hasError
                    ? "bg-error"
                    : isPaused
                    ? "bg-amber-500"
                    : `bg-primary ${reduceMotion ? "" : "animate-pulse"}`
                }`}
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <h2
                  id="generation-title"
                  className="truncate text-[0.9375rem] font-[650] leading-tight tracking-[-0.012em] text-on-surface"
                >
                  {title}
                </h2>
                <p className="mt-0.5 text-[0.8125rem] leading-snug text-on-surface-variant">{subtitle}</p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <span className="row-meta tabular-nums" aria-label={`Elapsed ${elapsed}`}>
                  {elapsed}
                </span>
                <button
                  type="button"
                  onClick={() => setMinimized(true)}
                  className="btn btn-ghost btn-icon"
                  title="Minimise (Esc)"
                  aria-label="Minimise generation progress"
                >
                  <span className="material-symbols-outlined">close_fullscreen</span>
                </button>
              </div>
            </div>

            {/* Current step. The one line a glance is for. */}
            <div className="border-b border-[var(--hairline)] px-4 py-3">
              <div className="flex items-baseline justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="material-symbols-outlined shrink-0 text-[16px] text-on-surface-variant">
                    {agentIcon(activeAgent)}
                  </span>
                  <span className="truncate text-[0.8125rem] font-semibold text-on-surface">
                    {activeAgent || "System"}
                  </span>
                </div>
                <span className="shrink-0 text-[0.8125rem] font-semibold tabular-nums text-on-surface">
                  {progress}%
                </span>
              </div>

              <p className="mt-1 truncate text-[0.75rem] text-on-surface-variant" aria-live="polite">
                {isPaused ? `Paused: ${currentTask || "Generation paused"}` : currentTask || "Starting…"}
              </p>

              <div className="mt-2.5 h-1 overflow-hidden rounded-full bg-[var(--hairline-strong)]">
                <motion.div
                  className={`h-full rounded-full ${hasError ? "bg-error" : isPaused ? "bg-amber-500" : "bg-primary"}`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress}%` }}
                  transition={{ duration: reduceMotion ? 0 : 0.5, ease: EASE_OUT }}
                />
              </div>
            </div>

            {!isLive && (
              <div className="flex items-start gap-2 border-b border-[var(--hairline)] bg-[color-mix(in_srgb,var(--color-tertiary)_10%,transparent)] px-4 py-2.5">
                <span className="material-symbols-outlined mt-px shrink-0 text-[16px] text-tertiary">
                  info
                </span>
                <p className="text-[0.75rem] leading-snug text-on-surface">
                  No model configured, so this run uses the built-in sample writer. Add a provider and
                  key in <span className="font-semibold">Settings → AI settings</span> for a real draft.
                </p>
              </div>
            )}

            {/* Activity. The scroller owns the remaining height so the dialog
                does not resize on every incoming line. */}
            <div className="flex items-center justify-between border-b border-[var(--hairline)] px-4 py-2">
              <span className="panel-title">Activity</span>
              {Boolean(sessionTokens) && (
                <span className="row-meta">{(sessionTokens || 0).toLocaleString()} tokens</span>
              )}
            </div>

            <div
              ref={scrollRef}
              onScroll={onActivityScroll}
              className="min-h-0 flex-1 overflow-y-auto px-4 py-3"
              role="log"
              aria-label="Generation activity"
            >
              {entries.length > 0 ? (
                <ul className="space-y-2.5">
                  {entries.map((log, index) => {
                    const offset = startTime ? Math.max(0, Math.floor((log.timestamp - Number(startTime)) / 1000)) : null;
                    // A repeated agent name adds nothing; only the handover matters.
                    const isHandover = index === 0 || entries[index - 1].agent !== log.agent;

                    return (
                      <motion.li
                        key={log.id}
                        initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 4 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.2, ease: EASE_OUT }}
                        className="flex gap-3"
                      >
                        <span className="row-meta w-9 shrink-0 pt-px text-right">
                          {offset === null ? "" : clock(offset)}
                        </span>
                        <span className="flex w-4 shrink-0 justify-center pt-0.5">
                          {log.status === "success" ? (
                            <span className="material-symbols-outlined text-[14px] text-emerald-600 dark:text-emerald-400">
                              check_circle
                            </span>
                          ) : log.status === "error" ? (
                            <span className="material-symbols-outlined text-[14px] text-error">error</span>
                          ) : (
                            <span
                              className={`mt-1 h-1.5 w-1.5 rounded-full bg-primary ${reduceMotion ? "" : "animate-pulse"}`}
                            />
                          )}
                        </span>
                        <span className="min-w-0 flex-1">
                          {isHandover && (
                            <span className="mb-0.5 block text-[0.75rem] font-semibold text-on-surface">
                              {log.agent}
                            </span>
                          )}
                          <span
                            className={`block text-[0.8125rem] leading-snug ${
                              log.status === "error" ? "text-error" : "text-on-surface-variant"
                            }`}
                          >
                            {log.message}
                          </span>
                        </span>
                      </motion.li>
                    );
                  })}
                </ul>
              ) : (
                <p className="row-meta pt-1">Waiting for the first step…</p>
              )}
            </div>

            {/* Actions. Minimising is the safe exit, so it is named here too. */}
            <div className="flex items-center justify-between gap-3 border-t border-[var(--hairline)] px-4 py-3">
              <p className="row-meta hidden sm:block">
                {isPaused
                  ? "Generation paused. Click Resume to continue."
                  : hasError
                  ? "The run stopped early."
                  : "Keeps running if you minimise this."}
              </p>
              <div className="flex items-center gap-2">
                {isPaused && handleResume && (
                  <button
                    type="button"
                    onClick={handleResume}
                    className="btn btn-primary flex items-center gap-1.5"
                  >
                    <span className="material-symbols-outlined text-[18px]">play_arrow</span>
                    Resume
                  </button>
                )}
                {isPaused ? (
                  <button
                    type="button"
                    onClick={() => finishGeneration()}
                    className="btn btn-secondary"
                  >
                    Close
                  </button>
                ) : hasError ? (
                  <button type="button" onClick={() => finishGeneration()} className="btn btn-primary">
                    Close
                  </button>
                ) : (
                  onCancel && (
                    <button type="button" onClick={onCancel} className="btn btn-secondary btn-danger">
                      Stop generating
                    </button>
                  )
                )}
              </div>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </>
  );
}
