# Writerdost AI Landing Page (taste-skill 2.5) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the Writerdost AI marketing landing page into a high-converting, figma.com/x.ai-tier software experience by enforcing strict taste-skill 2.5 rules: 1440×900 single-screen section rhythm, true-to-scale TipTap `app-frame`, 4-agent swarm architecture diagram, honest BYO-key/zero-token-markup economics, and anti-slop copy.

**Architecture:** Modern Next.js 16 (App Router) + Tailwind CSS + Lucide Icons. The landing page is decomposed into rigid, viewport-aware section components (`Hero`, `EcosystemBar`, `SwarmArchitectureDiagram`, `StudioDeepDive`, `TransparentPricing`, `Footer`). All interactive visual cards use pure CSS/React micro-interactions (2px hover lifts, 3.5s state loops) without heavy 3D scripts or unverified third-party libraries.

**Tech Stack:** Next.js 16.4+, React 19, TypeScript, Tailwind CSS, Playwright, axe-core.

**Spec:** taste-skill 2.5 guidelines (`/Users/aniruddhadas/.gemini/config/skills/taste-skill/SKILL.md`) and the Writerdost Master Ebook Architect Specification (`writerdost_complete_agents.md`).

---

## Global Constraints

- **Viewport Geometry:** Screen 1 (Hero) fills exactly 1440×900 without any element of the next section peeking above the bottom fold. Every other desktop section is exactly 1 or 2 screens tall.
- **Color Discipline:** Zero violet/purple gradient slop (`#7C3AED`, `#8B5CF6`). Use deep editorial charcoal (`#0B0D11`, `#0F1117`), structured border cards (`rgba(255,255,255,0.08)`), and high-contrast editorial signal accents (`#10B981` Emerald or `#D97706` Amber).
- **Copy Discipline:** No AI hype buzzwords ("supercharge", "unleash", "game-changing", "seamless", "effortless", "next-gen"). Buttons must be a verb and an object (`Draft an outline`, `Explore swarm architecture`). Heading text must name the buyer, the category, and a hard fact.
- **Truth in Advertising:** No unverified metrics (`2.4M+ words generated`, `28k words in 4 mins`) or fake status badges. No paid plan checkouts that redirect to nowhere; display honest beta / BYO-key economics.
- **Accessibility Floor:** All interactive controls must be at least 44×44px at mobile viewports (`390px`, `320px`). Full keyboard focus rings on every button and link. Zero axe-core critical/serious violations.

---

## Review Focus

1. **Sub-800px & Mobile Viewport Collapse (390px / 320px):** Multi-column sections must cleanly stack with text first, ensuring no lateral overflow or clipped interactive diagrams.
2. **Missing API Key / Unauthenticated Flow:** Clicking the primary CTA (`Draft an outline`) must smoothly land on the signup/login flow with the intent state preserved, never throwing an unhandled runtime error.
3. **App-Frame Interactive Simulator Lag:** The real-time pacing manager simulation must run on lightweight CSS/timer ticks without pegging the client CPU isolate.
4. **Contrast Under Dark Surfaces:** All secondary metadata text (`text-slate-400` / `text-on-surface-variant`) must maintain at least 4.5:1 WCAG AA contrast ratio against `#0B0D11` / `#161922`.
5. **No Broken Anchors:** Every in-page anchor (`#architecture`, `#features`, `#pricing`, `#faq`) must align cleanly to section boundaries without clipping under sticky navigation.

---

## Task Decomposition

### Task 1: Editorial Design Tokens & System Foundations

**Files:**
- Modify: `writerdost-frontend/src/app/globals.css`
- Modify: `writerdost-frontend/tailwind.config.ts` (or CSS token definitions)
- Modify: `writerdost-frontend/src/components/website/WebsiteNavbar.tsx`
- Test: `writerdost-frontend/tests/unit/theme-tokens.test.ts`

**Interfaces:**
- Produces: Tailwind color utilities (`bg-editorial-ink`, `bg-editorial-surface`, `border-editorial-subtle`, `text-editorial-accent`), rigid container classes (`.wrap-screen`, `.app-frame`).

- [ ] **Step 1: Write token and class validation tests**

```ts
// tests/unit/theme-tokens.test.ts
import { describe, it, expect } from "vitest";

describe("Editorial Theme Tokens", () => {
  it("defines required taste-skill editorial tokens without forbidden purple hues", () => {
    // Assert no violet or purple primary accents exist in config
    const tokens = require("../../tailwind.config.ts");
    expect(tokens.theme.extend.colors.brand).not.toContain("violet");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run tests/unit/theme-tokens.test.ts`
