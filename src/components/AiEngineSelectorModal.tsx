"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/app-store";
import { GenerationEngine, getDisplayedCreditEstimate } from "@/lib/store-types";
import { CoinsIcon } from "@/components/ui/CoinsIcon";
import clsx from "clsx";

interface AiEngineSelectorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (engine: GenerationEngine) => void;
  taskType: "project" | "blog" | "rewrite";
  taskTitle?: string;
  targetWords?: number;
}

export function AiEngineSelectorModal({
  isOpen,
  onClose,
  onConfirm,
  taskType,
  taskTitle,
  targetWords,
}: AiEngineSelectorModalProps) {
  const api = useAppStore((state) => state.api);
  const byokModels = useAppStore((state) => state.byokModels || []);
  const activeByokModelId = useAppStore((state) => state.activeByokModelId);
  const setDefaultByokModel = useAppStore((state) => state.setDefaultByokModel);
  const preferredEngine = useAppStore((state) => state.preferredEngine);
  const setPreferredEngine = useAppStore((state) => state.setPreferredEngine);
  const checkQuota = useAppStore((state) => state.checkQuota);
  const currentUser = useAppStore((state) => state.currentUser);
  const storeCredits = useAppStore((state) => state.userCredits);
  const userCredits = currentUser?.credits ?? storeCredits ?? 50_000;

  const [selectedEngine, setSelectedEngine] = useState<GenerationEngine>(preferredEngine || "bizai");

  if (!isOpen) return null;

  const hasByokConfigured = Boolean(api.apiKey || api.provider === "ollama");
  const displayedCredits = targetWords
    ? getDisplayedCreditEstimate(targetWords)
    : taskType === "blog" ? 15 : 8;
  const quotaCheckBizai = checkQuota(taskType === "rewrite" ? "project" : taskType, "bizai");

  const canUseBizai = quotaCheckBizai.source === "plan_quota" ? true : userCredits >= 5;
  const canUseByok = hasByokConfigured;

  const handleSelect = (engine: GenerationEngine) => {
    setSelectedEngine(engine);
    setPreferredEngine(engine);
  };

  const handleExecute = () => {
    if (selectedEngine === "bizai" && !canUseBizai) return;
    if (selectedEngine === "byok" && !canUseByok) return;
    onConfirm(selectedEngine);
  };

  const taskLabel =
    taskType === "project" ? "Ebook Project" : taskType === "blog" ? "Blog Post" : "Rewrite Passage";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-body overflow-y-auto"
      role="dialog"
      aria-modal="true"
      aria-labelledby="ai-engine-selector-title"
    >
      <div className="relative w-full max-w-lg bg-surface-container border border-outline-variant/30 rounded-2xl shadow-2xl overflow-hidden text-on-surface my-auto">
        {/* Top Accent Strip */}
        <div className="h-1.5 w-full bg-gradient-to-r from-indigo-500 via-primary to-amber-500" />

        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors z-10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
          type="button"
          aria-label="Close engine selector"
        >
          <span className="material-symbols-outlined text-lg">close</span>
        </button>

        <div className="p-6 space-y-5">
          {/* Header */}
          <div className="flex items-center gap-3 pr-8">
            <span className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-600 via-primary to-amber-500 text-white flex items-center justify-center shadow-md shrink-0">
              <span className="material-symbols-outlined text-xl">psychology</span>
            </span>
            <div>
              <h3 id="ai-engine-selector-title" className="text-lg font-bold text-on-surface tracking-tight">
                Select Generation Engine
              </h3>
              <p className="text-xs text-on-surface-variant">
                {taskTitle ? `Ready to draft "${taskTitle}"` : `Ready to generate ${taskLabel}`}
              </p>
            </div>
          </div>

          {/* Engine Options */}
          <div className="space-y-3">
            {/* 1. BizAI Gateway Card */}
            <div
              onClick={() => handleSelect("bizai")}
              className={clsx(
                "p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 relative",
                selectedEngine === "bizai"
                  ? "bg-surface-container-high/60 border-primary shadow-sm ring-1 ring-primary/40"
                  : "bg-surface-container-low/80 border-outline-variant/30 hover:border-outline-variant/60"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-lg">bolt</span>
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-on-surface">BizAI Managed Gateway</h4>
                      <span className="text-xs uppercase font-bold px-2 py-0.5 rounded-full bg-primary/20 text-primary">
                        Recommended
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      Auto-routed Claude 3.5 Sonnet, GPT-4o &amp; Gemini 1.5 Pro. Zero setup required.
                    </p>
                  </div>
                </div>

                <div className="shrink-0 mt-0.5">
                  <span
                    className={clsx(
                      "w-4 h-4 rounded-full border flex items-center justify-center",
                      selectedEngine === "bizai" ? "border-primary bg-primary text-white" : "border-outline-variant"
                    )}
                  >
                    {selectedEngine === "bizai" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                </div>
              </div>

              {/* Status & Balance Banner */}
              <div className="pt-2 mt-1 border-t border-outline-variant/20 flex flex-wrap items-center justify-between gap-2 text-xs">
                {quotaCheckBizai.source === "plan_quota" ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    Covered by monthly plan quota ({quotaCheckBizai.limit === -1 ? "Unlimited" : `${quotaCheckBizai.used}/${quotaCheckBizai.limit} used`})
                  </span>
                ) : quotaCheckBizai.source === "credits" ? (
                  <span className="text-amber-400 font-medium flex items-center gap-1.5">
                    <CoinsIcon className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                    <span>~{displayedCredits.toLocaleString()} approx. credits • Balance: {userCredits.toLocaleString()} credits</span>
                  </span>
                ) : (
                  <span className="text-rose-400 font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">error</span>
                    Plan quota exhausted &amp; insufficient credits ({userCredits.toLocaleString()} available, min 5 credits required)
                  </span>
                )}

                {!canUseBizai && (
                  <Link
                    href="/pricing"
                    onClick={onClose}
                    className="text-primary hover:underline font-bold text-xs"
                  >
                    Top-Up Credits &rarr;
                  </Link>
                )}
              </div>
            </div>

            {/* 2. BYOK Custom Models Card */}
            <div
              onClick={() => handleSelect("byok")}
              className={clsx(
                "p-4 rounded-xl border transition-all cursor-pointer flex flex-col gap-2 relative",
                selectedEngine === "byok"
                  ? "bg-surface-container-high/60 border-primary shadow-sm ring-1 ring-primary/40"
                  : "bg-surface-container-low/80 border-outline-variant/30 hover:border-outline-variant/60"
              )}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-8 h-8 rounded-lg bg-emerald-500/15 text-emerald-400 flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-lg">key</span>
                  </span>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-on-surface">BYOK / Custom Models</h4>
                      <span className="text-xs uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400">
                        100% Free &amp; Unlimited
                      </span>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-0.5">
                      {hasByokConfigured
                        ? `Using: ${api.provider.toUpperCase()} (${api.model || "Default Model"}).`
                        : "Bring your own OpenAI, Claude, DeepSeek, or Ollama API key."}
                    </p>
                  </div>
                </div>

                <div className="shrink-0 mt-0.5">
                  <span
                    className={clsx(
                      "w-4 h-4 rounded-full border flex items-center justify-center",
                      selectedEngine === "byok" ? "border-primary bg-primary text-white" : "border-outline-variant"
                    )}
                  >
                    {selectedEngine === "byok" && <span className="w-1.5 h-1.5 rounded-full bg-white" />}
                  </span>
                </div>
              </div>

              {/* If multiple BYOK models are added, give options to select which BYOK model to use */}
              {selectedEngine === "byok" && byokModels.length > 1 && (
                <div
                  className="mt-2 pt-2 border-t border-outline-variant/20 space-y-1.5"
                  onClick={(e) => e.stopPropagation()}
                >
                  <div className="flex items-center justify-between text-xs">
                    <label className="font-semibold text-on-surface flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px] text-emerald-400">smart_toy</span>
                      Select Model for Generation:
                    </label>
                    <span className="text-[10px] text-on-surface-variant font-mono">
                      {byokModels.length} models
                    </span>
                  </div>
                  <select
                    value={activeByokModelId || byokModels.find((m) => m.isDefault)?.id || byokModels[0].id}
                    onChange={(e) => {
                      setDefaultByokModel(e.target.value);
                    }}
                    className="select select-sm w-full text-xs font-medium bg-surface-container border-outline-variant/40"
                  >
                    {byokModels.map((m) => (
                      <option key={m.id} value={m.id} className="text-black">
                        {m.name} ({m.provider.toUpperCase()} - {m.model}) {m.isDefault ? "★ Default" : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Status / Configuration Link */}
              <div className="pt-2 mt-1 border-t border-outline-variant/20 flex items-center justify-between text-xs">
                {hasByokConfigured ? (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">verified</span>
                    Zero platform credits used • Unlimited generations
                  </span>
                ) : (
                  <span className="text-amber-400 font-medium flex items-center gap-1">
                    <span className="material-symbols-outlined text-sm">warning</span>
                    No custom API key detected
                  </span>
                )}

                <Link
                  href="/settings"
                  onClick={onClose}
                  className="text-on-surface-variant hover:text-on-surface underline text-xs font-medium"
                >
                  {hasByokConfigured ? "Change Model" : "Add API Key"}
                </Link>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="pt-3 border-t border-outline-variant/20 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleExecute}
              disabled={selectedEngine === "bizai" ? !canUseBizai : !canUseByok}
              className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-gradient-to-r from-indigo-600 via-primary to-amber-500 hover:brightness-110 active:scale-[0.99] text-white shadow-md shadow-indigo-600/25 flex items-center gap-2 transition-all disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-sm">auto_awesome</span>
              <span>
                {selectedEngine === "bizai"
                  ? quotaCheckBizai.source === "plan_quota"
                    ? "Generate with BizAI (Plan Quota)"
                    : "Generate with BizAI"
                  : "Generate with BYOK (Unlimited)"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
