"use client";

import { useState, useEffect } from "react";
import { generateAiText } from "@/lib/ai-client";
import { useAppStore } from "@/lib/app-store";

const modelOptions = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1-preview", "o1-mini", "gpt-4o-2024-08-06"],
  claude: ["claude-3-5-sonnet-20240620", "claude-3-5-sonnet-latest", "claude-3-opus-20240229", "claude-3-haiku-20240307"],
  gemini: ["gemini-1.5-pro", "gemini-1.5-flash", "gemini-1.0-pro"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  openrouter: [
    "openai/gpt-4o-mini",
    "anthropic/claude-3.5-sonnet",
    "google/gemini-pro-1.5",
    "meta-llama/llama-3.1-8b-instruct:free",
    "google/gemma-2-9b-it:free",
    "google/gemma-3-27b-it",
    "google/gemma-3-4b-it",
  ],
  ollama: [
    "llama3.1:8b",
    "llama3.2:3b",
    "mistral:7b",
    "phi3:latest",
    "gemma3",
    "gemma3:4b",
    "gemma3:12b",
    "gemma3:27b",
    "gemma4",
    "gemma4:e2b",
    "gemma4:e4b",
    "gemma4:26b",
    "gemma4:31b",
    "gemma4:31b-cloud",
  ],
  ollama_cloud: [
    "llama3.1:8b",
    "llama3.2:3b",
    "mistral:7b",
    "phi3:latest",
    "gemma3",
    "gemma3:4b",
    "gemma3:12b",
    "gemma3:27b",
    "gemma4",
    "gemma4:e2b",
    "gemma4:e4b",
    "gemma4:26b",
    "gemma4:31b",
    "gemma4:31b-cloud",
  ],
} as const;

const presetRates = [
  0.01, 0.05, 0.1, 0.15, 0.25, 0.5, 0.75, 1.0, 2.0, 3.0, 5.0, 10.0, 15.0, 20.0, 30.0, 50.0, 75.0, 100.0
];

const formatTokens = (tokens: number) => {
  if (tokens >= 1000000) return (tokens / 1000000).toFixed(1) + "M";
  if (tokens >= 10000) return (tokens / 1000).toFixed(0) + "K";
  if (tokens >= 1000) return (tokens / 1000).toFixed(1) + "K";
  return tokens.toString();
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount);
};

/** The providers this build can talk to. Endpoints are pinned server-side. */
const PROVIDERS = [
  { key: "openai", name: "OpenAI", description: "GPT-4o and GPT-4o-mini." },
  { key: "claude", name: "Claude", description: "Anthropic's latest models." },
  { key: "gemini", name: "Gemini", description: "Google's Flash and Pro models." },
  { key: "deepseek", name: "DeepSeek", description: "DeepSeek-Chat and Reasoner." },
  { key: "openrouter", name: "OpenRouter", description: "Many models through one API." },
  { key: "ollama", name: "Ollama (local)", description: "Runs privately on this machine." },
  { key: "ollama_cloud", name: "Ollama Cloud", description: "Ollama's hosted models." },
  { key: "custom", name: "Custom", description: "Any OpenAI-compatible endpoint." },
] as const;

