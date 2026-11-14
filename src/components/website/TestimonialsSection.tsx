"use client";

export default function TestimonialsSection() {
  const showcases = [
    {
      category: "Non-Fiction Ebook",
      categoryColor: "bg-primary/10 text-primary border-primary/20",
      icon: "auto_stories",
      iconColor: "text-primary",
      title: "Enterprise AI Strategy Playbook",
      description:
        "A 12-chapter, 28,000-word technical guide generated using the Agent Swarm with Claude 3.5 Sonnet. Research sourced from 14 web references and 2 PDF whitepapers.",
      stats: "28k words • 12 chapters • 4 min draft time",
    },
    {
      category: "WordPress Blog Series",
      categoryColor: "bg-[#21759b]/10 text-[#21759b] border-[#21759b]/20",
      icon: "rss_feed",
      iconColor: "text-[#21759b]",
      title: "16-Part SaaS Marketing Drip Campaign",
      description:
        "Product documentation converted into a scheduled blog series using the writerdost-connect WordPress plugin. Cron-scheduled for weekday publishing with auto-generated tags and meta descriptions.",
      stats: "16 articles • Auto-scheduled • Zero copy-paste",
    },
    {
      category: "Manuscript Rewrite",
      categoryColor: "bg-amber-500/10 text-amber-500 border-amber-500/20",
      icon: "book_5",
      iconColor: "text-amber-500",
      title: "PhD Thesis → Commercial Non-Fiction",
      description:
        "An academic dissertation rewritten using the Bestseller tone preset. The Rewrite Studio transformed dense academic prose into engaging, commercially viable non-fiction chapters.",
      stats: "45k words • Tone: Bestseller • Full structural transform",
    },
    {
      category: "Privacy-First Setup",
      categoryColor: "bg-purple-500/10 text-purple-500 border-purple-500/20",
      icon: "terminal",
      iconColor: "text-purple-500",
      title: "Financial Advisory Monograph (Offline Ollama)",
      description:
        "A private financial advisory guide generated entirely on local Ollama infrastructure. Zero data transmitted to external servers. Exported as validated EPUB for internal distribution.",
      stats: "100% offline • Llama 3.1 • Private EPUB export",
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-surface-container-low/30 dark:bg-[#0c0c16] font-body">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-[12px] font-bold text-primary uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            Early Access
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-on-surface tracking-tight leading-tight">
            What Beta Writers Are Building Right Now.
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed">
            Writerdost is in active beta. Here is what creators and publishers are producing with autonomous agent swarms.
          </p>
        </div>

        {/* Showcase Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {showcases.map((item) => (
            <div
              key={item.title}
              className="p-7 sm:p-8 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest dark:bg-[#131326] shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between gap-3 mb-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-9 h-9 rounded-xl bg-surface-container flex items-center justify-center">
                      <span className={`material-symbols-outlined text-[20px] ${item.iconColor}`}>
                        {item.icon}
                      </span>
                    </span>
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border ${item.categoryColor}`}
                    >
                      {item.category}
                    </span>
                  </div>
                </div>

                <h3 className="text-xl font-bold text-on-surface tracking-tight mb-2">
                  {item.title}
                </h3>
                <p className="text-[13.5px] leading-relaxed text-on-surface-variant font-normal">
                  {item.description}
                </p>
              </div>

              <div className="mt-6 pt-4 border-t border-outline-variant/20 flex items-center justify-between">
                <span className="text-[11.5px] font-mono text-primary font-semibold">
                  {item.stats}
                </span>
                <span className="text-emerald-600 dark:text-emerald-400 font-semibold text-[11px] flex items-center gap-1">
                  <span className="material-symbols-outlined text-[14px]">verified</span>
                  Verified Output
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Footnote */}
        <p className="mt-8 text-center text-[12px] text-on-surface-variant/70">
          These showcase real capabilities demonstrated during beta testing. Output results depend on input vision, chosen AI model, and project scope.
        </p>
      </div>
    </section>
  );
}
