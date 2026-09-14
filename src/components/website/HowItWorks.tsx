"use client";

import Link from "next/link";

export default function HowItWorks() {
  const steps = [
    {
      num: "01",
      title: "Input Vision & Sources",
      icon: "lightbulb",
      badge: "Initialization",
      description:
        "Define your book thesis, target audience, tone, and desired length. Paste reference URLs, upload research documents (PDF, DOCX), or drop YouTube lecture links for grounded knowledge.",
    },
    {
      num: "02",
      title: "Review Agent Outline",
      icon: "account_tree",
      badge: "Architecting",
      description:
        "Our Architect Agent generates an 8-15 chapter structural blueprint complete with narrative hooks, sub-points, and word budgets. Re-order, tweak, or approve with one click.",
    },
    {
      num: "03",
      title: "Parallel Swarm Drafting",
      icon: "bolt",
      badge: "Autonomous Drafting",
      description:
        "Specialized writer agents draft chapters simultaneously while consulting global continuity memory. What once took weeks finishes in under four minutes with zero context degradation.",
    },
    {
      num: "04",
      title: "Polish & Distribute",
      icon: "send_and_archive",
      badge: "Publishing",
      description:
        "Fine-tune prose on the distraction-free canvas with in-line AI. Download an Amazon KDP-validated EPUB, Word DOCX, or schedule a multi-part blog campaign directly to your WordPress site.",
    },
  ];

  return (
    <section id="how-it-works" className="py-20 md:py-28 font-body">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-[12px] font-bold text-primary uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            Frictionless Workflow
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-on-surface tracking-tight leading-tight">
            How a Full Book Is Born in 4 Minutes.
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed">
            Eliminate months of blank-page paralysis without sacrificing your unique voice, structural depth, or factual grounding.
          </p>
        </div>

        {/* 4-Step Cards Grid with Connecting Arrows */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 relative">
          {steps.map((step, idx) => (
            <div
              key={step.num}
              className="relative p-6 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest dark:bg-[#131326] shadow-xs hover:shadow-md hover:border-primary/40 transition-all flex flex-col justify-between group"
            >
              <div>
                <div className="flex items-center justify-between mb-4">
                  <span className="text-2xl font-black font-mono text-primary/40 group-hover:text-primary transition-colors">
                    {step.num}
                  </span>
                  <span className="text-[10.5px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant">
                    {step.badge}
                  </span>
                </div>

                <div className="w-11 h-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:scale-105 transition-transform">
                  <span className="material-symbols-outlined text-[22px]">{step.icon}</span>
                </div>

                <h3 className="text-lg font-bold text-on-surface mb-2 tracking-tight">
                  {step.title}
                </h3>
                <p className="text-[13px] text-on-surface-variant leading-relaxed">
                  {step.description}
                </p>
              </div>

              <div className="mt-6 pt-3 border-t border-outline-variant/20 flex items-center justify-between text-[11px] text-on-surface-variant font-medium">
                <span>Phase {idx + 1} of 4</span>
                <span className="material-symbols-outlined text-[15px] text-primary">arrow_forward</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Action */}
        <div className="mt-12 text-center">
          <Link
            href="/create"
            className="btn btn-primary btn-lg inline-flex items-center gap-2 shadow-lg shadow-primary/25"
          >
            <span>Start Creating Your First Project</span>
            <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
          </Link>
        </div>
      </div>
    </section>
  );
}
