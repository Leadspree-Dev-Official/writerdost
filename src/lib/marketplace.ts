/**
 * BundleKart Marketplace integration.
 *
 * Every call goes to the live service at the base URL configured in
 * Settings → API, forwarded by this app's own /api/marketplace route. The
 * proxy exists for two reasons: the browser cannot call an arbitrary host
 * (CORS), and a server-side hop lets the URL be validated before the seller's
 * API key is sent anywhere.
 */
import type {
  ApiScope,
  BundleKartBonus,
  BundleKartDeliverableFile,
  BundleKartFaq,
  BundleKartLandingBlock,
  BundleKartLandingPageConfig,
  BundleKartPublishPayload,
  BundleKartPublishResponse,
  BundleKartTemplateId,
  ListingFormat,
  ListingVisibility,
  MarketplaceLicense,
  MarketplaceSeller,
  PlatformApiSettings,
  ApiSettings,
} from "@/lib/store-types";
import type { Project } from "@/lib/app-store";
import { calculateProjectWords } from "@/lib/app-utils";
import { generateAiText } from "@/lib/ai-client";
import { htmlToText } from "@/lib/markdown-utils";

export const MARKETPLACE = {
  name: "BundleKart Digital Marketplace",
  shortName: "BundleKart",
  /** Default live production URL */
  defaultBaseUrl: "https://bundlekart.in",
  storeUrl: "https://bundlekart.in",
  onboardUrl: "https://bundlekart.in/seller/onboard",
} as const;

/** This app's proxy. The marketplace action travels in the body. */
const MARKETPLACE_PROXY = "/api/marketplace";

export const MARKETPLACE_CATEGORIES = [
  "Business & Startups",
  "AI & Engineering",
  "Productivity",
  "Marketing & Sales",
  "Design",
  "Writing",
  "Self Improvement",
  "Technology",
  "Finance & Crypto",
] as const;

export const BUNDLEKART_ACCENT_COLORS = [
  { name: "Ruby Rose", hex: "#e11d48", border: "border-rose-500", bg: "bg-[#e11d48]" },
  { name: "Royal Indigo", hex: "#6366f1", border: "border-indigo-500", bg: "bg-[#6366f1]" },
  { name: "Emerald Green", hex: "#10b981", border: "border-emerald-500", bg: "bg-[#10b981]" },
  { name: "Amber Gold", hex: "#f59e0b", border: "border-amber-500", bg: "bg-[#f59e0b]" },
  { name: "Purple Violet", hex: "#8b5cf6", border: "border-violet-500", bg: "bg-[#8b5cf6]" },
] as const;

export const BUNDLEKART_TEMPLATES: Array<{
  id: BundleKartTemplateId;
  name: string;
  desc: string;
  badge: string;
}> = [
  {
    id: "high_conversion",
    name: "High Conversion Direct-Response",
    desc: "Urgency bar, Pain points, Transformation, Value Stack, FAQs & 1-Click Buy",
    badge: "Recommended",
  },
  {
    id: "minimal",
    name: "Clean & Distraction-Free",
    desc: "Minimalist, sleek product showcase focused on reading sample & benefits",
    badge: "Clean",
  },
  {
    id: "curriculum",
    name: "Playbook & Masterclass",
    desc: "Curriculum-first breakdown with chapter previews & action milestones",
    badge: "Detailed",
  },
  {
    id: "toolkit",
    name: "Bundle & Toolkit Stack",
    desc: "Highlight multi-asset deliverables, templates, and bonus resource vaults",
    badge: "High Value",
  },
];

