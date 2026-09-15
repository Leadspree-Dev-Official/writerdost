"use client";

import { useState } from "react";
import { generateAiText } from "@/lib/ai-client";
import { useAppStore } from "@/lib/app-store";
import { providerDefaults } from "@/lib/ai-providers";

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

export function AiSettingsTab() {
  const settings = useAppStore((state) => state.settings);
  const api = useAppStore((state) => state.api);
  const usage = useAppStore((state) => state.usage);
  const updateSettings = useAppStore((state) => state.updateSettings);
  const updateApiSettings = useAppStore((state) => state.updateApiSettings);
  // Feedback is stored against the credentials it was produced for. Anything
  // shown for a different set is simply not displayed, so changing a key or
  // model invalidates a stale "Connection successful" without an effect.
  type Feedback = { signature: string; status: "untested" | "success" | "failed"; message: string };
  const [feedback, setFeedback] = useState<Feedback>({
    signature: "",
    status: "untested",
    message: "",
  });
  const [testing, setTesting] = useState(false);
  // null = follow the provider default; true/false = the user chose explicitly.
  const [customModelOverride, setCustomModelOverride] = useState<boolean | null>(null);
  const [showKey, setShowKey] = useState(false);
  const [isCustomInput, setIsCustomInput] = useState(
    () =>
      !presetRates.includes(useAppStore.getState().usage.inputTokenRate) ||
      !presetRates.includes(useAppStore.getState().usage.outputTokenRate),
  );
  const [customInputRate, setCustomInputRate] = useState(() =>
    useAppStore.getState().usage.inputTokenRate.toString(),
  );
  const [customOutputRate, setCustomOutputRate] = useState(() =>
    useAppStore.getState().usage.outputTokenRate.toString(),
  );


  const credentialSignature = `${api.provider}|${api.model}|${api.baseUrl}|${api.apiKey}`;
  const isCurrent = feedback.signature === credentialSignature;
  const message = isCurrent ? feedback.message : "";
  const connectionStatus = isCurrent ? feedback.status : "untested";

  // Keep the original setter shape so every call site reads unchanged.
  const setMessage = (value: string) =>
    setFeedback((prev) => ({
      signature: credentialSignature,
      status: prev.signature === credentialSignature ? prev.status : "untested",
      message: value,
    }));

  const setConnectionStatus = (value: Feedback["status"]) =>
    setFeedback((prev) => ({
      signature: credentialSignature,
      message: prev.signature === credentialSignature ? prev.message : "",
      status: value,
    }));
  
  const usesPresetModels = ["openai", "claude", "gemini", "deepseek", "openrouter", "ollama", "ollama_cloud"].includes(api.provider);

  // The server pins these endpoints and ignores whatever the browser sends,
  // so the field is shown as a fact rather than an editable input.
  const endpointIsPinned = ["openai", "claude", "gemini", "deepseek", "openrouter"].includes(api.provider);
  const keyOptional = api.provider === "ollama";

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
    <div className="space-y-3">
      <div className="flex items-center justify-end gap-2 -mt-1">
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

            {/* Four to a row, so the whole list and the form below fit one screen */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-1.5 p-3" role="radiogroup" aria-label="AI provider">
              {PROVIDERS.map((provider) => {
                const selected = api.provider === provider.key;
                return (
                  <button
                    key={provider.key}
                    role="radio"
                    aria-checked={selected}
                    className="tile"
                    data-selected={selected}
                    onClick={() => updateApiSettings({ provider: provider.key as typeof api.provider })}
                    type="button"
                  >
                    <span className="tile-name">
                      {selected && (
                        <span className="material-symbols-outlined text-[15px] text-primary">check</span>
                      )}
                      {provider.name}
                    </span>
                    <span className="tile-desc">{provider.description}</span>
                  </button>
                );
              })}
            </div>
          </section>

          <section className="panel overflow-hidden">
            <div className="panel-head">
              <span className="panel-title">Credentials</span>
              <span className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${statusDotClass}`} />
                <span className={`text-[11px] font-semibold ${statusTextClass}`}>{statusText}</span>
              </span>
            </div>

            <div className="panel-pad grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="ap-model" className="label !mb-0">Model</label>
                  {usesPresetModels && (
                    <button
                      className="text-[11px] font-semibold text-primary hover:underline"
                      onClick={() => setCustomModelOverride(!isCustomModelEditing)}
                      type="button"
                    >
                      {isCustomModelEditing ? "Pick from list" : "Type a name"}
                    </button>
                  )}
                </div>
                <div className="mt-1.5">
                  {usesPresetModels && !isCustomModelEditing ? (
                    <select
                      id="ap-model"
                      className="select"
                      value={selectedModelValue || ""}
                      onChange={(event) => updateApiSettings({ model: event.target.value })}
                    >
                      {activeModelOptions.map((model) => (
                        <option key={model} value={model}>{model}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      id="ap-model"
                      className="input"
                      placeholder="gpt-4o-mini"
                      value={api.model || ""}
                      onChange={(event) => updateApiSettings({ model: event.target.value })}
                    />
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="ap-key" className="label !mb-0">API key</label>
                  {api.apiKey && (
                    <button
                      className="text-[11px] font-semibold text-primary hover:underline"
                      onClick={() => setShowKey((v) => !v)}
                      type="button"
                    >
                      {showKey ? "Hide" : "Show"}
                    </button>
                  )}
                </div>
                <div className="mt-1.5 relative">
                  <input
                    id="ap-key"
                    className="input pr-7 font-mono text-[12px]"
                    placeholder={keyOptional ? "Not required for local Ollama" : "sk-…"}
                    type={showKey ? "text" : "password"}
                    autoComplete="off"
                    spellCheck={false}
                    value={api.apiKey || ""}
                    onChange={(event) => updateApiSettings({ apiKey: event.target.value })}
                  />
                  {api.apiKey && (
                    <span
                      className="material-symbols-outlined text-[15px] text-emerald-500 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none"
                      title="Key set"
                    >
                      check_circle
                    </span>
                  )}
                </div>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="ap-url" className="label">Endpoint</label>
                {endpointIsPinned ? (
                  <>
                    <p className="readonly-value" id="ap-url">{providerDefaults[api.provider]?.baseUrl}</p>
                    <p className="hint">
                      Fixed for this provider. The server calls its official endpoint and ignores any URL sent
                      from the browser.
                    </p>
                  </>
                ) : (
                  <>
                    <input
                      id="ap-url"
                      className="input font-mono text-[12px]"
                      placeholder="https://your-host/v1/chat/completions"
                      value={api.baseUrl || ""}
                      onChange={(event) => updateApiSettings({ baseUrl: event.target.value })}
                    />
                    <p className="hint">
                      Must be https, or a local address. Hosts on private networks are refused unless allowed
                      via WRITERDOST_ALLOWED_AI_HOSTS.
                    </p>
                  </>
                )}
              </div>

              {api.provider === "openrouter" && (
                <>
                  <div>
                    <label htmlFor="ap-app" className="label">App name</label>
                    <input
                      id="ap-app"
                      className="input"
                      placeholder="Writerdost AI"
                      value={api.appName || ""}
                      onChange={(event) => updateApiSettings({ appName: event.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="ap-site" className="label">Site URL</label>
                    <input
                      id="ap-site"
                      className="input"
                      placeholder="https://writerdost.ai"
                      value={api.siteUrl || ""}
                      onChange={(event) => updateApiSettings({ siteUrl: event.target.value })}
                    />
                  </div>
                  <p className="hint md:col-span-2 !mt-0">
                    OpenRouter shows these on your activity dashboard. Other providers ignore them.
                  </p>
                </>
              )}
            </div>

            <div className="panel-pad border-t border-[var(--hairline)] flex flex-wrap items-center gap-3">
              <button
                className="btn btn-primary"
                disabled={testing || !api.model || (!api.apiKey && !keyOptional)}
                onClick={async () => {
                  setTesting(true);
                  setConnectionStatus("untested");
                  try {
                    const timeoutPromise = new Promise((_, reject) =>
                      setTimeout(() => reject(new Error("Connection timed out (15s)")), 15000),
                    );
                    const testPromise = generateAiText({
                      api,
                      systemPrompt: "You are a brief connectivity test for a writing application.",
                      userPrompt: "Reply with exactly: Connection successful.",
                      temperature: 0,
                      topP: 1,
                    });
                    const text = (await Promise.race([testPromise, timeoutPromise])) as string;
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
                {testing ? "Testing…" : "Test connection"}
              </button>

              {message && (message.includes("Connection successful") || message.includes("API test failed")) && (
                <span
                  className={`text-[12px] ${message.includes("failed") ? "text-error" : "text-emerald-600 dark:text-emerald-400"}`}
                >
                  {message}
                </span>
              )}

              <p className="hint !mt-0 ml-auto max-w-xs text-right">
                Keys are encrypted and stored with your account, never in this browser.
              </p>
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
                      setCustomInputRate(usage.inputTokenRate.toString());
                      setCustomOutputRate(usage.outputTokenRate.toString());
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
                      setCustomInputRate(usage.inputTokenRate.toString());
                      setCustomOutputRate(usage.outputTokenRate.toString());
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

    </div>
  );
}
