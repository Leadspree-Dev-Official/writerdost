"use client";

import { useState, useEffect } from "react";
import {
  type BizAiGatewayConfig,
  DEFAULT_BIZAI_GATEWAY_CONFIG,
  type ApiProvider,
} from "@/lib/store-types";
import { MODEL_PRESETS } from "@/app/settings/ByokModelModal";

interface AdminGatewayTabProps {
  onNotifyError?: (msg: string) => void;
}

const PROVIDERS_INFO = [
  { id: "anthropic", label: "Anthropic Claude Key", placeholder: "sk-ant-api03-...", icon: "psychology" },
  { id: "openai", label: "OpenAI Gateway Key", placeholder: "sk-proj-...", icon: "smart_toy" },
  { id: "gemini", label: "Google Gemini API Key", placeholder: "AIzaSy...", icon: "auto_awesome" },
  { id: "deepseek", label: "DeepSeek API Key", placeholder: "sk-...", icon: "neurology" },
  { id: "groq", label: "Groq Cloud API Key", placeholder: "gsk_...", icon: "speed" },
  { id: "commandcode", label: "CommandCode API Key", placeholder: "cmd_...", icon: "terminal" },
  { id: "openrouter", label: "OpenRouter Unified Key", placeholder: "sk-or-v1-...", icon: "hub" },
];