export const DEFAULT_LANDING_BLOCKS: BundleKartLandingBlock[] = [
  { id: "urgency_bar", enabled: true, headlineOverride: "⚡ SPECIAL LAUNCH PRICING: SAVE 60% TODAY ONLY" },
  { id: "hero", enabled: true },
  { id: "problem", enabled: true, headlineOverride: "The 3 Critical Mistakes Keeping You Stuck in Trading Time for Money" },
  { id: "benefits", enabled: true, headlineOverride: "What You Will Unlock Inside This Playbook" },
  { id: "deliverables", enabled: true },
  { id: "features", enabled: true, headlineOverride: "Complete Table of Contents & Curriculum" },
  { id: "sample_preview", enabled: true },
  { id: "testimonials", enabled: true },
  { id: "pricing", enabled: true },
  { id: "faq", enabled: true },
  { id: "delivery_guarantee", enabled: true },
];

export const MARKETPLACE_LICENSES: Array<{
  value: MarketplaceLicense;
  label: string;
  description: string;
}> = [
  { value: "standard", label: "Standard", description: "One reader, personal use." },
  { value: "extended", label: "Extended", description: "Buyer may resell or bundle." },
  { value: "exclusive", label: "Exclusive", description: "Sold once, rights transfer." },
];

export const LISTING_FORMATS: Array<{ value: ListingFormat; label: string }> = [
  { value: "epub", label: "EPUB" },
  { value: "pdf", label: "PDF" },
  { value: "docx", label: "DOCX" },
  { value: "markdown", label: "Markdown" },
];

export const API_SCOPES: Array<{ value: ApiScope; label: string; description: string }> = [
  { value: "projects:read", label: "projects:read", description: "List projects and read manuscripts." },
  { value: "projects:write", label: "projects:write", description: "Create projects and edit chapters." },
  { value: "publish", label: "publish", description: "Push listings to the marketplace." },
  { value: "usage:read", label: "usage:read", description: "Read token spend and generation history." },
];

/** The endpoints a token opens up. */
export const API_ENDPOINTS: Array<{ method: string; path: string; scope: ApiScope; summary: string }> = [
  { method: "GET", path: "/api/v1/projects", scope: "projects:read", summary: "List every project in this workspace." },
  { method: "GET", path: "/api/v1/projects/{id}", scope: "projects:read", summary: "Fetch one project with all chapters." },
  { method: "POST", path: "/api/v1/projects", scope: "projects:write", summary: "Create a project from a brief." },
  { method: "PATCH", path: "/api/v1/projects/{id}/chapters/{chapterId}", scope: "projects:write", summary: "Replace a chapter's content." },
  { method: "POST", path: "/api/v1/projects/{id}/publish", scope: "publish", summary: "Publish or update a marketplace listing." },
  { method: "DELETE", path: "/api/v1/projects/{id}/publish", scope: "publish", summary: "Take a listing off the marketplace." },
  { method: "GET", path: "/api/v1/usage", scope: "usage:read", summary: "Token spend, requests and cost to date." },
];

export type ListingInput = {
  price: number;
  currency: string;
  category: string;
  license: MarketplaceLicense;
  formats: ListingFormat[];
  visibility: ListingVisibility;
  summary: string;
  keywords: string[];
};

export type PublishResult = {
  listingId: string;
  listingUrl: string;
  revision: number;
  publishedAt: string;
  visibility: ListingVisibility;
};

/** Why publishing is unavailable, or null when it is ready. */
export function marketplaceBlocker(platform: PlatformApiSettings): string | null {
  if (!platform.marketplaceEnabled) return `${MARKETPLACE.shortName} publishing is turned off.`;
  if (!platform.marketplaceApiKey.trim()) return "No marketplace API key yet.";
  if (!platform.sellerId.trim()) return "No seller ID yet.";
  if (platform.connectionState !== "connected") return "The connection has not been verified.";
  return null;
}

export const isMarketplaceReady = (platform: PlatformApiSettings) => marketplaceBlocker(platform) === null;

/** Only a project the author has finished should reach a storefront. */
export function projectBlocker(project: Project): string | null {
  if (project.status !== "Ready") return "Finish and proofread the project first.";
  if (!project.chapters.length) return "The project has no chapters.";
  if (calculateProjectWords(project) < 200) return "The manuscript is too short to list.";
  return null;
}

