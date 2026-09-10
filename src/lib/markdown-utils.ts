/**
 * A lightweight, regex-based markdown to HTML converter.
 * Handles headers, bold, italics, lists, and horizontal rules.
 */
export function mdToHtml(md: string): string {
  if (!md) return "";

  let html = md.trim();

  // Handle Horizontal Rules
  html = html.replace(/^(\s*[-*_]){3,}\s*$/gm, "<hr />");

  // Handle Headers (allow optional leading spaces)
  html = html.replace(/^\s*#\s+(.*)$/gm, "<h1>$1</h1>");
  html = html.replace(/^\s*##\s+(.*)$/gm, "<h2>$1</h2>");
  html = html.replace(/^\s*###\s+(.*)$/gm, "<h3>$1</h3>");
  html = html.replace(/^\s*####\s+(.*)$/gm, "<h4>$1</h4>");

  // Protect inline code spans BEFORE bold/italic run, so markdown characters
  // inside `backticks` (e.g. `__init__`) aren't mangled by the passes below.
  const codeSpans: string[] = [];
  html = html.replace(/`(.*?)`/g, (_match, code) => {
    const codeIndex = codeSpans.push(code) - 1;
    return " CODE" + codeIndex + " ";
  });

  // Handle Bold
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/__(.*?)__/g, "<strong>$1</strong>");

  // Handle Italics
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");
  html = html.replace(/_(.*?)_/g, "<em>$1</em>");

  // Restore protected inline code spans
  html = html.replace(/ CODE(\d+) /g, (_match, index) => "<code>" + codeSpans[Number(index)] + "</code>");

  // Handle Lists (Unordered)
  html = html.replace(/^\s*[-*+]\s+(.+)$/gm, "<li>$1</li>");
  
  // Group consecutive <li> blocks into a single <ul>
  html = html.replace(/(?:<li>[\s\S]*?<\/li>\s*)+/g, (match) => {
    const items = match.trim().replace(/<\/li>\s+<li>/g, "</li><li>");
    return `<ul>${items}</ul>`;
  });


  // Handle Paragraphs
  const blocks = html.split(/\n{2,}/);
  html = blocks
    .map((block) => {
      const trimmed = block.trim();
      if (!trimmed) return "";
      // If it's already a block tag, return it
      if (/^<(h\d|ul|hr)/i.test(trimmed)) {
        return trimmed;
      }
      // Otherwise wrap in paragraph and convert single newlines to br
      return `<p>${trimmed.replace(/\n/g, "<br />")}</p>`;
    })
    .join("\n");

  // Clean up any double-wrapped tags or empty paragraphs
  html = html.replace(/<p>\s*<(h\d|ul|hr)/gi, (match) => match.replace("<p>", ""));
  html = html.replace(/<\/(h\d|ul|hr)>\s*<\/p>/gi, (match) => match.replace("</p>", ""));

  // Handle common LaTeX-style symbols (Quick fix for user's request)
  html = html.replace(/\$\\rightarrow\$/g, "→");
  html = html.replace(/\$\\leftarrow\$/g, "←");
  html = html.replace(/\$\\leftrightarrow\$/g, "↔");
  html = html.replace(/\$\\Rightarrow\$/g, "⇒");
  html = html.replace(/\$\\Leftarrow\$/g, "⇐");
  html = html.replace(/\$\\Leftrightarrow\$/g, "⇔");
  html = html.replace(/\$\\alpha\$/g, "α");
  html = html.replace(/\$\\beta\$/g, "β");
  html = html.replace(/\$\\gamma\$/g, "γ");
  html = html.replace(/\$\\delta\$/g, "δ");
  html = html.replace(/\$\\epsilon\$/g, "ε");
  html = html.replace(/\$\\zeta\$/g, "ζ");
  html = html.replace(/\$\\eta\$/g, "η");
  html = html.replace(/\$\\theta\$/g, "θ");
  html = html.replace(/\$\\iota\$/g, "ι");
  html = html.replace(/\$\\kappa\$/g, "κ");
  html = html.replace(/\$\\lambda\$/g, "λ");
  html = html.replace(/\$\\mu\$/g, "μ");
  html = html.replace(/\$\\nu\$/g, "ν");
  html = html.replace(/\$\\xi\$/g, "ξ");
  html = html.replace(/\$\\pi\$/g, "π");
  html = html.replace(/\$\\rho\$/g, "ρ");
  html = html.replace(/\$\\sigma\$/g, "σ");
  html = html.replace(/\$\\tau\$/g, "τ");
  html = html.replace(/\$\\phi\$/g, "φ");
  html = html.replace(/\$\\chi\$/g, "χ");
  html = html.replace(/\$\\psi\$/g, "ψ");
  html = html.replace(/\$\\omega\$/g, "ω");
  html = html.replace(/\$\\sum\$/g, "∑");
  html = html.replace(/\$\\prod\$/g, "∏");
  html = html.replace(/\$\\infty\$/g, "∞");
  html = html.replace(/\$\\approx\$/g, "≈");
  html = html.replace(/\$\\neq\$/g, "≠");
  html = html.replace(/\$\\le\$/g, "≤");
  html = html.replace(/\$\\ge\$/g, "≥");
  html = html.replace(/\$\\pm\$/g, "±");
  html = html.replace(/\$\\times\$/g, "×");
  html = html.replace(/\$\\div\$/g, "÷");

  return html.trim();
}

/**
 * Strips HTML tags and returns plain text.
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/(p|h1|h2|h3|h4|h5|h6|li|blockquote|div)>/gi, "\n\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

/* --------------------------------------------------------------------------
 * HTML -> Markdown
 *
 * The inverse of `mdToHtml`, used by the .md export. This walks the DOM
 * instead of running regexes over the markup: chapter HTML comes from Tiptap
 * and from model output, so nesting (lists inside lists, formatting inside
 * headings) is common and regexes lose it.
 * ----------------------------------------------------------------------- */

/** Inline markdown characters that would otherwise be read as formatting. */
function escapeInline(text: string): string {
  return text.replace(/([\\`*_[\]])/g, "\\$1");
}

/** Escapes characters that only take on meaning at the start of a line. */
function escapeBlockStart(text: string): string {
  return (
    text
      .replace(/^(\s*)([#>+-])(\s)/, "$1\\$2$3")
      // A backslash only escapes punctuation, so "5." is neutralised on the
      // period ("5\.") — "\5" would render the backslash literally.
      .replace(/^(\s*)(\d+)\.(\s)/, "$1$2\\.$3")
  );
}

const INLINE_WRAPPERS: Record<string, string> = {
  strong: "**",
  b: "**",
  em: "_",
  i: "_",
  s: "~~",
  del: "~~",
  strike: "~~",
};

/** Renders the inline content of an element to a single line of markdown. */
function renderInline(node: Node): string {
  let out = "";

  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      // Collapse the whitespace HTML would have collapsed anyway.
      out += escapeInline((child.textContent || "").replace(/\s+/g, " "));
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;

    const el = child as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (tag === "br") {
      // Two trailing spaces is the portable hard line break.
      out += "  \n";
    } else if (tag === "code") {
      out += `\`${el.textContent || ""}\``;
    } else if (tag === "img") {
      const alt = el.getAttribute("alt") || "";
      const src = el.getAttribute("src") || "";
      out += `![${alt}](${src})`;
    } else if (tag === "a") {
      const href = el.getAttribute("href");
      const label = renderInline(el);
      out += href ? `[${label}](${href})` : label;
    } else if (tag === "u") {
      // Markdown has no underline; inline HTML is the portable fallback.
      out += `<u>${renderInline(el)}</u>`;
    } else if (INLINE_WRAPPERS[tag]) {
      const inner = renderInline(el).trim();
      out += inner ? `${INLINE_WRAPPERS[tag]}${inner}${INLINE_WRAPPERS[tag]}` : "";
    } else {
      out += renderInline(el);
    }
  });

  return out;
}

/** Renders one list, indenting nested levels by two spaces per level. */
function renderList(el: HTMLElement, ordered: boolean, depth: number): string[] {
  const lines: string[] = [];
  const pad = "  ".repeat(depth);
  let index = 1;

  Array.from(el.children).forEach((child) => {
    if (child.tagName.toLowerCase() !== "li") return;

    const li = child as HTMLElement;
    const marker = ordered ? `${index++}. ` : "- ";

    // Split the item's own text from any list nested inside it.
    const ownText = renderInline(
      (() => {
        const clone = li.cloneNode(true) as HTMLElement;
        clone.querySelectorAll("ul, ol").forEach((n) => n.remove());
        return clone;
      })(),
    ).trim();

    lines.push(`${pad}${marker}${ownText}`);

    li.querySelectorAll(":scope > ul, :scope > ol").forEach((nested) => {
      lines.push(...renderList(nested as HTMLElement, nested.tagName.toLowerCase() === "ol", depth + 1));
    });
  });

  return lines;
}

/** Renders a table as a GitHub-flavoured markdown table. */
function renderTable(el: HTMLElement): string[] {
  const rows = Array.from(el.querySelectorAll("tr"));
  if (rows.length === 0) return [];

  const cellsOf = (row: Element) =>
    Array.from(row.querySelectorAll("th, td")).map((c) => renderInline(c).trim().replace(/\|/g, "\\|"));

  const header = cellsOf(rows[0]);
  const lines = [`| ${header.join(" | ")} |`, `| ${header.map(() => "---").join(" | ")} |`];

  rows.slice(1).forEach((row) => {
    const cells = cellsOf(row);
    while (cells.length < header.length) cells.push("");
    lines.push(`| ${cells.join(" | ")} |`);
  });

  return lines;
}

/** Renders block-level children, returning the blocks as separate strings. */
function renderBlocks(node: Node): string[] {
  const blocks: string[] = [];

  node.childNodes.forEach((child) => {
    if (child.nodeType === Node.TEXT_NODE) {
      const text = (child.textContent || "").trim();
      if (text) blocks.push(escapeBlockStart(escapeInline(text)));
      return;
    }
    if (child.nodeType !== Node.ELEMENT_NODE) return;

    const el = child as HTMLElement;
    const tag = el.tagName.toLowerCase();

    if (/^h[1-6]$/.test(tag)) {
      const level = Number(tag[1]);
      const text = renderInline(el).trim();
      if (text) blocks.push(`${"#".repeat(level)} ${text}`);
    } else if (tag === "p") {
      const text = renderInline(el).trim();
      if (text) blocks.push(escapeBlockStart(text));
    } else if (tag === "ul" || tag === "ol") {
      const lines = renderList(el, tag === "ol", 0);
      if (lines.length) blocks.push(lines.join("\n"));
    } else if (tag === "blockquote") {
      const inner = renderBlocks(el).join("\n\n");
      if (inner.trim()) {
        blocks.push(
          inner
            .split("\n")
            .map((line) => (line ? `> ${line}` : ">"))
            .join("\n"),
        );
      }
    } else if (tag === "pre") {
      blocks.push(`\`\`\`\n${el.textContent || ""}\n\`\`\``);
    } else if (tag === "hr") {
      blocks.push("---");
    } else if (tag === "table") {
      const lines = renderTable(el);
      if (lines.length) blocks.push(lines.join("\n"));
    } else if (tag === "script" || tag === "style") {
      // Never carry executable content into the export.
    } else if (tag === "div" || tag === "section" || tag === "article" || tag === "figure") {
      blocks.push(...renderBlocks(el));
    } else {
      const text = renderInline(el).trim();
      if (text) blocks.push(escapeBlockStart(text));
    }
  });

  return blocks;
}

/**
 * Converts a fragment of chapter HTML into markdown. The fragment is parsed
 * with the HTML parser first, so unclosed tags are repaired before the walk.
 */
export function htmlToMarkdown(html: string): string {
  if (!html) return "";

  const doc = new DOMParser().parseFromString(`<body>${html}</body>`, "text/html");
  return renderBlocks(doc.body)
    .filter((block) => block.trim())
    .join("\n\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
