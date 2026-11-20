"use client";

import Link from "next/link";

export default function FeatureBentoGrid() {
  return (
    <section id="features" className="scroll-mt-20 py-20 md:py-28 bg-surface-container-low/40 dark:bg-[#0d0d18] font-body">
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
          {/* Bento Card 1: Long-Form Book Studio (Large 2 Cols) */}
          <div className="md:col-span-2 p-7 sm:p-8 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest dark:bg-[#131326] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">auto_stories</span>
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-primary">
                  Dedicated Book Studio
                </span>
              </div>

              <h3 className="text-2xl font-black text-on-surface tracking-tight">
                Autonomous 300,000-Word Book &amp; Manuscript Production
              </h3>
              <p className="text-[14.5px] text-on-surface-variant leading-relaxed max-w-xl">
                Break free from context ceilings. Writerdost scales up to 300,000 words (~1,200 print pages). Our BookMemoryBank state engine locks in character profiles, narrative arcs, and core arguments across dozens of chapters, so Chapter 30 never contradicts Chapter 1.
              </p>

              {/* Visual Mini Mockup */}
              <div className="pt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="p-3 rounded-xl bg-surface-container dark:bg-[#1b1b32] border border-outline-variant/20">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-bold text-on-surface">BookMemoryBank</span>
                    <span className="text-[10px] text-emerald-500 font-bold">Active</span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant">Lore &amp; Thesis Continuity Synced</p>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-mono mt-2 block">Zero drift across 24 chapters</span>
                </div>

                <div className="p-3 rounded-xl bg-primary/10 border border-primary/30">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-bold text-primary">Chapter 12</span>
                    <span className="text-[10px] text-primary font-bold animate-pulse">Writing...</span>
                  </div>
                  <p className="text-[11px] text-on-surface">Part III: Empirical Proof</p>
                  <span className="text-[10px] text-primary font-mono mt-2 block">58,400 / 120,000 words</span>
                </div>

                <div className="p-3 rounded-xl bg-surface-container dark:bg-[#1b1b32] border border-outline-variant/20 opacity-70">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-[12px] font-bold text-on-surface">Extended Omnibus</span>
                    <span className="text-[10px] text-on-surface-variant">Up to 300k</span>
                  </div>
                  <p className="text-[11px] text-on-surface-variant">Fantasy, Sagas &amp; Treatises</p>
                  <span className="text-[10px] text-on-surface-variant/70 font-mono mt-2 block">~1,200 print pages</span>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-outline-variant/20 flex items-center justify-between">
              <span className="text-[12px] text-on-surface-variant">
                Includes Definitive Thought Leadership, Epic Sagas &amp; Technical Reference templates
              </span>
              <Link href="/book" className="text-primary font-bold text-[13px] hover:underline flex items-center gap-1">
                Launch Book Studio &rarr;
              </Link>
            </div>
          </div>

          {/* Bento Card 2: Conversion & Copywriting Studio */}
          <div className="p-7 sm:p-8 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest dark:bg-[#131326] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">campaign</span>
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-indigo-500">
                  Direct Response
                </span>
              </div>

              <h3 className="text-xl font-bold text-on-surface tracking-tight">
                Copywriting Studio &amp; 5 Stages of Awareness
              </h3>
              <p className="text-[13.5px] text-on-surface-variant leading-relaxed">
                Generate high-reply B2B cold emails (PAS), sales letters, and Google Ads calibrated to Eugene Schwartz&apos;s 5 Stages of Awareness. Built-in compliance checks respect Google RSA character limits (&le; 30 char headlines, &le; 90 char descriptions) and Meta ad policies.
              </p>

              <div className="p-3.5 rounded-xl bg-surface-container dark:bg-[#191930] border border-outline-variant/20 text-[12px] space-y-1.5 text-on-surface-variant">
                <div className="flex items-center justify-between font-bold text-on-surface text-[11.5px]">
                  <span>Anti-AI Cliché Blacklist</span>
                  <span className="text-emerald-500 font-mono text-[10px]">Strict Filter</span>
                </div>
                <p className="text-[11px] text-on-surface-variant/80">
                  Blocks dead filler like &ldquo;delve&rdquo;, &ldquo;tapestry&rdquo;, and &ldquo;beacon&rdquo; for crisp, human conversion copy.
                </p>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-outline-variant/20">
              <Link href="/copywriting" className="text-primary font-bold text-[13px] hover:underline flex items-center gap-1">
                Open Copywriting Studio &rarr;
              </Link>
            </div>
          </div>

          {/* Bento Card 3: Bring Your Own Skills (BYOS) */}
          <div className="p-7 sm:p-8 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest dark:bg-[#131326] shadow-sm hover:shadow-md transition-shadow flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">extension</span>
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-500">
                  Extensibility &amp; BYOS
                </span>
              </div>

              <h3 className="text-xl font-bold text-on-surface tracking-tight">
                Bring Your Own Skills (BYOS) &amp; Custom Workflows
              </h3>
              <p className="text-[13.5px] text-on-surface-variant leading-relaxed">
                Import open-source or proprietary `.md` skills directly into your studio. Our YAML engine parses domain rubrics and sanitizes terminal bash commands to keep your workspace secure.
              </p>

              <div className="flex flex-wrap gap-1.5 pt-1">
                {["SEO Schema Suite", "Charlie Munger Inversion", "3-Tier Research", "Custom Rubrics"].map((skill) => (
                  <span
                    key={skill}
                    className="px-2 py-0.5 rounded-md bg-surface-container dark:bg-[#1a1a32] text-[11px] font-medium text-on-surface-variant"
                  >
                    {skill}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-outline-variant/20">
              <Link href="/research" className="text-primary font-bold text-[13px] hover:underline flex items-center gap-1">
                Explore Skills &amp; Research &rarr;
              </Link>
            </div>
          </div>

          {/* Bento Card 4: Automated WordPress Publishing & GEO (Large 2 Cols) */}
          <div id="wordpress" className="scroll-mt-24 md:col-span-2 p-7 sm:p-8 rounded-2xl border border-outline-variant/30 bg-surface-container-lowest dark:bg-[#131326] shadow-sm hover:shadow-md transition-shadow relative overflow-hidden flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <span className="w-10 h-10 rounded-xl bg-[#21759b]/15 text-[#21759b] flex items-center justify-center">
                  <span className="material-symbols-outlined text-[22px]">rss_feed</span>
                </span>
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#21759b]">
                  GEO &amp; Automated Distribution
                </span>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10.5px] font-bold border border-emerald-500/20">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Google AI Overviews &amp; ChatGPT Citations
                </span>
              </div>

              <h3 className="text-2xl font-black text-on-surface tracking-tight">
                Generative Engine Optimization (GEO) &amp; WordPress Syndication
              </h3>
              <p className="text-[14.5px] text-on-surface-variant leading-relaxed max-w-xl">
                Modern search engines don&apos;t just index keywords—Google AI Overviews, ChatGPT Search, and Perplexity extract concise, authoritative answers. Writerdost formats articles with definition-first passages, automated FAQPage JSON-LD schema, and hands-off publishing straight to WordPress via our official <code className="text-primary font-mono bg-primary/10 px-1 py-0.5 rounded">writerdost-connect</code> plugin.
              </p>

              {/* Plugin & GEO highlights */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                <div className="p-3 rounded-xl bg-surface-container dark:bg-[#191932] border border-outline-variant/20">
                  <div className="flex items-center gap-1.5 text-on-surface font-bold text-[12px] mb-1">
                    <span className="material-symbols-outlined text-[16px] text-emerald-500">format_quote</span>
                    AI Citation Structuring
                  </div>
                  <p className="text-[11px] text-on-surface-variant">Definition-first leads &amp; 50-word answer capsules for LLMs.</p>
                </div>

                <div className="p-3 rounded-xl bg-surface-container dark:bg-[#191932] border border-outline-variant/20">
                  <div className="flex items-center gap-1.5 text-on-surface font-bold text-[12px] mb-1">
                    <span className="material-symbols-outlined text-[16px] text-emerald-500">data_object</span>
                    Automated Schema &amp; FAQs
                  </div>
                  <p className="text-[11px] text-on-surface-variant">Injected FAQPage &amp; Article JSON-LD for rich snippets.</p>
                </div>

                <div className="p-3 rounded-xl bg-surface-container dark:bg-[#191932] border border-outline-variant/20">
                  <div className="flex items-center gap-1.5 text-on-surface font-bold text-[12px] mb-1">
                    <span className="material-symbols-outlined text-[16px] text-emerald-500">sync_alt</span>
                    Hands-Off WordPress Drip
                  </div>
                  <p className="text-[11px] text-on-surface-variant">Scheduled cron drip to WordPress via REST API.</p>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-outline-variant/20 flex items-center justify-between">
              <span className="text-[12px] text-on-surface-variant">
                Works with self-hosted WordPress 5.8+, WooCommerce, and custom headless CMS
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
                Multi-Model BYOK &amp; Offline Ollama
              </h3>
              <p className="text-[13.5px] text-on-surface-variant leading-relaxed">
                Plug in your own API keys (OpenAI, Claude, Gemini, DeepSeek, Groq) or run private local models over Ollama. Track exact token usage and spend with live per-model meters at zero platform markup.
              </p>

              <div className="p-3 rounded-xl bg-surface-container dark:bg-[#1a1a34] border border-outline-variant/20 text-[11px] font-mono text-on-surface-variant">
                Live Token Meters • Zero Markup<br />
                Ollama: http://localhost:11434 (100% Offline)
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
