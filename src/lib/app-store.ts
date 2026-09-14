"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { cronForFrequency, todayIso } from "./automation/schedule";
import { account, appwriteBrowserConfigured, appwriteMessage } from "@/lib/appwrite/client";
import { defaultPrefs, toUser } from "@/lib/auth/profile";
import * as backend from "./automation/client-api";
import type { AutomationWire, DestinationWire } from "./automation/wire";
import { providerDefaults } from "@/lib/ai-providers";
import { MARKETPLACE, generateApiToken } from "@/lib/marketplace";
import type {
  ApiScope,
  BlogAutomation,
  AutomationDestination,
  CampaignPost,
  ApiSettings,
  ApiToken,
  GeneratedProjectPayload,
  PlatformApiSettings,
  PublishState,
  User,
  UpgradeRequest,
  UserPlan,
  UserFeatures,
} from "@/lib/store-types";

/** Whether the session has been resolved yet. See `restoreSession`. */
export type AuthStatus = "unknown" | "authenticated" | "anonymous";

export type AuthResult = { success: boolean; error?: string };

/** What the campaign screen shows about the state of the write-behind queue. */
export type AutomationSync = { pending: boolean; error: string | null };

/* -------------------------------------------------------------------------
   Campaign write-behind

   The campaign screen calls `updateAutomation` on every keystroke, so writes
   are coalesced per automation and sent once the typing stops. Timers are
   keyed by id: editing two campaigns in quick succession must not have one
   flush cancel the other.
   ------------------------------------------------------------------------- */

const FLUSH_DELAY_MS = 800;

const pendingFlushes = new Map<string, ReturnType<typeof setTimeout>>();

type StoreSet = (
  partial: Partial<AppStore> | ((state: AppStore) => Partial<AppStore>),
) => void;
type StoreGet = () => AppStore;

/** The server shape, narrowed to what the UI edits. */
function fromWire(wire: AutomationWire): BlogAutomation {
  return {
    id: wire.id,
    name: wire.name,
    enabled: wire.enabled,
    sourceKind: wire.sourceKind,
    sourceConfig: wire.sourceConfig,
    contentConfig: wire.contentConfig,
    destinationId: wire.destinationId,
    publish: wire.publish,
    frequency: wire.frequency,
    startDate: wire.startDate,
    startTime: wire.startTime,
    scheduleCron: wire.scheduleCron,
    timezone: wire.timezone,
    createdAt: wire.createdAt,
    lastPreviewAt: wire.lastPreviewAt,
  };
}

/**
 * The credential is deliberately absent: it never leaves the server once
 * stored, so the form shows an empty field meaning "leave what is on file".
 */
function destinationFromWire(wire: DestinationWire): AutomationDestination {
  return { id: wire.id, name: wire.name, kind: wire.kind, config: wire.config };
}

/**
 * The AI settings travel with every save so the scheduler holds a current key:
 * it runs at three in the morning with no browser to ask. The key is encrypted
 * server-side before it is stored, and never comes back.
 */
function toInput(automation: BlogAutomation, api: ApiSettings) {
  return {
    name: automation.name,
    enabled: automation.enabled,
    sourceKind: automation.sourceKind,
    sourceConfig: automation.sourceConfig,
    contentConfig: automation.contentConfig,
    destinationId: automation.destinationId,
    publish: automation.publish,
    frequency: automation.frequency,
    startDate: automation.startDate,
    startTime: automation.startTime,
    scheduleCron: automation.scheduleCron,
    timezone: automation.timezone,
    api,
  };
}

function queueAutomationFlush(id: string, set: StoreSet, get: StoreGet) {
  const running = pendingFlushes.get(id);
  if (running) clearTimeout(running);

  pendingFlushes.set(
    id,
    setTimeout(async () => {
      pendingFlushes.delete(id);

      const automation = get().automations.find((entry) => entry.id === id);
      // Deleted while the timer was running: nothing left to write.
      if (!automation) return;

      try {
        await backend.patchAutomation(id, toInput(automation, get().api));
        set({ automationSync: { pending: pendingFlushes.size > 0, error: null } });
      } catch (error) {
        set({
          automationSync: {
            pending: false,
            error: error instanceof Error ? error.message : "Could not save the campaign.",
          },
        });
      }
    }, FLUSH_DELAY_MS),
  );
}

export type ProjectStatus = "Planning" | "Drafting" | "Editing" | "Ready";

export type ProjectChapter = {
  id: string;
  title: string;
  status: "Done" | "In Progress" | "Not started";
  wordCount: number;
  content: string;
};

export type ResearchSource = {
  id: string;
  type: "file" | "link" | "youtube";
  value: string;
  label: string;
};

export type GenerationLog = {
  id: string;
  agent: string;
  message: string;
  status: "pending" | "success" | "error";
  timestamp: number;
};

export type GenerationStatus = {
  isGenerating: boolean;
  progress: number;
  logs: GenerationLog[];
  activeAgent: string;
  currentTask: string;
  startTime: number;
  isMinimized: boolean;
  pipelineTitle?: string;
  pipelineSubtitle?: string;
  sessionTokens?: number;
};

export type ProjectDesignSettings = {
  /** Font ids from src/lib/fonts.ts. */
  bodyFont: string;
  headingFont: string;
  h1Size: string;
  h2Size: string;
  h3Size: string;
  h4Size: string;
  pSize: string;
  lineHeight: string;
  paragraphBefore: string;
  paragraphAfter: string;
};

export type Project = {
  id: string;
  title: string;
  description: string;
  audience: string;
  tone: string;
  type: "ebook" | "rewrite";
  progress: number;
  status: ProjectStatus;
  updatedLabel: string;
  manuscript: string;
  coverAccent: string;
  /** Data URL for the cover art. Rendered as page one of the manuscript. */
  coverImage?: string;
  chapters: ProjectChapter[];
  blogTitle: string;
  blogDraft: string;
  metaDescription: string;
  seoKeywords: string[];
  researchSources: ResearchSource[];
  targetLength?: number;
  outlineDuration?: number;
  draftDuration?: number;
  tokensUsed?: number;
  designSettings?: ProjectDesignSettings;
  /** Marketplace listing state. Absent until the project is first published. */
  publish?: PublishState;
};

type CreateDraft = {
  vision: string;
  audience: string;
  length: number;
  tone: string;
  researchSources: ResearchSource[];
};

export type RewriteFlow = "Simple" | "Deep" | "Outline" | "Translate";

type RewriteState = {
  flow: RewriteFlow;
  manuscript: string;
  title: string;
  audience: string;
  tone: string;
  humanize: boolean;
  avoidPlagiarism: boolean;
  preview: string;
  length: number;
  translateProjectId: string;
  targetLanguage: string;
};

type OutlineChapter = {
  id: string;
  title: string;
  topics: string;
};

type OutlineGeneratorState = {
  title: string;
  audience: string;
  tone: string;
  targetLength: number;
  chapters: OutlineChapter[];
};

/** How a blog draft was started. "none" means the writer has not chosen yet,
 *  which is what puts the picker on screen instead of a half-filled editor. */
export type BlogSource = "none" | "blank" | "project" | "topic";

type BlogComposer = {
  source: BlogSource;
  /** Set for "project" drafts only. */
  projectId: string;
  /** Set for "topic" drafts only. */
  topic: string;
  title: string;
  draft: string;
  metaDescription: string;
  keywords: string[];
  suggestions: string[];
  targetWords: number;
  lastSavedLabel: string;
};

type ProfileState = {
  fullName: string;
  penName: string;
  tagline: string;
  email: string;
  website: string;
  bio: string;
  defaultTone: string;
  defaultLength: number;
  language: string;
  autoPunctuation: boolean;
  autoSave: boolean;
  avatarUrl?: string;
  coverUrl?: string;
};

type SettingsState = {
  defaultModel: string;
  creativeMode: boolean;
  longFormFocus: boolean;
  temperature: number;
  topP: number;
  fontSize: number;
};

type UsageState = {
  totalTokens: number;
  totalRequests: number;
  totalCost: number;
  inputTokenRate: number;
  outputTokenRate: number;
  timingHistory: {
    outlineDuration: number;
    draftDuration: number;
    wordCount: number;
  }[];
};

