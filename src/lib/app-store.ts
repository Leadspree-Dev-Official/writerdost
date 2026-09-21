"use client";

import { create } from "zustand";
import { cronForFrequency, todayIso } from "./automation/schedule";
import {
  account,
  appwriteBrowserConfigured,
  appwriteMessage,
  clearAuthCache,
} from "@/lib/appwrite/client";
import { defaultPrefs, toUser } from "@/lib/auth/profile";
import * as backend from "./automation/client-api";
import type { AutomationWire, DestinationWire } from "./automation/wire";
import { DEFAULT_LANGUAGE } from "@/lib/languages";
import { buildCustomFont, loadGoogleFont, type FontOption } from "@/lib/fonts";
import { fetchWorkspace, pushWorkspace } from "@/lib/workspace/client";
import type { WorkspacePatch } from "@/lib/workspace/wire";
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
  /** The language the manuscript is written in. Absent on pre-language projects. */
  language?: string;
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
  /** The language the agents write the manuscript in. */
  language: string;
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

/** Where the account's workspace stands: loading it, ready, or failed. */
export type WorkspaceStatus = "idle" | "loading" | "ready" | "error";

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
  /** Google Fonts families the author added. Part of the workspace. */
  customFonts: FontOption[];
  addCustomFont: (familyName: string) => FontOption;
  removeCustomFont: (id: string) => void;

  /* The workspace lives in Appwrite; see openWorkspace below. These four are
     what the UI shows about that: the guard waits on `workspaceStatus`, and
     Settings reports the last save or the reason there wasn't one. */
  workspaceStatus: WorkspaceStatus;
  workspaceError: string;
  workspaceSaving: boolean;
  workspaceSavedAt: string;
  /** Flushes any pending edits now. Resolves once the server has them. */
  saveWorkspaceNow: (force?: boolean) => Promise<void>;

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

  /* Campaign data has its own Appwrite tables, separate from the workspace.
     What the store holds is a working copy: reads fill it from the server, edits change it
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

const defaultCreateDraft: CreateDraft = {
  vision: "",
  audience: "",
  length: 20000,
  tone: "Professional",
  language: DEFAULT_LANGUAGE,
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
  defaultPrice: 499,
  currency: "INR",
  defaultCategory: "Business & Startups",
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

const defaultBlog: BlogComposer = {
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

/* ------------------------------------------------------------------
   Account-scoped local workspace
   ------------------------------------------------------------------ */

/**
 * The slices that belong to one account and live only in this browser:
 * manuscripts, the work in flight, the pen name, the BYO AI key. This is what
 * a brand-new workspace looks like.
 */
function blankWorkspace() {
  return {
    projects: [],
    currentProjectId: "",
    activeChapterId: "",
    createDraft: defaultCreateDraft,
    rewrite: defaultRewrite,
    blog: defaultBlog,
    outlineGenerator: defaultOutlineGenerator,
    profile: defaultProfile,
    settings: defaultSettings,
    api: defaultApiSettings,
    platform: defaultPlatformApi,
    usage: defaultUsage,
    customFonts: [] as FontOption[],
  };
}

/**
 * Deletes anything earlier builds left in this browser.
 *
 * Up to this version the whole workspace — manuscripts, the pen name, the BYO
 * AI key — was kept in localStorage. It is in Appwrite now, and those keys are
 * both stale and the kind of thing that should not sit on a shared machine, so
 * they are removed on the first load after the upgrade.
 */
function purgeLegacyBrowserStorage(): void {
  if (typeof window === "undefined") return;
  try {
    const stale = Object.keys(localStorage).filter(
      (key) => key.startsWith("writerdost-app-store") || key === "writerdost_custom_fonts",
    );
    for (const key of stale) localStorage.removeItem(key);
  } catch {
    // Storage blocked by the browser. There is then nothing to clean up.
  }
}

/* ------------------------------------------------------------------
   Persistence
   ------------------------------------------------------------------

   The workspace lives in Appwrite, never on this machine. Nothing here
   touches localStorage: a manuscript written on a laptop opens on a phone,
   and a shared browser keeps nothing behind after sign-out.

   The shape of it:
     - `openWorkspace` loads the account's workspace on sign-in and clears the
       store on sign-out;
     - `scheduleSave` batches edits and writes them through /api/workspace
       after a pause in typing;
     - only what actually changed is sent. Manuscripts are compared one by one,
       so editing a chapter saves that book alone.
------------------------------------------------------------------ */

/** How long to wait after the last edit before saving. */
const SAVE_DEBOUNCE_MS = 1_200;

/**
 * The longest a change may sit unsaved. Some parts of the store tick on their
 * own — the generation log writes a line a second — and a pure debounce would
 * keep resetting itself for as long as that ran, so a save is forced once the
 * oldest pending change reaches this age.
 */
