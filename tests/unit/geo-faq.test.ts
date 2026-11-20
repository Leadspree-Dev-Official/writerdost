// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import FaqSection from "@/components/website/FaqSection";
import TemplatesShowcase from "@/components/website/TemplatesShowcase";

describe("GEO Blueprint & FAQ Enhancements", () => {
  it("renders GEO optimization FAQ question and answer in FaqSection", () => {
    render(React.createElement(FaqSection));

    // Assert FAQ question exists
    const geoQuestionBtn = screen.getByRole("button", {
      name: /How does Writerdost optimize articles for Google AI Overviews, ChatGPT Search, and Perplexity \(GEO\)\?/i,
    });
    expect(geoQuestionBtn).toBeDefined();

    // Click to expand the FAQ item
    fireEvent.click(geoQuestionBtn);

    // Assert FAQ answer contains technical proof
    expect(screen.getByText(/definition-first lead sentences/i)).toBeDefined();
  });

  it("renders GEO Content Strategy blueprint in TemplatesShowcase", () => {
    render(React.createElement(TemplatesShowcase));

    expect(
      screen.getByText(/GEO Content Strategy & Automated WordPress Drip/i)
    ).toBeDefined();
    expect(
      screen.getByText(/AI Overview Extraction Capsules/i)
    ).toBeDefined();
  });
});
