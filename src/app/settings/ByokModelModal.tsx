"use client";

import { useState } from "react";
import type { ApiProvider, ByokModelConfig } from "@/lib/store-types";
import { providerDefaults, getModelDefaultRates } from "@/lib/ai-providers";
import { generateAiText } from "@/lib/ai-client";

const PROVIDERS = [
  { key: "openai", name: "OpenAI", description: "GPT-4o, GPT-4o-mini" },
  { key: "claude", name: "Claude", description: "Claude 3.5 Sonnet, Haiku" },
  { key: "gemini", name: "Gemini", description: "Gemini 1.5 Flash & Pro" },
  { key: "deepseek", name: "DeepSeek", description: "DeepSeek-Chat, Reasoner" },
  { key: "openrouter", name: "OpenRouter", description: "Multi-model router" },
  { key: "ollama", name: "Ollama (local)", description: "Runs on localhost:11434" },
  { key: "ollama_cloud", name: "Ollama Cloud", description: "Ollama hosted models" },
  { key: "custom", name: "Custom", description: "OpenAI-compatible endpoint" },
] as const;

const MODEL_PRESETS: Record<string, string[]> = {
  openai: ["gpt-4o", "gpt-4o-mini", "gpt-4-turbo", "o1-preview", "o1-mini"],
  claude: [
    "claude-haiku-5.5",
    "claude-3-5-sonnet-20240620",
    "claude-3-5-sonnet-latest",
    "claude-3-opus-20240229",
    "claude-3-haiku-20240307",
  ],
  gemini: ["gemini-1.5-flash", "gemini-1.5-pro", "gemini-2.0-flash", "gemini-1.0-pro"],
  deepseek: ["deepseek-chat", "deepseek-reasoner"],
  openrouter: [
    "openai/gpt-4o-mini",
    "anthropic/claude-3.5-sonnet",
    "google/gemini-pro-1.5",
    "meta-llama/llama-3.1-8b-instruct:free",
    "google/gemma-2-9b-it:free",
  ],
  ollama: [
    "llama3.1:8b",
    "llama3.2:3b",
    "mistral:7b",
    "phi3:latest",
    "gemma3",
  ],
  ollama_cloud: [
    "llama3.1:8b",
    "llama3.2:3b",
    "mistral:7b",
    "phi3:latest",
  ],
  custom: [],
};

interface ByokModelModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (config: Omit<ByokModelConfig, "id" | "createdAt" | "usage">) => void;
  initialData?: ByokModelConfig | null;
}

interface ByokModelFormProps {
  initialData?: ByokModelConfig | null;
  onClose: () => void;
  onSave: (config: Omit<ByokModelConfig, "id" | "createdAt" | "usage">) => void;
}

