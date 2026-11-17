/**
 * SEO & SXO (Search Experience Optimization) Engine
 *
 * Generates valid JSON-LD schema (Article, FAQPage) and structured Table of Contents
 * with jump anchors to optimize for Google Featured Snippets and AI Overviews.
 */

export interface FaqItem {
  question: string;
  answer: string;
}

/**
 * Parses H2/H3 FAQ sections or Q&A patterns from markdown content.
 */
export function extractFaqsFromMarkdown(markdown: string): FaqItem[] {
  const faqs: FaqItem[] = [];
  if (!markdown) return faqs;

  // Pattern 1: ### Q: Question? \n A: Answer
  const qaRegex = /(?:###?\s*(?:Q:?\s*)?([^\n\?]+\?))\s*\n+(?:A:?\s*)?([\s\S]*?)(?=\n###?|\Z)/gi;
  let match: RegExpExecArray | null;

  while ((match = qaRegex.exec(markdown)) !== null) {
    const question = match[1].replace(/^[#\*\s]+/, "").trim();
    const answer = match[2]
      .replace(/^[\*\s>]+/, "")
      .replace(/\n+/g, " ")
      .trim();

    if (question && answer && question.length < 150 && answer.length < 600) {
      faqs.push({ question, answer });
    }
  }

  return faqs.slice(0, 10);
}

/**
 * Builds standard Google-compliant FAQPage JSON-LD schema.
 */
export function generateFaqSchema(faqs: FaqItem[]): string {
  if (!faqs.length) return "";

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((faq) => ({
      "@type": "Question",
      "name": faq.question,
      "acceptedAnswer": {
        "@type": "Answer",
        "text": faq.answer,
      },
    })),
  };

  return JSON.stringify(schema, null, 2);
}

/**
 * Builds standard Google-compliant Article JSON-LD schema.
 */
export function generateArticleSchema(params: {
  title: string;
  description: string;
  author?: string;
  publisherName?: string;
  datePublished?: string;
  url?: string;
  imageUrl?: string;
}): string {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": params.title.slice(0, 110),
    "description": params.description,
    "author": {
      "@type": "Person",
      "name": params.author || "Editorial Staff",
    },
    "publisher": {
      "@type": "Organization",
      "name": params.publisherName || "Writerdost Publications",
    },
    "datePublished": params.datePublished || new Date().toISOString(),
  };

  if (params.url) schema.url = params.url;
  if (params.imageUrl) schema.image = params.imageUrl;

  return JSON.stringify(schema, null, 2);
}

/**
 * Generates an automated Table of Contents with jump anchors to capture Google Featured Snippets.
 */
export function generateJumpTableOfContents(markdown: string): {
  tocMarkdown: string;
  bodyWithAnchors: string;
} {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  const items: Array<{ level: number; text: string; slug: string }> = [];

  let match: RegExpExecArray | null;
  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length;
    const text = match[2].trim();
    // Exclude title, wrap-up or FAQ from TOC if desired
    const slug = text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");

    items.push({ level, text, slug });
  }

  if (items.length < 3) {
    return { tocMarkdown: "", bodyWithAnchors: markdown };
  }

  const tocLines = [
    "### 📑 Table of Contents",
    ...items.map((item) => {
      const indent = item.level === 3 ? "  *" : "*";
      return `${indent} [${item.text}](#${item.slug})`;
    }),
    "---",
  ];

  const tocMarkdown = tocLines.join("\n");

  // Inject anchor tags before headings
  const bodyWithAnchors = markdown.replace(/^(#{2,3})\s+(.+)$/gm, (_full, hashes, headingText) => {
    const slug = headingText
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "");
    return `<a id="${slug}"></a>\n${hashes} ${headingText.trim()}`;
  });

  return { tocMarkdown, bodyWithAnchors };
}

/**
 * Measures readability and basic entity coverage metrics.
 */
export function calculateEditorialMetrics(text: string): {
  wordCount: number;
  readingTimeMinutes: number;
  sentenceCount: number;
  averageSentenceLength: number;
} {
  const clean = text.replace(/<[^>]*>/g, " ").replace(/[#\*_`\->]/g, " ");
  const words = clean.trim().split(/\s+/).filter(Boolean);
  const sentences = clean.split(/[.!?]+/).filter((s) => s.trim().length > 0);

  const wordCount = words.length;
  const sentenceCount = Math.max(1, sentences.length);
  const averageSentenceLength = Number((wordCount / sentenceCount).toFixed(1));
  const readingTimeMinutes = Math.max(1, Math.ceil(wordCount / 220));

  return {
    wordCount,
    readingTimeMinutes,
    sentenceCount,
    averageSentenceLength,
  };
}
