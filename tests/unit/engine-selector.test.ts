import { describe, it, expect } from "vitest";
import { useAppStore } from "@/lib/app-store";

describe("Generation Engine Selector & BYOK Model Switching", () => {
  it("allows setting active default BYOK model and updates api credentials", () => {
    const store = useAppStore.getState();

    const m1 = store.addByokModel({
      name: "Fast GPT-4o-mini",
      provider: "openai",
      model: "gpt-4o-mini",
      apiKey: "sk-mini",
      baseUrl: "https://api.openai.com/v1",
      inputTokenRate: 0.15,
      outputTokenRate: 0.60,
      isDefault: true,
    });

    const m2 = store.addByokModel({
      name: "Heavy Claude Sonnet",
      provider: "claude",
      model: "claude-3-5-sonnet-20240620",
      apiKey: "sk-claude",
      baseUrl: "https://api.anthropic.com/v1",
      inputTokenRate: 3.0,
      outputTokenRate: 15.0,
      isDefault: false,
    });

    expect(useAppStore.getState().api.provider).toBe("openai");
    expect(useAppStore.getState().api.model).toBe("gpt-4o-mini");

    // Switch model for generation
    store.setDefaultByokModel(m2);

    const updated = useAppStore.getState();
    expect(updated.activeByokModelId).toBe(m2);
    expect(updated.api.provider).toBe("claude");
    expect(updated.api.model).toBe("claude-3-5-sonnet-20240620");
    expect(updated.api.apiKey).toBe("sk-claude");

    // Model 2 should be marked default, Model 1 not
    const model1 = updated.byokModels.find((m) => m.id === m1);
    const model2 = updated.byokModels.find((m) => m.id === m2);
    expect(model1?.isDefault).toBe(false);
    expect(model2?.isDefault).toBe(true);
  });
});