type AppStore = {
  projects: Project[];
  currentProjectId: string | null;
  activeChapterId: string | null;
  blog: BlogComposer;
  api: ApiSettings;
  platform: PlatformApiSettings;
  settings: SettingsState;
  profile: ProfileState;
  createDraft: CreateDraft;
  rewrite: RewriteState;
  generationStatus: GenerationStatus;
  usage: UsageState;
  isDarkMode: boolean;
  isGlobalSidebarCollapsed: boolean;
  isEditorSidebarCollapsed: boolean;
  isManuscriptFullView: boolean;
  outlineGenerator: OutlineGeneratorState;
  setCurrentProject: (projectId: string) => void;
  setActiveChapter: (chapterId: string) => void;
  updateCreateDraft: (payload: Partial<CreateDraft>) => void;
  createProjectFromDraft: () => Project;
  resetCreateDraft: () => void;
  updateRewrite: (payload: Partial<RewriteState>) => void;
  updateOutlineGenerator: (payload: Partial<OutlineGeneratorState>) => void;
  addOutlineChapter: () => void;
  removeOutlineChapter: (id: string) => void;
  updateOutlineChapter: (id: string, payload: Partial<OutlineChapter>) => void;
  importOutlineFromText: (text: string) => void;
  generateRewritePreview: () => void;
  applyRewriteToCurrentProject: () => void;
  createProjectFromRewrite: () => Project;
  loadBlogFromProject: (projectId: string) => void;
  startBlankBlog: () => void;
  startBlogFromTopic: (topic: string) => void;
  resetBlogSource: () => void;
  regenerateBlogSuggestions: () => void;
  updateBlog: (payload: Partial<BlogComposer>) => void;
  updateChapterContent: (content: string) => void;
  recordTiming: (outlineSecs: number, draftSecs: number, wordCount: number) => void;
  updateChapterContentById: (projectId: string, chapterId: string, content: string) => void;
  updateProjectDesign: (projectId: string, settings: ProjectDesignSettings) => void;
  setProjectCover: (projectId: string, dataUrl?: string) => void;
  deleteChapter: (projectId: string, chapterId: string) => void;
  addChapter: (projectId: string, title: string) => void;
  updateProfile: (payload: Partial<ProfileState>) => void;
  updateSettings: (payload: Partial<SettingsState>) => void;
  updateApiSettings: (payload: Partial<ApiSettings>) => void;
  updatePlatformApi: (payload: Partial<PlatformApiSettings>) => void;
  disconnectMarketplace: () => void;
  createApiToken: (label: string, scopes: ApiScope[]) => ApiToken;
  revokeApiToken: (tokenId: string) => void;
  deleteApiToken: (tokenId: string) => void;
  setProjectPublishState: (projectId: string, payload: Partial<PublishState>) => void;
  applyOptimization: (type: "cost" | "speed" | "quality") => void;
  addGeneratedProject: (payload: GeneratedProjectPayload) => Project;
  applyDraftToProject: (projectId: string, draftedProject: Partial<Project>) => void;

  deleteProject: (projectId: string) => void;
  finalizeProject: (projectId: string) => void;
  unfinalizeProject: (projectId: string) => void;
  startGeneration: (options?: { title?: string; subtitle?: string }) => void;
  addGenerationLog: (log: Omit<GenerationLog, "id" | "timestamp">) => string;
  updateGenerationLog: (id: string, payload: Partial<GenerationLog>) => void;
  setGenerationProgress: (progress: number) => void;
  finishGeneration: () => void;
  setActiveAgent: (agent: string) => void;
  setCurrentTask: (task: string) => void;
  recordUsage: (tokens: number, provider: string, model: string) => void;
  updateUsageRates: (inputRate: number, outputRate: number) => void;
  resetUsage: () => void;

  /* Campaign data lives in Appwrite, not in localStorage. What the store
     holds is a working copy: reads fill it from the server, edits change it
     immediately so typing stays responsive, and a debounced flush writes the
     result back. `automationSync` is what the UI shows while that happens. */
  automations: BlogAutomation[];
  automationDestinations: AutomationDestination[];
  campaignPosts: CampaignPost[];
  automationsLoaded: boolean;
  automationSync: AutomationSync;
  loadAutomationData: () => Promise<void>;
  createAutomation: (name: string) => Promise<BlogAutomation | null>;
  updateAutomation: (id: string, payload: Partial<BlogAutomation>) => void;
  deleteAutomation: (id: string) => Promise<void>;
  saveAutomationDestination: (
    destination: AutomationDestination,
  ) => Promise<AutomationDestination | null>;
  deleteAutomationDestination: (id: string) => Promise<void>;
  saveCampaignPost: (
    post: Omit<CampaignPost, "id" | "createdAt"> & { id?: string; createdAt?: string },
  ) => Promise<CampaignPost | null>;
  deleteCampaignPost: (id: string) => Promise<void>;
  updateCampaignPost: (id: string, patch: Partial<CampaignPost>) => void;
  loadCampaignPostToEditor: (postId: string) => void;
  addResearchSource: (source: Omit<ResearchSource, "id">) => void;
  removeResearchSource: (id: string) => void;
  toggleDarkMode: () => void;
  setMinimized: (minimized: boolean) => void;
  cancelGeneration: () => void;
  setCancelGeneration: (fn: () => void) => void;
  toggleGlobalSidebar: () => void;
  toggleEditorSidebar: () => void;
  setManuscriptFullView: (open: boolean) => void;

  /* Authentication & administration.

     Appwrite owns identity now, so none of this is persisted: the session
     lives in Appwrite's own cookie and is restored by `restoreSession` on
     boot. `authStatus` exists because "no user yet" and "not signed in" must
     look different to the route guard — persisting `currentUser` instead
     would keep showing a signed-in shell after the session had expired. */
  users: User[];
  currentUser: User | null;
  authStatus: AuthStatus;
  upgradeRequests: UpgradeRequest[];
  restoreSession: () => Promise<void>;
  login: (email: string, password: string) => Promise<AuthResult>;
  signup: (fullName: string, email: string, password: string) => Promise<AuthResult>;
  logout: () => Promise<void>;
  loadUsers: () => Promise<void>;
  adminUpdateUser: (userId: string, updates: Partial<User>) => Promise<AuthResult>;
  adminDeleteUser: (userId: string) => Promise<AuthResult>;
  adminAddUser: (
    user: Omit<User, "id" | "registeredAt"> & { password?: string },
  ) => Promise<AuthResult>;
  adminSetUserPlanAndFeatures: (
    userId: string,
    plan: UserPlan,
    features: UserFeatures,
  ) => Promise<AuthResult>;
  loadUpgradeRequests: () => Promise<void>;
  adminResolveUpgradeRequest: (requestId: string) => Promise<void>;
  requestFeatureUpgrade: (userId: string, feature: string) => Promise<AuthResult>;
};

const starterProjects: Project[] = [
  {
    id: "neon-labyrinth",
    title: "The Neon Labyrinth",
    description: "A high-tech mystery set inside a living archive.",
    audience: "Readers who enjoy speculative mysteries and fast-moving plots.",
    tone: "Storytelling",
    type: "ebook",
    progress: 60,
    status: "Drafting",
    updatedLabel: "2 hours ago",
    manuscript:
      "The library breathed like a machine with a memory. Every corridor held a secret, and every secret seemed to recognize Mara before she spoke.",
    coverAccent: "from-cyan-500 via-sky-500 to-indigo-600",
    chapters: [
      {
        id: "spark",
        title: "Chapter 1: The Spark",
        status: "Done",
        wordCount: 1240, // 1240 + 842 = 2082 total
        content:
          "<h2>Chapter 1: The Spark</h2><p>Mara learned long ago that silence in the archive never meant peace. It meant the system was listening.</p><p>By the time the emergency lights flickered on, the doors had already locked behind her.</p>",
      },
      {
        id: "canvas",
        title: "Chapter 2: Digital Canvas",
        status: "In Progress",
        wordCount: 842,
        content:
          "<h2>Chapter 2: Digital Canvas</h2><p>The map on the glass table shifted whenever Mara changed her breathing. She did not understand the technology, only the intimacy of its response.</p><p>Every route led back to a chamber the blueprints insisted did not exist.</p>",
      },
      {
        id: "co-creation",
        title: "Chapter 3: AI Co-Creation",
        status: "Not started",
        wordCount: 0,
        content: "<h2>Chapter 3: AI Co-Creation</h2><p>Start drafting this chapter...</p>",
      },
    ],
    blogTitle: "Inside The Neon Labyrinth: Building Tension in Speculative Mysteries",
    blogDraft:
      "Speculative mystery works best when the setting behaves like a character. In The Neon Labyrinth, the archive does more than hold information. It reacts, remembers, and quietly shapes the protagonist's choices.",
    metaDescription:
      "A behind-the-scenes look at how speculative settings create tension, mystery, and momentum for long-form fiction.",
    seoKeywords: ["speculative fiction", "mystery writing", "ebook creation"],
    researchSources: [],
  },
  {
    id: "market-velocity",
    title: "Market Velocity 2024",
    description: "A business ebook about operating systems for modern growth teams.",
    audience: "B2B founders and marketing leaders.",
    tone: "Professional",
    type: "ebook",
    progress: 85,
    status: "Editing",
    updatedLabel: "yesterday",
    manuscript:
      "The companies with the best momentum are not the loudest. They are the ones that align message, motion, and measurement.",
    coverAccent: "from-amber-500 via-orange-500 to-rose-500",
    chapters: [
      {
        id: "velocity-intro",
        title: "Chapter 1: Momentum Systems",
        status: "Done",
        wordCount: 2100, // 2100 + 1660 = 3760 total
        content:
          "<h2>Chapter 1: Momentum Systems</h2><p>Growth compounds when teams agree on the next decision before they agree on the next campaign.</p>",
      },
      {
        id: "velocity-playbooks",
        title: "Chapter 2: Operator Playbooks",
        status: "In Progress",
        wordCount: 1660,
        content:
          "<h2>Chapter 2: Operator Playbooks</h2><p>Playbooks should reduce ambiguity, not creativity. The best ones create space for speed.</p>",
      },
    ],
    blogTitle: "What High-Velocity Marketing Teams Do Differently",
    blogDraft:
      "Velocity comes from operational clarity. When strategy, copy, and analytics run in sync, teams spend less time debating and more time compounding results.",
    metaDescription:
      "Modern frameworks for scaling growth teams and optimizing market velocity in competitive environments.",
    seoKeywords: ["growth marketing", "b2b scaling", "marketing operations"],
    researchSources: [],
  },
  {
    id: "nature-ethics",
    title: "Nature Ethics",
    description: "A reflective manuscript on ecology, stewardship, and moral imagination.",
    audience: "Readers interested in philosophy, nature writing, and ethics.",
    tone: "Conversational",
    type: "rewrite",
    progress: 35,
    status: "Planning",
    updatedLabel: "3 days ago",
    manuscript:
      "We do not inherit the natural world as owners. We participate in it as temporary stewards whose choices echo forward.",
    coverAccent: "from-emerald-500 via-green-500 to-lime-500",
    chapters: [
      {
        id: "ethics-opening",
        title: "Chapter 1: A Living Obligation",
        status: "In Progress",
        wordCount: 9300, // Nature Ethics full count
        content:
          "<h2>Chapter 1: A Living Obligation</h2><p>Ethics becomes tangible when the forest is no longer scenery, but kin.</p>",
      },
    ],
    blogTitle: "Why Environmental Writing Needs Moral Imagination",
    blogDraft:
      "Strong environmental writing does not rely on fear alone. It offers readers a different relationship to responsibility, beauty, and consequence.",
    metaDescription:
      "A short essay on the relationship between ecology, language, and ethical imagination.",
    seoKeywords: ["nature writing", "ethics", "environmental essays"],
    researchSources: [],
  },
];

