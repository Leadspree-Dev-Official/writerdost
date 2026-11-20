"use client";

import React, { useState } from "react";
import Link from "next/link";

export type TemplateCategory = "all" | "non-fiction" | "fiction" | "business" | "blog";

export interface BlueprintTemplate {
  id: string;
  category: "non-fiction" | "fiction" | "business" | "blog";
  title: string;
  tagline: string;
  description: string;
  badge?: "POPULAR" | "FAST-TRACK" | "NEW";
  badgeColor?: string;
  words: string;
  chapters: string;
  icon: string;
  gradient: string;
  deliverables: string[];
}

const BLUEPRINTS: BlueprintTemplate[] = [
  {
    id: "definitive-thought-leadership",
    category: "non-fiction",
    title: "Thought Leadership Masterwork",
    tagline: "Seminal 4-Part Macro Architecture",
    description: "Designed for industry leaders, executives, and researchers establishing domain dominance (akin to Thinking Fast & Slow or Sapiens).",
    badge: "POPULAR",
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
    words: "60,000 - 100,000 words",
    chapters: "12-16 Chapters",
    icon: "psychology",
    gradient: "from-purple-500 to-indigo-600",
    deliverables: ["4-Part Macro Architecture", "Contrarian Theses", "Empirical Case Studies", "Kindle-Ready EPUB"],
  },
  {
    id: "epic-narrative-novel",
    category: "fiction",
    title: "Epic Fiction & Worldbuilding Tome",
    tagline: "Multi-POV Arc with BookMemoryBank Lore",
    description: "Built for epic fantasy, sci-fi sagas, and multi-generational fiction with deep continuity tracking across dozens of chapters.",
    badge: "NEW",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    words: "Up to 300,000 words",
    chapters: "20-40 Chapters",
    icon: "auto_stories",
    gradient: "from-blue-500 to-cyan-600",
    deliverables: ["Interlocking Character Arcs", "Deep Lore Memory Ledger", "Sensory Scene Hooks", "Cross-Chapter Continuity"],
  },
  {
    id: "b2b-copywriting-pack",
    category: "business",
    title: "B2B Cold Outreach & Conversion Pack",
    tagline: "Eugene Schwartz 5 Stages of Awareness",
    description: "High-reply PAS cold emails, 60-second elevator pitches, and Google RSA ads with strict character constraints and anti-AI filtering.",
    badge: "FAST-TRACK",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    words: "Full Sales Campaign",
    chapters: "Outreach + Ads + Follow-ups",
    icon: "campaign",
    gradient: "from-emerald-500 to-teal-600",
    deliverables: ["PAS Cold Email Sequences", "Google RSA (<30/90 chars)", "Anti-AI Cliché Filter", "48-Hour Bump Follow-ups"],
  },
  {
    id: "founder-lead-magnet",
    category: "business",
    title: "Client Acquisition Whitepaper",
    tagline: "High-Converting B2B Authority Asset",
    description: "Transform your proprietary methodology into an authoritative, downloadable blueprint that drives qualified demo bookings.",
    badge: "POPULAR",
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    words: "~12,000 words",
    chapters: "4 Deep Sections",
    icon: "workspace_premium",
    gradient: "from-amber-500 to-orange-600",
    deliverables: ["Executive Summary", "Proprietary Data Models", "Call-to-Action Closing", "Brandable PDF"],
  },
  {
    id: "technical-handbook",
    category: "non-fiction",
    title: "Engineering & Technical Reference Tome",
    tagline: "System Architecture with Empirical Case Studies",
    description: "For principal architects, engineers, and scientists authoring an exhaustive reference manual or university-grade textbook.",
    badge: "NEW",
    badgeColor: "bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 border-indigo-500/30",
    words: "80,000 - 140,000 words",
    chapters: "15-25 Chapters",
    icon: "code",
    gradient: "from-indigo-500 to-purple-600",
    deliverables: ["Architecture Blueprints", "Code Implementation Guides", "Troubleshooting Trees", "DOCX & Print PDF"],
  },
  {
    id: "seo-pillar-series",
    category: "blog",
    title: "GEO Content Strategy & Automated WordPress Drip",
    tagline: "AI Search Citations + Interlinked Topical Authority",
    description: "Generate an entire month of SEO and GEO-optimized articles with definition-first answer capsules, structured FAQs, JSON-LD schema, and direct WordPress synchronization.",
    badge: "FAST-TRACK",
    badgeColor: "bg-teal-500/10 text-teal-600 dark:text-teal-400 border-teal-500/30",
    words: "~25,000 words total",
    chapters: "12 Interlinked Posts",
    icon: "rss_feed",
    gradient: "from-teal-500 to-emerald-600",
    deliverables: ["AI Overview Extraction Capsules", "JSON-LD FAQ Schema", "Native WordPress Drip", "Topical Entity Clusters"],
  },
];

