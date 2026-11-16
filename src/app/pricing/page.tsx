"use client";

import React, { useState, useEffect, Suspense, useMemo } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/app-store";
import {
  DEFAULT_FOUNDER_CAMPAIGN,
  FounderCampaignConfig,
  PLAN_DEFINITIONS,
  UserPlan,
} from "@/lib/store-types";
import { generateReferralCode } from "@/lib/subscription-service";
import clsx from "clsx";

interface ComparisonFeature {
  name: string;
  free: string | boolean;
  basic: string | boolean;
  pro: string | boolean;
  enterprise: string | boolean;
}

interface ComparisonCategory {
  title: string;
  features: ComparisonFeature[];
}

const COMPARISON_CATEGORIES: ComparisonCategory[] = [
  {
    title: "Writing & Ebook Production",
    features: [
      { name: "Monthly Ebook Projects", free: "2", basic: "10", pro: "50", enterprise: "Unlimited" },
      { name: "Autonomous Chapter Drafting", free: true, basic: true, pro: true, enterprise: true },
      { name: "Kindle 1:1.6 Cover Studio", free: "Basic presets", basic: "All 6 Presets", pro: "All Presets + Canvas Export", enterprise: "Full Studio + Custom Assets" },
      { name: "EPUB 3 & Print-Ready PDF", free: true, basic: true, pro: true, enterprise: true },
      { name: "Passage Rewriter & Tone Shifter", free: false, basic: true, pro: true, enterprise: true },
      { name: "Commercial & Selling Rights", free: "100% Royalty Free", basic: "100% Royalty Free", pro: "100% Royalty Free", enterprise: "100% Royalty Free" },
    ],
  },
  {
    title: "Amazon KDP & Publishing Suite",
    features: [
      { name: "Amazon KDP Launch Kit", free: false, basic: "Description only", pro: "Full 7-Part Suite", enterprise: "Full Suite + Batch Export" },
      { name: "7 Backend Search Keywords", free: false, basic: false, pro: true, enterprise: true },
      { name: "BISAC Category Recommendation", free: false, basic: false, pro: true, enterprise: true },
      { name: "Social Launch Threads & Articles", free: false, basic: false, pro: true, enterprise: true },
      { name: "Direct CMS & WordPress Sync", free: false, basic: true, pro: true, enterprise: true },
    ],
  },
  {
    title: "AI Models & Performance",
    features: [
      { name: "Standard AI Models (GPT-4o mini, Flash)", free: true, basic: true, pro: true, enterprise: true },
      { name: "Frontier Models (Claude 3.5 Sonnet, GPT-4o)", free: false, basic: false, pro: true, enterprise: true },
      { name: "Priority GPU Generation Queue", free: false, basic: false, pro: true, enterprise: true },
      { name: "Dedicated Private Server Instance", free: false, basic: false, pro: false, enterprise: true },
    ],
  },
  {
    title: "Content Marketing & Support",
    features: [
      { name: "Monthly Blog Posts generated", free: "2", basic: "25", pro: "100", enterprise: "Unlimited" },
      { name: "Automated BlogGen Pipelines", free: false, basic: false, pro: true, enterprise: true },
      { name: "Support Level", free: "Community", basic: "Standard Email", pro: "Priority 24/7 Queue", enterprise: "Dedicated Account Lead" },
    ],
  },
];

const FAQS = [
  {
    question: "Can I publish and sell the books generated on Amazon KDP and Apple Books?",
    answer:
      "Yes, 100%. You own all commercial and intellectual property rights to manuscripts, book covers, and descriptions generated with Writerdost AI. We take zero royalties or commission on your book sales.",
  },
  {
    question: "How do the Founder 5-Year Passes work?",
    answer:
      "A Founder Pass is a single, flat one-time payment providing 60 continuous months of access with zero recurring renewal fees. Your full monthly quotas (projects, blogs, and AI generations) automatically refresh on the 1st of every month.",
  },
  {
    question: "Can I cancel or switch my plan at any time?",
    answer:
      "Yes. You have full self-serve control in your Account Settings. You can cancel your subscription with 1 click anytime; you will retain full access until the end of your prepaid billing period without penalty.",
  },
  {
    question: "What export formats are provided for publishing?",
    answer:
      "Writerdost AI exports official EPUB 3 packages with embedded cover art and metadata (compatible with Kindle Direct Publishing, Apple Books, and Kobo), print-ready formatted PDFs, and clean Markdown files.",
  },
  {
    question: "Which AI models power the generation tools?",
    answer:
      "Writerdost AI orchestrates state-of-the-art models including Anthropic Claude 3.5 Sonnet, OpenAI GPT-4o, and Google Gemini 1.5 Pro to ensure deep narrative coherence, accurate pacing, and authentic human tone.",
  },
  {
    question: "How does the 10% referral program work?",
    answer:
      "Every registered author receives a unique referral code and link. When a fellow writer signs up through your link, they immediately receive 10% off their plan, and you receive renewal credits added to your account.",
  },
];

