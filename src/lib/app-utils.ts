import type { Project, ProjectChapter } from "@/lib/app-store";

export const findProjectById = (projects: Project[], projectId: string) =>
  projects.find((project) => project.id === projectId) ?? projects[0];

export const findChapterById = (project: Project | undefined, chapterId: string): ProjectChapter | undefined =>
  project?.chapters.find((chapter) => chapter.id === chapterId) ?? project?.chapters[0];

export const statusChipClasses: Record<string, string> = {
  Planning: "bg-amber-100 text-amber-800",
  Drafting: "bg-sky-100 text-sky-800",
  Editing: "bg-violet-100 text-violet-800",
  Ready: "bg-emerald-100 text-emerald-800",
};

export function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}
export function robustParseJson(text: string) {
  // 1. Control character sanitization (Standard JSON.parse allows \n between tokens but not within strings)
  const sanitized = text.replace(/[\u0000-\u0009\u000B-\u000C\u000E-\u001F]/g, "");

  // 2. Basic cleanup (Markdown blocks)
  const processed = sanitized
    .replace(/```json/g, "")
    .replace(/```/g, "")
    .trim();

  // 3. Ultra-Resilient Fixes for common "Lazy JSON" patterns
  const applyLazyFixes = (str: string) => {
    return str
      // Fix single quotes for keys: { 'key': ... } -> { "key": ... }
      .replace(/([{,]\s*)'([^']+)'\s*:/g, '$1"$2":')
      // Fix single quotes for string values, handling potential apostrophes inside
      // This is tricky; we'll look for : ' followed by text and then ' at the end of a field
      .replace(/:\s*'([^']*)'(\s*[,}\]])/g, (match, p1, p2) => {
        // Replace internal single quotes (apostrophes) with escaped version if we're wrapping in double quotes
        const fixedValue = p1.replace(/'/g, "\\'");
        return `: "${fixedValue}"${p2}`;
      })
      // Remove trailing commas: { "a": 1, } -> { "a": 1 }
      .replace(/,\s*([}\]])/g, "$1")
      // Quick fix for unquoted keys: { key: ... } -> { "key": ... }
      .replace(/([{,]\s*)([a-zA-Z0-9_]+)\s*:/g, '$1"$2":');
  };

  try {
    return JSON.parse(processed);
  } catch (e) {
    // Attempt lazy fixes
    try {
      return JSON.parse(applyLazyFixes(processed));
    } catch {
      // Fallback: Structural extraction
      const firstBrace = processed.indexOf("{");
      const firstBracket = processed.indexOf("[");

      let startIndex = -1;
      let endChar = "";

      if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
        startIndex = firstBrace;
        endChar = "}";
      } else if (firstBracket !== -1) {
        startIndex = firstBracket;
        endChar = "]";
      }

      if (startIndex !== -1) {
        const lastIndex = processed.lastIndexOf(endChar);
        if (lastIndex !== -1) {
          const jsonCandidate = processed.slice(startIndex, lastIndex + 1);
          try {
            return JSON.parse(jsonCandidate);
          } catch {
            try {
              return JSON.parse(applyLazyFixes(jsonCandidate));
            } catch (innerError) {
              // Log warning and return null silently
              console.warn("Partial JSON extraction failed, might be a fragment:", innerError);
              return null;
            }
          }
        }
      }
      return null;
    }
  }
}

export const STREAM_DELIMITER = "\n<--WRITERDOST_EVENT-->\n";

/** A progress event pushed to the client over the generation stream. */
export type StreamEvent = {
  type: string;
  [key: string]: unknown;
};

export function sendStreamEvent(controller: ReadableStreamDefaultController, data: StreamEvent) {
  const encoder = new TextEncoder();
  controller.enqueue(encoder.encode(JSON.stringify(data) + STREAM_DELIMITER));
}

export function calculateProjectWords(project: Project | undefined) {
  if (!project) return 0;
  const chapterWords = (project.chapters || []).reduce((sum, ch) => sum + (ch.wordCount || 0), 0);
  const blogWords = project.blogDraft ? project.blogDraft.split(/\s+/).filter(Boolean).length : 0;
  return chapterWords + blogWords;
}
