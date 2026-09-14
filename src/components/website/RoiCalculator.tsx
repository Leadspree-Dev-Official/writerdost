"use client";

import { useState } from "react";
import Link from "next/link";

export default function RoiCalculator() {
  const [targetWords, setTargetWords] = useState<number>(25000);
  const [booksPerYear, setBooksPerYear] = useState<number>(4);

  // Math models:
  // Average human author / ghostwriter: ~250 words/hour of finished copy.
  // Average ghostwriting fee: $0.12 - $0.20 per word.
  // Writerdost generation time: ~3.5 minutes per 25,000 words.
  const hoursSavedPerBook = Math.round(targetWords / 250);
  const totalHoursSaved = hoursSavedPerBook * booksPerYear;
  const ghostwritingCostSaved = Math.round(targetWords * 0.15 * booksPerYear);
  const generationMinutes = Math.max(2, Math.round((targetWords / 25000) * 3.5 * 10) / 10);

  return (
    <section className="py-20 md:py-28 bg-surface-container-low/40 dark:bg-[#0e0e1a] font-body">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto rounded-3xl border border-outline-variant/30 bg-surface-container-lowest dark:bg-[#131326] shadow-xl p-6 sm:p-10">
          <div className="text-center space-y-3 mb-10">
            <span className="text-[12px] font-bold text-primary uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
              Interactive ROI Calculator
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
              Calculate Your Time &amp; Cost Savings
            </h2>
            <p className="text-[14px] text-on-surface-variant max-w-xl mx-auto">
              Adjust your target manuscript size and publishing frequency to see how much Writerdost AI saves your business.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            {/* Left Column: Sliders */}
            <div className="space-y-6">
              {/* Slider 1: Target Words */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[13px]">
                  <span className="font-bold text-on-surface">Target Book Word Count</span>
                  <span className="font-mono font-bold text-primary text-base">
                    {targetWords.toLocaleString()} words
                  </span>
                </div>
                <input
                  type="range"
                  min={5000}
                  max={60000}
                  step={2500}
                  value={targetWords}
                  onChange={(e) => setTargetWords(Number(e.target.value))}
                  className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[11px] text-on-surface-variant font-medium">
                  <span>5k (Short Guide)</span>
                  <span>25k (Standard Book)</span>
                  <span>60k (Comprehensive)</span>
                </div>
              </div>

              {/* Slider 2: Publications Per Year */}
              <div className="space-y-2">
                <div className="flex justify-between items-center text-[13px]">
                  <span className="font-bold text-on-surface">Books / Manuscripts per Year</span>
                  <span className="font-mono font-bold text-primary text-base">
                    {booksPerYear} {booksPerYear === 1 ? "book" : "books"}
                  </span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={24}
                  step={1}
                  value={booksPerYear}
                  onChange={(e) => setBooksPerYear(Number(e.target.value))}
                  className="w-full h-2 bg-surface-container rounded-lg appearance-none cursor-pointer accent-primary"
                />
                <div className="flex justify-between text-[11px] text-on-surface-variant font-medium">
                  <span>1 book/yr</span>
                  <span>6 books/yr</span>
                  <span>24 books/yr</span>
                </div>
              </div>

              <p className="text-[11.5px] text-on-surface-variant/80 italic">
                * Based on industry benchmarks of 250 edited words/hour and typical ghostwriter rates of $0.15/word.
              </p>
            </div>

            {/* Right Column: Computed Savings Results */}
            <div className="p-6 rounded-2xl bg-gradient-to-br from-primary/10 via-surface-container to-purple-500/10 dark:bg-[#181832] border border-primary/25 space-y-5">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                  Ghostwriting Budget Saved
                </span>
                <p className="text-3xl sm:text-4xl font-black text-primary tracking-tight mt-0.5">
                  ${ghostwritingCostSaved.toLocaleString()}
                </p>
                <span className="text-[11.5px] text-on-surface-variant">
                  vs hiring traditional ghostwriters
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4 pt-3 border-t border-outline-variant/20">
                <div>
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-on-surface-variant">
                    Hours Saved
                  </span>
                  <p className="text-2xl font-bold text-on-surface tracking-tight mt-0.5">
                    {totalHoursSaved.toLocaleString()} hrs
                  </p>
                  <span className="text-[10.5px] text-on-surface-variant">
                    {Math.round(totalHoursSaved / 8)} full working days
                  </span>
                </div>

                <div>
                  <span className="text-[10.5px] font-bold uppercase tracking-wider text-on-surface-variant">
                    Writerdost Speed
                  </span>
                  <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight mt-0.5">
                    ~{generationMinutes} mins
                  </p>
                  <span className="text-[10.5px] text-on-surface-variant">
                    per complete manuscript
                  </span>
                </div>
              </div>

              <Link
                href="/signup"
                className="btn btn-primary w-full justify-center shadow-md shadow-primary/20 text-[13px] font-bold"
              >
                Claim Your Productivity Boost
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