const SAVE_MAX_WAIT_MS = 6_000;

/** How long to wait before trying again after a failed save. */
const SAVE_RETRY_MS = 15_000;

/**
 * Manuscripts per request. A save that touched more than this (importing a
 * shelf, say) is sent in several passes rather than one request large enough
 * for the server to refuse.
 */
const PROJECTS_PER_SAVE = 25;

/** Which slices travel in the settings blob. Everything else is derived,
 *  transient, or owned by another store (campaigns, accounts). */
const SETTINGS_KEYS = [
  "currentProjectId",
  "activeChapterId",
  "createDraft",
  "rewrite",
  "blog",
  "outlineGenerator",
  "profile",
  "settings",
  "api",
  "platform",
  "usage",
  "customFonts",
  "isDarkMode",
  "isGlobalSidebarCollapsed",
  "isEditorSidebarCollapsed",
] as const;

type SaveState = {
  /** The account being saved for, or null when signed out. */
  userId: string | null;
  /** The settings blob as the server last confirmed it. */
  settings: string;
  /** Per-project JSON as the server last confirmed it, by project id. */
  projects: Map<string, string>;
  timer: ReturnType<typeof setTimeout> | null;
  /** When the oldest unsaved change arrived, for the max-wait above. */
  pendingSince: number;
  inFlight: Promise<void> | null;
  /** Set when a change lands while a save is already running. */
  again: boolean;
  unsubscribe: (() => void) | null;
};

const saveState: SaveState = {
  userId: null,
  settings: "",
  projects: new Map(),
  timer: null,
  pendingSince: 0,
  inFlight: null,
  again: false,
  unsubscribe: null,
};

function settingsSnapshot(state: AppStore): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {};
  for (const key of SETTINGS_KEYS) snapshot[key] = state[key];
  return snapshot;
}

/**
 * What has changed since the server last confirmed a save. `more` says that
 * the patch was capped and another pass is needed once this one lands.
 */
function pendingPatch(state: AppStore, force = false): { patch: WorkspacePatch; more: boolean } | null {
  const settingsJson = JSON.stringify(settingsSnapshot(state));
  const patch: WorkspacePatch = {};

  if (force || settingsJson !== saveState.settings) patch.settings = JSON.parse(settingsJson);

  const changed: Project[] = [];
  const live = new Set<string>();
  for (const project of state.projects) {
    live.add(project.id);
    const json = JSON.stringify(project);
    if (force || json !== saveState.projects.get(project.id)) changed.push(project);
  }

  const deleted = [...saveState.projects.keys()].filter((id) => !live.has(id));
  const more = changed.length > PROJECTS_PER_SAVE || deleted.length > PROJECTS_PER_SAVE;

  if (changed.length) patch.projects = changed.slice(0, PROJECTS_PER_SAVE);
  if (deleted.length) patch.deletedProjectIds = deleted.slice(0, PROJECTS_PER_SAVE);

  if (!patch.settings && !patch.projects && !patch.deletedProjectIds) return null;
  return { patch, more };
}

/** Records what the server now holds, so the next diff is against that. */
function markSaved(patch: WorkspacePatch) {
  if (patch.settings) saveState.settings = JSON.stringify(patch.settings);
  for (const project of patch.projects ?? []) {
    saveState.projects.set(project.id, JSON.stringify(project));
  }
  for (const id of patch.deletedProjectIds ?? []) saveState.projects.delete(id);
}

