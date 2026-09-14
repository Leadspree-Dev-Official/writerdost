"use client";

export default function LogosTicker() {
  const ecosystems = [
    { name: "Anthropic Claude", role: "Long-form Coherence", icon: "neurology" },
    { name: "OpenAI GPT-4o", role: "Multimodal Intelligence", icon: "psychology" },
    { name: "Google Gemini", role: "Massive Context Memory", icon: "temp_preferences_custom" },
    { name: "DeepSeek R1", role: "Complex Reasoning", icon: "hub" },
    { name: "Ollama Local AI", role: "100% Offline Privacy", icon: "terminal" },
    { name: "WordPress Connect", role: "Direct REST Automation", icon: "rss_feed" },
    { name: "OpenRouter", role: "Universal Multi-Model", icon: "lan" },
  ];

  return (
    <section className="py-10 border-y border-outline-variant/30 bg-surface-container-low/30 dark:bg-[#0c0c16]/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <p className="text-center text-[12px] font-bold uppercase tracking-widest text-on-surface-variant/80 mb-6">
          Powering Modern Writing Workflows With World-Class Models &amp; Integrations
        </p>

        <div className="flex flex-wrap items-center justify-center gap-3 sm:gap-6">
          {ecosystems.map((eco) => (
            <div
              key={eco.name}
              className="flex items-center gap-2.5 px-4 py-2 rounded-xl bg-surface-container dark:bg-[#151528] border border-outline-variant/30 hover:border-primary/40 transition-colors shadow-xs"
            >
              <span className="material-symbols-outlined text-primary text-[18px]">
                {eco.icon}
              </span>
              <div>
                <span className="text-[12.5px] font-bold text-on-surface block leading-tight">
                  {eco.name}
                </span>
                <span className="text-[10px] text-on-surface-variant block font-medium">
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
