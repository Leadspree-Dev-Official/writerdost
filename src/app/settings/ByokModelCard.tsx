"use client";

import { useState } from "react";
import type { ByokModelConfig } from "@/lib/store-types";
import { generateAiText } from "@/lib/ai-client";

interface ByokModelCardProps {
  model: ByokModelConfig;
  isOnlyModel: boolean;
  onSetDefault: (id: string) => void;
  onEdit: (model: ByokModelConfig) => void;
  onResetUsage: (id: string) => void;
  onDelete: (id: string) => void;
}

const formatTokens = (tokens: number) => {
  if (tokens >= 1_000_000) return (tokens / 1_000_000).toFixed(2) + "M";
  if (tokens >= 10_000) return (tokens / 1_000).toFixed(0) + "K";
  if (tokens >= 1_000) return (tokens / 1_000).toFixed(1) + "K";
  return tokens.toLocaleString();
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
};

const formatLastUsed = (timestamp?: number) => {
  if (!timestamp) return "Never used";
  const diffMinutes = Math.floor((Date.now() - timestamp) / 60000);
  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};

export function ByokModelCard({
  model,
  isOnlyModel,
  onSetDefault,
  onEdit,
  onResetUsage,
  onDelete,
}: ByokModelCardProps) {
  const [testing, setTesting] = useState(false);
  const [testStatus, setTestStatus] = useState<"idle" | "success" | "error">("idle");
  const [testMessage, setTestMessage] = useState("");

  const inputCost = (model.usage.inputTokens / 1_000_000) * model.inputTokenRate;
  const outputCost = (model.usage.outputTokens / 1_000_000) * model.outputTokenRate;
  const totalCost = model.usage.totalCost || (inputCost + outputCost);
  const totalTokens = model.usage.totalTokens || (model.usage.inputTokens + model.usage.outputTokens);

  // Input vs Output ratio for the progress bar
  const inputRatio = totalTokens > 0 ? (model.usage.inputTokens / totalTokens) * 100 : 50;
  const outputRatio = totalTokens > 0 ? (model.usage.outputTokens / totalTokens) * 100 : 50;

  const handleTest = async () => {
    setTesting(true);
    setTestStatus("idle");
    setTestMessage("");
    try {
      await generateAiText({
        api: {
          provider: model.provider,
          apiKey: model.apiKey,
          baseUrl: model.baseUrl,
          model: model.model,
          appName: "Writerdost AI",
          siteUrl: typeof window !== "undefined" ? window.location.origin : "",
        },
        systemPrompt: "Respond with 'OK'.",
        userPrompt: "Ping",
        temperature: 0.1,
      });
      setTestStatus("success");
      setTestMessage("Connected!");
      setTimeout(() => setTestStatus("idle"), 4000);
    } catch (err) {
      setTestStatus("error");
      setTestMessage(err instanceof Error ? err.message : "Failed");
      setTimeout(() => setTestStatus("idle"), 5000);
    } finally {
      setTesting(false);
    }
  };

  const providerColorClass =
    model.provider === "openai"
      ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
      : model.provider === "claude"
      ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
      : model.provider === "deepseek"
      ? "bg-blue-500/10 text-blue-400 border-blue-500/20"
      : model.provider === "gemini"
      ? "bg-cyan-500/10 text-cyan-400 border-cyan-500/20"
      : "bg-purple-500/10 text-purple-400 border-purple-500/20";

  return (
    <div
      className={`panel p-4 transition-all duration-200 space-y-3.5 border ${
        model.isDefault
          ? "border-primary/50 shadow-sm bg-surface-container/90 ring-1 ring-primary/20"
          : "border-outline-variant/30 bg-surface-container-low hover:border-outline-variant/60"
      }`}
    >
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider border ${providerColorClass}`}>
            {model.provider}
          </span>
          <h4 className="font-bold text-sm text-on-surface truncate" title={model.name}>
            {model.name}
          </h4>
          <span className="text-xs text-on-surface-variant font-mono bg-surface-container-highest px-1.5 py-0.5 rounded">
            {model.model}
          </span>
        </div>

        <div className="flex items-center gap-1.5 ml-auto">
          {model.isDefault ? (
            <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/30">
              <span className="material-symbols-outlined text-[13px]">check_circle</span>
              Default Model
            </span>
          ) : (
            <button
              type="button"
              onClick={() => onSetDefault(model.id)}
              className="btn btn-ghost btn-sm text-xs text-on-surface-variant hover:text-primary py-0.5 h-auto"
            >
              Set as Default
            </button>
          )}

          <div className="h-3 w-[1px] bg-outline-variant/30 mx-0.5" />

          {/* Test button */}
          <button
            type="button"
            onClick={handleTest}
            disabled={testing}
            title="Test connection to this model"
            className="btn btn-ghost btn-sm text-xs p-1 h-auto text-on-surface-variant hover:text-on-surface"
          >
            <span className={`material-symbols-outlined text-[16px] ${testing ? "animate-spin text-primary" : ""}`}>
              {testing ? "sync" : "cable"}
            </span>
          </button>

          {/* Edit button */}
          <button
            type="button"
            onClick={() => onEdit(model)}
            title="Edit configuration"
            className="btn btn-ghost btn-sm text-xs p-1 h-auto text-on-surface-variant hover:text-primary"
          >
            <span className="material-symbols-outlined text-[16px]">tune</span>
          </button>

          {/* Reset usage button */}
          <button
            type="button"
            onClick={() => {
              if (confirm(`Reset usage statistics for "${model.name}"?`)) {
                onResetUsage(model.id);
              }
            }}
            title="Reset model usage"
            className="btn btn-ghost btn-sm text-xs p-1 h-auto text-on-surface-variant hover:text-amber-400"
          >
            <span className="material-symbols-outlined text-[16px]">restart_alt</span>
          </button>

          {/* Delete button (hidden if only model) */}
          {!isOnlyModel && (
            <button
              type="button"
              onClick={() => {
                if (confirm(`Delete BYOK model "${model.name}"?`)) {
                  onDelete(model.id);
                }
              }}
              title="Delete model"
              className="btn btn-ghost btn-sm text-xs p-1 h-auto text-on-surface-variant hover:text-rose-400"
            >
              <span className="material-symbols-outlined text-[16px]">delete</span>
            </button>
          )}
        </div>
      </div>

      {/* Test feedback toast line */}
      {testMessage && (
        <div
          className={`text-xs px-2.5 py-1 rounded-lg flex items-center gap-1.5 animate-fade-in ${
            testStatus === "success"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
          }`}
        >
          <span className="material-symbols-outlined text-[14px]">
            {testStatus === "success" ? "check_circle" : "error"}
          </span>
          <span className="truncate">{testMessage}</span>
        </div>
      )}

      {/* Usage Meter Section */}
      <div className="bg-surface-container-highest/40 rounded-xl p-3 space-y-2.5 border border-outline-variant/15">
        {/* Progress Meter Bar */}
        <div className="space-y-1">
          <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-indigo-500 inline-block" />
              Input: {totalTokens > 0 ? `${inputRatio.toFixed(0)}%` : "0%"}
            </span>
            <span className="font-semibold text-on-surface">
              {formatTokens(totalTokens)} tokens • {formatCurrency(totalCost)}
            </span>
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-amber-500 inline-block" />
              Output: {totalTokens > 0 ? `${outputRatio.toFixed(0)}%` : "0%"}
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-surface-container-high overflow-hidden flex">
            {totalTokens > 0 ? (
              <>
                <div
                  style={{ width: `${inputRatio}%` }}
                  className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300"
                  title={`Input tokens: ${formatTokens(model.usage.inputTokens)}`}
                />
                <div
                  style={{ width: `${outputRatio}%` }}
                  className="h-full bg-gradient-to-r from-amber-500 to-rose-500 transition-all duration-300"
                  title={`Output tokens: ${formatTokens(model.usage.outputTokens)}`}
                />
              </>
            ) : (
              <div className="w-full h-full bg-outline-variant/20" />
            )}
          </div>
        </div>

        {/* Detailed Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
          {/* Input details */}
          <div className="bg-surface-container/60 p-2 rounded-lg border border-outline-variant/10">
            <p className="text-[10px] text-on-surface-variant uppercase font-medium">Input Usage</p>
            <p className="font-bold text-on-surface mt-0.5">{formatTokens(model.usage.inputTokens)}</p>
            <p className="text-[11px] text-indigo-400 font-mono">{formatCurrency(inputCost)}</p>
            <p className="text-[10px] text-on-surface-variant mt-0.5">${model.inputTokenRate.toFixed(2)}/1M</p>
          </div>

          {/* Output details */}
          <div className="bg-surface-container/60 p-2 rounded-lg border border-outline-variant/10">
            <p className="text-[10px] text-on-surface-variant uppercase font-medium">Output Usage</p>
            <p className="font-bold text-on-surface mt-0.5">{formatTokens(model.usage.outputTokens)}</p>
            <p className="text-[11px] text-amber-400 font-mono">{formatCurrency(outputCost)}</p>
            <p className="text-[10px] text-on-surface-variant mt-0.5">${model.outputTokenRate.toFixed(2)}/1M</p>
          </div>

          {/* Total Cost */}
          <div className="bg-surface-container/60 p-2 rounded-lg border border-outline-variant/10">
            <p className="text-[10px] text-on-surface-variant uppercase font-medium">Total Spend</p>
            <p className="font-bold text-emerald-400 text-sm mt-0.5 font-mono">{formatCurrency(totalCost)}</p>
            <p className="text-[10px] text-on-surface-variant mt-0.5">Calculated cost</p>
          </div>

          {/* Requests & Activity */}
          <div className="bg-surface-container/60 p-2 rounded-lg border border-outline-variant/10">
            <p className="text-[10px] text-on-surface-variant uppercase font-medium">Activity</p>
            <p className="font-bold text-on-surface mt-0.5">{model.usage.totalRequests} reqs</p>
            <p className="text-[10px] text-on-surface-variant mt-0.5 truncate">
              {formatLastUsed(model.usage.lastUsedAt)}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
