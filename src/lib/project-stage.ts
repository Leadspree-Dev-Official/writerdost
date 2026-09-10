import type { Project, ProjectStatus } from "./app-store";

/**
 * The editor's stage bar. One source of truth for "where is this book, and what
 * should the writer press next", so the bar never has to guess and the buttons
 * never compete for attention.
 */
export const STAGES: { key: ProjectStatus; label: string }[] = [
  { key: "Planning", label: "Outline" },
  { key: "Drafting", label: "Draft" },
  { key: "Editing", label: "Edit" },
  { key: "Ready", label: "Publish" },
];

export type StageActionId =
  | "draft"
  | "wrappers"
  | "finish"
  | "publish"
  | "preview"
  | "reopen";

/** Default label and icon per action. The page may override the publish label,
 *  which changes with the marketplace connection state. */
export const STAGE_ACTIONS: Record<StageActionId, { label: string; icon: string }> = {
  draft: { label: "Draft chapters", icon: "edit_document" },
  wrappers: { label: "Generate front matter", icon: "format_paint" },
  finish: { label: "Finish & proofread", icon: "verified" },
  publish: { label: "Publish", icon: "storefront" },
  preview: { label: "Preview manuscript", icon: "auto_stories" },
  reopen: { label: "Return to drafting", icon: "undo" },
};

export type StageGuidance = {
  currentIndex: number;
  /** One line telling the writer why the primary action is the primary action. */
  hint: string;
  primaryId: StageActionId | null;
  secondaryIds: StageActionId[];
};

export function getStageGuidance(
  project: Project,
  opts: { isGenerating: boolean },
): StageGuidance {
  const currentIndex = Math.max(
    0,
    STAGES.findIndex((stage) => stage.key === project.status),
  );

  const chapters = project.chapters ?? [];
  const total = chapters.length;
  const drafted = chapters.filter((chapter) => chapter.wordCount > 0).length;
  const hasFrontMatter = chapters.some((chapter) => chapter.id === "front-title-page");

  // While the pipeline runs, every action would either queue behind it or
  // cancel it, so the bar reports instead of prompting.
  if (opts.isGenerating) {
    return {
      currentIndex,
      hint: "Agents are working on the manuscript…",
      primaryId: null,
      secondaryIds: [],
    };
  }

  if (project.status === "Ready") {
    return {
      currentIndex,
      hint: "Manuscript is final. Publish it, or reopen it to keep editing.",
      primaryId: "publish",
      secondaryIds: ["preview", "reopen"],
    };
  }

  if (total === 0) {
    return {
      currentIndex,
      hint: "No chapters yet. Add one from the sidebar to get started.",
      primaryId: null,
      secondaryIds: ["finish"],
    };
  }

  if (drafted < total) {
    const hint =
      project.status === "Planning"
        ? `${total} chapters outlined. Draft them to build the manuscript.`
        : `${drafted} of ${total} chapters drafted. Draft the rest to continue.`;
    return {
      currentIndex,
      hint,
      primaryId: "draft",
      secondaryIds: hasFrontMatter ? ["finish"] : ["wrappers", "finish"],
    };
  }

  if (!hasFrontMatter) {
    return {
      currentIndex,
      hint: "All chapters drafted. Add the title page and front matter next.",
      primaryId: "wrappers",
      secondaryIds: ["draft", "finish"],
    };
  }

  return {
    currentIndex,
    hint: "Front matter is in place. Finish and proofread to lock the manuscript.",
    primaryId: "finish",
    secondaryIds: ["draft", "preview"],
  };
}
