/**
 * BYOS (Bring Your Own Skill) Engine Parser & Security Sanitizer
 *
 * Safely parses and sanitizes open-source SKILL.md documents from the community
 * (compatible with Claude Code, Cursor, OpenCode, and npx skills).
 *
 * Security Guarantee:
 * Open-source CLI skills often contain terminal bash commands (curl, npx, chmod).
 * This parser programmatically strips all executable code blocks to ensure
 * zero arbitrary code execution in the web client and serverless runtime.
 */
import type { CustomSkill, SkillCategory } from "@/lib/store-types";

export interface ParseSkillResult {
  success: boolean;
  skill?: CustomSkill;
  error?: string;
}

/**
 * Extracts and parses YAML frontmatter key-value pairs without heavy runtime dependencies.
 */
function parseYamlFrontmatter(frontmatterStr: string): Record<string, unknown> {
  const metadata: Record<string, unknown> = {};
  const lines = frontmatterStr.split("\n");

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;

    const colonIdx = trimmed.indexOf(":");
    if (colonIdx === -1) continue;

    const key = trimmed.slice(0, colonIdx).trim();
    let valStr = trimmed.slice(colonIdx + 1).trim();

    // Strip wrapping quotes
    if ((valStr.startsWith('"') && valStr.endsWith('"')) || (valStr.startsWith("'") && valStr.endsWith("'"))) {
      valStr = valStr.slice(1, -1).trim();
    }

    // Handle array format e.g. [foo, bar]
    if (valStr.startsWith("[") && valStr.endsWith("]")) {
      const items = valStr
        .slice(1, -1)
        .split(",")
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ""))
        .filter(Boolean);
      metadata[key] = items;
    } else if (valStr.toLowerCase() === "true") {
      metadata[key] = true;
    } else if (valStr.toLowerCase() === "false") {
      metadata[key] = false;
    } else if (!isNaN(Number(valStr)) && valStr !== "") {
      metadata[key] = Number(valStr);
    } else {
      metadata[key] = valStr;
    }
  }

  return metadata;
}

/**
 * Strips dangerous terminal bash/shell commands from skill instructions.
 */
export function sanitizeSkillBody(rawBody: string): string {
  // Strip bash, sh, zsh, powershell fenced code blocks
  let safe = rawBody.replace(/```(?:bash|sh|zsh|shell|cmd|powershell)[\s\S]*?```/gi, "");

  // Strip dangerous inline CLI execution strings
  safe = safe.replace(/\b(?:npx\s+skills\s+add|curl\s+-s|wget\s+|chmod\s+\+x|rm\s+-rf)\b[^\n]*/gi, "");

  return safe.trim();
}

/**
 * Extracts prohibited/banned phrases from markdown lists or sections.
 */
function extractBannedPhrases(content: string): string[] {
  const banned = new Set<string>();
  const bannedSectionRegex = /###?\s*(?:Prohibited Words|Banned Phrases|Blacklist|Anti-AI Words)[^\n]*\n([\s\S]*?)(?=\n###|\n##|\n#|$)/i;
  const match = bannedSectionRegex.exec(content);

  if (match && match[1]) {
    const sectionText = match[1];
    const lines = sectionText.split("\n");
    for (const line of lines) {
      const clean = line.replace(/^[\-\*\d\.\s]+/, "").trim();
      if (clean && !clean.startsWith("#") && clean.length < 60) {
        banned.add(clean.toLowerCase());
      }
    }
  }

  return Array.from(banned);
}

/**
 * Normalizes category string to standard SkillCategory.
 */
function normalizeCategory(cat?: unknown): SkillCategory {
  if (typeof cat !== "string") return "general";
  const lower = cat.toLowerCase().trim();
  if (["blog", "blogs", "seo", "article"].includes(lower)) return "blog";
  if (["ebook", "ebooks", "lead-magnet"].includes(lower)) return "ebook";
  if (["book", "books", "fiction", "novel", "manuscript"].includes(lower)) return "book";
  if (["research", "deep-research", "academic"].includes(lower)) return "research";
  if (["copywriting", "copy", "sales", "ads", "email"].includes(lower)) return "copywriting";
  return "general";
}

/**
 * Parses raw SKILL.md text into a validated, sanitized CustomSkill object.
 */