async function flushWorkspace({
  keepalive = false,
  force = false,
}: {
  keepalive?: boolean;
  force?: boolean;
} = {}): Promise<void> {
  const state = useAppStore.getState();

  // If uninitialized or in error state while a signed-in user is present, attempt reconnecting
  if ((!saveState.userId || state.workspaceStatus === "error") && state.currentUser?.id) {
    try {
      await fetchWorkspace();
      saveState.userId = state.currentUser.id;
      useAppStore.setState({ workspaceStatus: "ready", workspaceError: "" });
      startSync();
    } catch (error) {
      useAppStore.setState({
        workspaceStatus: "error",
        workspaceSaving: false,
        workspaceError: error instanceof Error ? error.message : "Could not connect to workspace cloud.",
      });
      return;
    }
  }

  if (!saveState.userId) return;
  if (saveState.inFlight) {
    // A save is already running; let it finish and pick the rest up after.
    saveState.again = true;
    return saveState.inFlight;
  }

  if (state.workspaceStatus !== "ready") return;

  saveState.pendingSince = 0;

  const pending = pendingPatch(state, force);
  if (!pending) {
    if (state.workspaceError) {
      useAppStore.setState({ workspaceError: "" });
    }
    return;
  }
  const { patch, more } = pending;

  useAppStore.setState({ workspaceSaving: true });

  // `fetch(..., { keepalive: true })` is capped at 64 KB of body, and a
  // manuscript is far past that. A payload that big is sent as an ordinary
  // request instead: the page is usually still alive long enough, and a
  // rejected keepalive would lose the edit outright.
  const body = JSON.stringify(patch);
  const canKeepAlive = keepalive && body.length < 60_000;

  const run = (async () => {
    try {
      const result = await pushWorkspace(patch as WorkspacePatch, { keepalive: canKeepAlive });
      markSaved(patch);
      useAppStore.setState({
        workspaceSaving: false,
        workspaceSavedAt: new Date().toISOString(),
        workspaceError: result.secretsDropped
          ? "Saved, but API keys were not: the server has no WRITERDOST_ENCRYPTION_KEY, so they are never written to the database."
          : "",
      });
    } catch (error) {
      // The edit stays in the store and in the diff, so it is still pending.
      // Nothing is written to this machine in the meantime, so the retry below
      // is the only thing standing between a dropped connection and lost work.
      useAppStore.setState({
        workspaceSaving: false,
        workspaceError:
          error instanceof Error ? error.message : "Could not save the workspace.",
      });
      if (saveState.userId && !saveState.timer) {
        saveState.timer = setTimeout(() => {
          saveState.timer = null;
          void flushWorkspace();
        }, SAVE_RETRY_MS);
      }
    } finally {
      saveState.inFlight = null;
    }
  })();

  saveState.inFlight = run;
  await run;

  if (saveState.again || more) {
    saveState.again = false;
    await flushWorkspace();
  }
}

function scheduleSave() {
  if (!saveState.userId) return;

  const now = Date.now();
  if (!saveState.pendingSince) saveState.pendingSince = now;

  if (saveState.timer) clearTimeout(saveState.timer);

  const wait = Math.min(SAVE_DEBOUNCE_MS, Math.max(0, saveState.pendingSince + SAVE_MAX_WAIT_MS - now));
  saveState.timer = setTimeout(() => {
    saveState.timer = null;
    void flushWorkspace();
  }, wait);
}

let windowHooksBound = false;

/** Starts watching the store for changes worth saving. */
function startSync() {
  saveState.unsubscribe?.();
  saveState.unsubscribe = useAppStore.subscribe(() => scheduleSave());

  if (typeof window !== "undefined" && !windowHooksBound) {
    windowHooksBound = true;
    // A tab can close between the last keystroke and the debounce firing.
    // `keepalive` lets that final write outlive the page.
    window.addEventListener("pagehide", () => void flushWorkspace({ keepalive: true }));
    // Switching tabs is not a close, so this one can be an ordinary request.
    document.addEventListener("visibilitychange", () => {
      if (document.visibilityState === "hidden") void flushWorkspace();
    });
  }
}

function stopSync() {
  saveState.unsubscribe?.();
  saveState.unsubscribe = null;
  if (saveState.timer) clearTimeout(saveState.timer);
  saveState.timer = null;
  saveState.pendingSince = 0;
  saveState.userId = null;
  saveState.settings = "";
  saveState.projects.clear();
}

/**
 * Loads one account's workspace, or clears the store on sign-out.
 *
 * Call it before flipping `authStatus`, so the app never renders a signed-in
 * shell over the previous account's manuscripts. Anything still unsaved from
 * the outgoing account is flushed first.
 */
async function openWorkspace(userId: string | null): Promise<void> {
  if (saveState.userId && saveState.userId !== userId) await flushWorkspace();
  if (saveState.userId === userId && userId) return;

  stopSync();

  if (!userId) {
    useAppStore.setState({
      ...blankWorkspace(),
      workspaceStatus: "idle",
      workspaceError: "",
      workspaceSaving: false,
      workspaceSavedAt: "",
    });
    return;
  }

  useAppStore.setState({ workspaceStatus: "loading", workspaceError: "" });

  try {
    const snapshot = await fetchWorkspace();
    const saved = (snapshot.settings ?? {}) as Partial<AppStore>;

    if (saved.platform) {
      if (!saved.platform.currency || (saved.platform.currency === "USD" && saved.platform.defaultPrice === 9.99)) {
        saved.platform = {
          ...saved.platform,
          currency: "INR",
          defaultPrice: 499,
        };
      }
    }

    // Defaults first, then whatever was saved: a workspace written by an older
    // build simply has fewer keys, and the missing ones keep their defaults.
    useAppStore.setState({
      ...blankWorkspace(),
      ...saved,
      projects: snapshot.projects as Project[],
      workspaceStatus: "ready",
      workspaceError: "",
      workspaceSaving: false,
      workspaceSavedAt: snapshot.existed ? new Date().toISOString() : "",
    });

    saveState.userId = userId;
    // The baseline is what the server just handed back, so an untouched
    // workspace saves nothing at all.
    saveState.settings = JSON.stringify(settingsSnapshot(useAppStore.getState()));
    saveState.projects = new Map(
      (snapshot.projects as Project[]).map((project) => [project.id, JSON.stringify(project)]),
    );
    startSync();
  } catch (error) {
    // Failing to load must not look like an empty workspace, or the first
    // autosave would overwrite real work with nothing.
    useAppStore.setState({
      ...blankWorkspace(),
      workspaceStatus: "error",
      workspaceError:
        error instanceof Error ? error.message : "Could not load your workspace.",
    });
  }
}

