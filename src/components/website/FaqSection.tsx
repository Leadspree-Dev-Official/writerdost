"use client";

import { useState } from "react";
import Link from "next/link";

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "Who owns the copyright and intellectual property of the generated books?",
      a: "You retain 100% ownership of everything created in Writerdost AI: all outlines, chapters, rewritten manuscripts, and exported files. You are free to publish on Amazon KDP, Apple Books, sell them, or syndicate them to your WordPress site with zero royalty obligations to Writerdost or LeadSpree.",
    },
    {
      q: "How does the multi-agent swarm maintain narrative continuity over 30,000+ words?",
      a: "Standard chatbots fail because they treat every chapter as an isolated prompt. Writerdost deploys a 4-agent swarm: the Research Agent builds a global domain graph, the Architect Agent creates a master structural beat sheet, parallel Chapter Writers draft concurrently against shared continuity memory, and the Critic Agent harmonizes voice and rhythm across all seams.",
    },
    {
      q: "How does the official writerdost-connect WordPress plugin work?",
      a: "We provide an official, lightweight WordPress plugin called 'writerdost-connect'. Once uploaded to your WordPress site, it securely interfaces with the standard WordPress REST API using Application Passwords. You can queue automated blog schedules, and Writerdost automatically generates articles, attaches tags/categories, sets featured images, and publishes on your chosen cron schedule.",
    },
    {
      q: "Can I bring my own API keys or run 100% offline with local Ollama?",
      a: "Yes. Writerdost has zero vendor lock-in. You can enter your personal API keys for Anthropic Claude 3.5, OpenAI GPT-4o, Google Gemini, DeepSeek, or OpenRouter. If you require absolute privacy, you can connect directly to a local Ollama instance (e.g. running Llama 3.1 or DeepSeek R1 on localhost:11434) with zero cloud transmission.",
    },
    {
      q: "What export formats are supported for publishing?",
      a: "With one click, you can export your manuscript as a validated EPUB 3.0 file (ready for direct upload to Amazon Kindle Direct Publishing and Apple Books), a styled Microsoft Word DOCX document, a print-ready PDF, or clean GitHub-flavored Markdown.",
    },
    {
      q: "Can I rewrite existing manuscripts or rough book drafts?",
      a: "Absolutely. The Manuscript Rewrite Studio accepts PDF, DOCX, and TXT files. You can select specific tone presets—such as Bestseller, Conversational, Provocative, or Academic—to revamp sentence rhythm, remove passive voice, deepen sensory exposition, and eliminate robotic phrasing.",
    },
  ];

  return (
    <section id="faq" className="py-20 md:py-28 font-body">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center space-y-4 mb-14">
          <span className="text-[12px] font-bold text-primary uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            Got Questions?
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-on-surface tracking-tight leading-tight">
            Frequently Asked Questions
          </h2>
          <p className="text-base text-on-surface-variant leading-relaxed">
            Everything you need to know about autonomous book generation, WordPress automation, and copyright.
          </p>
        </div>

        {/* Accordion */}
        <div className="space-y-3">
          {faqs.map((faq, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={faq.q}
                className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest dark:bg-[#121224] transition-all overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="text-[15px] sm:text-base font-bold text-on-surface">
                    {faq.q}
                  </span>
                  <span
                    className={`material-symbols-outlined text-primary text-[22px] transition-transform duration-200 shrink-0 ${
                      isOpen ? "rotate-180" : ""
                    }`}
                  >
                    keyboard_arrow_down
                  </span>
                </button>

                {isOpen && (
                  <div className="px-5 pb-6 sm:px-6 sm:pb-6 pt-1 text-[13.5px] sm:text-[14px] text-on-surface-variant leading-relaxed border-t border-outline-variant/15 font-normal">
                    {faq.a}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Support Note */}
        <div className="mt-10 text-center text-[13px] text-on-surface-variant">
          Have another question? Reach out directly to our team at{" "}
          <a
            href="mailto:contact@leadspree.in"
            className="text-primary font-bold hover:underline"
          >
            contact@leadspree.in
          </a>
        </div>
      </div>
    </section>
  );
}
