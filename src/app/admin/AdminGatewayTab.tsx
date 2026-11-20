"use client";

import { useState, useEffect, useCallback } from "react";
import { authHeader } from "@/lib/appwrite/client";
import {
  type BizAiGatewayConfig,
  DEFAULT_BIZAI_GATEWAY_CONFIG,
  type ApiProvider,
  type GatewayAnalytics,
  type GatewayProviderInstance,
  type GatewayTierMode,
  type GatewayPlanTier,
} from "@/lib/store-types";
import { MODEL_PRESETS } from "@/app/settings/ByokModelModal";
import { getModelDefaultRates, providerDefaults } from "@/lib/ai-providers";
import { generateAiText } from "@/lib/ai-client";

async function gatewayApi(path: string, init: RequestInit = {}) {
  const auth = await authHeader();
  return fetch(path, {
    ...init,
    headers: {
      "content-type": "application/json",
      ...auth,
      ...(init.headers as Record<string, string> | undefined),
    },
  });
}

interface AdminGatewayTabProps {
  onNotifyError?: (msg: string) => void;
}

const formatTokens = (tokens: number) => {
  if (tokens >= 1_000_000) return (tokens / 1_000_000).toFixed(2) + "M";
  if (tokens >= 10_000) return (tokens / 1_000).toFixed(0) + "K";
  if (tokens >= 1_000) return (tokens / 1_000).toFixed(1) + "K";
  return (tokens || 0).toLocaleString();
};

const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(amount || 0);
};

interface ProviderDefinition {
  id: ApiProvider;
  keyId?: keyof BizAiGatewayConfig["serverKeys"];
  name: string;
  description: string;
  icon: string;
  placeholder: string;
  colorClass: string;
  colorHex: string;
  isFree?: boolean;
  noKeyRequired?: boolean;
}

const GATEWAY_PROVIDERS: ProviderDefinition[] = [
  {
    id: "claude",
    keyId: "anthropic",
    name: "Anthropic Claude",
    description: "Claude Sonnet 5.5, Opus 5.5, Fable 5.2",
    icon: "psychology",
    placeholder: "sk-ant-api03-...",
    colorClass: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    colorHex: "#f59e0b",
  },
  {
    id: "openai",
    keyId: "openai",
    name: "OpenAI",
    description: "GPT-6.1 Sol, GPT-6 Astra, Luna, GPT-5",
    icon: "smart_toy",
    placeholder: "sk-proj-...",
    colorClass: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    colorHex: "#10b981",
  },
  {
    id: "gemini",
    keyId: "gemini",
    name: "Google Gemini",
    description: "Gemini 4 Carbon, 3.8 Flash, 3.5 Lite",
    icon: "auto_awesome",
    placeholder: "AIzaSy...",
    colorClass: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    colorHex: "#06b6d4",
  },
  {
    id: "deepseek",
    keyId: "deepseek",
    name: "DeepSeek",
    description: "DeepSeek V4.1 Flash, V4 Pro, Reasoner",
    icon: "neurology",
    placeholder: "sk-...",
    colorClass: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    colorHex: "#3b82f6",
  },
  {
    id: "groq",
    keyId: "groq",
    name: "Groq Cloud",
    description: "Ultra-fast LPU inference (Free Tier on console.groq.com)",
    icon: "speed",
    placeholder: "gsk_...",
    colorClass: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    colorHex: "#f97316",
    isFree: true,
  },
  {
    id: "commandcode",
    keyId: "commandcode",
    name: "CommandCode",
    description: "Agentic coding & taste-1 architecture",
    icon: "terminal",
    placeholder: "cmd_...",
    colorClass: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    colorHex: "#6366f1",
  },
  {
    id: "openrouter",
    keyId: "openrouter",
    name: "OpenRouter",
    description: "Multi-model unified router with automated failover",
    icon: "hub",
    placeholder: "sk-or-v1-...",
    colorClass: "bg-purple-500/10 text-purple-400 border-purple-500/20",
    colorHex: "#a855f7",
  },
  {
    id: "ollama",
    keyId: undefined,
    name: "Ollama (Local / Cloud)",
    description: "Free self-hosted localhost:11434 & cloud instances",
    icon: "dns",
    placeholder: "http://localhost:11434/v1",
    colorClass: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    colorHex: "#14b8a6",
    isFree: true,
    noKeyRequired: true,
  },
];

export const GATEWAY_PLAN_TIERS: Array<{
  id: GatewayPlanTier;
  label: string;
  price: string;
  shortDesc: string;
  description: string;
  activeClass: string;
  badgeClass: string;
}> = [
  {
    id: "Free",
    label: "Free Plan",
    price: "Free Forever ($0)",
    shortDesc: "Standard Models / Free Tier",
    description: "Free Forever users ($0/mo) - High speed, zero-cost models (e.g. Groq, Ollama)",
    activeClass: "bg-teal-500/20 text-teal-300 border-teal-500/50 shadow-xs",
    badgeClass: "bg-teal-500/15 text-teal-400 border border-teal-500/30",
  },
  {
    id: "Basic",
    label: "Basic Plan",
    price: "$5/mo",
    shortDesc: "Basic Writers ($5/mo)",
    description: "Basic plan subscribers ($5/month) - Reliable book & blog generation",
    activeClass: "bg-blue-500/20 text-blue-300 border-blue-500/50 shadow-xs",
    badgeClass: "bg-blue-500/15 text-blue-400 border border-blue-500/30",
  },
  {
    id: "Pro",
    label: "Pro Plan",
    price: "$19/mo",
    shortDesc: "Pro Writers ($19/mo)",
    description: "Pro Writer subscribers ($19/month) - Advanced reasoning & long-context models",
    activeClass: "bg-purple-500/20 text-purple-300 border-purple-500/50 shadow-xs",
    badgeClass: "bg-purple-500/15 text-purple-400 border border-purple-500/30",
  },
  {
    id: "Enterprise",
    label: "Enterprise",
    price: "$49+/mo",
    shortDesc: "Enterprise / Custom",
    description: "Enterprise & high-volume teams - Dedicated high-throughput tier",
    activeClass: "bg-amber-500/20 text-amber-300 border-amber-500/50 shadow-xs",
    badgeClass: "bg-amber-500/15 text-amber-400 border border-amber-500/30",
  },
];