/** Trimmed for the wire: chapter bodies are not part of a listing. */
function toListingPayload(project: Project, listing: ListingInput) {
  return {
    project: {
      id: project.id,
      title: project.title,
      description: listing.summary || project.description,
      audience: project.audience,
      tone: project.tone,
      type: project.type,
      wordCount: calculateProjectWords(project),
      chapterCount: project.chapters.length,
      hasCover: Boolean(project.coverImage),
      keywords: listing.keywords,
    },
    listing: {
      price: listing.price,
      currency: listing.currency,
      category: listing.category,
      license: listing.license,
      formats: listing.formats,
      visibility: listing.visibility,
    },
  };
}

function credentials(platform: PlatformApiSettings) {
  return {
    baseUrl: platform.marketplaceBaseUrl || MARKETPLACE.defaultBaseUrl,
    apiKey: platform.marketplaceApiKey,
    sellerId: platform.sellerId,
  };
}

async function postJson<T>(
  action: "connect" | "publish" | "unpublish",
  platform: PlatformApiSettings,
  payload: unknown,
): Promise<T> {
  const response = await fetch(MARKETPLACE_PROXY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action, ...credentials(platform), payload }),
  });

  const data = await response.json().catch(() => ({}) as Record<string, unknown>);
  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Request failed (${response.status}).`);
  }
  return data as T;
}

/** Verifies the credentials and returns the seller the key belongs to. */
export function testMarketplaceConnection(
  platform: PlatformApiSettings,
): Promise<{ seller: MarketplaceSeller }> {
  return postJson("connect", platform, {});
}

export function publishToMarketplace(
  project: Project,
  platform: PlatformApiSettings,
  listing: ListingInput,
  revision: number,
): Promise<PublishResult> {
  return postJson("publish", platform, { ...toListingPayload(project, listing), revision });
}

export function unpublishFromMarketplace(
  platform: PlatformApiSettings,
  listingId: string,
): Promise<{ listingId: string }> {
  return postJson("unpublish", platform, { listingId });
}

/* --------------------------------------------------------------------------
 * BundleKart 1-Click Creator API Integration
 * ----------------------------------------------------------------------- */

export type AiLandingPageElements = {
  hook: string;
  promise: string;
  subtitle: string;
  painPoints: string[];
  benefits: string[];
  deliverables: Array<{ name: string; format: string; description: string }>;
  bonuses: BundleKartBonus[];
  faqs: BundleKartFaq[];
  suggestedInr: number;
  suggestedUsd: number;
};

export function generateFallbackLandingCopy(project: Project): AiLandingPageElements {
  const words = calculateProjectWords(project);
  const target = project.audience?.trim() || "Creators & Solopreneurs";
  const hook = `FOR AMBITIOUS ${target.toUpperCase().replace(/^FOR\s+/i, "")}`;
  const promise = `Deploy automated systems from ${project.title} and ship tangible results immediately.`;
  const subtitle = project.description || "A complete execution manual and systemized implementation blueprint.";

  return {
    hook,
    promise,
    subtitle,
    painPoints: [
      "Overwhelmed by confusing, fragmented advice with zero actionable structure",
      "Wasting hundreds of hours reinventing systems that already have proven answers",
      "Stuck in execution paralysis without a step-by-step roadmap to tangible results",
      "Lacking battle-tested frameworks tailored specifically for high leverage",
    ],
    benefits: [
      `Master comprehensive ${project.chapters.length}-chapter frameworks synthesized across ${words.toLocaleString()} words of tested research`,
      "Eliminate costly beginner errors using verified checklists and implementation rubrics",
      "Accelerate time-to-results by 5x with copy-paste prompts and tactical templates",
      "Gain lifetime digital vault access with continuous updates and edition refreshes",
    ],
    deliverables: [
      {
        name: `${project.title} — Master Manual`,
        format: "PDF + EPUB",
        description: `Complete ${project.chapters.length}-chapter manuscript with worksheets and tactical guides.`,
      },
      {
        name: "Interactive Digital Implementation Vault",
        format: "Web + Markdown",
        description: "DRM-free copy-paste worksheets, checklists, and prompt guides.",
      },
    ],
    bonuses: [
      {
        title: "24-Hour Quick-Action Implementation Checklist",
        description: "Step-by-step checklist to deploy the core frameworks within your first 24 hours.",
        valueInr: 499,
        valueUsd: 9,
      },
      {
        title: "Curated Resource Vault & Tool Matrix",
        description: "Curated database of industry tools, automations, and execution frameworks.",
        valueInr: 799,
        valueUsd: 14,
      },
    ],
    faqs: [
      {
        q: "What formats will I receive upon checkout?",
        a: "You get immediate access to DRM-free PDF, EPUB, and web editions directly in your BundleKart purchase vault.",
      },
      {
        q: "Are future updates and editions included?",
        a: "Yes! Every revision and addition pushed from Writerdost is automatically updated for free in your vault.",
      },
      {
        q: "Can I read this on Kindle, iPad, or mobile?",
        a: "Absolutely. The EPUB edition is fully optimized for Apple Books, Kindle, Kobo, and all standard e-readers.",
      },
    ],
    suggestedInr: 499,
    suggestedUsd: 14,
  };
}

export async function generateBundleKartLandingCopy(
  project: Project,
  api: ApiSettings,
): Promise<AiLandingPageElements> {
  const systemPrompt = `You are an elite direct-response copywriter for high-ticket digital products and ebooks on BundleKart.
