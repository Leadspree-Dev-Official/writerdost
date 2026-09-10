/**
 * The automation pipeline: find something to write about, write it, check it,
 * and send it to the destination.
 *
 * This runs on the server with no browser attached, so it must never depend
 * on the Zustand store or on anything in `window`.
 */
import { callModel } from "@/lib/ai-server-utils";
import { mdToHtml } from "@/lib/markdown-utils";
import { robustParseJson, slugify } from "@/lib/app-utils";
import { getToneDirective } from "@/lib/tone-standards";
import { publishPost } from "./destinations";
import { collectSourceItems, hashUrl } from "./sources";
import type { Automation, GeneratedPost, SourceItem } from "./types";

export type QualityReport = {
  passed: boolean;
  wordCount: number;
  issues: string[];
};

/** Phrases that mean the model returned scaffolding instead of prose. */
const PLACEHOLDER_PATTERNS = [
  /\blorem ipsum\b/i,
  /\[insert[^\]]*\]/i,
  /\bTODO\b/,
  /\bplaceholder\b/i,
  /\bas an ai language model\b/i,
  /\bI cannot\b.{0,40}\bfulfil/i,
];

/**
 * The gate that decides whether a post is safe to publish unattended.
 *
 * Deliberately strict: an automation publishes without anyone looking, so a
 * false negative costs one draft to review while a false positive puts broken
 * text on a live site.
 */
