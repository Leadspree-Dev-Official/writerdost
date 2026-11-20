"use client";

import Link from "next/link";

export default function PricingSection() {
  return (
    <section id="pricing" className="py-20 md:py-28 font-body bg-[#0b0d12] border-b border-white/8">
      <div className="wrap-screen">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-14 space-y-4">
          <span className="text-[12px] font-bold text-emerald-400 uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            Zero Token Markup
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-slate-100 tracking-tight leading-tight">
            Wholesale API Economics. Zero SaaS Tollbooths.
          </h2>
          <p className="text-base sm:text-lg text-slate-400 leading-relaxed">
            Most AI writing tools charge $49–$99/month and restrict your word count. Writerdost provides the full autonomous multi-agent studio free during beta—you pay only wholesale API rates with zero markup.
          </p>
        </div>

        {/* Dual-Column Honest Economics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto mb-12">
          {/* Card 1: Free Beta Access */}
          <div className="card-lift p-8 rounded-2xl bg-[#12141f] border border-emerald-500/30 flex flex-col justify-between shadow-xl shadow-black/40 relative">
            <div className="absolute top-4 right-4">
              <span className="text-[11px] font-bold text-emerald-400 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 uppercase tracking-wider">
                Public Beta
              </span>
            </div>

            <div>
              <span className="text-[12px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                Platform Access
              </span>
              <h3 className="text-2xl font-black text-slate-100 tracking-tight">
                Writerdost Studio
              </h3>
              <div className="my-5 flex items-baseline gap-2">
                <span className="text-5xl font-black text-slate-100 tracking-tight">$0</span>
                <span className="text-sm font-semibold text-slate-400">/ free during beta</span>
              </div>
              <p className="text-[13px] text-slate-300 mb-6 leading-relaxed">
                Full access to the 4-agent swarm orchestration pipeline, quota pacing engine, and KDP formatting studio.
              </p>

              <div className="space-y-3 pt-4 border-t border-white/8">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  What is included:
                </p>
                {[
                  "Unlimited book and long-form manuscript projects",
                  "Full 4-Agent Autonomous Swarm (Memory, Pacing, Sub-Swarm, QA)",
                  "Dynamic Quota & Chapter Pacing Manager (1k to 100k+ words)",
                  "TipTap Distraction-Free Book Studio with live telemetry",
                  "Amazon KDP validated EPUB, print PDF & DOCX export",
                  "Direct WordPress REST API multi-site syndication",
                  "Local browser encrypted buffer with zero telemetry leaks",
                ].map((feat, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-[13px] text-slate-300">
                    <span className="material-symbols-outlined text-emerald-400 text-[18px] shrink-0 mt-0.5">
                      check_circle
                    </span>
                    <span>{feat}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/8 space-y-2">
              <Link
                href="/signup"
                className="btn btn-primary w-full py-3.5 text-sm font-bold flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <span>Create Free Beta Account</span>
                <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
              </Link>
              <p className="text-[11px] text-center text-slate-400">
                No credit card required • Instant access
              </p>
            </div>
          </div>

          {/* Card 2: Wholesale API Economics */}
          <div className="card-lift p-8 rounded-2xl bg-[#10121a] border border-white/8 flex flex-col justify-between shadow-xl shadow-black/40">
            <div>
              <span className="text-[12px] font-mono uppercase tracking-wider text-slate-400 block mb-1">
                Your Direct API Spend
              </span>
              <h3 className="text-2xl font-black text-slate-100 tracking-tight">
                Wholesale API Economics
              </h3>
              <div className="my-5 flex items-baseline gap-2">
                <span className="text-3xl font-black text-slate-100 tracking-tight">~$1.50</span>
                <span className="text-sm font-semibold text-slate-400">per 50k-word manuscript</span>
              </div>
              <p className="text-[13px] text-slate-300 mb-6 leading-relaxed">
                Plug in your own API key directly from Claude, OpenAI, or Gemini. The platform never marks up your tokens.
              </p>

              <div className="space-y-3 pt-4 border-t border-white/8">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Cost Transparency Breakdown:
                </p>
                {[
                  "Anthropic Claude 3.5 Sonnet: ~$1.20 - $2.40 per 50k words",
                  "Google Gemini 1.5 Pro: ~$0.50 - $1.10 per 50k words",
                  "OpenAI GPT-4o: ~$1.50 - $3.00 per 50k words",
                  "Local Ollama (Llama 3 / Gemma 2): $0.00 (100% Free & Offline)",
                  "Zero platform fee, zero hidden token markup, zero lock-in",
                  "Encrypted keys stored only in your session buffer",
                ].map((item, idx) => (
                  <div key={idx} className="flex items-start gap-2.5 text-[13px] text-slate-300">
                    <span className="material-symbols-outlined text-slate-400 text-[18px] shrink-0 mt-0.5">
                      payments
                    </span>
                    <span>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-white/8 bg-white/2 rounded-xl p-4 border border-white/5">
              <span className="text-[11.5px] font-mono uppercase tracking-wider text-emerald-400 block mb-1">
                Why this model wins for authors:
              </span>
              <p className="text-[12px] text-slate-300 leading-relaxed">
                When you write 3 books a month on traditional tools, you run into word quotas or pay $150+/mo. With Writerdost BYO keys, drafting 150,000 words costs roughly $4 to $6 in raw API usage.
              </p>
            </div>
          </div>
        </div>

        {/* Amazon KDP Guarantee Strip */}
        <div className="max-w-4xl mx-auto p-6 rounded-2xl bg-[#12141f] border border-white/8 flex flex-col sm:flex-row items-center gap-6">
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-[24px]">verified</span>
          </div>
          <div>
            <h4 className="text-base font-bold text-slate-100 tracking-tight">
              Amazon KDP Format Guarantee
            </h4>
            <p className="text-[13px] text-slate-400 mt-1 leading-relaxed">
              Every exported EPUB and print PDF is built according to Amazon KDP and IDPF 3.0 standards. If Amazon KDP rejects your manuscript due to a structural formatting error, our team personally resolves the issue.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
