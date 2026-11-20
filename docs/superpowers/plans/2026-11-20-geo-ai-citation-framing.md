# Generative Engine Optimization (GEO) & AI Citation Framing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Elevate Writerdost AI's WordPress & SEO Blog positioning by adopting an explicit Generative Engine Optimization (GEO) and AI Search Citation framing (Google AI Overviews, ChatGPT Search, Perplexity) across the landing page, backed by Writerdost's native `seo-schema.ts` engine.

**Architecture:** Update customer-facing marketing components (`FeatureBentoGrid`, `HeroInteractivePreview`, `TemplatesShowcase`, and `FaqSection`) to highlight definition-first extraction architecture, automatic JSON-LD schema injection, and AI answer capsules. Add a live interactive GEO preview toggle to the Hero Studio demo.

**Tech Stack:** Next.js 16 (App Router), React 19, Tailwind CSS, TypeScript, Vitest.

**Spec:** Grounded in Writerdost's native schema generator [seo-schema.ts](file:///Volumes/ANI(1TB)/Coding%20Projects/Writerdost%20AI/writerdost-frontend/src/lib/seo-schema.ts) and competitive analysis of WordRocket AI's GEO positioning.

---

## Global Constraints

- **Semantic Theme Tokens:** Maintain complete dual-theme compatibility (light and dark mode) using `text-on-surface`, `bg-surface-container`, `text-on-surface-variant`, and `dark:` prefixes.
- **Hero Section Preservation:** Do not modify the restored H1 headline (*"Standard AI Breaks Down After 3,000 Words. Writerdost Writes 300,000."*), subtitle, or trust badges in `Hero.tsx`. All changes are localized to downstream sections and the interactive preview's WordPress tab.
- **Evidence-Backed Only:** All GEO claims must directly reflect capabilities implemented in [seo-schema.ts](file:///Volumes/ANI(1TB)/Coding%20Projects/Writerdost%20AI/writerdost-frontend/src/lib/seo-schema.ts) (FAQ JSON-LD, Article Schema, Jump TOCs, direct answer blocks). Zero fake stats or fictitious metrics.
- **Zero Build / Test Regressions:** All 83+ existing vitest unit tests must remain passing; new unit tests must be added to cover the GEO copy and interactive state.

---

## Review Focus

1. **Light Mode Contrast**: GEO badges, code snippets, and schema pill boxes must remain high-contrast and legible in light theme without dark text-on-dark background collisions.
2. **Interactive Preview State**: Toggling between the WordPress post preview and the new "GEO Citation View" in `HeroInteractivePreview.tsx` must maintain smooth UI transitions with no layout shifts.
3. **Copy Restraint (Anti-AI Slop)**: Avoid vague buzzwords like *"unlock the magic of GEO"* or *"take your rankings to the next level"*. Use concrete technical vocabulary: *definition-first lead paragraphs, 40–80 word answer capsules, JSON-LD FAQPage structured data*.
4. **Mobile Responsiveness**: GEO pills, badges, and code previews must wrap cleanly on viewports down to 360px without horizontal overflow.
5. **No Broken Links**: Anchor IDs like `#wordpress` must remain intact so navbar links continue to scroll to the target section smoothly.

---

## Implementation Tasks

### Task 1: Elevate Bento Grid Card 4 with GEO & AI Search Citations
**Files:**
- Modify: `writerdost-frontend/src/components/website/FeatureBentoGrid.tsx:159-214`
- Test: `writerdost-frontend/tests/unit/geo-framing.test.ts`

- [ ] **Step 1: Write failing unit test for GEO framing in FeatureBentoGrid**
  Create `tests/unit/geo-framing.test.ts` asserting that `FeatureBentoGrid.tsx` renders the new GEO badges, "Google AI Overviews & ChatGPT Citations", and schema features.
- [ ] **Step 2: Run test to confirm failure**
  Run `cd writerdost-frontend && rtk bypass npx vitest run tests/unit/geo-framing.test.ts`.
- [ ] **Step 3: Update FeatureBentoGrid Card 4 copy and highlights**
  - Change Eyebrow tag from `"Automated Distribution"` to `"GEO & Automated Distribution"`.
  - Update Card Title to: `"Generative Engine Optimization (GEO) & WordPress Syndication"`.
  - Update Subtitle: Highlight that Writerdost formats every chapter and blog with definition-first answer capsules, FAQPage schema, and jump TOCs designed specifically to be cited by Google AI Overviews and ChatGPT search.
  - Update the 3 sub-feature highlights:
    1. **AI Citation Structuring**: Definition-first lead sentences and 50-word answer capsules formatted for LLM citation algorithms.
    2. **Automated Schema & FAQs**: Pre-injected `FAQPage` and `Article` JSON-LD structured data.
    3. **Hands-Off WordPress Drip**: Scheduled REST API publishing via `writerdost-connect` with categories, tags, and featured images.
- [ ] **Step 4: Verify test passes and commit**
  Run test, confirm green, and commit: `git commit -m "feat(marketing): elevate bento grid card with GEO and AI citation framing"`.

---

### Task 2: Add Interactive GEO Citation Preview to Hero Studio Demo
**Files:**
- Modify: `writerdost-frontend/src/components/website/HeroInteractivePreview.tsx:768-840`
- Test: `writerdost-frontend/tests/unit/hero-geo-preview.test.ts`

- [ ] **Step 1: Write failing unit test for GEO preview in HeroInteractivePreview**
  Create `tests/unit/hero-geo-preview.test.ts` testing that the WordPress tab exposes the GEO optimization pill and toggles between "Standard Post" and "AI Citation (GEO) View".
- [ ] **Step 2: Run test to confirm failure**
  Run `cd writerdost-frontend && rtk bypass npx vitest run tests/unit/hero-geo-preview.test.ts`.
- [ ] **Step 3: Implement GEO preview controls in HeroInteractivePreview**
  - In the WordPress panel header, add a badge: `✨ GEO Active: Google AI Overview & ChatGPT Ready`.
  - Add a sub-tab toggle: `[Post View]` and `[GEO & Schema View]`.
  - In `[GEO & Schema View]`:
    - Display an AI Overview citation card simulation (showing how an LLM quotes the article's definition-first paragraph).
    - Display the clean generated `FAQPage` JSON-LD code block generated by `seo-schema.ts`.
- [ ] **Step 4: Verify test passes and commit**
  Run test, confirm green, and commit: `git commit -m "feat(hero): add interactive GEO citation and schema preview to WordPress demo tab"`.

---

### Task 3: Update Content Blueprints & Educational FAQ Section
**Files:**
- Modify: `writerdost-frontend/src/components/website/TemplatesShowcase.tsx:95-115`
- Modify: `writerdost-frontend/src/components/website/FaqSection.tsx:10-50`
- Test: `writerdost-frontend/tests/unit/geo-faq.test.ts`

- [ ] **Step 1: Write failing unit test for GEO template and FAQ entries**
  Create `tests/unit/geo-faq.test.ts` asserting the FAQ contains the GEO question and `TemplatesShowcase` highlights AI search citations.
- [ ] **Step 2: Run test to confirm failure**
  Run `cd writerdost-frontend && rtk bypass npx vitest run tests/unit/geo-faq.test.ts`.
- [ ] **Step 3: Update Template 3 in TemplatesShowcase**
  - Name: `"GEO Content Strategy & Automated WordPress Drip"`.
  - Description: *"Generate an entire month of SEO and GEO-optimized articles with structured FAQs, JSON-LD schema, and direct WordPress synchronization."*
  - Deliverables: `["AI Overview Extraction Capsules", "JSON-LD FAQ Schema", "Native WordPress Drip", "Topical Entity Clusters"]`.
- [ ] **Step 4: Add high-converting GEO entry to FaqSection**
  - Add question: *"How does Writerdost optimize articles for Google AI Overviews, ChatGPT Search, and Perplexity (GEO)?"*
  - Add answer: *"Modern search engines don't just index keywords; LLM search engines (Google AI Overviews, ChatGPT Search, Perplexity) extract direct, authoritative answers. Writerdost's SEO engine formats articles with definition-first lead sentences, 40–80 word direct answer capsules, and automated FAQPage JSON-LD schema. When published to your WordPress site, each post is structurally primed for both traditional SERP rankings and generative AI citations."*
- [ ] **Step 5: Verify test passes and commit**
  Run test, confirm green, and commit: `git commit -m "feat(marketing): add GEO content strategy blueprint and educational FAQ"`.

---

### Task 4: Full Test Suite, Build Verification & Live Visual Inspection
**Files:**
- Verify: Full vitest suite (`npm test`)
- Verify: Next.js production build (`npm run build`)
- Verify: Browser subagent inspection on `http://localhost:3000`

- [ ] **Step 1: Run complete unit test suite**
  Run `cd writerdost-frontend && rtk bypass npx vitest run` and confirm all 26+ test files and 85+ unit tests pass.
- [ ] **Step 2: Run complete Next.js build**
  Run `cd writerdost-frontend && rtk bypass npm run build` and verify all 35 routes compile without TypeScript or lint warnings.
- [ ] **Step 3: Perform browser inspection in light and dark mode**
  Use the browser subagent to navigate to `http://localhost:3000/#wordpress`, toggle between light/dark mode, test the interactive GEO preview in the Hero studio, and capture visual proof.
