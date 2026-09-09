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