export default function SettingsPage() {
  const settings = useAppStore((state) => state.settings);
  const api = useAppStore((state) => state.api);
  const usage = useAppStore((state) => state.usage);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const updateApiSettings = useAppStore((state) => state.updateApiSettings);
  const [message, setMessage] = useState("");
  const [testing, setTesting] = useState(false);
  // null = follow the provider default; true/false = the user chose explicitly.
  const [customModelOverride, setCustomModelOverride] = useState<boolean | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<"untested" | "success" | "failed">("untested");
  const [isCustomInput, setIsCustomInput] = useState(
    () =>
      !presetRates.includes(useAppStore.getState().usage.inputTokenRate) ||
      !presetRates.includes(useAppStore.getState().usage.outputTokenRate),
  );
  const [customInputRate, setCustomInputRate] = useState("");
  const [customOutputRate, setCustomOutputRate] = useState("");

  // Mirrors the persisted rates into the text inputs when they change outside
  // this form (store rehydration, or the preset dropdown writing a new rate).
  useEffect(() => {
    setCustomInputRate(usage.inputTokenRate.toString());
    setCustomOutputRate(usage.outputTokenRate.toString());
  }, [isCustomInput, usage.inputTokenRate, usage.outputTokenRate]);

  // Any credential change invalidates the previous test result.
  useEffect(() => {
    setConnectionStatus("untested");
    setMessage("");
  }, [api.provider, api.model, api.baseUrl, api.apiKey]);
  
  const usesPresetModels = ["openai", "claude", "gemini", "deepseek", "openrouter", "ollama", "ollama_cloud"].includes(api.provider);

  // Providers with presets start on the dropdown; custom providers start in
  // free-text mode. Derived rather than synced in an effect so switching
  // provider cannot render one frame with the previous provider's mode.
  const isCustomModelEditing = customModelOverride ?? !usesPresetModels;
  
  const hasRequiredKey = api.provider === "ollama" || api.provider === "ollama_cloud" || Boolean(api.apiKey);
  const hasBasicConfig = Boolean(api.baseUrl && api.model);

  let statusText = "Needs API setup";
  let statusDotClass = "bg-amber-500";
  let statusTextClass = "text-amber-500 dark:text-amber-400";

  if (!hasBasicConfig) {
    statusText = "Needs API setup";
    statusDotClass = "bg-amber-500";
    statusTextClass = "text-amber-500 dark:text-amber-400";
  } else if (!hasRequiredKey) {
    statusText = "Needs API Key";
    statusDotClass = "bg-amber-500";
    statusTextClass = "text-amber-500 dark:text-amber-400";
  } else if (connectionStatus === "success") {
    statusText = "Ready to generate";
    statusDotClass = "bg-emerald-500";
    statusTextClass = "text-emerald-500 dark:text-emerald-400";
  } else if (connectionStatus === "failed") {
    statusText = "Connection failed";
    statusDotClass = "bg-rose-500";
    statusTextClass = "text-rose-500 dark:text-rose-400";
  } else {
    statusText = "Ready to test connection";
    statusDotClass = "bg-blue-500";
    statusTextClass = "text-blue-500 dark:text-blue-400";
  }

  const activeModelOptions =
    api.provider === "openrouter"
      ? modelOptions.openrouter
      : api.provider === "ollama"
        ? modelOptions.ollama
        : api.provider === "ollama_cloud"
          ? modelOptions.ollama_cloud
          : api.provider === "openai"
            ? modelOptions.openai
            : api.provider === "claude"
              ? modelOptions.claude
              : api.provider === "gemini"
                ? modelOptions.gemini
                : api.provider === "deepseek"
                  ? modelOptions.deepseek
                  : [];

  const selectedModelValue =
    usesPresetModels && !isCustomModelEditing && activeModelOptions.includes(api.model as never)
      ? api.model
      : usesPresetModels && !isCustomModelEditing
        ? activeModelOptions[0]
        : api.model;

  return (
    <div className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">AI settings</h1>
          <p className="page-sub">
            Your provider, model and generation controls. These persist across the whole workspace.
          </p>
        </div>
      </div>

      {message && !message.includes("API test failed") && !message.includes("Connection successful") ? (
        <div
          className={`rounded-[var(--radius-lg)] p-4 text-sm ${
            message.toLowerCase().includes("failed") || message.toLowerCase().includes("error")
              ? "bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-rose-700 dark:text-rose-400"
              : "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
          }`}
        >
          {message}
        </div>
      ) : null}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_17rem] gap-4 items-start">
        <div className="min-w-0 space-y-3">
          <section className="panel overflow-hidden">
            <div className="panel-head">
              <span className="panel-title">Provider</span>
              <span className="row-meta">{PROVIDERS.length} available</span>
            </div>

            {/* A pick-one list: name and purpose on one line, selection on the left */}
            <div role="radiogroup" aria-label="AI provider">
              {PROVIDERS.map((provider) => {
                const selected = api.provider === provider.key;
                return (
                  <button
                    key={provider.key}
                    role="radio"
                    aria-checked={selected}
                    className={`row w-full text-left cursor-pointer ${selected ? "bg-primary/[0.06]" : ""}`}
                    onClick={() => updateApiSettings({ provider: provider.key as typeof api.provider })}
                    type="button"
                  >
                    <span
                      className={`w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center ${
                        selected ? "border-primary" : "border-[var(--hairline-strong)]"
                      }`}
                    >
                      {selected && <span className="w-2 h-2 rounded-full bg-primary" />}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block row-title">{provider.name}</span>
                      <span className="block row-meta truncate">{provider.description}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="panel panel-pad">
            {/* Header with Title only */}
            <div className="flex items-center gap-2 mb-6">
              <span className="material-symbols-outlined text-primary">key</span>
              <h3 className="section-title">API Credentials</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-on-surface-variant block">Provider</label>
                <select
                  className="w-full bg-surface-container-lowest border-none rounded-[var(--radius)] py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  value={api.provider || "openai"}
                  onChange={(event) => {
                    const provider = event.target.value as typeof api.provider;
                    updateApiSettings({ provider });
                    setCustomModelOverride(!(provider === "openrouter" || provider === "ollama" || provider === "ollama_cloud"));
                  }}
                >
                  <option value="openai">OpenAI</option>
                  <option value="claude">Claude (Anthropic)</option>
                  <option value="gemini">Gemini (Google)</option>
                  <option value="deepseek">DeepSeek</option>
                  <option value="openrouter">OpenRouter</option>
                  <option value="ollama">Ollama Local</option>
                  <option value="ollama_cloud">Ollama Cloud</option>
                  <option value="custom">Custom</option>
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <label className="text-[11px] font-semibold text-on-surface-variant block">Model</label>
                  {usesPresetModels ? (
                    <button
                      className="text-xs font-bold text-primary hover:underline"
                      onClick={() => setCustomModelOverride(!isCustomModelEditing)}
                      type="button"
                    >
                      {isCustomModelEditing ? "Use Dropdown" : "Edit"}
                    </button>
                  ) : null}
                </div>
                {usesPresetModels && !isCustomModelEditing ? (
                  <select
                    className="w-full bg-surface-container-lowest border-none rounded-[var(--radius)] py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    value={selectedModelValue || ""}
                    onChange={(event) => updateApiSettings({ model: event.target.value })}
                  >
                    {activeModelOptions.map((model) => (
                      <option key={model} value={model}>
                        {model}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    className="w-full bg-surface-container-lowest border-none rounded-[var(--radius)] py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                    value={api.model || ""}
                    onChange={(event) => updateApiSettings({ model: event.target.value })}
                  />
                )}
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[11px] font-semibold text-on-surface-variant block">Base URL</label>
                <input
                  className="w-full bg-surface-container-lowest border-none rounded-[var(--radius)] py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  value={api.baseUrl || ""}
                  onChange={(event) => updateApiSettings({ baseUrl: event.target.value })}
                />
              </div>

              <div className="space-y-2 md:col-span-2">
                <label className="text-[11px] font-semibold text-on-surface-variant block">API Key</label>
                <input
                  className="w-full bg-surface-container-lowest border-none rounded-[var(--radius)] py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  placeholder={api.provider === "ollama" || api.provider === "ollama_cloud" ? "Optional for Ollama" : "Paste your API key"}
                  type="password"
                  value={api.apiKey || ""}
                  onChange={(event) => updateApiSettings({ apiKey: event.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-on-surface-variant block">App Name</label>
                <input
                  className="w-full bg-surface-container-lowest border-none rounded-[var(--radius)] py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  value={api.appName || ""}
                  onChange={(event) => updateApiSettings({ appName: event.target.value })}
                />
              </div>

              <div className="space-y-2">
                <label className="text-[11px] font-semibold text-on-surface-variant block">Site URL</label>
                <input
                  className="w-full bg-surface-container-lowest border-none rounded-[var(--radius)] py-3 px-4 text-sm focus:ring-2 focus:ring-primary/20 outline-none"
                  value={api.siteUrl || ""}
                  onChange={(event) => updateApiSettings({ siteUrl: event.target.value })}
                />
              </div>
            </div>

            <div className="mt-8 border-t border-outline-variant/20 pt-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <button
                    className="px-6 py-2.5 bg-on-surface text-surface text-sm font-bold rounded-[var(--radius)] disabled:opacity-60 hover:opacity-90 transition-colors"
                    disabled={testing || !api.baseUrl || !api.model || (!api.apiKey && api.provider !== "ollama" && api.provider !== "ollama_cloud")}
                    onClick={async () => {
                      setTesting(true);
                      setConnectionStatus("untested");
                      try {
                        const timeoutPromise = new Promise((_, reject) =>
                          setTimeout(() => reject(new Error("Connection timed out (15s)")), 15000)
                        );
                        
                        const testPromise = generateAiText({
                          api,
                          systemPrompt: "You are a brief connectivity test for a writing application.",
                          userPrompt: "Reply with exactly: Connection successful.",
                          temperature: 0,
                          topP: 1,
                        });

                        const text = await Promise.race([testPromise, timeoutPromise]) as string;
                        setMessage(text);
                        setConnectionStatus("success");
                      } catch (error) {
                        setMessage(`API test failed: ${error instanceof Error ? error.message : "Unknown error."}`);
                        setConnectionStatus("failed");
                      } finally {
                        setTesting(false);
                      }
                    }}
                    type="button"
                  >
                    {testing ? "Testing..." : "Test Connection"}
                  </button>
                  
                  <div className="flex flex-col">
                    <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500 mb-0.5">Status Details</span>
                    <div className="flex flex-col items-start gap-1">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${statusDotClass}`}></div>
                        <span className={`text-xs font-bold ${statusTextClass}`}>
                          {statusText}
                        </span>
                      </div>
                      {message && (message.includes("Connection successful") || message.includes("API test failed")) && (
                         <span className={`text-[10px] font-medium leading-tight ${message.includes("failed") ? "text-rose-500" : "text-emerald-600"}`}>
                            {message}
                         </span>
                      )}
                    </div>
                  </div>
                </div>
                
                <p className="text-[10px] text-slate-400 dark:text-slate-500 font-medium max-w-xs italic leading-tight">
                  Keys are currently stored in this browser via the app store. Good for local prototyping, not production security.
                </p>
              </div>
            </div>
          </section>

          <section className="panel panel-pad">
            <h3 className="section-title mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary">tune</span>
              Advanced Model Controls
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-3">
                <button className="flex items-center justify-between w-full" onClick={() => updateSettings({ creativeMode: !settings.creativeMode })} type="button">
                  <div className="text-left">
                    <p className="text-sm font-bold">Creative Mode</p>
                    <p className="text-xs text-on-surface-variant">Allows AI to take higher narrative risks.</p>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative p-0.5 cursor-pointer ${settings.creativeMode ? "bg-primary" : "bg-surface-container-high"}`}>
                    <div className={`w-4 h-4 bg-surface rounded-full absolute top-0.5 shadow-sm ${settings.creativeMode ? "right-0.5" : "left-0.5"}`} />
                  </div>
                </button>
                <button className="flex items-center justify-between w-full" onClick={() => updateSettings({ longFormFocus: !settings.longFormFocus })} type="button">
                  <div className="text-left">
                    <p className="text-sm font-bold">Long-Form Focus</p>
                    <p className="text-xs text-on-surface-variant">Optimizes context for chapter consistency.</p>
                  </div>
                  <div className={`w-10 h-5 rounded-full relative p-0.5 cursor-pointer ${settings.longFormFocus ? "bg-primary" : "bg-surface-container-high"}`}>
                    <div className={`w-4 h-4 bg-surface rounded-full absolute top-0.5 shadow-sm ${settings.longFormFocus ? "right-0.5" : "left-0.5"}`} />
                  </div>
                </button>
              </div>
              <div className="space-y-3">
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold">Temperature</p>
                    <span className="text-xs font-semibold text-primary px-2 py-0.5 bg-primary/10 rounded">{settings.temperature.toFixed(2)}</span>
                  </div>
                  <input className="w-full accent-primary" max="1" min="0" step="0.05" type="range" value={settings.temperature || 0} onChange={(event) => updateSettings({ temperature: Number(event.target.value) })} />
                </div>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <p className="text-sm font-bold">Top P</p>
                    <span className="text-xs font-semibold text-primary px-2 py-0.5 bg-primary/10 rounded">{settings.topP.toFixed(2)}</span>
                  </div>
                  <input className="w-full accent-primary" max="1" min="0" step="0.05" type="range" value={settings.topP || 0} onChange={(event) => updateSettings({ topP: Number(event.target.value) })} />
                </div>
              </div>
            </div>
          </section>
        </div>

        <aside className="min-w-0 space-y-3 lg:sticky lg:top-[calc(var(--app-header-h)+1rem)]">
          <div className="panel panel-pad space-y-3 group">
            <div className="flex items-center justify-between">
              <h3 className="section-title flex items-center gap-1.5">
                Usage
              </h3>
              <button 
                className="btn btn-ghost btn-sm opacity-0 group-hover:opacity-100 focus-visible:opacity-100 hover:text-error"
                onClick={() => {
                  if (confirm("Reset all usage data?")) {
                    useAppStore.getState().resetUsage();
                  }
                }}
                type="button"
              >
                Reset
              </button>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pb-6 border-b border-slate-800 dark:border-white/[0.06]">
              <div className="space-y-1.5">
                <label className="label">Input / 1M</label>
                <select 
                  className="select"
                  value={isCustomInput ? "custom" : usage.inputTokenRate}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "custom") {
                      setIsCustomInput(true);
                    } else {
                      setIsCustomInput(false);
                      useAppStore.getState().updateUsageRates(Number(val), usage.outputTokenRate);
                    }
                  }}
                >
                  {presetRates.map(rate => (
                    <option key={`in-${rate}`} value={rate} className="text-black">${rate.toFixed(2)}</option>
                  ))}
                  <option value="custom" className="text-black">Custom...</option>
                </select>

                {isCustomInput && (
                  <div className="relative mt-2">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[12px] text-on-surface-variant">$</span>
                    <input
                      type="text"
                      value={customInputRate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomInputRate(val);
                        const parsed = parseFloat(val);
                        if (!isNaN(parsed)) {
                          useAppStore.getState().updateUsageRates(parsed, usage.outputTokenRate);
                        }
                      }}
                      className="input pl-5"
                      placeholder="0.00"
                    />
                  </div>
                )}
              </div>
              
              <div className="space-y-1.5">
                <label className="label">Output / 1M</label>
                <select 
                  className="select"
                  value={isCustomInput ? "custom" : usage.outputTokenRate}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === "custom") {
                      setIsCustomInput(true);
                    } else {
                      setIsCustomInput(false);
                      useAppStore.getState().updateUsageRates(usage.inputTokenRate, Number(val));
                    }
                  }}
                >
                  {presetRates.map(rate => (
                    <option key={`out-${rate}`} value={rate} className="text-black">${rate.toFixed(2)}</option>
                  ))}
                  <option value="custom" className="text-black">Custom...</option>
                </select>

                {isCustomInput && (
                  <div className="relative mt-2">
                    <span className="absolute left-2 top-1/2 -translate-y-1/2 text-[12px] text-on-surface-variant">$</span>
                    <input
                      type="text"
                      value={customOutputRate}
                      onChange={(e) => {
                        const val = e.target.value;
                        setCustomOutputRate(val);
                        const parsed = parseFloat(val);
                        if (!isNaN(parsed)) {
                          useAppStore.getState().updateUsageRates(usage.inputTokenRate, parsed);
                        }
                      }}
                      className="input pl-5"
                      placeholder="0.00"
                    />
                  </div>
                )}
              </div>
            </div>

            <dl className="pt-3 border-t border-[var(--hairline)] space-y-0.5">
              <div className="kv">
                <dt>Estimated cost</dt>
                <dd>
                  {formatCurrency(
                    (usage.totalTokens / 1000000) * ((usage.inputTokenRate + usage.outputTokenRate) / 2),
                  )}
                </dd>
              </div>
              <div className="kv">
                <dt>Total tokens</dt>
                <dd>{formatTokens(usage.totalTokens)}</dd>
              </div>
              <div className="kv">
                <dt>Requests</dt>
                <dd>{usage.totalRequests}</dd>
              </div>
              <div className="kv">
                <dt>Average rate</dt>
                <dd>${((usage.inputTokenRate + usage.outputTokenRate) / 2).toFixed(3)} / 1M</dd>
              </div>
            </dl>
          </div>

          <div className="panel panel-pad">
            <p className="rail-title">Optimize for</p>
            <div className="flex flex-wrap gap-2">
              {[
                { label: "Lower cost", type: "cost", icon: "savings" },
                { label: "Speed", type: "speed", icon: "speed" },
                { label: "Prose quality", type: "quality", icon: "history_edu" }
              ].map((item) => (
                <button 
                  key={item.label} 
                  className="btn btn-secondary btn-sm" 
                  type="button"
                  onClick={() => {
                    useAppStore.getState().applyOptimization(item.type as "cost" | "speed" | "quality");
                    setMessage(`Optimization applied: ${item.label}. API settings and model parameters have been updated.`);
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

      <div className="flex justify-end items-center gap-2 mt-5 pt-4 border-t border-[var(--hairline)]">
        <button
          className="btn btn-ghost btn-lg"
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
          Reset to defaults
        </button>
        <button
          className="btn btn-primary btn-lg"
          onClick={() => setMessage("Settings saved. API credentials and generation defaults are ready to use.")}
          type="button"
        >
          Save changes
        </button>
      </div>
    </div>
  );
}
