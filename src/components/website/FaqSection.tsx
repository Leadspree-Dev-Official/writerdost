"use client";

import { useState } from "react";

export default function FaqSection() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  const faqs = [
    {
      q: "Who owns the copyright and intellectual property of the generated books and copy?",
      a: "You retain 100% ownership of everything created in Writerdost AI: all outlines, book chapters, rewritten manuscripts, sales copy, and exported files. You are free to publish on Amazon KDP, Apple Books, sell them, or syndicate them to your WordPress site with zero royalty obligations to Writerdost or LeadSpree.",
    },
    {
      q: "How does Writerdost maintain narrative continuity across 300,000 words?",
      a: "Standard chatbots fail because they treat every chapter as an isolated prompt, forgetting characters and contradicting prior chapters. Writerdost deploys a 4-agent swarm coupled with our BookMemoryBank state engine. BookMemoryBank tracks character profiles, timeline lore, core arguments, and terminology across all chapter boundaries, scaling seamlessly from a 12,000-word tactical guide to a 300,000-word omnibus.",
    },
    {
      q: "What makes the Copywriting Studio different from standard ChatGPT prompts?",
      a: "Rather than regurgitating generic sales copy full of AI clichés, the Copywriting Studio uses proven direct-response frameworks. It calibrates copy to Eugene Schwartz's 5 Stages of Awareness (Unaware through Most-Aware), adheres strictly to Google RSA character limits (<= 30 char headlines, <= 90 char descriptions) for high Quality Scores, complies with Meta ad policies, and runs an automated Anti-AI cliché filter that removes overused buzzwords like 'delve' and 'tapestry'.",
    },
    {
      q: "How does Bring Your Own Skills (BYOS) work and is it secure?",
      a: "The BYOS engine allows authors and agencies to import custom or community `.md` and YAML skills (compatible with Claude Code, Cursor, and standard agent skills). Our zero-dependency parser extracts domain rubrics while our security sanitizer programmatically strips all executable bash commands, curl strings, and terminal scripts—ensuring zero arbitrary code execution in your browser or workspace.",
    },
    {
      q: "How does the official writerdost-connect WordPress plugin work?",
      a: "We provide an official, lightweight WordPress plugin called 'writerdost-connect'. Once uploaded to your WordPress site, it securely interfaces with the standard WordPress REST API using Application Passwords. You can queue automated blog schedules, and Writerdost automatically generates articles, attaches tags/categories, sets featured images, and publishes on your chosen cron schedule.",
    },
    {
      q: "How does Writerdost optimize articles for Google AI Overviews, ChatGPT Search, and Perplexity (GEO)?",
      a: "Modern search engines don't just index keywords; LLM search engines (Google AI Overviews, ChatGPT Search, Perplexity) extract direct, authoritative answers. Writerdost's SEO engine formats articles with definition-first lead sentences, 40–80 word direct answer capsules, and automated FAQPage JSON-LD schema. When published to your WordPress site, each post is structurally primed for both traditional SERP rankings and generative AI citations.",
    },
    {
      q: "Can I bring my own API keys or use local Ollama with zero token markup?",
      a: "Yes. You can connect your personal API keys for OpenAI, Anthropic Claude, Google Gemini, DeepSeek, Groq, or Mistral with zero token markup. You can also connect to local Ollama on localhost:11434 for 100% private, offline generation where your prompts never leave your local machine. All personal keys are encrypted at rest.",
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
    <section id="faq" className="scroll-mt-20 py-20 md:py-28 font-body">
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
                  id={`faq-btn-${index}`}
                  aria-expanded={isOpen}
                  aria-controls={`faq-panel-${index}`}
                  onClick={() => setOpenIndex(isOpen ? null : index)}
                  className="w-full text-left p-5 sm:p-6 flex items-center justify-between gap-4 cursor-pointer focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-2"
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
                  <div
                    id={`faq-panel-${index}`}
                    role="region"
                    aria-labelledby={`faq-btn-${index}`}
                    className="px-5 pb-6 sm:px-6 sm:pb-6 pt-1 text-[13.5px] sm:text-[14px] text-on-surface-variant leading-relaxed border-t border-outline-variant/15 font-normal"
                  >
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
