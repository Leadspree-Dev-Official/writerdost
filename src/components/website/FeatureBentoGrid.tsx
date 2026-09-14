"use client";

import Link from "next/link";

export default function FeatureBentoGrid() {
  return (
    <section id="features" className="py-20 md:py-28 bg-surface-container-low/40 dark:bg-[#0d0d18] font-body">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-[12px] font-bold text-primary uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            End-to-End Suite
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-on-surface tracking-tight leading-tight">
            Every Tool Serious Authors &amp; Publishers Need.
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed">
            From initial research and multi-agent synthesis to fine typography and automated WordPress syndication — all under one unified roof.
          </p>
        </div>

        {/* Bento Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Bento Card 1: Long-Form Ebook Engine (Large 2 Cols) */}
          <div className="md:col-span-2 p-7 sm:p-8 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest dark:bg-[#131326] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">auto_stories</span>
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Core Engine
                </span>
              </div>

              <h3 className="text-2xl font-black text-on-surface tracking-tight">
                Autonomous 30,000+ Word Ebook Generation
              </h3>
              <p className="text-[14.5px] text-on-surface-variant leading-relaxed max-w-xl">
                Break free from the 3,000-word context ceiling. Writerdost splits long manuscripts into coherent thematic chapters, generating comprehensive, book-length non-fiction and fiction with unbroken continuity and rich exposition.
              </p>

              {/* Visual Mini Mockup */}
              <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-surface-container dark:bg-[#1b1b32] border border-outline-variant/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-bold text-on-surface">Chapter 1</span>
                    <span className="text-[10px] text-emerald-500 font-bold">Done</span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant">The Foundations of Enterprise AI</p>
                  <span className="text-[10px] text-on-surface-variant/70 font-mono mt-2 block">2,840 words</span>
                </div>

                <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-bold text-primary">Chapter 2</span>
                    <span className="text-[10px] text-primary font-bold animate-pulse">Writing...</span>
                  </div>
                  <p className="text-[11px] text-on-surface">Agentic Topologies &amp; Routing</p>
                  <span className="text-[10px] text-primary font-mono mt-2 block">1,920 / 3,000 words</span>
                </div>

                <div className="p-3 rounded-xl bg-surface-container dark:bg-[#1b1b32] border border-outline-variant/20 opacity-70">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-bold text-on-surface">Chapter 3</span>
                    <span className="text-[10px] text-on-surface-variant">Queued</span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant">Safety &amp; Guardrail Synthesis</p>
                  <span className="text-[10px] text-on-surface-variant/70 font-mono mt-2 block">Target 3,200 words</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-outline-variant/20 flex items-center justify-between">
              <span className="text-[12px] text-on-surface-variant">
                Supports Quick Draft &amp; Agent Swarm Orchestration modes
              </span>
              <Link href="/create" className="text-primary font-bold text-[13px] hover:underline flex items-center gap-1">
                Explore Create Flow &rarr;
              </Link>
            </div>
          </div>

          {/* Bento Card 2: Focused TipTap Canvas */}
          <div className="p-7 sm:p-8 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest dark:bg-[#131326] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">draw</span>
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">
                  Editorial
                </span>
              </div>

              <h3 className="text-xl font-bold text-on-surface tracking-tight">
                Focused TipTap Canvas with Live AI Copilot
              </h3>
              <p className="text-[13.5px] text-on-surface-variant leading-relaxed">
                A distraction-free writing environment built for craft. Toggle serif book typography (EB Garamond, Lora, Merriweather) and prompt the inline AI assistant to expand arguments, polish cadence, or synthesize dialogue.
              </p>

              <div className="p-3.5 rounded-xl bg-surface-container dark:bg-[#191930] border border-outline-variant/20 text-[12px] space-y-1.5 font-serif italic text-on-surface-variant">
                &ldquo;Highlight any paragraph to trigger one-click rephrasing, sensory deepening, or metaphor expansion.&rdquo;
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-outline-variant/20">
              <Link href="/editor" className="text-primary font-bold text-[13px] hover:underline flex items-center gap-1">
                Open Manuscript Editor &rarr;
              </Link>
            </div>
          </div>

          {/* Bento Card 3: Manuscript Rewrite Studio */}
          <div className="p-7 sm:p-8 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest dark:bg-[#131326] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">book_5</span>
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
                  Polishing
                </span>
              </div>

              <h3 className="text-xl font-bold text-on-surface tracking-tight">
                Manuscript Rewrite &amp; Tone Studio
              </h3>
              <p className="text-[13.5px] text-on-surface-variant leading-relaxed">
                Revitalize old books, academic drafts, or rough transcriptions. Ingest entire manuscripts and apply high-impact tone presets to transform dry prose into riveting, best-selling page-turners.
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {["Bestseller", "Conversational", "Provocative", "Academic"].map((tone) => (
                  <span
                    key={tone}
                    className="px-2 py-0.5 rounded-md bg-surface-container dark:bg-[#1a1a32] text-[11px] font-medium text-on-surface-variant"
                  >
                    {tone}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-outline-variant/20">
              <Link href="/rewrite" className="text-primary font-bold text-[13px] hover:underline flex items-center gap-1">
                Launch Rewrite Studio &rarr;
              </Link>
            </div>
          </div>

          {/* Bento Card 4: Automated WordPress Publishing (Large 2 Cols) */}
          <div id="wordpress" className="md:col-span-2 p-7 sm:p-8 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest dark:bg-[#131326] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-[#21759b]/15 text-[#21759b] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">rss_feed</span>
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#21759b]">
                  Automated Distribution
                </span>
              </div>

              <h3 className="text-2xl font-black text-on-surface tracking-tight">
                Scheduled Blog Automations with Official WordPress Plugin
              </h3>
              <p className="text-[14.5px] text-on-surface-variant leading-relaxed max-w-xl">
                Convert your long-form chapters into SEO-optimized blog campaigns. Install our native <code className="text-primary font-mono bg-primary/10 px-1 py-0.5 rounded">writerdost-connect</code> plugin and let cron schedules automatically push formatted articles, tags, and meta descriptions straight to WordPress.
              </p>

              {/* Plugin highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-surface-container dark:bg-[#191932] border border-outline-variant/20">
                  <div className="flex items-center gap-1.5 text-on-surface font-bold text-[12px] mb-1">
                    <span className="material-symbols-outlined text-[16px] text-emerald-500">schedule</span>
                    Cron Scheduling
                  </div>
                  <p className="text-[11px] text-on-surface-variant">Daily, weekly, or custom cron intervals.</p>
                </div>

                <div className="p-3 rounded-xl bg-surface-container dark:bg-[#191932] border border-outline-variant/20">
                  <div className="flex items-center gap-1.5 text-on-surface font-bold text-[12px] mb-1">
                    <span className="material-symbols-outlined text-[16px] text-emerald-500">category</span>
                    Taxonomy Sync
                  </div>
                  <p className="text-[11px] text-on-surface-variant">Auto-categorizes &amp; tags posts for search.</p>
                </div>

                <div className="p-3 rounded-xl bg-surface-container dark:bg-[#191932] border border-outline-variant/20">
                  <div className="flex items-center gap-1.5 text-on-surface font-bold text-[12px] mb-1">
                    <span className="material-symbols-outlined text-[16px] text-emerald-500">key</span>
                    Application Passwords
                  </div>
                  <p className="text-[11px] text-on-surface-variant">Zero complex OAuth setup required.</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-outline-variant/20 flex items-center justify-between">
              <span className="text-[12px] text-on-surface-variant">
                Works with self-hosted WordPress 5.8+ and WooCommerce blogs
              </span>
              <Link href="/automations" className="text-primary font-bold text-[13px] hover:underline flex items-center gap-1">
                Configure Automations &rarr;
              </Link>
            </div>
          </div>

          {/* Bento Card 5: Multi-Model & Local Ollama */}
          <div className="p-7 sm:p-8 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest dark:bg-[#131326] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">terminal</span>
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-purple-500">
                  Privacy &amp; Local
                </span>
              </div>

              <h3 className="text-xl font-bold text-on-surface tracking-tight">
                BYO-Model &amp; 100% Offline Ollama
              </h3>
              <p className="text-[13.5px] text-on-surface-variant leading-relaxed">
                Connect your personal API keys (OpenAI, Claude, Gemini, DeepSeek) or run private local models (Llama 3, DeepSeek R1) over Ollama. Zero telemetry, zero server-side training on your proprietary manuscripts.
              </p>

              <div className="p-3 rounded-xl bg-surface-container dark:bg-[#1a1a34] border border-outline-variant/20 text-[11px] font-mono text-on-surface-variant">
                Endpoint: http://localhost:11434<br />
                Model: llama3.1:8b (Private Offline)
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-outline-variant/20">
              <Link href="/settings" className="text-primary font-bold text-[13px] hover:underline flex items-center gap-1">
                Configure AI Provider &rarr;
              </Link>
            </div>
          </div>

          {/* Bento Card 6: Enterprise Multi-Format Exports */}
          <div className="p-7 sm:p-8 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest dark:bg-[#131326] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">download</span>
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-500">
                  Publish Ready
                </span>
              </div>

              <h3 className="text-xl font-bold text-on-surface tracking-tight">
                Kindle EPUB, DOCX &amp; PDF Exports
              </h3>
              <p className="text-[13.5px] text-on-surface-variant leading-relaxed">
                Export validated EPUB 3.0 ebooks ready for immediate upload to Amazon KDP, Apple Books, and Google Play Books. Also exports styled Word DOCX, PDF, and clean Markdown.
              </p>

              <div className="flex items-center gap-2 pt-1 text-[11.5px] text-on-surface font-semibold">
                <span className="px-2.5 py-1 rounded bg-surface-container">.EPUB</span>
                <span className="px-2.5 py-1 rounded bg-surface-container">.DOCX</span>
                <span className="px-2.5 py-1 rounded bg-surface-container">.PDF</span>
                <span className="px-2.5 py-1 rounded bg-surface-container">.MD</span>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-outline-variant/20">
              <span className="text-emerald-600 dark:text-emerald-400 font-bold text-[12px] flex items-center gap-1">
                <span className="material-symbols-outlined text-[15px]">verified</span>
                Validates on Kindle Previewer
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
