// @vitest-environment jsdom
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import React from "react";
import MetricsBanner from "@/components/website/MetricsBanner";

describe("MetricsBanner Component", () => {
  it("renders all four core efficiency and scale metrics", () => {
    render(React.createElement(MetricsBanner));
    expect(screen.getByText(/4\.5x/i)).toBeDefined();
    expect(screen.getByText(/90%/i)).toBeDefined();
    expect(screen.getByText(/25,000\+/i)).toBeDefined();
    expect(screen.getByText(/100%/i)).toBeDefined();
  });
});
