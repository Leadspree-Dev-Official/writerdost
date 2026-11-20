"use client";

import Link from "next/link";
import { useAppStore } from "@/lib/app-store";
import HeroInteractivePreview from "./HeroInteractivePreview";

export default function Hero() {
  const currentUser = useAppStore((state) => state.currentUser);

  return (
    <section id="hero" className="relative pt-8 pb-16 md:pt-14 md:pb-24 font-body overflow-hidden">
      <div className="wrap-screen">
        {/* Top Architecture Eyebrow Pill */}
        <div className="flex justify-center mb-6">
          <Link
            href="#architecture"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 text-emerald-400 text-[12px] font-semibold tracking-wide shadow-xs hover:border-emerald-500/50 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>4-Agent Parallel Swarm Engine + KDP Export Validation</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>

        {/* Main Headline & Positioning */}
        <div className="text-center max-w-4xl mx-auto space-y-5">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-on-surface leading-[1.12]">
            Autonomous book generation for authors and publishers.
          </h1>

          {/* Subtitle with hard fact and outcome */}
          <p className="text-base sm:text-lg lg:text-xl text-slate-300 max-w-2xl mx-auto leading-relaxed font-normal">
            Plan, draft, and format 1,000 to 100,000-word manuscripts with a 4-agent parallel swarm. No token markups, zero chapter drift.
          </p>

          {/* Call to Action Buttons: Verb + Object */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {currentUser ? (
              <Link
                href="/dashboard"
                className="btn btn-primary btn-lg w-full sm:w-auto px-8 py-3.5 text-base shadow-lg shadow-primary/25 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <span>Enter Your Workspace</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            ) : (
              <Link
                href="/signup"
                className="btn btn-primary btn-lg w-full sm:w-auto px-8 py-3.5 text-base shadow-lg shadow-primary/25 flex items-center justify-center gap-2 active:scale-[0.98] transition-transform"
              >
                <span>Draft a Book Free</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            )}

            <a
              href="#architecture"
              aria-label="Explore swarm pipeline architecture"
              className="btn btn-secondary btn-lg w-full sm:w-auto px-7 py-3.5 text-base flex items-center justify-center gap-2 active:scale-[0.98] transition-transform text-slate-200 border-white/10 hover:bg-white/5"
            >
              <span>Explore Architecture</span>
              <span className="material-symbols-outlined text-[18px]">south</span>
            </a>
          </div>

          {/* Grounded Technical Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-slate-400 font-medium pt-2">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-emerald-400">verified</span>
              Amazon KDP &amp; EPUB Validated
            </span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-emerald-400">key</span>
              Bring Your Own Keys (Zero Markup)
            </span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-emerald-400">shield</span>
              Local Ollama Offline Mode
            </span>
          </div>
        </div>

        {/* Hero Interactive Studio Mockup in App Frame */}
        <div className="mt-10 app-frame card-lift">
          <HeroInteractivePreview />
        </div>
      </div>
    </section>
  );
}
