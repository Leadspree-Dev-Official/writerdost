import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Taste-Skill Editorial Design System Foundations", () => {
  const globalsPath = path.resolve(__dirname, "../../src/app/globals.css");
  const globalsCss = fs.readFileSync(globalsPath, "utf-8");

  it("contains taste-skill layout classes: .wrap-screen, .app-frame, and .card-lift", () => {
    expect(globalsCss).toContain(".wrap-screen");
    expect(globalsCss).toContain(".app-frame");
    expect(globalsCss).toContain(".card-lift");
  });

  it("defines clean editorial surface and border styles", () => {
    expect(globalsCss).toContain("--editorial-ink");
    expect(globalsCss).toContain("--editorial-surface");
    expect(globalsCss).toContain("--editorial-border");
  });

  it("ensures card hover micro-animations follow taste-skill rule 5 (lift 2px)", () => {
    expect(globalsCss).toMatch(/transform:\s*translateY\(-2px\)/);
  });
});
