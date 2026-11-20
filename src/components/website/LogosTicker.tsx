"use client";

export default function LogosTicker() {
  const ecosystems = [
    {
      name: "Anthropic Claude",
      role: "Sonnet 3.5 & Opus Coherence",
      tag: "Cloud API",
      icon: "neurology",
    },
    {
      name: "OpenAI",
      role: "GPT-4o Complex Narrative",
      tag: "Cloud API",
      icon: "psychology",
    },
    {
      name: "Google Gemini",
      role: "Gemini 1.5 Pro Context RKB",
      tag: "Cloud API",
      icon: "hub",
    },
    {
      name: "Ollama",
      role: "100% Offline Local Models",
      tag: "Local Host",
      icon: "terminal",
    },
    {
      name: "Amazon KDP",
      role: "Validated Print & Kindle EPUB",
      tag: "Format Engine",
      icon: "menu_book",
    },
    {
      name: "WordPress",
      role: "Direct REST Multi-Site Syndication",
      tag: "Distribution",
      icon: "rss_feed",
    },
  ];

  return (
    <section id="ecosystem" className="py-12 border-y border-outline-variant/30 dark:border-white/8 bg-surface-container-low/30 dark:bg-[#0d0f17]">
      <div className="wrap-screen">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <p className="text-[12px] font-bold uppercase tracking-widest text-emerald-700 dark:text-emerald-400 mb-2">
            Verified Stack
          </p>
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface dark:text-slate-100 tracking-tight">
            Orchestrates leading foundation models &amp; publishing formats
          </h2>
          <p className="text-[13px] text-on-surface-variant dark:text-slate-400 mt-1.5">
            Zero token markup. Bring your own API keys or run completely free on your local machine.
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
          {ecosystems.map((eco) => (
            <div
              key={eco.name}
              className="card-lift flex flex-col justify-between p-4 rounded-xl bg-surface-container-lowest dark:bg-[#131622] border border-outline-variant/30 dark:border-white/8 hover:border-emerald-500/40 transition-all shadow-xs"
            >
              <div className="flex items-center justify-between mb-3">
                <span className="w-8 h-8 rounded-lg bg-surface-container dark:bg-white/5 border border-outline-variant/30 dark:border-white/10 flex items-center justify-center text-on-surface dark:text-slate-200">
                  <span className="material-symbols-outlined text-[18px]">
                    {eco.icon}
                  </span>
                </span>
                <span className="text-[9.5px] font-mono px-2 py-0.5 rounded-full bg-surface-container dark:bg-white/5 text-on-surface-variant dark:text-slate-400 border border-outline-variant/20 dark:border-white/5">
                  {eco.tag}
                </span>
              </div>
              <div>
                <span className="text-[13px] font-bold text-on-surface dark:text-slate-100 block leading-tight">
                  {eco.name}
                </span>
                <span className="text-[11px] text-on-surface-variant dark:text-slate-400 block mt-1 leading-snug">
                  {eco.role}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
