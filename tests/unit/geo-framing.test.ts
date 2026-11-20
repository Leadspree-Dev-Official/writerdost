// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import FeatureBentoGrid from "@/components/website/FeatureBentoGrid";

describe("FeatureBentoGrid GEO Framing", () => {
  it("renders Generative Engine Optimization (GEO) title and AI search citations", () => {
    render(React.createElement(FeatureBentoGrid));

    // Verify GEO Eyebrow tag
    expect(screen.getByText(/GEO & Automated Distribution/i)).toBeDefined();

    // Verify GEO Card Title
    expect(
      screen.getByText(/Generative Engine Optimization \(GEO\) & WordPress Syndication/i)
    ).toBeDefined();

    // Verify 3 sub-feature highlights
    expect(screen.getByText(/AI Citation Structuring/i)).toBeDefined();
    expect(screen.getByText(/Automated Schema & FAQs/i)).toBeDefined();
    expect(screen.getByText(/Hands-Off WordPress Drip/i)).toBeDefined();
  });
});
