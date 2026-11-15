"use client";

import { useState } from "react";
import Link from "next/link";
import { PLAN_DEFINITIONS, UserPlan } from "@/lib/store-types";

export default function PricingSection() {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");

  const plans: Exclude<UserPlan, "Custom">[] = ["Free", "Basic", "Pro", "Enterprise"];

  return (
    <section id="pricing" className="py-20 md:py-28 font-body bg-surface-container-low/20 dark:bg-[#0a0a14]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-12 space-y-4">
          <span className="text-[12px] font-bold text-primary uppercase tracking-widest px-3 py-1 rounded-full bg-primary/10 border border-primary/20">
            Simple, Transparent Pricing
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-on-surface tracking-tight leading-tight">
            Plans Built for Every Stage of Writing.
          </h2>
          <p className="text-base sm:text-lg text-on-surface-variant leading-relaxed">
            From first-time indie authors to high-output media agencies. Bring your own AI key or use cloud models with zero lock-in.
          </p>

          {/* Monthly / Yearly Toggle */}
          <div className="pt-2 flex justify-center">
            <div className="inline-flex items-center p-1 rounded-full bg-surface-container dark:bg-[#1a1a2e] border border-outline-variant/40 shadow-xs">
              <button
                type="button"
                onClick={() => setBillingInterval("monthly")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all cursor-pointer ${
                  billingInterval === "monthly"
                    ? "bg-surface text-on-surface shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                Monthly Billing
              </button>
              <button
                type="button"
                onClick={() => setBillingInterval("yearly")}
                className={`px-4 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                  billingInterval === "yearly"
                    ? "bg-surface text-on-surface shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                <span>Annual Billing</span>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
                  Save 20%
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* 1-Click Demo Quick Notice */}
        <div className="max-w-4xl mx-auto mb-10 p-4 rounded-2xl bg-gradient-to-r from-primary/10 via-indigo-500/10 to-transparent border border-primary/25 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xs">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-primary text-white flex items-center justify-center shrink-0 shadow-sm">
              <span className="material-symbols-outlined text-[20px]">bolt</span>
            </span>
            <div>
              <h4 className="text-sm font-bold text-on-surface">
                Want to test every plan before signing up?
              </h4>
              <p className="text-xs text-on-surface-variant">
                Try our instant 1-click demo accounts for Free, Basic, Pro, Enterprise, and Admin modes with zero password typing.
              </p>
            </div>
          </div>
          <Link
            href="/login"
            className="btn btn-primary btn-sm shrink-0 flex items-center gap-1.5 shadow-sm"
          >
            <span>Launch 1-Click Demos</span>
            <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
          </Link>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 items-stretch">
          {plans.map((planId) => {
            const plan = PLAN_DEFINITIONS[planId];
            const price = billingInterval === "yearly" ? plan.priceYearly : plan.priceMonthly;
            const isPopular = plan.isPopular;

            return (
              <div
                key={planId}
                className={`relative rounded-2xl p-6 sm:p-7 border transition-all duration-200 flex flex-col justify-between ${
                  isPopular
                    ? "bg-surface-container-lowest dark:bg-[#141428] border-primary shadow-xl shadow-primary/10 ring-2 ring-primary/40 -translate-y-1"
                    : "bg-surface-container-lowest dark:bg-[#101020] border-outline-variant/30 hover:border-primary/40 shadow-sm hover:shadow-md"
                }`}
              >
                {isPopular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[10.5px] font-black tracking-wider uppercase bg-primary text-white shadow-md">
                    Most Popular
                  </div>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <h3 className="text-xl font-black text-on-surface tracking-tight">
                      {plan.name}
                    </h3>
                  </div>
                  <p className="text-xs text-on-surface-variant min-h-[34px] leading-relaxed">
                    {plan.description}
                  </p>

                  {/* Price Block */}
                  <div className="my-6 pt-2 pb-4 border-y border-outline-variant/20 flex items-baseline gap-1">
                    <span className="text-4xl font-black text-on-surface tracking-tight">
                      {price === 0 ? "Free" : `$${price}`}
                    </span>
                    {price > 0 && (
                      <span className="text-xs text-on-surface-variant font-medium">
                        /{billingInterval === "yearly" ? "year" : "month"}
                      </span>
                    )}
                  </div>

                  {/* Feature Checklist */}
                  <div className="space-y-2.5">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                      Included Capabilities
                    </p>
                    {plan.featureList.map((feat, idx) => (
                      <div key={idx} className="flex items-start gap-2.5 text-xs text-on-surface/90 leading-tight">
                        <span className="material-symbols-outlined text-emerald-500 text-[16px] shrink-0 mt-0.5">
                          check_circle
                        </span>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Button */}
                <div className="mt-8 pt-4 border-t border-outline-variant/20 space-y-2">
                  <Link
                    href={`/signup?plan=${planId.toLowerCase()}`}
                    className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                      isPopular
                        ? "btn-primary shadow-md shadow-primary/25"
                        : "btn-secondary border border-outline-variant/40"
                    }`}
                  >
                    <span>
                      {planId === "Free"
                        ? "Get Started Free"
                        : planId === "Enterprise"
                        ? "Contact Enterprise"
                        : `Get Started with ${plan.name}`}
                    </span>
                    <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                  </Link>
                  <Link
                    href={`/login`}
                    className="text-[11px] text-center block text-on-surface-variant hover:text-primary transition-colors font-medium"
                  >
                    Or try {plan.name} via 1-click demo &rarr;
                  </Link>
                </div>
              </div>
            );
          })}
        </div>

        {/* Trust & Guarantee strip */}
        <div className="mt-14 pt-8 border-t border-outline-variant/20 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-xs text-on-surface-variant font-medium">
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-emerald-500 text-[16px]">verified</span>
            No credit card required for Free tier
          </span>
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-emerald-500 text-[16px]">verified</span>
            100% intellectual property ownership
          </span>
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-emerald-500 text-[16px]">verified</span>
            BYO API key with zero platform lock-in
          </span>
          <span className="flex items-center gap-1.5">
            <span className="material-symbols-outlined text-emerald-500 text-[16px]">verified</span>
            Cancel or change plans anytime
          </span>
        </div>
      </div>
    </section>
  );
}
