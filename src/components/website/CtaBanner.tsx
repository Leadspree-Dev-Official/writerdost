"use client";

import Link from "next/link";
import { useAppStore } from "@/lib/app-store";

export default function CtaBanner() {
  const currentUser = useAppStore((state) => state.currentUser);

  return (
    <section className="py-20 font-body relative overflow-hidden">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="relative rounded-3xl overflow-hidden bg-gradient-to-br from-[#12102e] via-[#1a1744] to-[#2b1754] text-white p-8 sm:p-14 shadow-2xl border border-white/10 text-center">
          {/* Cosmic Lighting Overlays */}
          <div className="absolute -top-24 -left-24 w-80 h-80 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-purple-500/20 rounded-full blur-3xl pointer-events-none" />

          {/* Badge */}
          <div className="relative z-10 inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-white/10 backdrop-blur-xs text-[12px] font-bold tracking-wide uppercase mb-6 text-indigo-200 border border-white/15">
            <span className="material-symbols-outlined text-[15px] text-amber-300">auto_awesome</span>
            <span>Your Manuscript Awaits</span>
          </div>

          {/* Headline */}
          <h2 className="relative z-10 text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-tight max-w-2xl mx-auto">
            Stop Dreaming About Your Book. <br className="hidden sm:inline" />
            <span className="text-amber-300">
              Publish It in Record Time.
            </span>
          </h2>

          {/* Subtitle */}
          <p className="relative z-10 text-base sm:text-lg text-slate-300 max-w-xl mx-auto mt-4 mb-8 leading-relaxed font-normal">
            Orchestrate your first 4-agent swarm today. Research, plan, write, and push straight to WordPress or Kindle without hitting context ceilings.
          </p>

          {/* Action Buttons */}
          <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3">
            {currentUser ? (
              <Link
                href="/dashboard"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-white text-slate-950 font-bold text-base hover:bg-slate-100 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <span>Launch Your Workspace</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            ) : (
              <Link
                href="/signup"
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-primary text-white font-bold text-base hover:opacity-95 transition-all shadow-lg shadow-indigo-500/30 flex items-center justify-center gap-2"
              >
                <span>Start Writing Free</span>
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              </Link>
            )}

            <a
              href="#interactive-demo"
              className="w-full sm:w-auto px-7 py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold text-base transition-all border border-white/15 flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">play_circle</span>
              <span>Explore Studio Simulation</span>
            </a>
          </div>

          {/* Reassurance */}
          <div className="relative z-10 flex flex-wrap items-center justify-center gap-6 mt-8 text-[12px] text-slate-300 font-medium">
            <span>✓ No credit card required</span>
            <span>✓ 100% intellectual property ownership</span>
            <span>✓ Cancel anytime</span>
          </div>
        </div>
      </div>
    </section>
  );
}
