"use client";

import Link from "next/link";

export default function PersonasSection() {
  const personas = [
    {
      title: "Non-Fiction & Fiction Authors",
      tagline: "Finish your book in days, not years",
      icon: "menu_book",
      color: "from-blue-500 to-indigo-600",
      benefits: [
        "Overcome the dreaded mid-manuscript slump with narrative arc planning",
        "Generate 10+ chapter blueprints tailored to your specific audience",
        "Maintain distinctive narrative voice across 30,000+ words",
        "Export directly to Kindle-ready EPUB & print-ready DOCX",
      ],
      quote: "“Writerdost helped me publish my third leadership book in 2 weeks. The structural pacing is indistinguishable from my earlier traditionally published works.”",
      author: "David Vance, 3x Business Author",
    },
    {
      title: "Content Agencies & Publishers",
      tagline: "10x production capacity without adding headcount",
      icon: "apartment",
      color: "from-indigo-600 to-primary",
      benefits: [
        "Deliver complete client book drafts and whitepapers in record time",
        "Maintain client-specific tone presets across different genres",
        "Multi-agent swarm drafts 5 chapters simultaneously in parallel",
        "Drastically lower cost-per-word while increasing editorial quality",
      ],
      quote: "“We scaled our client publishing output from 2 books a month to 14 without burning out our editorial staff. A complete game-changer.”",
      author: "Elena Rostova, Managing Editor at Nexus Media",
    },
    {
      title: "Bloggers & WordPress Publishers",
      tagline: "Hands-free scheduled content engine",
      icon: "rss_feed",
      color: "from-emerald-500 to-teal-600",
      benefits: [
        "Transform book chapters into multi-week SEO blog drip campaigns",
        "Native writerdost-connect WordPress plugin pushes straight to your CMS",
        "Automate cron schedules for consistent weekly publishing",
        "Auto-generate schema, meta descriptions, and category taxonomies",
      ],
      quote: "“The automated WordPress sync is pure wizardry. I queue an entire month of long-form articles in 10 minutes and watch them auto-publish.”",
      author: "Marcus Chen, Founder of CloudPulse Blog",
    },
    {
      title: "Founders, Consultants & Coaches",
      tagline: "Turn your expertise into an authority magnet",
      icon: "workspace_premium",
      color: "from-amber-500 to-orange-600",
      benefits: [
        "Ingest YouTube lectures, workshop transcripts, and slide decks",
        "Extract your proprietary methodologies into authoritative chapters",
        "Build high-converting lead magnets and book funnels",
        "Position yourself as the definitive authority in your niche",
      ],
      quote: "“I uploaded 5 hours of client coaching audio and had a 120-page comprehensive client playbook generated and formatted by lunchtime.”",
      author: "Sarah Lindqvist, Executive Growth Consultant",
    },
  ];

  return (
    <section className="py-20 md:py-28 font-body">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-[12px] font-bold text-primary uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            Tailored For You
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-on-surface tracking-tight leading-tight">
            Built for Everyone Who Takes Words Seriously.
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed">
            Whether you are writing a debut novel, building agency client assets, or running a 7-figure affiliate blog, Writerdost adapts to your workflow.
          </p>
        </div>

        {/* 4 Persona Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {personas.map((p) => (
            <div
              key={p.title}
              className="p-7 sm:p-8 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest dark:bg-[#131326] shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-3.5 mb-3">
                  <div
                    className={`w-11 h-11 rounded-xl bg-gradient-to-br ${p.color} text-white flex items-center justify-center shadow-sm`}
                  >
                    <span className="material-symbols-outlined text-[22px]">{p.icon}</span>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-on-surface">{p.title}</h3>
                    <p className="text-[12.5px] font-semibold text-primary">{p.tagline}</p>
                  </div>
                </div>

                {/* Benefits List */}
                <ul className="space-y-2.5 my-6">
                  {p.benefits.map((b) => (
                    <li key={b} className="flex items-start gap-2 text-[13px] text-on-surface/90">
                      <span className="material-symbols-outlined text-[17px] text-primary shrink-0 mt-0.5">
                        check
                      </span>
                      <span>{b}</span>
                    </li>
                  ))}
                </ul>

                {/* Quote Box */}
                <div className="p-4 rounded-xl bg-surface-container dark:bg-[#191932] border border-outline-variant/20 italic text-[12.5px] text-on-surface-variant font-serif">
                  {p.quote}
                  <div className="mt-2 not-italic font-sans font-bold text-[11px] text-on-surface">
                    — {p.author}
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-outline-variant/20">
                <Link
                  href="/create"
                  className="text-[13px] font-bold text-primary hover:underline flex items-center gap-1"
                >
                  Start creating for your workflow &rarr;
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
