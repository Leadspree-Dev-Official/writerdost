export type ApiProvider =
  | "openai"
  | "claude"
  | "gemini"
  | "deepseek"
  | "groq"
  | "commandcode"
  | "openrouter"
  | "ollama"
  | "ollama_cloud"
  | "custom";

export type ApiSettings = {
  provider: ApiProvider;
  apiKey: string;
  baseUrl: string;
  model: string;
  appName: string;
  siteUrl: string;
};

export type ByokModelUsage = {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  totalRequests: number;
  totalCost: number;
  lastUsedAt?: number;
};

export type ByokModelConfig = {
  id: string;
  name: string;
  provider: ApiProvider;
  model: string;
  apiKey: string;
  baseUrl: string;
  inputTokenRate: number; // USD per 1M tokens
  outputTokenRate: number; // USD per 1M tokens
  isDefault?: boolean;
  isFree?: boolean; // When true, token usage is tracked but cost calculations are nullified ($0.00)
  createdAt: number;
  usage: ByokModelUsage;
};

export type BlogSource = "none" | "blank" | "project" | "topic" | "template" | "research";

export type SavedBlogPost = {
  id: string;
  title: string;
  draft: string;
  metaDescription?: string;
  keywords?: string[];
  source: BlogSource;
  sourceName?: string;
  topic?: string;
  projectId?: string;
  researchId?: string;
  templateId?: string;
  targetWords?: number;
  wordCount?: number;
  createdAt: number;
  updatedAt: number;
  lastEngine?: GenerationEngine;
};

export type OutlinePoint = string | { point: string; subpoints: string[] };

export interface MemoryCharacter {
  name: string;
  role: string;
  traits: string[];
  arcStatus?: string;
}

export interface BookMemoryBank {
  characters: MemoryCharacter[];
  timelineEvents: string[];
  unresolvedThreads: string[];
  thematicDirectives: string[];
  pacingIntensity: number; // Scale 1-10
  lastChapterSummary: string;
}

export type SkillCategory = "blog" | "ebook" | "book" | "research" | "copywriting" | "general";

export interface CustomSkill {
  id: string;
  name: string;
  category: SkillCategory;
  description: string;
  author?: string;
  triggers?: string[];
  systemPromptAddendum: string;
  bannedPhrases: string[];
  rubric?: string;
  rawMarkdown: string;
  isCustom: boolean;
  createdAt: number;
}

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
  /** The language the manuscript is written in. */
  language?: string;
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
  isByok?: boolean;
  engine?: GenerationEngine;
};

export type UserPlan = 'Free' | 'Basic' | 'Pro' | 'Enterprise' | 'Custom';

export interface PlanLimits {
  maxProjectsPerMonth: number;
  maxBlogsPerMonth: number;
}

export interface UserFeatures {
  createEbook: boolean;
  rewriteEbook: boolean;
  blogGenerator: boolean;
  advancedModels: boolean;
}

export interface PlanDefinition {
  id: UserPlan;
  name: string;
  description: string;
  priceMonthly: number;
  priceYearly: number;
  currency: string;
  limits: PlanLimits;
  features: UserFeatures;
  featureList: string[];
  isPopular?: boolean;
  buttonLabel: string;
}