const CATEGORIES: { id: TemplateCategory; label: string }[] = [
  { id: "all", label: "All Blueprints" },
  { id: "non-fiction", label: "Non-Fiction Books" },
  { id: "fiction", label: "Fiction & Novels" },
  { id: "business", label: "Executive & Business" },
  { id: "blog", label: "SEO & Blog Series" },
];

export default function TemplatesShowcase() {
  const [activeCategory, setActiveCategory] = useState<TemplateCategory>("all");

  const filtered = activeCategory === "all"
    ? BLUEPRINTS
    : BLUEPRINTS.filter((b) => b.category === activeCategory);

  return (
    <section id="templates" className="scroll-mt-20 py-20 md:py-28 font-body bg-surface">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <span className="text-[12px] font-bold text-primary uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            Pre-Tuned Blueprints
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-on-surface tracking-tight leading-tight">
            Start from Proven Book &amp; Content Architecture
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed">
            Never stare at a blank prompt. Select a battle-tested structure, input your core concept, and let the multi-agent swarm build your complete draft.
          </p>
        </div>

        {/* Filter Pills */}
        <div
          role="tablist"
          aria-label="Blueprint categories"
          className="flex items-center justify-center gap-2 overflow-x-auto pb-4 mb-10 no-scrollbar"
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              role="tab"
              aria-selected={activeCategory === cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-4 py-2 rounded-full text-xs sm:text-sm font-semibold transition-all whitespace-nowrap cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-primary text-on-primary shadow-sm"
                  : "bg-surface-container-low/70 dark:bg-[#151528] text-on-surface-variant hover:text-on-surface border border-outline-variant/30 hover:border-outline-variant/60"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Grid Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map((item) => (
            <div
              key={item.id}
              className="p-6 sm:p-7 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest dark:bg-[#131326] shadow-sm hover:shadow-md hover:-translate-y-1 transition-all flex flex-col justify-between group"
            >
              <div>
                {/* Top Row: Icon + Badge */}
                <div className="flex items-center justify-between mb-4">
                  <div
                    className={`w-11 h-11 rounded-xl bg-gradient-to-br ${item.gradient} text-white flex items-center justify-center shadow-sm`}
                  >
                    <span className="material-symbols-outlined text-[22px]">{item.icon}</span>
                  </div>
                  {item.badge && (
                    <span
                      className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${item.badgeColor}`}
                    >
                      {item.badge}
                    </span>
                  )}
                </div>

                {/* Title & Tagline */}
                <h3 className="text-lg font-bold text-on-surface group-hover:text-primary transition-colors">
                  {item.title}
                </h3>
                <p className="text-[12px] font-semibold text-primary mt-0.5 mb-2.5">
                  {item.tagline}
                </p>
                <p className="text-[13px] text-on-surface-variant leading-relaxed mb-4">
                  {item.description}
                </p>

                {/* Scope Metadata */}
                <div className="flex items-center gap-3 py-2.5 px-3 rounded-lg bg-surface-container-low/60 dark:bg-[#181830] border border-outline-variant/20 mb-4 text-[11.5px] font-semibold text-on-surface">
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-primary">description</span>
                    {item.words}
                  </span>
                  <span className="text-outline-variant">•</span>
                  <span className="flex items-center gap-1">
                    <span className="material-symbols-outlined text-[15px] text-primary">view_timeline</span>
                    {item.chapters}
                  </span>
                </div>

                {/* Deliverables Checklist */}
                <ul className="space-y-1.5 mb-6 text-[12px] text-on-surface-variant">
                  {item.deliverables.map((d) => (
                    <li key={d} className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[14px] text-emerald-500">check_circle</span>
                      <span>{d}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <Link
                href={`/create?blueprint=${item.id}`}
                className="w-full py-2.5 px-4 rounded-xl bg-surface-container-low dark:bg-[#1a1a36] hover:bg-primary hover:text-on-primary text-on-surface text-[12.5px] font-bold text-center border border-outline-variant/30 hover:border-primary transition-all flex items-center justify-center gap-1.5"
              >
                <span>Generate with this Blueprint</span>
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