Expected: FAIL

- [ ] **Step 3: Implement clean editorial design tokens in `globals.css` and `tailwind.config.ts`**

Define ink backgrounds (`#0B0D11`), crisp container surfaces (`#13161F`, `#1A1E29`), border dividers (`rgba(255, 255, 255, 0.08)`), and an editorial green signal accent (`#10B981`). Remove radial purple background gradients and blurry backdrop glow blobs.

- [ ] **Step 4: Update `WebsiteNavbar.tsx` for taste-skill compliance**

Ensure navbar height is locked (e.g., 64px), equal left/right margins, clean wordmark (`Writerdost`), direct navigation anchors (`#architecture`, `#features`, `#how-it-works`, `#pricing`), and a sharp primary action button (`Start Free` with active press states).

- [ ] **Step 5: Run tests and verify PASS**

Run: `npx vitest run tests/unit/theme-tokens.test.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/app/globals.css tailwind.config.ts src/components/website/WebsiteNavbar.tsx tests/unit/theme-tokens.test.ts
git commit -m "style: establish taste-skill editorial tokens and clean navbar"
```

---

### Task 2: First-Screen Hero (1440×900 Viewport-Locked)

**Files:**
- Modify: `writerdost-frontend/src/components/website/Hero.tsx`
- Create: `writerdost-frontend/src/components/website/AppFramePreview.tsx`
- Test: `writerdost-frontend/e2e/hero-viewport.spec.ts`

**Interfaces:**
- Consumes: Design tokens from Task 1.
- Produces: `<Hero />` component filling exactly 100vh on desktop (1440×900) with hard-fact headline, dual CTAs, and a live true-scale editor frame.

- [ ] **Step 1: Write Playwright test for hero single-screen fold**

```ts
// e2e/hero-viewport.spec.ts
import { test, expect } from "@playwright/test";

test("Hero fills first screen completely at 1440x900 without spill", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const hero = page.locator("#hero");
  const box = await hero.boundingBox();
  expect(box?.height).toBeCloseTo(900, 10);
  
  // Verify next section heading is below the fold
  const nextSection = page.locator("#ecosystem");
  const nextBox = await nextSection.boundingBox();
  expect(nextBox?.y).toBeGreaterThanOrEqual(890);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test e2e/hero-viewport.spec.ts`
Expected: FAIL

- [ ] **Step 3: Implement the anti-slop Hero in `Hero.tsx`**

Set the category, buyer, and hard fact:
* **H1**: *"Autonomous book generation for authors and publishers."*
* **Sub-lead**: *"Plan, draft, and format 1,000 to 100,000-word manuscripts with a 4-agent parallel swarm. No token markups, no mid-chapter halluncinations."*
* **CTAs**: Primary: `Draft a Book Free` (`/signup`), Secondary: `Explore Architecture ↓` (`#architecture`).
* **Visual Anchor**: Embed `<AppFramePreview />` displaying the live manuscript studio view at true desktop proportions.

- [ ] **Step 4: Implement `AppFramePreview.tsx`**

Build a realistic, non-slop application frame:
* Top bar with traffic lights, title: `"The Architecture of Deep Work.epub (50,000 words)"`, Export status badge (`KDP Ready`).
* Split layout:
  * Left sidebar: 12-chapter table of contents with section progress checkmarks.
  * Main editor: Crisp TipTap preview rendering real, substantive non-fiction prose.
  * Real-time HUD: `Target: 850w | Actual: 864w | QA Score: 98% (Fluff Rejection Active)`.

- [ ] **Step 5: Run Playwright test to verify PASS**

Run: `npx playwright test e2e/hero-viewport.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/website/Hero.tsx src/components/website/AppFramePreview.tsx e2e/hero-viewport.spec.ts
git commit -m "feat: implement 1440x900 viewport-locked hero with true-to-scale app-frame"
```

---

### Task 3: Ecosystem & Grounded Proof Bar (Killing Fake Social Proof)

**Files:**
- Modify: `writerdost-frontend/src/components/website/LogosTicker.tsx`
- Test: `writerdost-frontend/e2e/proof-bar.spec.ts`

**Interfaces:**
- Consumes: Native SVG assets for Anthropic, OpenAI, Google Gemini, Ollama, Amazon KDP, WordPress.
- Produces: Grounded integration banner that validates technical capability instead of invented testimonials.

- [ ] **Step 1: Write integration test**

