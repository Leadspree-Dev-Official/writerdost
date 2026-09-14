"use client";

import { useState } from "react";
import Link from "next/link";

export default function PricingSection() {
  const [annual, setAnnual] = useState(true);

  const plans = [
    {
      name: "Starter",
      badge: "Free Forever",
      price: 0,
      period: "/month",
      desc: "Perfect for testing the waters and drafting simple guides.",
      highlighted: false,
      ctaText: "Get Started Free",
      ctaLink: "/signup",
      ctaStyle: "btn-secondary",
      features: [
        "1 Active Ebook Project",
        "Quick Draft Generation Mode",
        "Distraction-free TipTap Editor",
        "Markdown & Plain Text Export",
        "Local Browser Storage",
        "Community Support",
      ],
    },
    {
      name: "Pro Author",
      badge: "Most Popular",
      price: annual ? 24 : 29,
      period: "/month",
      billedNote: annual ? "Billed annually ($288/yr)" : "Billed monthly",
      desc: "For serious authors and novelists who want book-length quality.",
      highlighted: true,
      ctaText: "Start 14-Day Free Trial",
      ctaLink: "/signup",
      ctaStyle: "btn-primary",
      features: [
        "Unlimited Ebook Projects & Chapters",
        "Full 4-Agent Swarm Pipeline",
        "Concurrent Parallel Chapter Drafting",
        "Manuscript Rewrite Studio (PDF, DOCX)",
        "Amazon KDP-Validated EPUB & DOCX",
        "Bring Your Own API Key (Zero Lock-in)",
        "Local Ollama Offline Support",
        "Custom Font & Typography Presets",
      ],
    },
    {
      name: "Publisher & Agency",
      badge: "Automation Powerhouse",
      price: annual ? 64 : 79,
      period: "/month",
      billedNote: annual ? "Billed annually ($768/yr)" : "Billed monthly",
      desc: "For agencies, publishers, and WordPress site operators scaling content.",
      highlighted: false,
      ctaText: "Get Agency Access",
      ctaLink: "/signup",
      ctaStyle: "btn-secondary",
      features: [
        "Everything in Pro Author",
        "Automated Scheduled Blog Campaigns",
        "Official writerdost-connect WordPress Plugin",
        "Multi-Site WordPress REST Syndication",
        "Custom Cron Frequency Engine",
        "Multiple Author Profiles & Personas",
        "Priority Model Queuing & Telemetry",
        "Direct 1-on-1 Editorial Support",
      ],
    },
  ];

  return (
    <section id="pricing" className="py-20 md:py-28 font-body">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <span className="text-[12px] font-bold text-primary uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            Transparent Investment
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-on-surface tracking-tight leading-tight">
            Simple, Honest Pricing for Every Ambition.
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed">
            No sneaky word limits. No proprietary lock-in. Scale your book output with complete peace of mind.
          </p>

          {/* Billing Interval Switcher */}
          <div className="pt-4 flex items-center justify-center gap-3">
            <span className={`text-[13px] font-bold ${!annual ? "text-on-surface" : "text-on-surface-variant"}`}>
              Monthly
            </span>
            <button
              type="button"
              onClick={() => setAnnual(!annual)}
              className="w-13 h-7 rounded-full bg-surface-container-high dark:bg-[#1e1e35] p-1 relative transition-colors cursor-pointer border border-outline-variant/40"
              aria-label="Toggle annual billing"
            >
              <div
                className={`w-5 h-5 rounded-full bg-primary transition-transform duration-200 ${
                  annual ? "translate-x-6" : "translate-x-0"
                }`}
              />
            </button>
            <span className={`text-[13px] font-bold flex items-center gap-1.5 ${annual ? "text-on-surface" : "text-on-surface-variant"}`}>
              Annual
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10.5px] font-bold uppercase tracking-wider border border-emerald-500/20">
                Save 20%
              </span>
            </span>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch max-w-6xl mx-auto">
          {plans.map((p) => (
            <div
              key={p.name}
              className={`p-7 sm:p-8 rounded-3xl border transition-all duration-300 flex flex-col justify-between relative ${
                p.highlighted
                  ? "bg-surface-container-lowest dark:bg-[#15152b] border-primary ring-2 ring-primary/40 shadow-2xl shadow-primary/15 md:-translate-y-2"
                  : "bg-surface-container-lowest dark:bg-[#111122] border-outline-variant/30 hover:border-outline-variant/60 shadow-sm"
              }`}
            >
              {p.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-primary text-white text-[11px] font-black uppercase tracking-wider shadow-md">
                  Most Popular
                </span>
              )}

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xl font-bold text-on-surface">{p.name}</h3>
                  <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                    {p.badge}
                  </span>
                </div>
                <p className="text-[13px] text-on-surface-variant mb-6 leading-relaxed">
                  {p.desc}
                </p>

                {/* Price Display */}
                <div className="mb-2">
                  <div className="flex items-baseline gap-1">
                    <span className="text-4xl sm:text-5xl font-black text-on-surface tracking-tight">
                      ${p.price}
                    </span>
                    <span className="text-[14px] text-on-surface-variant font-medium">
                      {p.period}
                    </span>
                  </div>
                  {p.billedNote && (
                    <p className="text-[11px] text-on-surface-variant/80 mt-1 font-medium">
                      {p.billedNote}
                    </p>
                  )}
                </div>

                {/* Features List */}
                <ul className="space-y-3 my-8 pt-6 border-t border-outline-variant/20">
                  {p.features.map((feat) => (
                    <li key={feat} className="flex items-start gap-2.5 text-[13px] text-on-surface/90">
                      <span className="material-symbols-outlined text-[17px] text-primary shrink-0 mt-0.5">
                        check
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Action Button */}
              <div className="pt-4 border-t border-outline-variant/20">
                <Link
                  href={p.ctaLink}
                  className={`btn ${p.ctaStyle} w-full justify-center py-3 text-[13.5px] font-bold shadow-xs`}
                >
                  {p.ctaText}
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* Enterprise Callout */}
        <div className="mt-12 p-6 rounded-2xl border border-outline-variant/30 bg-surface-container-low/50 dark:bg-[#121224] max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-xl bg-purple-500/15 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[22px]">domain</span>
            </span>
            <div>
              <h4 className="text-[14px] font-bold text-on-surface">
                Need Dedicated On-Premise Ollama or Custom Style Fine-Tuning?
              </h4>
              <p className="text-[12px] text-on-surface-variant">
                We build dedicated, air-gapped private clusters and white-label publishing workflows for enterprise teams.
              </p>
            </div>
          </div>
          <Link
            href="mailto:contact@leadspree.in"
            className="btn btn-secondary btn-sm shrink-0"
          >
            Talk to Enterprise
          </Link>
        </div>
      </div>
    </section>
  );
}
