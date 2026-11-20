"use client";

import { useState } from "react";

export default function SwarmPipelineDiagram() {
  const [selectedStage, setSelectedStage] = useState<number>(0);

  const stages = [
    {
      id: "memory-supervisor",
      number: "01",
      title: "Memory Supervisor & RKB",
      subtitle: "Global State & Knowledge Base",
      icon: "neurology",
      tag: "Supervisor Agent",
      summary:
        "Analyzes source documents, research PDFs, and core premises to construct the immutable Research Knowledge Base (RKB). Tracks section progress, manages retry states, and guarantees cross-chapter narrative consistency across 100,000+ words.",
      metrics: [
        { label: "Continuity Check", val: "100% Retained" },
        { label: "Context Window", val: "Zero Overflow" },
      ],
      details: [
        "Constructs master entity relationships & arguments",
        "Eliminates contradictory statements across chapters",
        "Dispatches structured micro-payloads per section",
      ],
    },
    {
      id: "quota-pacing",
      number: "02",
      title: "Dynamic Quota & Pacing Manager",
      subtitle: "Mathematical Chapter Disaggregation",
      icon: "calculate",
      tag: "Pacing Engine",
      summary:
        "Translates total manuscript target (e.g. 50,000 words) into micro-units. Enforces strict limits of 800–1,000 words per section to keep prompt attention focused. Automatically recalculates deficits to ensure the final book hits exact length targets.",
      metrics: [
        { label: "Quota Formula", val: "Total / 800" },
        { label: "Deficit Redistribution", val: "Automatic" },
      ],
      details: [
        "1 section = 800–1,000 words maximum",
        "Auto-balances chapter pacing based on genre",
        "Dynamic audit loop detects and corrects deficits",
      ],
    },
    {
      id: "sub-swarm",
      number: "03",
      title: "Concurrent Writing Sub-Swarm",
      subtitle: "Multi-Model Parallel Generation",
      icon: "dynamic_feed",
      tag: "Execution Swarm",
      summary:
        "Executes a 3-agent writing pod per section: Context Agent injects historical summaries, Prose Drafter generates authoritative content across parallel API threads (Claude, GPT, Gemini, or local Ollama), and Formatter ensures semantic Markdown.",
      metrics: [
        { label: "Parallelism", val: "High (Multi-API)" },
        { label: "Local Concurrency", val: "Queue Managed" },
      ],
      details: [
        "Context Agent isolates historical continuity",
        "Prose Drafter writes dense, authoritative copy",
        "Formatter enforces typography & heading hierarchy",
      ],
    },
    {
      id: "qa-critic",
      number: "04",
      title: "Strict QA Critic & Verification",
      subtitle: "Automated Fluff Rejection & Gatekeeper",
      icon: "verified",
      tag: "Audit Gate",
      summary:
        "Evaluates every drafted section against RKB constraints, stylistic tone benchmarks, and repetitive fluff patterns. Rejects substandard drafts with an internal retry limit (max 2) before persisting checkpoints to the manuscript database.",
      metrics: [
        { label: "Fluff Detection", val: "Real-Time Scoring" },
        { label: "Max Auto-Retries", val: "2 per section" },
      ],
      details: [
        "Strict rejection of generic AI buzzwords & filler",
        "Verifies adherence to research facts and data",
        "Atomic checkpoint save ensures recovery on failure",
      ],
    },
  ];

  return (
    <section id="architecture" className="py-20 md:py-28 bg-surface dark:bg-[#0b0d12] border-b border-outline-variant/30 dark:border-white/8 font-body">
      <div className="wrap-screen">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <span className="text-[12px] font-bold text-emerald-700 dark:text-emerald-400 uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            System Directive Architecture
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-on-surface dark:text-slate-100 tracking-tight leading-tight">
            How Writerdost Generates 100,000 Words Without Hallucination
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant dark:text-slate-400 leading-relaxed">
            Standard single-prompt LLMs forget characters and repeat ideas after 3,000 words. Writerdost coordinates an autonomous 4-stage pipeline that treats a book like an engineering build.
          </p>
        </div>

        {/* 4-Stage Architecture Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stages.map((stg, idx) => {
            const isSelected = selectedStage === idx;
            return (
              <div
                key={stg.id}
                data-stage={stg.id}
                onClick={() => setSelectedStage(idx)}
                className={`card-lift cursor-pointer p-5 rounded-xl border transition-all flex flex-col justify-between ${
                  isSelected
                    ? "bg-emerald-500/5 dark:bg-[#141824] border-emerald-500/50 shadow-lg shadow-emerald-500/5 ring-1 ring-emerald-500/30"
                    : "bg-surface-container-lowest dark:bg-[#10121a] border-outline-variant/30 dark:border-white/8 hover:border-outline-variant/60 dark:hover:border-white/20"
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-[11px] font-mono font-bold text-emerald-700 dark:text-emerald-400 px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20">
                      STAGE {stg.number}
                    </span>
                    <span className="material-symbols-outlined text-on-surface-variant dark:text-slate-400 text-[20px]">
                      {stg.icon}
                    </span>
                  </div>

                  <h3 className="text-[15px] font-bold text-on-surface dark:text-slate-100 tracking-tight mb-1">
                    {stg.title}
                  </h3>
                  <p className="text-[11.5px] font-medium text-on-surface-variant/80 dark:text-slate-400 mb-3">
                    {stg.subtitle}
                  </p>
                  <p className="text-[12px] text-on-surface-variant dark:text-slate-300 leading-relaxed">
                    {stg.summary}
                  </p>
                </div>

                <div className="mt-5 pt-4 border-t border-outline-variant/20 dark:border-white/8 flex items-center justify-between">
                  <span className="text-[10px] font-mono uppercase tracking-wider text-on-surface-variant/80 dark:text-slate-400">
                    {stg.tag}
                  </span>
                  <span
                    className={`text-[11px] font-semibold flex items-center gap-1 ${
                      isSelected ? "text-emerald-700 dark:text-emerald-400" : "text-on-surface-variant dark:text-slate-400"
                    }`}
                  >
                    {isSelected ? "Active Stage" : "Inspect →"}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Deep Dive Telemetry Display for Selected Stage */}
        <div className="app-frame p-6 sm:p-8 bg-surface-container dark:bg-[#12141f] border border-outline-variant/30 dark:border-white/10 rounded-2xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 pb-6 border-b border-outline-variant/20 dark:border-white/8">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 dark:bg-emerald-400 animate-pulse" />
                <span className="text-[12px] font-mono uppercase tracking-wider text-emerald-700 dark:text-emerald-400">
                  Telemetry Snapshot: Stage {stages[selectedStage].number} — {stages[selectedStage].title}
                </span>
              </div>
              <p className="text-xl font-bold text-on-surface dark:text-slate-100">
                {stages[selectedStage].subtitle}
              </p>
            </div>

            <div className="flex items-center gap-4">
              {stages[selectedStage].metrics.map((m) => (
                <div key={m.label} className="bg-surface-container-lowest dark:bg-white/5 border border-outline-variant/20 dark:border-white/8 px-4 py-2 rounded-lg">
                  <span className="text-[10.5px] font-mono uppercase tracking-wider text-on-surface-variant dark:text-slate-400 block">
                    {m.label}
                  </span>
                  <span className="text-[14px] font-bold text-on-surface dark:text-slate-100 block">
                    {m.val}
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="pt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            {stages[selectedStage].details.map((detail, dIdx) => (
              <div key={dIdx} className="flex items-start gap-3 p-3.5 rounded-lg bg-surface-container-lowest/80 dark:bg-white/2 border border-outline-variant/20 dark:border-white/5">
                <span className="material-symbols-outlined text-emerald-600 dark:text-emerald-400 text-[18px] mt-0.5 shrink-0">
                  check_circle
                </span>
                <span className="text-[13px] text-on-surface dark:text-slate-300 leading-snug">
                  {detail}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
