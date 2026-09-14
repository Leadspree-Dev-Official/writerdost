"use client";

import Link from "next/link";

export default function WebsiteFooter() {
  return (
    <footer className="border-t border-outline-variant/30 bg-surface-container-low/50 dark:bg-[#0a0a14] font-body text-on-surface-variant pt-16 pb-12 transition-colors">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-10 pb-12 border-b border-outline-variant/20">
          {/* Brand Column (spans 2 on lg) */}
          <div className="lg:col-span-2 space-y-4">
            <Link href="/" className="flex items-center gap-2.5 group">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center text-white shadow-md shadow-primary/20">
                <span
                  className="material-symbols-outlined text-[20px]"
                  style={{ fontVariationSettings: "'FILL' 1" }}
                >
                  auto_stories
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-[18px] font-black tracking-tight text-on-surface flex items-center gap-1.5">
                  Writerdost
                  <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-md bg-primary/10 text-primary uppercase tracking-wider">
                    AI
                  </span>
                </span>
                <span className="text-[11px] font-medium text-on-surface-variant/80 tracking-wide -mt-0.5">
                  Autonomous Writing &amp; Publishing Studio
                </span>
              </div>
            </Link>

            <p className="text-[13px] text-on-surface-variant leading-relaxed max-w-sm">
              Empowering authors, digital publishers, and marketing teams to produce cohesive 30,000+ word manuscripts and automated scheduled WordPress campaigns using collaborative multi-agent AI.
            </p>

            {/* Operational Status Pill */}
            <div className="pt-2 flex items-center gap-2 text-[11.5px] font-semibold text-emerald-600 dark:text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>All Systems Operational • Swarm v2.2 Online</span>
            </div>
          </div>

          {/* Column 2: Product */}
          <div className="space-y-3">
            <h4 className="text-[12px] font-bold uppercase tracking-wider text-on-surface">
              Product Suite
            </h4>
            <ul className="space-y-2 text-[13px]">
              <li>
                <Link href="/create" className="hover:text-on-surface transition-colors">
                  Autonomous Ebook Swarm
                </Link>
              </li>
              <li>
                <Link href="/editor" className="hover:text-on-surface transition-colors">
                  Focused Canvas Editor
                </Link>
              </li>
              <li>
                <Link href="/rewrite" className="hover:text-on-surface transition-colors">
                  Manuscript Rewrite Studio
                </Link>
              </li>
              <li>
                <Link href="/blog-generator" className="hover:text-on-surface transition-colors">
                  SEO Blog Generator
                </Link>
              </li>
              <li>
                <Link href="/automations" className="hover:text-on-surface transition-colors">
                  WordPress Automations (BlogGen)
                </Link>
              </li>
              <li>
                <Link href="/settings" className="hover:text-on-surface transition-colors">
                  BYO-Model &amp; Ollama AI
                </Link>
              </li>
            </ul>
          </div>

          {/* Column 3: Workflows */}
          <div className="space-y-3">
            <h4 className="text-[12px] font-bold uppercase tracking-wider text-on-surface">
              Workflows
            </h4>
            <ul className="space-y-2 text-[13px]">
              <li>
                <a href="#agents" className="hover:text-on-surface transition-colors">
                  Agent Swarm Architecture
                </a>
              </li>
              <li>
                <a href="#wordpress" className="hover:text-on-surface transition-colors">
                  WordPress Connect Plugin
                </a>
              </li>
              <li>
                <a href="#features" className="hover:text-on-surface transition-colors">
                  Kindle EPUB Export
                </a>
              </li>
              <li>
                <a href="#how-it-works" className="hover:text-on-surface transition-colors">
                  Multi-Source Ingestion
                </a>
              </li>
              <li>
                <a href="#pricing" className="hover:text-on-surface transition-colors">
                  Pricing &amp; Plans
                </a>
              </li>
            </ul>
          </div>

          {/* Column 4: Company & Support */}
          <div className="space-y-3">
            <h4 className="text-[12px] font-bold uppercase tracking-wider text-on-surface">
              Company
            </h4>
            <ul className="space-y-2 text-[13px]">
              <li>
                <Link href="/help" className="hover:text-on-surface transition-colors">
                  Help Center &amp; Guides
                </Link>
              </li>
              <li>
                <a
                  href="https://leadspree.in"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-on-surface transition-colors"
                >
                  LeadSpree Business Solutions
                </a>
              </li>
              <li>
                <a
                  href="mailto:contact@leadspree.in"
                  className="hover:text-on-surface transition-colors"
                >
                  Contact Support
                </a>
              </li>
              <li>
                <Link href="/login" className="hover:text-on-surface transition-colors">
                  User Workspace Sign In
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom Bar */}
        <div className="pt-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-[12px]">
          <p>© {new Date().getFullYear()} Writerdost AI. All rights reserved.</p>

          <p className="font-semibold">
            Developed by{" "}
            <a
              href="https://leadspree.in"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary dark:text-indigo-400 font-bold hover:underline transition-colors"
            >
              LeadSpree Business Solutions
            </a>
          </p>
        </div>
      </div>
    </footer>
  );
}
