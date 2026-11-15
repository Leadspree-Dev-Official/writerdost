"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/app-store";

interface AccessLockedProps {
  featureName: string;
  featureKey: "createEbook" | "rewriteEbook" | "blogGenerator" | "advancedModels";
}

export default function AccessLocked({ featureName, featureKey }: AccessLockedProps) {
  const currentUser = useAppStore((state) => state.currentUser);
  const upgradeRequests = useAppStore((state) => state.upgradeRequests);
  const requestFeatureUpgrade = useAppStore((state) => state.requestFeatureUpgrade);
  const loadUpgradeRequests = useAppStore((state) => state.loadUpgradeRequests);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadUpgradeRequests();
  }, [loadUpgradeRequests]);

  if (!currentUser) return null;

  const isAlreadyRequested = upgradeRequests.some(
    (req) => req.userId === currentUser.id && req.feature === featureKey && req.status === "pending"
  );

  const handleRequest = async () => {
    const result = await requestFeatureUpgrade(currentUser.id, featureKey);
    if (result.success) {
      setSuccess(true);
      setError(null);
    } else {
      setError(result.error || "Could not send upgrade request.");
    }
  };

  const planMatrix = [
    {
      id: "Basic",
      name: "Basic Creator",
      price: "$5/mo",
      annual: "$49/yr",
      desc: "Unlock Rewrite Passage & steadily publish books and blogs.",
      features: [
        "10 Ebook projects per month",
        "20 Blog posts per month",
        "Rewrite passage tool included",
        "Direct CMS publishing",
      ],
      isTarget: featureKey === "rewriteEbook",
      highlight: currentUser.plan === "Basic",
    },
    {
      id: "Pro",
      name: "Pro Writer",
      price: "$19/mo",
      annual: "$189/yr",
      desc: "Full creative firepower with Claude 3.5 Sonnet & OpenAI models.",
      features: [
        "50 Ebooks & 100 Blog articles/mo",
        "Advanced models (Claude, GPT-4o, DeepSeek)",
        "BlogGen automated pipelines",
        "Priority AI generation speed",
      ],
      isTarget: featureKey === "blogGenerator" || featureKey === "advancedModels",
      highlight: currentUser.plan === "Pro",
    },
    {
      id: "Founder",
      name: "Founder 5-Year Pass",
      price: "$99 or $299",
      annual: "5-Year Flat",
      desc: "Pay once, write for 5 full years. Zero monthly renewals.",
      features: [
        "Founder Basic ($99) or Pro ($299)",
        "5 Full Years of access locked in",
        "Commercial publishing license",
        "Early Backer profile badge",
      ],
      isTarget: false,
      highlight: false,
    },
  ];

  return (
    <div className="flex-1 flex items-center justify-center p-4 sm:p-6 min-h-[calc(100vh-80px)] font-body">
      <div className="relative w-full max-w-4xl rounded-3xl border border-outline-variant/30 bg-surface-container-lowest dark:bg-[#121224] p-6 sm:p-10 md:p-12 shadow-2xl overflow-hidden">
        
        {/* Subtle Ambient Glow */}
        <div className="absolute -top-24 -left-24 w-72 h-72 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 rounded-full bg-amber-500/10 blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center">
          
          {/* Lock Icon Badge */}
          <div className="w-16 h-16 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mb-5 text-primary shadow-sm">
            <span className="material-symbols-outlined text-[32px]">lock</span>
          </div>

          <span className="text-[11px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 mb-3">
            Upgrade Required
          </span>

          <h2 className="text-2xl sm:text-3xl font-black text-on-surface tracking-tight">
            Unlock {featureName}
          </h2>

          <p className="text-sm sm:text-base text-on-surface-variant max-w-xl mt-3 leading-relaxed">
            The <strong className="text-on-surface font-bold">{featureName}</strong> tool is not included in the <strong className="text-on-surface font-bold">{currentUser.plan}</strong> tier. Upgrade starting at just <strong className="text-primary font-bold">$5/month</strong> to unlock it immediately.
          </p>

          {/* Action Buttons */}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link
              href="/pricing"
              className="btn btn-primary px-6 py-3 rounded-xl text-xs font-bold shadow-md shadow-primary/25 flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">workspace_premium</span>
              <span>Upgrade Plan (From $5/mo)</span>
            </Link>

            <Link
              href="/login"
              className="btn btn-secondary px-5 py-3 rounded-xl text-xs font-bold border border-outline-variant/40 flex items-center gap-2 cursor-pointer"
            >
              <span className="material-symbols-outlined text-[18px]">bolt</span>
              <span>Try in 1-Click Demo</span>
            </Link>

            {success || isAlreadyRequested ? (
              <div className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
                <span className="material-symbols-outlined text-[16px]">check_circle</span>
                <span>Upgrade Request Pending Review</span>
              </div>
            ) : (
              <button
                type="button"
                onClick={handleRequest}
                className="px-5 py-3 rounded-xl text-xs font-bold text-on-surface-variant hover:text-on-surface border border-outline-variant/30 hover:border-outline-variant transition-all cursor-pointer"
              >
                Request Free Admin Access
              </button>
            )}
          </div>

          {error && (
            <p className="mt-3 text-xs font-bold text-rose-500">{error}</p>
          )}

          {/* Plan Comparison Cards */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-5 mt-10 text-left">
            {planMatrix.map((item, idx) => (
              <div
                key={idx}
                className={`relative rounded-2xl p-5 border transition-all flex flex-col justify-between ${
                  item.isTarget
                    ? "bg-primary/5 border-primary shadow-md ring-1 ring-primary/40"
                    : "bg-surface-container-lowest dark:bg-[#16162a] border-outline-variant/30"
                }`}
              >
                {item.isTarget && (
                  <span className="absolute -top-2.5 right-4 text-[10px] font-black uppercase tracking-wider bg-primary text-white px-2.5 py-0.5 rounded-full shadow-xs">
                    Recommended
                  </span>
                )}
                {item.highlight && (
                  <span className="absolute -top-2.5 right-4 text-[10px] font-black uppercase tracking-wider bg-surface-container border border-outline-variant/40 text-on-surface-variant px-2.5 py-0.5 rounded-full shadow-xs">
                    Current Plan
                  </span>
                )}

                <div>
                  <div className="flex items-center justify-between gap-2">
                    <h4 className="text-base font-black text-on-surface">{item.name}</h4>
                  </div>
                  <p className="text-xs text-on-surface-variant mt-1">{item.desc}</p>
                  
                  <div className="my-4 pt-2 pb-3 border-y border-outline-variant/20 flex items-baseline gap-1.5">
                    <span className="text-2xl font-black text-on-surface">{item.price}</span>
                    <span className="text-[11px] text-on-surface-variant font-medium">({item.annual})</span>
                  </div>

                  <div className="space-y-1.5">
                    {item.features.map((f, fIdx) => (
                      <div key={fIdx} className="flex items-start gap-2 text-xs text-on-surface/90">
                        <span className="material-symbols-outlined text-emerald-500 text-[15px] shrink-0 mt-0.5">
                          check_circle
                        </span>
                        <span>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="mt-5 pt-3 border-t border-outline-variant/20">
                  <Link
                    href="/pricing"
                    className="w-full py-2 px-3 rounded-lg text-xs font-bold text-center block bg-surface-container hover:bg-surface-container-high transition-colors text-on-surface"
                  >
                    View & Upgrade &rarr;
                  </Link>
                </div>
              </div>
            ))}
          </div>

        </div>
      </div>
    </div>
  );
}
