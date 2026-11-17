"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/app-store";
import type { ByokModelConfig } from "@/lib/store-types";
import { ByokModelCard } from "./ByokModelCard";
import { ByokModelModal } from "./ByokModelModal";

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

export function AiSettingsTab() {
  const settings = useAppStore((state) => state.settings);
  const byokModels = useAppStore((state) => state.byokModels || []);
  const usage = useAppStore((state) => state.usage);
  const preferredEngine = useAppStore((state) => state.preferredEngine);
  const setPreferredEngine = useAppStore((state) => state.setPreferredEngine);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const addByokModel = useAppStore((state) => state.addByokModel);
  const updateByokModel = useAppStore((state) => state.updateByokModel);
  const removeByokModel = useAppStore((state) => state.removeByokModel);
  const setDefaultByokModel = useAppStore((state) => state.setDefaultByokModel);
  const resetByokModelUsage = useAppStore((state) => state.resetByokModelUsage);
  const resetAllByokUsage = useAppStore((state) => state.resetAllByokUsage);
  const saveWorkspaceNow = useAppStore((state) => state.saveWorkspaceNow);
  const workspaceSaving = useAppStore((state) => state.workspaceSaving);

  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [saveMessage, setSaveMessage] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingModel, setEditingModel] = useState<ByokModelConfig | null>(null);

  // Collated usage statistics calculation
  const sumModelTokens = byokModels.reduce((acc, m) => acc + (m.usage?.totalTokens || 0), 0);
  const sumModelInputTokens = byokModels.reduce((acc, m) => acc + (m.usage?.inputTokens || 0), 0);
  const sumModelOutputTokens = byokModels.reduce((acc, m) => acc + (m.usage?.outputTokens || 0), 0);
  const sumModelCost = byokModels.reduce((acc, m) => acc + (m.usage?.totalCost || 0), 0);
  const sumModelRequests = byokModels.reduce((acc, m) => acc + (m.usage?.totalRequests || 0), 0);

  const collatedTokens = Math.max(usage.totalTokens, sumModelTokens);
  const collatedCost = Math.max(usage.totalCost, sumModelCost);
  const collatedRequests = Math.max(usage.totalRequests, sumModelRequests);

  const handleOpenAddModal = () => {
    setEditingModel(null);
    setModalOpen(true);
  };

  const handleOpenEditModal = (model: ByokModelConfig) => {
    setEditingModel(model);
    setModalOpen(true);
  };

  const handleSaveModel = (config: Omit<ByokModelConfig, "id" | "createdAt" | "usage">) => {
    if (editingModel) {
      updateByokModel(editingModel.id, config);
      setSaveMessage(`Updated "${config.name}".`);
    } else {
      const newId = addByokModel(config);
      setSaveMessage(`Added "${config.name}".`);
      if (config.isDefault) {
        setDefaultByokModel(newId);
      }
    }
    setTimeout(() => setSaveMessage(""), 3500);
  };

  // Color palette for model distribution bar
  const MODEL_COLORS = ["#3b82f6", "#8b5cf6", "#ec4899", "#10b981", "#f59e0b", "#06b6d4"];

  return (
    <div className="space-y-4">
      {/* Top Action Header */}
      <div className="flex items-center justify-between gap-3 flex-wrap -mt-1">
        <div>
          <h2 className="text-lg font-bold text-on-surface">AI &amp; Model Configurations</h2>
          <p className="text-xs text-on-surface-variant">
            Manage your Bring-Your-Own-Key (BYOK) LLM models, per-model usage meters, and collated metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            className="btn btn-ghost btn-sm"
            onClick={() =>
              updateSettings({
                defaultModel: "GPT-4o (OpenAI)",
                creativeMode: true,
                longFormFocus: false,
                temperature: 0.75,
                topP: 0.9,
              })
            }
            type="button"
          >
            Reset controls
          </button>
          <button
            className={`btn btn-primary btn-sm min-w-[130px] flex items-center justify-center gap-1.5 transition-all duration-200 ${
              saveStatus === "saved"
                ? "!bg-emerald-600 hover:!bg-emerald-500 !text-white border-transparent"
                : saveStatus === "error"
                ? "!bg-rose-600 hover:!bg-rose-500 !text-white border-transparent"
                : ""
            }`}
            onClick={async () => {
              setSaveStatus("saving");
              try {
                await saveWorkspaceNow(true);
                const currentError = useAppStore.getState().workspaceError;
                if (currentError) {
                  setSaveStatus("error");
                  setSaveMessage(`Save failed: ${currentError}`);
                  setTimeout(() => setSaveStatus("idle"), 4000);
                } else {
                  setSaveStatus("saved");
                  setSaveMessage("Settings and models saved securely to your workspace.");
                  setTimeout(() => setSaveStatus("idle"), 2500);
                }
              } catch (err) {
                setSaveStatus("error");
                setSaveMessage(err instanceof Error ? err.message : "Failed to save settings.");
                setTimeout(() => setSaveStatus("idle"), 4000);
              }
            }}
            disabled={saveStatus === "saving" || workspaceSaving}
            type="button"
          >
            {saveStatus === "saving" || (workspaceSaving && saveStatus !== "saved") ? (
              <>
                <span className="material-symbols-outlined text-[15px] animate-spin">sync</span>
                <span>Saving…</span>
              </>
            ) : saveStatus === "saved" ? (
              <>
                <span className="material-symbols-outlined text-[15px]">check</span>
                <span>Saved!</span>
              </>
            ) : saveStatus === "error" ? (
              <>
                <span className="material-symbols-outlined text-[15px]">error</span>
                <span>Failed</span>
              </>
            ) : (
              <>
                <span className="material-symbols-outlined text-[15px]">save</span>
                <span>Save changes</span>
              </>
            )}
          </button>
        </div>
      </div>

      {saveMessage && (
        <div
          className={`rounded-xl p-3 text-xs flex items-center gap-2 ${
            saveMessage.toLowerCase().includes("failed") || saveMessage.toLowerCase().includes("error")
              ? "bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-rose-700 dark:text-rose-400"
              : "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
          }`}
        >
          <span className="material-symbols-outlined text-sm">
            {saveMessage.toLowerCase().includes("error") ? "error" : "check_circle"}
          </span>
          <span>{saveMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_18rem] gap-4 items-start">
        <div className="min-w-0 space-y-4">
          {/* Active Generation Engine Pill */}
          <div className="panel p-3.5 flex items-center justify-between flex-wrap gap-3 bg-surface border border-[var(--hairline)]">
            <div className="flex items-center gap-2.5">
              <span
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                  preferredEngine === "byok" || byokModels.length > 0
                    ? "bg-emerald-500/15 text-emerald-500"
                    : "bg-primary/15 text-primary"
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {preferredEngine === "byok" || byokModels.length > 0 ? "key" : "bolt"}
                </span>
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-on-surface">
                    Active Engine:{" "}
                    {preferredEngine === "byok" || byokModels.length > 0
                      ? "BYOK Custom Key"
                      : "BizAI Managed Gateway"}
                  </span>
                  <span
                    className={`chip text-[9px] uppercase font-bold ${
                      preferredEngine === "byok" || byokModels.length > 0
                        ? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                        : "chip-primary"
                    }`}
                  >
                    {preferredEngine === "byok" || byokModels.length > 0
                      ? "0 Credits • Free"
                      : "Credits / Plan Quota"}
                  </span>
                </div>
                <p className="text-[11.5px] text-on-surface-variant mt-0.5">
                  {preferredEngine === "byok" || byokModels.length > 0
                    ? "Generating with your own BYOK models. Zero platform credits are required or deducted."
                    : "Using platform-managed keys. Usage draws from your plan quota or wallet credits."}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5 bg-surface-variant/40 p-1 rounded-lg border border-[var(--hairline)]">
              <button
                type="button"
                onClick={() => setPreferredEngine("byok")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  preferredEngine === "byok" || byokModels.length > 0
                    ? "bg-primary text-white shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                BYOK Mode
              </button>
              <button
                type="button"
                onClick={() => setPreferredEngine("bizai")}
                className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                  preferredEngine === "bizai"
                    ? "bg-primary text-white shadow-xs"
                    : "text-on-surface-variant hover:text-on-surface"
                }`}
              >
                BizAI Mode
              </button>
            </div>
          </div>

          {/* BYOK Models Section */}
          <section className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-xl">smart_toy</span>
                <div>
                  <h3 className="section-title">Configured BYOK Models</h3>
                  <p className="text-xs text-on-surface-variant">
                    {byokModels.length} model{byokModels.length === 1 ? "" : "s"} configured with dedicated usage meters
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenAddModal}
                className="btn btn-primary btn-sm flex items-center gap-1.5 shadow-sm"
              >
                <span className="material-symbols-outlined text-[16px]">add</span>
                <span>Add BYOK Model</span>
              </button>
            </div>

            {/* List of Model Cards */}
            {byokModels.length === 0 ? (
              <div className="panel p-8 text-center space-y-3 border-dashed border-2 border-outline-variant/40">
                <div className="w-12 h-12 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <span className="material-symbols-outlined text-2xl">key</span>
                </div>
                <div className="max-w-sm mx-auto space-y-1">
                  <h4 className="font-bold text-sm text-on-surface">No BYOK Models Configured</h4>
                  <p className="text-xs text-on-surface-variant">
                    Add your OpenAI, Claude, DeepSeek, Gemini, or local Ollama models to generate ebooks, blogs, and rewrites for free with zero credits.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleOpenAddModal}
                  className="btn btn-primary btn-sm inline-flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">add</span>
                  <span>Add Your First Model</span>
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                {byokModels.map((model) => (
                  <ByokModelCard
                    key={model.id}
                    model={model}
                    isOnlyModel={byokModels.length === 1}
                    onSetDefault={setDefaultByokModel}
                    onEdit={handleOpenEditModal}
                    onResetUsage={resetByokModelUsage}
                    onDelete={removeByokModel}
                  />
                ))}
              </div>
            )}
          </section>

          {/* Advanced Model Controls */}
          <section className="panel panel-pad">
            <h3 className="section-title mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary">tune</span>
              Advanced Model Controls
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <button
                  className="flex items-center justify-between w-full"
                  onClick={() => updateSettings({ creativeMode: !settings.creativeMode })}
                  type="button"
                >
                  <div className="text-left">
                    <p className="text-sm font-bold">Creative Mode</p>
                    <p className="text-xs text-on-surface-variant">Allows AI to take higher narrative risks.</p>
                  </div>
                  <div
                    className={`w-10 h-5 rounded-full relative p-0.5 cursor-pointer ${
                      settings.creativeMode ? "bg-primary" : "bg-surface-container-high"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-surface rounded-full absolute top-0.5 shadow-sm transition-all ${
                        settings.creativeMode ? "right-0.5" : "left-0.5"
                      }`}
                    />
                  </div>
                </button>
                <button
                  className="flex items-center justify-between w-full"
                  onClick={() => updateSettings({ longFormFocus: !settings.longFormFocus })}
                  type="button"
                >
                  <div className="text-left">
                    <p className="text-sm font-bold">Long-Form Focus</p>
                    <p className="text-xs text-on-surface-variant">Optimizes context for chapter consistency.</p>
                  </div>
                  <div
                    className={`w-10 h-5 rounded-full relative p-0.5 cursor-pointer ${
                      settings.longFormFocus ? "bg-primary" : "bg-surface-container-high"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-surface rounded-full absolute top-0.5 shadow-sm transition-all ${
                        settings.longFormFocus ? "right-0.5" : "left-0.5"
                      }`}
                    />
                  </div>
                </button>
              </div>
              <div className="space-y-3">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold">Temperature</p>
                    <span className="text-xs font-semibold text-primary px-2 py-0.5 bg-primary/10 rounded">
                      {(settings.temperature || 0.75).toFixed(2)}
                    </span>
                  </div>
                  <input
                    className="w-full accent-primary"
                    max="1"
                    min="0"
                    step="0.05"
                    type="range"
                    value={settings.temperature ?? 0.75}
                    onChange={(event) => updateSettings({ temperature: Number(event.target.value) })}
                  />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold">Top P</p>
                    <span className="text-xs font-semibold text-primary px-2 py-0.5 bg-primary/10 rounded">
                      {(settings.topP || 0.9).toFixed(2)}
                    </span>
                  </div>
                  <input
                    className="w-full accent-primary"
                    max="1"
                    min="0"
                    step="0.05"
                    type="range"
                    value={settings.topP ?? 0.9}
                    onChange={(event) => updateSettings({ topP: Number(event.target.value) })}
                  />
                </div>
              </div>
            </div>
          </section>
        </div>

        {/* Right Rail: Collated Usage Overview */}
        <aside className="min-w-0 space-y-3 lg:sticky lg:top-[calc(var(--app-header-h)+1rem)]">
          <div className="panel panel-pad space-y-4 group">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-base">monitoring</span>
                <h3 className="section-title">Collated Usage</h3>
              </div>
              <button
                className="btn btn-ghost btn-sm text-xs opacity-60 hover:opacity-100 hover:text-error p-1 h-auto"
                onClick={() => {
                  if (confirm("Reset all collated and per-model usage data?")) {
                    resetAllByokUsage();
                  }
                }}
                type="button"
                title="Reset all usage counters"
              >
                Reset All
              </button>
            </div>

            {/* Total Collated Spend & Tokens */}
            <div className="bg-surface-container-highest/50 p-3.5 rounded-xl border border-outline-variant/15 space-y-1">
              <p className="text-[10px] text-on-surface-variant uppercase font-medium tracking-wider">
                Total Collated Spend
              </p>
              <p className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                {formatCurrency(collatedCost)}
              </p>
              <div className="flex items-center justify-between text-xs text-on-surface-variant pt-1 border-t border-outline-variant/15">
                <span>{formatTokens(collatedTokens)} tokens</span>
                <span>{collatedRequests} requests</span>
              </div>
            </div>

            {/* Token Distribution Meter across models */}
            {byokModels.length > 0 && sumModelTokens > 0 && (
              <div className="space-y-2 pt-1 border-t border-[var(--hairline)]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-on-surface text-[11px]">Usage Distribution</span>
                  <span className="text-[10px] text-on-surface-variant">By Model</span>
                </div>

                {/* Stacked percentage bar */}
                <div className="w-full h-2 rounded-full overflow-hidden flex bg-surface-container-high">
                  {byokModels.map((m, idx) => {
                    const pct = (m.usage.totalTokens / sumModelTokens) * 100;
                    if (pct <= 0) return null;
                    return (
                      <div
                        key={m.id}
                        style={{
                          width: `${pct}%`,
                          backgroundColor: MODEL_COLORS[idx % MODEL_COLORS.length],
                        }}
                        className="h-full transition-all duration-300"
                        title={`${m.name}: ${pct.toFixed(1)}%`}
                      />
                    );
                  })}
                </div>

                {/* Per-model breakdown list */}
                <div className="space-y-1.5 pt-1">
                  {byokModels.map((m, idx) => {
                    const pct = sumModelTokens > 0 ? (m.usage.totalTokens / sumModelTokens) * 100 : 0;
                    return (
                      <div key={m.id} className="flex items-center justify-between text-[11px] text-on-surface-variant">
                        <div className="flex items-center gap-1.5 min-w-0 pr-1">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: MODEL_COLORS[idx % MODEL_COLORS.length] }}
                          />
                          <span className="truncate text-on-surface font-medium" title={m.name}>
                            {m.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 font-mono text-[10px]">
                          <span>{pct.toFixed(0)}%</span>
                          <span className="text-emerald-400">{formatCurrency(m.usage.totalCost)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Input vs Output Collated Details */}
            <dl className="pt-2 border-t border-[var(--hairline)] space-y-1 text-xs">
              <div className="kv">
                <dt className="text-on-surface-variant flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
                  Collated Input Tokens
                </dt>
                <dd className="font-mono text-on-surface">{formatTokens(sumModelInputTokens)}</dd>
              </div>
              <div className="kv">
                <dt className="text-on-surface-variant flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                  Collated Output Tokens
                </dt>
                <dd className="font-mono text-on-surface">{formatTokens(sumModelOutputTokens)}</dd>
              </div>
              <div className="kv">
                <dt className="text-on-surface-variant">Active Models</dt>
                <dd className="font-bold text-on-surface">{byokModels.length}</dd>
              </div>
            </dl>
          </div>

          <div className="panel panel-pad">
            <p className="rail-title">Optimize for</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Lower cost", type: "cost", icon: "savings" },
                { label: "Speed", type: "speed", icon: "speed" },
                { label: "Prose quality", type: "quality", icon: "history_edu" },
              ].map((item) => (
                <button
                  key={item.label}
                  className="btn btn-secondary btn-sm"
                  type="button"
                  onClick={() => {
                    useAppStore.getState().applyOptimization(item.type as "cost" | "speed" | "quality");
                    setSaveMessage(`Optimization applied: ${item.label}. Parameters updated.`);
                    setTimeout(() => setSaveMessage(""), 3500);
                  }}
                >
                  <span className="material-symbols-outlined text-[15px]">{item.icon}</span>
                  {item.label}
                </button>
              ))}
            </div>
          </div>
        </aside>
      </div>

      {/* Add / Edit Modal */}
      <ByokModelModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        onSave={handleSaveModel}
        initialData={editingModel}
      />
    </div>
  );
}
