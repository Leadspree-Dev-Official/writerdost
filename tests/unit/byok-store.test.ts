import { describe, it, expect, beforeEach } from "vitest";
import { useAppStore } from "@/lib/app-store";

describe("BYOK Models & Per-Model Usage Store", () => {
  beforeEach(() => {
    // Reset store state
    const store = useAppStore.getState();
    store.resetAllByokUsage();
  });

  it("allows adding a new BYOK model and setting it as default", () => {
    const store = useAppStore.getState();
    const initialCount = store.byokModels.length;

    const modelId = store.addByokModel({
      name: "Custom DeepSeek",
      provider: "deepseek",
      model: "deepseek-reasoner",
      apiKey: "sk-deepseek-test",
      baseUrl: "https://api.deepseek.com/v1/chat/completions",
      inputTokenRate: 0.55,
      outputTokenRate: 2.19,
      isDefault: true,
    });

    const updated = useAppStore.getState();
    expect(updated.byokModels.length).toBe(initialCount + 1);

    const added = updated.byokModels.find((m) => m.id === modelId);
    expect(added).toBeDefined();
    expect(added?.name).toBe("Custom DeepSeek");
    expect(added?.isDefault).toBe(true);

    // Verify root api synchronized
    expect(updated.api.provider).toBe("deepseek");
    expect(updated.api.model).toBe("deepseek-reasoner");
    expect(updated.api.apiKey).toBe("sk-deepseek-test");
  });

  it("updates model configuration and synchronizes api when default", () => {
    const store = useAppStore.getState();
    const modelId = store.addByokModel({
      name: "Claude Sonnet",
      provider: "claude",
      model: "claude-3-5-sonnet-20240620",
      apiKey: "sk-ant-123",
      baseUrl: "https://api.anthropic.com/v1/messages",
      inputTokenRate: 3.0,
      outputTokenRate: 15.0,
      isDefault: true,
    });

    store.updateByokModel(modelId, {
      name: "Claude Sonnet Updated",
      model: "claude-3-5-sonnet-latest",
    });

    const updated = useAppStore.getState();
    const modified = updated.byokModels.find((m) => m.id === modelId);
    expect(modified?.name).toBe("Claude Sonnet Updated");
    expect(modified?.model).toBe("claude-3-5-sonnet-latest");
    expect(updated.api.model).toBe("claude-3-5-sonnet-latest");
  });

  it("records usage with input and output tokens accurately for the matching model and collates total usage", () => {
    const store = useAppStore.getState();
    const modelId = store.addByokModel({
      name: "Test GPT-4o",
      provider: "openai",
      model: "gpt-4o",
      apiKey: "sk-test",
      baseUrl: "https://api.openai.com/v1",
      inputTokenRate: 2.50, // $2.50 per 1M
      outputTokenRate: 10.00, // $10.00 per 1M
      isDefault: true,
    });

    // 10,000 input tokens ($0.025) and 5,000 output tokens ($0.050) = $0.075
    store.recordUsage(15_000, "openai", "gpt-4o", {
      inputTokens: 10_000,
      outputTokens: 5_000,
      byokModelId: modelId,
    });

    const updated = useAppStore.getState();
    const model = updated.byokModels.find((m) => m.id === modelId);
    expect(model?.usage.inputTokens).toBe(10_000);
    expect(model?.usage.outputTokens).toBe(5_000);
    expect(model?.usage.totalTokens).toBe(15_000);
    expect(model?.usage.totalRequests).toBe(1);
    expect(model?.usage.totalCost).toBeCloseTo(0.075, 4);

    // Collated usage in store.usage must reflect the cost and tokens
    expect(updated.usage.totalTokens).toBeGreaterThanOrEqual(15_000);
    expect(updated.usage.totalRequests).toBeGreaterThanOrEqual(1);
    expect(updated.usage.totalCost).toBeGreaterThanOrEqual(0.075);
  });

  it("resets usage for a specific model without affecting other models", () => {
    const store = useAppStore.getState();
    const model1 = store.addByokModel({
      name: "Model 1",
      provider: "openai",
      model: "gpt-4o-mini",
      apiKey: "sk-1",
      baseUrl: "https://api.openai.com/v1",
      inputTokenRate: 0.15,
      outputTokenRate: 0.60,
    });

    const model2 = store.addByokModel({
      name: "Model 2",
      provider: "deepseek",
      model: "deepseek-chat",
      apiKey: "sk-2",
      baseUrl: "https://api.deepseek.com/v1",
      inputTokenRate: 0.14,
      outputTokenRate: 0.28,
    });

    store.recordUsage(10_000, "openai", "gpt-4o-mini", { byokModelId: model1 });
    store.recordUsage(20_000, "deepseek", "deepseek-chat", { byokModelId: model2 });

    store.resetByokModelUsage(model1);

    const updated = useAppStore.getState();
    const m1 = updated.byokModels.find((m) => m.id === model1);
    const m2 = updated.byokModels.find((m) => m.id === model2);

    expect(m1?.usage.totalTokens).toBe(0);
    expect(m1?.usage.totalRequests).toBe(0);
    expect(m2?.usage.totalTokens).toBe(20_000);
  });
});