export const PLAN_DEFINITIONS: Record<Exclude<UserPlan, "Custom">, PlanDefinition> = {
  Free: {
    id: "Free",
    name: "Free Forever",
    description: "Ideal for trying out Writerdost AI with basic monthly limits.",
    priceMonthly: 0,
    priceYearly: 0,
    currency: "USD",
    limits: {
      maxProjectsPerMonth: 2,
      maxBlogsPerMonth: 2,
    },
    features: {
      createEbook: true,
      rewriteEbook: false,
      blogGenerator: true,
      advancedModels: false,
    },
    featureList: [
      "2 Ebook projects per month",
      "2 Blog posts generated per month",
      "Standard AI models",
      "Draft & outline editor",
      "Export to EPUB & PDF",
    ],
    buttonLabel: "Current Plan",
  },
  Basic: {
    id: "Basic",
    name: "Basic",
    description: "For passionate writers publishing books and articles steadily.",
    priceMonthly: 5,
    priceYearly: 49,
    currency: "USD",
    limits: {
      maxProjectsPerMonth: 10,
      maxBlogsPerMonth: 20,
    },
    features: {
      createEbook: true,
      rewriteEbook: true,
      blogGenerator: true,
      advancedModels: false,
    },
    featureList: [
      "10 Ebook projects per month",
      "20 Blog posts generated per month",
      "Rewrite passage tool",
      "Standard AI models",
      "Direct CMS publishing",
    ],
    buttonLabel: "Upgrade to Basic",
  },
  Pro: {
    id: "Pro",
    name: "Pro Writer",
    description: "Maximum productivity for high-volume authors and content teams.",
    priceMonthly: 19,
    priceYearly: 189,
    currency: "USD",
    isPopular: true,
    limits: {
      maxProjectsPerMonth: 50,
      maxBlogsPerMonth: 100,
    },
    features: {
      createEbook: true,
      rewriteEbook: true,
      blogGenerator: true,
      advancedModels: true,
    },
    featureList: [
      "50 Ebook projects per month",
      "100 Blog posts generated per month",
      "BlogGen scheduled automations",
      "Advanced AI Models (Claude, DeepSeek, OpenAI)",
      "Priority generation speed",
      "Priority customer support",
    ],
    buttonLabel: "Upgrade to Pro",
  },
  Enterprise: {
    id: "Enterprise",
    name: "Studio Suite & Private Server",
    description: "For agencies, publishing studios, and teams needing private AI instances & unlimited projects.",
    priceMonthly: 49,
    priceYearly: 490,
    currency: "USD",
    limits: {
      maxProjectsPerMonth: -1,
      maxBlogsPerMonth: -1,
    },
    features: {
      createEbook: true,
      rewriteEbook: true,
      blogGenerator: true,
      advancedModels: true,
    },
    featureList: [
      "Unlimited Ebook projects",
      "Unlimited Blog posts generated",
      "Dedicated Private Server instance",
      "Custom AI models & BYO endpoints",
      "BlogGen multi-destination automations",
      "Dedicated account manager & SLA",
    ],
    buttonLabel: "Get Custom Enterprise",
  },
};

export interface FounderCampaignConfig {
  isEnabled: boolean;
  durationDays: number;
  autoRenew: boolean;
  cycleStartedAt: string;
  basicPrice: number;
  proPrice: number;
  basicTotalSlots: number;
  basicClaimedSlots: number;
  proTotalSlots: number;
  proClaimedSlots: number;
}

export const DEFAULT_FOUNDER_CAMPAIGN: FounderCampaignConfig = {
  isEnabled: true,
  durationDays: 30,
  autoRenew: true,
  cycleStartedAt: new Date().toISOString(),
  basicPrice: 99,
  proPrice: 299,
  basicTotalSlots: 100,
  basicClaimedSlots: 78,
  proTotalSlots: 50,
  proClaimedSlots: 36,
};

export interface Coupon {
  id: string;
  code: string;
  discountType: 'percent' | 'fixed';
  discountValue: number;
  validUntil?: string | null;
  maxUses?: number | null;
  timesUsed: number;
  isActive: boolean;
  minPlan?: UserPlan;
  createdAt: string;
}

export interface ReferralRecord {
  id: string;
  referrerUserId: string;
  referrerCode: string;
  refereeUserId: string;
  refereeEmail?: string;
  plan: UserPlan;
  discountApplied: number;
  status: 'pending' | 'completed';
  createdAt: string;
}

export interface SubscriptionOrder {
  id: string;
  userId: string;
  userEmail: string;
  plan: UserPlan;
  billingInterval: 'monthly' | 'yearly';
  amountPaid: number;
  currency: string;
  couponCode?: string;
  discountAmount?: number;
  referralCode?: string;
  paymentProvider: 'simulated' | 'paypal' | 'stripe';
  status: 'active' | 'cancelled' | 'expired';
  startDate: string;
  renewDate: string;
  createdAt: string;
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
  credits?: number;
}

export type GenerationEngine = 'bizai' | 'byok';

export interface CreditPack {
  id: string;
  name: string;
  credits: number;
  priceUsd: number;
  description: string;
  badge?: string;
  isPopular?: boolean;
}

/** Rate at which token usage is converted to credits: 1 token = 0.015 credits (100 tokens = 1.5 credits) */
export const TOKEN_CREDIT_MULTIPLIER = 0.015;

/** Average raw tokens consumed per finished word across multi-agent research, planning & drafting (~2.35 tokens/word) */
export const TOKENS_PER_WORD_ESTIMATE = 2.35;

/** Helper to estimate actual credits required for a target word count: words * 2.35 tokens * 0.015 credits/token */
export function estimateCreditsForWords(words: number): number {
  return Number((words * TOKENS_PER_WORD_ESTIMATE * TOKEN_CREDIT_MULTIPLIER).toFixed(2));
}

