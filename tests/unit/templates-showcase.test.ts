// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import TemplatesShowcase from "@/components/website/TemplatesShowcase";

describe("TemplatesShowcase Component", () => {
  it("renders template categories and switches active filter", () => {
    render(React.createElement(TemplatesShowcase));
    expect(screen.getByText(/All Blueprints/i)).toBeDefined();
    const fictionTab = screen.getByText(/Fiction & Novels/i);
    expect(fictionTab).toBeDefined();
    fireEvent.click(fictionTab);
    expect(fictionTab.className).toContain("bg-primary");
  });
});
