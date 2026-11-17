import { describe, it, expect, beforeAll } from "vitest";
import { stripSecrets, restoreSecrets } from "@/lib/workspace/repository";

describe("Workspace repository BYOK secret encryption/decryption", () => {
  beforeAll(() => {
    // Provide test encryption key if not already set in environment
    if (!process.env.WRITERDOST_ENCRYPTION_KEY) {
      process.env.WRITERDOST_ENCRYPTION_KEY = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    }
  });

  it("strips API keys from byokModels array and stores encrypted secrets", () => {
    const inputSettings = {
      api: {
        provider: "openai",
        apiKey: "sk-root-key",
      },
      byokModels: [
        {
          id: "m1",
          name: "Model 1",
          provider: "openai",
          apiKey: "sk-byok-key-1",
        },
        {
          id: "m2",
          name: "Model 2",
          provider: "claude",
          apiKey: "sk-byok-key-2",
        },
      ],
    };

    const { plain, secrets, dropped } = stripSecrets(inputSettings as unknown as Record<string, unknown>);
    expect(dropped).toBe(false);

    // Verify root api key stripped
    const plainApi = plain.api as Record<string, unknown>;
    expect(plainApi.apiKey).toBe("");

    // Verify all model api keys stripped in plain object
    const plainModels = plain.byokModels as Record<string, unknown>[];
    expect(plainModels[0].apiKey).toBe("");
    expect(plainModels[1].apiKey).toBe("");

    // Verify secrets dictionary contains encrypted values
    expect(secrets["api.apiKey"]).toBeDefined();
    expect(secrets["byokModels.0.apiKey"]).toBeDefined();
    expect(secrets["byokModels.1.apiKey"]).toBeDefined();

    // Now restore
    const restored = restoreSecrets(plain, secrets);
    const restoredApi = restored.api as Record<string, unknown>;
    const restoredModels = restored.byokModels as Record<string, unknown>[];
    expect(restoredApi.apiKey).toBe("sk-root-key");
    expect(restoredModels[0].apiKey).toBe("sk-byok-key-1");
    expect(restoredModels[1].apiKey).toBe("sk-byok-key-2");
  });
});