/** Displayed token expectation shown to users in UI (40% lower than assumed for conversion psychology) */
export function getDisplayedTokenEstimate(words: number): number {
  return Math.round(words * TOKENS_PER_WORD_ESTIMATE * 0.60);
}

/** Displayed credit expectation shown to users in UI (40% lower than assumed for conversion psychology) */
export function getDisplayedCreditEstimate(words: number): number {
  return Number((estimateCreditsForWords(words) * 0.60).toFixed(2));
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'starter',
    name: 'Starter Pack',
    credits: 500,
    priceUsd: 5,
    description: '500 Credits. Great for ~33,000 raw tokens of generation, outlines & blog drafts.',
  },
  {
    id: 'creator',
    name: 'Creator Pack',
    credits: 2_000,
    priceUsd: 15,
    description: '2,000 Credits. Perfect for complete 1 Lakh word ebooks & deep multi-agent pipelines.',
    badge: 'Most Popular',
    isPopular: true,
  },
  {
    id: 'studio',
    name: 'Studio Pack',
    credits: 6_000,
    priceUsd: 35,
    description: '6,000 Credits. Maximum volume for high-output authors, multi-novel series & automated blogs.',
    badge: 'Best Value',
  },
];

export const CREDIT_COSTS = {
  project: 1_500, // standard project allowance in credits (100k raw tokens * 0.015)
  blog: 30,       // standard blog post (~2,000 raw tokens * 0.015)
  rewrite: 15,    // standard passage rewrite (~1,000 raw tokens * 0.015)
} as const;

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

   Outbound — this workspace pushes a finished project to BundleKart
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

  /* BundleKart specific publishing metadata */
  bundlekartProductId?: string;
  bundlekartStoreUrl?: string;
  bundlekartLandingUrl?: string;
  bundlekartRevision?: number;
  bundlekartSlug?: string;
  bundlekartInr?: number;
  bundlekartUsd?: number;
  landingPageConfig?: BundleKartLandingPageConfig;
};

export type BundleKartDeliverableFile = {
  format: string;
  name: string;
  size: string;
  version: string;
};

export type BundleKartBonus = {
  title: string;
  description: string;
  valueInr: number;
  valueUsd: number;
};

export type BundleKartFaq = {
  q: string;
  a: string;
};

export type BundleKartLandingBlock = {
  id: string;
  enabled: boolean;
  headlineOverride?: string;
};

export type BundleKartTemplateId = "high_conversion" | "minimal" | "curriculum" | "toolkit";

export type BundleKartLandingPageConfig = {
  templateId: BundleKartTemplateId;
  customAccentColor: string;
  showUrgencyBanner: boolean;
  urgencyTimerMinutes: number;
  showLiveViewers: boolean;
  showRecentSales: boolean;
  blocks: BundleKartLandingBlock[];
};

export type BundleKartPublishPayload = {
  title: string;
  type: "ebook" | "prompts" | "template";
  subtitle: string;
  hook: string;
  promise: string;
  cat: string;
  inr: number;
  usd: number;
  pages: number;
  units: string;
  chargeGst: boolean;
  routeMode: "both" | "landing" | "store";
  cover?: string;
  imageUrl?: string;
  downloadUrl?: string;
  sampleExcerpt?: string;
  bullets: string[];
  about: string[];
  toc: string[];
  files: BundleKartDeliverableFile[];
  faqs: BundleKartFaq[];
  bonuses: BundleKartBonus[];
  landingPageConfig: BundleKartLandingPageConfig;
};

export type BundleKartPublishResponse = {
  success: boolean;
  message?: string;
  error?: string;
  data?: {
    id: string;
    title: string;
    slug: string;
    status: string;
    inr: number;
    usd: number;
  };
  storeUrl?: string;
  landingUrl?: string;
  timestamp?: string;
};

/* --------------------------------------------------------------------------
 * Blog automation
 *
 * Held locally so automations can be configured and dry-run before the
 * Appwrite backend is connected. Scheduling requires the backend; everything
 * here is what the UI needs to describe a job.
 * ----------------------------------------------------------------------- */

export type AutomationSourceKind = "topic" | "rss" | "sitemap" | "url";
/** How often a campaign runs. "custom" hands control back to raw cron. */
export type AutomationFrequency =
  | "once"
  | "daily"
  | "weekly"
  | "biweekly"
  | "monthly"
  | "custom";
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
  frequency: AutomationFrequency;
  /** YYYY-MM-DD, read in `timezone`. Its meaning depends on the frequency:
   *  the day a one-off runs, the weekday a weekly repeats on, the anchor a
   *  fortnightly counts from, the day-of-month a monthly uses. */
  startDate: string;
  /** HH:mm, read in `timezone`. */
  startTime: string;
  scheduleCron: string;
  timezone: string;
  createdAt: string;
  lastPreviewAt?: string;
};

