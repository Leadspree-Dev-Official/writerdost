# Design Document: Selling Platform Presets & Dedicated Research Hub

**Date:** 2026-11-16  
**Status:** Approved for Implementation  
**Project:** Writerdost AI  

---

## 1. Intent & The Why

Writers creating digital ebooks often target specific commercial channels—most notably **Facebook Ads** (direct-response, low-ticket tripwires, lead magnets), **Amazon KDP** (commercial non-fiction and fiction), **Gumroad** (actionable creator/developer playbooks), **Substack** (newsletters and thought-leadership), and **LinkedIn** (B2B executive whitepapers).

Currently, users select generic tones without clear guidance on what converts on their target platform. In addition, writers lack a dedicated **Research Hub** where they can perform in-depth audience profiling, objection analysis, and structural blueprinting *before* committing to a full manuscript or blog post, and seamlessly transfer that research into the creator tools.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- Add a **Selling Platform** selector to the `/create` flow that dynamically highlights recommended tones with a visual badge and automatically selects the primary tone.
- Persist `sellingPlatform` on `Project` and inject platform buyer directives into **both**:
  1. `/api/generate-ebook` (outline architecture and hooks).
  2. `/api/draft-chapters` (full chapter prose drafting, pacing, and formatting).
- Build a dedicated **Research Hub** (`/research`) with full sidebar and mobile navigation integration.
- In the Research Hub, the agent focuses on:
  1. **Topic & Audience Research**: Granular pain points, burning objections/fears, and high-impact hooks.
  2. **Suggested Chapter Outline Blueprint**: Proposed chapter breakdown with punchy titles and core takeaways.
- Provide 1-click export from the Research Hub:
  - **"Send to Book Creator"**: Routes to `/create`, pre-fills topic, audience, platform, and automatically attaches the research dossier into the `researchSources` panel.
  - **"Send to Blog Generator"**: Routes to `/blog-generator` pre-filled with the research topic and hooks.
- Persist research dossiers in `useAppStore` synced via the Appwrite cloud workspace (`/api/workspace`) so dossiers sync seamlessly across desktop and mobile and clear on sign-out.

### Non-Goals
- Real-time third-party search scraping (Google SerpAPI / Bing) that requires external API keys or proxies. The Research Agent synthesizes domain facts, psychology, audience profiling, and structure using the configured AI model (BYOK or BizAI).
- Modifying the core 4-agent swarm orchestration in `/api/generate-ebook`.

### Anti-Goals
- Restricting tone selection: Selecting a platform must NEVER lock out or disable other tones. All 9 tones remain fully selectable; recommendations simply guide the user.
- Breaking existing draft or project schemas: Projects without a selling platform gracefully default to `"general"`.

---

## 3. Approaches Considered

### Approach 1: Full Research Hub & Native Platform Preset Engine *(Chosen)*
- Dedicated `/research` page integrated into the sidebar and mobile bottom nav.
- Dedicated `/api/research` endpoint producing structured audience dossiers + chapter blueprints.
- Selling platform selector on `/create` with dynamic tone recommendation badges.
- **Why Chosen:** Provides a dedicated, distraction-free environment for deep research before drafting, works seamlessly on both desktop and mobile, and creates a logical workflow: **Research -> Create Book / Blog -> Edit -> Publish**.

### Approach 2: Slide-Over Modal / Drawer Inside Create Page *(Rejected)*
- Embedding the research agent inside a slide-over modal on `/create`.
- **Trade-off:** Crams complex research into a modal, makes switching between multiple research runs difficult, and provides a poor experience on mobile screens.

---

## 4. Technical Architecture & Decisions

### 4.1 Selling Platform Registry & Tone Mapping
In `src/lib/selling-platforms.ts`:

```ts
export interface SellingPlatform {
  id: string;
  name: string;
  icon: string;
  badge: string;
  description: string;
  recommendedTones: string[];
  defaultTone: string;
  promptDirective: string;
}

export const SELLING_PLATFORMS: Record<string, SellingPlatform> = {
  facebook_ads: {
    id: "facebook_ads",
    name: "Facebook Ads & Funnels",
    icon: "campaign",
    badge: "Direct Response",
    description: "High-converting direct-response ebooks, tripwires, and lead magnets.",
    recommendedTones: ["Persuasive", "Conversational", "Provocative"],
    defaultTone: "Persuasive",
    promptDirective: "COMMERCIAL SALES CHANNEL: Facebook Ads & Direct Funnels. Write for fast-paced digital buyers: open chapters with sharp curiosity hooks, address acute emotional pain points immediately, provide quick actionable wins, eliminate academic fluff, and maintain high momentum.",
  },
  amazon_kdp: {
    id: "amazon_kdp",
    name: "Amazon KDP",
    icon: "menu_book",
    badge: "Kindle / Print",
    description: "Commercial non-fiction and fiction structured for Kindle readers and reviews.",
    recommendedTones: ["Storytelling", "Authoritative", "Professional"],
    defaultTone: "Storytelling",
    promptDirective: "COMMERCIAL SALES CHANNEL: Amazon KDP. Write with polished commercial publishing standards: strong narrative arcs, structured progressive learning, clear chapter summaries, and engaging prose that encourages 5-star reader reviews.",
  },
  gumroad: {
    id: "gumroad",
    name: "Gumroad & Digital Products",
    icon: "shopping_bag",
    badge: "Creator Product",
    description: "Actionable developer, creator, and business playbooks.",
    recommendedTones: ["Conversational", "Persuasive", "Technical"],
    defaultTone: "Conversational",
    promptDirective: "COMMERCIAL SALES CHANNEL: Gumroad & Creator Economy. Deliver dense, high-value, fluff-free tactical playbooks with checklists, practical steps, and creator-to-creator direct advice.",
  },
  substack: {
    id: "substack",
    name: "Substack & Newsletters",
    icon: "mail",
    badge: "Editorial",
    description: "Thought-leadership essays, deep dives, and reader-supported digests.",
    recommendedTones: ["Conversational", "Provocative", "Empathetic"],
    defaultTone: "Conversational",
    promptDirective: "COMMERCIAL SALES CHANNEL: Substack / Newsletter. Personal voice, contrarian analytical perspectives, relatable reflections, and community-building commentary.",
  },
  linkedin: {
    id: "linkedin",
    name: "LinkedIn & B2B Whitepapers",
    icon: "work",
    badge: "Enterprise / B2B",
    description: "Executive guides, B2B industry frameworks, and lead magnets.",
    recommendedTones: ["Professional", "Authoritative"],
    defaultTone: "Professional",
    promptDirective: "COMMERCIAL SALES CHANNEL: LinkedIn & B2B Industry. Executive authority, structured data-driven logic, business impact frameworks, and corporate credibility.",
  },
  general: {
    id: "general",
    name: "General / Independent",
    icon: "public",
    badge: "Standard",
    description: "Standard long-form ebook without a specific ad funnel focus.",
    recommendedTones: [],
    defaultTone: "Professional",
    promptDirective: "",
  },
};
```

### 4.2 Directive Scope: Outline AND Chapter Prose
- `sellingPlatform` is added to `createDraft.sellingPlatform` and `Project.sellingPlatform`.
- In `src/app/api/generate-ebook/route.ts`: Injected into the Planning Agent's system prompt.
- In `src/app/api/draft-chapters/route.ts`: Injected into the Writing Agent's system prompt so full chapter prose adopts the channel's pacing, hooks, and formatting.

### 4.3 Engine, Quota & Billing Model for `/api/research`
- Users choose between **BYOK** (unlimited) and **BizAI Managed Gateway** via `AiEngineSelectorModal`.
- For BizAI: Uses `checkQuota("research", engine)` with a low credit cost (5,000 credits per research dossier, or covered under active Pro/Studio subscription allowances).
- If BYOK: verified against user's configured provider & key.

### 4.4 Research Dossier Storage & Appwrite Workspace Sync
- Added to `useAppStore`:
  ```ts
  export interface ResearchDossier {
    id: string;
    topic: string;
    audience: string;
    sellingPlatform: string;
    painPoints: string[];
    objections: string[];
    marketingHooks: string[];
    outline: Array<{ title: string; brief: string }>;
    createdAt: number;
  }
  ```
- Included in `SETTINGS_KEYS` so dossiers automatically sync to Appwrite cloud workspace (`/api/workspace`) and are cleared on logout, keeping data secure and accessible across devices.
- UI Layout: Two-column layout on desktop (Query Form on left, Dossier viewer + Recent Dossiers list on right). On mobile, tabbed or stacked with full touch target sizing.

### 4.5 API Protocol
- Single HTTP `POST /api/research` returning clean JSON:
  ```json
  {
    "dossier": {
      "painPoints": ["..."],
      "objections": ["..."],
      "marketingHooks": ["..."],
      "outline": [{ "title": "...", "brief": "..." }]
    }
  }
  ```
- Client displays an animated multi-step progress state during the generation call.

---

## 5. Implementation Roadmap
1. **Core Data Structures & Platform Registry**: Create `src/lib/selling-platforms.ts` and update `tone-standards.ts`.
2. **App Store & Workspace Sync**: Extend `useAppStore` types and actions to handle `sellingPlatform`, `researchDossiers`, and 1-click export helpers.
3. **Selling Platform Selector on `/create`**: Render platform selector with dynamic tone recommendation badges.
4. **Backend Prompt Directives**: Wire `sellingPlatform` into `/api/generate-ebook` and `/api/draft-chapters`.
5. **Research API Endpoint**: Implement `/api/research` with structured JSON schema and quota protection.
6. **Research Hub Page (`/research`)**: Build the research query interface, dossier viewer, history drawer, and 1-click export actions.
7. **Navigation Integration**: Add to `Sidebar.tsx` and `BottomNavigation.tsx`.
8. **Automated Verification**: Add unit tests for platform tone mappings and research actions, and run typecheck.
