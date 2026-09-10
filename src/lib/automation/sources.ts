/**
 * Where an automation finds something to write about.
 *
 * Two shapes: a fixed topic list (rotated so the same subject is not written
 * twice in a row), or a remote feed — RSS, Atom or a sitemap — whose newest
 * entries are fetched and read.
 *
 * Every outbound request goes through `safeFetch`, so a feed URL cannot be
 * used to make the server probe internal hosts.
 */
import { createHash } from "node:crypto";
import { safeFetch } from "@/lib/net-guard";
import type { SourceConfig, SourceItem } from "./types";

/** Stable id for dedupe. */
export function hashUrl(value: string): string {
  return createHash("sha256").update(value.trim().toLowerCase()).digest("hex").slice(0, 32);
}

/** Decodes the handful of XML entities that show up in feed titles. */
function decodeEntities(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#0?39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_m, code) => String.fromCodePoint(Number(code)))
    .replace(/&amp;/g, "&")
    .trim();
}

/** Pulls the text of the first matching tag out of an XML block. */
function tagText(xml: string, ...names: string[]): string {
  for (const name of names) {
    const match = xml.match(new RegExp(`<${name}[^>]*>([\\s\\S]*?)</${name}>`, "i"));
    if (match) return decodeEntities(match[1]);
  }
  return "";
}

/**
 * Parses RSS 2.0, Atom and sitemap XML with one pass.
 *
 * A dependency-free parser is deliberate: feeds in the wild are frequently
 * malformed, and a strict XML parser rejects documents that readers accept.
 */
export function parseFeed(xml: string): SourceItem[] {
  const items: SourceItem[] = [];

  // RSS <item> and Atom <entry> share enough structure to handle together.
  const blocks = xml.match(/<(item|entry)[\s>][\s\S]*?<\/\1>/gi) || [];

  for (const block of blocks) {
    // Atom links carry the URL in an attribute rather than the element body.
    const atomLink = block.match(/<link[^>]*\bhref=["']([^"']+)["'][^>]*>/i)?.[1];
    const url = decodeEntities(atomLink || tagText(block, "link", "guid", "id"));
    const title = tagText(block, "title");
    if (!url || !title) continue;

    items.push({
      url,
      title,
      content: "",
      publishedAt: tagText(block, "pubDate", "published", "updated") || undefined,
    });
  }

  // A sitemap has no items or entries, only <url><loc>.
  if (items.length === 0) {
    const locs = xml.match(/<url[\s>][\s\S]*?<\/url>/gi) || [];
    for (const block of locs) {
      const url = tagText(block, "loc");
      if (!url) continue;
      items.push({
        url,
        title: "",
        content: "",
        publishedAt: tagText(block, "lastmod") || undefined,
      });
    }
  }

  return items;
}

/** Tags whose contents are never article prose. */
const NON_CONTENT = /<(script|style|nav|header|footer|aside|form|noscript|svg)[\s\S]*?<\/\1>/gi;

/**
 * Extracts readable text from an article page.
 *
 * This is a deliberately small heuristic rather than a full Readability port:
 * pick the richest of <article> / <main> / the whole body, strip chrome, and
 * flatten to text. The result feeds a model, so perfect structure matters
 * less than getting the substance with little boilerplate.
 */
export function extractArticle(html: string): { title: string; text: string } {
  const cleaned = html.replace(NON_CONTENT, " ");

  const title =
    decodeEntities(
      cleaned.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1] ||
        cleaned.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1] ||
        cleaned.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ||
        "",
    ).replace(/\s+/g, " ");

  const candidates = [
    ...(cleaned.match(/<article[\s>][\s\S]*?<\/article>/gi) || []),
    ...(cleaned.match(/<main[\s>][\s\S]*?<\/main>/gi) || []),
    cleaned,
  ];

  // The candidate with the most paragraph text is almost always the article.
  let best = "";
  let bestScore = 0;
  for (const candidate of candidates) {
    const paragraphs = candidate.match(/<p[\s>][\s\S]*?<\/p>/gi) || [];
    const score = paragraphs.join(" ").replace(/<[^>]+>/g, " ").trim().length;
    if (score > bestScore) {
      bestScore = score;
      best = paragraphs.join("\n\n");
    }
  }

  const text = decodeEntities((best || cleaned).replace(/<[^>]+>/g, " "))
    .replace(/[ \t]+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return { title, text };
}

/** Rotates the topic list so runs do not repeat the same subject. */
function pickTopics(config: SourceConfig, alreadySeen: Set<string>, limit: number): SourceItem[] {
  const topics = (config.topics || []).map((t) => t.trim()).filter(Boolean);
  const unused = topics.filter((t) => !alreadySeen.has(hashUrl(`topic:${t}`)));

  // Once every topic has been used the cycle starts again.
  const pool = unused.length > 0 ? unused : topics;

  return pool.slice(0, limit).map((topic) => ({
    url: `topic:${topic}`,
    title: topic,
    content: "",
  }));
}

/**
 * Returns the items this run should write about, newest first, excluding
 * anything already handled for this automation.
 */
export async function collectSourceItems({
  sourceKind,
  sourceConfig,
  seenHashes,
}: {
  sourceKind: "topic" | "rss" | "sitemap" | "url";
  sourceConfig: SourceConfig;
  seenHashes: Set<string>;
}): Promise<SourceItem[]> {
  const limit = Math.max(1, Math.min(10, sourceConfig.maxPerRun ?? 1));

  if (sourceKind === "topic") {
    return pickTopics(sourceConfig, seenHashes, limit);
  }

  const feedUrl = sourceConfig.feedUrl;
  if (!feedUrl) return [];

  // `url` mode points at a single article; the others point at a list.
  const candidates: SourceItem[] =
    sourceKind === "url"
      ? [{ url: feedUrl, title: "", content: "" }]
      : parseFeed((await safeFetch(feedUrl, { label: "feed URL" })).body);

  const fresh = candidates.filter((item) => !seenHashes.has(hashUrl(item.url)));
  const minWords = sourceConfig.minWords ?? 150;
  const resolved: SourceItem[] = [];

  // Work down the list until `limit` articles actually succeed rather than
  // taking the first `limit` blindly: real feeds are full of links that are
  // paywalled, bot-blocked, or not articles at all (a tweet, a PDF, a video).
  // Attempts are capped so a feed of dead links cannot run forever.
  const maxAttempts = Math.min(fresh.length, limit * 6 + 4);

  for (let i = 0; i < maxAttempts && resolved.length < limit; i++) {
    const item = fresh[i];
    try {
      const page = await safeFetch(item.url, { label: "article URL" });
      if (!/html/i.test(page.contentType)) continue;

      const article = extractArticle(page.body);
      const wordCount = article.text.split(/\s+/).filter(Boolean).length;

      // Too short almost always means a paywall, a stub, or a link post.
      if (wordCount < minWords) continue;

      resolved.push({
        ...item,
        title: item.title || article.title,
        content: article.text,
      });
    } catch {
      // One unreachable article must not fail the whole run.
      continue;
    }
  }

  return resolved;
}
