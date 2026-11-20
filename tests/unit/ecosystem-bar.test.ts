import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Taste-Skill Ecosystem & Proof Bar Requirements", () => {
  const tickerPath = path.resolve(__dirname, "../../src/components/website/LogosTicker.tsx");
  const tickerCode = fs.readFileSync(tickerPath, "utf-8");

  it("contains section anchor and clear integration heading", () => {
    expect(tickerCode).toContain('id="ecosystem"');
    expect(tickerCode).toContain("Orchestrates leading foundation models");
  });

  it("features all 6 core verified ecosystems", () => {
    expect(tickerCode).toContain("Anthropic Claude");
    expect(tickerCode).toContain("OpenAI");
    expect(tickerCode).toContain("Google Gemini");
    expect(tickerCode).toContain("Ollama");
    expect(tickerCode).toContain("Amazon KDP");
    expect(tickerCode).toContain("WordPress");
  });

  it("applies taste-skill card-lift micro-interactions", () => {
    expect(tickerCode).toContain("card-lift");
  });
});