export function AdminGatewayTab({ onNotifyError }: AdminGatewayTabProps) {
  const [gatewayConfig, setGatewayConfig] = useState<BizAiGatewayConfig>(DEFAULT_BIZAI_GATEWAY_CONFIG);
  const [gatewaySaving, setGatewaySaving] = useState(false);
  const [gatewayMsg, setGatewayMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showKeyToggles, setShowKeyToggles] = useState<Record<string, boolean>>({});
  const [customPrimaryModelMode, setCustomPrimaryModelMode] = useState(false);

  useEffect(() => {
    fetch("/api/admin/gateway")
      .then((r) => r.json())
      .then((d) => {
        if (d?.config) {
          setGatewayConfig(d.config);
        }
      })
      .catch((err) => {
        onNotifyError?.(err instanceof Error ? err.message : "Failed to load gateway config");
      });
  }, [onNotifyError]);

  const handleSaveGateway = async () => {
    setGatewaySaving(true);
    setGatewayMsg(null);
    try {
      const res = await fetch("/api/admin/gateway", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(gatewayConfig),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update BizAI Gateway settings");
      setGatewayConfig(data.config);
      setGatewayMsg({
        type: "success",
        text: "BizAI Gateway & Failover Chain settings saved successfully!",
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setGatewayMsg({ type: "error", text: msg });
      onNotifyError?.(msg);
    } finally {
      setGatewaySaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <section className="metrics !grid-cols-2 lg:!grid-cols-4" aria-label="AI Gateway metrics">
        <div className="metric">
          <p className="metric-label">Gateway Engine</p>
          <p className="metric-value flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                gatewayConfig.failoverEnabled ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            {gatewayConfig.failoverEnabled ? "Failover Protected" : "Single Upstream"}
          </p>
          <p className="metric-note">real-time 429 mitigation</p>
        </div>
        <div className="metric">
          <p className="metric-label">Primary AI Provider</p>
          <p className="metric-value capitalize text-primary">{gatewayConfig.primaryProvider}</p>
          <p className="metric-note truncate">{gatewayConfig.primaryModel}</p>
        </div>
        <div className="metric">
          <p className="metric-label">Fallback Tiers</p>
          <p className="metric-value">
            {gatewayConfig.fallbacks.filter((f) => f.enabled).length} Active
          </p>
          <p className="metric-note">outage recovery targets</p>
        </div>
        <div className="metric">
          <p className="metric-label">Context Threshold</p>
          <p className="metric-value">
            {gatewayConfig.contextThresholdEnabled
              ? `${Math.round(gatewayConfig.contextThresholdTokens / 1000)}k tokens`
              : "Off"}
          </p>
          <p className="metric-note">long-chat autoswitch</p>
        </div>
      </section>

      {/* Gateway Panel */}
      <section className="panel p-5 max-w-5xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[var(--hairline)]">
          <div>
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-xl">shield_lock</span>
              <h3 className="text-base font-bold text-[var(--color-on-surface)]">
                BizAI Gateway & Failover Engine
              </h3>
              <span
                className={`badge ${
                  gatewayConfig.failoverEnabled ? "badge-success" : "badge-neutral"
                }`}
              >
                {gatewayConfig.failoverEnabled ? "Failover Active" : "Single Upstream"}
              </span>
            </div>
            <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">
              Configure default AI models, manage server-side API keys, and orchestrate automated failovers so book generation never freezes on rate limits.
            </p>
          </div>
          <button
            type="button"
            onClick={handleSaveGateway}
            disabled={gatewaySaving}
            className="btn btn-primary btn-sm flex items-center gap-1.5 shrink-0"
          >
            <span className="material-symbols-outlined text-sm">save</span>
            {gatewaySaving ? "Saving..." : "Save Gateway Settings"}
          </button>
        </div>

        {gatewayMsg && (
          <div
            className={`p-3 rounded-[var(--radius)] text-xs font-semibold flex items-center gap-2 ${
              gatewayMsg.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 border border-rose-500/25 text-rose-500"
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              {gatewayMsg.type === "success" ? "check_circle" : "error"}
            </span>
            <span>{gatewayMsg.text}</span>
          </div>
        )}

        {/* Active Chain Summary Pill */}
        <div className="p-3.5 rounded-[var(--radius-lg)] border border-primary/20 bg-primary/5 flex flex-col md:flex-row items-start md:items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-[var(--color-on-surface)] font-semibold shrink-0">
            <span className="material-symbols-outlined text-primary text-base">alt_route</span>
            <span>Active Failover Pipeline:</span>
          </div>
          <div className="flex flex-wrap items-center gap-2 font-mono text-[11px]">
            <span className="px-2.5 py-1 rounded bg-[var(--color-surface)] border border-[var(--hairline-strong)] text-primary font-bold">
              1. Primary: {gatewayConfig.primaryProvider} ({gatewayConfig.primaryModel})
            </span>
            <span className="text-[var(--color-on-surface-variant)]">→</span>
            {gatewayConfig.fallbacks.map((f, i) => (
              <span
                key={i}
                className={`px-2.5 py-1 rounded border font-medium ${
                  f.enabled && gatewayConfig.failoverEnabled
                    ? "bg-[var(--color-surface)] border-[var(--hairline-strong)] text-[var(--color-on-surface)]"
                    : "opacity-40 line-through bg-[var(--color-surface-container-low)] border-transparent text-[var(--color-on-surface-variant)]"
                }`}
              >
                {i + 2}. {f.label.split("(")[0].trim()}: {f.provider} ({f.model})
              </span>
            ))}
          </div>
        </div>

        {/* Section 1: Platform Default Primary Engine */}
        <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-[var(--color-surface-container-low)] space-y-3">
          <div>
            <h4 className="text-xs font-bold text-[var(--color-on-surface)] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-base">verified</span>
              Platform Default Primary AI Engine
            </h4>
            <p className="text-[11px] text-[var(--color-on-surface-variant)] mt-0.5">
              Default model powering novel chapters, research dossiers, and rewrites for subscribers and platform accounts.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
            <div className="field !mb-0">
              <label className="label">Primary Provider</label>
              <select
                className="select"
                value={gatewayConfig.primaryProvider}
                onChange={(e) => {
                  const newProvider = e.target.value as ApiProvider;
                  const defaultModel = MODEL_PRESETS[newProvider]?.[0] || "claude-3-7-sonnet-20250219";
                  setGatewayConfig({
                    ...gatewayConfig,
                    primaryProvider: newProvider,
                    primaryModel: defaultModel,
                  });
                  setCustomPrimaryModelMode(false);
                }}
              >
                <option value="claude">Anthropic Claude (Claude 3.7 / 3.5 Sonnet)</option>
                <option value="openai">OpenAI (GPT-4o, o3-mini)</option>
                <option value="gemini">Google Gemini (Gemini 2.5 / 2.0 Pro)</option>
                <option value="deepseek">DeepSeek (DeepSeek V3 / R1)</option>
                <option value="groq">Groq Cloud (Llama 3.3 70B, Qwen)</option>
                <option value="commandcode">CommandCode (Command-Code, Taste-1)</option>
                <option value="openrouter">OpenRouter (Multi-model router)</option>
              </select>
            </div>

            <div className="field !mb-0">
              <div className="flex items-center justify-between mb-1">
                <label className="label !mb-0">Primary Model Name</label>
                <button
                  type="button"
                  onClick={() => setCustomPrimaryModelMode(!customPrimaryModelMode)}
                  className="text-[11px] text-primary hover:underline"
                >
                  {customPrimaryModelMode ? "Select from presets" : "Enter custom model"}
                </button>
              </div>
              {customPrimaryModelMode || !(MODEL_PRESETS[gatewayConfig.primaryProvider]?.length) ? (
                <input
                  type="text"
                  value={gatewayConfig.primaryModel}
                  onChange={(e) => setGatewayConfig({ ...gatewayConfig, primaryModel: e.target.value })}
                  placeholder="e.g. claude-3-7-sonnet-20250219"
                  className="input font-mono text-xs"
                />
              ) : (
                <select
                  className="select font-mono text-xs"
                  value={gatewayConfig.primaryModel}
                  onChange={(e) => setGatewayConfig({ ...gatewayConfig, primaryModel: e.target.value })}
                >
                  {MODEL_PRESETS[gatewayConfig.primaryProvider]?.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Server Gateway API Keys Management */}
        <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-[var(--color-surface-container-low)] space-y-3">
          <div>
            <h4 className="text-xs font-bold text-[var(--color-on-surface)] flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-base">key</span>
              Server Gateway API Keys Management
            </h4>
            <p className="text-[11px] text-[var(--color-on-surface-variant)] mt-0.5">
              Platform-level upstream keys. Stored securely on the server and never exposed to client browsers. If left blank, Writerdost checks server environment variables.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            {PROVIDERS_INFO.map((item) => {
              const keyId = item.id as keyof BizAiGatewayConfig["serverKeys"];
              const val = gatewayConfig.serverKeys?.[keyId] || "";
              const isConfigured = Boolean(val && (val.includes("••••") || val.length > 5));
              const isShowing = Boolean(showKeyToggles[item.id]);

              return (
                <div
                  key={item.id}
                  className="p-3 rounded-[var(--radius)] border border-[var(--hairline)] bg-[var(--color-surface)] space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="material-symbols-outlined text-sm text-primary">{item.icon}</span>
                      <span className="text-xs font-semibold text-[var(--color-on-surface)]">
                        {item.label}
                      </span>
                      {isConfigured ? (
                        <span className="badge badge-success text-[10px]">
                          Configured
                        </span>
                      ) : (
                        <span className="badge badge-warning text-[10px]">
                          Not Set
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowKeyToggles({ ...showKeyToggles, [item.id]: !isShowing })}
                      className="text-[11px] text-[var(--color-on-surface-variant)] hover:text-[var(--color-on-surface)] flex items-center gap-1"
                    >
                      <span className="material-symbols-outlined text-xs">
                        {isShowing ? "visibility_off" : "visibility"}
                      </span>
                      <span>{isShowing ? "Hide" : "Show"}</span>
                    </button>
                  </div>
                  <input
                    type={isShowing ? "text" : "password"}
                    value={val}
                    onChange={(e) =>
                      setGatewayConfig({
                        ...gatewayConfig,
                        serverKeys: {
                          ...gatewayConfig.serverKeys,
                          [keyId]: e.target.value,
                        },
                      })
                    }
                    placeholder={item.placeholder}
                    className="input !h-[var(--ctl-sm)] !py-0 !text-xs font-mono"
                  />
                </div>
              );
            })}
          </div>
        </div>

        {/* Section 3: Multi-Model Outage / 429 Failover Chain */}
        <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-[var(--color-surface-container-low)] space-y-4">
          <div className="flex items-start justify-between">
            <div>
              <h4 className="text-xs font-bold text-[var(--color-on-surface)] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-amber-500 text-base">bolt</span>
                Multi-Model Outage / 429 Failover Chain
              </h4>
              <p className="text-[11px] text-[var(--color-on-surface-variant)] mt-0.5">
                If Primary hits a rate limit (429) or upstream error (500/503), the engine automatically falls back in real time so user book generation never halts mid-manuscript.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={gatewayConfig.failoverEnabled}
              onClick={() => setGatewayConfig({ ...gatewayConfig, failoverEnabled: !gatewayConfig.failoverEnabled })}
              className="switch shrink-0 ml-4"
              data-on={gatewayConfig.failoverEnabled}
            />
          </div>

          {/* Triggers */}
          <div className="p-3 rounded-[var(--radius)] border border-[var(--hairline)] bg-[var(--color-surface)] space-y-2">
            <span className="text-xs font-semibold text-[var(--color-on-surface)] block">
              Failover Activation Triggers:
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <label className="flex items-center gap-2 text-xs text-[var(--color-on-surface)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={gatewayConfig.failoverTriggers.rateLimit429}
                  onChange={(e) =>
                    setGatewayConfig({
                      ...gatewayConfig,
                      failoverTriggers: {
                        ...gatewayConfig.failoverTriggers,
                        rateLimit429: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-[var(--hairline-strong)] text-primary accent-primary"
                />
                <span>HTTP 429 Rate Limits</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-[var(--color-on-surface)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={gatewayConfig.failoverTriggers.serverErrors5xx}
                  onChange={(e) =>
                    setGatewayConfig({
                      ...gatewayConfig,
                      failoverTriggers: {
                        ...gatewayConfig.failoverTriggers,
                        serverErrors5xx: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-[var(--hairline-strong)] text-primary accent-primary"
                />
                <span>500 / 502 / 503 Server Outages</span>
              </label>
              <label className="flex items-center gap-2 text-xs text-[var(--color-on-surface)] cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={gatewayConfig.failoverTriggers.timeout}
                  onChange={(e) =>
                    setGatewayConfig({
                      ...gatewayConfig,
                      failoverTriggers: {
                        ...gatewayConfig.failoverTriggers,
                        timeout: e.target.checked,
                      },
                    })
                  }
                  className="rounded border-[var(--hairline-strong)] text-primary accent-primary"
                />
                <span>Request Timeout (&gt;300s)</span>
              </label>
            </div>
          </div>

          {/* Sequential Fallback Chain */}
          <div className="space-y-2.5">
            <span className="text-xs font-semibold text-[var(--color-on-surface)] block">
              Sequential Fallback Chain:
            </span>
            {gatewayConfig.fallbacks.map((tier, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-[var(--radius)] border border-[var(--hairline)] bg-[var(--color-surface)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="flex items-center gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                    {idx + 1}
                  </span>
                  <div>
                    <span className="text-xs font-bold text-[var(--color-on-surface)]">{tier.label}</span>
                    <p className="text-[11px] text-[var(--color-on-surface-variant)]">
                      {idx === 0
                        ? "Tier 1: Immediate failover target when primary is throttled."
                        : "Tier 2: Emergency backup target if Tier 1 also encounters errors."}
                    </p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
                  <select
                    className="select !h-[var(--ctl-sm)] !py-0 !text-xs"
                    value={tier.provider}
                    onChange={(e) => {
                      const newProvider = e.target.value as ApiProvider;
                      const newFallbacks = [...gatewayConfig.fallbacks];
                      newFallbacks[idx] = {
                        ...tier,
                        provider: newProvider,
                        model: MODEL_PRESETS[newProvider]?.[0] || tier.model,
                      };
                      setGatewayConfig({ ...gatewayConfig, fallbacks: newFallbacks });
                    }}
                  >
                    <option value="gemini">Google Gemini</option>
                    <option value="deepseek">DeepSeek</option>
                    <option value="groq">Groq</option>
                    <option value="commandcode">CommandCode</option>
                    <option value="openai">OpenAI</option>
                    <option value="claude">Claude</option>
                    <option value="openrouter">OpenRouter</option>
                  </select>

                  <input
                    type="text"
                    value={tier.model}
                    onChange={(e) => {
                      const newFallbacks = [...gatewayConfig.fallbacks];
                      newFallbacks[idx] = { ...tier, model: e.target.value };
                      setGatewayConfig({ ...gatewayConfig, fallbacks: newFallbacks });
                    }}
                    placeholder="model name"
                    className="input !h-[var(--ctl-sm)] !py-0 !text-xs font-mono w-40"
                  />

                  <label className="flex items-center gap-1.5 text-xs text-[var(--color-on-surface)] cursor-pointer select-none ml-1">
                    <input
                      type="checkbox"
                      checked={tier.enabled}
                      onChange={(e) => {
                        const newFallbacks = [...gatewayConfig.fallbacks];
                        newFallbacks[idx] = { ...tier, enabled: e.target.checked };
                        setGatewayConfig({ ...gatewayConfig, fallbacks: newFallbacks });
                      }}
                      className="rounded border-[var(--hairline-strong)] text-primary accent-primary"
                    />
                    <span>Enabled</span>
                  </label>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Section 4: AI Context Window Threshold Fallback */}
        <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-[var(--color-surface-container-low)] space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xs font-bold text-[var(--color-on-surface)] flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-base">swap_calls</span>
                Context Window & High-Volume Token Threshold Switching
              </h4>
              <p className="text-[11px] text-[var(--color-on-surface-variant)] mt-0.5">
                Automatically switch long Claude sessions exceeding a token threshold to an economical high-capacity model (e.g. DeepSeek V3) to prevent unexpected context billing spikes.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={gatewayConfig.contextThresholdEnabled}
              onClick={() =>
                setGatewayConfig({
                  ...gatewayConfig,
                  contextThresholdEnabled: !gatewayConfig.contextThresholdEnabled,
                })
              }
              className="switch shrink-0 ml-4"
              data-on={gatewayConfig.contextThresholdEnabled}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
            <div className="p-3 rounded-[var(--radius)] border border-[var(--hairline)] bg-[var(--color-surface)] space-y-1.5">
              <label className="label">Threshold Limit (Tokens)</label>
              <input
                type="number"
                min="10000"
                max="200000"
                step="5000"
                value={gatewayConfig.contextThresholdTokens}
                onChange={(e) =>
                  setGatewayConfig({
                    ...gatewayConfig,
                    contextThresholdTokens: Math.max(1000, parseInt(e.target.value) || 95000),
                  })
                }
                className="input !h-[var(--ctl-md)] !text-xs font-mono"
              />
              <p className="hint">
                Default: <strong>95,000 tokens</strong>. Claude Haiku transitions to standard higher tier past 100K tokens.
              </p>
            </div>

            <div className="p-3 rounded-[var(--radius)] border border-[var(--hairline)] bg-[var(--color-surface)] space-y-1.5">
              <label className="label">Fallback Provider & Model</label>
              <div className="grid grid-cols-2 gap-2">
                <select
                  className="select !h-[var(--ctl-md)] !py-0 !text-xs"
                  value={gatewayConfig.contextFallbackProvider}
                  onChange={(e) =>
                    setGatewayConfig({
                      ...gatewayConfig,
                      contextFallbackProvider: e.target.value as ApiProvider,
                    })
                  }
                >
                  <option value="deepseek">DeepSeek</option>
                  <option value="groq">Groq</option>
                  <option value="commandcode">CommandCode</option>
                  <option value="gemini">Google Gemini</option>
                  <option value="openai">OpenAI</option>
                  <option value="openrouter">OpenRouter</option>
                </select>
                <input
                  type="text"
                  value={gatewayConfig.contextFallbackModel}
                  onChange={(e) =>
                    setGatewayConfig({
                      ...gatewayConfig,
                      contextFallbackModel: e.target.value,
                    })
                  }
                  placeholder="deepseek-chat"
                  className="input !h-[var(--ctl-md)] !text-xs font-mono"
                />
              </div>
              <p className="hint">
                Default: <strong>deepseek-chat (DeepSeek V3)</strong>. Flat economical rate without large-context multipliers.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
