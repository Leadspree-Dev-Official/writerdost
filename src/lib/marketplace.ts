/**
 * InstaGuru Marketplace integration.
 *
 * The marketplace itself is still being built, so every call here goes to this
 * app's own mock routes under /api/marketplace instead of a live host. The
 * request and response shapes are the ones we intend to keep: when the real
 * service ships, point `MARKETPLACE_ROUTES` at it and the UI is unchanged.
 */
import type {
  ApiScope,
  ListingFormat,
  ListingVisibility,
  MarketplaceLicense,
  MarketplaceSeller,
  PlatformApiSettings,
} from "@/lib/store-types";
import type { Project } from "@/lib/app-store";
import { calculateProjectWords } from "@/lib/app-utils";

export const MARKETPLACE = {
  name: "InstaGuru Marketplace",
  shortName: "InstaGuru",
  /** Where the live API will live. Editable in Settings → API. */
  defaultBaseUrl: "https://api.instaguru.market/v1",
  storeUrl: "https://instaguru.market",
  /** Everything is mocked until the service is live. */
  isMock: true,
} as const;

/** Local routes standing in for the marketplace while it is being built. */
const MARKETPLACE_ROUTES = {
  connect: "/api/marketplace/connect",
  publish: "/api/marketplace/publish",
  unpublish: "/api/marketplace/unpublish",
} as const;

export const MARKETPLACE_CATEGORIES = [
  "Business & Money",
  "Self Improvement",
  "Fiction",
  "Health & Fitness",
  "Technology",
  "Education & Study Guides",
  "Marketing & Sales",
  "Spirituality",
  "Regional Languages",
] as const;

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

/** The endpoints a token opens up. Documented here, served by the mock routes. */
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
  /** True while the marketplace is mocked, so the UI can say so plainly. */
  mock: boolean;
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

async function postJson<T>(url: string, body: unknown): Promise<T> {
  const response = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
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
): Promise<{ seller: MarketplaceSeller; mock: boolean }> {
  return postJson(MARKETPLACE_ROUTES.connect, credentials(platform));
}

export function publishToMarketplace(
  project: Project,
  platform: PlatformApiSettings,
  listing: ListingInput,
  revision: number,
): Promise<PublishResult> {
  return postJson(MARKETPLACE_ROUTES.publish, {
    ...credentials(platform),
    ...toListingPayload(project, listing),
    revision,
  });
}

export function unpublishFromMarketplace(
  platform: PlatformApiSettings,
  listingId: string,
): Promise<{ listingId: string; mock: boolean }> {
  return postJson(MARKETPLACE_ROUTES.unpublish, { ...credentials(platform), listingId });
}

/** A token the user can copy once. Mock: generated in the browser. */
export function generateApiToken(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const body = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
  return `wd_live_${body}`;
}

export const maskToken = (token: string) =>
  token.length <= 12 ? token : `${token.slice(0, 11)}${"•".repeat(8)}${token.slice(-4)}`;
