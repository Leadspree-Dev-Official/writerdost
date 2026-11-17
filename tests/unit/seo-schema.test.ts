import { describe, it, expect } from "vitest";
import {
  extractFaqsFromMarkdown,
  generateFaqSchema,
  generateArticleSchema,
  generateJumpTableOfContents,
  calculateEditorialMetrics,
} from "@/lib/seo-schema";

describe("SEO & Schema Generator Engine", () => {
  const sampleArticle = `# The Complete Guide to Programmatic SEO

## What is Programmatic SEO?
Programmatic SEO is the practice of generating landing pages at scale using structured databases.

## How to Set Up Your Database
Here are the essential steps for configuring Airtable or PostgreSQL.

### Step 1: Define Target Entities
Map your entity relationships.

## Frequently Asked Questions

### What tools do I need for programmatic SEO?
You will need a database, an automated static site generator like Next.js, and an indexing monitoring tool.

### Is programmatic SEO considered spam by Google?
No, as long as the pages provide unique value, custom data, and solve distinct search queries.
`;

  it("extracts FAQs from markdown correctly", () => {
    const faqs = extractFaqsFromMarkdown(sampleArticle);
    expect(faqs.length).toBeGreaterThanOrEqual(1);
    expect(faqs.some((f) => f.question.includes("What tools do I need"))).toBe(true);
  });

  it("generates valid Google FAQPage JSON-LD schema", () => {
    const faqs = extractFaqsFromMarkdown(sampleArticle);
    const schemaJson = generateFaqSchema(faqs);
    expect(schemaJson).toContain('"@type": "FAQPage"');
    expect(schemaJson).toContain('"@type": "Question"');

    const parsed = JSON.parse(schemaJson);
    expect(parsed["@context"]).toBe("https://schema.org");
    expect(parsed.mainEntity.length).toBe(faqs.length);
  });

  it("generates valid Article JSON-LD schema", () => {
    const schemaJson = generateArticleSchema({
      title: "Mastering Next.js 16 for Scale",
      description: "A complete operational blueprint for production Next.js apps.",
      author: "Leadspree Labs",
    });

    const parsed = JSON.parse(schemaJson);
    expect(parsed["@type"]).toBe("Article");
    expect(parsed.headline).toBe("Mastering Next.js 16 for Scale");
    expect(parsed.author.name).toBe("Leadspree Labs");
  });

  it("generates Table of Contents with jump anchors for featured snippets", () => {
    const { tocMarkdown, bodyWithAnchors } = generateJumpTableOfContents(sampleArticle);
    expect(tocMarkdown).toContain("Table of Contents");
    expect(tocMarkdown).toContain("[What is Programmatic SEO?](#what-is-programmatic-seo)");
    expect(bodyWithAnchors).toContain('<a id="what-is-programmatic-seo"></a>');
  });

  it("calculates editorial reading ease metrics", () => {
    const metrics = calculateEditorialMetrics(sampleArticle);
    expect(metrics.wordCount).toBeGreaterThan(30);
    expect(metrics.readingTimeMinutes).toBeGreaterThanOrEqual(1);
    expect(metrics.averageSentenceLength).toBeGreaterThan(0);
  });
});
