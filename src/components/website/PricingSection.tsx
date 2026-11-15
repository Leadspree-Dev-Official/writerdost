"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DEFAULT_FOUNDER_CAMPAIGN, FounderCampaignConfig, PLAN_DEFINITIONS, UserPlan } from "@/lib/store-types";

export default function PricingSection() {
  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [campaign, setCampaign] = useState<FounderCampaignConfig>(DEFAULT_FOUNDER_CAMPAIGN);
  const [selectedFounderTier, setSelectedFounderTier] = useState<"basic" | "pro">("basic");
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 30,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  const plans: Exclude<UserPlan, "Custom">[] = ["Free", "Basic", "Pro", "Enterprise"];

  // Fetch live campaign settings
  useEffect(() => {
    let mounted = true;
    fetch("/api/founder-campaign")
      .then((res) => res.json())
      .then((data) => {
        if (mounted && data?.config) {
          setCampaign(data.config);
        }
      })
      .catch(() => {});
    return () => {
      mounted = false;
    };
  }, []);

  // Rolling countdown timer
  useEffect(() => {
    if (!campaign.isEnabled) return;

    const calculateTimeLeft = () => {
      const cycleMs = (campaign.durationDays || 30) * 24 * 60 * 60 * 1000;
      const startTime = new Date(campaign.cycleStartedAt).getTime();
      const now = Date.now();
      let elapsed = now - startTime;

      if (elapsed > cycleMs && campaign.autoRenew) {
        elapsed = elapsed % cycleMs;
      }

      const diff = Math.max(0, cycleMs - elapsed);
      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      return { days, hours, minutes, seconds };
    };

    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);

    return () => clearInterval(interval);
  }, [campaign]);

  const remainingSlots = selectedFounderTier === "basic"
    ? Math.max(0, campaign.basicTotalSlots - campaign.basicClaimedSlots)
    : Math.max(0, campaign.proTotalSlots - campaign.proClaimedSlots);

  const activePrice = selectedFounderTier === "basic" ? campaign.basicPrice : campaign.proPrice;
  const activeSavings = selectedFounderTier === "basic" ? "$146 vs Annual" : "$646 vs Annual";

  return (
    <section id="pricing" className="py-20 md:py-28 font-body bg-surface-container-low/20 dark:bg-[#0a0a14]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        
        {/* 1. Normal Section Header */}
        <div className="text-center max-w-3xl mx-auto mb-10 space-y-4">
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

        {/* 2. Normal Pricing Cards Grid (FIRST) */}
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

        {/* 3. 🌟 SPECIAL LIMITED-TIME FOUNDER OFFER (AFTER NORMAL PRICING) 🌟 */}
        {campaign.isEnabled && (
          <div className="mt-20 rounded-3xl p-6 sm:p-10 bg-gradient-to-br from-amber-500/10 via-purple-600/10 to-primary/10 border-2 border-amber-500/30 dark:border-amber-400/25 shadow-xl relative overflow-hidden">
            {/* Background glowing flair */}
            <div className="absolute -right-20 -top-20 w-80 h-80 bg-amber-400/10 rounded-full blur-3xl pointer-events-none" />
            <div className="absolute -left-20 -bottom-20 w-80 h-80 bg-purple-500/10 rounded-full blur-3xl pointer-events-none" />

            <div className="relative z-10">
              {/* Header with Badges & Rolling Timer */}
              <div className="flex flex-col lg:flex-row items-center justify-between gap-6 pb-8 border-b border-outline-variant/30">
                <div className="text-center lg:text-left space-y-2">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500 text-amber-950 font-black text-[11px] tracking-wider uppercase shadow-sm">
                    <span className="material-symbols-outlined text-[16px]">stars</span>
                    Special Early Backer Offer
                  </div>
                  <h3 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
                    Founder 5-Year Access Pass
                  </h3>
                  <p className="text-sm text-on-surface-variant max-w-xl">
                    Pay once, write for 5 full years. Zero recurring monthly fees, locked-in generation quotas, and commercial rights.
                  </p>
                </div>

                {/* Rolling 30-Day Scarcity Countdown Counter */}
                <div className="flex flex-col items-center sm:items-end gap-2 bg-surface/90 dark:bg-[#121224]/90 p-4 rounded-2xl border border-amber-500/30 shadow-md">
                  <div className="flex items-center gap-2 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                    <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>Limited Batch Closes In:</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex flex-col items-center px-3 py-1.5 bg-surface-container rounded-xl border border-outline-variant/30 min-w-[52px]">
                      <span className="text-xl sm:text-2xl font-black text-on-surface font-mono">{timeLeft.days}</span>
                      <span className="text-[10px] text-on-surface-variant font-bold uppercase">Days</span>
                    </div>
                    <span className="text-lg font-bold text-on-surface-variant">:</span>
                    <div className="flex flex-col items-center px-3 py-1.5 bg-surface-container rounded-xl border border-outline-variant/30 min-w-[52px]">
                      <span className="text-xl sm:text-2xl font-black text-on-surface font-mono">
                        {String(timeLeft.hours).padStart(2, "0")}
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-bold uppercase">Hours</span>
                    </div>
                    <span className="text-lg font-bold text-on-surface-variant">:</span>
                    <div className="flex flex-col items-center px-3 py-1.5 bg-surface-container rounded-xl border border-outline-variant/30 min-w-[52px]">
                      <span className="text-xl sm:text-2xl font-black text-on-surface font-mono">
                        {String(timeLeft.minutes).padStart(2, "0")}
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-bold uppercase">Mins</span>
                    </div>
                    <span className="text-lg font-bold text-on-surface-variant">:</span>
                    <div className="flex flex-col items-center px-3 py-1.5 bg-surface-container rounded-xl border border-outline-variant/30 min-w-[52px]">
                      <span className="text-xl sm:text-2xl font-black text-amber-500 font-mono">
                        {String(timeLeft.seconds).padStart(2, "0")}
                      </span>
                      <span className="text-[10px] text-on-surface-variant font-bold uppercase">Secs</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Single Founder Pass Hero Card */}
              <div className="mt-8 max-w-4xl mx-auto rounded-2xl bg-surface dark:bg-[#141428] border-2 border-amber-500/40 p-6 sm:p-10 shadow-2xl relative overflow-hidden">
                <div className="flex flex-col md:flex-row items-stretch justify-between gap-8">
                  
                  {/* Left Column: Offer Details & Tier Switcher */}
                  <div className="flex-1 space-y-5">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30">
                        Exclusive Founder Deal
                      </span>
                      <span className="text-xs font-semibold text-rose-500 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[15px]">local_fire_department</span>
                        Only {remainingSlots} spots remaining in this batch
                      </span>
                    </div>

                    <h4 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
                      {selectedFounderTier === "basic" ? "Founder Basic Pass" : "Founder Pro Pass"}
                    </h4>

                    {/* Tier Switcher inside the card */}
                    <div className="inline-flex p-1 rounded-xl bg-surface-container dark:bg-[#1f1f3a] border border-outline-variant/30">
                      <button
                        type="button"
                        onClick={() => setSelectedFounderTier("basic")}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          selectedFounderTier === "basic"
                            ? "bg-amber-500 text-amber-950 shadow-sm"
                            : "text-on-surface-variant hover:text-on-surface"
                        }`}
                      >
                        Basic Tier (${campaign.basicPrice})
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedFounderTier("pro")}
                        className={`px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          selectedFounderTier === "pro"
                            ? "bg-primary text-white shadow-sm"
                            : "text-on-surface-variant hover:text-on-surface"
                        }`}
                      >
                        Pro Writer Tier (${campaign.proPrice})
                      </button>
                    </div>

                    {/* Feature Highlights */}
                    <div className="space-y-2.5 pt-2">
                      <p className="text-[11px] font-bold uppercase tracking-wider text-on-surface-variant">
                        Included in this 5-Year Pass:
                      </p>
                      {(selectedFounderTier === "basic"
                        ? [
                            "5 Full Years (60 Months) of Basic Creator access",
                            "10 Ebook Projects & 20 AI Blog Articles generated per month",
                            "Rewrite passage tool and standard AI models included",
                            "Full commercial publishing rights and copyright ownership",
                            "Early Backer profile badge & priority onboarding",
                          ]
                        : [
                            "5 Full Years (60 Months) of Pro Writer power access",
                            "50 Ebooks & 100 AI Blog Articles generated per month",
                            "Advanced AI Models: Claude 3.5 Sonnet, GPT-4o, DeepSeek",
                            "BlogGen automated scheduled publishing workflows",
                            "Priority AI generation speed and VIP founder support",
                          ]
                      ).map((feat, idx) => (
                        <div key={idx} className="flex items-start gap-2.5 text-xs text-on-surface/90">
                          <span className="material-symbols-outlined text-emerald-500 text-[16px] shrink-0 mt-0.5">
                            check_circle
                          </span>
                          <span>{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right Column: Pricing & Single Direct CTA */}
                  <div className="md:w-72 flex flex-col justify-between p-6 rounded-2xl bg-surface-container-low/50 dark:bg-[#181830] border border-outline-variant/30 text-center">
                    <div>
                      <span className="text-[11px] uppercase font-bold tracking-wider text-on-surface-variant">
                        One-Time Investment
                      </span>
                      <div className="my-3 flex items-baseline justify-center gap-1.5">
                        <span className="text-4xl sm:text-5xl font-black text-on-surface tracking-tight">
                          ${activePrice}
                        </span>
                        <span className="text-xs font-bold text-on-surface-variant">
                          / 5 Years
                        </span>
                      </div>
                      <span className="inline-block text-[11px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-md border border-emerald-500/20">
                        {activeSavings}
                      </span>
                      <p className="text-[11px] text-on-surface-variant mt-3 leading-tight">
                        Zero recurring monthly bills. Never pay renewal fees for 60 months.
                      </p>
                    </div>

                    <div className="mt-6 pt-4 border-t border-outline-variant/20 space-y-2">
                      <Link
                        href={`/signup?plan=${selectedFounderTier}&pass=founder`}
                        className={`w-full py-3.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg cursor-pointer ${
                          selectedFounderTier === "basic"
                            ? "bg-amber-500 hover:bg-amber-400 text-amber-950 shadow-amber-500/20"
                            : "btn-primary shadow-primary/25"
                        }`}
                      >
                        <span>Claim 5-Year Pass (${activePrice})</span>
                        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                      </Link>
                      <p className="text-[10px] text-on-surface-variant">
                        30-Day Full Money-Back Guarantee
                      </p>
                    </div>
                  </div>

                </div>
              </div>
            </div>
          </div>
        )}

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
