import { describe, expect, it } from "vitest";
import { sanitizeGeneratedHtml } from "@/lib/sanitize";

describe("sanitizeGeneratedHtml", () => {
  it("removes event handlers and javascript links", () => {
    const output = sanitizeGeneratedHtml(
      '<p>ok</p><img src=x onerror="alert(1)"><a href="javascript:alert(1)">bad</a>',
    );
    expect(output).not.toContain("onerror");
    expect(output).not.toContain("javascript:");
    expect(output).toContain("<p>ok</p>");
  });

  it("keeps safe prose markup", () => {
    const output = sanitizeGeneratedHtml("<h2>Title</h2><p><strong>bold</strong></p>");
    expect(output).toContain("<h2>Title</h2>");
    expect(output).toContain("<strong>bold</strong>");
  });
});
