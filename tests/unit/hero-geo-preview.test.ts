// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import React from "react";
import HeroInteractivePreview from "@/components/website/HeroInteractivePreview";

describe("HeroInteractivePreview GEO View", () => {
  it("renders GEO badge and switches between post view and GEO & Schema view", () => {
    render(React.createElement(HeroInteractivePreview));

    // Switch to WordPress Sync tab
    const wpTab = screen.getByRole("tab", { name: /WordPress Sync/i });
    expect(wpTab).toBeDefined();
    fireEvent.click(wpTab);

    // Verify GEO active badge is present
    expect(screen.getByText(/GEO Active/i)).toBeDefined();

    // Verify sub-tab toggle exists
    const geoToggle = screen.getByRole("button", { name: /GEO & Schema View/i });
    expect(geoToggle).toBeDefined();

    // Click GEO & Schema View toggle
    fireEvent.click(geoToggle);

    // Verify AI Overview citation simulation is rendered
    expect(screen.getByText(/AI Overview Citation Preview/i)).toBeDefined();
    expect(screen.getByText(/FAQPage Schema \(JSON-LD\)/i)).toBeDefined();
  });
});
