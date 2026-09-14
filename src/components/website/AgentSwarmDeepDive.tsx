"use client";

import { useState } from "react";
import Link from "next/link";

export default function AgentSwarmDeepDive() {
  const [selectedAgent, setSelectedAgent] = useState<number>(0);

  const agents = [
    {
      id: 0,
      title: "Lead Research Agent",
      role: "Synthesis & Fact Extraction",
      icon: "travel_explore",
      color: "from-blue-500 to-cyan-500",
      bgBadge: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
      description:
        "Ingests your raw inputs: web URLs, reference PDFs, research papers, YouTube video transcripts, and author voice notes. Extracts key arguments, empirical statistics, and domain entities into a structured knowledge graph.",
      deliverables: [
        "Knowledge graph of domain concepts",
        "Empirical fact & citation catalog",
        "Competitor positioning & angle analysis",
        "Audience pain-point taxonomy",
      ],
      promptInsight:
        "“Synthesizes multi-format source materials into high-density conceptual outlines, ensuring zero hallucinated citations.”",
    },
    {
      id: 1,
      title: "Architect & Planning Agent",
      role: "Narrative Arc & Structure",
      icon: "account_tree",
      color: "from-amber-500 to-orange-500",
      bgBadge: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
      description:
        "Engineers the complete architectural blueprint of your manuscript. Establishes the core premise, target word budgets per chapter, rhetorical escalation points, and semantic hooks to ensure reader retention from Chapter 1 to the epilogue.",
      deliverables: [
        "Comprehensive 8-15 chapter synopsis",
        "Sub-point hierarchy & beat sheet",
        "Target word count allocation matrix",
        "Continuity anchors & foreshadowing markers",
      ],
      promptInsight:
        "“Eliminates mid-book sag by calculating narrative tension curves and chapter pacing before a single sentence is written.”",
    },
    {
      id: 2,
      title: "Parallel Chapter Writers",
      role: "Concurrent Prose Generation",
      icon: "edit_document",
      color: "from-primary to-indigo-600",
      bgBadge: "bg-primary/10 text-primary border-primary/20",
      description:
        "Instead of sluggish sequential drafting that degrades over long contexts, specialized writer agents draft chapters in parallel. Each agent maintains cross-chapter memory, voice calibration, and domain vocabulary.",
      deliverables: [
        "Simultaneous chapter drafting (3x-5x faster)",
        "Consistent stylistic voice preservation",
        "Dynamic metaphor & dialogue synthesis",
        "Target length fulfillment without fluff",
      ],
      promptInsight:
        "“Operates with shared global state to maintain voice fidelity while cutting total generation time from hours to under 4 minutes.”",
    },
    {
      id: 3,
      title: "Critic & Polishing Agent",
      role: "Voice Integrity & Flow",
      icon: "verified_user",
      color: "from-emerald-600 to-teal-600",
      bgBadge: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
      description:
        "The rigorous editor-in-chief. Sweeps across all chapter seams to eliminate robotic AI clichés ('In a world where...', 'delve into', 'testament to'). Adjusts sentence cadences, checks transition flow, and verifies readability grade.",
      deliverables: [
        "AI cliché removal & rhythm smoothing",
        "Seamless chapter-to-chapter transitions",
        "Hemingway / Flesch-Kincaid grade balancing",
        "Typographic layout styling & formatting",
      ],
      promptInsight:
        "“Audits every paragraph with unforgiving editorial rigor so the finished prose reads with organic human authority.”",
    },
  ];

  return (
    <section id="agents" className="py-20 md:py-28 font-body">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-[12px] font-bold text-primary uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            Why Multi-Agent Swarms Win
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-on-surface tracking-tight leading-tight">
            Single-Prompt AI Writes Snippets. <br className="hidden sm:inline" />
            <span className="text-primary">
              Writerdost Swarms Write Masterpieces.
            </span>
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed">
            Standard AI models forget context after 3,000 words. Writerdost deploys a coordinated pipeline of 4 specialized autonomous agents working in synchrony to deliver cohesive 30,000+ word manuscripts.
          </p>
        </div>

        {/* Interactive Swarm Flow Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: Agent Selector List */}
          <div className="lg:col-span-5 space-y-3">
            {agents.map((agent, index) => {
              const isSelected = selectedAgent === index;
              return (
                <button
                  key={agent.title}
                  type="button"
                  onClick={() => setSelectedAgent(index)}
                  className={`w-full text-left p-4 rounded-xl border transition-all duration-200 cursor-pointer flex items-start gap-4 ${
                    isSelected
                      ? "bg-surface-container dark:bg-[#18182f] border-primary/50 shadow-md ring-1 ring-primary/30"
                      : "bg-surface-container-low dark:bg-[#111120] border-outline-variant/30 hover:border-outline-variant hover:bg-surface-container"
                  }`}
                >
                  <div
                    className={`w-10 h-10 rounded-xl bg-gradient-to-br ${agent.color} text-white flex items-center justify-center shrink-0 shadow-sm`}
                  >
                    <span className="material-symbols-outlined text-[20px]">{agent.icon}</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-0.5">
                      <h3 className="text-[14px] font-bold text-on-surface truncate">{agent.title}</h3>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${agent.bgBadge}`}>
                        Step {index + 1}
                      </span>
                    </div>
                    <p className="text-[12px] font-medium text-primary mb-1">{agent.role}</p>
                    <p className="text-[12px] text-on-surface-variant line-clamp-2 leading-relaxed">
                      {agent.description}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Right Column: Deep-Dive Agent Inspector */}
          <div className="lg:col-span-7">
            <div className="p-6 sm:p-8 rounded-2xl border border-outline-variant/40 bg-surface-container-lowest dark:bg-[#131326] shadow-xl relative overflow-hidden">
              {/* Background gradient accent */}
              <div
                className={`absolute top-0 right-0 w-64 h-64 bg-gradient-to-bl ${agents[selectedAgent].color} opacity-10 blur-3xl pointer-events-none`}
              />

              <div className="flex items-center gap-3 mb-4">
                <div
                  className={`w-12 h-12 rounded-xl bg-gradient-to-br ${agents[selectedAgent].color} text-white flex items-center justify-center shadow-md`}
                >
                  <span className="material-symbols-outlined text-[24px]">
                    {agents[selectedAgent].icon}
                  </span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full border ${agents[selectedAgent].bgBadge}`}>
                      Agent 0{selectedAgent + 1}
                    </span>
                    <span className="text-[12px] font-semibold text-on-surface-variant">
                      {agents[selectedAgent].role}
                    </span>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-black text-on-surface mt-0.5">
                    {agents[selectedAgent].title}
                  </h3>
                </div>
              </div>

              {/* Description */}
              <p className="text-[14.5px] text-on-surface/90 leading-relaxed mb-6">
                {agents[selectedAgent].description}
              </p>

              {/* Quotation / Prompt Insight */}
              <div className="p-4 rounded-xl bg-surface-container dark:bg-[#1b1b34] border border-outline-variant/30 mb-6 italic text-[13px] text-on-surface/80 font-serif">
                {agents[selectedAgent].promptInsight}
              </div>

              {/* Deliverables Checklist */}
              <div>
                <h4 className="text-[12px] font-bold uppercase tracking-wider text-on-surface-variant mb-3">
                  Core Responsibilities &amp; Artifacts
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {agents[selectedAgent].deliverables.map((item) => (
                    <div
                      key={item}
                      className="flex items-center gap-2 text-[13px] text-on-surface p-2 rounded-lg bg-surface-container-low dark:bg-[#16162d]"
                    >
                      <span className="material-symbols-outlined text-[17px] text-primary shrink-0">
                        check_circle
                      </span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action */}
              <div className="mt-8 pt-6 border-t border-outline-variant/30 flex items-center justify-between">
                <span className="text-[12px] text-on-surface-variant">
                  Runs with any supported LLM (Claude, GPT, Gemini, Ollama)
                </span>
                <Link
                  href="/create"
                  className="btn btn-primary btn-sm flex items-center gap-1.5"
                >
                  <span>Test in Create Flow</span>
                  <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
