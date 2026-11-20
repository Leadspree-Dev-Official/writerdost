"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type TabKey = "agents" | "copywriting" | "editor" | "rewrite" | "wordpress";

export default function HeroInteractivePreview() {
  const [activeTab, setActiveTab] = useState<TabKey>("agents");
  const [activeFont, setActiveFont] = useState<string>("eb-garamond");
  const [activeTone, setActiveTone] = useState<string>("Bestseller");
  const [copyMode, setCopyMode] = useState<"cold-email" | "sales-pitch" | "google-ads">("cold-email");
  const [synced, setSynced] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [simulatedWordCount, setSimulatedWordCount] = useState(14820);
  const [wpSubView, setWpSubView] = useState<"post" | "geo">("post");

  // Gentle periodic word-count tick in agent mode
  useEffect(() => {
    if (activeTab !== "agents") return;
    const interval = setInterval(() => {
      setSimulatedWordCount((prev) => prev + Math.floor(Math.random() * 8) + 2);
    }, 1800);
    return () => clearInterval(interval);
  }, [activeTab]);

  const handleSyncWordPress = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setSynced(true);
      setTimeout(() => setSynced(false), 5000);
    }, 1200);
  };

  const tones: Record<string, { before: string; after: string; note: string }> = {
    Bestseller: {
      before:
        "Artificial intelligence has become very important for business operations. Companies that do not use automated systems will lose money and market share in the future.",
      after:
        "The shift arrived without ceremony: autonomous agents slipped from lab curiosity into the operational spine of modern enterprise. Leaders who hesitate to orchestrate them are no longer preserving safety—they are financing their own irrelevance.",
      note: "Elevated cadence, sensory authority, high narrative tension.",
    },
    Conversational: {
      before:
        "Artificial intelligence has become very important for business operations. Companies that do not use automated systems will lose money and market share in the future.",
      after:
        "Here's the honest truth: AI isn't some far-off sci-fi experiment anymore. It's already running payroll, answering tickets, and drafting code. If your team isn't using agents today, you're essentially racing a Ferrari on a bicycle.",
      note: "Warm, relatable, approachable dialogue style.",
    },
    Provocative: {
      before:
        "Artificial intelligence has become very important for business operations. Companies that do not use automated systems will lose money and market share in the future.",
      after:
        "Stop pretending 20th-century workflows will survive the next eighteen months. The human-in-the-loop myth is evaporating; autonomous swarms are building entire media empires overnight while legacy boardrooms debate prompt hygiene.",
      note: "Urgent, counter-intuitive, debate-sparking phrasing.",
    },
    Academic: {
      before:
        "Artificial intelligence has become very important for business operations. Companies that do not use automated systems will lose money and market share in the future.",
      after:
        "Empirical observation across emerging software ecosystems demonstrates that multi-agent architectures yield non-linear reductions in cognitive overhead. Consequently, institutional latency is penalized proportionally as algorithmic throughput accelerates.",
      note: "Rigorous vocabulary, systematic framing, analytical depth.",
    },
  };

  return (
    <div
      id="interactive-demo"
      className="scroll-mt-24 w-full max-w-6xl mx-auto rounded-2xl border border-outline-variant/30 dark:border-white/10 bg-surface-container-lowest dark:bg-[#10101c] shadow-xl shadow-black/5 dark:shadow-black/50 overflow-hidden font-body transition-all duration-300"
    >
      {/* Studio Header Bar */}
      <div className="bg-surface-container dark:bg-[#151525] px-4 py-3 border-b border-outline-variant/30 flex flex-wrap items-center justify-between gap-3">
        {/* Mac OS Window Controls + Project Title */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-rose-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-amber-500/80 inline-block" />
            <span className="w-3 h-3 rounded-full bg-emerald-500/80 inline-block" />
          </div>
          <div className="h-4 w-px bg-outline-variant/40 hidden sm:block" />
          <span className="text-[12.5px] font-semibold text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-[16px] text-primary">auto_stories</span>
            The Autonomous Enterprise (300k Words).epub
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20 hidden md:inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            BookMemoryBank Active
          </span>
        </div>

        {/* Tab Navigation Switchers */}
        <div
          role="tablist"
          aria-label="Studio preview features"
          className="flex items-center gap-1 bg-surface-container-high dark:bg-[#1c1c30] p-1 rounded-xl"
        >
          <button
            type="button"
            role="tab"
            id="studio-tab-agents"
            aria-selected={activeTab === "agents"}
            aria-controls="studio-panel-agents"
            onClick={() => setActiveTab("agents")}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "agents"
                ? "bg-surface-container-lowest dark:bg-[#252542] text-primary shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">smart_toy</span>
            <span className="hidden sm:inline">300k Book Swarm</span>
            <span className="sm:hidden">Swarm</span>
          </button>
          <button
            type="button"
            role="tab"
            id="studio-tab-copywriting"
            aria-selected={activeTab === "copywriting"}
            aria-controls="studio-panel-copywriting"
            onClick={() => setActiveTab("copywriting")}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "copywriting"
                ? "bg-surface-container-lowest dark:bg-[#252542] text-primary shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">campaign</span>
            <span className="hidden sm:inline">Copywriting Studio</span>
            <span className="sm:hidden">Copy</span>
            <span className="text-[9.5px] px-1 py-0.2 rounded bg-primary/20 text-primary font-bold hidden md:inline">NEW</span>
          </button>
          <button
            type="button"
            role="tab"
            id="studio-tab-editor"
            aria-selected={activeTab === "editor"}
            aria-controls="studio-panel-editor"
            onClick={() => setActiveTab("editor")}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "editor"
                ? "bg-surface-container-lowest dark:bg-[#252542] text-primary shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">edit_note</span>
            <span className="hidden sm:inline">Focused Canvas</span>
            <span className="sm:hidden">Editor</span>
          </button>
          <button
            type="button"
            role="tab"
            id="studio-tab-rewrite"
            aria-selected={activeTab === "rewrite"}
            aria-controls="studio-panel-rewrite"
            onClick={() => setActiveTab("rewrite")}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "rewrite"
                ? "bg-surface-container-lowest dark:bg-[#252542] text-primary shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">transform</span>
            <span className="hidden sm:inline">Rewrite Studio</span>
            <span className="sm:hidden">Rewrite</span>
          </button>
          <button
            type="button"
            role="tab"
            id="studio-tab-wordpress"
            aria-selected={activeTab === "wordpress"}
            aria-controls="studio-panel-wordpress"
            onClick={() => setActiveTab("wordpress")}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "wordpress"
                ? "bg-surface-container-lowest dark:bg-[#252542] text-primary shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">sync_alt</span>
            <span className="hidden sm:inline">WordPress Sync</span>
            <span className="sm:hidden">WP</span>
          </button>
        </div>
      </div>

      {/* Tab 1: Agent Swarm in Action */}
      {activeTab === "agents" && (
        <div
          id="studio-panel-agents"
          role="tabpanel"
          aria-labelledby="studio-tab-agents"
          tabIndex={0}
          className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px] focus:outline-hidden"
        >
          {/* Left Column: Swarm Status & Agent Pipeline */}
          <div className="lg:col-span-4 border-b lg:border-b-0 lg:border-r border-outline-variant/30 p-5 bg-surface-container-low/40 dark:bg-[#121222]/40 flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider">
                  Swarm Orchestration
                </span>
                <span className="text-[11px] font-mono text-primary font-bold">
                  Pipeline: 78%
                </span>
              </div>

              {/* Agent Cards */}
              <div className="space-y-2.5">
                {/* Agent 1 */}
                <div className="p-3 rounded-xl bg-surface-container-lowest dark:bg-[#18182c] border border-outline-variant/30 shadow-xs">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[14px]">travel_explore</span>
                      </span>
                      <span className="text-[12px] font-bold text-on-surface">1. Research Agent</span>
                    </div>
                    <span className="text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[13px]">check_circle</span>
                      Ready
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-tight">
                    Synthesized 14 web sources, 2 market PDFs & competitive positioning notes.
                  </p>
                </div>

                {/* Agent 2 */}
                <div className="p-3 rounded-xl bg-surface-container-lowest dark:bg-[#18182c] border border-outline-variant/30 shadow-xs">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[14px]">account_tree</span>
                      </span>
                      <span className="text-[12px] font-bold text-on-surface">2. Architect Agent</span>
                    </div>
                    <span className="text-[10.5px] font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-0.5">
                      <span className="material-symbols-outlined text-[13px]">check_circle</span>
                      Approved
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-tight">
                    Constructed 8-chapter narrative arc, key arguments & chapter word allocations.
                  </p>
                </div>

                {/* Agent 3 */}
                <div className="p-3 rounded-xl bg-primary/10 border border-primary/30 shadow-xs ring-1 ring-primary/25">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-primary text-white flex items-center justify-center shadow-xs">
                        <span className="material-symbols-outlined text-[14px] animate-spin">sync</span>
                      </span>
                      <span className="text-[12px] font-bold text-primary">3. Parallel Chapter Writers</span>
                    </div>
                    <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary text-white uppercase tracking-wider">
                      Drafting
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface leading-tight">
                    Generating Chapter 4 & 5 concurrently. Matching authoritative tech-exec voice.
                  </p>
                  <div className="w-full bg-primary/20 h-1.5 rounded-full mt-2 overflow-hidden">
                    <div className="bg-primary h-full rounded-full w-[84%] animate-pulse" />
                  </div>
                </div>

                {/* Agent 4 */}
                <div className="p-3 rounded-xl bg-surface-container-lowest dark:bg-[#18182c] border border-outline-variant/30 shadow-xs">
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-md bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center">
                        <span className="material-symbols-outlined text-[14px]">rate_review</span>
                      </span>
                      <span className="text-[12px] font-bold text-on-surface">4. Critic & Polisher</span>
                    </div>
                    <span className="text-[10.5px] font-semibold text-purple-600 dark:text-purple-400">
                      Queued
                    </span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant leading-tight">
                    Scheduled to verify terminology cohesion, tone calibration, and prose rhythm.
                  </p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-outline-variant/30 flex items-center justify-between text-[11.5px] text-on-surface-variant">
              <span>Model: <strong className="text-on-surface">Claude 3.5 Sonnet</strong></span>
              <span>Tokens: <strong className="text-on-surface">38.4k</strong></span>
            </div>
          </div>

          {/* Right Column: Live Chapter Stream View */}
          <div className="lg:col-span-8 p-6 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-outline-variant/20 pb-3">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                    Chapter 4 • In-Flight Stream
                  </span>
                  <h3 className="text-lg font-bold text-on-surface">
                    Decentralized Decision Latency & Agent Autonomy
                  </h3>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-md bg-surface-container text-on-surface-variant font-mono tabular-nums text-[11px]">
                    {simulatedWordCount.toLocaleString()} words
                  </span>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                </div>
              </div>

              {/* Streaming Content Display */}
              <div className="space-y-3 text-[13.5px] leading-relaxed text-on-surface/90 font-serif">
                <p>
                  The foundational flaw in legacy automation was not technological capacity—it was topological design. Traditional software funneled enterprise choices into central human bottlenecks, producing fatal lag. When market signals shift in milliseconds, waiting for weekly executive approval is an existential liability.
                </p>
                <p>
                  By contrasting brittle sequential workflows with autonomous agent swarms, organizations achieve asynchronous intelligence. In this new topology, specialized agents execute micro-decisions within verified guardrails, escalating only genuine novel anomalies to human stewards.
                </p>
                <p className="relative border-l-2 border-primary/60 pl-3 italic text-on-surface-variant">
                  &ldquo;Autonomy is not the abdication of leadership; it is the algorithmic scaling of intent. When your agents share your strategic doctrine, velocity multiplies without drift.&rdquo;
                </p>
                <p className="text-on-surface/80 flex items-center gap-1.5 font-sans text-[12.5px]">
                  <span className="inline-block w-2 h-4 bg-primary animate-pulse" />
                  <span className="text-on-surface-variant">
                    Writing section 4.3: Mathematical modeling of consensus latency...
                  </span>
                </p>
              </div>
            </div>

            {/* Quick action bar */}
            <div className="mt-6 pt-4 border-t border-outline-variant/25 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2 text-[12px] text-on-surface-variant">
                <span className="material-symbols-outlined text-[16px] text-emerald-500">check</span>
                <span>BookMemoryBank continuity synced (Ch. 1-24)</span>
                <span className="mx-1">•</span>
                <span className="material-symbols-outlined text-[16px] text-emerald-500">check</span>
                <span>300k Word Omnibus Engine</span>
              </div>
              <Link
                href="/book"
                className="btn btn-primary btn-sm flex items-center gap-1.5 shadow-sm"
              >
                <span>Launch 300k Book Studio</span>
                <span className="material-symbols-outlined text-[15px]">auto_stories</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Dedicated Copywriting Studio */}
      {activeTab === "copywriting" && (
        <div
          id="studio-panel-copywriting"
          role="tabpanel"
          aria-labelledby="studio-tab-copywriting"
          tabIndex={0}
          className="p-6 min-h-[460px] flex flex-col justify-between focus:outline-hidden"
        >
          <div>
            {/* Copywriting Mode Switcher */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-xl bg-surface-container-low dark:bg-[#16162a] border border-outline-variant/30 mb-6">
              <div className="flex flex-wrap items-center gap-1.5">
                <span className="text-[11px] font-bold text-on-surface-variant px-2 uppercase tracking-wider">
                  Conversion Framework:
                </span>
                <button
                  type="button"
                  onClick={() => setCopyMode("cold-email")}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${
                    copyMode === "cold-email"
                      ? "bg-primary text-white shadow-xs"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                  }`}
                >
                  B2B Cold Email (PAS)
                </button>
                <button
                  type="button"
                  onClick={() => setCopyMode("sales-pitch")}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${
                    copyMode === "sales-pitch"
                      ? "bg-primary text-white shadow-xs"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                  }`}
                >
                  60s Elevator Sales Pitch
                </button>
                <button
                  type="button"
                  onClick={() => setCopyMode("google-ads")}
                  className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${
                    copyMode === "google-ads"
                      ? "bg-primary text-white shadow-xs"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                  }`}
                >
                  Google Responsive Search Ads (RSA)
                </button>
              </div>

              {/* Anti-AI Slop Indicator */}
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
                <span className="material-symbols-outlined text-[14px]">shield</span>
                <span>Anti-AI Cliché Filter Active</span>
              </div>
            </div>

            {/* Copy Display Area */}
            {copyMode === "cold-email" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-4 p-4 rounded-xl bg-surface-container-low/50 dark:bg-[#141426] border border-outline-variant/30 space-y-3">
                  <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">
                    Schwartz Calibration
                  </span>
                  <div className="p-2.5 rounded-lg bg-surface-container dark:bg-[#1a1a30] text-[12px] text-on-surface-variant space-y-1">
                    <strong className="text-on-surface block">Stage: Problem-Aware</strong>
                    <p className="text-[11.5px]">Agitates the rising cost of paid acquisition without sounding accusatory or preachy.</p>
                  </div>
                  <div className="pt-2 border-t border-outline-variant/20 space-y-1.5 text-[11px] text-on-surface-variant">
                    <div className="flex justify-between">
                      <span>Reading Grade:</span>
                      <strong className="text-on-surface font-mono">6th Grade (Flesch)</strong>
                    </div>
                    <div className="flex justify-between">
                      <span>Word Count:</span>
                      <strong className="text-emerald-600 dark:text-emerald-400 font-mono">98 words (High Reply)</strong>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-8 p-5 rounded-xl bg-white dark:bg-[#0f0f1c] border border-outline-variant/30 shadow-xs space-y-4">
                  <div className="pb-3 border-b border-outline-variant/20 flex flex-wrap items-center justify-between gap-2">
                    <span className="text-[11.5px] font-bold text-on-surface-variant font-mono">
                      Subject Line: <span className="text-primary font-bold">Quick question on your organic pipeline</span>
                    </span>
                    <span className="text-[10.5px] px-2 py-0.5 rounded bg-primary/10 text-primary font-bold">
                      PAS Framework
                    </span>
                  </div>
                  <div className="text-[13.5px] leading-relaxed text-on-surface space-y-2.5 font-sans">
                    <p>Hi [First Name],</p>
                    <p>
                      Noticed your team is scaling paid acquisition on LinkedIn this quarter. Most marketing leads hit an acquisition wall right here as CAC climbs 35% with declining lead quality.
                    </p>
                    <p>
                      We built an organic search and authority content engine that generated $320k in ARR pipeline for CloudFlow in 90 days without paid ad spend.
                    </p>
                    <p>
                      Mind if I send over a 2-minute video teardown showing where your competitors are picking up free organic demo bookings?
                    </p>
                    <p className="text-on-surface-variant pt-1 text-[12px] font-mono">
                      48-Hour Bump: &ldquo;Hey [First Name], bumping this once in case it got buried. Worth a 2-minute look?&rdquo;
                    </p>
                  </div>
                </div>
              </div>
            )}

            {copyMode === "sales-pitch" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-4 p-4 rounded-xl bg-surface-container-low/50 dark:bg-[#141426] border border-outline-variant/30 space-y-3">
                  <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">
                    Persuasion Architecture
                  </span>
                  <div className="p-2.5 rounded-lg bg-surface-container dark:bg-[#1a1a30] text-[12px] text-on-surface-variant space-y-1">
                    <strong className="text-on-surface block">Hook &rarr; Story &rarr; Offer</strong>
                    <p className="text-[11.5px]">Positions the proprietary multi-agent swarm as the only bridge from manual fatigue to autonomous scale.</p>
                  </div>
                  <div className="pt-2 border-t border-outline-variant/20 space-y-1 text-[11px] text-on-surface-variant">
                    <span className="block font-semibold text-on-surface">Target Delivery Time:</span>
                    <span className="font-mono text-primary font-bold text-[12px]">55 Seconds (Elevator Ready)</span>
                  </div>
                </div>

                <div className="lg:col-span-8 p-5 rounded-xl bg-white dark:bg-[#0f0f1c] border border-outline-variant/30 shadow-xs space-y-3">
                  <div className="pb-3 border-b border-outline-variant/20 flex items-center justify-between">
                    <span className="text-[12px] font-bold text-on-surface">60-Second Conversion Pitch</span>
                    <span className="text-[10.5px] px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold">
                      Zero AI Fluff
                    </span>
                  </div>
                  <blockquote className="text-[14px] leading-relaxed text-on-surface italic font-serif border-l-2 border-primary/60 pl-3">
                    &ldquo;Standard AI works fine for a 500-word paragraph. But when you ask it for an authoritative 300,000-word book or high-converting copy, it collapses into repetitive robotic filler. We built Writerdost around specialized autonomous swarms with BookMemoryBank continuity. You get publication-ready manuscripts and conversion campaigns in an afternoon, with zero AI slop and full copyright ownership.&rdquo;
                  </blockquote>
                  <div className="p-3 rounded-lg bg-surface-container-low dark:bg-[#16162a] text-[11.5px] text-on-surface-variant font-sans">
                    <strong className="text-on-surface">🛡️ Instant Objection Buster: </strong>
                    Addresses hallucination concerns by citing the 3-Tier Source Classification and empirical fact catalog before writing.
                  </div>
                </div>
              </div>
            )}

            {copyMode === "google-ads" && (
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
                <div className="lg:col-span-4 p-4 rounded-xl bg-surface-container-low/50 dark:bg-[#141426] border border-outline-variant/30 space-y-3">
                  <span className="text-[11px] font-bold text-primary uppercase tracking-wider block">
                    Google Ads Compliance
                  </span>
                  <div className="p-2.5 rounded-lg bg-surface-container dark:bg-[#1a1a30] text-[12px] text-on-surface-variant space-y-1">
                    <strong className="text-on-surface block">Ad Strength: Excellent</strong>
                    <p className="text-[11.5px]">Strict character constraint adherence (&le;30 char headlines, &le;90 char descriptions) for maximum Quality Score.</p>
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">verified</span>
                    <span>Zero Policy Violations</span>
                  </div>
                </div>

                <div className="lg:col-span-8 p-5 rounded-xl bg-white dark:bg-[#0f0f1c] border border-outline-variant/30 shadow-xs space-y-3">
                  <div className="pb-2 border-b border-outline-variant/20 flex items-center justify-between">
                    <span className="text-[12px] font-bold text-on-surface">Responsive Search Ad Variations</span>
                    <span className="text-[10px] font-mono text-on-surface-variant">Character Count Verified</span>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low dark:bg-[#16162c] text-[12px]">
                      <span className="font-semibold text-on-surface">AI Book Writer: 300,000 Words</span>
                      <span className="text-[11px] font-mono text-emerald-500 font-bold">29 / 30 chars</span>
                    </div>
                    <div className="flex items-center justify-between p-2.5 rounded-lg bg-surface-container-low dark:bg-[#16162c] text-[12px]">
                      <span className="font-semibold text-on-surface">Zero AI Slop. Human Cadence.</span>
                      <span className="text-[11px] font-mono text-emerald-500 font-bold">28 / 30 chars</span>
                    </div>
                    <div className="p-2.5 rounded-lg bg-surface-container-low dark:bg-[#16162c] text-[12px] space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="text-on-surface">Write 300,000-word manuscripts or high-converting sales copy with autonomous agent swarms.</span>
                        <span className="text-[11px] font-mono text-emerald-500 font-bold shrink-0 ml-2">89 / 90 chars</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-3 flex flex-wrap items-center justify-between gap-3 text-[12px] text-on-surface-variant border-t border-outline-variant/20">
            <span>Eugene Schwartz 5 Stages • PAS &amp; AIDA • Google RSA &amp; Meta Compliant</span>
            <Link href="/copywriting" className="text-primary font-bold hover:underline flex items-center gap-1">
              Explore Copywriting Studio &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Tab 2: Focused Canvas Editor */}
      {activeTab === "editor" && (
        <div
          id="studio-panel-editor"
          role="tabpanel"
          aria-labelledby="studio-tab-editor"
          tabIndex={0}
          className="p-6 min-h-[460px] flex flex-col justify-between focus:outline-hidden"
        >
          <div>
            {/* Editor Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-3 p-2 rounded-xl bg-surface-container-low dark:bg-[#16162a] border border-outline-variant/30 mb-6">
              <div className="flex items-center gap-1">
                <span className="text-[11px] font-semibold text-on-surface-variant px-2">Font:</span>
                {[
                  { id: "eb-garamond", name: "EB Garamond" },
                  { id: "lora", name: "Lora" },
                  { id: "merriweather", name: "Merriweather" },
                  { id: "inter", name: "Inter" },
                ].map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setActiveFont(f.id)}
                    className={`px-2.5 py-1 rounded-md text-[11.5px] font-medium transition-colors cursor-pointer ${
                      activeFont === f.id
                        ? "bg-primary text-white shadow-xs"
                        : "text-on-surface-variant hover:text-on-surface hover:bg-surface-container"
                    }`}
                  >
                    {f.name}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-1.5 text-on-surface-variant">
                <button
                  type="button"
                  className="p-1.5 rounded hover:bg-surface-container text-on-surface font-bold text-[12px] w-7 h-7 flex items-center justify-center"
                >
                  B
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded hover:bg-surface-container text-on-surface italic text-[12px] w-7 h-7 flex items-center justify-center"
                >
                  I
                </button>
                <button
                  type="button"
                  className="p-1.5 rounded hover:bg-surface-container text-on-surface text-[12px] w-7 h-7 flex items-center justify-center"
                >
                  H2
                </button>
                <div className="h-4 w-px bg-outline-variant/30 mx-1" />
                <span className="text-[11px] font-mono">1,840 words • 7 min read</span>
              </div>
            </div>

            {/* Manuscript Sheet Mockup */}
            <div
              className={`max-w-2xl mx-auto p-8 rounded-xl bg-white dark:bg-[#0c0c16] border border-outline-variant/25 shadow-sm transition-all duration-300 ${
                activeFont === "eb-garamond"
                  ? "font-serif text-[17px] leading-[1.8]"
                  : activeFont === "lora"
                  ? "font-serif text-[16px] leading-[1.75]"
                  : activeFont === "merriweather"
                  ? "font-serif text-[15.5px] leading-[1.85]"
                  : "font-sans text-[15px] leading-[1.7]"
              }`}
            >
              <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-slate-100 mb-4">
                Chapter 1: The Geometry of Sovereign Thought
              </h2>
              <p className="text-slate-800 dark:text-slate-200 mb-4">
                To write a book with artificial intelligence is not to abdicate authority, but to conduct an orchestra. For centuries, the author wrestled alone against the silence of the blank page, bound by the physiological limits of hand and fatigue.
              </p>

              {/* In-line AI Assistant Highlight Box */}
              <div className="relative my-5 p-4 rounded-xl bg-indigo-50/80 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800/60 not-italic font-sans">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="w-5 h-5 rounded bg-primary text-white flex items-center justify-center">
                      <span className="material-symbols-outlined text-[13px]">auto_awesome</span>
                    </span>
                    <span className="text-[12px] font-bold text-primary">
                      Writerdost In-line Copilot
                    </span>
                  </div>
                  <span className="text-[11px] font-semibold text-on-surface-variant">Suggestion</span>
                </div>
                <p className="text-[12.5px] text-on-surface mb-3">
                  &ldquo;Deepen historical contrast: introduce the Renaissance scriptorium versus the modern neural latent space.&rdquo;
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    className="px-3 py-1 rounded-md bg-primary text-white text-[11.5px] font-bold hover:bg-primary-container transition-colors shadow-xs"
                  >
                    Apply Revision
                  </button>
                  <button
                    type="button"
                    className="px-2.5 py-1 rounded-md bg-surface-container text-on-surface text-[11.5px] font-medium hover:bg-surface-container-high transition-colors"
                  >
                    View 3 Variants
                  </button>
                </div>
              </div>

              <p className="text-slate-800 dark:text-slate-200">
                Today, the writer sits as an architect of ideas. The intelligence does not supplant human vision; it expands the aperture of what one mind can sculpt within a single lifetime.
              </p>
            </div>
          </div>

          <div className="mt-6 pt-3 flex items-center justify-between text-[12px] text-on-surface-variant">
            <span>Live Typographic Preview • TipTap Engine • Instant Auto-Save</span>
            <Link href="/editor" className="text-primary font-semibold hover:underline flex items-center gap-1">
              Test Full Editor in Workspace &rarr;
            </Link>
          </div>
        </div>
      )}

      {/* Tab 3: Rewrite Studio */}
      {activeTab === "rewrite" && (
        <div
          id="studio-panel-rewrite"
          role="tabpanel"
          aria-labelledby="studio-tab-rewrite"
          tabIndex={0}
          className="p-6 min-h-[460px] flex flex-col justify-between focus:outline-hidden"
        >
          <div>
            {/* Tone Selector Buttons */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">
                  Select Target Voice:
                </span>
                <span className="text-[12px] text-on-surface-variant font-medium">
                  {tones[activeTone].note}
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {Object.keys(tones).map((tone) => (
                  <button
                    key={tone}
                    type="button"
                    onClick={() => setActiveTone(tone)}
                    className={`px-3 py-1.5 rounded-lg text-[12px] font-bold transition-all cursor-pointer ${
                      activeTone === tone
                        ? "bg-primary text-white shadow-sm"
                        : "bg-surface-container text-on-surface-variant hover:text-on-surface"
                    }`}
                  >
                    {tone}
                  </button>
                ))}
              </div>
            </div>

            {/* Split Comparison View */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Before Card */}
              <div className="p-5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest dark:bg-[#141424]">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-outline-variant/20">
                  <span className="text-[11.5px] font-bold uppercase tracking-wider text-rose-500 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">close</span>
                    Original Draft (Generic)
                  </span>
                  <span className="text-[11px] text-on-surface-variant font-mono">18 words</span>
                </div>
                <p className="text-[14px] leading-relaxed text-on-surface-variant font-body italic">
                  &ldquo;{tones[activeTone].before}&rdquo;
                </p>
                <div className="mt-4 pt-3 border-t border-outline-variant/15 flex items-center gap-2 text-[11px] text-rose-400">
                  <span className="material-symbols-outlined text-[14px]">warning</span>
                  <span>Weak rhythm • Passive phrasing • Common AI tropes</span>
                </div>
              </div>

              {/* After Card */}
              <div className="p-5 rounded-xl border border-primary/40 bg-gradient-to-br from-primary/5 via-surface-container-lowest to-purple-500/5 dark:bg-[#181830] ring-1 ring-primary/30 shadow-md">
                <div className="flex items-center justify-between mb-3 pb-2 border-b border-primary/20">
                  <span className="text-[11.5px] font-bold uppercase tracking-wider text-primary flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                    Writerdost Polished ({activeTone})
                  </span>
                  <span className="text-[11px] text-primary font-mono font-bold">
                    Tone Matched
                  </span>
                </div>
                <p className="text-[14px] leading-relaxed text-on-surface font-serif font-medium">
                  &ldquo;{tones[activeTone].after}&rdquo;
                </p>
                <div className="mt-4 pt-3 border-t border-primary/20 flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400">
                  <span className="material-symbols-outlined text-[14px]">verified</span>
                  <span>Sensory vocabulary • High readability • AI originality pass</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-6 pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/20">
            <span className="text-[12px] text-on-surface-variant">
              Upload PDF, DOCX, TXT manuscripts up to 100,000 words for full structural transformation.
            </span>
            <Link href="/rewrite" className="btn btn-secondary btn-sm flex items-center gap-1.5">
              <span>Rewrite Your Book</span>
              <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      )}

      {/* Tab 4: WordPress Auto-Publisher & GEO Engine */}
      {activeTab === "wordpress" && (
        <div
          id="studio-panel-wordpress"
          role="tabpanel"
          aria-labelledby="studio-tab-wordpress"
          tabIndex={0}
          className="p-6 min-h-[460px] flex flex-col justify-between focus:outline-hidden"
        >
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">
                    Official WordPress Plugin: writerdost-connect
                  </span>
                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    GEO Active
                  </span>
                </div>
                <h4 className="text-base font-bold text-on-surface">
                  Automated Content Sync &amp; Generative Engine Optimization
                </h4>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleSyncWordPress}
                  disabled={syncing}
                  className="btn btn-primary btn-sm flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <span className={`material-symbols-outlined text-[16px] ${syncing ? "animate-spin" : ""}`}>
                    sync
                  </span>
                  <span>{syncing ? "Pushing to WP REST API..." : "Trigger Live Sync"}</span>
                </button>
              </div>
            </div>

            {/* View Switcher: Standard Post vs GEO Citation View */}
            <div className="flex items-center gap-1.5 bg-surface-container dark:bg-[#18182e] p-1 rounded-xl mb-4 border border-outline-variant/20 max-w-fit">
              <button
                type="button"
                onClick={() => setWpSubView("post")}
                className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-all cursor-pointer ${
                  wpSubView === "post"
                    ? "bg-surface-container-lowest dark:bg-[#252542] text-on-surface shadow-xs font-bold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Standard Post View
              </button>
              <button
                type="button"
                onClick={() => setWpSubView("geo")}
                className={`px-3 py-1 rounded-lg text-[12px] font-semibold transition-all cursor-pointer flex items-center gap-1.5 ${
                  wpSubView === "geo"
                    ? "bg-surface-container-lowest dark:bg-[#252542] text-primary shadow-xs font-bold"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span className="material-symbols-outlined text-[14px] text-primary">auto_awesome</span>
                GEO &amp; Schema View
              </button>
            </div>

            {synced && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[12.5px] font-semibold flex items-center gap-2 animate-fadeIn">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>Success! Article published live to connected WordPress endpoint. Post ID #48201.</span>
              </div>
            )}

            {wpSubView === "post" ? (
              /* WordPress Post Card Simulation */
              <div className="p-5 rounded-xl border border-outline-variant/30 bg-surface-container-lowest dark:bg-[#131326] space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-lg bg-[#21759b] text-white flex items-center justify-center font-bold text-[14px]">
                      W
                    </span>
                    <span className="text-[13px] font-bold text-on-surface">
                      https://techleadership-daily.com/wp-json
                    </span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[11px] font-bold border border-emerald-500/20">
                    ● Endpoint Verified
                  </span>
                </div>

                <div className="p-4 rounded-lg bg-surface-container dark:bg-[#1b1b32] space-y-2">
                  <span className="text-[11px] font-bold text-primary uppercase tracking-wider">
                    Queued Automation #04 • Daily Tech Series
                  </span>
                  <h5 className="text-[15px] font-bold text-on-surface">
                    Why Multi-Agent Systems Outperform Single-Prompt LLMs in Long-Form Publishing
                  </h5>
                  <p className="text-[12px] text-on-surface-variant line-clamp-2">
                    When attempting to generate manuscripts exceeding 15,000 words, single-prompt architectures inevitably succumb to context degradation. Here is how decentralized agent coordination solves continuity...
                  </p>
                  <div className="flex flex-wrap items-center gap-2 pt-2 text-[11px] text-on-surface-variant">
                    <span className="bg-surface-container-high px-2 py-0.5 rounded">Category: AI &amp; Software</span>
                    <span className="bg-surface-container-high px-2 py-0.5 rounded">Tags: Agents, Automation, SEO</span>
                    <span className="bg-surface-container-high px-2 py-0.5 rounded font-mono">Cron: 0 9 * * 1-5</span>
                  </div>
                </div>
              </div>
            ) : (
              /* GEO & Schema AI Citation Simulation */
              <div className="p-5 rounded-xl border border-primary/20 bg-surface-container-lowest dark:bg-[#131326] space-y-4">
                {/* AI Overview Citation Card */}
                <div className="p-4 rounded-xl border border-primary/25 bg-primary/5 dark:bg-primary/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-primary uppercase tracking-wider flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px]">search_spark</span>
                      AI Overview Citation Preview
                    </span>
                    <span className="text-[10.5px] font-mono px-2 py-0.5 rounded bg-surface-container text-on-surface-variant border border-outline-variant/30">
                      Google &amp; ChatGPT Search
                    </span>
                  </div>
                  <blockquote className="text-[13px] text-on-surface font-medium leading-relaxed italic border-l-2 border-primary pl-3 my-1">
                    &ldquo;Multi-agent writing systems coordinate specialized AI roles (Architect, Researcher, Drafter, Critic) to maintain factual consistency across long-form content, eliminating the hallucination and drift common in single-prompt LLMs.&rdquo;
                  </blockquote>
                  <div className="flex items-center gap-2 text-[11px] text-on-surface-variant">
                    <span className="text-primary font-semibold">Source Cited:</span>
                    <span className="font-mono truncate">techleadership-daily.com/why-multi-agent-systems</span>
                    <span className="text-emerald-500 font-bold ml-auto">✓ High Citability Score (94/100)</span>
                  </div>
                </div>

                {/* JSON-LD Schema Card */}
                <div className="p-3.5 rounded-lg bg-surface-container dark:bg-[#1b1b32] border border-outline-variant/20 space-y-2">
                  <div className="flex items-center justify-between text-[11px] font-bold text-on-surface">
                    <span className="flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[15px] text-emerald-500">code</span>
                      FAQPage Schema (JSON-LD) Injected
                    </span>
                    <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[10.5px]">Schema.org Validated</span>
                  </div>
                  <pre className="text-[11px] font-mono text-on-surface-variant overflow-x-auto bg-surface-container-high/60 dark:bg-black/30 p-2.5 rounded-md leading-tight">
{`{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [{
    "@type": "Question",
    "name": "Why do single-prompt LLMs fail after 3,000 words?",
    "acceptedAnswer": {
      "@type": "Answer",
      "text": "Single-prompt LLMs lack persistent role memory, resulting in narrative drift and hallucination..."
    }
  }]
}`}
                  </pre>
                </div>
              </div>
            )}
          </div>

          <div className="mt-6 pt-3 flex flex-wrap items-center justify-between gap-3 border-t border-outline-variant/20">
            <span className="text-[12px] text-on-surface-variant">
              Zero manual copying. Automatic featured image handling, schema tags, and author attribution.
            </span>
            <Link href="/automations" className="btn btn-secondary btn-sm flex items-center gap-1.5">
              <span>View Automations Suite</span>
              <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
