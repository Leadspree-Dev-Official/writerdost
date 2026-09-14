"use client";

import React, { useEffect, useState } from "react";
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

  // Requests live in Appwrite so an admin can see them, which means this
  // screen has to ask whether one is already outstanding.
  useEffect(() => {
    void loadUpgradeRequests();
  }, [loadUpgradeRequests]);

  if (!currentUser) return null;

  // Check if there is already a pending request for this user and feature
  const isAlreadyRequested = upgradeRequests.some(
    (req) => req.userId === currentUser.id && req.feature === featureKey && req.status === "pending"
  );

  const handleRequest = async () => {
    const result = await requestFeatureUpgrade(currentUser.id, featureKey);
    if (result.success) {
      setSuccess(true);
      setError(null);
    } else {
      setError(result.error || "Could not send the request.");
    }
  };

  const planFeatures = [
    {
      name: "Basic Plan",
      desc: "Perfect for starting out",
      features: ["Create Ebook drafts"],
      highlight: currentUser.plan === "Basic",
    },
    {
      name: "Pro Plan",
      desc: "Ideal for power authors",
      features: ["Create Ebook drafts", "Rewrite passage tool", "Blog post generator"],
      highlight: currentUser.plan === "Pro",
    },
    {
      name: "Enterprise Plan",
      desc: "Unlimited AI control",
      features: [
        "Create Ebook drafts",
        "Rewrite passage tool",
        "Blog post generator",
        "Custom AI settings & keys",
      ],
      highlight: currentUser.plan === "Enterprise",
    },
  ];

  return (
    <div className="flex-1 flex items-center justify-center p-4 min-h-[calc(100vh-80px)]">
      <div className="relative w-full max-w-4xl rounded-[var(--radius-lg)] border border-white/[0.06] bg-slate-900/40 backdrop-blur-xl p-4 md:p-12 shadow-2xl overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-[-20%] left-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-500/10 blur-[100px] pointer-events-none" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-amber-500/5 blur-[100px] pointer-events-none" />

        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Glowing Shield Icon */}
          <div className="relative flex items-center justify-center w-12 h-12 rounded-[var(--radius-lg)] bg-primary/10 border border-white/10 mb-4">
            <svg
              className="w-10 h-10 text-indigo-400 animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
            <div className="absolute inset-0 rounded-[var(--radius-lg)] border border-indigo-500/20 scale-95 animate-ping [animation-duration:3s]" />
          </div>

          <h2 className="text-3xl font-semibold text-white tracking-tight">
            Access Restricted
          </h2>
          <p className="text-slate-400 max-w-lg mt-3 text-sm leading-relaxed">
            The <strong className="text-white font-semibold">{featureName}</strong> feature is not enabled for your account under the current <strong className="text-white font-semibold">{currentUser.plan} Plan</strong>.
          </p>

          {/* Action Trigger */}
          <div className="mt-8">
            {success || isAlreadyRequested ? (
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-[var(--radius)] bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-semibold">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Upgrade Request Pending Admin Review
              </div>
            ) : (
              <button
                onClick={handleRequest}
                className="btn btn-primary btn-lg relative group overflow-hidden"
              >
                Request Access from Admin
              </button>
            )}
            {error && (
              <p className="mt-3 text-xs font-semibold text-red-400">{error}</p>
            )}
          </div>

          {/* Plans Comparison Grid */}
          <div className="w-full grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-left">
            {planFeatures.map((plan, i) => (
              <div
                key={i}
                className={`relative rounded-[var(--radius-lg)] border p-4 flex flex-col justify-between transition-all duration-300 ${
                  plan.highlight
                    ? "bg-indigo-950/20 border-indigo-500/40 shadow-lg shadow-indigo-950/30"
                    : "bg-slate-950/30 border-white/[0.05]"
                }`}
              >
                {plan.highlight && (
                  <span className="absolute top-3 right-3 text-[10px] font-bold bg-indigo-500/20 text-indigo-300 px-2 py-0.5 rounded-full">
                    Current Plan
                  </span>
                )}
                <div>
                  <h3 className="text-base font-bold text-white">{plan.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">{plan.desc}</p>
                  
                  <ul className="mt-5 space-y-3">
                    {plan.features.map((feat, fi) => (
                      <li key={fi} className="flex items-start gap-2 text-xs text-slate-300">
                        <svg
                          className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2.5}
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
