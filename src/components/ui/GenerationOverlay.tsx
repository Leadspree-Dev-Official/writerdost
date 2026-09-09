"use client";

import { useAppStore } from "@/lib/app-store";
import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

export function GenerationOverlay({ 
  onCancel, 
  title: propTitle,
  subtitle: propSubtitle
}: { 
  onCancel?: () => void,
  title?: string,
  subtitle?: string
}) {
  const isGenerating = useAppStore((state) => state.generationStatus.isGenerating);
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
  const usage = useAppStore((state) => state.usage);

  const title = pipelineTitle || propTitle || "Generation Pipeline";
  const subtitle = pipelineSubtitle || propSubtitle || "AI agents collaborating in real-time.";
  
  const scrollRef = useRef<HTMLDivElement>(null);
  const [elapsed, setElapsed] = useState("00:00");
  const [localFinished, setLocalFinished] = useState(false);

  useEffect(() => {
    if (isGenerating) {
      setLocalFinished(false);
    } else if (!isGenerating && isMinimized) {
      setLocalFinished(true);
    }
  }, [isGenerating, isMinimized]);

  useEffect(() => {
    if (!isGenerating || !startTime) {
      setElapsed("00:00");
      return;
    }

    const interval = setInterval(() => {
      const now = Date.now();
      const diff = Math.floor((now - Number(startTime || 0)) / 1000);
      const mins = Math.floor(Math.max(0, diff) / 60).toString().padStart(2, "0");
      const secs = (Math.max(0, diff) % 60).toString().padStart(2, "0");
      setElapsed(`${mins}:${secs}`);
    }, 1000);

    return () => clearInterval(interval);
  }, [isGenerating, startTime]);

  useEffect(() => {
    if (scrollRef.current && !isMinimized) {
      const container = scrollRef.current;
      // Check if user is near bottom (within 100px)
      const isNearBottom = container.scrollHeight - container.scrollTop - container.clientHeight < 100;

      if (isNearBottom) {
        const timer = setTimeout(() => {
          container.scrollTo({
            top: container.scrollHeight,
            behavior: "smooth",
          });
        }, 100);
        return () => clearTimeout(timer);
      }
    }
  }, [logs, isMinimized]);

  if (!isGenerating && !localFinished) return null;

  if (localFinished) {
    return (
      <AnimatePresence>
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed bottom-6 right-6 z-[100] bg-emerald-500 text-white px-6 py-2 rounded-[var(--radius-lg)] shadow-2xl flex items-center gap-4 cursor-pointer hover:bg-emerald-600 transition-colors border border-emerald-400"
          onClick={() => {
             setLocalFinished(false);
             setMinimized(false);
          }}
        >
          <span className="material-symbols-outlined text-3xl animate-pulse">task_alt</span>
          <div>
             <p className="text-base font-semibold tracking-wide">Task Completed!</p>
             <p className="text-xs font-medium opacity-90">Click here to dismiss</p>
          </div>
        </motion.div>
      </AnimatePresence>
    );
  }

  if (isMinimized) {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          className="fixed bottom-6 right-6 z-[100] bg-white dark:bg-[#141420] text-slate-900 dark:text-white p-4 rounded-[var(--radius-lg)] shadow-[0_20px_50px_-10px_rgba(0,0,0,0.2)] dark:shadow-[0_20px_50px_-10px_rgba(0,0,0,0.6)] flex items-center gap-4 cursor-pointer hover:bg-slate-50 dark:hover:bg-[#1c1c2e] transition-colors group border border-slate-200 dark:border-white/[0.06] min-w-[300px]"
          onClick={() => setMinimized(false)}
        >
          <div className="w-10 h-10 rounded-[var(--radius)] bg-slate-900 dark:bg-primary flex items-center justify-center shrink-0">
             <span className="material-symbols-outlined text-white text-lg animate-spin-slow">autorenew</span>
          </div>
          <div className="flex-1 min-w-0">
             <p className="text-xs font-bold text-slate-900 dark:text-white truncate pr-2">{currentTask || "Processing..."}</p>
             <div className="flex justify-between items-end mt-1 mb-1">
               <span className="text-[9px] font-bold text-slate-500">{progress}%</span>
               <span className="text-[9px] font-bold text-slate-500">{elapsed}</span>
             </div>
             <div className="w-full bg-slate-100 dark:bg-white/[0.06] h-1.5 rounded-full overflow-hidden">
               <div className="bg-slate-900 dark:bg-primary h-full transition-all duration-300" style={{ width: `${progress}%` }} />
             </div>
          </div>
          <button 
             className="ml-2 w-8 h-8 shrink-0 flex items-center justify-center bg-slate-100 dark:bg-white/[0.06] rounded-full hover:bg-slate-200 dark:hover:bg-white/[0.1] transition-colors text-slate-600 dark:text-slate-400"
             onClick={(e) => { e.stopPropagation(); setMinimized(false); }}
             title="Maximize"
          >
             <span className="material-symbols-outlined text-sm">open_in_full</span>
          </button>
        </motion.div>
      </AnimatePresence>
    );
  }

  const hasError = Array.isArray(logs) && logs.some(l => l.status === 'error');

  return (
    <AnimatePresence>
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-md no-print overflow-hidden selection:bg-slate-900/10"
      >
        <motion.div 
          initial={{ scale: 0.95, opacity: 0, y: 20 }}
          animate={{ scale: 1, opacity: 1, y: 0 }}
          className="w-full max-w-4xl bg-white dark:bg-[#0c0c14] border border-slate-100 dark:border-white/[0.06] shadow-[0_40px_120px_-20px_rgba(0,0,0,0.3)] dark:shadow-[0_40px_120px_-20px_rgba(0,0,0,0.7)] rounded-[var(--radius-lg)] overflow-hidden flex flex-col max-h-[85vh] relative m-4"
        >
          {/* Superior Status Line (Scanner) */}
          <div className="absolute top-0 left-0 right-0 h-[3px] bg-slate-900/5 dark:bg-white/5 overflow-hidden z-50">
             <div className="h-full w-40 bg-slate-900 dark:bg-primary animate-scan" />
          </div>

          {/* Global Toolbar */}
          <div className="px-10 py-8 border-b border-slate-50 dark:border-white/[0.04] flex items-center justify-between bg-slate-50/50 dark:bg-white/[0.02]">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-900 dark:bg-primary rounded-[var(--radius-lg)] flex items-center justify-center shadow-xl shadow-slate-900/20 dark:shadow-primary/20">
                <span className="material-symbols-outlined text-white text-2xl animate-spin-slow">settings</span>
              </div>
              <div>
                <h2 className="text-xl font-semibold text-slate-900 dark:text-white tracking-tight leading-none mb-1">{title}</h2>
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-semibold uppercase">{subtitle}</p>
              </div>
            </div>
            
            <div className="flex items-center gap-3">
               <div className="px-4 py-2 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] rounded-[var(--radius)] flex flex-col justify-center shadow-sm dark:shadow-none">
                  <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">API Status</span>
                  <div className="flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 leading-none">Live</span>
                  </div>
               </div>
               <div className="px-4 py-2 bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] rounded-[var(--radius)] flex flex-col justify-center shadow-sm dark:shadow-none min-w-[80px]">
                  <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">Tokens Used</span>
                  <span className="text-[11px] font-semibold text-slate-700 dark:text-slate-300 leading-none mt-0.5">{(sessionTokens || 0).toLocaleString()}</span>
               </div>
               <div className="px-4 py-2 bg-slate-900 dark:bg-primary rounded-[var(--radius)] text-white flex items-center gap-2 shadow-lg dark:shadow-primary/20 h-full">
                  <span className="material-symbols-outlined text-sm">timer</span>
                  <span className="text-xs font-semibold tabular-nums">{elapsed}</span>
               </div>
               <button 
                  onClick={() => setMinimized(true)}
                  className="w-10 h-10 flex items-center justify-center bg-white dark:bg-white/[0.04] border border-slate-200 dark:border-white/[0.06] text-slate-600 dark:text-slate-400 rounded-[var(--radius)] hover:bg-slate-50 dark:hover:bg-white/[0.08] hover:text-slate-900 dark:hover:text-white transition-colors shadow-sm dark:shadow-none ml-2"
                  title="Minimize Window"
               >
                  <span className="material-symbols-outlined text-sm">close_fullscreen</span>
               </button>
            </div>
          </div>

          {/* Main Orchestration Dashboard */}
          <div className="flex-1 overflow-hidden grid grid-cols-12 gap-0">
            
            {/* Sidebar: Active Identity */}
            <div className="col-span-12 lg:col-span-5 p-5 flex flex-col border-r border-slate-50 dark:border-white/[0.04] bg-white dark:bg-transparent relative">
               <div className="mb-4 p-4 bg-slate-50 dark:bg-white/[0.03] rounded-[2rem] border border-slate-100/50 dark:border-white/[0.06] flex flex-col items-center text-center relative overflow-hidden group shadow-inner dark:shadow-none">
                  <div className="absolute top-0 right-0 p-4 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
                     <span className="material-symbols-outlined text-8xl">psychology</span>
                  </div>
                  
                  <div className="relative mb-6">
                    <div className="w-24 h-24 rounded-[var(--radius-lg)] bg-white dark:bg-white/[0.06] flex items-center justify-center shadow-lg dark:shadow-none relative z-10 border border-slate-100 dark:border-white/[0.06]">
                      <span className="material-symbols-outlined text-5xl text-slate-900 dark:text-primary animate-pulse">
                        {activeAgent.includes('Writing') ? 'edit_note' : activeAgent.includes('Manuscript') ? 'auto_stories' : 'psychology'}
                      </span>
                    </div>
                    {/* Pulse Layer */}
                    <div className="absolute inset-0 w-24 h-24 bg-slate-900/10 dark:bg-primary/20 rounded-[var(--radius-lg)] animate-ping opacity-20" />
                  </div>
                  
                  <span className="px-4 py-1.5 bg-slate-900 dark:bg-primary text-white rounded-full text-[10px] font-semibold uppercase tracking-[0.3em] mb-3 relative z-10 shadow-lg dark:shadow-primary/20">
                    Active Agent
                  </span>
                  <h3 className="text-2xl font-semibold text-slate-900 dark:text-white mb-2 relative z-10">{activeAgent}</h3>
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 font-bold relative z-10 line-clamp-2 px-4 leading-relaxed">
                    {currentTask || "Analyzing current instruction set..."}
                  </p>
               </div>

               <div className="mt-auto">
                 <div className="flex justify-between items-end mb-3 px-1">
                   <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Momentum</span>
                   <span className="text-xl font-semibold text-slate-900 dark:text-white tabular-nums">{progress}%</span>
                 </div>
                 <div className="h-2.5 bg-slate-100 dark:bg-white/[0.06] rounded-full overflow-hidden p-0.5 border border-slate-200/50 dark:border-white/[0.04] shadow-inner dark:shadow-none">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: `${progress}%` }}
                     className="h-full bg-slate-900 dark:bg-primary rounded-full shadow-lg dark:shadow-primary/30 relative group"
                   >
                     <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 animate-shimmer" />
                   </motion.div>
                 </div>
               </div>
            </div>

            <div className="col-span-12 lg:col-span-7 flex flex-col bg-slate-50/30 dark:bg-white/[0.01] overflow-hidden">
              <div className="p-4 border-b border-slate-50 dark:border-white/[0.04] flex items-center gap-3 bg-white/50 dark:bg-transparent backdrop-blur-sm shrink-0">
                <span className="material-symbols-outlined text-sm text-slate-400 dark:text-slate-500">terminal</span>
                <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">Autonomous Feed Stream</span>
              </div>
              
              <div 
                ref={scrollRef}
                className="flex-1 p-5 py-6 overflow-y-auto space-y-3 scroll-smooth"
              >
                {Array.isArray(logs) && logs.length > 0 ? (
                  logs.map((log) => (
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      key={log.id} 
                      className="flex gap-4 group border-l-2 border-slate-200 dark:border-white/[0.06] pl-6 hover:border-slate-400 dark:hover:border-primary/40 transition-all"
                    >
                      <div className="flex flex-col flex-1">
                        <div className="flex items-center gap-3 mb-1.5">
                          <span className={`px-2 py-0.5 rounded text-[8px] font-semibold ${
                            log.agent === 'System' ? 'bg-slate-200 dark:bg-white/[0.06] text-slate-600 dark:text-slate-400' : 'bg-slate-900 dark:bg-primary text-white shadow-sm'
                          }`}>
                            {log.agent}
                          </span>
                          {log.status === 'success' && <span className="material-symbols-outlined text-xs text-emerald-500">check_circle</span>}
                        </div>
                        <p className={`text-xs font-medium leading-relaxed transition-colors ${
                          log.status === 'error' ? 'text-rose-500 dark:text-rose-400' : 'text-slate-600 dark:text-slate-400 group-hover:text-slate-900 dark:group-hover:text-white'
                        }`}>
                          {log.message}
                        </p>
                      </div>
                    </motion.div>
                  ))
                ) : (
                  <div className="h-full flex flex-col items-center justify-center opacity-30 grayscale">
                     <span className="material-symbols-outlined text-4xl mb-3 animate-pulse">insights</span>
                     <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-600">Awaiting Neural Link...</p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Action Floor */}
          <div className="px-10 py-8 border-t border-slate-50 dark:border-white/[0.04] bg-slate-50/50 dark:bg-white/[0.02] flex items-center justify-between">
             <div className="flex items-center gap-3 opacity-50 hover:opacity-100 transition-opacity">
                <span className="material-symbols-outlined text-sm text-slate-500 dark:text-slate-600">verified_user</span>
                <p className="text-[10px] text-slate-500 dark:text-slate-600 font-semibold leading-none">
                  End-to-End Encryption Active
                </p>
             </div>
             
             <div className="flex gap-4">
                {onCancel && !hasError && (
                  <button
                    onClick={onCancel}
                    className="btn btn-secondary hover:text-error hover:border-error/40 group"
                  >
                    <span className="material-symbols-outlined text-sm group-hover:rotate-90 transition-transform">close</span>
                    Terminate Generation
                  </button>
                )}
                {hasError && (
                  <button 
                    onClick={() => useAppStore.getState().finishGeneration()}
                    className="px-10 py-2 rounded-[var(--radius-lg)] bg-slate-900 dark:bg-primary text-white text-[10px] font-semibold shadow-xl dark:shadow-primary/20 active:scale-95 transition-all"
                  >
                    Confirm Exit
                  </button>
                )}
             </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}