Analyze the provided manuscript and generate compelling, high-converting landing page elements in JSON format:
{
  "hook": "Punchy all-caps target badge (e.g. FOR AMBITIOUS PRODUCT MANAGERS)",
  "promise": "One clear, bold transformational promise",
  "subtitle": "Clear, benefit-driven subtitle explaining the framework",
  "painPoints": ["3-4 intense problems and frustrations this book eliminates"],
  "benefits": ["3-4 key outcomes, metrics, or superpowers the reader gains"],
  "deliverables": [
    { "name": "Primary Manuscript", "format": "PDF + EPUB", "description": "Complete master manual with worksheets" }
  ],
  "bonuses": [
    { "title": "Quick-Action Implementation Checklist", "description": "Step-by-step checklist to apply within 24 hours", "valueInr": 499, "valueUsd": 9 },
    { "title": "Notion Resource Vault", "description": "Curated database of tools and frameworks", "valueInr": 799, "valueUsd": 14 }
  ],
  "faqs": [
    { "q": "What formats will I receive?", "a": "Instant access to DRM-free PDF, EPUB, and web versions in your library vault." },
    { "q": "Are updates included?", "a": "Yes! All future editions and revisions are automatically updated for free." }
  ],
  "suggestedInr": 499,
  "suggestedUsd": 14
}`;

  const chapterOutlines = project.chapters
    .slice(0, 8)
    .map((c, i) => `${i + 1}. ${c.title}`)
    .join("\n");

  const sampleBody = project.chapters
    .map((c) => htmlToText(c.content || "").slice(0, 250))
    .filter(Boolean)
    .slice(0, 3)
    .join("\n\n");

  const userPrompt = `MANUSCRIPT DETAILS:
Title: ${project.title}
Audience: ${project.audience || "General Readers"}
Tone: ${project.tone || "Authoritative and Practical"}
Description: ${project.description || "N/A"}
Total Words: ${calculateProjectWords(project)}
Total Chapters: ${project.chapters.length}

TABLE OF CONTENTS:
${chapterOutlines || "No chapters outlined yet."}

SAMPLE EXCERPTS:
${sampleBody || "No chapter samples yet."}