export function AdminGatewayTab({ onNotifyError }: AdminGatewayTabProps) {
  const [gatewayConfig, setGatewayConfig] = useState<BizAiGatewayConfig>(DEFAULT_BIZAI_GATEWAY_CONFIG);
  const [analytics, setAnalytics] = useState<GatewayAnalytics | null>(null);
  const [gatewaySaving, setGatewaySaving] = useState(false);
  const [savedProviderId, setSavedProviderId] = useState<string | null>(null);
  const [gatewayMsg, setGatewayMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [showKeyToggles, setShowKeyToggles] = useState<Record<string, boolean>>({});
  const [customPrimaryModelMode, setCustomPrimaryModelMode] = useState(false);
  const [customModelModes, setCustomModelModes] = useState<Record<string, boolean>>({});
  const [showCustomEndpoints, setShowCustomEndpoints] = useState<Record<string, boolean>>({});
  const [testingProviders, setTestingProviders] = useState<Record<string, boolean>>({});
  const [testResults, setTestResults] = useState<Record<string, { status: "success" | "error"; message: string } | undefined>>({});
  const [addProviderOpen, setAddProviderOpen] = useState(false);

  const ensureInstances = useCallback((config: BizAiGatewayConfig): GatewayProviderInstance[] => {
    if (config.instances && config.instances.length > 0) {
      return config.instances;
    }
    const synthetic: GatewayProviderInstance[] = [];
    const providers = config.configuredProviders || [];
    // Only synthesize for providers that actually have a configured server key, were explicitly configured, or are primary
    const allProviders = Array.from(
      new Set([
        ...providers,
        ...(config.primaryProvider ? [config.primaryProvider] : []),
        ...Object.keys(config.serverKeys || {})
          .filter((k) => Boolean(config.serverKeys?.[k as keyof typeof config.serverKeys]?.trim()))
          .map((k) => {
            const match = GATEWAY_PROVIDERS.find((p) => p.keyId === k);
            return match ? match.id : null;
          })
          .filter((id): id is ApiProvider => id !== null),
      ])
    );

    for (const provId of allProviders) {
      const provDef = GATEWAY_PROVIDERS.find((p) => p.id === provId);
      if (!provDef) continue;
      const isPrimary = config.primaryProvider === provId;
      const fallbackIndices = (config.fallbacks || [])
        .map((f, idx) => (f.enabled && f.provider === provId ? idx + 1 : null))
        .filter((n): n is number => n !== null);

      synthetic.push({
        id: `inst_${provId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        provider: provId,
        label: provDef.name,
        model:
          config.providerModels?.[provId] ||
          (isPrimary ? config.primaryModel || "" : "") ||
          MODEL_PRESETS[provId]?.[0] ||
          "",
        apiKey: provDef.keyId ? config.serverKeys?.[provDef.keyId] || "" : "",
        customEndpoint: config.customEndpoints?.[provId] || "",
        isFree: Boolean(provDef.isFree || config.freeProviders?.[provId]),
        tier: isPrimary ? "primary" : "standby",
        role: isPrimary ? "primary" : "standby",
        planTiers: ["Free", "Basic", "Pro", "Enterprise"],
        fallbackTiers: fallbackIndices.length > 0 ? fallbackIndices : [1],
        standbyPriority: fallbackIndices.length > 0 ? fallbackIndices[0] : 1,
        createdAt: Date.now(),
      });
    }

    if (synthetic.length === 0) {
      synthetic.push({
        id: "inst_groq_default",
        provider: "groq",
        label: "Groq Cloud",
        model: "openai/gpt-oss-120b",
        apiKey: config.serverKeys?.groq || "",
        customEndpoint: "",
        isFree: true,
        tier: "primary",
        role: "primary",
        planTiers: ["Free", "Basic", "Pro", "Enterprise"],
        fallbackTiers: [],
        createdAt: Date.now(),
      });
    }

    return synthetic;
  }, []);

  const instances = gatewayConfig.instances && gatewayConfig.instances.length > 0
    ? gatewayConfig.instances
    : ensureInstances(gatewayConfig);

  const primaryInstance = instances.find(
    (i) => i.role === "primary" || i.tier === "primary" || i.id === gatewayConfig.primaryInstanceId
  );

  const standbyInsts = instances.filter(
    (i) =>
      (i.role === "standby" || i.tier === "standby" || i.tier === "fallback" || (i.fallbackTiers && i.fallbackTiers.length > 0)) &&
      i.id !== primaryInstance?.id
  ).sort((a, b) => {
    const pA = a.standbyPriority || (a.fallbackTiers?.[0] ?? 99);
    const pB = b.standbyPriority || (b.fallbackTiers?.[0] ?? 99);
    return pA - pB;
  });

  const unconfiguredCount = instances.filter(
    (i) => !i.apiKey && i.provider !== "ollama" && i.id !== primaryInstance?.id
  ).length;

  const tierEntries: Array<{ tierNum: number; inst: GatewayProviderInstance }> = standbyInsts.map((inst, idx) => ({
    tierNum: inst.standbyPriority || (inst.fallbackTiers?.[0] ?? (idx + 1)),
    inst,
  }));

  const handleAddProviderInstance = async (provId: ApiProvider) => {
    const provDef = GATEWAY_PROVIDERS.find((p) => p.id === provId);
    const countSame = instances.filter((i) => i.provider === provId).length;
    const label = countSame === 0 ? (provDef?.name || provId) : `${provDef?.name || provId} #${countSame + 1}`;
    const hasPrimary = instances.some((i) => i.role === "primary" || i.tier === "primary");
    const nextInst: GatewayProviderInstance = {
      id: `inst_${provId}_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      provider: provId,
      label,
      model: MODEL_PRESETS[provId]?.[0] || "",
      apiKey: provDef?.keyId ? gatewayConfig.serverKeys?.[provDef.keyId] || "" : "",
      customEndpoint: gatewayConfig.customEndpoints?.[provId] || "",
      isFree: Boolean(provDef?.isFree || gatewayConfig.freeProviders?.[provId]),
      tier: !hasPrimary ? "primary" : "standby",
      role: !hasPrimary ? "primary" : "standby",
      planTiers: ["Free", "Basic", "Pro", "Enterprise"],
      fallbackTiers: !hasPrimary ? [] : [standbyInsts.length + 1],
      standbyPriority: !hasPrimary ? undefined : standbyInsts.length + 1,
      createdAt: Date.now(),
    };
    const nextInstances = [...instances, nextInst];
    const nextConfig: BizAiGatewayConfig = {
      ...gatewayConfig,
      instances: nextInstances,
      configuredProviders: Array.from(new Set(nextInstances.map((i) => i.provider))),
      ...(!hasPrimary ? { primaryProvider: provId, primaryModel: nextInst.model, primaryInstanceId: nextInst.id } : {}),
    };
    setGatewayConfig(nextConfig);
    setAddProviderOpen(false);

    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("writerdost_admin_gateway_config", JSON.stringify(nextConfig));
      }
      const res = await gatewayApi("/api/admin/gateway", {
        method: "POST",
        body: JSON.stringify(nextConfig),
      });
      const data = await res.json();
      if (data?.config) {
        setGatewayConfig(data.config);
      }
    } catch {
      // Non-blocking
    }
  };

  const handlePruneUnconfigured = async () => {
    if (!confirm(`Remove ${unconfiguredCount} unconfigured provider instance(s) with no API key set?`)) return;
    const kept = instances.filter(
      (i) => (i.apiKey && i.apiKey.trim().length > 0) || i.provider === "ollama" || i.id === primaryInstance?.id
    );
    const nextConfig: BizAiGatewayConfig = {
      ...gatewayConfig,
      instances: kept,
      configuredProviders: Array.from(new Set(kept.map((i) => i.provider))),
    };
    setGatewayConfig(nextConfig);
    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("writerdost_admin_gateway_config", JSON.stringify(nextConfig));
      }
      const res = await gatewayApi("/api/admin/gateway", {
        method: "POST",
        body: JSON.stringify(nextConfig),
      });
      const data = await res.json();
      if (data?.config) {
        setGatewayConfig(data.config);
      }
    } catch {
      // Non-blocking
    }
  };

  const handleRemoveProviderInstance = async (instId: string) => {
    const inst = instances.find((i) => i.id === instId);
    if (!inst) return;
    if (!confirm(`Are you sure you want to remove instance "${inst.label || inst.provider}"?`)) return;
    const nextInstances = instances.filter((i) => i.id !== instId);
    let nextPrimary = gatewayConfig.primaryProvider;
    let nextPrimaryModel = gatewayConfig.primaryModel;
    let nextPrimaryId = gatewayConfig.primaryInstanceId;

    if (inst.role === "primary" || inst.tier === "primary") {
      const remainingPrimary = nextInstances[0];
      if (remainingPrimary) {
        remainingPrimary.role = "primary";
        remainingPrimary.tier = "primary";
        remainingPrimary.fallbackTiers = [];
        nextPrimary = remainingPrimary.provider;
        nextPrimaryModel = remainingPrimary.model;
        nextPrimaryId = remainingPrimary.id;
      } else {
        nextPrimary = undefined;
        nextPrimaryModel = "";
        nextPrimaryId = undefined;
      }
    }

    const nextConfig: BizAiGatewayConfig = {
      ...gatewayConfig,
      instances: nextInstances,
      configuredProviders: Array.from(new Set(nextInstances.map((i) => i.provider))),
      primaryProvider: nextPrimary,
      primaryModel: nextPrimaryModel,
      primaryInstanceId: nextPrimaryId,
    };
    setGatewayConfig(nextConfig);

    try {
      if (typeof window !== "undefined") {
        localStorage.setItem("writerdost_admin_gateway_config", JSON.stringify(nextConfig));
      }
      const res = await gatewayApi("/api/admin/gateway", {
        method: "POST",
        body: JSON.stringify(nextConfig),
      });
      const data = await res.json();
      if (data?.config) {
        setGatewayConfig(data.config);
      }
    } catch {
      // Non-blocking
    }
  };

  const handleUpdateInstance = (instId: string, updates: Partial<GatewayProviderInstance>) => {
    const nextInstances = instances.map((inst) => {
      if (inst.id === instId) {
        return { ...inst, ...updates };
      }
      return inst;
    });
    setGatewayConfig({
      ...gatewayConfig,
      instances: nextInstances,
    });
  };

  const handleSetRole = (instId: string, role: "primary" | "standby") => {
    const targetInst = instances.find((i) => i.id === instId);
    if (!targetInst) return;

    if (role === "primary") {
      const next = instances.map((inst) => {
        if (inst.id === instId) {
          return {
            ...inst,
            role: "primary" as const,
            tier: "primary" as const,
            fallbackTiers: [],
            standbyPriority: undefined,
          };
        }
        if (inst.role === "primary" || inst.tier === "primary") {
          return {
            ...inst,
            role: "standby" as const,
            tier: "standby" as const,
            standbyPriority: 1,
            fallbackTiers: [1],
          };
        }
        return inst;
      });
      setGatewayConfig({
        ...gatewayConfig,
        instances: next,
        primaryProvider: targetInst.provider,
        primaryModel: targetInst.model,
        primaryInstanceId: targetInst.id,
      });
    } else {
      const next = instances.map((inst) => {
        if (inst.id === instId) {
          return {
            ...inst,
            role: "standby" as const,
            tier: "standby" as const,
            standbyPriority: inst.standbyPriority || 1,
            fallbackTiers: [inst.standbyPriority || 1],
          };
        }
        return inst;
      });
      const otherPrimary = next.find((i) => (i.role === "primary" || i.tier === "primary") && i.id !== instId);
      if (!otherPrimary && next.length > 1) {
        const firstOther = next.find((i) => i.id !== instId);
        if (firstOther) {
          firstOther.role = "primary";
          firstOther.tier = "primary";
          firstOther.fallbackTiers = [];
        }
      }
      const prim = next.find((i) => i.role === "primary" || i.tier === "primary");
      setGatewayConfig({
        ...gatewayConfig,
        instances: next,
        primaryProvider: prim?.provider,
        primaryModel: prim?.model,
        primaryInstanceId: prim?.id,
      });
    }
  };

  const handleSetStandbyPriority = (instId: string, priority: number) => {
    const next = instances.map((inst) => {
      if (inst.id === instId) {
        return {
          ...inst,
          role: "standby" as const,
          tier: "standby" as const,
          standbyPriority: priority,
          fallbackTiers: [priority],
        };
      }
      return inst;
    });
    setGatewayConfig({
      ...gatewayConfig,
      instances: next,
    });
  };

  const handleTogglePlanTier = (instId: string, planTier: GatewayPlanTier) => {
    const next = instances.map((inst) => {
      if (inst.id === instId) {
        const currentPlans = inst.planTiers || ["Free", "Basic", "Pro", "Enterprise"];
        const nextPlans = currentPlans.includes(planTier)
          ? currentPlans.filter((p) => p !== planTier)
          : [...currentPlans, planTier];
        return {
          ...inst,
          planTiers: nextPlans,
        };
      }
      return inst;
    });
    setGatewayConfig({
      ...gatewayConfig,
      instances: next,
    });
  };

  const handleToggleAllPlans = (instId: string) => {
    const allPlanIds: GatewayPlanTier[] = ["Free", "Basic", "Pro", "Enterprise"];
    const next = instances.map((inst) => {
      if (inst.id === instId) {
        const currentPlans = inst.planTiers || [];
        const nextPlans = currentPlans.length === allPlanIds.length ? [] : allPlanIds;
        return {
          ...inst,
          planTiers: nextPlans,
        };
      }
      return inst;
    });
    setGatewayConfig({
      ...gatewayConfig,
      instances: next,
    });
  };

  const handleSetPrimaryTier = (instId: string) => handleSetRole(instId, "primary");
  const handleToggleFallbackTier = (instId: string, tierNum: number) => handleSetStandbyPriority(instId, tierNum);

  const scrollToInstance = (id: string) => {
    setAddProviderOpen(false);
    if (typeof document !== "undefined") {
      const el = document.getElementById(`provider-instance-${id}`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        el.classList.add("ring-2", "ring-primary");
        setTimeout(() => el.classList.remove("ring-2", "ring-primary"), 2500);
      }
    }
  };

  const handleTestInstance = async (inst: GatewayProviderInstance) => {
    setTestingProviders((prev) => ({ ...prev, [inst.id]: true }));
    setTestResults((prev) => ({ ...prev, [inst.id]: undefined }));

    const activeModel = inst.model;
    const activeBaseUrl = inst.customEndpoint || providerDefaults[inst.provider]?.baseUrl;
    const provDef = GATEWAY_PROVIDERS.find((p) => p.id === inst.provider);
    const fallbackServerKey = provDef?.keyId ? gatewayConfig.serverKeys?.[provDef.keyId] : "";
    const activeKey = inst.apiKey?.includes("••••") ? "" : (inst.apiKey || fallbackServerKey || "");

    if (!activeModel) {
      setTestResults((prev) => ({
        ...prev,
        [inst.id]: {
          status: "error",
          message: "Please enter or select a model for this instance before testing.",
        },
      }));
      setTestingProviders((prev) => ({ ...prev, [inst.id]: false }));
      return;
    }

    try {
      await generateAiText({
        api: {
          provider: inst.provider,
          apiKey: activeKey,
          baseUrl: activeBaseUrl,
          model: activeModel,
          appName: "Writerdost AI (Gateway Ping)",
          siteUrl: typeof window !== "undefined" ? window.location.origin : "",
        },
        systemPrompt: "You are an automated connectivity test ping. Respond strictly with 'OK'.",
        userPrompt: "Ping",
      });

      setTestResults((prev) => ({
        ...prev,
        [inst.id]: {
          status: "success",
          message: `Connection successful: ${inst.provider}/${activeModel} responded properly.`,
        },
      }));
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [inst.id]: {
          status: "error",
          message: `Connection failed: ${err instanceof Error ? err.message : "Unknown error"}`,
        },
      }));
    } finally {
      setTestingProviders((prev) => ({ ...prev, [inst.id]: false }));
    }
  };

  const fetchGatewayData = useCallback(async (isInitial = false) => {
    try {
      const res = await gatewayApi("/api/admin/gateway");
      const d = await res.json();
      if (isInitial && d?.config) {
        let effectiveConfig = d.config;
        if (typeof window !== "undefined") {
          const cached = localStorage.getItem("writerdost_admin_gateway_config");
          if (cached) {
            try {
              const parsed = JSON.parse(cached);
              if (parsed?.configuredProviders?.length && (!d.config.configuredProviders || d.config.configuredProviders.length === 0)) {
                effectiveConfig = { ...d.config, ...parsed };
                // Sync back to server
                gatewayApi("/api/admin/gateway", {
                  method: "POST",
                  body: JSON.stringify(effectiveConfig),
                }).catch(() => {});
              }
            } catch {
              // ignore invalid cache
            }
          }
        }
        if (!effectiveConfig.instances || effectiveConfig.instances.length === 0) {
          effectiveConfig.instances = ensureInstances(effectiveConfig);
        }
        setGatewayConfig(effectiveConfig);
      }
      if (d?.analytics) {
        setAnalytics(d.analytics);
      }
    } catch (err) {
      if (isInitial) {
        onNotifyError?.(err instanceof Error ? err.message : "Failed to load gateway configuration");
      }
    }
  }, [ensureInstances, onNotifyError]);

  useEffect(() => {
    fetchGatewayData(true);
    // Poll ONLY analytics every 15s to update live RPM and token meters (do NOT overwrite in-progress edits)
    const interval = setInterval(() => fetchGatewayData(false), 15000);
    return () => clearInterval(interval);
  }, [fetchGatewayData]);

  const handleSaveGateway = async (forProviderId?: string | unknown) => {
    const provId = typeof forProviderId === "string" ? forProviderId : undefined;
    setGatewaySaving(true);
    setGatewayMsg(null);
    try {
      const res = await gatewayApi("/api/admin/gateway", {
        method: "POST",
        body: JSON.stringify(gatewayConfig),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update BizAI Gateway settings");
      setGatewayConfig(data.config);
      if (typeof window !== "undefined") {
        localStorage.setItem("writerdost_admin_gateway_config", JSON.stringify(data.config));
      }
      if (data.analytics) setAnalytics(data.analytics);
      if (provId) {
        setSavedProviderId(provId);
        setTimeout(() => setSavedProviderId(null), 3000);
      }
      setGatewayMsg({
        type: "success",
        text: provId
          ? `${GATEWAY_PROVIDERS.find((p) => p.id === provId)?.name || provId} settings and key saved successfully!`
          : "BizAI Gateway & Provider configurations saved successfully!",
      });
      setTimeout(() => setGatewayMsg(null), 3500);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Save failed";
      setGatewayMsg({ type: "error", text: msg });
      onNotifyError?.(msg);
    } finally {
      setGatewaySaving(false);
    }
  };

  const handleResetAnalytics = async () => {
    if (!confirm("Are you sure you want to reset all Gateway analytics and per-API usage counters?")) {
      return;
    }
    try {
      const res = await gatewayApi("/api/admin/gateway", {
        method: "POST",
        body: JSON.stringify({ action: "reset_analytics" }),
      });
      const data = await res.json();
      if (data.analytics) {
        setAnalytics(data.analytics);
        setGatewayMsg({ type: "success", text: "Gateway usage and RPM counters reset successfully." });
        setTimeout(() => setGatewayMsg(null), 3000);
      }
    } catch (err) {
      onNotifyError?.(err instanceof Error ? err.message : "Failed to reset analytics");
    }
  };

  const handleTestProvider = async (provider: ApiProvider) => {
    setTestingProviders((prev) => ({ ...prev, [provider]: true }));
    setTestResults((prev) => ({ ...prev, [provider]: undefined }));

    const provDef = GATEWAY_PROVIDERS.find((p) => p.id === provider);
    const keyId = provDef?.keyId;
    const currentKey = keyId ? gatewayConfig.serverKeys?.[keyId] || "" : "";
    const activeModel =
      gatewayConfig.providerModels?.[provider] ||
      (provider === gatewayConfig.primaryProvider ? gatewayConfig.primaryModel : undefined) ||
      "";
    const activeBaseUrl =
      gatewayConfig.customEndpoints?.[provider] || providerDefaults[provider]?.baseUrl;

    if (!activeModel) {
      setTestResults((prev) => ({
        ...prev,
        [provider]: {
          status: "error",
          message: "Please enter or select a model for this provider before testing.",
        },
      }));
      setTestingProviders((prev) => ({ ...prev, [provider]: false }));
      return;
    }

    try {
      // If the key is already stored server-side and masked (••••), send empty so resolveUpstream uses server key
      const testKey = currentKey.includes("••••") ? "" : currentKey;

      await generateAiText({
        api: {
          provider,
          apiKey: testKey,
          baseUrl: activeBaseUrl,
          model: activeModel,
          appName: "Writerdost AI (Gateway Ping)",
          siteUrl: typeof window !== "undefined" ? window.location.origin : "",
        },
        systemPrompt: "You are an automated connectivity test ping. Respond strictly with 'OK'.",
        userPrompt: "Ping",
        temperature: 0.1,
      });

      setTestResults((prev) => ({
        ...prev,
        [provider]: { status: "success", message: "Connected & Verified!" },
      }));
      setTimeout(() => {
        setTestResults((prev) => ({ ...prev, [provider]: undefined }));
      }, 4500);
      // Refresh analytics after ping
      fetchGatewayData();
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [provider]: {
          status: "error",
          message: err instanceof Error ? err.message : "Connection failed",
        },
      }));
    } finally {
      setTestingProviders((prev) => ({ ...prev, [provider]: false }));
    }
  };

  // Metrics extraction
  const totalSpend = analytics?.totalCost || 0;
  const totalTokens = analytics?.totalTokens || 0;
  const totalInputTokens = analytics?.inputTokens || 0;
  const totalOutputTokens = analytics?.outputTokens || 0;
  const totalRequests = analytics?.totalRequests || 0;
  const currentRpm = analytics?.requestsPerMinute || 0;
  const freeTokens = analytics?.freeTokens || 0;
  const freeRequests = analytics?.freeRequests || 0;

  return (
    <div className="space-y-6">
      {/* Top Action Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 -mt-1">
        <div>
          <h2 className="text-lg font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-xl">shield_lock</span>
            BizAI Gateway &amp; LLM Provider Management
          </h2>
          <p className="text-xs text-on-surface-variant">
            Orchestrate platform-level LLM providers, server API keys, failover chains, and real-time RPM &amp; cost analytics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleResetAnalytics}
            className="btn btn-ghost btn-sm text-xs opacity-75 hover:opacity-100"
            title="Reset platform usage counters"
          >
            Reset Metrics
          </button>
          <button
            type="button"
            onClick={() => handleSaveGateway()}
            disabled={gatewaySaving}
            className="btn btn-primary btn-sm min-w-[140px] flex items-center justify-center gap-1.5 shadow-sm"
          >
            <span className="material-symbols-outlined text-sm">
              {gatewaySaving ? "sync" : "save"}
            </span>
            <span>{gatewaySaving ? "Saving..." : "Save Settings"}</span>
          </button>
        </div>
      </div>

      {gatewayMsg && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-center gap-2 ${
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

      {/* Metrics Row: Spend, RPM, Input/Output Tokens, Free Usage */}
      <section className="metrics !grid-cols-2 lg:!grid-cols-5" aria-label="AI Gateway metrics">
        <div className="metric">
          <p className="metric-label">Gateway Engine</p>
          <p className="metric-value flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                gatewayConfig.failoverEnabled ? "bg-emerald-500 animate-pulse" : "bg-amber-500"
              }`}
            />
            {gatewayConfig.failoverEnabled ? "Failover Active" : "Single Upstream"}
          </p>
          <p className="metric-note">429 / 5xx auto-mitigation</p>
        </div>

        <div className="metric">
          <p className="metric-label">Total Platform Spend</p>
          <p className="metric-value font-mono text-emerald-400">
            {formatCurrency(totalSpend)}
          </p>
          <p className="metric-note">{totalRequests.toLocaleString()} total API requests</p>
        </div>

        <div className="metric">
          <p className="metric-label">Throughput Rate</p>
          <p className="metric-value font-mono flex items-center gap-1.5 text-primary">
            <span className="w-2 h-2 rounded-full bg-primary animate-ping" />
            {currentRpm} RPM
          </p>
          <p className="metric-note">requests per minute (live)</p>
        </div>

        <div className="metric">
          <p className="metric-label">Input / Output Tokens</p>
          <p className="metric-value text-xs font-mono truncate">
            {formatTokens(totalInputTokens)} In · {formatTokens(totalOutputTokens)} Out
          </p>
          <p className="metric-note">{formatTokens(totalTokens)} combined volume</p>
        </div>

        <div className="metric">
          <p className="metric-label">Zero-Cost / Free Volume</p>
          <p className="metric-value font-mono text-teal-400">
            {formatTokens(freeTokens)}
          </p>
          <p className="metric-note">{freeRequests} requests via free / local APIs</p>
        </div>
      </section>

      {/* Two-Column Workspace Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_20rem] gap-5 items-start">
        {/* Left Column: Platform Primary Selector, Provider Cards, Failover Chain, Thresholds */}
        <div className="min-w-0 space-y-5">
          {/* Active Primary Engine & Failover Pipeline Banner */}
          <div className="panel p-4 bg-surface border border-[var(--hairline)] space-y-3.5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-primary/15 text-primary flex items-center justify-center shrink-0">
                  <span className="material-symbols-outlined text-[19px]">verified</span>
                </span>
                <div>
                  <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                    Primary AI Generation Engine
                  </h3>
                  <p className="text-[11.5px] text-on-surface-variant">
                    Platform default model powering ebooks, research dossiers, and rewrites for subscribers.
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => gatewayConfig.primaryProvider && handleTestProvider(gatewayConfig.primaryProvider)}
                  disabled={!gatewayConfig.primaryProvider || Boolean(gatewayConfig.primaryProvider && testingProviders[gatewayConfig.primaryProvider])}
                  className="btn btn-secondary btn-sm flex items-center gap-1 text-xs"
                >
                  <span className={`material-symbols-outlined text-[14px] ${gatewayConfig.primaryProvider && testingProviders[gatewayConfig.primaryProvider] ? "animate-spin" : ""}`}>
                    {gatewayConfig.primaryProvider && testingProviders[gatewayConfig.primaryProvider] ? "sync" : "network_ping"}
                  </span>
                  <span>{gatewayConfig.primaryProvider && testingProviders[gatewayConfig.primaryProvider] ? "Testing..." : "Test Primary Ping"}</span>
                </button>
              </div>
            </div>

            {gatewayConfig.primaryProvider && testResults[gatewayConfig.primaryProvider] && (
              <div
                className={`p-2.5 rounded-lg text-xs font-semibold flex items-center gap-2 ${
                  testResults[gatewayConfig.primaryProvider]?.status === "success"
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                }`}
              >
                <span className="material-symbols-outlined text-sm">
                  {testResults[gatewayConfig.primaryProvider]?.status === "success" ? "check_circle" : "error"}
                </span>
                <span>Primary Test: {testResults[gatewayConfig.primaryProvider]?.message}</span>
              </div>
            )}

            {/* Selector Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="field !mb-0">
                <label className="label">Primary Tier Instance</label>
                <select
                  className="select font-mono text-xs"
                  value={primaryInstance?.id || ""}
                  onChange={(e) => {
                    const instId = e.target.value;
                    if (instId) {
                      handleSetPrimaryTier(instId);
                    }
                  }}
                >
                  <option value="">-- No Primary Instance Selected --</option>
                  {instances.map((i) => (
                    <option key={i.id} value={i.id}>
                      {i.label || i.provider} ({i.model || "no model set"})
                    </option>
                  ))}
                </select>
              </div>

              <div className="field !mb-0">
                <div className="flex items-center justify-between mb-1">
                  <label className="label !mb-0">Primary Model Name</label>
                  <button
                    type="button"
                    onClick={() => setCustomPrimaryModelMode(!customPrimaryModelMode)}
                    className="text-[11px] text-primary hover:underline"
                    disabled={!primaryInstance}
                  >
                    {customPrimaryModelMode ? "Select preset" : "Enter custom model"}
                  </button>
                </div>
                {customPrimaryModelMode || !primaryInstance || !(MODEL_PRESETS[primaryInstance.provider]?.length) ? (
                  <input
                    type="text"
                    value={primaryInstance?.model || ""}
                    onChange={(e) => {
                      if (primaryInstance) {
                        handleUpdateInstance(primaryInstance.id, { model: e.target.value });
                        setGatewayConfig({
                          ...gatewayConfig,
                          primaryModel: e.target.value,
                        });
                      }
                    }}
                    placeholder={primaryInstance ? "Enter model name (e.g. gpt-4o, claude-3-7-sonnet)..." : "Configure a provider below first"}
                    className="input font-mono text-xs"
                    disabled={!primaryInstance}
                  />
                ) : (
                  <select
                    className="select font-mono text-xs"
                    value={primaryInstance?.model || ""}
                    onChange={(e) => {
                      if (primaryInstance) {
                        handleUpdateInstance(primaryInstance.id, { model: e.target.value });
                        setGatewayConfig({
                          ...gatewayConfig,
                          primaryModel: e.target.value,
                        });
                      }
                    }}
                  >
                    <option value="">-- No model selected --</option>
                    {MODEL_PRESETS[primaryInstance.provider]?.map((m) => (
                      <option key={m} value={m}>
                        {m}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            {/* Active Pipeline & Plan Tier Routing Visual Flow */}
            <div className="p-3.5 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
              <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-2.5 text-xs">
                <div className="flex items-center gap-1.5 text-on-surface font-semibold shrink-0">
                  <span className="material-symbols-outlined text-primary text-base">alt_route</span>
                  <span>Active Gateway Failover Flow:</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5 font-mono text-[11px]">
                  {primaryInstance ? (
                    <>
                      <span className="px-2.5 py-0.5 rounded bg-surface border border-amber-500/50 text-amber-300 font-bold flex items-center gap-1 shadow-xs">
                        <span className="material-symbols-outlined text-xs text-amber-400">stars</span>
                        <span>Primary: {primaryInstance.label || primaryInstance.provider} ({primaryInstance.model || "default"})</span>
                      </span>
                      {standbyInsts.map((inst, i) => (
                        <span key={inst.id} className="flex items-center gap-1.5">
                          <span className="text-on-surface-variant font-bold">→</span>
                          <span
                            className={`px-2 py-0.5 rounded border font-medium flex items-center gap-1 ${
                              gatewayConfig.failoverEnabled
                                ? "bg-surface border-sky-500/40 text-sky-300 shadow-xs"
                                : "opacity-40 line-through bg-surface-container-low border-transparent text-on-surface-variant"
                            }`}
                          >
                            <span className="material-symbols-outlined text-xs text-sky-400">shield</span>
                            <span>Standby #{inst.standbyPriority || (inst.fallbackTiers?.[0] ?? (i + 1))}: {inst.label || inst.provider} ({inst.model || "default"})</span>
                          </span>
                        </span>
                      ))}
                    </>
                  ) : (
                    <span className="text-on-surface-variant italic">
                      No primary provider configured. Click &quot;Primary&quot; on a provider below.
                    </span>
                  )}
                </div>
              </div>

              {/* Plan Tiers Mapping Guide */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-2 border-t border-[var(--hairline)]">
                {GATEWAY_PLAN_TIERS.map((tier) => {
                  const assignedToTier = instances.filter((i) =>
                    (i.planTiers || ["Free", "Basic", "Pro", "Enterprise"]).includes(tier.id)
                  );
                  const prim = assignedToTier.find((i) => i.role === "primary" || i.tier === "primary");
                  const standbys = assignedToTier.filter(
                    (i) =>
                      i.id !== prim?.id &&
                      (i.role === "standby" || i.tier === "standby" || i.tier === "fallback" || (i.fallbackTiers && i.fallbackTiers.length > 0))
                  );
                  return (
                    <div key={tier.id} className="p-2 rounded-lg bg-surface/60 border border-[var(--hairline)] text-xs space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-on-surface text-[11px] flex items-center gap-1">
                          <span
                            className={`w-2 h-2 rounded-full ${
                              tier.id === "Free"
                                ? "bg-teal-400"
                                : tier.id === "Basic"
                                ? "bg-blue-400"
                                : tier.id === "Pro"
                                ? "bg-purple-400"
                                : "bg-amber-400"
                            }`}
                          />
                          {tier.label}
                        </span>
                        <span className="text-[10px] text-on-surface-variant font-mono">{tier.price}</span>
                      </div>
                      <div className="text-[10px] text-on-surface-variant/90 leading-tight">
                        {prim ? (
                          <div className="truncate">
                            <span className="text-amber-300 font-semibold">Primary:</span> {prim.label || prim.provider}
                            {standbys.length > 0 && (
                              <span className="text-sky-300 ml-1">+{standbys.length} standby</span>
                            )}
                          </div>
                        ) : (
                          <span className="text-rose-400">No primary set</span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Configured Gateway Providers & LLM Instances Section */}
          <section className="space-y-3.5">
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div>
                <h3 className="section-title flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-lg">tune</span>
                  LLM Provider Configurations &amp; API Instances
                </h3>
                <p className="text-xs text-on-surface-variant">
                  Configure Primary &amp; Standby providers and assign them to your subscription plan tiers (Free, Basic, Pro, Enterprise).
                </p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-mono text-on-surface-variant bg-surface-container-high px-2 py-1 rounded">
                  {instances.length} Configured Instance{instances.length === 1 ? "" : "s"}
                </span>

                {unconfiguredCount > 0 && (
                  <button
                    type="button"
                    onClick={handlePruneUnconfigured}
                    className="btn btn-secondary btn-sm flex items-center gap-1.5 text-xs text-rose-400 hover:text-rose-300 border-rose-500/30 shadow-xs"
                    title="Remove empty unconfigured instances with no API key set"
                  >
                    <span className="material-symbols-outlined text-[15px]">cleaning_services</span>
                    <span>Prune {unconfiguredCount} Unset</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => handleSaveGateway()}
                  disabled={gatewaySaving}
                  className="btn btn-primary btn-sm flex items-center gap-1.5 text-xs shadow-sm"
                  title="Save all configured providers & API keys"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {gatewaySaving ? "sync" : "save"}
                  </span>
                  <span>{gatewaySaving ? "Saving..." : "Save Changes"}</span>
                </button>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setAddProviderOpen(!addProviderOpen)}
                    className="btn btn-primary btn-sm flex items-center gap-1.5 text-xs shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[15px]">add</span>
                    <span>Add Provider</span>
                    <span className="material-symbols-outlined text-[13px]">
                      {addProviderOpen ? "arrow_drop_up" : "arrow_drop_down"}
                    </span>
                  </button>

                  {addProviderOpen && (
                    <div className="absolute right-0 top-full mt-1.5 w-68 rounded-xl bg-surface border border-[var(--hairline-strong)] shadow-xl z-30 py-1.5 max-h-80 overflow-y-auto">
                      <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-on-surface-variant border-b border-[var(--hairline)]">
                        Add Provider Instance
                      </div>
                      <div className="px-3 py-1 text-[9.5px] text-on-surface-variant/80 border-b border-[var(--hairline)]">
                        Any provider can be added multiple times for different models &amp; tiers.
                      </div>
                      {GATEWAY_PROVIDERS.map((p) => {
                        const count = instances.filter((i) => i.provider === p.id).length;
                        return (
                          <button
                            key={p.id}
                            type="button"
                            onClick={() => handleAddProviderInstance(p.id)}
                            className="w-full px-3 py-2 text-left text-xs hover:bg-surface-container-high flex items-center gap-2.5 transition-colors"
                          >
                            <span className={`w-6 h-6 rounded flex items-center justify-center shrink-0 border ${p.colorClass}`}>
                              <span className="material-symbols-outlined text-[14px]">{p.icon}</span>
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="font-semibold text-on-surface truncate flex items-center justify-between">
                                <span>{p.name}</span>
                                {count > 0 && (
                                  <span className="text-[9px] font-mono text-primary font-normal">
                                    {count} added
                                  </span>
                                )}
                              </div>
                              <div className="text-[10px] text-on-surface-variant truncate">{p.description}</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Provider Instance Cards Grid / Empty State */}
            {instances.length === 0 ? (
              <div className="panel p-8 text-center border-dashed border-2 border-[var(--hairline-strong)] space-y-3 bg-surface-container-lowest">
                <div className="w-12 h-12 rounded-full bg-primary/10 text-primary mx-auto flex items-center justify-center">
                  <span className="material-symbols-outlined text-2xl">dns</span>
                </div>
                <div className="space-y-1">
                  <h4 className="font-bold text-sm text-on-surface">No LLM Provider Instances</h4>
                  <p className="text-xs text-on-surface-variant max-w-md mx-auto">
                    No AI provider instances have been added yet. Click &quot;Add Provider&quot; above to configure an LLM instance.
                  </p>
                </div>
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={() => setAddProviderOpen(true)}
                    className="btn btn-primary btn-sm inline-flex items-center gap-1.5 text-xs shadow-sm"
                  >
                    <span className="material-symbols-outlined text-[15px]">add</span>
                    <span>Add Provider</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {instances.map((inst) => {
                  const prov = GATEWAY_PROVIDERS.find((p) => p.id === inst.provider) || GATEWAY_PROVIDERS[0];
                  const isPrimary = inst.tier === "primary";
                  const fallbackTiers = inst.fallbackTiers || [];
                  const isFallback = fallbackTiers.length > 0;
                  const keyVal = inst.apiKey || "";
                  const provDef = GATEWAY_PROVIDERS.find((p) => p.id === inst.provider);
                  const fallbackServerKey = provDef?.keyId ? gatewayConfig.serverKeys?.[provDef.keyId] : "";
                  const isConfigured = Boolean(
                    prov.noKeyRequired || (keyVal && (keyVal.includes("••••") || keyVal.length > 5)) ||
                    (fallbackServerKey && (fallbackServerKey.includes("••••") || fallbackServerKey.length > 5))
                  );
                  const isShowingKey = Boolean(showKeyToggles[inst.id]);
                  const selectedModel = inst.model;
                  const customEndpoint = inst.customEndpoint || "";
                  const rates = selectedModel ? getModelDefaultRates(inst.provider, selectedModel) : { inputRate: 0, outputRate: 0 };
                  const isFreeProvider = Boolean(
                    inst.isFree ||
                    prov.isFree ||
                    gatewayConfig.freeProviders?.[inst.provider] ||
                    (rates.inputRate === 0 && rates.outputRate === 0)
                  );

                  const provMetric = analytics?.providers?.[inst.provider];
                  const provRequests = provMetric?.totalRequests || 0;
                  const provCost = provMetric?.totalCost || 0;
                  const provInTokens = provMetric?.inputTokens || 0;
                  const provOutTokens = provMetric?.outputTokens || 0;
                  const provTokens = provMetric?.totalTokens || 0;
                  const provRpm = (provMetric?.recentTimestamps || []).filter((t) => t > Date.now() - 60_000).length;
                  const provTokenRatio = provTokens > 0 ? (provInTokens / provTokens) * 100 : 50;

                  const isTesting = Boolean(testingProviders[inst.id]);
                  const testResult = testResults[inst.id];

                  return (
                    <div
                      key={inst.id}
                      id={`provider-instance-${inst.id}`}
                      className={`panel p-4 space-y-3.5 border transition-all duration-200 ${
                        isPrimary
                          ? "border-primary/50 bg-surface shadow-sm ring-1 ring-primary/20"
                          : "border-outline-variant/30 bg-surface-container-low hover:border-outline-variant/60"
                      }`}
                    >
                      {/* Card Header with Editable Label and Badges */}
                      <div className="flex items-start justify-between gap-2.5">
                        <div className="flex items-center gap-2 min-w-0 flex-1">
                          <span className={`px-2 py-0.5 rounded-md text-[10px] uppercase font-bold tracking-wider border shrink-0 ${prov.colorClass}`}>
                            {prov.id}
                          </span>
                          <div className="min-w-0 flex-1">
                            <input
                              type="text"
                              value={inst.label || prov.name}
                              onChange={(e) => handleUpdateInstance(inst.id, { label: e.target.value })}
                              className="font-bold text-sm text-on-surface bg-transparent hover:bg-surface-container-high px-1 py-0.5 rounded border border-transparent hover:border-[var(--hairline)] transition-colors w-full truncate focus:bg-surface focus:border-primary"
                              placeholder={prov.name}
                              title="Click to rename this instance"
                            />
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 flex-wrap justify-end">
                          {isPrimary ? (
                            <span className="chip chip-primary text-[10px] font-bold bg-amber-500/20 text-amber-300 border-amber-500/40 shadow-xs">
                              ★ PRIMARY
                            </span>
                          ) : (
                            <span className="chip chip-secondary text-[10px] font-bold bg-sky-500/20 text-sky-300 border-sky-500/40 shadow-xs">
                              🛡️ STANDBY #{inst.standbyPriority || (fallbackTiers[0] ?? 1)}
                            </span>
                          )}

                          {/* Plan tier badges on the header */}
                          {(inst.planTiers && inst.planTiers.length > 0
                            ? inst.planTiers
                            : (["Free", "Basic", "Pro", "Enterprise"] as GatewayPlanTier[])
                          ).map((pt) => {
                            const tierDef = GATEWAY_PLAN_TIERS.find((t) => t.id === pt);
                            return (
                              <span
                                key={pt}
                                className={`text-[9.5px] font-bold px-1.5 py-0.5 rounded ${
                                  tierDef?.badgeClass || "bg-surface-container-high text-on-surface-variant"
                                }`}
                                title={`${tierDef?.label || pt} (${tierDef?.price || ""})`}
                              >
                                {pt}
                              </span>
                            );
                          })}

                          {isFreeProvider && (
                            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-teal-400 bg-teal-500/15 px-2 py-0.5 rounded-full border border-teal-500/25">
                              <span className="material-symbols-outlined text-[11px]">money_off</span>
                              Free
                            </span>
                          )}
                          <button
                            type="button"
                            onClick={() => handleRemoveProviderInstance(inst.id)}
                            title={`Remove this instance`}
                            className="w-6 h-6 rounded flex items-center justify-center text-on-surface-variant hover:text-rose-400 hover:bg-rose-500/10 transition-colors ml-1"
                          >
                            <span className="material-symbols-outlined text-[15px]">delete</span>
                          </button>
                        </div>
                      </div>

                      {/* Telemetry & Token Meter Bar for this Provider */}
                      <div className="p-2.5 rounded-lg bg-surface-container-highest/60 border border-[var(--hairline)] space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <div className="flex items-center gap-1.5">
                            <span className="text-[10px] uppercase font-semibold text-on-surface-variant">Spend:</span>
                            <span className="font-mono font-bold text-emerald-400">
                              {isFreeProvider ? "Free • $0.00" : formatCurrency(provCost)}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-[11px] font-mono text-on-surface-variant">
                            <span>{provRequests} reqs</span>
                            <span className="text-primary font-bold">{provRpm} RPM</span>
                          </div>
                        </div>

                        <div className="space-y-1">
                          <div className="w-full h-1.5 rounded-full overflow-hidden flex bg-surface-container-high">
                            <div
                              style={{ width: `${provTokenRatio}%` }}
                              className="bg-indigo-500 h-full"
                              title={`Input: ${provTokenRatio.toFixed(0)}%`}
                            />
                            <div
                              style={{ width: `${100 - provTokenRatio}%` }}
                              className="bg-amber-500 h-full"
                              title={`Output: ${(100 - provTokenRatio).toFixed(0)}%`}
                            />
                          </div>
                          <div className="flex justify-between text-[10px] text-on-surface-variant font-mono">
                            <span className="text-indigo-400">In: {formatTokens(provInTokens)}</span>
                            <span className="text-amber-400">Out: {formatTokens(provOutTokens)}</span>
                          </div>
                        </div>
                      </div>

                      {/* Model Selector */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <label className="text-[11px] font-semibold text-on-surface-variant">
                            Active Model Preset
                          </label>
                          <button
                            type="button"
                            onClick={() =>
                              setCustomModelModes({
                                ...customModelModes,
                                [inst.id]: !customModelModes[inst.id],
                              })
                            }
                            className="text-[10px] text-primary hover:underline"
                          >
                            {customModelModes[inst.id] ? "Select preset" : "Custom model"}
                          </button>
                        </div>

                        {customModelModes[inst.id] || !(MODEL_PRESETS[inst.provider]?.length) ? (
                          <input
                            type="text"
                            value={selectedModel}
                            onChange={(e) => handleUpdateInstance(inst.id, { model: e.target.value })}
                            placeholder="Enter model string..."
                            className="input font-mono !h-[var(--ctl-sm)] !py-0 !text-xs w-full"
                          />
                        ) : (
                          <select
                            className="select font-mono !h-[var(--ctl-sm)] !py-0 !text-xs w-full"
                            value={selectedModel}
                            onChange={(e) => handleUpdateInstance(inst.id, { model: e.target.value })}
                          >
                            <option value="">-- No model selected --</option>
                            {MODEL_PRESETS[inst.provider]?.map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        )}
                      </div>

                      {/* API Key Management */}
                      {prov.noKeyRequired ? (
                        <div className="p-2 rounded bg-surface-container-highest/40 border border-[var(--hairline)] text-[11px] text-on-surface-variant flex items-center gap-1.5">
                          <span className="material-symbols-outlined text-sm text-teal-400">check_circle</span>
                          <span>No API key required for local Ollama instances.</span>
                        </div>
                      ) : (
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <label className="text-[11px] font-semibold text-on-surface-variant flex items-center gap-1.5">
                              <span>API Key</span>
                              {isConfigured ? (
                                <span className="badge badge-success !text-[9px] !py-0 !px-1.5">
                                  Configured
                                </span>
                              ) : (
                                <span className="badge badge-warning !text-[9px] !py-0 !px-1.5">
                                  Not Set
                                </span>
                              )}
                            </label>
                            <button
                              type="button"
                              onClick={() =>
                                setShowKeyToggles({
                                  ...showKeyToggles,
                                  [inst.id]: !isShowingKey,
                                })
                              }
                              className="text-[10px] text-on-surface-variant hover:text-on-surface flex items-center gap-0.5"
                            >
                              <span className="material-symbols-outlined text-[12px]">
                                {isShowingKey ? "visibility_off" : "visibility"}
                              </span>
                              <span>{isShowingKey ? "Hide" : "Show"}</span>
                            </button>
                          </div>
                          <input
                            type={isShowingKey ? "text" : "password"}
                            value={keyVal}
                            onChange={(e) => handleUpdateInstance(inst.id, { apiKey: e.target.value })}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.preventDefault();
                                handleSaveGateway(inst.id);
                              }
                            }}
                            placeholder={prov.placeholder}
                            className="input !h-[var(--ctl-sm)] !py-0 !text-xs font-mono w-full"
                          />
                        </div>
                      )}

                      {/* Custom Endpoint Option */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={() =>
                              setShowCustomEndpoints({
                                ...showCustomEndpoints,
                                [inst.id]: !showCustomEndpoints[inst.id],
                              })
                            }
                            className="text-[10.5px] text-primary hover:underline flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-[13px]">
                              {showCustomEndpoints[inst.id] ? "expand_less" : "expand_more"}
                            </span>
                            <span>Custom Gateway / Proxy Endpoint</span>
                          </button>
                          {customEndpoint && (
                            <span className="text-[9.5px] text-emerald-400 font-mono">Custom Active</span>
                          )}
                        </div>

                        {showCustomEndpoints[inst.id] && (
                          <input
                            type="text"
                            value={customEndpoint}
                            onChange={(e) => handleUpdateInstance(inst.id, { customEndpoint: e.target.value })}
                            placeholder={providerDefaults[inst.provider]?.baseUrl || "https://..."}
                            className="input !h-[var(--ctl-sm)] !py-0 !text-xs font-mono w-full"
                          />
                        )}
                      </div>

                      {/* Provider Role: Primary vs Standby */}
                      <div className="p-2.5 rounded-lg bg-surface-container-highest/50 border border-[var(--hairline)] space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="flex items-center gap-1.5 text-on-surface text-[11px] font-semibold">
                            <span className="material-symbols-outlined text-[14px] text-primary">swap_calls</span>
                            <span>Provider Role</span>
                          </span>
                          <span className="text-[10px] font-mono text-on-surface-variant">
                            {isPrimary ? "Active Generation Route" : `Standby Failover #${inst.standbyPriority || (fallbackTiers[0] ?? 1)}`}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center justify-between gap-2 pt-0.5">
                          <div className="inline-flex rounded-lg border border-[var(--hairline-strong)] p-0.5 bg-surface-container-high">
                            <button
                              type="button"
                              onClick={() => handleSetRole(inst.id, "primary")}
                              className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                                isPrimary
                                  ? "bg-amber-500 text-slate-950 font-bold shadow-xs"
                                  : "text-on-surface-variant hover:text-on-surface"
                              }`}
                              title="Set as the active Primary provider for initial requests"
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                {isPrimary ? "stars" : "star"}
                              </span>
                              <span>Primary</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSetRole(inst.id, "standby")}
                              className={`px-3 py-1 rounded text-xs font-semibold flex items-center gap-1.5 transition-all ${
                                !isPrimary
                                  ? "bg-sky-500 text-slate-950 font-bold shadow-xs"
                                  : "text-on-surface-variant hover:text-on-surface"
                              }`}
                              title="Set as a Standby backup provider for failovers"
                            >
                              <span className="material-symbols-outlined text-[14px]">shield</span>
                              <span>Standby</span>
                            </button>
                          </div>

                          {!isPrimary && (
                            <div className="flex items-center gap-1">
                              <span className="text-[10px] text-on-surface-variant font-medium">Standby Order:</span>
                              {[1, 2, 3, 4].map((p) => {
                                const currentPriority = inst.standbyPriority || (fallbackTiers[0] ?? 1);
                                const isCurrent = currentPriority === p;
                                return (
                                  <button
                                    key={p}
                                    type="button"
                                    onClick={() => handleSetStandbyPriority(inst.id, p)}
                                    className={`w-6 h-6 rounded text-[10px] font-mono font-bold flex items-center justify-center transition-all border ${
                                      isCurrent
                                        ? "bg-sky-500 text-slate-950 border-sky-400 font-extrabold shadow-xs"
                                        : "bg-surface-container-high border-[var(--hairline)] text-on-surface-variant hover:text-on-surface"
                                    }`}
                                    title={`Failover Priority ${p}`}
                                  >
                                    #{p}
                                  </button>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Subscription Plan Tiers Assignment */}
                      <div className="p-2.5 rounded-lg bg-surface-container-highest/40 border border-[var(--hairline)] space-y-2">
                        <div className="flex items-center justify-between text-xs font-semibold">
                          <span className="flex items-center gap-1.5 text-on-surface text-[11px]">
                            <span className="material-symbols-outlined text-[14px] text-primary">sell</span>
                            <span>Assigned Plan Tiers</span>
                          </span>
                          <span className="text-[10px] text-on-surface-variant font-mono">
                            {(inst.planTiers || []).length === GATEWAY_PLAN_TIERS.length
                              ? "All Plans"
                              : (inst.planTiers || []).length === 0
                              ? "All Plans (Default)"
                              : (inst.planTiers || []).join(", ")}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-1.5">
                          {GATEWAY_PLAN_TIERS.map((tier) => {
                            const activeList = inst.planTiers || ["Free", "Basic", "Pro", "Enterprise"];
                            const isAssigned = activeList.includes(tier.id);
                            return (
                              <button
                                key={tier.id}
                                type="button"
                                onClick={() => handleTogglePlanTier(inst.id, tier.id)}
                                className={`px-2.5 py-1 rounded text-[11px] font-medium flex items-center gap-1.5 border transition-all ${
                                  isAssigned
                                    ? tier.activeClass
                                    : "bg-surface-container-high border-[var(--hairline)] text-on-surface-variant hover:bg-surface-container-highest"
                                }`}
                                title={tier.description}
                              >
                                <span className="material-symbols-outlined text-[12px]">
                                  {isAssigned ? "check_circle" : "circle"}
                                </span>
                                <span className="font-semibold">{tier.label}</span>
                                <span className="text-[9.5px] opacity-75 font-mono">({tier.price})</span>
                              </button>
                            );
                          })}

                          <button
                            type="button"
                            onClick={() => handleToggleAllPlans(inst.id)}
                            className="px-2 py-1 rounded text-[10px] font-medium text-primary hover:bg-primary/10 border border-primary/25 ml-auto"
                            title="Toggle all plans"
                          >
                            All Plans
                          </button>
                        </div>
                      </div>

                      {/* Rates Reference */}
                      <div className="flex items-center justify-between text-[10px] text-on-surface-variant pt-1 border-t border-[var(--hairline)]">
                        <div className="flex items-center gap-1.5">
                          <span>Rate (1M tokens):</span>
                          <span className="font-mono font-medium">
                            {isFreeProvider
                              ? "Free Tier ($0.00)"
                              : `$${rates.inputRate.toFixed(2)} in / $${rates.outputRate.toFixed(2)} out`}
                          </span>
                        </div>
                        <label className="flex items-center gap-1 cursor-pointer select-none text-[10px] hover:text-on-surface">
                          <input
                            type="checkbox"
                            checked={isFreeProvider}
                            onChange={(e) => handleUpdateInstance(inst.id, { isFree: e.target.checked })}
                            className="rounded border-[var(--hairline-strong)] text-emerald-500 accent-emerald-500 w-3 h-3"
                          />
                          <span className={isFreeProvider ? "text-emerald-400 font-semibold" : ""}>
                            Free ($0.00)
                          </span>
                        </label>
                      </div>

                      {/* Test Results Banner */}
                      {testResult && (
                        <div
                          className={`p-2 rounded-md text-[11px] font-semibold flex items-center gap-1.5 ${
                            testResult.status === "success"
                              ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                              : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                          }`}
                        >
                          <span className="material-symbols-outlined text-xs">
                            {testResult.status === "success" ? "check_circle" : "error"}
                          </span>
                          <span className="truncate">{testResult.message}</span>
                        </div>
                      )}

                      {/* Action Footer */}
                      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--hairline)]">
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleTestInstance(inst)}
                            disabled={isTesting}
                            className="btn btn-secondary btn-sm !h-[26px] !py-0 !text-[11px] flex items-center gap-1"
                          >
                            <span className={`material-symbols-outlined text-[13px] ${isTesting ? "animate-spin" : ""}`}>
                              {isTesting ? "sync" : "bolt"}
                            </span>
                            <span>{isTesting ? "Testing..." : "Test Connection"}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleSaveGateway(inst.id)}
                            disabled={gatewaySaving}
                            className={`btn btn-sm !h-[26px] !py-0 !text-[11px] flex items-center gap-1 transition-all ${
                              savedProviderId === inst.id
                                ? "!bg-emerald-600 !text-white border-transparent"
                                : "btn-primary"
                            }`}
                            title="Save this instance's configuration & key"
                          >
                            <span className={`material-symbols-outlined text-[13px] ${gatewaySaving ? "animate-spin" : ""}`}>
                              {gatewaySaving ? "sync" : savedProviderId === inst.id ? "check" : "save"}
                            </span>
                            <span>
                              {gatewaySaving
                                ? "Saving..."
                                : savedProviderId === inst.id
                                ? "Saved!"
                                : "Save Instance"}
                            </span>
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Section: Multi-Model Outage / 429 Failover Chain */}
          <div className="panel p-4 bg-surface border border-[var(--hairline)] space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h4 className="text-xs font-bold text-on-surface flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="material-symbols-outlined text-amber-500 text-base">bolt</span>
                  Multi-Model Outage &amp; 429 Failover Chain
                </h4>
                <p className="text-[11.5px] text-on-surface-variant mt-0.5">
                  If Primary hits a rate limit (429) or server outage (500/503), the gateway automatically falls back in real time so user book generation never halts mid-manuscript.
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
            <div className="p-3 rounded-lg border border-[var(--hairline)] bg-surface-container-low space-y-2">
              <span className="text-xs font-semibold text-on-surface block">
                Failover Activation Triggers:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                <label className="flex items-center gap-2 text-xs text-on-surface cursor-pointer select-none">
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
                <label className="flex items-center gap-2 text-xs text-on-surface cursor-pointer select-none">
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
                  <span>500 / 502 / 503 Outages</span>
                </label>
                <label className="flex items-center gap-2 text-xs text-on-surface cursor-pointer select-none">
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
                  <span>Timeout (&gt;300s)</span>
                </label>
              </div>
            </div>

            {/* Sequential Fallback Chain List */}
            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-on-surface block">
                  Sequential Failover Targets:
                </span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const candidateInst =
                        instances.find(
                          (i) => i.tier !== "primary" && !gatewayConfig.fallbacks.some((f) => f.provider === i.provider)
                        ) || instances[0];
                      const candidateId = candidateInst ? candidateInst.provider : ("groq" as ApiProvider);
                      const candidateModel = candidateInst ? candidateInst.model : (MODEL_PRESETS[candidateId]?.[0] || "");
                      setGatewayConfig({
                        ...gatewayConfig,
                        fallbacks: [
                          ...gatewayConfig.fallbacks,
                          {
                            enabled: true,
                            provider: candidateId,
                            model: candidateModel,
                            label: `Tier ${gatewayConfig.fallbacks.length + 1} Fallback`,
                          },
                        ],
                      });
                    }}
                    className="text-xs text-primary hover:underline flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">add</span>
                    <span>Add Tier</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setAddProviderOpen(true)}
                    className="text-xs text-on-surface-variant hover:text-primary flex items-center gap-1"
                  >
                    <span className="material-symbols-outlined text-[14px]">add_box</span>
                    <span>Add Provider</span>
                  </button>
                </div>
              </div>

              {gatewayConfig.fallbacks.length === 0 ? (
                <div className="p-4 text-center rounded-lg border border-dashed border-[var(--hairline-strong)] text-xs text-on-surface-variant bg-surface-container-lowest space-y-2">
                  <p className="font-semibold text-on-surface">No fallback tiers configured</p>
                  <p className="text-[11px] text-on-surface-variant max-w-md mx-auto">
                    Designate fallback targets so if your Primary model hits rate limits (429) or server outages (500/503), requests automatically switch to Tier 1 without failing user generation.
                  </p>
                  <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const candidateInst =
                          instances.find(
                            (i) => i.tier !== "primary" && !gatewayConfig.fallbacks.some((f) => f.provider === i.provider)
                          ) || instances[0];
                        const candidateId = candidateInst ? candidateInst.provider : ("groq" as ApiProvider);
                        const candidateModel = candidateInst ? candidateInst.model : (MODEL_PRESETS[candidateId]?.[0] || "");
                        setGatewayConfig({
                          ...gatewayConfig,
                          fallbacks: [
                            ...gatewayConfig.fallbacks,
                            {
                              enabled: true,
                              provider: candidateId,
                              model: candidateModel,
                              label: `Tier 1 Fallback`,
                            },
                          ],
                        });
                      }}
                      className="btn btn-primary !h-8 !text-xs inline-flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[15px]">add</span>
                      <span>Add Fallback Tier</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setAddProviderOpen(true)}
                      className="btn btn-outline !h-8 !text-xs inline-flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-[15px]">add_box</span>
                      <span>Add Another Provider</span>
                    </button>
                  </div>
                </div>
              ) : (
                gatewayConfig.fallbacks.map((tier, idx) => (
                  <div
                    key={idx}
                    className="p-3.5 rounded-lg border border-[var(--hairline)] bg-surface-container-low flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="w-5 h-5 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="text-xs font-bold text-on-surface">{tier.label}</span>
                        <p className="text-[11px] text-on-surface-variant">
                          {idx === 0
                            ? "Tier 1: Immediate failover target when primary is throttled."
                            : "Tier 2+: Emergency backup target if prior tiers encounter errors."}
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
                            model: gatewayConfig.providerModels?.[newProvider] || MODEL_PRESETS[newProvider]?.[0] || "",
                          };
                          setGatewayConfig({ ...gatewayConfig, fallbacks: newFallbacks });
                        }}
                      >
                        {GATEWAY_PROVIDERS.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name}
                          </option>
                        ))}
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

                      <label className="flex items-center gap-1.5 text-xs text-on-surface cursor-pointer select-none ml-1">
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

                      <button
                        type="button"
                        onClick={() => {
                          const newFallbacks = gatewayConfig.fallbacks.filter((_, i) => i !== idx);
                          setGatewayConfig({ ...gatewayConfig, fallbacks: newFallbacks });
                        }}
                        className="text-on-surface-variant hover:text-rose-400 p-1 rounded transition-colors"
                        title="Remove fallback tier"
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Section: Context Window & High-Volume Autoswitch */}
          <div className="panel p-4 bg-surface border border-[var(--hairline)] space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-on-surface flex items-center gap-1.5 uppercase tracking-wider">
                  <span className="material-symbols-outlined text-primary text-base">swap_calls</span>
                  Context Window &amp; High-Volume Token Threshold Switching
                </h4>
                <p className="text-[11.5px] text-on-surface-variant mt-0.5">
                  Automatically switch long Claude sessions exceeding a token threshold to an economical high-capacity model (e.g. DeepSeek Flash) to prevent unexpected context billing cliffs.
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
              <div className="p-3 rounded-lg border border-[var(--hairline)] bg-surface-container-low space-y-1.5">
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
                  Default: <strong>95,000 tokens</strong>. Claude requests transition to standard higher tier past 100K tokens.
                </p>
              </div>

              <div className="p-3 rounded-lg border border-[var(--hairline)] bg-surface-container-low space-y-1.5">
                <label className="label">Fallback Provider &amp; Model</label>
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
                    <option value="gemini">Google Gemini</option>
                    <option value="groq">Groq</option>
                    <option value="commandcode">CommandCode</option>
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
                    placeholder="deepseek-flash"
                    className="input !h-[var(--ctl-md)] !text-xs font-mono"
                  />
                </div>
                <p className="hint">
                  Default: <strong>deepseek-flash (DeepSeek V4.1)</strong>. Flat economical rate without large-context multipliers.
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Rail: Detailed Cost, Telemetry & Usage Analytics (Sticky) */}
        <aside className="min-w-0 space-y-4 lg:sticky lg:top-[calc(var(--app-header-h)+1rem)]">
          <div className="panel p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-primary text-base">monitoring</span>
                <h3 className="section-title">Gateway Telemetry</h3>
              </div>
              <button
                type="button"
                onClick={handleResetAnalytics}
                className="btn btn-ghost btn-sm text-xs opacity-60 hover:opacity-100 hover:text-error p-1 h-auto"
                title="Reset usage telemetry"
              >
                Reset All
              </button>
            </div>

            {/* Total Gateway Spend Card */}
            <div className="bg-surface-container-highest/60 p-3.5 rounded-xl border border-outline-variant/15 space-y-1">
              <p className="text-[10px] text-on-surface-variant uppercase font-medium tracking-wider">
                Total Collated Spend
              </p>
              <p className="text-2xl font-black text-emerald-400 font-mono tracking-tight">
                {formatCurrency(totalSpend)}
              </p>
              <div className="flex items-center justify-between text-xs text-on-surface-variant pt-1 border-t border-outline-variant/15">
                <span>{formatTokens(totalTokens)} tokens</span>
                <span>{totalRequests} requests</span>
              </div>
            </div>

            {/* Real-time RPM Activity Card */}
            <div className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-primary animate-ping" />
                <span className="text-xs font-bold text-on-surface">Live Throughput:</span>
              </div>
              <span className="font-mono text-sm font-black text-primary">
                {currentRpm} RPM
              </span>
            </div>

            {/* Usage Distribution across API providers */}
            {totalTokens > 0 && (
              <div className="space-y-2 pt-1 border-t border-[var(--hairline)]">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-on-surface text-[11px]">Usage Share</span>
                  <span className="text-[10px] text-on-surface-variant">By Provider</span>
                </div>

                {/* Stacked percentage bar */}
                <div className="w-full h-2 rounded-full overflow-hidden flex bg-surface-container-high">
                  {GATEWAY_PROVIDERS.map((prov) => {
                    const metric = analytics?.providers?.[prov.id];
                    const provTkns = metric?.totalTokens || 0;
                    const pct = totalTokens > 0 ? (provTkns / totalTokens) * 100 : 0;
                    if (pct <= 0) return null;
                    return (
                      <div
                        key={prov.id}
                        style={{ width: `${pct}%`, backgroundColor: prov.colorHex }}
                        className="h-full transition-all duration-300"
                        title={`${prov.name}: ${pct.toFixed(1)}%`}
                      />
                    );
                  })}
                </div>

                {/* Per-Provider breakdown list */}
                <div className="space-y-1.5 pt-1">
                  {GATEWAY_PROVIDERS.map((prov) => {
                    const metric = analytics?.providers?.[prov.id];
                    const provTkns = metric?.totalTokens || 0;
                    const provCst = metric?.totalCost || 0;
                    const pct = totalTokens > 0 ? (provTkns / totalTokens) * 100 : 0;
                    if (provTkns === 0 && provCst === 0 && !prov.isFree) return null;

                    return (
                      <div key={prov.id} className="flex items-center justify-between text-[11px] text-on-surface-variant">
                        <div className="flex items-center gap-1.5 min-w-0 pr-1">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: prov.colorHex }}
                          />
                          <span className="truncate text-on-surface font-medium" title={prov.name}>
                            {prov.name}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 shrink-0 font-mono text-[10px]">
                          <span>{pct.toFixed(0)}%</span>
                          <span className="text-emerald-400">
                            {prov.isFree ? "Free" : formatCurrency(provCst)}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Input vs Output Token Breakdown */}
            <dl className="pt-2 border-t border-[var(--hairline)] space-y-1.5 text-xs">
              <div className="kv">
                <dt className="text-on-surface-variant flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 inline-block" />
                  Collated Input Tokens
                </dt>
                <dd className="font-mono text-on-surface">{formatTokens(totalInputTokens)}</dd>
              </div>
              <div className="kv">
                <dt className="text-on-surface-variant flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                  Collated Output Tokens
                </dt>
                <dd className="font-mono text-on-surface">{formatTokens(totalOutputTokens)}</dd>
              </div>
              <div className="kv">
                <dt className="text-on-surface-variant flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-teal-500 inline-block" />
                  Free / Local Volume
                </dt>
                <dd className="font-mono text-teal-400">{formatTokens(freeTokens)}</dd>
              </div>
              <div className="kv">
                <dt className="text-on-surface-variant">Active Fallbacks</dt>
                <dd className="font-bold text-on-surface">
                  {gatewayConfig.fallbacks.filter((f) => f.enabled).length} Active
                </dd>
              </div>
            </dl>
          </div>

          {/* Quick Rates Reference Cheat Sheet */}
          <div className="panel p-4 space-y-2">
            <h4 className="text-xs font-bold text-on-surface flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary text-sm">receipt_long</span>
              Current Rates (per 1M tokens)
            </h4>
            <div className="space-y-1 text-[11px] font-mono text-on-surface-variant">
              <div className="flex justify-between">
                <span>Claude Sonnet 5.5:</span>
                <span className="text-on-surface font-semibold">$2.00 / $10.00</span>
              </div>
              <div className="flex justify-between">
                <span>OpenAI GPT-6.1 Sol:</span>
                <span className="text-on-surface font-semibold">$2.00 / $10.00</span>
              </div>
              <div className="flex justify-between">
                <span>Gemini 3.8 Flash:</span>
                <span className="text-on-surface font-semibold">$0.10 / $0.40</span>
              </div>
              <div className="flex justify-between">
                <span>DeepSeek Flash V4.1:</span>
                <span className="text-on-surface font-semibold">$0.10 / $0.20</span>
              </div>
              <div className="flex justify-between">
                <span>Groq Llama 4 Scout:</span>
                <span className="text-on-surface font-semibold">$0.20 / $0.30</span>
              </div>
              <div className="flex justify-between text-teal-400">
                <span>Ollama / Local:</span>
                <span className="font-semibold">Free ($0.00)</span>
              </div>
            </div>
          </div>
        </aside>
      </div>

      {/* Sticky Bottom Floating Save Bar */}
      <div className="sticky bottom-4 z-20 flex items-center justify-between p-3.5 px-4 rounded-xl bg-surface/95 backdrop-blur-md border border-[var(--hairline-strong)] shadow-xl mt-6">
        <div className="flex items-center gap-2.5 text-xs">
          <span className="material-symbols-outlined text-primary text-base">cloud_sync</span>
          <div className="flex flex-col sm:flex-row sm:items-center sm:gap-2">
            <span className="text-on-surface font-semibold">
              Gateway &amp; LLM Provider Settings
            </span>
            <span className="text-on-surface-variant text-[11px]">
              {gatewaySaving
                ? "Saving configurations to server..."
                : "Remember to save your updated API keys & provider preferences."}
            </span>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => handleSaveGateway()}
            disabled={gatewaySaving}
            className="btn btn-primary btn-sm flex items-center gap-1.5 shadow-sm min-w-[120px] justify-center"
          >
            <span className="material-symbols-outlined text-[15px]">
              {gatewaySaving ? "sync" : "save"}
            </span>
            <span>{gatewaySaving ? "Saving..." : "Save Settings"}</span>
          </button>
        </div>
      </div>
    </div>
  );
}