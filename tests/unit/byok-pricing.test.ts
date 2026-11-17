import { describe, it, expect } from "vitest";
import { getModelDefaultRates, calculateModelCost } from "@/lib/ai-providers";

describe("BYOK Model Pricing and Rates", () => {
  it("returns appropriate default rates for OpenAI models", () => {
    const gpt4o = getModelDefaultRates("openai", "gpt-4o");
    expect(gpt4o.inputRate).toBe(2.5);
    expect(gpt4o.outputRate).toBe(10.0);

    const mini = getModelDefaultRates("openai", "gpt-4o-mini");
    expect(mini.inputRate).toBe(0.15);
    expect(mini.outputRate).toBe(0.6);
  });

  it("returns appropriate default rates for Claude models", () => {
    const sonnet = getModelDefaultRates("claude", "claude-3-5-sonnet-20240620");
    expect(sonnet.inputRate).toBe(3.0);
    expect(sonnet.outputRate).toBe(15.0);

    const haiku = getModelDefaultRates("claude", "claude-haiku-5.5");
    expect(haiku.inputRate).toBe(0.8);
    expect(haiku.outputRate).toBe(4.0);
  });

  it("returns appropriate default rates for DeepSeek models", () => {
    const chat = getModelDefaultRates("deepseek", "deepseek-chat");
    expect(chat.inputRate).toBe(0.14);
    expect(chat.outputRate).toBe(0.28);

    const reasoner = getModelDefaultRates("deepseek", "deepseek-reasoner");
    expect(reasoner.inputRate).toBe(0.55);
    expect(reasoner.outputRate).toBe(2.19);
  });

  it("returns 0 rates for Ollama local models", () => {
    const ollama = getModelDefaultRates("ollama", "llama3.1:8b");
    expect(ollama.inputRate).toBe(0);
    expect(ollama.outputRate).toBe(0);
  });

  it("calculates model cost correctly given input and output tokens and rates", () => {
    // 1M input tokens at $2.50 = $2.50
    // 500k output tokens at $10.00 = $5.00
    // Total = $7.50
    const cost = calculateModelCost(1_000_000, 500_000, 2.5, 10.0);
    expect(cost).toBeCloseTo(7.5, 4);

    // 10,000 input tokens at $0.14/1M = $0.0014
    // 20,000 output tokens at $0.28/1M = $0.0056
    // Total = $0.007
    const deepseekCost = calculateModelCost(10_000, 20_000, 0.14, 0.28);
    expect(deepseekCost).toBeCloseTo(0.007, 5);
  });

  it("nullifies cost calculation to 0 when isFree is true or rates are 0", () => {
    const freeCost = calculateModelCost(1_000_000, 500_000, 2.5, 10.0, true);
    expect(freeCost).toBe(0);

    const zeroRateCost = calculateModelCost(1_000_000, 500_000, 0, 0);
    expect(zeroRateCost).toBe(0);
  });
});
