"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

type TabKey = "agents" | "editor" | "rewrite" | "wordpress";

export default function HeroInteractivePreview() {
  const [activeTab, setActiveTab] = useState<TabKey>("agents");
  const [activeFont, setActiveFont] = useState<string>("eb-garamond");
  const [activeTone, setActiveTone] = useState<string>("Bestseller");
  const [synced, setSynced] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [simulatedWordCount, setSimulatedWordCount] = useState(14820);

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
      className="w-full max-w-6xl mx-auto rounded-2xl border border-outline-variant/40 bg-surface-container-lowest dark:bg-[#10101c] shadow-2xl shadow-primary/10 overflow-hidden font-body transition-all duration-300"
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
            The Autonomous Enterprise.epub
          </span>
          <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-semibold border border-emerald-500/20 hidden md:inline-flex items-center gap-1">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Swarm Live
          </span>
        </div>

        {/* Tab Navigation Switchers */}
        <div className="flex items-center gap-1 bg-surface-container-high dark:bg-[#1c1c30] p-1 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveTab("agents")}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "agents"
                ? "bg-surface-container-lowest dark:bg-[#252542] text-primary shadow-xs"
                : "text-on-surface-variant hover:text-on-surface"
            }`}
          >
            <span className="material-symbols-outlined text-[15px]">smart_toy</span>
            <span className="hidden sm:inline">Agent Swarm</span>
            <span className="sm:hidden">Swarm</span>
          </button>
          <button
            type="button"
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
        <div className="grid grid-cols-1 lg:grid-cols-12 min-h-[460px]">
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
                  <span className="px-2.5 py-1 rounded-md bg-surface-container text-on-surface-variant font-mono text-[11px]">
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
                <span>Continuity checks passed</span>
                <span className="mx-1">•</span>
                <span className="material-symbols-outlined text-[16px] text-emerald-500">check</span>
                <span>Factual citations linked</span>
              </div>
              <Link
                href="/create"
                className="btn btn-primary btn-sm flex items-center gap-1.5 shadow-sm"
              >
                <span>Launch Your Swarm</span>
                <span className="material-symbols-outlined text-[15px]">rocket_launch</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Tab 2: Focused Canvas Editor */}
      {activeTab === "editor" && (
        <div className="p-6 min-h-[460px] flex flex-col justify-between">
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
        <div className="p-6 min-h-[460px] flex flex-col justify-between">
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
                  <span>Sensory vocabulary • High readability • Plagiarism-free</span>
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

      {/* Tab 4: WordPress Auto-Publisher */}
      {activeTab === "wordpress" && (
        <div className="p-6 min-h-[460px] flex flex-col justify-between">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <span className="text-[11px] font-bold text-on-surface-variant uppercase tracking-wider block">
                  Official WordPress Plugin: writerdost-connect
                </span>
                <h4 className="text-base font-bold text-on-surface">
                  Automated Content Sync & Scheduled Drip Publishing
                </h4>
              </div>
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

            {synced && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-300 text-[12.5px] font-semibold flex items-center gap-2 animate-fadeIn">
                <span className="material-symbols-outlined text-[18px]">check_circle</span>
                <span>Success! Article published live to connected WordPress endpoint. Post ID #48201.</span>
              </div>
            )}

            {/* WordPress Post Card Simulation */}
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