function ByokModelForm({ initialData, onClose, onSave }: ByokModelFormProps) {
  const initialProvider = initialData?.provider ?? "openai";
  const initialModel = initialData?.model ?? "gpt-4o-mini";
  const initialRates = initialData
    ? { inputRate: initialData.inputTokenRate, outputRate: initialData.outputTokenRate }
    : getModelDefaultRates(initialProvider, initialModel);
  const initialIsFree = Boolean(
    initialData?.isFree ||
    initialProvider === "ollama" ||
    initialProvider === "ollama_cloud" ||
    (initialRates.inputRate === 0 && initialRates.outputRate === 0)
  );

  const [provider, setProvider] = useState<ApiProvider>(initialProvider);
  const [name, setName] = useState(initialData?.name ?? "My OpenAI GPT-4o Mini");
  const [model, setModel] = useState(initialModel);
  const [apiKey, setApiKey] = useState(initialData?.apiKey ?? "");
  const [baseUrl, setBaseUrl] = useState(initialData?.baseUrl ?? providerDefaults.openai.baseUrl);
  const [inputTokenRate, setInputTokenRate] = useState<number>(initialIsFree ? 0 : initialRates.inputRate);
  const [outputTokenRate, setOutputTokenRate] = useState<number>(initialIsFree ? 0 : initialRates.outputRate);
  const [isFree, setIsFree] = useState(initialIsFree);
  const [isDefault, setIsDefault] = useState(Boolean(initialData?.isDefault));
  const [showKey, setShowKey] = useState(false);
  const [customModelMode, setCustomModelMode] = useState(
    Boolean(initialData && !MODEL_PRESETS[initialData.provider]?.includes(initialData.model))
  );

  // Test connection state
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{ status: "idle" | "success" | "error"; message: string }>({
    status: "idle",
    message: "",
  });

  const handleIsFreeChange = (free: boolean) => {
    setIsFree(free);
    if (free) {
      setInputTokenRate(0);
      setOutputTokenRate(0);
    } else {
      const rates = getModelDefaultRates(provider, model);
      setInputTokenRate(rates.inputRate > 0 ? rates.inputRate : 1.0);
      setOutputTokenRate(rates.outputRate > 0 ? rates.outputRate : 2.0);
    }
  };

  const handleProviderChange = (newProvider: ApiProvider) => {
    setProvider(newProvider);
    const defaults = providerDefaults[newProvider];
    const defaultModel = defaults?.model || "";
    setModel(defaultModel);
    setBaseUrl(defaults?.baseUrl || "");
    const rates = getModelDefaultRates(newProvider, defaultModel);
    const freeByDefault = newProvider === "ollama" || newProvider === "ollama_cloud";
    setIsFree(freeByDefault);
    setInputTokenRate(freeByDefault ? 0 : rates.inputRate);
    setOutputTokenRate(freeByDefault ? 0 : rates.outputRate);
    setCustomModelMode(false);
    if (!initialData) {
      const pObj = PROVIDERS.find((p) => p.key === newProvider);
      setName(`My ${pObj?.name || newProvider} (${defaultModel || "Model"})`);
    }
  };

  const handleModelChange = (newModel: string) => {
    setModel(newModel);
    if (newModel.includes(":free")) {
      setIsFree(true);
      setInputTokenRate(0);
      setOutputTokenRate(0);
    } else if (!isFree) {
      const rates = getModelDefaultRates(provider, newModel);
      setInputTokenRate(rates.inputRate);
      setOutputTokenRate(rates.outputRate);
    }
    if (!initialData && name.startsWith("My ")) {
      const pObj = PROVIDERS.find((p) => p.key === provider);
      setName(`My ${pObj?.name || provider} (${newModel})`);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setTestResult({ status: "idle", message: "" });
    try {
      await generateAiText({
        api: {
          provider,
          apiKey,
          baseUrl,
          model,
          appName: "Writerdost AI",
          siteUrl: typeof window !== "undefined" ? window.location.origin : "",
        },
        systemPrompt: "You are a connectivity test ping. Respond with 'PONG'.",
        userPrompt: "Ping",
        temperature: 0.1,
      });
      setTestResult({ status: "success", message: "Connection successful! Model responded." });
    } catch (err) {
      setTestResult({
        status: "error",
        message: err instanceof Error ? err.message : "Connection failed. Please check credentials.",
      });
    } finally {
      setTesting(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave({
      name: name.trim(),
      provider,
      model: model.trim(),
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim(),
      inputTokenRate: isFree ? 0 : Number(inputTokenRate) || 0,
      outputTokenRate: isFree ? 0 : Number(outputTokenRate) || 0,
      isDefault,
      isFree,
    });
    onClose();
  };

  const presets = MODEL_PRESETS[provider] || [];
  const keyOptional = provider === "ollama";
  const endpointIsPinned = ["openai", "claude", "gemini", "deepseek", "openrouter"].includes(provider);

  return (
    <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
      {/* Friendly Name */}
      <div className="space-y-1.5">
        <label className="label">Model Friendly Name</label>
        <input
          type="text"
          required
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. Primary Claude 3.5 Sonnet, DeepSeek Fast"
          className="input w-full"
        />
      </div>

      {/* Provider Selection */}
      <div className="space-y-1.5">
        <label className="label">Provider</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
          {PROVIDERS.map((p) => {
            const selected = provider === p.key;
            return (
              <button
                key={p.key}
                type="button"
                onClick={() => handleProviderChange(p.key)}
                className={`p-2 rounded-xl text-left border transition-all text-xs flex flex-col justify-between ${
                  selected
                    ? "border-primary bg-primary/10 text-primary font-semibold shadow-sm"
                    : "border-outline-variant/30 hover:border-outline-variant/60 bg-surface-container-low text-on-surface"
                }`}
              >
                <span>{p.name}</span>
                <span className="text-[10px] text-on-surface-variant truncate opacity-80 mt-0.5">
                  {p.description}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Model Name / Selector */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="label">Model</label>
          {presets.length > 0 && (
            <button
              type="button"
              onClick={() => setCustomModelMode(!customModelMode)}
              className="text-xs text-primary hover:underline"
            >
              {customModelMode ? "Choose from presets" : "Enter custom model name"}
            </button>
          )}
        </div>

        {presets.length > 0 && !customModelMode ? (
          <select
            className="select w-full"
            value={model}
            onChange={(e) => handleModelChange(e.target.value)}
          >
            {presets.map((m) => (
              <option key={m} value={m} className="text-black">
                {m}
              </option>
            ))}
          </select>
        ) : (
          <input
            type="text"
            required
            value={model}
            onChange={(e) => handleModelChange(e.target.value)}
            placeholder="e.g. gpt-4o, claude-3-5-sonnet-20240620, deepseek-chat"
            className="input w-full"
          />
        )}
      </div>

      {/* API Key */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between">
          <label className="label">
            API Key {keyOptional ? <span className="text-xs font-normal text-on-surface-variant">(Optional for local Ollama)</span> : <span className="text-error">*</span>}
          </label>
          <button
            type="button"
            onClick={() => setShowKey(!showKey)}
            className="text-xs text-on-surface-variant hover:text-on-surface flex items-center gap-1"
          >
            <span className="material-symbols-outlined text-[14px]">
              {showKey ? "visibility_off" : "visibility"}
            </span>
            <span>{showKey ? "Hide" : "Show"}</span>
          </button>
        </div>
        <input
          type={showKey ? "text" : "password"}
          required={!keyOptional}
          value={apiKey}
          onChange={(e) => setApiKey(e.target.value)}
          placeholder={keyOptional ? "Not required for localhost" : "sk-..."}
          className="input w-full font-mono text-xs"
        />
      </div>

      {/* Base URL */}
      <div className="space-y-1.5">
        <label className="label">
          API Endpoint URL {endpointIsPinned && <span className="text-xs font-normal text-on-surface-variant">(Standard endpoint)</span>}
        </label>
        <input
          type="text"
          required
          readOnly={endpointIsPinned}
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value)}
          className={`input w-full font-mono text-xs ${endpointIsPinned ? "opacity-75 bg-surface-container-highest cursor-not-allowed" : ""}`}
        />
      </div>

      {/* Rates: Input & Output per 1M */}
      <div className="pt-2 border-t border-outline-variant/20 space-y-3">
        {/* Free Provider / Zero-Cost Tick Option */}
        <label className="flex items-center gap-2.5 cursor-pointer p-2.5 rounded-xl bg-emerald-500/5 hover:bg-emerald-500/10 border border-emerald-500/20 transition-all select-none">
          <input
            type="checkbox"
            checked={isFree}
            onChange={(e) => handleIsFreeChange(e.target.checked)}
            className="checkbox checkbox-primary rounded w-4 h-4 accent-emerald-500"
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-on-surface">
                Free Provider / Zero-Cost API
              </span>
              <span className="chip bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 text-[10px] py-0 px-1.5 border border-emerald-500/25">
                $0.00 / 1M
              </span>
            </div>
            <p className="text-[11px] text-on-surface-variant">
              Nullify cost calculations for this model (ideal for local Ollama, free-tier keys, or open-source proxies).
            </p>
          </div>
        </label>

        <div className={`grid grid-cols-1 sm:grid-cols-2 gap-3 transition-opacity ${isFree ? "opacity-40 pointer-events-none" : ""}`}>
          <div className="space-y-1.5">
            <label className="label text-xs">Input Rate ($ / 1M tokens)</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                disabled={isFree}
                value={isFree ? 0 : inputTokenRate}
                onChange={(e) => setInputTokenRate(parseFloat(e.target.value) || 0)}
                className="input pl-6 w-full text-xs font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="label text-xs">Output Rate ($ / 1M tokens)</label>
            <div className="relative">
              <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs text-on-surface-variant">$</span>
              <input
                type="number"
                step="0.01"
                min="0"
                disabled={isFree}
                value={isFree ? 0 : outputTokenRate}
                onChange={(e) => setOutputTokenRate(parseFloat(e.target.value) || 0)}
                className="input pl-6 w-full text-xs font-mono"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Default Model Checkbox */}
      <label className="flex items-center gap-2 cursor-pointer pt-2">
        <input
          type="checkbox"
          checked={isDefault}
          onChange={(e) => setIsDefault(e.target.checked)}
          className="checkbox checkbox-primary rounded"
        />
        <span className="text-xs font-medium text-on-surface">
          Set as primary default BYOK model for generations
        </span>
      </label>

      {/* Connection Test Result */}
      {testResult.message && (
        <div
          className={`p-3 rounded-xl text-xs flex items-center gap-2 ${
            testResult.status === "success"
              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
          }`}
        >
          <span className="material-symbols-outlined text-sm">
            {testResult.status === "success" ? "check_circle" : "error"}
          </span>
          <span>{testResult.message}</span>
        </div>
      )}

      {/* Buttons */}
      <div className="flex items-center justify-between pt-4 border-t border-outline-variant/20 gap-2">
        <button
          type="button"
          onClick={handleTestConnection}
          disabled={testing || (!apiKey && !keyOptional)}
          className="btn btn-secondary btn-sm flex items-center gap-1.5"
        >
          <span className={`material-symbols-outlined text-[15px] ${testing ? "animate-spin" : ""}`}>
            {testing ? "sync" : "cable"}
          </span>
          <span>{testing ? "Testing..." : "Test Connection"}</span>
        </button>

        <div className="flex items-center gap-2">
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">
            Cancel
          </button>
          <button type="submit" className="btn btn-primary btn-sm">
            {initialData ? "Save Changes" : "Add Model"}
          </button>
        </div>
      </div>
    </form>
  );
}

export function ByokModelModal({ isOpen, onClose, onSave, initialData }: ByokModelModalProps) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fade-in font-body overflow-y-auto"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-xl bg-surface-container border border-outline-variant/30 rounded-2xl shadow-2xl overflow-hidden text-on-surface my-auto">
        <div className="h-1.5 w-full bg-gradient-to-r from-primary via-indigo-500 to-amber-500" />

        <div className="flex items-center justify-between p-5 border-b border-outline-variant/20">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-lg">smart_toy</span>
            </span>
            <h3 className="text-lg font-bold text-on-surface">
              {initialData ? "Edit BYOK Model" : "Add BYOK Model"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors"
            type="button"
            aria-label="Close"
          >
            <span className="material-symbols-outlined text-lg">close</span>
          </button>
        </div>

        <ByokModelForm
          key={initialData?.id ?? "new_byok_model"}
          initialData={initialData}
          onClose={onClose}
          onSave={onSave}
        />
      </div>
    </div>
  );
}
