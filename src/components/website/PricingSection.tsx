"use client";

import Link from "next/link";

export default function PricingSection() {
  return (
    <section id="pricing" className="py-20 md:py-28 font-body">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-4">
          <span className="text-[12px] font-bold text-primary uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            Free during beta
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-on-surface tracking-tight leading-tight">
            Start writing without a subscription.
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed">
            Writerdost is in beta. Bring your own AI key, keep ownership of your work,
            and help shape the product. No credit card is required.
          </p>
        </div>

        <div className="p-8 rounded-3xl border border-primary/40 bg-surface-container-lowest dark:bg-[#15152b] shadow-xl shadow-primary/10">
          <div className="flex items-center justify-between gap-4 mb-6">
            <h3 className="text-xl font-bold text-on-surface">Beta access</h3>
            <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-primary/10 text-primary">
              No card required
            </span>
          </div>
          <ul className="grid sm:grid-cols-2 gap-3 text-[13px] text-on-surface/90 mb-8">
            {[
              "Ebook creation and manuscript rewriting",
              "Bring your own OpenAI, OpenRouter, Claude, Gemini, or Ollama key",
              "Workspace saved to your account",
              "Markdown, DOCX, and PDF export",
              "WordPress and webhook publishing destinations",
              "Direct support during the beta",
            ].map((feature) => (
              <li key={feature} className="flex items-start gap-2.5">
                <span className="material-symbols-outlined text-[17px] text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5">
                  check_circle
                </span>
                <span>{feature}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link href="/signup" className="btn btn-primary w-full justify-center py-3 text-[13.5px] font-bold">
              Create a free account
            </Link>
            <Link href="mailto:contact@leadspree.in" className="btn btn-secondary w-full justify-center py-3 text-[13.5px] font-bold">
              Talk to the team
            </Link>
          </div>
          <p className="text-[11px] text-on-surface-variant mt-4">
            Pricing and paid plans will be announced only when billing and plan enforcement are live.
          </p>
        </div>
      </div>
    </section>
  );
}
