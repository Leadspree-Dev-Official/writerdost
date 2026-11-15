import type { KdpLaunchKit } from "./kdp-types";

export interface GenerateKdpInput {
  title: string;
  description?: string;
  audience?: string;
  tone?: string;
  genre?: string;
  chapters?: Array<{ title: string; content?: string }>;
}

export function buildKdpSystemPrompt(): string {
  return `You are a world-class Amazon KDP (Kindle Direct Publishing) Book Marketing and Launch Strategist.
Your task is to take a manuscript's title, synopsis, audience, tone, and chapter structure, and generate a high-converting, professional Amazon KDP Launch Kit.

You MUST respond strictly with valid JSON conforming to this schema (no extra commentary, no markdown code block wrappers):
{
  "headline": "A gripping 8-15 word punchy headline that hooks readers instantly",
  "htmlDescription": "Amazon-formatted HTML description using ONLY supported KDP HTML tags (<h2>, <p>, <b>, <i>, <ul>, <li>, <hr>). Start with a compelling hook headline in <h2>, introduce the central problem, use <ul><li> for key benefits/takeaways, add social proof/guarantee, and finish with a strong Call To Action.",
  "plainDescription": "The exact same description formatted cleanly in plain text for non-HTML retailers.",
  "searchKeywords": [
    "keyword 1 (2-4 words, high search intent)",
    "keyword 2",
    "keyword 3",
    "keyword 4",
    "keyword 5",
    "keyword 6",
    "keyword 7"
  ],
  "recommendedCategories": [
    {
      "category": "Main BISAC Category Path (e.g. Business & Money > Entrepreneurship > Small Business)",
      "rationale": "Why this category gives the book high visibility and bestseller potential"
    },
    {
      "category": "Secondary BISAC Category Path",
      "rationale": "Target audience alignment explanation"
    },
    {
      "category": "Niche/Subgenre Category Path",
      "rationale": "High relevance with less competition to hit top 100 ranks"
    }
  ],
  "targetAudienceHook": "One precise sentence explaining who this book is urgently for and the exact outcome they will achieve.",
  "socialPosts": {
    "twitterThread": [
      "Tweet 1 (The Hook): A viral opening tweet announcing the book and teasing the biggest contrarian insight.",
      "Tweet 2 (The Problem): Why traditional advice fails.",
      "Tweet 3 (The Framework): The core principle revealed in the book.",
      "Tweet 4 (The Transformation): What readers unlock after finishing it.",
      "Tweet 5 (The Call to Action): Link and invitation to read on Kindle / Amazon."
    ],
    "linkedinPost": "A high-engagement, well-spaced long-form LinkedIn post with clear line breaks, bulleted insights, and professional CTA.",
    "newsletterTeaser": "A personal, authentic email newsletter announcing the book launch to subscribers with an exclusive launch week offer."
  },
  "pricingRecommendation": {
    "suggestedPriceUsd": "$4.99 (or $2.99 for launch week, rising to $9.99 for print)",
    "kdpRoyaltyTier": "70%",
    "strategy": "Explain the price point rationale, launch discount pricing strategy, and how to maximize Amazon algorithmic momentum."
  }
}`;
}

export function buildKdpUserPrompt(input: GenerateKdpInput): string {
  const chapterTitles = (input.chapters || [])
    .slice(0, 15)
    .map((c, i) => `${i + 1}. ${c.title}`)
    .join("\n");

  return `Book Title: ${input.title}
Core Synopsis: ${input.description || "Comprehensive guide and storytelling manuscript."}
Target Audience: ${input.audience || "General Enthusiasts and Professionals"}
Writing Tone: ${input.tone || "Authoritative, engaging, accessible"}
Genre/Topic: ${input.genre || "Non-fiction / Professional guide"}

Table of Contents / Chapter Outlines:
${chapterTitles || "Standard structured chapters."}

Generate the complete, high-converting Amazon KDP Launch Kit now in valid JSON.`;
}

