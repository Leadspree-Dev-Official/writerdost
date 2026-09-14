"use client";

import Link from "next/link";

export default function ComparisonMatrix() {
  const features = [
    {
      name: "Coherent Long-Form Length",
      writerdost: "30,000+ words (unbroken arc)",
      chatgpt: "Degrades after 2,500 words",
      agency: "Full length (30k-60k words)",
    },
    {
      name: "Parallel Agent Swarm",
      writerdost: "Yes (4 specialized agents in sync)",
      chatgpt: "No (single prompt bottleneck)",
      agency: "No (sequential manual labor)",
    },
    {
      name: "Multimodal Research Ingestion",
      writerdost: "Web URLs, PDFs, DOCX, YouTube audio",
      chatgpt: "Clunky manual copy-paste",
      agency: "Manual interviews & reading",
    },
    {
      name: "Native WordPress Scheduled Publishing",
      writerdost: "Official writerdost-connect plugin",
      chatgpt: "None (manual copy-paste)",
      agency: "Additional CMS retainer fee",
    },
    {
      name: "Validated Kindle EPUB & DOCX",
      writerdost: "1-Click automated layout engine",
      chatgpt: "Raw markdown output only",
      agency: "Separate book designer fee ($500+)",
    },
    {
      name: "Voice & Tone Preservation",
      writerdost: "Granular presets & continuity critic",
      chatgpt: "Generic AI tropes & drift",
      agency: "Dependent on assigned writer",
    },
    {
      name: "Offline & BYO-Model Privacy",
      writerdost: "Ollama offline, zero server storage",
      chatgpt: "Vendor-locked cloud model",
      agency: "Subject to NDA paperwork",
    },
    {
      name: "Turnaround Time",
      writerdost: "3 to 5 minutes",
      chatgpt: "10-20 hours of manual reprompting",
      agency: "3 to 6 months",
    },
    {
      name: "Typical Cost per Book",
      writerdost: "$0 - $29 / month",
      chatgpt: "$20/mo (plus endless hours)",
      agency: "$5,000 - $25,000+ per manuscript",
    },
  ];

  return (
    <section className="py-20 md:py-28 bg-surface-container-low/30 dark:bg-[#0c0c16] font-body">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center max-w-3xl mx-auto mb-16 space-y-4">
          <span className="text-[12px] font-bold text-primary uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            Unrivaled Value
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-on-surface tracking-tight leading-tight">
            Why Authors Choose Writerdost AI Over Generic Chatbots &amp; Ghostwriters.
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed">
            See how purpose-built multi-agent architecture outperforms general-purpose chat boxes and sluggish traditional agencies.
          </p>
        </div>

        {/* Comparison Table Card */}
        <div className="rounded-2xl border border-outline-variant/30 bg-surface-container-lowest dark:bg-[#121224] shadow-lg overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[650px]">
            <thead>
              <tr className="border-b border-outline-variant/30 bg-surface-container dark:bg-[#18182f]">
                <th className="p-4 sm:p-5 text-[13px] font-bold text-on-surface-variant uppercase tracking-wider w-1/4">
                  Feature / Capability
                </th>
                <th className="p-4 sm:p-5 text-[14px] font-black text-primary bg-primary/10 w-1/3 border-x border-primary/25">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-[20px]">auto_stories</span>
                    <span>Writerdost AI Swarm</span>
                  </div>
                </th>
                <th className="p-4 sm:p-5 text-[13px] font-bold text-on-surface-variant w-1/5">
                  Generic AI (ChatGPT / Claude)
                </th>
                <th className="p-4 sm:p-5 text-[13px] font-bold text-on-surface-variant w-1/5">
                  Ghostwriting Agency
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 text-[13px]">
              {features.map((row, idx) => (
                <tr
                  key={row.name}
                  className={idx % 2 === 0 ? "bg-transparent" : "bg-surface-container-low/20 dark:bg-[#141426]/30"}
                >
                  <td className="p-4 sm:p-5 font-bold text-on-surface">
                    {row.name}
                  </td>
                  <td className="p-4 sm:p-5 font-semibold text-on-surface bg-primary/5 border-x border-primary/20">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[17px] text-emerald-500 shrink-0">
                        check_circle
                      </span>
                      <span>{row.writerdost}</span>
                    </div>
                  </td>
                  <td className="p-4 sm:p-5 text-on-surface-variant">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[17px] text-rose-500/80 shrink-0">
                        cancel
                      </span>
                      <span>{row.chatgpt}</span>
                    </div>
                  </td>
                  <td className="p-4 sm:p-5 text-on-surface-variant">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-[17px] text-amber-500/80 shrink-0">
                        remove_circle
                      </span>
                      <span>{row.agency}</span>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Bottom CTA */}
        <div className="mt-10 p-6 rounded-2xl bg-gradient-to-r from-primary/10 via-purple-600/10 to-transparent border border-primary/30 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-on-surface">
              Ready to write at 10x speed with 100x lower cost?
            </h3>
            <p className="text-[13px] text-on-surface-variant">
              Generate full books without paying thousands to agencies or fighting context limits.
            </p>
          </div>
          <Link href="/signup" className="btn btn-primary btn-md shrink-0 shadow-md">
            Start Free Today
          </Link>
        </div>
      </div>
    </section>
  );
}
