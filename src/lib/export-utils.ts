import { Project } from "./app-store";
import { htmlToText, htmlToMarkdown } from "./markdown-utils";
import { findFont, FONT_OPTIONS, DEFAULT_BODY_FONT, DEFAULT_HEADING_FONT } from "./fonts";
import { Document, Packer, Paragraph, HeadingLevel, AlignmentType, TextRun, PageBreak } from "docx";

/** A node in the docx body we assemble while walking the chapter HTML. */
type DocxNode = Paragraph | TextRun;

/** Inline run formatting carried down through nested elements. */
type RunStyles = {
  bold?: boolean;
  /** docx spells this "italics" — "italic" is silently ignored. */
  italics?: boolean;
  underline?: Record<string, never>;
  color?: string;
  size?: number;
  /** Real family name — Word resolves fonts by name, not by CSS stack. */
  font?: string;
};

/**
 * Maps an inline `font-family` back to the family name Word needs. The editor
 * stores the full CSS stack, so match on that and fall back to the first
 * quoted or bare family if the stack came from somewhere else.
 */
function familyFromCss(cssValue: string): string | undefined {
  const stack = cssValue.trim();
  if (!stack) return undefined;
  const known = FONT_OPTIONS.find((font) => font.stack === stack);
  if (known) return known.family;
  const first = stack.split(",")[0]?.trim().replace(/^["']|["']$/g, "");
  return first && !first.startsWith("var(") ? first : undefined;
}

/** Block formatting inherited from the enclosing element. */
type BlockStyles = {
  alignment?: (typeof AlignmentType)[keyof typeof AlignmentType];
};

/**
 * Generates a plain text representation of the entire project manuscript.
 */
export function generateProjectText(project: Project): string {
  const header = `TITLE: ${project.title.toUpperCase()}\nDESCRIPTION: ${project.description}\nTONE: ${project.tone}\n\n========================================\n\n`;
  
  const content = project.chapters
    .map((chapter) => {
      const plainContent = htmlToText(chapter.content);
      return `CHAPTER: ${chapter.title.toUpperCase()}\n\n${plainContent}`;
    })
    .join("\n\n----------------------------------------\n\n");

  return header + content;
}

/** Quotes a value for a YAML frontmatter scalar. */
function yamlString(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/**
 * Renders the whole project as a single markdown document.
 *
 * YAML frontmatter is included so the file drops straight into a static site
 * generator or Pandoc without further editing. Chapters are separated by a
 * rule rather than a page break, since markdown has no pagination.
 */
export function generateProjectMarkdown(project: Project, author?: string): string {
  const frontmatter = [
    "---",
    `title: ${yamlString(project.title)}`,
    ...(author ? [`author: ${yamlString(author)}`] : []),
    ...(project.description ? [`description: ${yamlString(project.description)}`] : []),
    ...(project.audience ? [`audience: ${yamlString(project.audience)}`] : []),
    ...(project.tone ? [`tone: ${yamlString(project.tone)}`] : []),
    ...((project.seoKeywords || []).filter(Boolean).length
      ? ["keywords:", ...project.seoKeywords.filter(Boolean).map((k) => `  - ${yamlString(k)}`)]
      : []),
    `date: ${new Date().toISOString().slice(0, 10)}`,
    "---",
  ].join("\n");

  const body = (project.chapters || [])
    .map((chapter) => {
      const content = htmlToMarkdown(chapter.content);
      // A chapter whose HTML already opens with its own heading must not get
      // a duplicate one prepended.
      const hasOwnHeading = new RegExp(
        `^#{1,6}\\s+${chapter.title.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*$`,
        "m",
      ).test(content.split("\n")[0] || "");

      const heading = hasOwnHeading ? "" : `## ${chapter.title}\n\n`;
      return `${heading}${content}`.trim();
    })
    .filter(Boolean)
    .join("\n\n---\n\n");

  return `${frontmatter}\n\n# ${project.title}\n\n${body}\n`;
}

/** Generates the markdown document and triggers a browser download. */
export function downloadMarkdown(project: Project, author?: string) {
  downloadTxt(
    `${project.title.replace(/\s+/g, "_")}.md`,
    generateProjectMarkdown(project, author),
    "text/markdown",
  );
}

/**
 * Triggers a browser download of a text file.
 */
export function downloadTxt(filename: string, text: string, mimeType = "text/plain") {
  const blob = new Blob([text], { type: `${mimeType};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const element = document.createElement("a");
  
  element.setAttribute("href", url);
  element.setAttribute("download", filename);

  element.style.display = "none";
  document.body.appendChild(element);

  element.click();

  document.body.removeChild(element);
  URL.revokeObjectURL(url);
}

/**
 * Generates and downloads a .docx file for the project.
 */
export async function downloadDocx(project: Project) {
  // Word resolves fonts by family name, and the docx package does not embed
  // font files — a reader without the family installed sees Word's
  // substitute. Georgia is the safe pick for that reason.
  const bodyFamily = findFont(project.designSettings?.bodyFont, DEFAULT_BODY_FONT).family;
  const headingFamily = findFont(project.designSettings?.headingFont, DEFAULT_HEADING_FONT).family;

  const doc = new Document({
    styles: {
      default: {
        document: { run: { font: bodyFamily } },
        title: { run: { font: headingFamily } },
        heading1: { run: { font: headingFamily } },
        heading2: { run: { font: headingFamily } },
        heading3: { run: { font: headingFamily } },
        heading4: { run: { font: headingFamily } },
      },
    },
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              right: 1440,
              bottom: 1440,
              left: 1440,
            }
          }
        },
        children: [
          // Project Title (Matches Full Manuscript View)
          new Paragraph({
            text: project.title,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { before: 800, after: 400 },
          }),
          // Project Subtitle / Version info
          new Paragraph({
            children: [new TextRun({ text: "Manuscript Version 1.0", size: 32, italics: true })],
            alignment: AlignmentType.CENTER,
            spacing: { after: 1200 },
          }),
          // Chapters
          ...project.chapters.flatMap((chapter, index) => {
            const parser = new DOMParser();
            const doc = parser.parseFromString(chapter.content, "text/html");
            const children: Paragraph[] = [];

            // Add Page Break before every chapter except the first
            if (index > 0) {
              children.push(new Paragraph({ children: [new PageBreak()] }));
            }

            // Convert project designSettings px to Word half-points
            const ds = project.designSettings;
            const pxToHalfPt = (px: string | undefined, fallback: number) => {
              if (!px) return fallback;
              const num = parseInt(px, 10);
              return isNaN(num) ? fallback : num * 1.5;
            };
            const sizeMap = {
              h1: pxToHalfPt(ds?.h1Size, 72),  // Book Title
              h2: pxToHalfPt(ds?.h2Size, 48),  // Chapter Title
              h3: pxToHalfPt(ds?.h3Size, 36),  // Topic
              h4: pxToHalfPt(ds?.h4Size, 30),  // Sub-topic
              p:  pxToHalfPt(ds?.pSize, 24),    // Body
            };

            // Convert paragraph spacing from px to twips (1px ≈ 15 twips)
            const pxToTwips = (px: string | undefined, fallback: number) => {
              if (!px) return fallback;
              const num = parseInt(px, 10);
              return isNaN(num) ? fallback : num * 15;
            };
            const spacingBefore = pxToTwips(ds?.paragraphBefore, 0);
            const spacingAfter = pxToTwips(ds?.paragraphAfter, 180);

            // Parse body content
            const walk = (node: Node, styles: RunStyles = {}, parentStyles: BlockStyles = {}): DocxNode[] => {
              const nodes: DocxNode[] = [];
              node.childNodes.forEach((child) => {
                if (child.nodeType === Node.TEXT_NODE) {
                  const text = child.textContent || "";
                  if (text.trim() !== "" || text === " ") {
                    nodes.push(new TextRun({ text, size: sizeMap.p, ...styles }));
                  }
                } else if (child.nodeType === Node.ELEMENT_NODE) {
                  const el = child as HTMLElement;
                  const tagName = el.tagName.toLowerCase();
                  
                  // Extract alignment and color from style attribute
                  let alignment = parentStyles.alignment || AlignmentType.LEFT;
                  let color = styles.color || undefined;

                  if (el.style.textAlign === "center") alignment = AlignmentType.CENTER;
                  if (el.style.textAlign === "right") alignment = AlignmentType.RIGHT;
                  
                  if (el.style.color) {
                    const hexMatch = el.style.color.match(/#[0-9a-fA-F]{6}/);
                    if (hexMatch) color = hexMatch[0].replace("#", "");
                  }

                  if (tagName === "p") {
                    nodes.push(
                      new Paragraph({
                        children: walk(el, { ...styles, color }, { alignment }),
                        alignment,
                        spacing: { before: spacingBefore, after: spacingAfter },
                      })
                    );
                  } else if (["h1", "h2", "h3", "h4"].includes(tagName)) {
                    const level = tagName === "h1" ? HeadingLevel.HEADING_1 : 
                                  tagName === "h2" ? HeadingLevel.HEADING_2 : 
                                  tagName === "h3" ? HeadingLevel.HEADING_3 :
                                  HeadingLevel.HEADING_4;
                    
                    const headingStyles = { 
                      ...styles, 
                      color: color || "000000", 
                      bold: true,
                      italics: styles.italics || false
                    };
                    
                    const size = sizeMap[tagName as keyof typeof sizeMap];

                    nodes.push(
                      new Paragraph({
                        children: walk(el, { ...headingStyles, size }, { alignment }),
                        heading: level,
                        alignment,
                        spacing: { before: 240, after: 120 },
                      })
                    );
                  } else if (tagName === "strong" || tagName === "b") {
                    nodes.push(...walk(el, { ...styles, color, bold: true }, { alignment }));
                  } else if (tagName === "em" || tagName === "i") {
                    nodes.push(...walk(el, { ...styles, color, italics: true }, { alignment }));
                  } else if (tagName === "u") {
                    nodes.push(...walk(el, { ...styles, color, underline: {} }, { alignment }));
                  } else if (tagName === "br") {
                    nodes.push(new TextRun({ break: 1 }));
                  } else if (tagName === "span") {
                    // The editor writes font choices as inline styles on spans;
                    // without this they were dropped on export.
                    const spanFont = familyFromCss(el.style.fontFamily || "");
                    const spanPx = parseFloat(el.style.fontSize || "");
                    nodes.push(
                      ...walk(
                        el,
                        {
                          ...styles,
                          color,
                          ...(spanFont ? { font: spanFont } : {}),
                          // docx sizes are in half-points.
                          ...(Number.isFinite(spanPx) && spanPx > 0
                            ? { size: Math.round(spanPx * 1.5) }
                            : {}),
                        },
                        { alignment },
                      ),
                    );
                  } else {
                    nodes.push(...walk(el, { ...styles, color }, { alignment }));
                  }
                }
              });
              return nodes;
            };

            const parsedContent = walk(doc.body);
            // Some elements might be flat TextRuns that need to be wrapped in a Paragraph
            let currentParagraphChildren: DocxNode[] = [];
            
            parsedContent.forEach((node) => {
              if (node instanceof Paragraph) {
                if (currentParagraphChildren.length > 0) {
                  children.push(new Paragraph({ children: currentParagraphChildren, spacing: { after: 120 } }));
                  currentParagraphChildren = [];
                }
                children.push(node);
              } else {
                currentParagraphChildren.push(node);
              }
            });

            if (currentParagraphChildren.length > 0) {
              children.push(new Paragraph({ children: currentParagraphChildren, spacing: { after: 120 } }));
            }

            return children;
          }),
        ],
      },
    ],
  });

  const blob = await Packer.toBlob(doc);
  const url = URL.createObjectURL(blob);
  const element = document.createElement("a");
  
  element.setAttribute("href", url);
  element.setAttribute("download", `${project.title.replace(/\s+/g, "_")}.docx`);
  
  element.style.display = "none";
  document.body.appendChild(element);
  element.click();
  document.body.removeChild(element);
  
  URL.revokeObjectURL(url);
}

/**
 * Triggers the browser print dialog.
 * Expects the page to have @media print styles configured.
 */
export function triggerPdfExport() {
  if (typeof window !== "undefined") {
    window.print();
  }
}

/**
 * EPUB generation lives in its own module (it is a fair amount of XML), but is
 * re-exported here so every export format has one import site.
 */
export { downloadEpub, buildEpubBlob } from "./epub-utils";
