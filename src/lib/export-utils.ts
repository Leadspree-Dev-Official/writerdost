import { Project } from "./app-store";
import { htmlToText } from "./markdown-utils";
import { Document, Packer, Paragraph, HeadingLevel, AlignmentType, TextRun, PageBreak } from "docx";

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

/**
 * Triggers a browser download of a text file.
 */
export function downloadTxt(filename: string, text: string) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
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
  const doc = new Document({
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
            const children: any[] = [];

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
            const walk = (node: Node, styles: any = {}, parentStyles: any = {}): any[] => {
              const nodes: any[] = [];
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
                      italic: styles.italic || false
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
                    nodes.push(...walk(el, { ...styles, color, italic: true }, { alignment }));
                  } else if (tagName === "u") {
                    nodes.push(...walk(el, { ...styles, color, underline: {} }, { alignment }));
                  } else if (tagName === "br") {
                    nodes.push(new TextRun({ break: 1 }));
                  } else if (tagName === "span") {
                    nodes.push(...walk(el, { ...styles, color }, { alignment }));
                  } else {
                    nodes.push(...walk(el, { ...styles, color }, { alignment }));
                  }
                }
              });
              return nodes;
            };

            const parsedContent = walk(doc.body);
            // Some elements might be flat TextRuns that need to be wrapped in a Paragraph
            let currentParagraphChildren: any[] = [];
            
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
