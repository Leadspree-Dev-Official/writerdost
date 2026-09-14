"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/app-store";

export default function WebsiteNavbar() {
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [showBanner, setShowBanner] = useState(true);

  const currentUser = useAppStore((state) => state.currentUser);
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const toggleDarkMode = useAppStore((state) => state.toggleDarkMode);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const navLinks = [
    { label: "Features", href: "#features" },
    { label: "Agent Swarm", href: "#agents" },
    { label: "How It Works", href: "#how-it-works" },
    { label: "WordPress Sync", href: "#wordpress" },
    { label: "Pricing", href: "#pricing" },
    { label: "FAQ", href: "#faq" },
  ];

  return (
    <header className="sticky top-0 z-50 w-full font-body transition-all duration-300">
      {/* Top micro-announcement banner */}
      {showBanner && (
        <div className="relative bg-gradient-to-r from-primary-container via-indigo-600 to-purple-700 text-white text-[12px] py-1.5 px-4 text-center font-medium tracking-wide flex items-center justify-center gap-2">
          <span className="inline-flex items-center gap-1 bg-white/20 backdrop-blur-xs px-2 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider">
            New
          </span>
          <span>
            Writerdost Autonomous Agent Swarm 2.0 with WordPress Automated Sync is live!
          </span>
          <a
            href="#agents"
            className="underline underline-offset-2 font-semibold hover:opacity-90 ml-1 hidden sm:inline"
          >
            See how it works &rarr;
          </a>
          <button
            type="button"
            onClick={() => setShowBanner(false)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/70 hover:text-white transition-colors"
            aria-label="Dismiss banner"
          >
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>
      )}

      {/* Main Glassmorphic Navigation Bar */}
      <nav
        className={`w-full transition-all duration-300 ${
          scrolled
            ? "bg-surface/85 dark:bg-[#0c0c14]/90 backdrop-blur-md shadow-sm border-b border-outline-variant/30"
            : "bg-surface/60 dark:bg-[#0c0c14]/60 backdrop-blur-xs border-b border-outline-variant/15"
        }`}
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          {/* Brand Logo */}
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center text-white shadow-md shadow-primary/25 group-hover:scale-105 transition-transform duration-200">
              <span
                className="material-symbols-outlined text-[20px]"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                auto_stories
              </span>
            </div>
            <div className="flex flex-col">
              <span className="text-[17px] font-black tracking-tight text-on-surface flex items-center gap-1.5">
                Writerdost
                <span className="text-[11px] font-bold px-1.5 py-0.2 rounded-md bg-primary/10 text-primary uppercase tracking-wider">
                  AI
                </span>
              </span>
              <span className="text-[10px] font-medium text-on-surface-variant/80 tracking-wide -mt-0.5">
                Autonomous Writing Studio
              </span>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <div className="hidden md:flex items-center gap-1 lg:gap-2">
            {navLinks.map((link) => (
              <a
                key={link.label}
                href={link.href}
                className="px-3 py-1.5 rounded-lg text-[13px] font-medium text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
              >
                {link.label}
              </a>
            ))}
          </div>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2.5">
            {/* Dark / Light Mode Toggle */}
            <button
              type="button"
              onClick={toggleDarkMode}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-on-surface-variant hover:text-on-surface hover:bg-surface-container transition-colors"
              aria-label="Toggle theme"
              title={isDarkMode ? "Switch to light mode" : "Switch to dark mode"}
            >
              <span className="material-symbols-outlined text-[19px]">
                {isDarkMode ? "light_mode" : "dark_mode"}
              </span>
            </button>

            {currentUser ? (
              <Link
                href="/dashboard"
                className="btn btn-primary btn-sm flex items-center gap-2 shadow-sm shadow-primary/20"
              >
                <span className="w-5 h-5 rounded-full bg-white/20 text-white flex items-center justify-center text-[10px] font-bold uppercase">
                  {currentUser.fullName?.[0] || "U"}
                </span>
                <span>Open Workspace</span>
                <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="hidden sm:inline-flex px-3.5 py-1.5 text-[13px] font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container rounded-lg transition-colors"
                >
                  Sign In
                </Link>
                <Link
                  href="/signup"
                  className="btn btn-primary btn-sm flex items-center gap-1.5 shadow-md shadow-primary/25"
                >
                  <span>Start Free</span>
                  <span className="material-symbols-outlined text-[15px]">auto_awesome</span>
                </Link>
              </>
            )}

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden w-9 h-9 rounded-lg flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors ml-1"
              aria-label="Toggle navigation menu"
            >
              <span className="material-symbols-outlined text-[22px]">
                {mobileMenuOpen ? "close" : "menu"}
              </span>
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-surface dark:bg-[#0c0c14] border-b border-outline-variant/30 px-4 pt-2 pb-6 space-y-2">
            <div className="flex flex-col space-y-1">
              {navLinks.map((link) => (
                <a
                  key={link.label}
                  href={link.href}
                  onClick={() => setMobileMenuOpen(false)}
                  className="px-3 py-2 text-[14px] font-medium text-on-surface rounded-lg hover:bg-surface-container transition-colors"
                >
                  {link.label}
                </a>
              ))}
            </div>

            <div className="pt-3 border-t border-outline-variant/30 flex flex-col gap-2">
              {currentUser ? (
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="btn btn-primary w-full justify-center"
                >
                  Go to Workspace
                </Link>
              ) : (
                <>
                  <Link
                    href="/login"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn btn-secondary w-full justify-center"
                  >
                    Sign In
                  </Link>
                  <Link
                    href="/signup"
                    onClick={() => setMobileMenuOpen(false)}
                    className="btn btn-primary w-full justify-center"
                  >
                    Get Started Free
                  </Link>
                </>
              )}
            </div>
          </div>
        )}
      </nav>
    </header>
  );
}
