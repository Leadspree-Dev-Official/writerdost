export type ApiProvider = "openai" | "claude" | "gemini" | "deepseek" | "openrouter" | "ollama" | "ollama_cloud" | "custom";

export type ApiSettings = {
  provider: ApiProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  appName: string;
  siteUrl: string;
};

export type OutlinePoint = string | { point: string; subpoints: string[] };

export type GeneratedChapter = {
  id: string;
  title: string;
  outline: OutlinePoint[];
  content: string;
  summary: string;
  status: "Done" | "In Progress" | "Not started";
  wordCount: number;
};

export type GeneratedProjectPayload = {
  title: string;
  description: string;
  audience: string;
  tone: string;
  targetLength: number;
  positioning: string;
  chapterCount: number;
  chapters: GeneratedChapter[];
  seoKeywords: string[];
  metaDescription: string;
  blogTitle: string;
  blogDraft: string;
  outlineDuration?: number;
  draftDuration?: number;
  tokensUsed?: number;
};

export type UserPlan = 'Basic' | 'Pro' | 'Enterprise' | 'Custom';

export interface UserFeatures {
  createEbook: boolean;
  rewriteEbook: boolean;
  blogGenerator: boolean;
  advancedModels: boolean;
}

export interface User {
  id: string;
  fullName: string;
  email: string;
  role: 'user' | 'admin';
  status: 'active' | 'suspended';
  registeredAt: string;
  password?: string;
  plan: UserPlan;
  allowedFeatures: UserFeatures;
}

export interface UpgradeRequest {
  id: string;
  userId: string;
  userEmail: string;
  userName: string;
  feature: string;
  timestamp: string;
  status: 'pending' | 'resolved';
}


/* ---- Platform API & marketplace publishing ---------------------------
   Two directions, both configured on Settings → API:

   Outbound — this workspace pushes a finished project to InstaGuru
   Marketplace as a listing.
   Inbound  — a token lets another tool drive this workspace over HTTP, so a
   project can be outsourced to an editor, an agency or a script.          */

export type ApiScope = "projects:read" | "projects:write" | "publish" | "usage:read";

export type ApiToken = {
  id: string;
  label: string;
  token: string;
  scopes: ApiScope[];
  createdAt: string;
  lastUsedAt: string | null;
  revoked: boolean;
};

export type MarketplaceLicense = "standard" | "extended" | "exclusive";
export type ListingFormat = "epub" | "pdf" | "docx" | "markdown";
export type ConnectionState = "disconnected" | "connected" | "error";

/** What the marketplace tells us about the connected account. */
export type MarketplaceSeller = {
  sellerId: string;
  displayName: string;
  storeUrl: string;
  plan: string;
};

export type PlatformApiSettings = {
  marketplaceEnabled: boolean;
  marketplaceBaseUrl: string;
  marketplaceApiKey: string;
  sellerId: string;
  connectionState: ConnectionState;
  connectionMessage: string;
  lastCheckedAt: number | null;
  seller: MarketplaceSeller | null;

  /** Listing defaults, pre-filled into every publish dialog. */
  defaultPrice: number;
  currency: string;
  defaultCategory: string;
  defaultLicense: MarketplaceLicense;
  defaultFormats: ListingFormat[];
  defaultVisibility: ListingVisibility;
  autoPublishOnReady: boolean;

  tokens: ApiToken[];
  webhookUrl: string;
  webhookSecret: string;
};

export type PublishStatus = "unpublished" | "publishing" | "published" | "failed";
export type ListingVisibility = "draft" | "public";

/** Per-project record of what is live on the marketplace. */
export type PublishState = {
  status: PublishStatus;
  revision: number;
  listingId?: string;
  listingUrl?: string;
  publishedAt?: string;
  price?: number;
  currency?: string;
  category?: string;
  license?: MarketplaceLicense;
  formats?: ListingFormat[];
  visibility?: ListingVisibility;
  error?: string;
};

/* --------------------------------------------------------------------------
 * Blog automation
 *
 * Held locally so automations can be configured and dry-run before the
 * Supabase backend is connected. Scheduling requires the backend; everything
 * here is what the UI needs to describe a job.
 * ----------------------------------------------------------------------- */

export type AutomationSourceKind = "topic" | "rss" | "sitemap" | "url";
export type AutomationPublishMode = "draft" | "publish" | "gated";
export type AutomationDestinationKind =
  | "wordpress"
  | "ghost"
  | "webflow"
  | "strapi"
  | "sanity"
  | "webhook";

export type AutomationDestination = {
  id: string;
  name: string;
  kind: AutomationDestinationKind;
  /** Non-secret settings plus, locally only, the token under `secret`. */
  config: Record<string, string>;
};

export type BlogAutomation = {
  id: string;
  name: string;
  enabled: boolean;
  sourceKind: AutomationSourceKind;
  sourceConfig: {
    topics?: string[];
    feedUrl?: string;
    maxPerRun?: number;
    minWords?: number;
  };
  contentConfig: {
    tone: string;
    audience: string;
    targetWords: number;
    language: string;
    keywords: string[];
    citeSource: boolean;
    styleNotes?: string;
  };
  destinationId: string | null;
  publish: AutomationPublishMode;
  scheduleCron: string;
  timezone: string;
  createdAt: string;
  lastPreviewAt?: string;
};