export const useAppStore = create<AppStore>()((set, get) => ({
    projects: [],
    currentProjectId: "",
    activeChapterId: "",
    createDraft: defaultCreateDraft,
    rewrite: defaultRewrite,
    blog: defaultBlog,
    profile: defaultProfile,
    settings: defaultSettings,
    api: defaultApiSettings,
    platform: defaultPlatformApi,
    generationStatus: defaultGenerationStatus,
    usage: defaultUsage,
    isDarkMode: typeof window !== "undefined"
      ? (localStorage.getItem("writerdost_theme") === "dark" || (!localStorage.getItem("writerdost_theme") && window.matchMedia("(prefers-color-scheme: dark)").matches))
      : false,
    isGlobalSidebarCollapsed: false,
    isEditorSidebarCollapsed: false,
    isManuscriptFullView: false,
    outlineGenerator: defaultOutlineGenerator,
    customFonts: [],

    /* The workspace is loaded from Appwrite by openWorkspace() and saved back
       on a debounce. Nothing below is written to this machine. */
    workspaceStatus: "idle",
    workspaceError: "",
    workspaceSaving: false,
    workspaceSavedAt: "",
    saveWorkspaceNow: (force?: boolean) => flushWorkspace({ force: force ?? true }),

    addCustomFont: (familyName) => {
      const font = buildCustomFont(familyName);
      set((state) => ({
        customFonts: [...state.customFonts.filter((entry) => entry.id !== font.id), font],
      }));
      loadGoogleFont(font.family);
      return font;
    },
    removeCustomFont: (id) =>
      set((state) => ({ customFonts: state.customFonts.filter((font) => font.id !== id) })),
    // No seeded accounts: Appwrite is the register of users now. The admin
    // screen fills this from the Users API, and everyone else leaves it empty.
    users: [],
    currentUser: null,
    authStatus: "unknown",
    upgradeRequests: [],
    
    // Global abort mechanism (not persisted)
    cancelGeneration: () => {},
    setCancelGeneration: (fn) => set({ cancelGeneration: fn }),

    toggleDarkMode: () => set((state) => {
      const next = !state.isDarkMode;
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem("writerdost_theme", next ? "dark" : "light");
        } catch {}
      }
      return { isDarkMode: next };
    }),
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
        language: createDraft.language || DEFAULT_LANGUAGE,
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
        language: payload.language || DEFAULT_LANGUAGE,
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
        // Before authStatus flips, so the shell never paints over someone
        // else's manuscripts.
        await openWorkspace(me.id);
        set({
          currentUser: me,
          authStatus: "authenticated",
          profile: { ...get().profile, fullName: me.fullName, email: me.email },
        });
      } catch {
        await openWorkspace(null);
        set({ currentUser: null, authStatus: "anonymous" });
      }
    },

    login: async (email, password) => {
      if (!appwriteBrowserConfigured()) {
        return { success: false, error: "Sign-in is unavailable: Appwrite is not configured." };
      }

      try {
        await account().createEmailPasswordSession({ email, password });
        // A token minted for whoever was signed in before must not be reused.
        clearAuthCache();
        const me = toUser(await account().get());
        await openWorkspace(me.id);

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
        clearAuthCache();
        // Plan and feature gates start at their defaults; an admin changes
        // them later through the Users API.
        await account().updatePrefs({ prefs: defaultPrefs() });

        const me = toUser(await account().get());
        // A new account gets a new workspace, never the last signer-in's.
        await openWorkspace(me.id);

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
      // Anything still pending belongs to the account on its way out, so it is
      // written before the session goes.
      await get().saveWorkspaceNow();

      try {
        await account().deleteSession({ sessionId: "current" });
      } catch {
        // Already gone server-side; clearing locally is still correct.
      }
      clearAuthCache();

      // Back to an empty shell. The account's workspace stays in Appwrite, so
      // signing in again brings it back — on this device or any other.
      await openWorkspace(null);

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
          "gpt-oss": 0,
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
}));

// One-time cleanup of the pre-Appwrite localStorage workspace. Runs on import
// so it happens whether the visitor signs in or not.
purgeLegacyBrowserStorage();
