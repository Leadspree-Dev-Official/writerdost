"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import { useAppStore } from "@/lib/app-store";
import { DEFAULT_FOUNDER_CAMPAIGN, FounderCampaignConfig, PLAN_DEFINITIONS, UserPlan } from "@/lib/store-types";
import { generateReferralCode } from "@/lib/subscription-service";

function PricingContent() {
  const searchParams = useSearchParams();
  const currentUser = useAppStore((state) => state.currentUser);
  const purchaseSubscription = useAppStore((state) => state.purchaseSubscription);
  const userReferralCode = useAppStore((state) => state.userReferralCode);
  const referrals = useAppStore((state) => state.referrals);
  const loadReferrals = useAppStore((state) => state.loadReferrals);
  const checkQuota = useAppStore((state) => state.checkQuota);

  const [billingInterval, setBillingInterval] = useState<"monthly" | "yearly">("monthly");
  const [selectedPlan, setSelectedPlan] = useState<UserPlan | null>(null);
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    discountAmount: number;
    finalPrice: number;
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
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      };
    };
    setTimeLeft(calculateTimeLeft());
    const interval = setInterval(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearInterval(interval);
  }, [campaign]);

  // Check URL referral code
  useEffect(() => {
    const ref = searchParams?.get("ref");
    if (ref) {
      setReferralCodeInput((prev) => prev || ref.toUpperCase());
    }
  }, [searchParams]);

  // Load referrals when user is signed in
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

  const handleOpenCheckout = (planId: UserPlan) => {
    if (planId === currentPlan && planId === "Free") return;
    setSelectedPlan(planId);
    setAppliedCoupon(null);
    setCouponError(null);
    setCheckoutError(null);
    setCheckoutSuccess(false);
  };

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
          interval: billingInterval,
        }),
      });
      const data = await res.json();
      if (data.valid) {
        setAppliedCoupon({
          code: data.coupon.code,
          discountAmount: data.discountAmount,
          finalPrice: data.finalPrice,
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
      billingInterval,
      appliedCoupon?.code,
      referralCodeInput.trim() || undefined
    );

    setIsCheckingOut(false);
    if (res.success) {
      setCheckoutSuccess(true);
      setTimeout(() => {
        setSelectedPlan(null);
      }, 1800);
    } else {
      setCheckoutError(res.error || "Subscription upgrade failed.");
    }
  };

  // Base plan price calculation for checkout
  const planDetails = selectedPlan && selectedPlan !== "Custom" ? PLAN_DEFINITIONS[selectedPlan] : null;
  const basePrice = planDetails
    ? billingInterval === "yearly"
      ? planDetails.priceYearly
      : planDetails.priceMonthly
    : 0;

  const referralDiscount = referralCodeInput.trim() ? Math.round(basePrice * 0.1 * 100) / 100 : 0;
  const couponDiscount = appliedCoupon?.discountAmount ?? 0;
  const totalDiscount = Math.min(basePrice, couponDiscount + referralDiscount);
  const finalPrice = Math.max(0, Math.round((basePrice - totalDiscount) * 100) / 100);

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
              "px-4 py-1.5 rounded-full text-xs font-semibold transition-all",
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
              "px-4 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1.5",
              billingInterval === "yearly"
                ? "bg-white dark:bg-slate-900 text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            )}
            type="button"
          >
            <span>Yearly</span>
            <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-600 dark:text-emerald-400">
              Save 20%
            </span>
          </button>
        </div>
      </div>

      {/* Quota & Usage Meter Card */}
      {currentUser && (
        <div className="panel p-5 mb-8 border border-slate-200/80 dark:border-slate-800 bg-gradient-to-r from-slate-50 to-white dark:from-slate-900/60 dark:to-slate-900/30">
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
                Monthly quotas refresh at the start of each calendar month.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* Project Quota */}
            <div className="p-3.5 rounded-lg bg-white/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Ebook Projects this month
                </span>
                <span className="font-semibold text-foreground">
                  {projectQuota.limit === -1
                    ? `${projectQuota.used} used (Unlimited)`
                    : `${projectQuota.used} / ${projectQuota.limit}`}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className={clsx(
                    "h-full transition-all duration-300 rounded-full",
                    projectQuota.limit !== -1 && projectQuota.used >= projectQuota.limit
                      ? "bg-rose-500"
                      : "bg-primary"
                  )}
                  style={{
                    width: `${
                      projectQuota.limit === -1
                        ? Math.min(100, projectQuota.used * 5)
                        : Math.min(100, (projectQuota.used / projectQuota.limit) * 100)
                    }%`,
                  }}
                />
              </div>
            </div>

            {/* Blog Quota */}
            <div className="p-3.5 rounded-lg bg-white/70 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
              <div className="flex justify-between items-center text-xs mb-1.5">
                <span className="font-medium text-slate-700 dark:text-slate-300">
                  Blog Posts generated this month
                </span>
                <span className="font-semibold text-foreground">
                  {blogQuota.limit === -1
                    ? `${blogQuota.used} used (Unlimited)`
                    : `${blogQuota.used} / ${blogQuota.limit}`}
                </span>
              </div>
              <div className="w-full bg-slate-200 dark:bg-slate-700 h-2 rounded-full overflow-hidden">
                <div
                  className={clsx(
                    "h-full transition-all duration-300 rounded-full",
                    blogQuota.limit !== -1 && blogQuota.used >= blogQuota.limit
                      ? "bg-rose-500"
                      : "bg-emerald-500"
                  )}
                  style={{
                    width: `${
                      blogQuota.limit === -1
                        ? Math.min(100, blogQuota.used * 5)
                        : Math.min(100, (blogQuota.used / blogQuota.limit) * 100)
                    }%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 1-Click Demo Notice Banner */}
      <div className="mb-8 p-4 rounded-xl bg-gradient-to-r from-primary/10 via-indigo-500/10 to-transparent border border-primary/25 flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-9 h-9 rounded-lg bg-primary text-white flex items-center justify-center shrink-0 shadow-sm">
            <span className="material-symbols-outlined text-[20px]">bolt</span>
          </span>
          <div>
            <h4 className="text-sm font-bold text-foreground">
              Want to test every plan before subscribing?
            </h4>
            <p className="text-xs text-muted-foreground">
              Try our 1-click demo accounts for Free, Basic, Pro, Enterprise, and Admin modes with zero password typing.
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

      {/* Pricing Tiers Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
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
                  ? "bg-gradient-to-b from-primary/5 via-background to-background border-primary/40 shadow-lg shadow-primary/5 ring-1 ring-primary/30"
                  : "bg-card border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm"
              )}
            >
              {plan.isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full text-[11px] font-bold tracking-wide uppercase bg-primary text-white shadow-sm">
                  Most Popular
                </div>
              )}

              <div>
                <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                <p className="text-xs text-muted-foreground mt-1 min-h-[32px]">{plan.description}</p>

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
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    Included capabilities
                  </p>
                  {plan.featureList.map((feat, idx) => (
                    <div key={idx} className="flex items-start gap-2 text-xs text-slate-700 dark:text-slate-300">
                      <span className="material-symbols-outlined text-emerald-500 text-[16px] shrink-0 mt-0.5">
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
                    "w-full py-2.5 px-4 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5",
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
        <div className="mt-14 rounded-2xl p-6 sm:p-8 bg-gradient-to-br from-amber-500/10 via-purple-600/10 to-primary/10 border-2 border-amber-500/30 dark:border-amber-400/25 shadow-xl relative overflow-hidden">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6 pb-6 border-b border-slate-200 dark:border-slate-800">
            <div className="text-center lg:text-left space-y-1.5">
              <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-amber-500 text-amber-950 font-black text-[11px] tracking-wider uppercase shadow-xs">
                <span className="material-symbols-outlined text-[15px]">stars</span>
                Special Early Backer Offer
              </div>
              <h3 className="text-2xl font-black text-foreground tracking-tight">
                Founder 5-Year Access Pass
              </h3>
              <p className="text-xs text-muted-foreground max-w-lg">
                Pay once, write for 5 full years. Zero recurring monthly fees, locked-in generation limits, and priority AI routing.
              </p>
            </div>

            {/* Rolling 30-Day Scarcity Countdown Counter */}
            <div className="flex flex-col items-center sm:items-end gap-1.5 bg-background/90 p-3.5 rounded-xl border border-amber-500/30 shadow-sm">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-wider">
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
                  <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider bg-amber-500/15 text-amber-700 dark:text-amber-400">
                    Indie Author Deal
                  </span>
                  <span className="text-xs font-semibold text-rose-500 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">local_fire_department</span>
                    Only {Math.max(0, campaign.basicTotalSlots - campaign.basicClaimedSlots)} spots left
                  </span>
                </div>
                <h4 className="text-xl font-bold text-foreground">Founder Basic Pass</h4>
                <p className="text-xs text-muted-foreground mt-1">5-Year Full Basic Creator Access. Ideal for indie novelists.</p>

                <div className="my-4 pt-2 pb-3 border-y border-slate-200/80 dark:border-slate-800 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-foreground">${campaign.basicPrice}</span>
                  <span className="text-xs text-muted-foreground font-semibold">/ 5-Year Flat Pass</span>
                  <span className="ml-auto text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Save $146 vs Annual
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-emerald-500 text-[15px] shrink-0 mt-0.5">check_circle</span>
                    <span>5 Full Years (60 Months) of Basic Creator features</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-emerald-500 text-[15px] shrink-0 mt-0.5">check_circle</span>
                    <span>10 Ebook Projects & 20 Blogs generated each month</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-emerald-500 text-[15px] shrink-0 mt-0.5">check_circle</span>
                    <span>Rewrite passage tool & direct CMS publishing</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-emerald-500 text-[15px] shrink-0 mt-0.5">check_circle</span>
                    <span>Full commercial publishing rights & copyright</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleOpenCheckout("Basic")}
                  className="w-full py-2.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-amber-950 transition-all shadow-sm cursor-pointer"
                >
                  Claim Founder Basic (${campaign.basicPrice})
                </button>
              </div>
            </div>

            {/* 2. Founder Pro Pass */}
            <div className="p-6 rounded-xl bg-gradient-to-b from-primary/10 via-card to-card border-2 border-primary shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="px-2.5 py-0.5 rounded-full text-[10.5px] font-bold uppercase tracking-wider bg-primary/20 text-primary">
                    Pro Author & Agency Deal
                  </span>
                  <span className="text-xs font-semibold text-rose-500 flex items-center gap-1">
                    <span className="material-symbols-outlined text-[14px]">local_fire_department</span>
                    Only {Math.max(0, campaign.proTotalSlots - campaign.proClaimedSlots)} spots left
                  </span>
                </div>
                <h4 className="text-xl font-bold text-foreground">Founder Pro Pass</h4>
                <p className="text-xs text-muted-foreground mt-1">5-Year Full Pro Writer Access with Claude 3.5 & GPT-4o.</p>

                <div className="my-4 pt-2 pb-3 border-y border-slate-200/80 dark:border-slate-800 flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-foreground">${campaign.proPrice}</span>
                  <span className="text-xs text-muted-foreground font-semibold">/ 5-Year Flat Pass</span>
                  <span className="ml-auto text-[10.5px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                    Save $646 vs Annual
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-primary text-[15px] shrink-0 mt-0.5">verified</span>
                    <span>5 Full Years (60 Months) of Pro Writer features</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-primary text-[15px] shrink-0 mt-0.5">verified</span>
                    <span>50 Ebook Projects & 100 Blogs generated each month</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-primary text-[15px] shrink-0 mt-0.5">verified</span>
                    <span>Advanced AI Models: Claude 3.5 Sonnet, GPT-4o, DeepSeek</span>
                  </div>
                  <div className="flex items-start gap-2">
                    <span className="material-symbols-outlined text-primary text-[15px] shrink-0 mt-0.5">verified</span>
                    <span>BlogGen automated scheduled publishing pipelines</span>
                  </div>
                </div>
              </div>

              <div className="mt-6 pt-3 border-t border-slate-200/80 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => handleOpenCheckout("Pro")}
                  className="w-full py-2.5 px-3 rounded-lg text-xs font-bold uppercase tracking-wider btn-primary transition-all shadow-md shadow-primary/25 cursor-pointer"
                >
                  Claim Founder Pro (${campaign.proPrice})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Refer & Earn Section */}
      <div className="mt-14 panel p-7 border border-slate-200/90 dark:border-slate-800 bg-gradient-to-br from-indigo-500/5 via-primary/5 to-purple-500/5">
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
              <div className="px-3 py-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200 dark:border-slate-800 text-xs font-mono text-foreground select-all overflow-hidden text-ellipsis">
                {referralUrl}
              </div>
              <button
                type="button"
                onClick={copyReferralLink}
                className="btn btn-primary btn-sm flex items-center justify-center gap-1.5 shrink-0"
              >
                <span className="material-symbols-outlined text-[16px]">
                  {copiedReferral ? "check" : "content_copy"}
                </span>
                <span>{copiedReferral ? "Link Copied!" : "Copy Link"}</span>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 shrink-0 sm:min-w-[240px]">
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-center">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Referred
              </p>
              <p className="text-2xl font-extrabold text-foreground mt-1">
                {referrals.length}
              </p>
            </div>
            <div className="p-4 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 text-center">
              <p className="text-[11px] font-semibold text-muted-foreground uppercase tracking-wider">
                Rewards Active
              </p>
              <p className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400 mt-1">
                {referrals.filter((r) => r.status === "completed").length * 10}%
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Checkout Modal */}
      {selectedPlan && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in">
          <div className="relative w-full max-w-lg rounded-2xl bg-card border border-slate-200 dark:border-slate-800 p-6 shadow-2xl">
            <button
              onClick={() => setSelectedPlan(null)}
              className="absolute top-4 right-4 p-1 rounded-lg text-muted-foreground hover:text-foreground hover:bg-slate-100 dark:hover:bg-slate-800"
              type="button"
            >
              <span className="material-symbols-outlined text-lg">close</span>
            </button>

            {checkoutSuccess ? (
              <div className="text-center py-6">
                <span className="material-symbols-outlined text-emerald-500 text-5xl mb-2 animate-bounce">
                  check_circle
                </span>
                <h3 className="text-xl font-bold text-foreground">Welcome to {selectedPlan}!</h3>
                <p className="text-xs text-muted-foreground mt-1">
                  Your subscription has been activated successfully and your monthly quotas have been updated.
                </p>
              </div>
            ) : (
              <div>
                <h3 className="text-lg font-bold text-foreground">Complete Your Upgrade</h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Confirm your plan details below.
                </p>

                {/* Plan Summary */}
                <div className="mt-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-900/60 border border-slate-200/80 dark:border-slate-800">
                  <div className="flex justify-between items-center mb-1">
                    <span className="font-semibold text-sm text-foreground">{planDetails?.name}</span>
                    <span className="text-xs text-muted-foreground uppercase tracking-wider font-semibold">
                      {billingInterval}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-xs text-muted-foreground">
                    <span>Base Subscription</span>
                    <span>${basePrice}</span>
                  </div>
                  {couponDiscount > 0 && (
                    <div className="flex justify-between items-center text-xs text-emerald-600 dark:text-emerald-400 mt-1">
                      <span>Coupon Discount ({appliedCoupon?.code})</span>
                      <span>-${couponDiscount}</span>
                    </div>
                  )}
                  {referralDiscount > 0 && (
                    <div className="flex justify-between items-center text-xs text-indigo-600 dark:text-indigo-400 mt-1">
                      <span>Referral Bonus (10%)</span>
                      <span>-${referralDiscount}</span>
                    </div>
                  )}
                  <div className="pt-2 mt-2 border-t border-slate-200 dark:border-slate-800 flex justify-between items-center font-bold text-sm text-foreground">
                    <span>Total Due Today</span>
                    <span className="text-base text-primary">${finalPrice}</span>
                  </div>
                </div>

                {/* Coupon Input */}
                <div className="mt-4">
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Have a coupon code?
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      placeholder="e.g. WELCOME50"
                      value={couponCode}
                      onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                      className="input flex-1 uppercase text-xs"
                    />
                    <button
                      type="button"
                      onClick={handleApplyCoupon}
                      disabled={validatingCoupon || !couponCode.trim()}
                      className="btn btn-secondary btn-sm shrink-0"
                    >
                      {validatingCoupon ? "Checking…" : "Apply"}
                    </button>
                  </div>
                  {appliedCoupon && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1 font-medium">
                      <span className="material-symbols-outlined text-[14px]">check</span>
                      Coupon &quot;{appliedCoupon.code}&quot; applied (-${appliedCoupon.discountAmount})
                    </p>
                  )}
                  {couponError && (
                    <p className="text-[11px] text-rose-500 mt-1">{couponError}</p>
                  )}
                </div>

                {/* Referral Code */}
                <div className="mt-3">
                  <label className="text-xs font-semibold text-foreground block mb-1">
                    Referral Code (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. WD-ABC123"
                    value={referralCodeInput}
                    onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
                    className="input w-full uppercase text-xs"
                  />
                  {referralCodeInput.trim() && (
                    <p className="text-[11px] text-indigo-600 dark:text-indigo-400 mt-1 font-medium">
                      Referral discount active (10% off)
                    </p>
                  )}
                </div>

                {checkoutError && (
                  <p className="mt-3 text-xs text-rose-500 bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                    {checkoutError}
                  </p>
                )}

                {/* Checkout Trigger */}
                <div className="mt-6 flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={handleCompletePurchase}
                    disabled={isCheckingOut}
                    className="btn btn-primary w-full py-2.5 rounded-xl text-xs font-semibold justify-center flex items-center gap-2 shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[18px]">verified_user</span>
                    {isCheckingOut ? "Activating Subscription…" : `Activate ${selectedPlan} ($${finalPrice})`}
                  </button>
                  <p className="text-[10px] text-center text-muted-foreground mt-1">
                    Secure checkout. PayPal and credit card integration ready.
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