export function assessQuality(post: GeneratedPost, targetWords: number): QualityReport {
  const text = post.bodyMarkdown.replace(/[#*_>`-]/g, " ");
  const wordCount = text.split(/\s+/).filter(Boolean).length;
  const issues: string[] = [];

  if (!post.title.trim()) issues.push("The post has no title.");
  if (post.title.length > 120) issues.push("The title is unusually long.");

  // Well under target usually means the model stopped early.
  if (wordCount < Math.max(200, targetWords * 0.6)) {
    issues.push(`Only ${wordCount} words against a ${targetWords} word target.`);
  }

  for (const pattern of PLACEHOLDER_PATTERNS) {
    if (pattern.test(post.bodyMarkdown)) {
      issues.push("The draft still contains placeholder or refusal text.");
      break;
    }
  }

  if (!post.metaDescription.trim()) issues.push("No meta description was produced.");
  if (post.bodyHtml.trim().length === 0) issues.push("The post body is empty.");

  return { passed: issues.length === 0, wordCount, issues };
}

/** Trims a summary to something a meta description field will accept. */
function clampMeta(value: string, limit = 155): string {
  const clean = value.replace(/\s+/g, " ").trim();
  if (clean.length <= limit) return clean;
  return `${clean.slice(0, limit - 1).replace(/[,;:\s]\S*$/, "")}…`;
}

type WriteResult = { post: GeneratedPost; tokens: number };

/**
 * Writes one post from one source item.
 *
 * Topic mode writes from scratch. Feed mode is given the source article as
 * research material with explicit instructions to produce an original piece
 * rather than a paraphrase — a near-copy is both a copyright problem and
 * treated as spam by search engines.
 */
export async function writePost(
  automation: Automation,
  item: SourceItem,
): Promise<WriteResult> {
  const { contentConfig: content, api } = automation;
  const fromSource = Boolean(item.content);
  let tokens = 0;

  const houseStyle = [
    getToneDirective(content.tone),
    content.styleNotes ? `House style notes: ${content.styleNotes}` : "",
    content.language && content.language.toLowerCase() !== "english"
      ? `Write entirely in ${content.language}.`
      : "",
  ]
    .filter(Boolean)
    .join("\n");

  const sourceBlock = fromSource
    ? `You have been given a published article as RESEARCH INPUT ONLY.

SOURCE TITLE: ${item.title}
SOURCE URL: ${item.url}
SOURCE TEXT:
"""
${item.content.slice(0, 12_000)}
"""

CRITICAL RULES FOR USING THE SOURCE:
- Do NOT paraphrase it section by section. Do not mirror its structure or headings.
- Extract only facts, data and the underlying question. Then build your own argument.
- Add analysis, context or examples the source does not contain.
- Never reproduce more than a short quoted phrase, and attribute it if you do.
${content.citeSource ? `- Include one attribution link to the source: <a href="${item.url}">${item.title}</a>.` : ""}`
    : `Write about this topic: ${item.title}`;

  const { text, usage } = await callModel({
    api,
    systemPrompt: `You are the Writerdost Blog Agent. You produce publication-ready blog posts.

${houseStyle}

Audience: ${content.audience || "general readers"}
Target length: ${content.targetWords || 1000} words.
${content.keywords.length ? `Work these keywords in naturally: ${content.keywords.join(", ")}.` : ""}

Return ONLY raw JSON, no markdown fence, exactly:
{
  "title": "compelling, specific headline",
  "metaDescription": "under 155 characters",
  "excerpt": "two-sentence summary",
  "keywords": ["three", "to", "six"],
  "body": "the full post in Markdown, using ## and ### headings, lists and short paragraphs. Do NOT repeat the title as a heading."
}`,
    userPrompt: sourceBlock,
    temperature: 0.7,
    topP: 0.9,
  });

  tokens += usage.total_tokens;

  const parsed = (robustParseJson(text) || {}) as Record<string, unknown>;
  const title = String(parsed.title || item.title || "Untitled post").trim();
  const bodyMarkdown = String(parsed.body || "").trim();
  const bodyHtml = mdToHtml(bodyMarkdown);

  const keywords = Array.isArray(parsed.keywords)
    ? parsed.keywords.map(String).filter(Boolean).slice(0, 8)
    : content.keywords;

  const excerpt = String(parsed.excerpt || "").trim();

  return {
    tokens,
    post: {
      title,
      slug: slugify(title).slice(0, 80),
      bodyHtml,
      // htmlToMarkdown is DOM-based and browser-only; the model already
      // returns markdown, so there is nothing to convert back here.
      bodyMarkdown,
      excerpt: excerpt || clampMeta(bodyMarkdown, 200),
      // Deliberately NOT falling back to the body: slicing raw markdown makes
      // a meaningless description, and filling this in would stop the quality
      // gate from ever reporting a missing one.
      metaDescription: clampMeta(String(parsed.metaDescription || excerpt || "")),
      keywords,
      sourceUrl: fromSource ? item.url : undefined,
      sourceTitle: fromSource ? item.title : undefined,
    },
  };
}

export type PipelineOutcome = {
  status: "success" | "skipped" | "error";
  detail: string;
  tokens: number;
  posts: Array<{
    post: GeneratedPost;
    quality: QualityReport;
    state: "draft" | "published" | "failed";
    remoteId?: string;
    remoteUrl?: string;
    error?: string;
    sourceHash: string;
  }>;
};

/**
 * Runs one automation end to end.
 *
 * Each item is isolated: one failed publish records itself and the run
 * continues, because a single bad source should not cost the whole batch.
 */
export async function runAutomation(
  automation: Automation,
  seenHashes: Set<string>,
): Promise<PipelineOutcome> {
  const outcome: PipelineOutcome = { status: "success", detail: "", tokens: 0, posts: [] };

  const items = await collectSourceItems({
    sourceKind: automation.sourceKind,
    sourceConfig: automation.sourceConfig,
    seenHashes,
  });

  if (items.length === 0) {
    return { ...outcome, status: "skipped", detail: "No new source items to write about." };
  }

  for (const item of items) {
    const sourceHash = hashUrl(item.url);

    try {
      const { post, tokens } = await writePost(automation, item);
      outcome.tokens += tokens;

      const quality = assessQuality(post, automation.contentConfig.targetWords || 1000);

      // `gated` publishes live only on a clean report; everything else that is
      // not explicitly `publish` goes out as a draft for review.
      const mode: "draft" | "publish" =
        automation.publish === "publish"
          ? "publish"
          : automation.publish === "gated" && quality.passed
            ? "publish"
            : "draft";

      if (!automation.destination) {
        outcome.posts.push({ post, quality, state: "draft", sourceHash });
        continue;
      }

      try {
        const result = await publishPost(post, automation.destination, mode);
        outcome.posts.push({
          post,
          quality,
          state: result.state,
          remoteId: result.remoteId,
          remoteUrl: result.remoteUrl,
          sourceHash,
        });
      } catch (error) {
        outcome.posts.push({
          post,
          quality,
          state: "failed",
          error: error instanceof Error ? error.message : "Publishing failed.",
          sourceHash,
        });
      }
    } catch (error) {
      outcome.posts.push({
        post: {
          title: item.title || "Generation failed",
          slug: slugify(item.title || "failed"),
          bodyHtml: "",
          bodyMarkdown: "",
          excerpt: "",
          metaDescription: "",
          keywords: [],
          sourceUrl: item.url.startsWith("topic:") ? undefined : item.url,
        },
        quality: { passed: false, wordCount: 0, issues: ["Generation failed."] },
        state: "failed",
        error: error instanceof Error ? error.message : "Generation failed.",
        sourceHash,
      });
    }
  }

  const published = outcome.posts.filter((p) => p.state !== "failed").length;
  const failed = outcome.posts.length - published;

  if (published === 0 && failed > 0) {
    outcome.status = "error";
    outcome.detail = outcome.posts[0]?.error || "Every item in this run failed.";
  } else {
    outcome.detail = `${published} post${published === 1 ? "" : "s"} created${
      failed ? `, ${failed} failed` : ""
    }.`;
  }

  return outcome;
}
