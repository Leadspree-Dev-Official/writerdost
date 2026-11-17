import { describe, it, expect } from "vitest";
import { readPayloadForTest } from "@/lib/ai-server-utils";

describe("readPayload token usage parsing", () => {
  it("parses Claude payload correctly with input_tokens and output_tokens", () => {
    const claudePayload = {
      content: [{ text: "Hello from Claude" }],
      usage: {
        input_tokens: 150,
        output_tokens: 300,
      },
    };

    const result = readPayloadForTest(claudePayload, true);
    expect(result.text).toBe("Hello from Claude");
    expect(result.usage.total_tokens).toBe(450);
    expect(result.usage.input_tokens).toBe(150);
    expect(result.usage.output_tokens).toBe(300);
  });

  it("parses OpenAI/DeepSeek payload with prompt_tokens and completion_tokens", () => {
    const openaiPayload = {
      choices: [{ message: { content: "Hello from OpenAI" } }],
      usage: {
        prompt_tokens: 200,
        completion_tokens: 500,
        total_tokens: 700,
      },
    };

    const result = readPayloadForTest(openaiPayload, false);
    expect(result.text).toBe("Hello from OpenAI");
    expect(result.usage.total_tokens).toBe(700);
    expect(result.usage.input_tokens).toBe(200);
    expect(result.usage.output_tokens).toBe(500);
  });

  it("handles empty or missing usage gracefully", () => {
    const emptyPayload = {
      choices: [{ message: { content: "Quick response" } }],
    };

    const result = readPayloadForTest(emptyPayload, false);
    expect(result.text).toBe("Quick response");
    expect(result.usage.total_tokens).toBe(0);
    expect(result.usage.input_tokens).toBe(0);
    expect(result.usage.output_tokens).toBe(0);
  });
});
