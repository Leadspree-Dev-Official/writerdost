import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";

describe("Taste-Skill Transparent Pricing & Economics Requirements", () => {
  const pricingPath = path.resolve(__dirname, "../../src/components/website/PricingSection.tsx");
  const pricingCode = fs.readFileSync(pricingPath, "utf-8");

  it("contains Zero Token Markup economics value proposition", () => {
    expect(pricingCode).toContain("Zero Token Markup");
    expect(pricingCode).toContain("Wholesale API Economics");
  });

  it("links primary action to working signup flow", () => {
    expect(pricingCode).toContain("Create Free Beta Account");
    expect(pricingCode).toContain('href="/signup"');
  });

  it("removes fake rolling countdown timers and fake slot scarcity", () => {
    expect(pricingCode).not.toContain("autoRenew");
    expect(pricingCode).not.toContain("basicClaimedSlots");
    expect(pricingCode).not.toContain("proClaimedSlots");
  });

  it("contains Amazon KDP compliance guarantee", () => {
    expect(pricingCode).toContain("Amazon KDP Format Guarantee");
  });
});