const defaultCreateDraft: CreateDraft = {
  vision: "",
  audience: "",
  length: 20000,
  tone: "Professional",
  researchSources: [],
};

const defaultRewrite: RewriteState = {
  flow: "Outline",
  manuscript: "",
  title: "",
  audience: "",
  tone: "Professional",
  humanize: true,
  avoidPlagiarism: true,
  preview: "",
  length: 20000,
  translateProjectId: "",
  targetLanguage: "Spanish",
};

const defaultOutlineGenerator: OutlineGeneratorState = {
  title: "",
  audience: "",
  tone: "Professional",
  targetLength: 15000,
  chapters: [],
};

/** The placeholder chapters older builds seeded, cleared once on migration. */
const SEEDED_OUTLINE_TITLES = [
  "Chapter 1: The Foundation",
  "Chapter 2: Strategy",
  "Next Chapter Title",
];

/** The exact placeholder outline older builds seeded into saves. Matching on the
 *  topics as well as the title means a chapter the author actually wrote is
 *  never mistaken for one of these. */
const SEEDED_OUTLINE_CHAPTERS: { title: string; topics: string }[] = [
  { title: "Chapter 1: The Foundation", topics: "Core concepts, problem statement, and goals." },
  { title: "Chapter 2: Strategy", topics: "Frameworks, execution steps, and case studies." },
  { title: "Next Chapter Title", topics: "Explain key concepts for this section..." },
];

const isSeededOutlineChapter = (chapter: OutlineChapter) =>
  SEEDED_OUTLINE_CHAPTERS.some(
    (seed) => seed.title === chapter.title && seed.topics === chapter.topics,
  ) ||
  chapter.title === "Next Chapter Title" ||
  chapter.topics === "Explain key concepts for this section...";

const defaultProfile: ProfileState = {
  fullName: "",
  penName: "",
  tagline: "",
  email: "",
  website: "",
  bio: "",
  defaultTone: "Professional",
  defaultLength: 25000,
  language: "English (India)",
  autoPunctuation: true,
  autoSave: true,
  avatarUrl: undefined,
  coverUrl: undefined,
};

const defaultSettings: SettingsState = {
  defaultModel: "GPT-4o (OpenAI)",
  creativeMode: true,
  longFormFocus: false,
  temperature: 0.75,
  topP: 0.9,
  fontSize: 20,
};

const defaultApiSettings: ApiSettings = {
  provider: "openai",
  apiKey: "",
  baseUrl: providerDefaults.openai.baseUrl,
  model: providerDefaults.openai.model,
  appName: "",
  siteUrl: "", // Initialize empty, will be set on client to avoid hydration/port mismatch
};

const defaultPlatformApi: PlatformApiSettings = {
  marketplaceEnabled: false,
  marketplaceBaseUrl: MARKETPLACE.defaultBaseUrl,
  marketplaceApiKey: "",
  sellerId: "",
  connectionState: "disconnected",
  connectionMessage: "",
  lastCheckedAt: null,
  seller: null,
  defaultPrice: 9.99,
  currency: "USD",
  defaultCategory: "Business & Money",
  defaultLicense: "standard",
  defaultFormats: ["epub", "pdf"],
  defaultVisibility: "draft",
  autoPublishOnReady: false,
  tokens: [],
  webhookUrl: "",
  webhookSecret: "",
};

const defaultGenerationStatus: GenerationStatus = {
  isGenerating: false,
  progress: 0,
  logs: [],
  activeAgent: "System",
  currentTask: "",
  startTime: 0,
  isMinimized: false,
  sessionTokens: 0,
};

const defaultUsage: UsageState = {
  totalTokens: 0,
  totalRequests: 0,
  totalCost: 0,
  inputTokenRate: 0.75,
  outputTokenRate: 0.75,
  timingHistory: [],
};

const createBlogSuggestions = (subject: string) => [
  `Why ${subject} Could Become Your Strongest Content Asset`,
  `How ${subject} Turns Long-Form Ideas Into Reach`,
  `Lessons From ${subject} For Smarter Editorial Strategy`,
];

const createProjectId = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `project-${Date.now()}`;

const buildRewrite = (text: string, tone: string, humanize: boolean, avoidPlagiarism: boolean) => {
  const cleanedText = text.trim() || "Your draft will appear here once you add content.";
  const intro =
    tone === "Academic & Technical"
      ? "This revised passage sharpens the argument, clarifies structure, and keeps the language precise."
      : tone === "Conversational & Friendly"
        ? "This refreshed passage keeps the same idea, but makes it warmer, clearer, and easier to follow."
        : "This revised passage strengthens authority, improves flow, and makes the message feel publication-ready.";

  const styleNotes = [
    humanize ? "Sentence rhythm now varies more naturally." : "Sentence rhythm remains close to the original.",
    avoidPlagiarism ? "The phrasing has been structurally reworked for stronger originality." : "The original structure is largely preserved.",
  ];

  return `${intro}\n\n${cleanedText}\n\n${styleNotes.join(" ")}`;
};