/** Fallback generator when offline or in mock mode */
export function generateLocalKdpFallback(input: GenerateKdpInput): KdpLaunchKit {
  const cleanTitle = input.title || "The Ultimate Field Manual";
  const audience = input.audience || "dedicated creators and professionals";

  return {
    headline: `Transform How You Master ${cleanTitle} — The Proven Roadmap for Serious Results`,
    htmlDescription: `<h2>Are you ready to unlock the true potential of ${cleanTitle}?</h2>
<p>Most readers struggle because traditional advice is either too academic or filled with outdated fluff. <b>${cleanTitle}</b> cuts through the noise with an actionable, step-by-step masterclass tailored specifically for ${audience}.</p>
<p>Inside this comprehensive guide, you will discover:</p>
<ul>
  <li><b>The Core Framework:</b> Understand the foundational principles that top practitioners use daily.</li>
  <li><b>Actionable Tactics:</b> Practical execution strategies you can deploy starting today.</li>
  <li><b>Avoid Common Traps:</b> How to identify and sidestep the costly pitfalls that derail 90% of beginners.</li>
  <li><b>The Long-Term Roadmap:</b> Scalable blueprints designed to build sustainable, compounding mastery.</li>
</ul>
<p>Whether you are starting from scratch or looking to sharpen your edge, this book gives you the unfair advantage you need.</p>
<hr/>
<p><b>Scroll up and grab your copy today to begin your journey!</b></p>`,
    plainDescription: `Are you ready to unlock the true potential of ${cleanTitle}?

Most readers struggle because traditional advice is either too academic or filled with outdated fluff. ${cleanTitle} cuts through the noise with an actionable, step-by-step masterclass tailored specifically for ${audience}.

Inside this comprehensive guide, you will discover:
- The Core Framework: Understand the foundational principles that top practitioners use daily.
- Actionable Tactics: Practical execution strategies you can deploy starting today.
- Avoid Common Traps: How to identify and sidestep the costly pitfalls that derail 90% of beginners.
- The Long-Term Roadmap: Scalable blueprints designed to build sustainable, compounding mastery.

Whether you are starting from scratch or looking to sharpen your edge, this book gives you the unfair advantage you need.

Scroll up and grab your copy today to begin your journey!`,
    searchKeywords: [
      `${cleanTitle.toLowerCase()} guide`,
      `how to master ${input.genre?.toLowerCase() || "skills"}`,
      `${audience.toLowerCase()} handbook`,
      "practical step by step blueprints",
      "modern strategies for results",
      "actionable growth frameworks",
      "proven techniques and case studies",
    ],
    recommendedCategories: [
      {
        category: "Non-Fiction > Reference > Handbooks & Manuals",
        rationale: "Broad reach with high intent buyers looking for practical instruction.",
      },
      {
        category: "Business & Money > Skills & Personal Success",
        rationale: "Strong algorithmic recommendation overlap with ambitious readers.",
      },
      {
        category: "Education & Teaching > Self-Improvement",
        rationale: "Lighter competition tier enabling faster ranking into the Amazon Top 50.",
      },
    ],
    targetAudienceHook: `For ${audience} seeking a battle-tested blueprint to achieve measurable results in record time.`,
    socialPosts: {
      twitterThread: [
        `🧵 1/5: Most people approaching ${cleanTitle} make the same costly mistake: they focus on speed instead of foundation. Today, I'm releasing the complete blueprint to change that.`,
        `2/5: In Chapter 1, we dismantle why conventional wisdom fails 90% of beginners. The secret isn't more effort — it's removing friction from your core workflow.`,
        `3/5: Key insight: small, high-leverage adjustments create disproportionate compounding over time. We break down the exact checklist inside.`,
        `4/5: Whether you've tried before or are starting fresh, this was written as the field guide I wish I had when I started.`,
        `5/5: Available now on Amazon Kindle! Check it out here and start reading your copy today 👇 [Link]`,
      ],
      linkedinPost: `I'm thrilled to announce the launch of my new book: "${cleanTitle}".\n\nOver the past year, one question kept surfacing from colleagues and peers: "How do we bridge the gap between theory and real-world execution?"\n\nThis book is the direct answer.\n\nInside, you'll learn:\n• The foundational principles behind consistent success\n• How to navigate complex bottlenecks without burnout\n• Proven frameworks tested in the trenches\n\nIf you're in ${audience}, this book was written specifically for you.\n\nGrab your copy today on Amazon Kindle (link in comments)!`,
      newsletterTeaser: `Subject: It's finally here: "${cleanTitle}" is live!\n\nHey friend,\n\nAfter months of writing, refining, and testing, my new book "${cleanTitle}" is officially live on Amazon!\n\nIf you've ever felt frustrated by contradictory advice, this book provides the definitive roadmap to achieve real clarity.\n\nFor the next 48 hours, it's available at a special launch price. Click below to secure your copy and let me know your favorite takeaway!\n\n[Grab Your Copy on Amazon]`,
    },
    pricingRecommendation: {
      suggestedPriceUsd: "$4.99 ($0.99 - $2.99 launch promo)",
      kdpRoyaltyTier: "70%",
      strategy: "Launch at $2.99 for 5 days to drive early volume and reviews, then elevate to $4.99–$6.99 for optimal 70% royalty margins.",
    },
    generatedAt: new Date().toISOString(),
  };
}
