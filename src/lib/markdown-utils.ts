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
