"use client";

export default function TestimonialsSection() {
  const testimonials = [
    {
      quote:
        "Every other AI tool I tried devolved into repetitive gibberish by Chapter 3. Writerdost's 4-agent swarm planned and drafted an 11-chapter, 28,000-word book that required only light editorial polish before publishing on Kindle.",
      author: "Dr. Arthur Vance",
      title: "Author of 'Systems of Sovereign Compute'",
      stats: "28k words in 4 mins",
      avatar: "AV",
      avatarBg: "bg-blue-600",
    },
    {
      quote:
        "The writerdost-connect WordPress plugin alone is worth 10x the subscription. I turned our product documentation into a 16-part blog drip campaign, scheduled the cron, and it synced flawlessly without a single broken tag.",
      author: "Maya Lin",
      title: "Head of Growth at Apex SaaS",
      stats: "16 Articles Synced to WP",
      avatar: "ML",
      avatarBg: "bg-indigo-600",
    },
    {
      quote:
        "Running local Ollama models with zero server transmission was non-negotiable for our private financial advisory monographs. Writerdost gave us an enterprise studio entirely within our own privacy perimeter.",
      author: "Julian Thorne",
      title: "Managing Director, Thorne Capital",
      stats: "100% Private Offline Ollama",
      avatar: "JT",
      avatarBg: "bg-emerald-600",
    },
    {
      quote:
        "The Manuscript Rewrite Studio transformed a clunky, academic PhD thesis into an engaging commercial non-fiction bestseller. The tone presets understand subtext, rhythm, and tension far better than generic prompt engineering.",
      author: "Clara Beauchamp",
      title: "Independent Non-Fiction Publisher",
      stats: "4 Manuscript Rewrites",
      avatar: "CB",
      avatarBg: "bg-purple-600",
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-surface-container-low/30 dark:bg-[#0c0c16] font-body">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-[12px] font-bold text-primary uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            Wall of Love
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-on-surface tracking-tight leading-tight">
            Trusted by Authors &amp; Digital Publishers Worldwide.
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed">
            Discover how creators are scaling high-craft long-form literature and automated web publication.
          </p>
        </div>

        {/* Testimonials Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {testimonials.map((t) => (
            <div
              key={t.author}
              className="p-7 sm:p-8 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest dark:bg-[#131326] shadow-sm flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center gap-1 text-amber-500 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <span key={i} className="material-symbols-outlined text-[18px]" style={{ fontVariationSettings: "'FILL' 1" }}>
                      star
                    </span>
                  ))}
                </div>
                <p className="text-[14px] sm:text-[14.5px] leading-relaxed text-on-surface/90 font-serif italic mb-6">
                  &ldquo;{t.quote}&rdquo;
                </p>
              </div>

              <div className="pt-4 border-t border-outline-variant/20 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-10 h-10 rounded-xl ${t.avatarBg} text-white flex items-center justify-center font-bold text-[13px] shadow-sm`}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <h4 className="text-[13.5px] font-bold text-on-surface">{t.author}</h4>
                    <p className="text-[11.5px] text-on-surface-variant">{t.title}</p>
                  </div>
                </div>
                <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-surface-container text-primary font-bold hidden sm:inline-block">
                  {t.stats}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