function PricingContent() {
  const searchParams = useSearchParams();
  const currentUser = useAppStore((state) => state.currentUser);
  const checkQuota = useAppStore((state) => state.checkQuota);
  const purchaseSubscription = useAppStore((state) => state.purchaseSubscription);
  const referrals = useAppStore((state) => state.referrals);
  const userReferralCode = useAppStore((state) => state.userReferralCode);
  const loadReferrals = useAppStore((state) => state.loadReferrals);

  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<UserPlan | null>(null);
  const [founderPassSelected, setFounderPassSelected] = useState<"basic" | "pro" | null>(null);
  const [openFaqIndex, setOpenFaqIndex] = useState<number | null>(0);

  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    finalPrice: number;
    discountPercent?: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [validatingCoupon, setValidatingCoupon] = useState(false);
  const [referralCodeInput, setReferralCodeInput] = useState(() => searchParams?.get("ref")?.toUpperCase() || "");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [copiedReferral, setCopiedReferral] = useState(false);
  const [campaign, setCampaign] = useState<FounderCampaignConfig>(DEFAULT_FOUNDER_CAMPAIGN);
  const [timeLeft, setTimeLeft] = useState<{ days: number; hours: number; minutes: number; seconds: number }>({
    days: 30,
    hours: 0,
    minutes: 0,
    seconds: 0,
  });

  // Keyboard accessibility: Close modal on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && selectedPlan) {
        setSelectedPlan(null);
        setFounderPassSelected(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [selectedPlan]);

  useEffect(() => {
    fetch("/api/founder-campaign")
      .then((res) => res.json())
      .then((data) => {
        if (data?.config) setCampaign(data.config);
      })
      .catch(() => {});
  }, []);

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
      return {
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      };
    };
    const interval = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    const timeout = setTimeout(() => setTimeLeft(calculateTimeLeft()), 0);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [campaign]);

  useEffect(() => {
    const ref = searchParams?.get("ref");
    if (ref) {
      const timeout = setTimeout(() => {
        setReferralCodeInput((prev) => prev || ref.toUpperCase());
      }, 0);
      return () => clearTimeout(timeout);
    }
  }, [searchParams]);

  useEffect(() => {
    if (currentUser) {
      void loadReferrals();
    }
  }, [currentUser, loadReferrals]);

  const currentPlan = currentUser?.plan || "Free";
  const projectQuota = checkQuota("project");
  const blogQuota = checkQuota("blog");

  const effectiveReferralCode =
    userReferralCode || (currentUser ? generateReferralCode(currentUser.id) : "WD-WRITER");

  const referralUrl = typeof window !== "undefined"
    ? `${window.location.origin}/pricing?ref=${effectiveReferralCode}`
    : `https://writerdost.com/pricing?ref=${effectiveReferralCode}`;

  const copyReferralLink = async () => {
    try {
      await navigator.clipboard.writeText(referralUrl);
      setCopiedReferral(true);
      setTimeout(() => setCopiedReferral(false), 2500);
    } catch {
      // fallback
    }
  };

  const handleOpenCheckout = (planId: UserPlan, founderPass?: "basic" | "pro") => {
    if (!founderPass && planId === currentPlan && planId === "Free") return;
    setSelectedPlan(planId);
    setFounderPassSelected(founderPass || null);
    setCouponCode("");
    setAppliedCoupon(null);
    setCouponError(null);
    setCheckoutError(null);
    setCheckoutSuccess(false);
  };

  // Base plan price calculation for checkout
  const isFounder = Boolean(founderPassSelected);
  const founderBasePrice =
    founderPassSelected === "basic"
      ? campaign.basicPrice || 99
      : campaign.proPrice || 299;

  const planDetails = selectedPlan && selectedPlan !== "Custom" ? PLAN_DEFINITIONS[selectedPlan] : null;

  const basePrice = useMemo(() => {
    if (isFounder) return founderBasePrice;
    if (!planDetails) return 0;
    return billingInterval === "yearly" ? planDetails.priceYearly : planDetails.priceMonthly;
  }, [isFounder, founderBasePrice, planDetails, billingInterval]);

  const referralDiscount = referralCodeInput.trim() ? Math.round(basePrice * 0.1 * 100) / 100 : 0;
  const couponDiscount = appliedCoupon?.discountAmount ?? 0;
  const totalDiscount = Math.min(basePrice, couponDiscount + referralDiscount);
  const finalPrice = Math.max(0, Math.round((basePrice - totalDiscount) * 100) / 100);
  const formatMoney = (val: number) => `$${Number(val || 0).toFixed(2)}`;

  const planDisplayName = useMemo(() => {
    if (founderPassSelected === "basic") return "Founder Basic 5-Year Pass";
    if (founderPassSelected === "pro") return "Founder Pro 5-Year Pass";
    return planDetails?.name || selectedPlan;
  }, [founderPassSelected, planDetails, selectedPlan]);

  const planBillingLabel = useMemo(() => {
    if (isFounder) return "5-Year Access Pass";
    return billingInterval === "yearly" ? "Billed annually" : "Billed monthly";
  }, [isFounder, billingInterval]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim() || !selectedPlan) return;
    setValidatingCoupon(true);
    setCouponError(null);

    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          code: couponCode.trim(),
          plan: selectedPlan,
          interval: isFounder ? "yearly" : billingInterval,
        }),
      });
      const data = await res.json();
      if (data.valid) {
        const discountAmount =
          isFounder && data.coupon?.discountType === "percent"
            ? Math.round((basePrice * (data.coupon.discountValue / 100)) * 100) / 100
            : isFounder && data.coupon?.discountType === "fixed"
            ? Math.min(basePrice, data.coupon.discountValue)
            : data.discountAmount;

        setAppliedCoupon({
          code: data.coupon.code,
          discountAmount,
          finalPrice: Math.max(0, Math.round((basePrice - discountAmount) * 100) / 100),
          discountPercent: data.coupon?.discountType === "percent" ? data.coupon.discountValue : undefined,
        });
      } else {
        setCouponError(data.error || "Invalid coupon code.");
        setAppliedCoupon(null);
      }
    } catch {
      setCouponError("Could not validate coupon. Please check connection.");
    } finally {
      setValidatingCoupon(false);
    }
  };

  const handleCompletePurchase = async () => {
    if (!selectedPlan) return;
    setIsCheckingOut(true);
    setCheckoutError(null);

    const res = await purchaseSubscription(
      selectedPlan,
      isFounder ? "yearly" : billingInterval,
      appliedCoupon?.code,
      referralCodeInput.trim() || undefined
    );

    setIsCheckingOut(false);
    if (res.success) {
      setCheckoutSuccess(true);
      setTimeout(() => {
        setSelectedPlan(null);
        setFounderPassSelected(null);
      }, 2000);
    } else {
      setCheckoutError(res.error || "Subscription upgrade failed.");
    }
  };

  return (
    <div className="page pb-20">
      {/* Top Header */}
      <div className="page-head flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="page-title text-2xl font-bold tracking-tight">Plans & Subscriptions</h1>
          <p className="page-sub text-muted-foreground text-sm mt-1">
            Unlock higher monthly quotas, advanced AI models, and automated publishing workflows.
          </p>
        </div>

        {/* Monthly / Yearly Toggle */}
        <div className="inline-flex items-center p-1 rounded-full bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/60 dark:border-slate-700 self-start md:self-auto">
          <button
            onClick={() => setBillingInterval("monthly")}
            className={clsx(
              "px-4 py-1.5 rounded-full text-xs font-semibold transition-all focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
              billingInterval === "monthly"
                ? "bg-white dark:bg-slate-900 text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            type="button"
          >
            Monthly
          </button>
          <button
            onClick={() => setBillingInterval("yearly")}
            className={clsx(
              "px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
              billingInterval === "yearly"
                ? "bg-white dark:bg-slate-900 text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            type="button"
          >
            <span>Yearly</span>
            <span className="text-xs uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Quota & Usage Meter Card */}
      {currentUser && (
        <div className="panel p-5 mb-8 border border-slate-200/80 dark:border-slate-800 bg-surface-container-low/70">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs uppercase tracking-wider font-semibold text-muted-foreground">
                  Your Current Plan
                </span>
                <span className="px-2 py-0.5 rounded-md text-xs font-bold bg-primary/10 text-primary border border-primary/20">
                  {currentPlan}
                </span>
              </div>
              <p className="text-xs text-muted-foreground mt-0.5">
                Monthly quotas refresh on the 1st of each month.
              </p>
            </div>
            {currentPlan !== "Enterprise" && (
              <button
                type="button"
                onClick={() => handleOpenCheckout("Pro")}
                className="btn btn-primary btn-sm self-start sm:self-auto flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-base">upgrade</span>
                <span>Upgrade Plan</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-slate-200/80 dark:border-slate-800">
            {/* Project Quota */}
            <div className="p-3 rounded-lg bg-card border border-slate-200/80 dark:border-slate-800/80">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-primary text-base">book</span>
                  Ebook Projects
                </span>
                <span className="font-mono font-bold text-muted-foreground">
                  {projectQuota.limit === -1
                    ? `${projectQuota.used} / Unlimited`
                    : `${projectQuota.used} / ${projectQuota.limit}`}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className={clsx(
                    "h-full rounded-full transition-all duration-300",
                    projectQuota.limit === -1
                      ? "bg-primary w-full"
                      : projectQuota.used >= projectQuota.limit
                      ? "bg-rose-500"
                      : "bg-primary"
                  )}
                  style={{
                    width: projectQuota.limit === -1
                      ? "100%"
                      : `${Math.min(100, (projectQuota.used / Math.max(1, projectQuota.limit)) * 100)}%`,
                  }}
                />
              </div>
            </div>

            {/* Blog Quota */}
            <div className="p-3 rounded-lg bg-card border border-slate-200/80 dark:border-slate-800/80">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-semibold text-foreground flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-emerald-500 text-base">article</span>
                  Blog Posts
                </span>
                <span className="font-mono font-bold text-muted-foreground">
                  {blogQuota.limit === -1
                    ? `${blogQuota.used} / Unlimited`
                    : `${blogQuota.used} / ${blogQuota.limit}`}
                </span>
              </div>
              <div className="w-full h-2 rounded-full bg-slate-200 dark:bg-slate-800 overflow-hidden">
                <div
                  className={clsx(
                    "h-full rounded-full transition-all duration-300",
                    blogQuota.limit === -1
                      ? "bg-emerald-500 w-full"
                      : blogQuota.used >= blogQuota.limit
                      ? "bg-rose-500"
                      : "bg-emerald-500"
                  )}
                  style={{
                    width: blogQuota.limit === -1
                      ? "100%"
                      : `${Math.min(100, (blogQuota.used / Math.max(1, blogQuota.limit)) * 100)}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 🚀 1-CLICK DEMO BANNER */}
      <div className="mb-8 p-4 rounded-xl bg-surface-container-low border border-outline-variant/30 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 text-primary flex items-center justify-center shrink-0">
            <span className="material-symbols-outlined text-xl">play_circle</span>
          </span>
          <div>
            <h4 className="text-sm font-bold text-foreground">Want to test before subscribing?</h4>
            <p className="text-xs text-muted-foreground">
              Try pre-configured demo workspaces (Free, Basic, and Pro Writer) with zero password required.
            </p>
          </div>
        </div>
        <Link
          href="/login"
          className="btn btn-secondary btn-sm shrink-0 flex items-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
        >
          <span>Launch 1-Click Demos</span>
          <span className="material-symbols-outlined text-sm">arrow_forward</span>
        </Link>
      </div>

      {/* Pricing Tiers Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
        {(["Free", "Basic", "Pro", "Enterprise"] as const).map((planId) => {
          const plan = PLAN_DEFINITIONS[planId];
          const isCurrent = currentPlan === planId;
          const price = billingInterval === "yearly" ? plan.priceYearly : plan.priceMonthly;

          return (
            <div
              key={planId}
              className={clsx(
                "relative rounded-2xl p-6 transition-all duration-200 flex flex-col justify-between border",
                plan.isPopular
                  ? "bg-surface-container-low border-primary/40 shadow-lg shadow-primary/5 ring-1 ring-primary/30"
                  : "bg-card border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
              )}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-xs font-bold tracking-wide uppercase bg-primary text-white shadow-sm">
                  Most Popular
                </div>
              )}

              <div>
                <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 min-h-[40px] leading-relaxed">{plan.description}</p>

                <div className="mt-5 mb-5 flex items-baseline gap-1">
                  <span className="text-3xl font-extrabold text-foreground">
                    {price === 0 ? "Free" : `$${price}`}
                  </span>
                  {price > 0 && (
                    <span className="text-xs text-muted-foreground">
                      /{billingInterval === "yearly" ? "year" : "month"}
                    </span>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-200/80 dark:border-slate-800/80 space-y-2.5">
                  <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                    Included capabilities
                  </p>
                  {plan.featureList.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <span className="material-symbols-outlined text-emerald-500 text-base shrink-0 mt-0.5">
                        check_circle
                      </span>
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-8 pt-4">
                <button
                  type="button"
                  onClick={() => handleOpenCheckout(planId)}
                  disabled={isCurrent}
                  className={clsx(
                    "w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                    isCurrent
                      ? "bg-slate-200/80 dark:bg-slate-800 text-muted-foreground cursor-default"
                      : plan.isPopular
                      ? "btn-primary shadow-sm hover:shadow"
                      : "btn-secondary"
                  )}
                >
                  {isCurrent ? "Current Active Plan" : plan.buttonLabel}
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* 🌟 SPECIAL LIMITED-TIME FOUNDER OFFER (AFTER NORMAL PRICING) 🌟 */}
      {campaign.isEnabled && (
        <div className="mt-14 rounded-2xl p-6 sm:p-8 bg-surface-container-low border border-amber-500/30 dark:border-amber-400/25 shadow-xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div className="text-center lg:text-left space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500 text-amber-950 font-black text-xs tracking-wider uppercase shadow-xs">
                <span className="material-symbols-outlined text-sm">stars</span>
                Special Early Backer Offer
              </div>
              <h3 className="text-2xl font-black text-foreground tracking-tight">
                Founder 5-Year Access Pass
              </h3>
              <p className="text-xs text-muted-foreground max-w-lg">
                Pay once, write for 5 full years. Zero recurring monthly fees, locked-in generation limits, and priority AI routing.
              </p>
            </div>

            {/* Scarcity Countdown Counter */}
            <div className="flex flex-col items-center sm:items-end gap-1.5 bg-card/90 p-3.5 rounded-xl border border-amber-500/30 shadow-sm">
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
                <span className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
                <span>Limited Batch Closes In:</span>
              </div>
              <div className="flex items-center gap-1.5 font-mono text-sm font-bold">
                <span className="px-2 py-1 bg-muted rounded-md">{timeLeft.days}d</span>
                <span>:</span>
                <span className="px-2 py-1 bg-muted rounded-md">{String(timeLeft.hours).padStart(2, "0")}h</span>
                <span>:</span>
                <span className="px-2 py-1 bg-muted rounded-md">{String(timeLeft.minutes).padStart(2, "0")}m</span>
                <span>:</span>
                <span className="px-2 py-1 bg-muted text-amber-500 rounded-md">{String(timeLeft.seconds).padStart(2, "0")}s</span>
              </div>
            </div>
          </div>

          {/* Both Founder Passes Displayed Side-by-Side in 2-Card Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            {/* 1. Founder Basic Pass */}
            <div className="p-6 rounded-xl bg-card border border-slate-200 dark:border-slate-800 shadow-md flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-400">
                    Indie Author Deal
                  </span>
                  <span className="text-xs font-semibold text-rose-500 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">local_fire_department</span>
                    Only {Math.max(0, campaign.basicTotalSlots - campaign.basicClaimedSlots)} spots left
                  </span>
                </div>
                <h4 className="text-xl font-bold text-foreground">Founder Basic Pass</h4>
                <p className="text-xs text-muted-foreground mt-1">5-Year Full Basic Creator Access. Ideal for indie novelists.</p>

                <div className="my-4 pt-2 pb-3 border-y border-slate-200/80 dark:border-slate-800 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-foreground">${campaign.basicPrice}</span>
                  <span className="text-xs text-muted-foreground font-semibold">/ 5-Year Flat Pass</span>
                  <span className="ml-auto text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Save $146 vs Annual
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-emerald-500 text-sm shrink-0 mt-0.5">check_circle</span>
                    <span>5 Full Years (60 Months) of Basic Creator features</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-emerald-500 text-sm shrink-0 mt-0.5">check_circle</span>
                    <span>10 Ebook Projects & 20 Blogs generated each month</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-emerald-500 text-sm shrink-0 mt-0.5">check_circle</span>
                    <span>Rewrite passage tool & direct CMS publishing</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-emerald-500 text-sm shrink-0 mt-0.5">check_circle</span>
                    <span>Full commercial publishing rights & copyright</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleOpenCheckout("Basic", "basic")}
                  className="w-full py-2.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-amber-950 transition-all shadow-sm cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  Claim Founder Basic (${campaign.basicPrice})
                </button>
              </div>
            </div>

            {/* 2. Founder Pro Pass */}
            <div className="p-6 rounded-xl bg-card border-2 border-primary shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-primary/20 text-primary">
                    Pro Author & Agency Deal
                  </span>
                  <span className="text-xs font-semibold text-rose-500 flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">local_fire_department</span>
                    Only {Math.max(0, campaign.proTotalSlots - campaign.proClaimedSlots)} spots left
                  </span>
                </div>
                <h4 className="text-xl font-bold text-foreground">Founder Pro Pass</h4>
                <p className="text-xs text-muted-foreground mt-1">5-Year Full Pro Writer Access with Claude 3.5 & GPT-4o.</p>

                <div className="my-4 pt-2 pb-3 border-y border-slate-200/80 dark:border-slate-800 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-foreground">${campaign.proPrice}</span>
                  <span className="text-xs text-muted-foreground font-semibold">/ 5-Year Flat Pass</span>
                  <span className="ml-auto text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Save $646 vs Annual
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-primary text-sm shrink-0 mt-0.5">verified</span>
                    <span>5 Full Years (60 Months) of Pro Writer features</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-primary text-sm shrink-0 mt-0.5">verified</span>
                    <span>50 Ebook Projects & 100 Blogs generated each month</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-primary text-sm shrink-0 mt-0.5">verified</span>
                    <span>Advanced AI Models: Claude 3.5 Sonnet, GPT-4o, DeepSeek</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-primary text-sm shrink-0 mt-0.5">verified</span>
                    <span>BlogGen automated scheduled publishing pipelines</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleOpenCheckout("Pro", "pro")}
                  className="w-full py-2.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider btn-primary transition-all shadow-md shadow-primary/25 cursor-pointer focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                >
                  Claim Founder Pro (${campaign.proPrice})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 📊 FEATURE COMPARISON MATRIX */}
      <div className="mt-16">
        <div className="text-center max-w-2xl mx-auto mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            Compare Plan Capabilities Side-by-Side
          </h2>
          <p className="text-xs text-muted-foreground mt-1.5">
            Transparent breakdown of every feature, model limit, and publishing export tool across tiers.
          </p>
        </div>

        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-card overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-surface-container-low/60">
                  <th className="py-4 px-5 font-bold text-foreground w-2/5">Feature & Tool</th>
                  <th className="py-4 px-3 font-bold text-foreground text-center">Free Forever</th>
                  <th className="py-4 px-3 font-bold text-foreground text-center">Basic ($5/mo)</th>
                  <th className="py-4 px-3 font-bold text-primary text-center bg-primary/5">
                    Pro Writer ($19/mo)
                  </th>
                  <th className="py-4 px-3 font-bold text-foreground text-center">Studio ($49/mo)</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_CATEGORIES.map((cat, catIdx) => (
                  <React.Fragment key={catIdx}>
                    <tr className="bg-surface-container-high/40 border-y border-slate-200/80 dark:border-slate-800/80">
                      <td
                        colSpan={5}
                        className="py-2.5 px-5 font-bold text-xs uppercase tracking-wider text-muted-foreground"
                      >
                        {cat.title}
                      </td>
                    </tr>
                    {cat.features.map((feat, fIdx) => (
                      <tr
                        key={fIdx}
                        className="border-b border-slate-200/60 dark:border-slate-800/60 hover:bg-surface-container-low/30 transition-colors"
                      >
                        <td className="py-3 px-5 text-foreground font-medium">{feat.name}</td>
                        <td className="py-3 px-3 text-center text-muted-foreground">
                          {typeof feat.free === "boolean" ? (
                            feat.free ? (
                              <span className="material-symbols-outlined text-emerald-500 text-base">check</span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-600">—</span>
                            )
                          ) : (
                            feat.free
                          )}
                        </td>
                        <td className="py-3 px-3 text-center text-foreground font-medium">
                          {typeof feat.basic === "boolean" ? (
                            feat.basic ? (
                              <span className="material-symbols-outlined text-emerald-500 text-base">check</span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-600">—</span>
                            )
                          ) : (
                            feat.basic
                          )}
                        </td>
                        <td className="py-3 px-3 text-center bg-primary/5 font-semibold text-primary">
                          {typeof feat.pro === "boolean" ? (
                            feat.pro ? (
                              <span className="material-symbols-outlined text-primary text-base">verified</span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-600">—</span>
                            )
                          ) : (
                            feat.pro
                          )}
                        </td>
                        <td className="py-3 px-3 text-center text-foreground font-medium">
                          {typeof feat.enterprise === "boolean" ? (
                            feat.enterprise ? (
                              <span className="material-symbols-outlined text-emerald-500 text-base">check</span>
                            ) : (
                              <span className="text-slate-400 dark:text-slate-600">—</span>
                            )
                          ) : (
                            feat.enterprise
                          )}
                        </td>
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Refer & Earn Section */}
      <div className="mt-14 panel p-7 border border-slate-200/90 dark:border-slate-800 bg-surface-container-low">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="max-w-xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="material-symbols-outlined text-primary text-xl">share_reviews</span>
              <h2 className="text-lg font-bold text-foreground">Refer Friends & Earn Credits</h2>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Share your personal referral code with writers, creators, and marketers. When someone subscribes using your link, they receive an instant 10% discount, and you earn credit towards your renewals.
            </p>

            <div className="mt-4 flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
              <div className="px-3 py-2 bg-card rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-mono text-foreground select-all overflow-hidden text-ellipsis">
                {referralUrl}
              </div>
              <button
                type="button"
                onClick={copyReferralLink}
                className="btn btn-primary btn-sm flex items-center justify-center gap-1.5 shrink-0 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                <span className="material-symbols-outlined text-base">
                  {copiedReferral ? "check" : "content_copy"}
                </span>
                <span>{copiedReferral ? "Link Copied!" : "Copy Link"}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 shrink-0 sm:min-w-[240px]">
            <div className="p-4 rounded-xl bg-card border border-slate-200 dark:border-slate-800 text-center">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Referred
              </p>
              <p className="text-2xl font-extrabold text-foreground mt-1">
                {referrals.length}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-card border border-slate-200 dark:border-slate-800 text-center">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Rewards Active
              </p>
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {referrals.filter((r) => r.status === "completed").length * 10}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* ❓ FREQUENTLY ASKED QUESTIONS (FAQ ACCORDION) */}
      <div className="mt-16 max-w-3xl mx-auto">
        <div className="text-center mb-8">
          <h2 className="text-2xl font-bold tracking-tight text-foreground">Frequently Asked Questions</h2>
          <p className="text-xs text-muted-foreground mt-1.5">
            Everything you need to know about publishing rights, billing, quotas, and AI models.
          </p>
        </div>

        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaqIndex === idx;
            return (
              <div
                key={idx}
                className="rounded-xl border border-slate-200 dark:border-slate-800 bg-card overflow-hidden shadow-xs transition-all"
              >
                <button
                  type="button"
                  onClick={() => setOpenFaqIndex(isOpen ? null : idx)}
                  className="w-full py-4 px-5 text-left flex items-center justify-between gap-4 font-semibold text-sm text-foreground hover:bg-surface-container-low/40 transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  aria-expanded={isOpen}
                >
                  <span>{faq.question}</span>
                  <span
                    className={clsx(
                      "material-symbols-outlined text-muted-foreground transition-transform duration-200 shrink-0",
                      isOpen && "rotate-180 text-primary"
                    )}
                  >
                    keyboard_arrow_down
                  </span>
                </button>
                {isOpen && (
                  <div className="px-5 pb-4 pt-1 text-xs text-muted-foreground leading-relaxed border-t border-slate-200/60 dark:border-slate-800/60 bg-surface-container-lowest/40">
                    {faq.answer}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Checkout Modal */}
      {selectedPlan && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-body overflow-y-auto"
          role="dialog"
          aria-modal="true"
          aria-labelledby="checkout-modal-title"
        >
          <div className="relative w-full max-w-lg bg-surface-container border border-outline-variant/30 rounded-2xl shadow-2xl overflow-hidden text-on-surface my-auto max-h-[92vh] flex flex-col">
            {/* Top accent highlight strip */}
            <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-primary to-amber-500 shrink-0" />

            <button
              onClick={() => {
                setSelectedPlan(null);
                setFounderPassSelected(null);
              }}
              className="absolute top-4 right-4 p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors z-10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              type="button"
              aria-label="Close upgrade modal"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>

            {checkoutSuccess ? (
              <div className="text-center py-10 px-6 space-y-4 overflow-y-auto">
                <div className="w-16 h-16 mx-auto rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shadow-lg shadow-emerald-500/20 motion-safe:animate-in motion-safe:zoom-in-95 duration-300">
                  <span className="material-symbols-outlined text-4xl">verified</span>
                </div>
                <div>
                  <h3 className="text-xl font-extrabold text-on-surface">Welcome to {planDisplayName}!</h3>
                  <p className="text-xs text-on-surface-variant mt-1.5 max-w-sm mx-auto">
                    Your subscription has been successfully activated and your monthly quotas have been refreshed.
                  </p>
                </div>
                <div className="pt-2">
                  <Link
                    href="/editor"
                    className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-bold hover:brightness-110 transition-all shadow-md focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <span className="material-symbols-outlined text-base">edit_document</span>
                    Start Writing Now
                  </Link>
                </div>
              </div>
            ) : (
              <div className="p-6 overflow-y-auto space-y-4">
                {/* Header */}
                <div className="flex items-center gap-3 pr-8">
                  <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-primary to-amber-500 text-white flex items-center justify-center shadow-md shrink-0">
                    <span className="material-symbols-outlined text-xl">workspace_premium</span>
                  </span>
                  <div>
                    <h3 id="checkout-modal-title" className="text-lg font-bold text-on-surface tracking-tight">
                      {isFounder ? "Complete Founder Upgrade" : "Complete Your Upgrade"}
                    </h3>
                    <p className="text-xs text-on-surface-variant">
                      {isFounder
                        ? "Lock in 5 full years (60 months) with zero renewal fees."
                        : "Review your plan details and secure instant access."}
                    </p>
                  </div>
                </div>

                {/* In-Modal Billing Cycle Selector for Regular Plans */}
                {!isFounder && (
                  <div className="p-1 rounded-xl bg-surface-container-lowest border border-outline-variant/30 flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => setBillingInterval("monthly")}
                      className={clsx(
                        "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all text-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                        billingInterval === "monthly"
                          ? "bg-surface-container-high text-on-surface shadow-xs"
                          : "text-on-surface-variant hover:text-on-surface"
                      )}
                    >
                      Monthly Billed
                    </button>
                    <button
                      type="button"
                      onClick={() => setBillingInterval("yearly")}
                      className={clsx(
                        "flex-1 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center justify-center gap-1.5 text-center focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none",
                        billingInterval === "yearly"
                          ? "bg-surface-container-high text-on-surface shadow-xs"
                          : "text-on-surface-variant hover:text-on-surface"
                      )}
                    >
                      <span>Yearly Billed</span>
                      <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                        Save 20%
                      </span>
                    </button>
                  </div>
                )}

                {/* Plan Summary Card */}
                <div className="p-4 rounded-xl bg-surface-container-low/90 border border-outline-variant/30 space-y-2.5 shadow-sm">
                  <div className="flex justify-between items-center pb-2 border-b border-outline-variant/20">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-on-surface">{planDisplayName}</span>
                      <span className="text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-primary/15 text-primary border border-primary/25">
                        {isFounder ? "5-Year Access" : billingInterval}
                      </span>
                    </div>
                    <span className="text-xs font-semibold text-on-surface-variant">
                      {planBillingLabel}
                    </span>
                  </div>

                  <div className="flex justify-between items-center text-xs text-on-surface-variant">
                    <span>{isFounder ? "5-Year Flat Pass" : "Base Subscription"}</span>
                    <span className="font-medium text-on-surface">{formatMoney(basePrice)}</span>
                  </div>

                  {couponDiscount > 0 && (
                    <div className="flex justify-between items-center text-xs text-emerald-400">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">local_offer</span>
                        Coupon Discount ({appliedCoupon?.code})
                      </span>
                      <span className="font-semibold">-{formatMoney(couponDiscount)}</span>
                    </div>
                  )}

                  {referralDiscount > 0 && (
                    <div className="flex justify-between items-center text-xs text-indigo-400">
                      <span className="flex items-center gap-1">
                        <span className="material-symbols-outlined text-sm">redeem</span>
                        Referral Bonus (10%)
                      </span>
                      <span className="font-semibold">-{formatMoney(referralDiscount)}</span>
                    </div>
                  )}

                  <div className="pt-2.5 mt-2 border-t border-outline-variant/30 flex justify-between items-baseline">
                    <div>
                      <span className="font-bold text-sm text-on-surface">Total Due Today</span>
                      <p className="text-xs text-on-surface-variant">
                        {isFounder ? "Single flat payment • No renewals" : "All taxes & fees included"}
                      </p>
                    </div>
                    <div className="text-right">
                      {totalDiscount > 0 && (
                        <span className="text-xs line-through text-on-surface-variant/70 mr-2">
                          {formatMoney(basePrice)}
                        </span>
                      )}
                      <span className="text-xl font-extrabold text-primary">
                        {formatMoney(finalPrice)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Coupon Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label htmlFor="coupon-code-input" className="text-xs font-semibold text-on-surface">
                      Have a coupon code?
                    </label>
                    {appliedCoupon && (
                      <button
                        type="button"
                        onClick={() => setAppliedCoupon(null)}
                        className="text-xs text-rose-400 hover:text-rose-300 font-medium transition-colors"
                      >
                        Remove code
                      </button>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative flex-1">
                      <span className="material-symbols-outlined text-sm absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60">
                        confirmation_number
                      </span>
                      <input
                        id="coupon-code-input"
                        type="text"
                        placeholder="e.g. WELCOME20"
                        value={couponCode}
                        onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                        className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary focus:ring-1 focus:ring-primary pl-9 pr-3 py-2 text-xs uppercase font-medium outline-none transition-all"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={validatingCoupon || !couponCode.trim()}
                      className="px-4 py-2 rounded-xl text-xs font-semibold bg-surface-container-high hover:bg-surface-container-highest text-on-surface border border-outline-variant/30 transition-all shrink-0 disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                    >
                      {validatingCoupon ? "Checking…" : "Apply"}
                    </button>
                  </div>
                  {appliedCoupon && (
                    <div className="mt-2 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex items-center justify-between">
                      <div className="flex items-center gap-1.5 font-medium">
                        <span className="material-symbols-outlined text-sm">check_circle</span>
                        <span>Coupon &quot;{appliedCoupon.code}&quot; applied</span>
                      </div>
                      <span className="font-bold">-{formatMoney(appliedCoupon.discountAmount)}</span>
                    </div>
                  )}
                  {couponError && (
                    <div className="mt-2 px-3 py-1.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">error</span>
                      <span>{couponError}</span>
                    </div>
                  )}
                </div>

                {/* Referral Code */}
                <div>
                  <label htmlFor="referral-code-input" className="text-xs font-semibold text-on-surface block mb-1.5">
                    Referral Code (Optional)
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined text-sm absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant/60">
                      card_giftcard
                    </span>
                    <input
                      id="referral-code-input"
                      type="text"
                      placeholder="e.g. WD-ABC123"
                      value={referralCodeInput}
                      onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
                      className="w-full bg-surface-container-lowest border border-outline-variant/40 rounded-xl text-on-surface placeholder:text-on-surface-variant/40 focus:border-primary focus:ring-1 focus:ring-primary pl-9 pr-3 py-2 text-xs uppercase font-medium outline-none transition-all"
                    />
                  </div>
                  {referralCodeInput.trim() && (
                    <div className="mt-2 px-3 py-1.5 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 text-xs flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-sm">celebration</span>
                      <span>10% referral discount active on this order!</span>
                    </div>
                  )}
                </div>

                {checkoutError && (
                  <div className="p-2.5 rounded-xl text-xs text-rose-400 bg-rose-500/10 border border-rose-500/30 flex items-center gap-2">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    <span>{checkoutError}</span>
                  </div>
                )}

                {/* Trust Badges */}
                <div className="pt-3 border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-2 text-xs text-on-surface-variant">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-emerald-400">verified</span>
                    <span>256-bit SSL Encrypted</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-primary">bolt</span>
                    <span>Instant Quota Activation</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-sm text-amber-400">shield</span>
                    <span>Cancel Anytime</span>
                  </div>
                </div>

                {/* Checkout Button */}
                <div>
                  <button
                    type="button"
                    onClick={handleCompletePurchase}
                    disabled={isCheckingOut}
                    className="w-full py-3.5 px-4 rounded-xl font-bold text-xs uppercase tracking-wider bg-gradient-to-r from-indigo-600 via-primary to-amber-500 hover:brightness-110 active:scale-[0.99] text-white shadow-lg shadow-indigo-600/25 flex items-center justify-center gap-2 transition-all disabled:opacity-50 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
                  >
                    <span className="material-symbols-outlined text-base">
                      {isCheckingOut ? "hourglass_empty" : "lock"}
                    </span>
                    {isCheckingOut
                      ? "Activating Subscription…"
                      : `Upgrade to ${planDisplayName} • ${formatMoney(finalPrice)}`}
                  </button>
                  <p className="text-xs text-center text-on-surface-variant mt-2">
                    Supported: Visa, Mastercard, American Express, PayPal & Apple Pay.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense fallback={<div className="page p-8 text-center text-xs text-muted-foreground">Loading plans…</div>}>
      <PricingContent />
    </Suspense>
  );
}