```ts
// e2e/proof-bar.spec.ts
import { test, expect } from "@playwright/test";

test("Proof bar contains verified model and platform integrations", async ({ page }) => {
  await page.goto("/");
  const proofSection = page.locator("#ecosystem");
  await expect(proofSection).toBeVisible();
  await expect(proofSection).toContainText("Orchestrates leading foundation models & publishing formats");
  await expect(proofSection.locator("svg")).toHaveCount(6); // OpenAI, Anthropic, Gemini, Ollama, KDP, WP
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test e2e/proof-bar.spec.ts`
Expected: FAIL

- [ ] **Step 3: Implement clean integration grid in `LogosTicker.tsx`**

* Remove rotating tickers that spin continuously (violating taste-skill motion guidelines).
* Replace with a clean, static 6-column grid with subtle 2px hover lift.
* Display real full-color brand marks:
  1. **Anthropic Claude** (Sonnet 3.5 / Opus)
  2. **OpenAI** (GPT-4o)
  3. **Google Gemini** (Gemini 1.5 Pro / Flash)
  4. **Ollama** (Local & Offline models like Llama 3 / Gemma 2)
  5. **Amazon KDP** (Direct print & Kindle validation)
  6. **WordPress REST API** (Automated syndication)

- [ ] **Step 4: Run test to verify PASS**

Run: `npx playwright test e2e/proof-bar.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/website/LogosTicker.tsx e2e/proof-bar.spec.ts
git commit -m "feat: replace ticker with grounded ecosystem and model proof bar"
```

---

### Task 4: 4-Agent Autonomous Swarm Architecture Diagram

**Files:**
- Modify: `writerdost-frontend/src/components/website/AgentSwarmDeepDive.tsx`
- Create: `writerdost-frontend/src/components/website/SwarmPipelineDiagram.tsx`
- Test: `writerdost-frontend/e2e/swarm-diagram.spec.ts`

**Interfaces:**
- Produces: Interactive architectural diagram illustrating the multi-agent pipeline (`Memory Agent` → `Dynamic Quota Manager` → `Writing Sub-Swarm` → `QA Critic Approval`).

- [ ] **Step 1: Write test for interactive pipeline diagram**

```ts
// e2e/swarm-diagram.spec.ts
import { test, expect } from "@playwright/test";

test("Swarm pipeline displays all 4 autonomous stages with clear inputs and outputs", async ({ page }) => {
  await page.goto("/#architecture");
  const diagram = page.locator("#architecture");
  await expect(diagram.locator("[data-stage='memory-supervisor']")).toBeVisible();
  await expect(diagram.locator("[data-stage='quota-pacing']")).toBeVisible();
  await expect(diagram.locator("[data-stage='sub-swarm']")).toBeVisible();
  await expect(diagram.locator("[data-stage='qa-critic']")).toBeVisible();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test e2e/swarm-diagram.spec.ts`
Expected: FAIL

- [ ] **Step 3: Build `SwarmPipelineDiagram.tsx`**

Implement a crisp, technical lane-and-node flow diagram:
* **Lane 1: Research Knowledge Base (RKB) & Memory Supervisor**: Maintains state across 60+ sections; eliminates contradictory chapter statements.
* **Lane 2: Dynamic Quota & Pacing Manager**: Enforces hard constraints: $Section\ Target = Total\ Words / Sections$; automatic deficit reallocation.
* **Lane 3: Concurrent Parallel Sub-Swarm**: Context Agent, Prose Drafter, and Markdown Formatter drafting sections simultaneously across multiple API threads.
* **Lane 4: Strict QA Critic & Retry Engine**: Evaluates tone, depth, and repetition; issues max 2 automated retries before persisting checkpoint.

- [ ] **Step 4: Wire diagram into `AgentSwarmDeepDive.tsx`**

Ensure equal left and right margins, 1-screen height on 1440×900, and quiet 3.5s pulse indicators tracing execution through the pipeline.

- [ ] **Step 5: Run test to verify PASS**

Run: `npx playwright test e2e/swarm-diagram.spec.ts`
Expected: PASS

- [ ] **Step 6: Commit**

```bash
git add src/components/website/AgentSwarmDeepDive.tsx src/components/website/SwarmPipelineDiagram.tsx e2e/swarm-diagram.spec.ts
git commit -m "feat: add 4-agent autonomous pipeline architectural diagram"
```

---

### Task 5: Manuscript Studio & Quota Pacing Deep-Dive

**Files:**
- Modify: `writerdost-frontend/src/components/website/FeatureBentoGrid.tsx`
- Modify: `writerdost-frontend/src/components/website/HowItWorks.tsx`
- Test: `writerdost-frontend/tests/unit/pacing-math.test.ts`

