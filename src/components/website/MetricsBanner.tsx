"use client";

import React from "react";

interface MetricItem {
  value: string;
  label: string;
  subtext: string;
  icon: string;
  gradient: string;
}

const METRICS: MetricItem[] = [
  {
    value: "4.5x",
    label: "Faster Time-to-Market",
    subtext: "From raw outline to full manuscript",
    icon: "speed",
    gradient: "from-blue-500/20 to-indigo-500/20 text-blue-600 dark:text-blue-400",
  },
  {
    value: "90%",
    label: "Cost Reduction",
    subtext: "Compared to $3,000+ ghostwriters",
    icon: "savings",
    gradient: "from-emerald-500/20 to-teal-500/20 text-emerald-600 dark:text-emerald-400",
  },
  {
    value: "200,000+",
    label: "Words per Manuscript",
    subtext: "Continuous multi-chapter omnibus depth",
    icon: "menu_book",
    gradient: "from-purple-500/20 to-violet-500/20 text-purple-600 dark:text-purple-400",
  },
  {
    value: "100%",
    label: "Retained Copyright",
    subtext: "Zero royalty claims, full commercial rights",
    icon: "verified_user",
    gradient: "from-amber-500/20 to-orange-500/20 text-amber-600 dark:text-amber-400",
  },
];

export default function MetricsBanner() {
  return (
    <section className="py-8 font-body">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="rounded-3xl border border-outline-variant/30 bg-surface-container-low/40 dark:bg-[#111124] p-6 sm:p-8 shadow-sm">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 sm:gap-8 divide-y md:divide-y-0 md:divide-x divide-outline-variant/20">
            {METRICS.map((item, idx) => (
              <div
                key={item.label}
                className={`flex flex-col items-center sm:items-start text-center sm:text-left ${
                  idx > 0 ? "pt-6 sm:pt-0 sm:pl-6 md:pl-8" : ""
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div
                    className={`w-8 h-8 rounded-lg bg-gradient-to-br ${item.gradient} flex items-center justify-center`}
                  >
                    <span className="material-symbols-outlined text-[18px]">{item.icon}</span>
                  </div>
                  <span className="text-[12px] font-bold text-on-surface-variant uppercase tracking-wider">
                    {item.label}
                  </span>
                </div>
                <p className="text-3xl sm:text-4xl lg:text-5xl font-black text-on-surface tracking-tight">
                  {item.value}
                </p>
                <p className="text-[12.5px] text-on-surface-variant/80 mt-1.5 leading-snug">
                  {item.subtext}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