Please output ONLY valid JSON matching the exact schema.`;

  try {
    if (!api.apiKey) {
      return generateFallbackLandingCopy(project);
    }

    const rawResponse = await generateAiText({
      api,
      systemPrompt,
      userPrompt,
      temperature: 0.7,
    });

    const cleaned = rawResponse
      .replace(/^```json\s*/i, "")
      .replace(/^```\s*/i, "")
      .replace(/\s*```$/i, "")
      .trim();

    const parsed = JSON.parse(cleaned) as Partial<AiLandingPageElements>;
    const fallback = generateFallbackLandingCopy(project);

    return {
      hook: parsed.hook?.trim() || fallback.hook,
      promise: parsed.promise?.trim() || fallback.promise,
      subtitle: parsed.subtitle?.trim() || fallback.subtitle,
      painPoints:
        Array.isArray(parsed.painPoints) && parsed.painPoints.length > 0
          ? parsed.painPoints.map(String)
          : fallback.painPoints,
      benefits:
        Array.isArray(parsed.benefits) && parsed.benefits.length > 0
          ? parsed.benefits.map(String)
          : fallback.benefits,
      deliverables:
        Array.isArray(parsed.deliverables) && parsed.deliverables.length > 0
          ? (parsed.deliverables as any)
          : fallback.deliverables,
      bonuses:
        Array.isArray(parsed.bonuses) && parsed.bonuses.length > 0
          ? parsed.bonuses.map((b: any) => ({
              title: String(b.title || "Bonus Vault"),
              description: String(b.description || "Exclusive resource"),
              valueInr: Number(b.valueInr) || 499,
              valueUsd: Number(b.valueUsd) || 9,
            }))
          : fallback.bonuses,
      faqs:
        Array.isArray(parsed.faqs) && parsed.faqs.length > 0
          ? parsed.faqs.map((f: any) => ({ q: String(f.q || ""), a: String(f.a || "") }))
          : fallback.faqs,
      suggestedInr: Number(parsed.suggestedInr) || fallback.suggestedInr,
      suggestedUsd: Number(parsed.suggestedUsd) || fallback.suggestedUsd,
    };
  } catch (error) {
    console.warn("AI generation failed or not configured, using smart heuristic copy:", error);
    return generateFallbackLandingCopy(project);
  }
}

/** Verifies the BundleKart API key */
export async function testBundleKartConnection(
  platform: PlatformApiSettings,
): Promise<{ success: boolean; seller: MarketplaceSeller; service?: string }> {
  const response = await fetch(MARKETPLACE_PROXY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "bundlekart_connect",
      ...credentials(platform),
    }),
  });

  const data = await response.json().catch(() => ({}) as Record<string, unknown>);
  if (!response.ok) {
    throw new Error(
      typeof data.error === "string" ? data.error : `Connection verification failed (${response.status}).`,
    );
  }
  return data as { success: boolean; seller: MarketplaceSeller; service?: string };
}

/** Pushes the product & landing page config to BundleKart with 1 click */
export async function publishToBundleKart(
  project: Project,
  platform: PlatformApiSettings,
  payload: BundleKartPublishPayload,
): Promise<BundleKartPublishResponse> {
  const response = await fetch(MARKETPLACE_PROXY, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      action: "bundlekart_publish",
      ...credentials(platform),
      payload,
    }),
  });

  const data = await response.json().catch(() => ({}) as Record<string, unknown>);
  if (!response.ok) {
    throw new Error(typeof data.error === "string" ? data.error : `Publish failed (${response.status}).`);
  }
  return data as BundleKartPublishResponse;
}

/** A token the user can copy once. Generated in the browser, shown once. */
export function generateApiToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `wd_live_${body}`;
}

export const maskToken = (token: string) =>
  token.length <= 12 ? token : `${token.slice(0, 11)}${"•".repeat(8)}${token.slice(-4)}`;