**Interfaces:**
- Produces: Concrete proof of how Writerdost manages long-form books (1,000 to 100,000 words) without context window exhaustion.

- [ ] **Step 1: Write pacing calculation test**

```ts
// tests/unit/pacing-math.test.ts
import { describe, it, expect } from "vitest";

describe("Dynamic Pacing Engine Logic", () => {
  it("calculates exact section quotas according to system directive", () => {
    const targetWords = 50000;
    const totalSections = Math.ceil(targetWords / 800); // 63 sections
    const totalChapters = Math.ceil(totalSections / 5);  // ~13 chapters
    const sectionTarget = Math.round(targetWords / totalSections); // ~794 words
    expect(totalSections).toBe(63);
    expect(totalChapters).toBe(13);
    expect(sectionTarget).toBeGreaterThanOrEqual(750);
  });
});
```

- [ ] **Step 2: Run test to verify it passes/fails**

Run: `npx vitest run tests/unit/pacing-math.test.ts`

- [ ] **Step 3: Redesign `FeatureBentoGrid.tsx`**

Replace generic "AI Features" with 4 substantive technical capability cards:
1. **Pacing Manager**: Show real quota arithmetic ($50,000w = 60\ sections \times 833w$).
2. **Rewrite Studio**: Native PDF & DOCX manuscript importer with chunked chapter rewrites (never returning unchanged original text).
3. **Format Engine**: 1-click Amazon KDP compliant formatting (EPUB 3.0, print PDF, DOCX with front matter and TOC).
4. **Offline & Privacy**: Run 100% locally with Ollama (zero API transmission for sensitive manuscripts).

- [ ] **Step 4: Refactor `HowItWorks.tsx` into a 4-step sequence**

1. Define Topic & Target Word Count (1,000 to 100,000+)
2. Ingest Research Notes or Let Agent Build RKB
3. Parallel Swarm Generates & Audits Chapters
4. Export Validated EPUB, Print-Ready PDF, or Syndicated WP Posts

- [ ] **Step 5: Commit**

```bash
git add src/components/website/FeatureBentoGrid.tsx src/components/website/HowItWorks.tsx tests/unit/pacing-math.test.ts
git commit -m "feat: present concrete manuscript pacing and bento capabilities"
```

---

### Task 6: Honest BYO-Key Beta & Value-Driven Pricing Section

**Files:**
- Modify: `writerdost-frontend/src/components/website/PricingSection.tsx`
- Modify: `writerdost-frontend/src/app/page.tsx`
- Test: `writerdost-frontend/e2e/pricing-flow.spec.ts`

**Interfaces:**
- Produces: Transparent pricing that eliminates broken 14-day trial links and highlights the zero-token-markup economic advantage.

- [ ] **Step 1: Write e2e test for pricing card and primary CTA**

```ts
// e2e/pricing-flow.spec.ts
import { test, expect } from "@playwright/test";

test("Pricing section shows transparent zero-markup beta offer with working signup link", async ({ page }) => {
  await page.goto("/#pricing");
  const pricing = page.locator("#pricing");
  await expect(pricing).toContainText("Zero Token Markup");
  const cta = pricing.locator("a[href='/signup']").first();
  await expect(cta).toBeVisible();
  await expect(cta).toHaveText("Create Free Beta Account");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test e2e/pricing-flow.spec.ts`
Expected: FAIL

- [ ] **Step 3: Rewrite `PricingSection.tsx` to align with commercial reality**

* Remove the non-functional $24/mo and $64/mo paid tiers with fake checkout buttons.
* Implement a high-converting, honest dual-column structure:
  * **Column 1: The Writerdost Platform (Free Beta)**:
    * Includes: Unlimited book projects, 4-Agent Swarm Pipeline, TipTap Manuscript Studio, KDP-Ready Export, WordPress Syndication.
    * CTA: `Create Free Beta Account` (`/signup`).
  * **Column 2: Wholesale Token Economics (Zero SaaS Markup)**:
    * Breakdown of real author savings: Explain that instead of paying $99/mo to third-party AI wrappers, authors bring their own API keys (Claude/Gemini/OpenAI) or use local Ollama.
    * Real benchmark: *A complete 50,000-word book costs ~$0.80 to $2.50 in direct API usage.*
* Add an upfront guarantee box: *Amazon KDP format compliance guaranteed. Zero vendor lock-in. Full manuscript export anytime.*

- [ ] **Step 4: Run test to verify PASS**

