import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Taste-Skill Hero Section Requirements", () => {
  const heroPath = path.resolve(__dirname, "../../src/components/website/Hero.tsx");
  const heroCode = fs.readFileSync(heroPath, "utf-8");

  it("contains category, buyer, and hard fact in heading and lead copy", () => {
    expect(heroCode).toContain("Autonomous book generation for authors and publishers");
    expect(heroCode).toContain("1,000 to 100,000-word manuscripts");
  });

  it("contains clear verb + object action buttons", () => {
    expect(heroCode).toContain("Draft a Book Free");
    expect(heroCode).toContain("Explore Architecture");
  });

  it("eliminates purple gradient ambient glow blobs", () => {
    expect(heroCode).not.toContain("via-purple-600");
    expect(heroCode).not.toContain("bg-purple-500/10");
  });

  it("embeds true-to-scale app frame without fake metrics strip", () => {
    expect(heroCode).toContain("app-frame");
    expect(heroCode).not.toContain("Key Metrics Strip");
  });
});
