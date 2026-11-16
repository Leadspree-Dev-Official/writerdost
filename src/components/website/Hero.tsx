"use client";

import Link from "next/link";
import { useAppStore } from "@/lib/app-store";
import HeroInteractivePreview from "./HeroInteractivePreview";

export default function Hero() {
  const currentUser = useAppStore((state) => state.currentUser);

  return (
    <section className="relative pt-12 pb-20 md:pt-20 md:pb-28 overflow-hidden font-body">
      {/* Background Decorative Ambient Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[400px] bg-gradient-to-tr from-primary/15 via-purple-600/10 to-transparent blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-12 left-10 w-72 h-72 bg-indigo-500/10 blur-3xl pointer-events-none -z-10" />
      <div className="absolute top-20 right-10 w-80 h-80 bg-purple-500/10 blur-3xl pointer-events-none -z-10" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Top Eyebrow Badge */}
        <div className="flex justify-center mb-6">
          <Link
            href="#templates"
            className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full border border-primary/30 bg-primary/5 text-primary text-[12px] font-semibold tracking-wide backdrop-blur-xs shadow-xs hover:border-primary/50 transition-colors"
          >
            <span className="w-2 h-2 rounded-full bg-primary animate-pulse" />
            <span>✨ Explore 6 Pre-Tuned Book &amp; Content Blueprints</span>
            <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
          </Link>
        </div>

        {/* Main Headline */}
        <div className="text-center max-w-4xl mx-auto space-y-6">
          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight text-on-surface leading-[1.12]">
            Standard AI Breaks Down After 3,000 Words.{" "}
            <span className="text-primary">
              Writerdost Writes 30,000.
            </span>
          </h1>

          {/* Subtitle */}
          <p className="text-base sm:text-lg lg:text-xl text-on-surface-variant max-w-2xl mx-auto leading-relaxed font-normal">
            Turn raw outlines into ready-to-publish manuscripts in{" "}
            <span className="line-through decoration-primary/50 decoration-2 opacity-75">months</span>{" "}
            <span className="font-bold text-on-surface">an afternoon</span>. Four AI agents research, outline, write chapters in parallel, and format print-ready exports.
          </p>

          {/* Call to Action Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {currentUser ? (
              <Link
                href="/dashboard"
                className="btn btn-primary btn-lg w-full sm:w-auto px-8 py-3.5 text-base shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
              >
                <span>Enter Your Workspace</span>
                <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
              </Link>
            ) : (
              <Link
                href="/signup"
                className="btn btn-primary btn-lg w-full sm:w-auto px-8 py-3.5 text-base shadow-lg shadow-primary/30 flex items-center justify-center gap-2"
              >
                <span>Start Writing Free</span>
                <span className="material-symbols-outlined text-[18px]">auto_awesome</span>
              </Link>
            )}

            <a
              href="#interactive-demo"
              className="btn btn-secondary btn-lg w-full sm:w-auto px-7 py-3.5 text-base flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-[18px]">play_circle</span>
              <span>See It in Action</span>
            </a>
          </div>

          {/* Micro Trust Indicators */}
          <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px] text-on-surface-variant font-medium pt-1">
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-emerald-500">check_circle</span>
              100% Free to get started
            </span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-emerald-500">check_circle</span>
              No credit card required
            </span>
            <span className="flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[15px] text-emerald-500">check_circle</span>
              100% copyright &amp; commercial IP ownership
            </span>
          </div>
        </div>

        {/* Hero Interactive Studio Mockup — Prominently above the fold */}
        <div className="mt-12">
          <HeroInteractivePreview />
        </div>

        {/* Key Metrics Strip */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto my-12 pt-6 border-y border-outline-variant/30">
          <div className="text-center p-3">
            <p className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">30,000+</p>
            <p className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider mt-1">
              Words per Manuscript
            </p>
          </div>
          <div className="text-center p-3 border-l border-outline-variant/30">
            <p className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">4 Agents</p>
            <p className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider mt-1">
              Working in Parallel
            </p>
          </div>
          <div className="text-center p-3 border-l border-outline-variant/30">
            <p className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">&lt; 5 min</p>
            <p className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider mt-1">
              Average Draft Time
            </p>
          </div>
          <div className="text-center p-3 border-l border-outline-variant/30">
            <p className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">100%</p>
            <p className="text-[12px] font-semibold text-on-surface-variant uppercase tracking-wider mt-1">
              Copyright Ownership
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
