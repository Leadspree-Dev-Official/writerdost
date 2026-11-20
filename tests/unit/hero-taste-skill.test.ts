import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Hero Section User Specifications", () => {
  const heroPath = path.resolve(__dirname, "../../src/components/website/Hero.tsx");
  const heroCode = fs.readFileSync(heroPath, "utf-8");

  it("contains the user's preferred headline and subtitle", () => {
    expect(heroCode).toContain("Standard AI Breaks Down After 3,000 Words.");
    expect(heroCode).toContain("Writerdost Writes 300,000.");
    expect(heroCode).toContain("Generate full 300,000-word book manuscripts");
  });

  it("contains clear action buttons", () => {
    expect(heroCode).toContain("Start Writing Free");
    expect(heroCode).toContain("See It in Action");
  });

  it("embeds interactive studio mockup", () => {
    expect(heroCode).toContain("<HeroInteractivePreview />");
  });
});
