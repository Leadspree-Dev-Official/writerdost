import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Taste-Skill Footer Requirements", () => {
  const footerPath = path.resolve(__dirname, "../../src/components/website/WebsiteFooter.tsx");
  const footerCode = fs.readFileSync(footerPath, "utf-8");

  it("contains compliant legal links to /privacy and /terms", () => {
    expect(footerCode).toContain('href="/privacy"');
    expect(footerCode).toContain('href="/terms"');
  });

  it("contains direct business contact link and LeadSpree info", () => {
    expect(footerCode).toContain("contact@leadspree.in");
    expect(footerCode).toContain("LeadSpree Business Solutions");
  });

  it("does not contain unverified status badge claims", () => {
    expect(footerCode).not.toContain("Swarm v2.2 Online");
  });
});