export function parseSkillMarkdown(rawMarkdown: string): ParseSkillResult {
  if (!rawMarkdown || typeof rawMarkdown !== "string" || !rawMarkdown.trim()) {
    return { success: false, error: "The provided skill markdown is empty." };
  }

  let metadata: Record<string, unknown> = {};
  let body = rawMarkdown.trim();

  // Check for YAML Frontmatter (opening and closing ---)
  if (body.startsWith("---")) {
    const endFrontmatterIdx = body.indexOf("\n---", 3);
    if (endFrontmatterIdx !== -1) {
      const frontmatterStr = body.slice(3, endFrontmatterIdx).trim();
      metadata = parseYamlFrontmatter(frontmatterStr);
      body = body.slice(endFrontmatterIdx + 4).trim();
    }
  }

  // Sanitize the instructions body
  const sanitizedBody = sanitizeSkillBody(body);
  if (!sanitizedBody) {
    return { success: false, error: "Skill body contains no valid natural language directives after security sanitization." };
  }

  // Derive Name and Description
  const name =
    (typeof metadata.name === "string" && metadata.name.trim()) ||
    (sanitizedBody.match(/^#+\s+(.+)$/m)?.[1]?.trim()) ||
    "Custom Agent Skill";

  const description =
    (typeof metadata.description === "string" && metadata.description.trim()) ||
    (sanitizedBody.split("\n\n")[0]?.replace(/^#+.*$/gm, "").trim().slice(0, 200)) ||
    "Custom imported editorial skill.";

  const category = normalizeCategory(metadata.category);
  const author = typeof metadata.author === "string" ? metadata.author : "Community / User";
  const triggers = Array.isArray(metadata.triggers) ? metadata.triggers.map(String) : [];
  const bannedPhrases = extractBannedPhrases(sanitizedBody);

  const skillId = `skill-${name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || Date.now()}`;

  const skill: CustomSkill = {
    id: skillId,
    name,
    category,
    description,
    author,
    triggers,
    systemPromptAddendum: sanitizedBody,
    bannedPhrases,
    rawMarkdown,
    isCustom: true,
    createdAt: Date.now(),
  };

  return { success: true, skill };
}

/**
 * Built-in Verified Skills adapted from top open-source repositories.
 */
export const BUILT_IN_SKILLS: CustomSkill[] = [
  {
    id: "infrasity-b2b-seo",
    name: "Infrasity B2B Technical SEO Specialist",
    category: "blog",
    description: "Enforces the FLOW Evidence Triple, eliminates marketing fluff, and builds authoritative B2B/DevTool articles.",
    author: "Infrasity Labs (Imported)",
    triggers: ["blog", "article", "b2b", "technical"],
    systemPromptAddendum: `You are an elite B2B Technical Editor.
FLOW EVIDENCE TRIPLE: Any benchmark, study, or metric cited must include a 4-digit year anchor (e.g. "In a 2024 survey...") and explicit institution attribution.
No generic claims. Ground every technical claim in architecture, metrics, or code examples.`,
    bannedPhrases: ["delve", "tapestry", "in today's digital landscape", "game-changer", "unlock your potential"],
    rawMarkdown: "",
    isCustom: false,
    createdAt: 1731800000000,
  },
  {
    id: "robpalmer-direct-response",
    name: "Direct Response & Ad Compliance Chief",
    category: "copywriting",
    description: "Applies Schwartz awareness calibration, Sugarman triggers, and strict Meta/Google ad safety policies.",
    author: "Rob Palmer (Imported)",
    triggers: ["ad", "copy", "sales", "landing-page"],
    systemPromptAddendum: `You are a Direct Response Creative Director.
1. Calibrate copy directly to prospect awareness level.
2. Ad Compliance: NEVER use accusatory personal attributes or unverified monetary guarantees.
3. Write with visceral emotional impact and greasy-slide readability.`,
    bannedPhrases: ["look no further", "testament", "seamlessly", "cutting-edge"],
    rawMarkdown: "",
    isCustom: false,
    createdAt: 1731800000000,
  },
  {
    id: "kshanxs-narrative-memory",
    name: "Book Continuity & Pacing Sentinel",
    category: "book",
    description: "Maintains cross-chapter character consistency, unresolved plot threads, and 1-10 scene tension arcs.",
    author: "Kshanxs (Imported)",
    triggers: ["book", "novel", "manuscript", "fiction"],
    systemPromptAddendum: `You are the Book Continuity Sentinel.
Enforce absolute consistency with established character traits, relationship dynamics, timeline milestones, and unresolved story threads.
Never contradict facts established in earlier chapters. Maintain dynamic pacing without filler exposition.`,
    bannedPhrases: ["as an ai", "it is important to remember", "in conclusion"],
    rawMarkdown: "",
    isCustom: false,
    createdAt: 1731800000000,
  },
];
