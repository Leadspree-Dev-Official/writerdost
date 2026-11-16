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
    id: "authority-non-fiction",
    category: "non-fiction",
    title: "Authority Non-Fiction Playbook",
    tagline: "Comprehensive 10-Chapter Master Manual",
    description: "Ideal for business leaders, consultants, and educators turning deep expertise into a definitive published guide.",
    badge: "POPULAR",
    badgeColor: "bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30",
    words: "~25,000 words",
    chapters: "10 Chapters",
    icon: "auto_stories",
    gradient: "from-purple-500 to-indigo-600",
    deliverables: ["Curriculum Architecture", "Actionable Worksheets", "Kindle-Ready EPUB", "Print PDF Layout"],
  },
  {
    id: "kdp-short-read",
    category: "non-fiction",
    title: "KDP Fast-Track Short Read",
    tagline: "High-Impact 60-Minute Tactical Read",
    description: "Designed for rapid publishing on Amazon Kindle. Solves one specific customer pain point with surgical precision.",
    badge: "FAST-TRACK",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    words: "~12,000 words",
    chapters: "5 Chapters",
    icon: "bolt",
    gradient: "from-emerald-500 to-teal-600",
    deliverables: ["Amazon Blurb Copy", "Chapter Key Takeaways", "Lead Magnet Funnel", "Formatted MOBI/EPUB"],
  },
  {
    id: "fiction-novel",
    category: "fiction",
    title: "Fiction & Novel Story Arc",
    tagline: "Multi-Act Narrative with Character Consistency",
    description: "Orchestrate intricate multi-point-of-view stories with continuous character lore, scene tension, and dialogue pacing.",
    badge: "NEW",
    badgeColor: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/30",
    words: "~45,000+ words",
    chapters: "16-20 Chapters",
    icon: "psychology",
    gradient: "from-blue-500 to-cyan-600",
    deliverables: ["Hero's Journey Beat Sheet", "Character Lore Ledger", "Sensory Scene Hooks", "Chapter Climax Arcs"],
  },
  {
    id: "founder-lead-magnet",
    category: "business",
    title: "Client Acquisition Whitepaper",
    tagline: "High-Converting B2B Trust Asset",
    description: "Transform your agency or SaaS methodology into an authoritative, downloadable blueprint that drives qualified sales calls.",
    badge: "POPULAR",
    badgeColor: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/30",
    words: "~8,500 words",
    chapters: "4 Deep Sections",
    icon: "workspace_premium",
    gradient: "from-amber-500 to-orange-600",
    deliverables: ["Executive Summary", "Proprietary Data Models", "Call-to-Action Closing", "Brandable PDF"],
  },
  {
    id: "seo-pillar-series",
    category: "blog",
    title: "30-Day SEO Cluster Engine",
    tagline: "Interlinked Topical Pillar + Spoke Articles",
    description: "Generate an entire month of SEO-optimized articles with structured FAQs, JSON-LD schema, and direct WordPress synchronization.",
    badge: "FAST-TRACK",
    badgeColor: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    words: "~18,000 words total",
    chapters: "12 Interlinked Posts",
    icon: "rss_feed",
    gradient: "from-teal-500 to-emerald-600",
    deliverables: ["Keyword Intent Mapping", "Schema Markup Blocks", "Native WordPress Drip", "Social Snippets"],
  },
  {
    id: "executive-speech-to-book",
    category: "business",
    title: "Lecture & Audio to Manuscript",
    tagline: "Podcast & Transcript Restructuring",
    description: "Incorporate YouTube interviews, keynote speeches, or audio recordings directly into a polished, ghostwritten memoir or manual.",
    badge: "NEW",
    badgeColor: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/30",
    words: "~20,000 words",
    chapters: "8 Chapters",
    icon: "mic",
    gradient: "from-rose-500 to-pink-600",
    deliverables: ["Transcript De-tangling", "Anecdote Polishing", "Structured Citations", "Clean Editorial Tone"],
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
    <section id="templates" className="py-20 md:py-28 font-body bg-surface">
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
        <div className="flex items-center justify-center gap-2 overflow-x-auto pb-4 mb-10 no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
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
