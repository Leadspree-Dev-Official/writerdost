export interface BlogTemplate {
  id: string;
  name: string;
  category: "Guides" | "Marketing" | "Thought Leadership" | "Reviews";
  description: string;
  icon: string;
  targetWords: number;
  sampleTitle: string;
  suggestedKeywords: string[];
  metaDescription: string;
  systemPromptAddendum: string;
  scaffoldMarkdown: string;
}

export const EDITORIAL_EXCELLENCE_PROMPT = `
EDITORIAL QUALITY & FLOW EVIDENCE RULES:
1. FLOW EVIDENCE TRIPLE: Any empirical statistics, market sizes, or benchmarks cited must include a 4-digit year anchor (e.g. "In a 2024 analysis...") and explicit publisher or organization attribution. Never invent unverifiable stats.
2. ANTI-AI CLICHÉ PURGE: Strictly avoid AI boilerplate phrases like "delve into", "tapestry", "in today's fast-paced digital world", "game-changer", "beacon", "testament", or "look no further". Write with natural rhythm, conversational punch, and clear sentence burstiness.
3. SEARCH INTENT: Deliver high value immediately in the opening section with direct answers rather than lengthy throat-clearing.
`;

export const BLOG_TEMPLATES: BlogTemplate[] = [
  {
    id: "how-to-guide",
    name: "Step-by-Step How-To Guide",
    category: "Guides",
    description: "Actionable tutorial with prerequisites, clear numbered steps, common pitfalls, and FAQs.",
    icon: "format_list_numbered",
    targetWords: 1500,
    sampleTitle: "How to Master [Skill / Tool]: A Complete Step-by-Step Guide",
    suggestedKeywords: ["how to", "step-by-step tutorial", "beginner guide", "best practices"],
    metaDescription: "Learn how to master [topic] with this comprehensive step-by-step tutorial, covering preparation, execution, and troubleshooting.",
    systemPromptAddendum: "Format this as an actionable step-by-step guide. Include a concise intro, 'Prerequisites / What You Need', numbered H2/H3 steps with clear explanations, 'Common Mistakes & Troubleshooting', and an FAQ section.",
    scaffoldMarkdown: `# How to Master [Topic]: A Complete Step-by-Step Guide

## Introduction
*Briefly explain why this topic matters, who this is for, and the outcome readers will achieve by following this guide.*

## What You Need (Prerequisites)
- Prerequisite 1
- Prerequisite 2
- Tool / Resource needed

---

## Step 1: Getting Started with [Initial Step]
*Explain the first action clearly. Include helpful tips or warnings.*

## Step 2: Executing [Core Action]
*Dive into the core technique or implementation.*

## Step 3: Refining and Testing
*Show how to check that everything is working properly.*

---

## Common Mistakes & How to Avoid Them
- **Pitfall 1:** How to handle or prevent it.
- **Pitfall 2:** What to watch out for.

## Frequently Asked Questions (FAQ)
### Q: [Common question 1]?
A: [Clear, direct answer].

### Q: [Common question 2]?
A: [Clear, direct answer].

## Conclusion & Next Steps
*Summarize key takeaways and provide an actionable call to action.*
`
  },
  {
    id: "listicle",
    name: "High-Traffic Listicle",
    category: "Marketing",
    description: "Skimmable, engaging roundup of top tools, tips, strategies, or industry resources.",
    icon: "checklist",
    targetWords: 1200,
    sampleTitle: "10 Proven Strategies to [Achieve Goal] (Tested & Ranked)",
    suggestedKeywords: ["best tools", "top strategies", "tips and tricks", "proven methods"],
    metaDescription: "Discover the top proven strategies to achieve [goal] faster, featuring expert analysis and real-world recommendations.",
    systemPromptAddendum: "Format this as an engaging, highly skimmable listicle. Each item should have a clear numbered H2, a quick verdict or summary bullet, core explanation, pros/cons or key takeaways, and a concise wrap-up.",
    scaffoldMarkdown: `# 10 Proven Strategies to [Achieve Goal] (Tested & Ranked)

## Introduction
*Hook the reader, highlight the common struggles, and explain how these curated solutions were chosen.*

---

## 1. [Strategy / Tool Name]
- **Best for:** [Specific use case]
- **Key advantage:** [Primary strength]

*Detailed breakdown of why this strategy works and how to implement it.*

## 2. [Strategy / Tool Name]
- **Best for:** [Specific use case]
- **Key advantage:** [Primary strength]

*Detailed breakdown and practical advice.*

## 3. [Strategy / Tool Name]
- **Best for:** [Specific use case]
- **Key advantage:** [Primary strength]

*Detailed breakdown and practical advice.*

---

## Summary & Quick Comparison
| Item | Best For | Difficulty | Impact |
| :--- | :--- | :--- | :--- |
| Option 1 | Beginners | Low | High |
| Option 2 | Advanced | Medium | High |

## Final Thoughts & Recommendation
*Which one should readers choose right now? End with a strong closing thought.*
`
  },
  {
    id: "product-comparison",
    name: "Product Comparison & Review",
    category: "Reviews",
    description: "In-depth 'X vs Y' or product review with feature matrix, pros/cons, pricing, and final verdict.",
    icon: "compare_arrows",
    targetWords: 1800,
    sampleTitle: "[Product A] vs. [Product B]: Which Is Best in 2026?",
    suggestedKeywords: ["comparison", "vs review", "pricing", "pros and cons", "verdict"],
    metaDescription: "Detailed comparison of [Product A] vs [Product B]. Compare features, pricing, pros, cons, and see our final verdict.",
    systemPromptAddendum: "Format this as an unbiased, data-backed comparison article. Structure with an executive summary, side-by-side feature comparison table, deep dive into each contender with pros & cons, pricing breakdown, and a clear verdict by persona.",
    scaffoldMarkdown: `# [Product A] vs. [Product B]: Which Is Better in 2026?

## The Quick Verdict (TL;DR)
*Give readers an immediate answer: Who should pick Product A, and who should pick Product B?*

---

## Feature Comparison Matrix
| Feature | [Product A] | [Product B] |
| :--- | :--- | :--- |
| Core Strength | ... | ... |
| Ease of Use | ... | ... |
| Pricing | ... | ... |
| Value for Money | ... | ... |

---

## Deep Dive: [Product A]
### What makes it stand out?
*Discuss main capabilities, user experience, and ideal workflows.*

- **Pros:**
  - Benefit 1
  - Benefit 2
- **Cons:**
  - Limitation 1

---

## Deep Dive: [Product B]
### What makes it stand out?
*Discuss main capabilities, user experience, and ideal workflows.*

- **Pros:**
  - Benefit 1
  - Benefit 2
- **Cons:**
  - Limitation 1

---

## Pricing & Value Comparison
*Analyze the tiers, free plans, and enterprise scalability.*

## Final Verdict: Which Should You Choose?
- **Choose [Product A] if:** [Condition]
- **Choose [Product B] if:** [Condition]
`
  },
  {
    id: "thought-leadership",
    name: "Thought Leadership & Opinion",
    category: "Thought Leadership",
    description: "Compelling contrarian or forward-looking perspective on industry trends and future shifts.",
    icon: "psychology",
    targetWords: 1400,
    sampleTitle: "Why the Traditional Approach to [Industry Topic] Is Dead",
    suggestedKeywords: ["future of industry", "opinion", "market trends", "industry analysis"],
    metaDescription: "An in-depth perspective on the fundamental shifts transforming [industry] and what leaders must do to stay ahead.",
    systemPromptAddendum: "Write a high-conviction thought leadership essay. Avoid buzzwords and superficial fluff. Build a strong thesis, present counter-intuitive insights backed by rationale and real-world parallels, and conclude with visionary guidance.",
    scaffoldMarkdown: `# Why the Traditional Approach to [Industry Topic] Is Dead

## The Status Quo Is Broken
*Open with a provocative observation or personal anecdote challenging conventional wisdom in the industry.*

## The Paradigm Shift
*Explain what changed: technology, consumer psychology, economic shifts, or systemic problems that rendered old methods obsolete.*

## 3 Core Truths Leaders Overlook
### 1. [Truth / Observation One]
*Detailed insight with evidence or concrete examples.*

### 2. [Truth / Observation Two]
*Detailed insight with evidence or concrete examples.*

### 3. [Truth / Observation Three]
*Detailed insight with evidence or concrete examples.*

## What the Future Actually Looks Like
*Paint a picture of the next 3-5 years. What will winning companies and creators do differently?*

## Key Takeaway
*Distill the central lesson into one actionable, memorable philosophy.*
`
  },
  {
    id: "case-study",
    name: "Customer / Growth Case Study",
    category: "Marketing",
    description: "Proof-driven story detailing Problem $\\rightarrow$ Strategy $\\rightarrow$ Execution $\\rightarrow$ Measurable Results.",
    icon: "trending_up",
    targetWords: 1200,
    sampleTitle: "Case Study: How [Client / Brand] Achieved [Result] in [Timeframe]",
    suggestedKeywords: ["case study", "growth story", "measurable results", "customer success"],
    metaDescription: "Discover how [Subject] achieved [Key Metric] by implementing [Strategy], including breakdown of challenges, solutions, and key metrics.",
    systemPromptAddendum: "Format this as an authoritative case study. Break it down into: Background & Challenge, The Strategy / Framework, Step-by-Step Implementation, Concrete Metrics / Results, and 3 Actionable Lessons for readers.",
    scaffoldMarkdown: `# Case Study: How [Subject] Achieved [Result] in [Timeframe]

## Executive Summary
- **Client / Subject:** [Name / Industry]
- **Challenge:** [Core obstacle]
- **Solution:** [Implemented system]
- **Key Results:** [e.g. +140% growth, 3x efficiency]

---

## The Challenge
*What was holding them back before? Include concrete stakes and friction points.*

## The Strategy
*What framework or unique methodology was chosen to solve the root cause?*

## Step-by-Step Execution
1. **Phase 1: Diagnosis & Setup** - *What happened first.*
2. **Phase 2: Deployment** - *How the work rolled out.*
3. **Phase 3: Optimization** - *Fine-tuning based on data.*

---

## Measurable Results
- **Metric 1:** +XX% improvement
- **Metric 2:** Reduced turnaround from X days to Y hours
- **Metric 3:** \$XX revenue generated / saved

## Lessons You Can Apply Today
*Extract 3 universally applicable takeaways that the reader can execute in their own business or craft.*
`
  }
];
