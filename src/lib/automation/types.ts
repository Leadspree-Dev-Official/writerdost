import type { ApiSettings, AutomationFrequency } from "@/lib/store-types";

export type DestinationKind =
  | "wordpress"
  | "ghost"
  | "webflow"
  | "strapi"
  | "sanity"
  | "webhook";

export type AutomationSource = "topic" | "rss" | "sitemap" | "url";
export type PublishMode = "draft" | "publish" | "gated";

export type Destination = {
  id: string;
  name: string;
  kind: DestinationKind;
  config: Record<string, unknown>;
  /** Decrypted only inside the worker, never returned to the browser. */
  secret?: string;
};

export type ContentConfig = {
  tone: string;
  audience: string;
  targetWords: number;
  language: string;
  keywords: string[];
  /** Link back to the article a post was sourced from. */
  citeSource: boolean;
  /** Extra house-style guidance appended to the writing prompt. */
  styleNotes?: string;
};

export type SourceConfig = {
  /** `topic` mode: the pool of subjects to write about. */
  topics?: string[];
  /** `rss` / `sitemap` / `url` mode. */
  feedUrl?: string;
  /** Ceiling on how many new items one run will process. */
  maxPerRun?: number;
  /** Ignore source articles shorter than this. */
  minWords?: number;
};

export type Automation = {
  id: string;
  userId: string;
  name: string;
  enabled: boolean;
  sourceKind: AutomationSource;
  sourceConfig: SourceConfig;
  contentConfig: ContentConfig;
  api: ApiSettings;
  destination: Destination | null;
  publish: PublishMode;
  frequency: AutomationFrequency;
  scheduleCron: string;
  timezone: string;
  lastRunAt: string | null;
  nextRunAt: string | null;
};

/** One thing worth writing about, from a feed or from the topic list. */
export type SourceItem = {
  /** Stable identity for dedupe. Topics hash their own text. */
  url: string;
  title: string;
  /** Extracted article body, empty for topic-mode items. */
  content: string;
  publishedAt?: string;
};

/** A finished piece, before it is handed to a destination. */
export type GeneratedPost = {
  title: string;
  slug: string;
  bodyHtml: string;
  bodyMarkdown: string;
  excerpt: string;
  metaDescription: string;
  keywords: string[];
  sourceUrl?: string;
  sourceTitle?: string;
};

export type PublishResult = {
  remoteId: string;
  remoteUrl?: string;
  state: "draft" | "published";
};

/** What every destination adapter must implement. */
export type DestinationAdapter = {
  kind: DestinationKind;
  label: string;
  /** Fields the UI should collect, so the form is driven by the adapter. */
  fields: Array<{
    name: string;
    label: string;
    placeholder?: string;
    secret?: boolean;
    required?: boolean;
    help?: string;
  }>;
  publish(
    post: GeneratedPost,
    destination: Destination,
    mode: Exclude<PublishMode, "gated">,
  ): Promise<PublishResult>;
};