const contentToWordCount = (content: string) =>
  Math.max(0, content.replace(/<[^>]+>/g, " ").trim().split(/\s+/).filter(Boolean).length);

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      projects: starterProjects,
      currentProjectId: starterProjects[0].id,
      activeChapterId: starterProjects[0].chapters[1].id,
      createDraft: defaultCreateDraft,
      rewrite: defaultRewrite,
      blog: {
        source: "none",
        projectId: "",
        topic: "",
        title: "",
        draft: "",
        metaDescription: "",
        keywords: [],
        suggestions: [],
        targetWords: 1000,
        lastSavedLabel: "",
      },
      profile: defaultProfile,
      settings: defaultSettings,
      api: defaultApiSettings,
      platform: defaultPlatformApi,
      generationStatus: defaultGenerationStatus,
      usage: defaultUsage,
      isDarkMode: false,
      isGlobalSidebarCollapsed: false,
      isEditorSidebarCollapsed: false,
      isManuscriptFullView: false,
      outlineGenerator: defaultOutlineGenerator,
      // No seeded accounts: Appwrite is the register of users now. The admin
      // screen fills this from the Users API, and everyone else leaves it empty.
      users: [],
      currentUser: null,
      authStatus: "unknown",
      upgradeRequests: [],
      
      // Global abort mechanism (not persisted)
      cancelGeneration: () => {},
      setCancelGeneration: (fn) => set({ cancelGeneration: fn }),

      toggleDarkMode: () => set((state) => ({ isDarkMode: !state.isDarkMode })),
      toggleGlobalSidebar: () => set((state) => ({ isGlobalSidebarCollapsed: !state.isGlobalSidebarCollapsed })),
      toggleEditorSidebar: () => set((state) => ({ isEditorSidebarCollapsed: !state.isEditorSidebarCollapsed })),
      setManuscriptFullView: (open) => set({ isManuscriptFullView: open }),
      setCurrentProject: (projectId) => {
        const project = get().projects.find((entry) => entry.id === projectId);
        set({
          currentProjectId: projectId,
          activeChapterId: project?.chapters[0]?.id ?? "",
        });
      },
      setActiveChapter: (chapterId) => set({ activeChapterId: chapterId }),
      updateCreateDraft: (payload) =>
        set((state) => ({
          createDraft: { ...state.createDraft, ...payload },
        })),
      addResearchSource: (source) =>
        set((state) => ({
          createDraft: {
            ...state.createDraft,
            researchSources: [
              ...(state.createDraft.researchSources || []),
              { ...source, id: Math.random().toString(36).substring(7) },
            ],
          },
        })),
      removeResearchSource: (id) =>
        set((state) => ({
          createDraft: {
            ...state.createDraft,
            researchSources: (state.createDraft.researchSources || []).filter((s) => s.id !== id),
          },
        })),
      createProjectFromDraft: () => {
        const { createDraft, projects } = get();
        const title = createDraft.vision.trim().split(".")[0] || "Untitled Writerdost Project";
        const project: Project = {
          id: createProjectId(title),
          title,
          description: createDraft.vision || "A new ebook project drafted in Writerdost AI.",
          audience: createDraft.audience || "General readers",
          tone: createDraft.tone,
          type: "ebook",
          progress: 12,
          status: "Planning",
          updatedLabel: "just now",
          manuscript: createDraft.vision,
          coverAccent: "from-violet-500 via-fuchsia-500 to-pink-500",
          chapters: [
            {
              id: "outline",
              title: "Chapter 1: Working Outline",
              status: "In Progress",
              wordCount: Math.round(createDraft.length * 0.08),
              content: `<h2>Chapter 1: Working Outline</h2><p>${createDraft.vision || "Begin turning the concept into a first chapter."}</p><p>Target audience: ${createDraft.audience || "General readers"}.</p><p>Preferred tone: ${createDraft.tone}.</p>`,
            },
          ],
          blogTitle: `Why ${title} Matters Right Now`,
          blogDraft: `The strongest long-form ideas begin with a sharp premise. ${title} is being developed for ${createDraft.audience || "general readers"} with a ${createDraft.tone.toLowerCase()} voice.`,
          metaDescription: `An early look at ${title}, a developing ebook project created in Writerdost AI.`,
          seoKeywords: [title, createDraft.tone, "ebook writing"],
          researchSources: [...(createDraft.researchSources || [])],
          designSettings: {
            bodyFont: "inter",
            headingFont: "inter",
            h1Size: "48px",
            h2Size: "32px",
            h3Size: "24px",
            h4Size: "20px",
            pSize: "16px",
            lineHeight: "1.6",
            paragraphBefore: "0px",
            paragraphAfter: "12px",
          },
        };

        set({
          projects: [project, ...projects],
          currentProjectId: project.id,
          activeChapterId: project.chapters[0].id,
          createDraft: defaultCreateDraft,
        });

        return project;
      },
      addGeneratedProject: (payload) => {
        const { projects } = get();
        const title = payload.title?.trim() || "Untitled Writerdost Project";
        const chapters = payload.chapters ?? [];
        const manuscript = chapters.map((chapter) => chapter.content).join("\n\n");
        
        const mappedChapters: ProjectChapter[] = chapters.map((chapter, index) => ({
          id: `chapter-${index + 1}`,
          title: chapter.title,
          status: chapter.status,
          wordCount: chapter.wordCount || contentToWordCount(chapter.content),
          content: chapter.content,
        }));

        const project: Project = {
          id: createProjectId(title),
          title,
          description: payload.description,
          audience: payload.audience,
          tone: payload.tone,
          type: "ebook",
          progress: 25,
          status: "Planning",
          updatedLabel: "just now",
          targetLength: payload.targetLength || 10000,
          manuscript,
          coverAccent: "from-violet-500 via-fuchsia-500 to-pink-500",
          chapters: mappedChapters,
          blogTitle: payload.blogTitle,
          blogDraft: payload.blogDraft,
          metaDescription: payload.metaDescription || `Manuscript for ${title}.`,
          seoKeywords: [title, "AI writing"],
          researchSources: [],
          designSettings: {
            bodyFont: "inter",
            headingFont: "inter",
            h1Size: "48px",
            h2Size: "32px",
            h3Size: "24px",
            h4Size: "20px",
            pSize: "16px",
            lineHeight: "1.6",
            paragraphBefore: "0px",
            paragraphAfter: "12px",
          },
          outlineDuration: payload.outlineDuration,
          draftDuration: payload.draftDuration,
          tokensUsed: payload.tokensUsed,
        };

        set({
          projects: [project, ...projects],
          currentProjectId: project.id,
          activeChapterId: project.chapters[0]?.id ?? "",
          createDraft: defaultCreateDraft,
        });

        return project;
      },
      applyDraftToProject: (projectId, draftedProject) => {
        const { projects } = get();
        set({
          projects: projects.map((project) => {
            if (project.id === projectId) {
              const updatedProject = {
                ...project,
                ...draftedProject,
                progress: 80,
                status: "Editing" as ProjectStatus,
                updatedLabel: "just now",
              };
              return updatedProject;
            }
            return project;
          }),
        });
      },
      deleteChapter: (projectId, chapterId) => {
        const { projects, activeChapterId } = get();
        set({
          projects: projects.map((project) => {
            if (project.id !== projectId) return project;
            return {
              ...project,
              chapters: project.chapters.filter((ch) => ch.id !== chapterId),
              updatedLabel: "just now",
            };
          }),
        });

        // Ensure we switch to a different chapter if the active one was deleted
        if (activeChapterId === chapterId) {
          const project = get().projects.find((p) => p.id === projectId);
          if (project && project.chapters.length > 0) {
            set({ activeChapterId: project.chapters[0].id });
          } else {
            set({ activeChapterId: "" });
          }
        }
      },
      addChapter: (projectId, title) => {
        const { projects } = get();
        const newChapterId = Math.random().toString(36).substring(7);
        set({
          projects: projects.map((project) => {
            if (project.id !== projectId) return project;
            return {
              ...project,
              chapters: [
                ...project.chapters,
                {
                  id: newChapterId,
                  title,
                  content: "<p><em>Write content for " + title + " here...</em></p>",
                  status: "Not started",
                  wordCount: 0,
                },
              ],
              updatedLabel: "just now",
            };
          }),
        });
      },
      deleteProject: (projectId) => {
        const { projects, currentProjectId } = get();
        const remainingProjects = projects.filter((project) => project.id !== projectId);
        const fallbackProject = remainingProjects[0];

        set({
          projects: remainingProjects,
          currentProjectId:
            currentProjectId === projectId
              ? fallbackProject?.id ?? ""
              : currentProjectId,
          activeChapterId:
            currentProjectId === projectId
              ? fallbackProject?.chapters[0]?.id ?? ""
              : get().activeChapterId,
        });
      },
      finalizeProject: (projectId) => {
        const { projects } = get();
        set({
          projects: projects.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  status: "Ready",
                  progress: 100,
                  updatedLabel: "just now",
                }
              : project,
          ),
        });
      },
      unfinalizeProject: (projectId) => {
        const { projects } = get();
        set({
          projects: projects.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  status: "Drafting",
                  updatedLabel: "just now",
                }
              : project,
          ),
        });
      },
      resetCreateDraft: () => set({ createDraft: defaultCreateDraft }),
      updateRewrite: (payload) =>
        set((state) => ({
          rewrite: { ...state.rewrite, ...payload },
        })),
      updateOutlineGenerator: (payload) =>
        set((state) => ({
          outlineGenerator: { ...state.outlineGenerator, ...payload },
        })),
      addOutlineChapter: () => {
        const { outlineGenerator } = get();
        const newId = `ch-${Date.now()}`;
        set({
          outlineGenerator: {
            ...outlineGenerator,
            chapters: [
              ...outlineGenerator.chapters,
              { id: newId, title: "", topics: "" },
            ],
          },
        });
      },
      removeOutlineChapter: (id) => {
        const { outlineGenerator } = get();
        set({
          outlineGenerator: {
            ...outlineGenerator,
            chapters: outlineGenerator.chapters.filter((ch) => ch.id !== id),
          },
        });
      },
      updateOutlineChapter: (id, payload) => {
        const { outlineGenerator } = get();
        set({
          outlineGenerator: {
            ...outlineGenerator,
            chapters: outlineGenerator.chapters.map((ch) =>
              ch.id === id ? { ...ch, ...payload } : ch
            ),
          },
        });
      },
      importOutlineFromText: (text: string) => {
        const rawLines = text.split("\n").map((l) => l.trim());
        const lines = rawLines.filter(Boolean);
        if (lines.length === 0) return;

        const title = lines[0];
        let audience = "";
        const chapters: OutlineChapter[] = [];

        // Identify sections by keywords
        const descriptionIdx = rawLines.findIndex((l) => l.toUpperCase().includes("DESCRIPTION"));
        const learningIdx = rawLines.findIndex((l) => l.toUpperCase().includes("LEARNING ASPECTS"));
        const curriculumIdx = rawLines.findIndex((l) => l.toUpperCase().includes("CURRICULUM"));

        // Extract Audience/Description (more granularly)
        const audienceStartIdx = Math.min(
          descriptionIdx !== -1 ? descriptionIdx : Infinity,
          learningIdx !== -1 ? learningIdx : Infinity
        );

        if (audienceStartIdx !== Infinity) {
          const audienceEndIdx = curriculumIdx !== -1 ? curriculumIdx : rawLines.length;
          // Take content between keywords, excluding the keywords themselves if possible
          const contentLines = rawLines.slice(audienceStartIdx + 1, audienceEndIdx).filter(Boolean);
          audience = contentLines.join(" "); // Combine into a paragraph for the audience field
          if (audience.length > 500) audience = audience.slice(0, 497) + "...";
        }

        // Extract Curriculum (Chapters and Topics)
        if (curriculumIdx !== -1) {
          const curriculumLines = rawLines.slice(curriculumIdx + 1).filter(Boolean);
          let currentChapter: OutlineChapter | null = null;

          for (const line of curriculumLines) {
            // Pattern 1: Standalone chapter number (e.g. "1.")
            const isStandaloneNum = /^\d+\.?$/.test(line);
            // Pattern 2: Inline numbered title (e.g. "1. Delving into...")
            const inlineMatch = /^\d+\.\s*(.+)/.exec(line);
            // Pattern 3: Bullet points
            const isBullet = line.startsWith("*") || line.startsWith("-") || line.startsWith("•");

            if (isStandaloneNum) {
              // Skip the marker, title is usually on next line
              continue;
            }

            if (inlineMatch && !isBullet) {
              // Found a new chapter with an inline title
              if (currentChapter) chapters.push(currentChapter);
              currentChapter = {
                id: `import-${Date.now()}-${chapters.length}`,
                title: inlineMatch[1],
                topics: "",
              };
            } else if (!isBullet && line.length > 3) {
              // Found a new chapter (assuming non-bullet non-empty lines are titles)
              if (currentChapter) chapters.push(currentChapter);
              currentChapter = {
                id: `import-${Date.now()}-${chapters.length}`,
                title: line,
                topics: "",
              };
            } else if (currentChapter && isBullet) {
              // Found a topic bullet
              const topic = line.replace(/^[*-\s•]+/, "");
              currentChapter.topics += (currentChapter.topics ? "\n" : "") + topic;
            }
          }
          if (currentChapter) chapters.push(currentChapter);
        }

        set({
          outlineGenerator: {
            title: title || "Imported Project",
            audience: audience || "General Audience",
            tone: "Professional",
            targetLength: 20000,
            chapters: chapters.length > 0 ? chapters : get().outlineGenerator.chapters,
          },
        });
      },
      generateRewritePreview: () => {
        const { rewrite } = get();
        set({
          rewrite: {
            ...rewrite,
            preview: buildRewrite(
              rewrite.manuscript,
              rewrite.tone,
              rewrite.humanize,
              rewrite.avoidPlagiarism,
            ),
          },
        });
      },
      applyRewriteToCurrentProject: () => {
        const { currentProjectId, projects, rewrite } = get();
        const preview = (!rewrite.preview || rewrite.preview.startsWith("Your rewritten preview"))
          ? buildRewrite(rewrite.manuscript, rewrite.tone, rewrite.humanize, rewrite.avoidPlagiarism)
          : rewrite.preview;

        set({
          projects: projects.map((project) =>
            project.id === currentProjectId
              ? {
                  ...project,
                  manuscript: preview,
                  description: preview.slice(0, 160),
                  tone: rewrite.tone,
                  status: "Editing",
                  progress: Math.max(project.progress, 55),
                  updatedLabel: "just now",
                  chapters: project.chapters.map((chapter, index) =>
                    index === 0
                      ? {
                          ...chapter,
                          content: `<h2>${chapter.title}</h2><p>${preview.replace(/\n/g, "</p><p>")}</p>`,
                          wordCount: Math.max(chapter.wordCount, 180),
                          status: "In Progress",
                        }
                      : chapter,
                  ),
                }
              : project,
          ),
        });
      },
      createProjectFromRewrite: () => {
        const { rewrite, projects } = get();
        const title = rewrite.title.trim() || `Rewrite - ${new Date().toLocaleDateString()}`;
        const preview =
          rewrite.preview ||
          buildRewrite(rewrite.manuscript, rewrite.tone, rewrite.humanize, rewrite.avoidPlagiarism);
        
        const project: Project = {
          id: createProjectId(title),
          title,
          description: rewrite.manuscript.slice(0, 160),
          audience: rewrite.audience,
          tone: rewrite.tone,
          type: "rewrite",
          progress: 50,
          status: "Editing",
          updatedLabel: "just now",
          manuscript: preview,
          coverAccent: "from-emerald-500 via-teal-500 to-cyan-600",
          chapters: [
            {
              id: "revised-manuscript",
              title: "Revised Manuscript",
              status: "Done",
              wordCount: contentToWordCount(preview),
              content: preview.includes("<h") ? preview : `<h2>Revised Manuscript</h2><p>${preview.replace(/\n\n/g, "</p><p>")}</p>`,
            },
          ],
          blogTitle: `Inside ${title}: A Modern Revision`,
          blogDraft: `This project explores the transformation of ideas through professional rewriting. Optimized for ${rewrite.audience || "a broad audience"}.`,
          metaDescription: `A rewritten manuscript project titled ${title}.`,
          seoKeywords: [title, rewrite.tone, "rewriting", "content optimization"],
          researchSources: [],
        };

        set({
          projects: [project, ...projects],
          currentProjectId: project.id,
          activeChapterId: project.chapters[0].id,
          rewrite: defaultRewrite,
        });

        return project;
      },
      startBlankBlog: () =>
        set({
          blog: {
            source: "blank",
            projectId: "",
            topic: "",
            title: "",
            draft: "",
            metaDescription: "",
            keywords: [],
            suggestions: [],
            targetWords: 1000,
            lastSavedLabel: "",
          },
        }),

      startBlogFromTopic: (topic) => {
        const subject = topic.trim();
        if (!subject) return;
        set({
          blog: {
            source: "topic",
            projectId: "",
            topic: subject,
            title: "",
            draft: "",
            metaDescription: "",
            keywords: [],
            suggestions: createBlogSuggestions(subject),
            targetWords: 1000,
            lastSavedLabel: "",
          },
        });
      },

      /** Back to the picker. The draft is dropped, so the caller confirms first. */
      resetBlogSource: () =>
        set((state) => ({
          blog: { ...state.blog, source: "none", projectId: "", topic: "" },
        })),

      loadBlogFromProject: (projectId) => {
        const project = get().projects.find((entry) => entry.id === projectId);
        if (!project) return;

        set({
          blog: {
            source: "project",
            projectId,
            topic: "",
            title: project.blogTitle,
            draft: project.blogDraft,
            metaDescription: project.metaDescription,
            keywords: project.seoKeywords,
            suggestions: createBlogSuggestions(project.title),
            targetWords: 1000,
            lastSavedLabel: "just now",
          },
        });
      },
      regenerateBlogSuggestions: () => {
        const { blog, projects } = get();
        const project = projects.find((entry) => entry.id === blog.projectId);
        if (!project) return;

        set({
          blog: {
            ...blog,
            suggestions: [
              `${project.title}: 3 Lessons Worth Turning Into a Blog Post`,
              `From ${project.title} to Search-Ready Content`,
              `How ${project.title} Can Power Your Weekly Publishing Calendar`,
            ],
          },
        });
      },
      updateBlog: (payload) =>
        set((state) => ({
          blog: {
            ...state.blog,
            ...payload,
            lastSavedLabel: "just now",
          },
        })),
      updateChapterContent: (content) => {
        const { currentProjectId, activeChapterId, projects } = get();
        set({
          projects: projects.map((project) => {
            if (project.id === currentProjectId) {
              const newChapterCount = contentToWordCount(content);

              const newProject = {
                ...project,
                updatedLabel: "just now",
                status: "Drafting" as ProjectStatus,
                progress: Math.max(project.progress, 62),
                chapters: project.chapters.map((chapter) =>
                  chapter.id === activeChapterId
                    ? {
                        ...chapter,
                        content,
                        status: "In Progress" as const,
                        wordCount: newChapterCount,
                      }
                    : chapter,
                ),
              };
              return newProject;
            }
            return project;
          }),
        });
      },
      updateChapterContentById: (projectId, chapterId, content) => {
        const { projects } = get();
        set({
          projects: projects.map((project) => {
            if (project.id === projectId) {
              const newChapterCount = contentToWordCount(content);

              const newProject = {
                ...project,
                updatedLabel: "just now",
                status: "Drafting" as ProjectStatus,
                progress: Math.max(project.progress, 62),
                chapters: project.chapters.map((chapter) =>
                  chapter.id === chapterId
                    ? {
                        ...chapter,
                        content,
                        status: "In Progress" as const,
                        wordCount: newChapterCount,
                      }
                    : chapter,
                ),
              };
              return newProject;
            }
            return project;
          }),
        });
      },
      updateProjectDesign: (projectId, settings) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId ? { ...p, designSettings: settings } : p
          ),
        })),
      // `undefined` clears the cover. The value is a data URL, so the caller is
      // responsible for keeping it small enough to survive the storage quota.
      setProjectCover: (projectId, dataUrl) =>
        set((state) => ({
          projects: state.projects.map((p) =>
            p.id === projectId
              ? { ...p, coverImage: dataUrl, updatedLabel: "just now" }
              : p
          ),
        })),
      updateProfile: (payload) => {
        set((state) => {
          const currentUser = state.currentUser
            ? {
                ...state.currentUser,
                fullName: payload.fullName ?? state.currentUser.fullName,
                email: payload.email ?? state.currentUser.email,
              }
            : null;

          return {
            profile: { ...state.profile, ...payload },
            currentUser,
            users: currentUser
              ? state.users.map((user) =>
                  user.id === currentUser.id
                    ? { ...user, fullName: currentUser.fullName, email: currentUser.email }
                    : user,
                )
              : state.users,
          };
        });

        // Keep Appwrite's copy of the display name in step. The email is not
        // synced: Appwrite requires the account password to change it, which
        // this form does not ask for, so it stays profile metadata.
        if (payload.fullName !== undefined && get().currentUser) {
          void account()
            .updateName({ name: payload.fullName })
            .catch(() => {});
        }
      },

      /* ----------------------------------------------------------------
         Authentication, on Appwrite
         ---------------------------------------------------------------- */

      /**
       * Restores the session on boot.
       *
       * Appwrite keeps its own session cookie, so a reload asks it who the
       * caller is rather than trusting anything in localStorage. A failure
       * here is the ordinary "not signed in" case, not an error worth showing.
       */
      restoreSession: async () => {
        if (!appwriteBrowserConfigured()) {
          set({ authStatus: "anonymous", currentUser: null });
          return;
        }

        try {
          const me = toUser(await account().get());
          set({
            currentUser: me,
            authStatus: "authenticated",
            profile: { ...get().profile, fullName: me.fullName, email: me.email },
          });
        } catch {
          set({ currentUser: null, authStatus: "anonymous" });
        }
      },

      login: async (email, password) => {
        if (!appwriteBrowserConfigured()) {
          return { success: false, error: "Sign-in is unavailable: Appwrite is not configured." };
        }

        try {
          await account().createEmailPasswordSession({ email, password });
          const me = toUser(await account().get());

          set({
            currentUser: me,
            authStatus: "authenticated",
            profile: {
              ...get().profile,
              fullName: me.fullName,
              email: me.email,
              penName: get().profile.penName || me.fullName,
            },
          });
          return { success: true };
        } catch (error) {
          // Appwrite blocks a suspended account at the session call, so the
          // message it returns is already the right one to show.
          return { success: false, error: appwriteMessage(error, "Invalid email or password.") };
        }
      },

      signup: async (fullName, email, password) => {
        if (!appwriteBrowserConfigured()) {
          return { success: false, error: "Sign-up is unavailable: Appwrite is not configured." };
        }

        try {
          await account().create({ userId: "unique()", email, password, name: fullName });
          await account().createEmailPasswordSession({ email, password });
          // Plan and feature gates start at their defaults; an admin changes
          // them later through the Users API.
          await account().updatePrefs({ prefs: defaultPrefs() });

          const me = toUser(await account().get());
          set({
            currentUser: me,
            authStatus: "authenticated",
            profile: {
              ...get().profile,
              fullName: me.fullName,
              email: me.email,
              penName: me.fullName,
            },
          });
          return { success: true };
        } catch (error) {
          return { success: false, error: appwriteMessage(error, "Could not create the account.") };
        }
      },

      logout: async () => {
        try {
          await account().deleteSession({ sessionId: "current" });
        } catch {
          // Already gone server-side; clearing locally is still correct.
        }
        set({
          currentUser: null,
          authStatus: "anonymous",
          users: [],
          upgradeRequests: [],
          // Campaign data belongs to the account that just left.
          automations: [],
          automationDestinations: [],
          campaignPosts: [],
          automationsLoaded: false,
        });
      },

      /* ----------------------------------------------------------------
         Administration — every call is server-checked, see requireAdmin
         ---------------------------------------------------------------- */

      loadUsers: async () => {
        try {
          const response = await fetch("/api/admin/users", {
            headers: await backend.authHeaders(),
          });
          const body = await response.json();
          if (!response.ok) throw new Error(body.error || "Could not load users.");
          set({ users: body.users as User[] });
        } catch {
          // The admin screen renders an empty table rather than crashing.
          set({ users: [] });
        }
      },

      adminUpdateUser: async (userId, updates) => {
        const result = await backend.patchUser(userId, updates);
        if (result.user) {
          set((state) => ({
            users: state.users.map((user) => (user.id === userId ? result.user! : user)),
            currentUser:
              state.currentUser?.id === userId ? result.user! : state.currentUser,
          }));
        }
        return result.error ? { success: false, error: result.error } : { success: true };
      },

      adminDeleteUser: async (userId) => {
        const error = await backend.deleteUser(userId);
        if (error) return { success: false, error };
        set((state) => ({ users: state.users.filter((user) => user.id !== userId) }));
        return { success: true };
      },

      adminAddUser: async (payload) => {
        const result = await backend.createUser(payload);
        if (result.error) return { success: false, error: result.error };
        if (result.user) set((state) => ({ users: [...state.users, result.user!] }));
        return { success: true };
      },

      adminSetUserPlanAndFeatures: async (userId, plan, features) => {
        const result = await backend.patchUser(userId, { plan, allowedFeatures: features });
        if (result.user) {
          set((state) => ({
            users: state.users.map((user) => (user.id === userId ? result.user! : user)),
            currentUser:
              state.currentUser?.id === userId ? result.user! : state.currentUser,
          }));
        }
        return result.error ? { success: false, error: result.error } : { success: true };
      },

      loadUpgradeRequests: async () => {
        try {
          set({ upgradeRequests: await backend.fetchUpgradeRequests() });
        } catch {
          set({ upgradeRequests: [] });
        }
      },

      adminResolveUpgradeRequest: async (requestId) => {
        try {
          await backend.resolveUpgradeRequest(requestId);
          set((state) => ({
            upgradeRequests: state.upgradeRequests.map((request) =>
              request.id === requestId ? { ...request, status: "resolved" as const } : request,
            ),
          }));
        } catch {
          // Leave the row pending; the next load will show the truth.
        }
      },

      requestFeatureUpgrade: async (_userId, feature) => {
        try {
          const raised = await backend.raiseUpgradeRequest(feature);
          set((state) => ({
            upgradeRequests: state.upgradeRequests.some((request) => request.id === raised.id)
              ? state.upgradeRequests
              : [raised, ...state.upgradeRequests],
          }));
          return { success: true };
        } catch (error) {
          return {
            success: false,
            error: error instanceof Error ? error.message : "Could not send the request.",
          };
        }
      },

      updateSettings: (payload) =>
        set((state) => ({
          settings: { ...state.settings, ...payload },
        })),
      updateApiSettings: (payload) =>
        set((state) => ({
          api: {
            ...state.api,
            ...payload,
            ...(payload.provider
              ? {
                  baseUrl: payload.baseUrl ?? providerDefaults[payload.provider].baseUrl,
                  model: payload.model ?? (providerDefaults[payload.provider].model || ""),
                }
              : {}),
          },
        })),
      updatePlatformApi: (payload) =>
        set((state) => {
          // Any credential change invalidates the last verified connection, so
          // the publish button cannot stay enabled against a stale check.
          const touchesCredentials =
            ("marketplaceApiKey" in payload && payload.marketplaceApiKey !== state.platform.marketplaceApiKey) ||
            ("sellerId" in payload && payload.sellerId !== state.platform.sellerId) ||
            ("marketplaceBaseUrl" in payload && payload.marketplaceBaseUrl !== state.platform.marketplaceBaseUrl);

          return {
            platform: {
              ...state.platform,
              ...payload,
              ...(touchesCredentials && payload.connectionState === undefined
                ? { connectionState: "disconnected" as const, connectionMessage: "", seller: null, lastCheckedAt: null }
                : {}),
            },
          };
        }),
      disconnectMarketplace: () =>
        set((state) => ({
          platform: {
            ...state.platform,
            marketplaceApiKey: "",
            sellerId: "",
            connectionState: "disconnected",
            connectionMessage: "",
            seller: null,
            lastCheckedAt: null,
            marketplaceEnabled: false,
          },
        })),
      createApiToken: (label, scopes) => {
        const token: ApiToken = {
          id: `tok-${Date.now().toString(36)}`,
          label: label.trim() || "Untitled token",
          token: generateApiToken(),
          scopes,
          createdAt: new Date().toISOString(),
          lastUsedAt: null,
          revoked: false,
        };
        set((state) => ({ platform: { ...state.platform, tokens: [token, ...state.platform.tokens] } }));
        return token;
      },
      revokeApiToken: (tokenId) =>
        set((state) => ({
          platform: {
            ...state.platform,
            tokens: state.platform.tokens.map((item) =>
              item.id === tokenId ? { ...item, revoked: true } : item,
            ),
          },
        })),
      deleteApiToken: (tokenId) =>
        set((state) => ({
          platform: {
            ...state.platform,
            tokens: state.platform.tokens.filter((item) => item.id !== tokenId),
          },
        })),
      setProjectPublishState: (projectId, payload) =>
        set((state) => ({
          projects: state.projects.map((project) =>
            project.id === projectId
              ? {
                  ...project,
                  publish: {
                    status: "unpublished",
                    revision: 0,
                    ...project.publish,
                    ...payload,
                  },
                }
              : project,
          ),
        })),
      applyOptimization: (type) => {
        const { api, settings } = get();
        const newApi = { ...api };
        const newSettings = { ...settings };

        if (type === "cost") {
          newSettings.temperature = 0.5;
          newSettings.creativeMode = false;
          if (api.provider === "openai") newApi.model = "gpt-4o-mini";
          if (api.provider === "claude") newApi.model = "claude-3-haiku-20240307";
          if (api.provider === "gemini") newApi.model = "gemini-1.5-flash";
          if (api.provider === "openrouter") newApi.model = "google/gemini-2.0-flash-001";
        } else if (type === "speed") {
          newSettings.temperature = 0.1;
          newSettings.creativeMode = false;
          if (api.provider === "openai") newApi.model = "gpt-4o-mini";
          if (api.provider === "claude") newApi.model = "claude-3-haiku-20240307";
          if (api.provider === "gemini") newApi.model = "gemini-1.5-flash";
        } else if (type === "quality") {
          newSettings.temperature = 0.8;
          newSettings.creativeMode = true;
          if (api.provider === "openai") newApi.model = "gpt-4o";
          if (api.provider === "claude") newApi.model = "claude-3-5-sonnet-latest";
          if (api.provider === "gemini") newApi.model = "gemini-1.5-pro";
          if (api.provider === "openrouter") newApi.model = "anthropic/claude-3.5-sonnet";
        }

        set({ api: newApi, settings: newSettings });
      },
      startGeneration: (options) =>
        set((state) => ({
          generationStatus: {
            ...defaultGenerationStatus,
            isGenerating: true,
            startTime: Date.now(),
            pipelineTitle: options?.title,
            pipelineSubtitle: options?.subtitle,
            isMinimized: state.generationStatus.isMinimized,
            sessionTokens: 0,
          },
        })),
      addGenerationLog: (log) => {
        const id = Math.random().toString(36).substring(7);
        const newLog: GenerationLog = {
          ...log,
          id,
          timestamp: Date.now(),
        };
        set((state) => ({
          generationStatus: {
            ...state.generationStatus,
            logs: [...state.generationStatus.logs, newLog],
          },
        }));
        return id;
      },
      updateGenerationLog: (id, payload) =>
        set((state) => ({
          generationStatus: {
            ...state.generationStatus,
            logs: state.generationStatus.logs.map((log) =>
              log.id === id ? { ...log, ...payload } : log,
            ),
          },
        })),
      setGenerationProgress: (progress) =>
        set((state) => ({
          generationStatus: {
            ...state.generationStatus,
            progress,
          },
        })),
      /** Ends the run. `isMinimized` is left as it is on purpose: a run that
          finished while minimised is what the overlay reads to show its
          "finished" pill, and dismissing that pill is what clears the flag. */
      finishGeneration: () =>
        set((state) => ({
          generationStatus: {
            ...state.generationStatus,
            isGenerating: false,
          },
        })),
      setMinimized: (minimized) =>
        set((state) => ({
          generationStatus: {
            ...state.generationStatus,
            isMinimized: minimized,
          },
        })),
      setActiveAgent: (agent) =>
        set((state) => ({
          generationStatus: {
            ...state.generationStatus,
            activeAgent: agent,
          },
        })),
      setCurrentTask: (task) =>
        set((state) => ({
          generationStatus: {
            ...state.generationStatus,
            currentTask: task,
          },
        })),
      recordUsage: (tokens, provider, model) =>
        set((state) => {
          // Estimated cost per 1M tokens
          const rates: Record<string, number> = {
            "gpt-4o": 5.0,
            "gpt-4o-mini": 0.15,
            "gpt-4-turbo": 10.0,
            "claude-3-5-sonnet": 3.0,
            "claude-3-opus": 15.0,
            "claude-3-haiku": 0.25,
            "gemini-1.5-flash": 0.075,
            "gemini-1.5-pro": 1.25,
            "gemini-2.0-flash": 0.1,
            "deepseek-chat": 0.14,
            "deepseek-reasoner": 0.14,
          };

          // Sort candidates longest-first so a specific match (e.g. "gpt-4o-mini")
          // wins over a shorter prefix that's also a substring (e.g. "gpt-4o").
          const modelKey =
            Object.keys(rates)
              .sort((a, b) => b.length - a.length)
              .find((k) => model.toLowerCase().includes(k)) || "default";
          const ratePerMillion = rates[modelKey] || (provider === "ollama" || provider === "ollama_cloud" ? 0 : 0.75);
          const cost = (tokens / 1_000_000) * ratePerMillion;

          return {
            usage: {
              ...state.usage,
              totalTokens: state.usage.totalTokens + tokens,
              totalRequests: state.usage.totalRequests + 1,
              totalCost: state.usage.totalCost + cost,
            },
            generationStatus: {
              ...state.generationStatus,
              sessionTokens: (state.generationStatus.sessionTokens || 0) + tokens,
            }
          };
        }),
      recordTiming: (outlineSecs, draftSecs, wordCount) =>
        set((state) => ({
          usage: {
            ...state.usage,
            timingHistory: [
              ...(state.usage.timingHistory || []),
              { outlineDuration: outlineSecs, draftDuration: draftSecs, wordCount },
            ],
          },
        })),
      updateUsageRates: (inputRate, outputRate) =>
        set((state) => ({
          usage: {
            ...state.usage,
            inputTokenRate: inputRate,
            outputTokenRate: outputRate,
          },
        })),
      resetUsage: () => set({ usage: { ...defaultUsage, timingHistory: [] } }),

      automations: [],
      automationDestinations: [],
      campaignPosts: [],
      automationsLoaded: false,
      automationSync: { pending: false, error: null },

      loadAutomationData: async () => {
        if (!appwriteBrowserConfigured()) {
          set({ automationsLoaded: true });
          return;
        }

        try {
          // One round trip each, in parallel: the three lists are independent
          // and the screen needs all of them before it can render a campaign.
          const [automations, destinations, posts] = await Promise.all([
            backend.fetchAutomations(),
            backend.fetchDestinations(),
            backend.fetchPosts(),
          ]);

          set({
            automations: automations.map(fromWire),
            automationDestinations: destinations.map(destinationFromWire),
            campaignPosts: posts,
            automationsLoaded: true,
            automationSync: { pending: false, error: null },
          });
        } catch (error) {
          set({
            automationsLoaded: true,
            automationSync: {
              pending: false,
              error: error instanceof Error ? error.message : "Could not load campaigns.",
            },
          });
        }
      },

      createAutomation: async (name) => {
        const draft = {
          name: name.trim() || "Untitled campaign",
          enabled: false,
          sourceKind: "topic" as const,
          sourceConfig: { topics: [], maxPerRun: 1, minWords: 150 },
          contentConfig: {
            tone: "Professional",
            audience: "",
            targetWords: 1000,
            language: "English",
            keywords: [] as string[],
            citeSource: true,
          },
          destinationId: null,
          // Draft is the safe default: nothing reaches a live site unreviewed.
          publish: "draft" as const,
          frequency: "daily" as const,
          startDate: todayIso(),
          startTime: "09:00",
          scheduleCron: "0 9 * * *",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          api: get().api,
        };

        try {
          // Awaited rather than optimistic: the row's Appwrite id is what the
          // screen selects on, and inventing a temporary one would mean
          // reconciling it away a moment later.
          const created = fromWire(await backend.createAutomation(draft));
          set((state) => ({
            automations: [created, ...state.automations],
            automationSync: { pending: false, error: null },
          }));
          return created;
        } catch (error) {
          set({
            automationSync: {
              pending: false,
              error: error instanceof Error ? error.message : "Could not create the campaign.",
            },
          });
          return null;
        }
      },

      updateAutomation: (id, payload) => {
        set((state) => ({
          automations: state.automations.map((automation) => {
            if (automation.id !== id) return automation;
            const next = { ...automation, ...payload };
            // Frequency, date and time together define the cron, so any of the
            // three changing rewrites it. Custom keeps whatever was typed.
            const touchesSchedule =
              payload.frequency !== undefined ||
              payload.startDate !== undefined ||
              payload.startTime !== undefined;
            if (touchesSchedule && next.frequency !== "custom") {
              // A date input clears itself when given an impossible day such as
              // 31 September. Normalise here so the stored date and the derived
              // cron can never disagree about which day was meant.
              if (!next.startDate) next.startDate = todayIso();
              if (!next.startTime) next.startTime = "09:00";
              next.scheduleCron = cronForFrequency(next.frequency, next);
            }
            return next;
          }),
          automationSync: { pending: true, error: state.automationSync.error },
        }));

        // Every keystroke calls this, so the write is debounced rather than
        // sent per character.
        queueAutomationFlush(id, set, get);
      },

      deleteAutomation: async (id) => {
        const previous = get().automations;
        set((state) => ({
          automations: state.automations.filter((automation) => automation.id !== id),
          campaignPosts: (state.campaignPosts || []).filter((post) => post.automationId !== id),
        }));

        try {
          await backend.removeAutomation(id);
        } catch (error) {
          // Put it back: a delete that did not happen must not look like it did.
          set({
            automations: previous,
            automationSync: {
              pending: false,
              error: error instanceof Error ? error.message : "Could not delete the campaign.",
            },
          });
        }
      },

      saveAutomationDestination: async (destination) => {
        try {
          const saved = destinationFromWire(
            await backend.saveDestination({
              // A destination the browser invented has a local id; one loaded
              // from Appwrite has a real one. Only the latter is an update.
              id: get().automationDestinations.some((d) => d.id === destination.id)
                ? destination.id
                : undefined,
              name: destination.name,
              kind: destination.kind,
              config: destination.config,
            }),
          );

          set((state) => ({
            automationDestinations: state.automationDestinations.some((d) => d.id === saved.id)
              ? state.automationDestinations.map((d) => (d.id === saved.id ? saved : d))
              : [...state.automationDestinations, saved],
            automationSync: { pending: false, error: null },
          }));
          return saved;
        } catch (error) {
          set({
            automationSync: {
              pending: false,
              error: error instanceof Error ? error.message : "Could not save the destination.",
            },
          });
          return null;
        }
      },

      deleteAutomationDestination: async (id) => {
        set((state) => ({
          automationDestinations: state.automationDestinations.filter((d) => d.id !== id),
          automations: state.automations.map((automation) =>
            automation.destinationId === id ? { ...automation, destinationId: null } : automation,
          ),
        }));

        try {
          await backend.removeDestination(id);
        } catch (error) {
          set({
            automationSync: {
              pending: false,
              error: error instanceof Error ? error.message : "Could not delete the destination.",
            },
          });
        }
      },

      saveCampaignPost: async (post) => {
        try {
          const saved = await backend.savePost({ ...post, id: post.id });
          set((state) => {
            const current = state.campaignPosts || [];
            return {
              campaignPosts: current.some((entry) => entry.id === saved.id)
                ? current.map((entry) => (entry.id === saved.id ? saved : entry))
                : [saved, ...current],
            };
          });
          return saved;
        } catch (error) {
          set({
            automationSync: {
              pending: false,
              error: error instanceof Error ? error.message : "Could not save the post.",
            },
          });
          return null;
        }
      },

      deleteCampaignPost: async (id) => {
        const previous = get().campaignPosts || [];
        set((state) => ({
          campaignPosts: (state.campaignPosts || []).filter((post) => post.id !== id),
        }));

        try {
          await backend.removePost(id);
        } catch {
          set({ campaignPosts: previous });
        }
      },

      updateCampaignPost: (id, patch) => {
        set((state) => ({
          campaignPosts: (state.campaignPosts || []).map((post) =>
            post.id === id ? { ...post, ...patch } : post,
          ),
        }));

        const updated = (get().campaignPosts || []).find((post) => post.id === id);
        // Fire and forget: the local copy is already right, and a failed write
        // shows up the next time the list is loaded.
        if (updated) void backend.savePost(updated).catch(() => {});
      },

      loadCampaignPostToEditor: (postId) => {
        const post = (get().campaignPosts || []).find((p) => p.id === postId);
        if (!post) return;
        set({
          blog: {
            source: "blank",
            projectId: "",
            topic: post.title,
            title: post.title,
            draft: post.bodyMarkdown,
            metaDescription: post.metaDescription,
            keywords: post.keywords,
            suggestions: [],
            targetWords: post.quality?.wordCount || 1000,
            lastSavedLabel: "from campaign",
          },
        });
      },
    }),
    {
      name: "writerdost-app-store",
      version: 8,
      migrate: (persisted, fromVersion) => {
        const state = persisted as Partial<AppStore> | undefined;
        if (!state) return persisted as AppStore;

        // A hand-edited or partially written save can arrive with no version at
        // all, and `undefined < n` is false, which would skip every step below.
        const from = typeof fromVersion === "number" ? fromVersion : 0;

        // Ensure campaignPosts is always an array
        if (!Array.isArray(state.campaignPosts)) {
          state.campaignPosts = [];
        }

        // v0 seeded two placeholder chapters into every new outline. Drop them
        // if they are still untouched; keep anything the author edited or added.
        if (from < 1 && state.outlineGenerator?.chapters?.length) {
          const chapters = state.outlineGenerator.chapters;
          const isUntouchedSeed =
            chapters.length === SEEDED_OUTLINE_TITLES.length &&
            chapters.every((ch: OutlineChapter, i: number) => ch.title === SEEDED_OUTLINE_TITLES[i]);
          if (isUntouchedSeed) {
            state.outlineGenerator = { ...state.outlineGenerator, chapters: [] };
          }
        }

        // v1's cleanup only fired when the outline was a pristine two-chapter
        // seed, so anyone who had pressed "Add chapter" first kept the
        // placeholders for good. Drop the seeds wherever they sit, and leave
        // every chapter the author wrote or added alone.
        if (from < 3 && state.outlineGenerator?.chapters?.length) {
          const kept = state.outlineGenerator.chapters.filter(
            (chapter: OutlineChapter) => !isSeededOutlineChapter(chapter),
          );
          if (kept.length !== state.outlineGenerator.chapters.length) {
            state.outlineGenerator = { ...state.outlineGenerator, chapters: kept };
          }
        }

        // v4 added the blog source picker. A save from before it has no
        // `source`; infer one so a draft in progress opens where it left off
        // and only an untouched composer lands on the picker.
        if (from < 4 && state.blog) {
          const blog = state.blog as BlogComposer;
          if (!blog.source) {
            const hasWork = Boolean(blog.title?.trim() || blog.draft?.trim());
            blog.source = hasWork ? (blog.projectId ? "project" : "blank") : "none";
          }
          if (typeof blog.topic !== "string") blog.topic = "";
        }

        // v2 added the platform API block. An older save has no `platform` at
        // all, and a save written mid-development may be missing newer fields,
        // so fill from defaults either way rather than trusting the shape.
        if (from < 2) {
          state.platform = { ...defaultPlatformApi, ...(state.platform ?? {}) };
        }

        // v6 ensures no placeholder/seeded chapters exist at the beginning and
        // sets the default rewrite flow to "Outline" ("From outline").
        if (from < 6) {
          if (state.outlineGenerator?.chapters?.length) {
            const kept = state.outlineGenerator.chapters.filter(
              (chapter: OutlineChapter) => !isSeededOutlineChapter(chapter),
            );
            state.outlineGenerator = { ...state.outlineGenerator, chapters: kept };
          }
          if (state.rewrite && (state.rewrite.flow === "Simple" || !state.rewrite.flow)) {
            state.rewrite = { ...state.rewrite, flow: "Outline" };
          }
        }

        // v7 clears pre-filled sample content from input fields so they serve as placeholders
        if (from < 7) {
          if (state.profile) {
            if (state.profile.fullName === "Aniruddha Das") {
              state.profile.fullName = "";
            }
            if (state.profile.tagline === "Bestselling Sci-Fi & Technology Author") {
              state.profile.tagline = "";
            }
            if (state.profile.email === "aniruddha@example.com" || state.profile.email === "aniruddhadas@example.com") {
              state.profile.email = "";
            }
            if (state.profile.website === "www.julianthorne.com") {
              state.profile.website = "";
            }
            if (state.profile.bio?.includes("Julian Thorne is a visionary author")) {
              state.profile.bio = "";
            }
          }
          if (state.rewrite) {
            if (state.rewrite.manuscript?.includes("Paste an existing draft here")) {
              state.rewrite.manuscript = "";
            }
            if (state.rewrite.preview?.includes("Your rewritten preview will appear here")) {
              state.rewrite.preview = "";
            }
          }
          if (state.api?.appName === "Writerdost AI") {
            state.api.appName = "";
          }
        }

        // v8 moved accounts and campaigns to Appwrite. Drop what older saves
        // kept locally: a stale user would survive sign-out, and stale
        // campaigns would carry ids that no Appwrite row answers to.
        if (from < 8) {
          delete (state as Partial<AppStore>).currentUser;
          delete (state as Partial<AppStore>).users;
          delete (state as Partial<AppStore>).upgradeRequests;
          delete (state as Partial<AppStore>).automations;
          delete (state as Partial<AppStore>).automationDestinations;
          delete (state as Partial<AppStore>).campaignPosts;
        }

        return state as AppStore;
      },
      partialize: (state) => {
        // Three groups never reach localStorage:
        //
        //  - isManuscriptFullView is a transient view mode; reloading should
        //    land the author back in the chapter editor;
        //  - currentUser / authStatus / users / upgradeRequests belong to
        //    Appwrite. Persisting them would keep rendering a signed-in shell
        //    after the session expired, and would leave one person's account
        //    on disk for whoever opens the browser next;
        //  - automations, destinations and campaignPosts now live in Appwrite
        //    too. A stale copy here would flash the previous account's
        //    campaigns before the fetch replaced them.
        const {
          generationStatus,
          cancelGeneration,
          isManuscriptFullView,
          currentUser,
          authStatus,
          users,
          upgradeRequests,
          automations,
          automationDestinations,
          campaignPosts,
          automationsLoaded,
          automationSync,
          ...rest
        } = state;
        void generationStatus;
        void cancelGeneration;
        void isManuscriptFullView;
        void currentUser;
        void authStatus;
        void users;
        void upgradeRequests;
        void automations;
        void automationDestinations;
        void campaignPosts;
        void automationsLoaded;
        void automationSync;
        return rest;
      },
      storage: createJSONStorage(() => ({
        getItem: (name) => localStorage.getItem(name),
        removeItem: (name) => localStorage.removeItem(name),
        setItem: (name, value) => {
          try {
            localStorage.setItem(name, value);
          } catch (e) {
            if (
              e instanceof DOMException &&
              (e.code === 22 ||
                e.code === 1014 ||
                e.name === "QuotaExceededError" ||
                e.name === "NS_ERROR_DOM_QUOTA_REACHED")
            ) {
              console.error("Writerdost: LocalStorage quota exceeded. Data may not be saved.");
              // We could potentially prune old data here, but for now, we just prevent the crash
              // and alert the developer/user via console.
            } else {
              throw e;
            }
          }
        },
      })),
    },
  ),
);
