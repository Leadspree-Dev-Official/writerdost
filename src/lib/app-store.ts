"use client";

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { providerDefaults } from "@/lib/ai-providers";
import { MARKETPLACE, generateApiToken } from "@/lib/marketplace";
import type {
  ApiScope,
  BlogAutomation,
  AutomationDestination,
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

type BlogComposer = {
  projectId: string;
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

  automations: BlogAutomation[];
  automationDestinations: AutomationDestination[];
  createAutomation: (name: string) => BlogAutomation;
  updateAutomation: (id: string, payload: Partial<BlogAutomation>) => void;
  deleteAutomation: (id: string) => void;
  saveAutomationDestination: (destination: AutomationDestination) => void;
  deleteAutomationDestination: (id: string) => void;
  addResearchSource: (source: Omit<ResearchSource, "id">) => void;
  removeResearchSource: (id: string) => void;
  toggleDarkMode: () => void;
  setMinimized: (minimized: boolean) => void;
  cancelGeneration: () => void;
  setCancelGeneration: (fn: () => void) => void;
  toggleGlobalSidebar: () => void;
  toggleEditorSidebar: () => void;
  setManuscriptFullView: (open: boolean) => void;

  // Authentication & Admin State
  users: User[];
  currentUser: User | null;
  upgradeRequests: UpgradeRequest[];
  login: (email: string, password: string) => { success: boolean; error?: string };
  signup: (fullName: string, email: string, password: string) => { success: boolean; error?: string };
  logout: () => void;
  adminUpdateUser: (userId: string, updates: Partial<User>) => void;
  adminDeleteUser: (userId: string) => void;
  adminAddUser: (user: Omit<User, "id" | "registeredAt">) => { success: boolean; error?: string };
  adminSetUserPlanAndFeatures: (userId: string, plan: UserPlan, features: UserFeatures) => void;
  adminResolveUpgradeRequest: (requestId: string) => void;
  requestFeatureUpgrade: (userId: string, feature: string) => { success: boolean; error?: string };
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
  flow: "Simple",
  manuscript:
    "Paste an existing draft here, or load a recent manuscript to generate a more polished rewrite.",
  title: "",
  audience: "",
  tone: "Professional",
  humanize: true,
  avoidPlagiarism: true,
  preview: "Your rewritten preview will appear here after generation.",
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
const SEEDED_OUTLINE_TITLES = ["Chapter 1: The Foundation", "Chapter 2: Strategy"];

const defaultProfile: ProfileState = {
  fullName: "Aniruddha Das",
  penName: "",
  tagline: "Bestselling Sci-Fi & Technology Author",
  email: "aniruddha@example.com",
  website: "www.julianthorne.com",
  bio: "Julian Thorne is a visionary author exploring the intersection of human consciousness and artificial intelligence. With over a decade of experience in speculative fiction, Julian's works have been translated into 14 languages.",
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
  appName: "Writerdost AI",
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

const createBlogSuggestions = (projectTitle: string) => [
  `Why ${projectTitle} Could Become Your Strongest Content Asset`,
  `How ${projectTitle} Turns Long-Form Ideas Into Reach`,
  `Lessons From ${projectTitle} For Smarter Editorial Strategy`,
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
        projectId: starterProjects[0].id,
        title: starterProjects[0].blogTitle,
        draft: starterProjects[0].blogDraft,
        metaDescription: starterProjects[0].metaDescription,
        keywords: starterProjects[0].seoKeywords,
        suggestions: createBlogSuggestions(starterProjects[0].title),
        targetWords: 1000,
        lastSavedLabel: "2 minutes ago",
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
      users: [
        {
          id: "admin-id-1",
          fullName: "Super Admin",
          email: "admin@leadspree.com",
          role: "admin",
          status: "active",
          registeredAt: new Date(2026, 6, 1).toISOString(),
          password: "admin123",
          plan: "Enterprise",
          allowedFeatures: {
            createEbook: true,
            rewriteEbook: true,
            blogGenerator: true,
            advancedModels: true
          }
        },
        {
          id: "julian-id-1",
          fullName: "Julian Thorne",
          email: "julian@example.com",
          role: "user",
          status: "active",
          registeredAt: new Date(2026, 6, 8).toISOString(),
          password: "password",
          plan: "Pro",
          allowedFeatures: {
            createEbook: true,
            rewriteEbook: true,
            blogGenerator: true,
            advancedModels: false
          }
        }
      ],
      currentUser: null,
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
        const preview = rewrite.preview.startsWith("Your rewritten preview")
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
        const preview = rewrite.preview;
        
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
      loadBlogFromProject: (projectId) => {
        const project = get().projects.find((entry) => entry.id === projectId);
        if (!project) return;

        set({
          blog: {
            projectId,
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
      updateProfile: (payload) =>
        set((state) => {
          const updatedProfile = { ...state.profile, ...payload };
          
          let updatedCurrentUser = state.currentUser;
          let updatedUsers = state.users;
          
          if (state.currentUser) {
            updatedCurrentUser = {
              ...state.currentUser,
              fullName: payload.fullName ?? state.currentUser.fullName,
              email: payload.email ?? state.currentUser.email,
            };
            
            updatedUsers = state.users.map((u) => 
              u.id === state.currentUser!.id
                ? { ...u, fullName: updatedCurrentUser!.fullName, email: updatedCurrentUser!.email }
                : u
            );
          }
          
          return {
            profile: updatedProfile,
            currentUser: updatedCurrentUser,
            users: updatedUsers
          };
        }),
      login: (email, password) => {
        const { users } = get();
        const user = users.find((u) => u.email.toLowerCase() === email.toLowerCase());
        if (!user) {
          return { success: false, error: "Invalid email or password." };
        }
        if (user.password !== password) {
          return { success: false, error: "Invalid email or password." };
        }
        if (user.status === "suspended") {
          return { success: false, error: "Your account is suspended. Please contact support." };
        }
        
        set({ 
          currentUser: user,
          profile: {
            ...get().profile,
            fullName: user.fullName,
            email: user.email,
            penName: user.role === 'admin' ? 'LeadSpree Admin' : user.fullName
          }
        });
        return { success: true };
      },
      signup: (fullName, email, password) => {
        const { users } = get();
        if (users.some((u) => u.email.toLowerCase() === email.toLowerCase())) {
          return { success: false, error: "An account with this email already exists." };
        }
        const newUser: User = {
          id: Math.random().toString(36).substring(7),
          fullName,
          email,
          role: "user",
          status: "active",
          registeredAt: new Date().toISOString(),
          password,
          plan: "Basic",
          allowedFeatures: {
            createEbook: true,
            rewriteEbook: false,
            blogGenerator: false,
            advancedModels: false
          }
        };
        
        set({
          users: [...users, newUser],
          currentUser: newUser,
          profile: {
            ...get().profile,
            fullName: newUser.fullName,
            email: newUser.email,
            penName: newUser.fullName
          }
        });
        return { success: true };
      },
      logout: () => {
        set({ currentUser: null });
      },
      adminUpdateUser: (userId, updates) => {
        const { users, currentUser } = get();
        const updatedUsers = users.map((user) => 
          user.id === userId ? { ...user, ...updates } : user
        );
        
        let updatedCurrentUser = currentUser;
        if (currentUser && currentUser.id === userId) {
          if (updates.status === "suspended") {
            updatedCurrentUser = null;
          } else {
            updatedCurrentUser = { ...currentUser, ...updates };
          }
        }
        
        set({ users: updatedUsers, currentUser: updatedCurrentUser });
      },
      adminDeleteUser: (userId) => {
        const { users, currentUser } = get();
        if (currentUser && currentUser.id === userId) return;
        
        set({ users: users.filter((u) => u.id !== userId) });
      },
      adminAddUser: (userPayload) => {
        const { users } = get();
        if (users.some((u) => u.email.toLowerCase() === userPayload.email.toLowerCase())) {
          return { success: false, error: "A user with this email already exists." };
        }
        const plan = userPayload.plan || "Basic";
        const defaultFeatures: UserFeatures = {
          createEbook: true,
          rewriteEbook: plan === "Pro" || plan === "Enterprise",
          blogGenerator: plan === "Pro" || plan === "Enterprise",
          advancedModels: plan === "Enterprise",
        };
        const newUser: User = {
          ...userPayload,
          plan,
          allowedFeatures: userPayload.allowedFeatures || defaultFeatures,
          id: Math.random().toString(36).substring(7),
          registeredAt: new Date().toISOString(),
        } as User;
        set({ users: [...users, newUser] });
        return { success: true };
      },
      adminSetUserPlanAndFeatures: (userId, plan, features) => {
        const { users, currentUser } = get();
        const updatedUsers = users.map((user) => 
          user.id === userId ? { ...user, plan, allowedFeatures: features } : user
        );
        
        let updatedCurrentUser = currentUser;
        if (currentUser && currentUser.id === userId) {
          updatedCurrentUser = { ...currentUser, plan, allowedFeatures: features };
        }
        
        set({ users: updatedUsers, currentUser: updatedCurrentUser });
      },
      adminResolveUpgradeRequest: (requestId) => {
        const { upgradeRequests } = get();
        const updatedRequests = upgradeRequests.map((req) => 
          req.id === requestId ? { ...req, status: 'resolved' as const } : req
        );
        set({ upgradeRequests: updatedRequests });
      },
      requestFeatureUpgrade: (userId, feature) => {
        const { users, upgradeRequests } = get();
        const user = users.find((u) => u.id === userId);
        if (!user) {
          return { success: false, error: "User not found." };
        }
        
        const hasPending = upgradeRequests.some(
          (req) => req.userId === userId && req.feature === feature && req.status === "pending"
        );
        if (hasPending) {
          return { success: true };
        }

        const newRequest: UpgradeRequest = {
          id: Math.random().toString(36).substring(7),
          userId,
          userEmail: user.email,
          userName: user.fullName,
          feature,
          timestamp: new Date().toISOString(),
          status: "pending",
        };

        set({ upgradeRequests: [...upgradeRequests, newRequest] });
        return { success: true };
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
      finishGeneration: () =>
        set((state) => ({
          generationStatus: {
            ...state.generationStatus,
            isGenerating: false,
            isMinimized: false,
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

      createAutomation: (name) => {
        const automation: BlogAutomation = {
          id: `auto-${Date.now().toString(36)}`,
          name: name.trim() || "Untitled automation",
          enabled: false,
          sourceKind: "topic",
          sourceConfig: { topics: [], maxPerRun: 1, minWords: 150 },
          contentConfig: {
            tone: "Professional",
            audience: "",
            targetWords: 1000,
            language: "English",
            keywords: [],
            citeSource: true,
          },
          destinationId: null,
          // Draft is the safe default: nothing reaches a live site unreviewed.
          publish: "draft",
          scheduleCron: "0 9 * * *",
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC",
          createdAt: new Date().toISOString(),
        };
        set((state) => ({ automations: [automation, ...state.automations] }));
        return automation;
      },

      updateAutomation: (id, payload) =>
        set((state) => ({
          automations: state.automations.map((a) => (a.id === id ? { ...a, ...payload } : a)),
        })),

      deleteAutomation: (id) =>
        set((state) => ({ automations: state.automations.filter((a) => a.id !== id) })),

      saveAutomationDestination: (destination) =>
        set((state) => {
          const exists = state.automationDestinations.some((d) => d.id === destination.id);
          return {
            automationDestinations: exists
              ? state.automationDestinations.map((d) => (d.id === destination.id ? destination : d))
              : [...state.automationDestinations, destination],
          };
        }),

      deleteAutomationDestination: (id) =>
        set((state) => ({
          automationDestinations: state.automationDestinations.filter((d) => d.id !== id),
          automations: state.automations.map((a) =>
            a.destinationId === id ? { ...a, destinationId: null } : a,
          ),
        })),
    }),
    {
      name: "writerdost-app-store",
      version: 2,
      migrate: (persisted, fromVersion) => {
        const state = persisted as Partial<AppStore> | undefined;
        if (!state) return persisted as AppStore;

        // A hand-edited or partially written save can arrive with no version at
        // all, and `undefined < n` is false, which would skip every step below.
        const from = typeof fromVersion === "number" ? fromVersion : 0;

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

        // v2 added the platform API block. An older save has no `platform` at
        // all, and a save written mid-development may be missing newer fields,
        // so fill from defaults either way rather than trusting the shape.
        if (from < 2) {
          state.platform = { ...defaultPlatformApi, ...(state.platform ?? {}) };
        }

        return state as AppStore;
      },
      partialize: (state) => {
        // isManuscriptFullView is a transient view mode; reloading should land
        // the author back in the chapter editor.
        // eslint-disable-next-line @typescript-eslint/no-unused-vars -- omit-by-destructuring
        const { generationStatus, cancelGeneration, isManuscriptFullView, ...rest } = state;
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