export type CampaignPost = {
  id: string;
  automationId: string;
  title: string;
  slug: string;
  bodyHtml: string;
  bodyMarkdown: string;
  excerpt: string;
  metaDescription: string;
  keywords: string[];
  sourceUrl?: string;
  sourceTitle?: string;
  state: "draft" | "published" | "failed";
  remoteUrl?: string;
  quality?: { passed: boolean; wordCount: number; issues: string[] };
  tokens?: number;
  createdAt: string;
};

export interface ContextRoutingConfig {
  enabled: boolean;
  thresholdTokens: number;
  fallbackProvider: ApiProvider;
  fallbackModel: string;
}

export const DEFAULT_CONTEXT_ROUTING: ContextRoutingConfig = {
  enabled: false,
  thresholdTokens: 95000,
  fallbackProvider: "deepseek",
  fallbackModel: "deepseek-chat",
};

export interface GatewayFallbackTier {
  enabled: boolean;
  provider: ApiProvider;
  model: string;
  label: string;
  instanceId?: string;
}

export type GatewayTierMode = "primary" | "fallback" | "unassigned";

export interface GatewayProviderInstance {
  id: string;
  provider: ApiProvider;
  label?: string;
  model: string;
  apiKey?: string;
  customEndpoint?: string;
  isFree?: boolean;
  tier: GatewayTierMode;
  fallbackTiers?: number[];
  createdAt?: number;
}

export interface GatewayProviderMetric {
  provider: ApiProvider;
  model?: string;
  totalRequests: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  lastUsedTimestamp?: number;
  recentTimestamps?: number[];
  isFree?: boolean;
}

export interface GatewayAnalytics {
  totalRequests: number;
  totalTokens: number;
  inputTokens: number;
  outputTokens: number;
  totalCost: number;
  freeRequests: number;
  freeTokens: number;
  requestsPerMinute: number;
  providers: Record<string, GatewayProviderMetric>;
}

export interface BizAiGatewayConfig {
  // Platform default primary provider & model (optional until configured)
  primaryProvider?: ApiProvider;
  primaryModel?: string;

  // Server-managed gateway API keys (stored server-side, masked when returned to client)
  serverKeys: {
    anthropic?: string;
    openai?: string;
    gemini?: string;
    deepseek?: string;
    groq?: string;
    commandcode?: string;
    openrouter?: string;
  };

  // Explicit list of configured/added provider IDs
  configuredProviders?: ApiProvider[];

  // Custom Base URLs / proxy endpoints per provider (e.g. Cloudflare AI Gateway, LiteLLM, Portkey)
  customEndpoints?: Record<string, string>;

  // Preferred model preset per provider
  providerModels?: Record<string, string>;

  // Providers marked as free/zero-cost ($0.00 rate)
  freeProviders?: Record<string, boolean>;

  // Failover Chain
  failoverEnabled: boolean;
  failoverTriggers: {
    rateLimit429: boolean;
    serverErrors5xx: boolean;
    timeout: boolean;
  };
  fallbacks: GatewayFallbackTier[];

  // Token threshold fallback (e.g. >95k token Claude requests)
  contextThresholdEnabled: boolean;
  contextThresholdTokens: number;
  contextFallbackProvider: ApiProvider;
  contextFallbackModel: string;

  // Multi-instance provider instances (allows adding any provider more than once with per-instance tiers)
  instances?: GatewayProviderInstance[];
  primaryInstanceId?: string;
}

export const DEFAULT_BIZAI_GATEWAY_CONFIG: BizAiGatewayConfig = {
  primaryProvider: undefined,
  primaryModel: "",
  serverKeys: {
    anthropic: "",
    openai: "",
    gemini: "",
    deepseek: "",
    groq: "",
    commandcode: "",
    openrouter: "",
  },
  configuredProviders: [],
  customEndpoints: {},
  providerModels: {},
  freeProviders: { groq: true, ollama: true },
  failoverEnabled: false,
  failoverTriggers: {
    rateLimit429: true,
    serverErrors5xx: true,
    timeout: true,
  },
  fallbacks: [],
  contextThresholdEnabled: false,
  contextThresholdTokens: 95000,
  contextFallbackProvider: "deepseek",
  contextFallbackModel: "",
  instances: [],
  primaryInstanceId: undefined,
};