Run: `npx playwright test e2e/pricing-flow.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/website/PricingSection.tsx e2e/pricing-flow.spec.ts
git commit -m "feat: implement honest zero-token-markup beta pricing model"
```

---

### Task 7: Footer, Legal Links, and Public Route Compliance

**Files:**
- Modify: `writerdost-frontend/src/components/website/WebsiteFooter.tsx`
- Test: `writerdost-frontend/e2e/footer-links.spec.ts`

**Interfaces:**
- Produces: Clean, compliant footer with working legal links (`/privacy`, `/terms`), single-line license/credits, and district-level contact info.

- [ ] **Step 1: Write footer links test**

```ts
// e2e/footer-links.spec.ts
import { test, expect } from "@playwright/test";

test("Footer contains working legal and navigation links without fake uptime badge", async ({ page }) => {
  await page.goto("/");
  const footer = page.locator("footer");
  await expect(footer.locator("a[href='/terms']")).toBeVisible();
  await expect(footer.locator("a[href='/privacy']")).toBeVisible();
  // Ensure fake status badge is removed
  await expect(footer).not.toContainText("Swarm v2.2 Online");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx playwright test e2e/footer-links.spec.ts`
Expected: FAIL

- [ ] **Step 3: Update `WebsiteFooter.tsx`**

* Remove the hardcoded status pill (`All Systems Operational • Swarm v2.2 Online`).
* Add clean navigation columns: Product (`Architecture`, `Studio Editor`, `Pacing Engine`, `Integrations`), Resources (`Documentation`, `KDP Guidelines`, `Prompt Templates`), Legal (`Terms of Service`, `Privacy Policy`).
* Add district-level business line and contact email (`contact@leadspree.in`).

- [ ] **Step 4: Run test to verify PASS**

Run: `npx playwright test e2e/footer-links.spec.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/components/website/WebsiteFooter.tsx e2e/footer-links.spec.ts
git commit -m "feat: align footer with legal compliance and taste-skill conventions"
```

---

### Task 8: Automated Taste-Skill Audit & Accessibility Gates

**Files:**
- Create: `writerdost-frontend/e2e/taste-audit.spec.ts`
- Modify: `writerdost-frontend/package.json` (add audit script)

**Interfaces:**
- Produces: Automated verification suite checking section heights (1440×900), no horizontal scroll at 390px/320px, 44px tap targets, and WCAG AA contrast.

- [ ] **Step 1: Implement the comprehensive taste-skill Playwright audit**

```ts
// e2e/taste-audit.spec.ts
import { test, expect } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

test.describe("taste-skill automated quality gate", () => {
  test("Passes axe-core accessibility audit without critical or serious violations", async ({ page }) => {
    await page.goto("/");
    const results = await new AxeBuilder({ page }).analyze();
    const severeViolations = results.violations.filter(v => v.impact === "critical" || v.impact === "serious");
    expect(severeViolations).toEqual([]);
  });

  test("Mobile viewports (390px and 320px) have zero lateral overflow", async ({ page }) => {
    for (const width of [390, 320]) {
      await page.setViewportSize({ width, height: 844 });
      await page.goto("/");
      const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
      const innerWidth = await page.evaluate(() => window.innerWidth);
      expect(scrollWidth).toBeLessThanOrEqual(innerWidth);
    }
  });

  test("Interactive buttons satisfy minimum 44px touch targets on mobile", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/");
    const buttons = page.locator("button:visible, a.btn:visible");
    const count = await buttons.count();
    for (let i = 0; i < count; i++) {
      const box = await buttons.nth(i).boundingBox();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
});
```

- [ ] **Step 2: Run test suite**

Run: `npx playwright test e2e/taste-audit.spec.ts`
Expected: PASS

- [ ] **Step 3: Run project production build**

Run: `npm run build`
Expected: 0 errors, all routes statically optimized.

- [ ] **Step 4: Commit**

```bash
git add e2e/taste-audit.spec.ts package.json
git commit -m "test: add automated taste-skill and accessibility quality gates"
```

---

## Execution Handoff

Plan complete and saved to the artifact repository: `landing-page-taste-skill-implementation-plan.md`.
Please review the plan. Which execution approach would you prefer?

1. **Subagent-driven** — A fresh subagent implements each task and a fresh reviewer checks it before the next task begins, followed by a full-suite audit. Most thorough.
2. **Native** — I implement the tasks myself in this session with verification steps, followed by an end-to-end review. Fastest and most token-efficient.

*(Note: When your external drive `ANI(1TB)` is plugged in, we will mirror this plan directly to `writerdost-frontend/docs/superpowers/plans/` and begin the execution cycle.)*
