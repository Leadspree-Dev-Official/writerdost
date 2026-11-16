export type CopywritingCategory = "authority" | "sales" | "traffic";

export interface TemplateInputField {
  id: string;
  label: string;
  type: "text" | "textarea" | "select" | "tags";
  placeholder?: string;
  helpText?: string;
  options?: string[]; // for select
  defaultValue?: string;
  required?: boolean;
}

export interface CopywritingTemplate {
  id: string;
  name: string;
  category: CopywritingCategory;
  badge?: string;
  icon: string;
  headline: string;
  description: string;
  framework: string; // e.g. "PAS", "AIDA", "Hook-Story-Offer"
  inputFields: TemplateInputField[];
  systemPrompt: string;
  promptBuilder: (inputs: Record<string, unknown>) => string;
}

export const COPYWRITING_TEMPLATES: CopywritingTemplate[] = [
  // ==========================================
  // SUITE B: SALES & CONVERSION (TIER 1)
  // ==========================================
  {
    id: "cold-email",
    name: "B2B Cold Outreach Email (PAS)",
    category: "sales",
    badge: "High Response",
    icon: "mail",
    headline: "High-reply B2B cold emails powered by the Problem-Agitate-Solve framework",
    description: "Generate concise, highly personalized B2B cold emails that hook prospects with acute pain points, agitate the cost of inaction, and pitch low-friction calls to action.",
    framework: "PAS (Problem - Agitate - Solve)",
    inputFields: [
      {
        id: "prospectRole",
        label: "Target Prospect Role & Industry",
        type: "text",
        placeholder: "e.g., Head of Marketing at Series A-B B2B SaaS companies",
        helpText: "Who is reading this email? Be specific about their seniority and market.",
        required: true,
      },
      {
        id: "painPoint",
        label: "Acute Pain Point / Problem",
        type: "textarea",
        placeholder: "e.g., Customer acquisition cost on Meta/LinkedIn ads jumped 45% in Q3 with declining lead quality.",
        helpText: "The primary operational or revenue bottleneck they are experiencing.",
        required: true,
      },
      {
        id: "solution",
        label: "Your Solution / Offer",
        type: "textarea",
        placeholder: "e.g., An organic programmatic SEO content engine that generates qualified demo bookings in 90 days without paid ad spend.",
        helpText: "How you solve their problem with low perceived risk and fast time-to-value.",
        required: true,
      },
      {
        id: "proof",
        label: "Social Proof / Metric",
        type: "text",
        placeholder: "e.g., Scaled CloudFlow from 8k to 140k monthly organic visits and $320k in ARR pipeline.",
        helpText: "A hard metric or client name that proves you have done this before.",
      },
      {
        id: "cta",
        label: "Call to Action (CTA)",
        type: "text",
        placeholder: "e.g., Open to a 5-minute video teardown showing where your competitors are getting free traffic?",
        defaultValue: "Mind if I send over a 2-minute video teardown with the exact breakdown?",
        helpText: "Keep it low-friction (permission-based or light question, avoid hard 30-min calendar asks).",
        required: true,
      },
      {
        id: "tone",
        label: "Tone of Voice",
        type: "select",
        options: [
          "Direct & Executive",
          "Conversational & Casual",
          "Consultative & Analytical",
          "Bold & Pattern-Interrupting",
        ],
        defaultValue: "Direct & Executive",
        helpText: "Match the personality of your brand and prospect level.",
      },
    ],
    systemPrompt: `You are an elite B2B direct-response copywriter specialized in cold outbound campaigns that consistently achieve 35%+ open rates and 8-12%+ positive reply rates.

Key Copywriting Directives:
1. BREVITY: Cold emails must be between 75 and 125 words. Long emails get deleted immediately.
2. PAS FRAMEWORK:
   - Problem: Call out a specific, real-world symptom the prospect suffers from.
   - Agitate: Briefly illustrate the friction, wasted capital, or anxiety this causes if ignored.
   - Solve: Introduce the mechanism and social proof cleanly, then propose a zero-pressure, interest-based CTA.
3. ANTI-AI: Never use clichés like "I hope this email finds you well", "In today's fast-paced digital world", "Game changer", "Synergy", or "Unlock your potential".
4. READABILITY: Use short, punchy paragraphs (1-2 sentences each). Write at a 5th-grade reading level.
5. Provide 3 high-converting, curiosity-driven subject line options with under 4 words each.
6. Provide a primary cold email and a short 48-hour follow-up bump message.`,
    promptBuilder: (inputs) => `Craft an elite B2B Cold Outreach campaign based on these parameters:
- Target Prospect: ${inputs.prospectRole || "B2B Decision Maker"}
- Core Pain Point: ${inputs.painPoint || "High acquisition costs and inefficient workflows"}
- Our Solution/Offer: ${inputs.solution || "Automated growth pipeline"}
- Proof/Metric: ${inputs.proof || "Demonstrated 3x pipeline growth across multiple case studies"}
- Desired Call to Action: ${inputs.cta || "Mind if I send over a 2-minute teardown?"}
- Tone of Voice: ${inputs.tone || "Direct & Executive"}

Please format your response in clean Markdown with:
1. ### 📬 Subject Line Options (3 low-spam, under-4-word hooks)
2. ### ✉️ Cold Email Body (PAS format, under 125 words, with bracketed personalization tags [First Name], [Company])
3. ### ⏱️ 48-Hour Follow-Up Bump (Under 50 words, natural follow-up)
4. ### 💡 Outreach Strategy Note (Key trigger to customize before sending)`,
  },

  {
    id: "sales-pitch",
    name: "High-Converting Sales Pitch",
    category: "sales",
    badge: "Conversion Engine",
    icon: "campaign",
    headline: "Irresistible elevator pitches and 60-second product presentations that close",
    description: "Transform product features into persuasive sales pitches using Hook-Story-Offer and Before-After-Bridge frameworks for sales calls, demos, and landing pages.",
    framework: "Hook - Story - Offer / Before - After - Bridge",
    inputFields: [
      {
        id: "productName",
        label: "Product or Service Name",
        type: "text",
        placeholder: "e.g., Writerdost AI / RevenuePulse",
        required: true,
      },
      {
        id: "targetAudience",
        label: "Target Customer / Buyer Persona",
        type: "text",
        placeholder: "e.g., Busy content marketers and boutique agency owners producing 20+ articles monthly",
        required: true,
      },
      {
        id: "coreProblem",
        label: "Current Frustration / Core Problem",
        type: "textarea",
        placeholder: "e.g., Spending 15+ hours per week editing robotic AI content and fixing hallucinated facts.",
        required: true,
      },
      {
        id: "keyFeatures",
        label: "Unique Mechanism & Key Features",
        type: "textarea",
        placeholder: "e.g., Multi-agent orchestration with dedicated research, anti-slop humanizer, and automated fact-checking.",
        required: true,
      },
      {
        id: "transformation",
        label: "The Transformation (Before vs. After)",
        type: "textarea",
        placeholder: "e.g., From drowning in sloppy drafts to publishing authoritative, human-grade 3,000-word guides in under 30 minutes.",
        required: true,
      },
      {
        id: "pitchFormat",
        label: "Pitch Format / Length",
        type: "select",
        options: [
          "60-Second Elevator Pitch",
          "Sales Call Opening Hook",
          "Hero Section Pitch (Landing Page)",
          "3-Minute Investor / Client Teaser",
        ],
        defaultValue: "60-Second Elevator Pitch",
      },
    ],
    systemPrompt: `You are a world-class direct-response sales strategist and messaging architect trained on the principles of Alex Hormozi, Dan Kennedy, and modern SaaS conversion copywriting.

Your goal is to build an irresistible sales pitch that instantly commands attention, highlights the status quo gap, demonstrates a proprietary mechanism, and presents an obvious next step.

Principles:
- Hook the visceral problem immediately (no pleasantries or empty throat-clearing).
- Frame the unique mechanism as the ONLY logical bridge between where they are and where they want to be.
- Make the transformation clear, measurable, and tangible.
- Deliver high emotional resonance while maintaining total commercial credibility.`,
    promptBuilder: (inputs) => `Create a high-converting ${inputs.pitchFormat || "60-Second Elevator Pitch"} for:
- Product/Service: ${inputs.productName}
- Target Buyer: ${inputs.targetAudience}
- Core Frustration: ${inputs.coreProblem}
- Unique Mechanism/Features: ${inputs.keyFeatures}
- Before vs. After Transformation: ${inputs.transformation}

Format the response in clean Markdown with:
1. ### 🎯 The Hook (3 alternative opening sentences to stop them in their tracks)
2. ### ⚡ The Full Pitch (${inputs.pitchFormat || "60-Second Pitch"} with natural pause cues)
3. ### 🛡️ The Objection Buster (How to effortlessly neutralize the #1 reflex doubt)
4. ### 🚀 The Immediate Call to Action`,
  },

  {
    id: "google-ads",
    name: "Google Responsive Search Ads (RSA)",
    category: "sales",
    badge: "PPC Ready",
    icon: "ads_click",
    headline: "15 high-CTR headlines and 4 descriptions matching Google Ads character limits",
    description: "Maximize Google Ads Ad Strength scores with 15 headlines (<= 30 characters each) and 4 descriptions (<= 90 characters each) packed with keywords and clear triggers.",
    framework: "Google RSA Standard (Character-Constrained Direct Response)",
    inputFields: [
      {
        id: "productOrService",
        label: "Product or Service Name & Core Offer",
        type: "text",
        placeholder: "e.g., Writerdost AI - Automated Book & Content Studio",
        required: true,
      },
      {
        id: "targetKeywords",
        label: "Primary & Secondary Target Keywords",
        type: "text",
        placeholder: "e.g., AI book writer, long form AI content, write ebook fast",
        helpText: "Keywords to weave into headlines for high Quality Scores.",
        required: true,
      },
      {
        id: "uniqueValueProp",
        label: "Unique Value Proposition & Hooks",
        type: "textarea",
        placeholder: "e.g., Write 20,000-word manuscripts with multi-agent research. Zero AI slop, full citation grounding.",
        required: true,
      },
      {
        id: "specialOffer",
        label: "Special Offer / Guarantee / Pricing Hook",
        type: "text",
        placeholder: "e.g., Start Free Today • No Credit Card Required • Save 50%",
      },
      {
        id: "callToAction",
        label: "Primary Call to Action (CTA)",
        type: "text",
        placeholder: "e.g., Start Free Trial, Download Blueprint, See Live Demo",
        defaultValue: "Start Free Today",
        required: true,
      },
    ],
    systemPrompt: `You are an elite Google Ads PPC copywriter and Quality Score optimization specialist.

CRITICAL CHARACTER LIMIT RULES (NON-NEGOTIABLE):
- HEADLINES: Maximum 30 characters each (including spaces and punctuation). NEVER exceed 30 characters!
- DESCRIPTIONS: Maximum 90 characters each (including spaces and punctuation). NEVER exceed 90 characters!

Guidelines for Google RSA Success:
1. Provide EXACTLY 15 Headlines categorized by intent:
   - Position 1-5: Keyword-focused (match user search intent exactly)
   - Position 6-10: Benefit & Problem-solving (emotional and metric hooks)
   - Position 11-15: CTA, Social Proof, and Special Offer
2. Provide EXACTLY 4 Descriptions (<=90 characters each):
   - Highlight core benefit, differentiators, risk-reversal, and explicit CTA.
3. Every headline and description MUST display its exact character count in parentheses, e.g. "Write Your Book Today (21/30)".`,
    promptBuilder: (inputs) => `Generate a complete Google Responsive Search Ad (RSA) pack with strict character limits:
- Product/Service: ${inputs.productOrService}
- Target Keywords: ${inputs.targetKeywords}
- Unique Value Prop: ${inputs.uniqueValueProp}
- Special Offer/Incentive: ${inputs.specialOffer || "Start Free - No Card Needed"}
- Desired CTA: ${inputs.callToAction || "Start Free Today"}

Output formatted in clean Markdown with:
1. ### 🏷️ 15 Headlines (Strictly <= 30 Characters, labeled with char counts)
2. ### 📝 4 Descriptions (Strictly <= 90 Characters, labeled with char counts)
3. ### 📌 Pinning Recommendations (Best pairings for Headline 1, 2, and 3)
4. ### 🔍 Sitelink Asset Ideas (4 sitelinks with 25-char link text & descriptions)`,
  },

  {
    id: "product-description",
    name: "E-Commerce & Amazon Product Description",
    category: "sales",
    badge: "High Converting",
    icon: "shopping_bag",
    headline: "Benefit-driven product listings with Amazon-style feature bullets and SEO specs",
    description: "Convert browsers into buyers with Amazon A9-optimized titles, 5 benefit-first bullet points, and an emotional, objection-destroying product story.",
    framework: "FAB (Features - Advantages - Benefits) & Amazon A9 SEO",
    inputFields: [
      {
        id: "productTitle",
        label: "Product Name & Model",
        type: "text",
        placeholder: "e.g., ErgoMax Pro Ergonomic Office Chair with 3D Lumbar Support",
        required: true,
      },
      {
        id: "targetCustomer",
        label: "Ideal Customer / Target Buyer",
        type: "text",
        placeholder: "e.g., Remote software engineers and gamers sitting 8+ hours a day suffering from lower back stiffness",
        required: true,
      },
      {
        id: "rawSpecs",
        label: "Raw Specifications & Materials",
        type: "textarea",
        placeholder: "e.g., Breathable Korean mesh, aluminum alloy base, 135-degree recline, class-4 gas lift, supports up to 300 lbs.",
        required: true,
      },
      {
        id: "keyBenefits",
        label: "Top 3-5 Benefits / Differentiators",
        type: "textarea",
        placeholder: "e.g., Eliminates chronic lower back fatigue, stays cool all summer, sets up in 15 minutes with included hex wrench.",
        required: true,
      },
      {
        id: "searchKeywords",
        label: "Search & Backend Keywords",
        type: "text",
        placeholder: "e.g., ergonomic desk chair, lumbar support chair, breathable mesh computer chair",
      },
      {
        id: "marketplace",
        label: "Target Store / Marketplace",
        type: "select",
        options: [
          "Amazon Listing (5 Bullets + Story)",
          "Shopify / DTC Storefront",
          "Etsy / Artisan Craft",
          "B2B Wholesale Catalog",
        ],
        defaultValue: "Amazon Listing (5 Bullets + Story)",
      },
    ],
    systemPrompt: `You are a master e-commerce conversion copywriter and Amazon A9 algorithm specialist.

Copy Principles:
1. SEO TITLE: Craft a keyword-dense, readable title (under 200 characters) integrating brand, key features, material, and target use case.
2. 5 BULLET POINTS: Use the standard capitalized BENEFIT LEAD-IN format: [BENEFIT IN CAPS] - Followed by vivid explanation connecting technical specs to real-life daily relief.
3. STORY & EMOTIONAL HOOK: Overcome the customer's primary hesitations and highlight the lifestyle upgrade.
4. SPECIFICATIONS MATRIX: Clean, skimmable summary of dimensions, materials, and warranty.`,
    promptBuilder: (inputs) => `Write an e-commerce product listing for ${inputs.marketplace || "Amazon"}:
- Product: ${inputs.productTitle}
- Target Customer: ${inputs.targetCustomer}
- Raw Specs: ${inputs.rawSpecs}
- Key Benefits: ${inputs.keyBenefits}
- Search Keywords: ${inputs.searchKeywords || "None specified"}

Deliver in clean Markdown:
1. ### 📦 SEO-Optimized Product Title (under 200 chars)
2. ### ⚡ 5 Amazon-Style Feature Bullets (CAPITALIZED BENEFIT HEADERS)
3. ### 📖 Brand Story & Long Description (DTC / A+ Content style)
4. ### 📋 Quick Specs & Care Table
5. ### 🛡️ Risk-Reversal & Guarantee Statement`,
  },

  // ==========================================
  // SUITE C: TRAFFIC & VIDEO (TIER 1)
  // ==========================================
  {
    id: "youtube-script",
    name: "Viral YouTube Video Script",
    category: "traffic",
    badge: "High Retention",
    icon: "smart_display",
    headline: "Scroll-stopping YouTube scripts with visual cues, pacing beats, and high-retention hooks",
    description: "Generate structured video scripts with 3 alternative retention hooks, visual B-roll directions, pacing notes, narrative tension, and high-converting CTAs.",
    framework: "Hook - Retain - Payoff - Loop CTA",
    inputFields: [
      {
        id: "videoTopic",
        label: "Video Topic or Working Title",
        type: "text",
        placeholder: "e.g., Why Most People Fail at Building Micro-SaaS in 2026 (And How to Win)",
        required: true,
      },
      {
        id: "targetAudience",
        label: "Target Viewer Persona",
        type: "text",
        placeholder: "e.g., Indie hackers, solo developers, and aspiring tech founders looking for repeatable revenue",
        required: true,
      },
      {
        id: "primaryTakeaway",
        label: "The #1 Revelation / Core Insight",
        type: "textarea",
        placeholder: "e.g., Distribution must precede code: validate with 5 pre-orders before writing a single line of backend logic.",
        required: true,
      },
      {
        id: "videoLength",
        label: "Target Video Duration",
        type: "select",
        options: [
          "Short (3-5 minutes)",
          "Standard (8-12 minutes)",
          "Deep Dive (15-25 minutes)",
          "YouTube Shorts (60 seconds)",
        ],
        defaultValue: "Standard (8-12 minutes)",
      },
      {
        id: "keyPoints",
        label: "Key Points or Story Beats (3-5 items)",
        type: "textarea",
        placeholder: "1. The 2026 SaaS landscape trap\n2. The Audience-First framework\n3. Real case study ($0 to $4k MRR in 60 days)\n4. The 3 tools you actually need",
        required: true,
      },
      {
        id: "videoTone",
        label: "Presenter Delivery Tone",
        type: "select",
        options: [
          "Energetic & Fast-Paced",
          "Educational & Analytical",
          "Story-Driven & Documentary",
          "Provocative & Contrarian",
        ],
        defaultValue: "Educational & Analytical",
      },
    ],
    systemPrompt: `You are an elite YouTube scriptwriter and video retention consultant for channels with 1M+ subscribers.

Scripting Rules:
1. THE 10-SECOND RULE: The first 10 seconds determine 80% of retention. Never start with "Hey guys, welcome back to my channel". Dive straight into the stakes, curiosity gap, or contrarian premise.
2. VISUAL DIRECTING: Include [VISUAL / B-ROLL / GRAPHIC] instructions for the video editor alongside spoken audio.
3. OPEN LOOPS: Place micro-cliffhangers before transitions to keep viewers from clicking away.
4. PATTERN INTERRUPTS: Reset visual pacing every 45-60 seconds (zooms, graphic callouts, sound cues).
5. SEAMLESS LOOP CTA: Transition smoothly into the end-screen recommendation without telegraphing the exit.`,
    promptBuilder: (inputs) => `Write a high-retention YouTube video script for a ${inputs.videoLength || "Standard 8-12 minute"} video:
- Topic: ${inputs.videoTopic}
- Target Viewer: ${inputs.targetAudience}
- Core Insight: ${inputs.primaryTakeaway}
- Main Beats: ${inputs.keyPoints}
- Tone: ${inputs.videoTone || "Educational & Analytical"}

Deliver in clean Markdown:
1. ### 🪝 3 Alternative Retention Hooks (Curiosity, Contrarian, Direct Value)
2. ### 🎬 Full Video Script with [VISUAL] & [AUDIO] Columns
   - Include pacing markers and on-screen text directions
3. ### 🔄 Mid-Roll Retention Reset
4. ### 🚀 End-Screen Seamless Call to Action & Video Recommendation`,
  },

  // ==========================================
  // SUITE A: AUTHORITY & PUBLISHING (TIER 1)
  // ==========================================
  {
    id: "book-outline",
    name: "Non-Fiction Book Architecture & Outline",
    category: "authority",
    badge: "Author Standard",
    icon: "menu_book",
    headline: "Comprehensive multi-chapter book outline with thematic arcs and chapter goals",
    description: "Architect a publication-ready non-fiction book outline with catchy title options, core premise, reader transformation journey, detailed chapter summaries, and milestone exercises.",
    framework: "3-Act Non-Fiction Architecture & Reader Transformation Journey",
    inputFields: [
      {
        id: "bookIdea",
        label: "Book Concept & Core Premise",
        type: "textarea",
        placeholder: "e.g., A tactical guide teaching mid-career corporate managers how to transition into fractional consulting and land $10k/month retainers.",
        required: true,
      },
      {
        id: "targetReader",
        label: "Target Reader & Current Pain Point",
        type: "text",
        placeholder: "e.g., Senior directors and VPs in tech/finance feeling burnt out and capped on career progression.",
        required: true,
      },
      {
        id: "corePromise",
        label: "Core Promise & Reader Transformation",
        type: "textarea",
        placeholder: "e.g., Reader will replace their corporate salary within 6 months while working 25 hours a week with full schedule autonomy.",
        required: true,
      },
      {
        id: "chapterCount",
        label: "Target Scope / Chapter Count",
        type: "select",
        options: [
          "8 Chapters (Tactical Playbook)",
          "12 Chapters (Standard Non-Fiction)",
          "16 Chapters (Comprehensive Authority Guide)",
        ],
        defaultValue: "12 Chapters (Standard Non-Fiction)",
      },
      {
        id: "authorAuthority",
        label: "Author Authority / Case Studies to Feature",
        type: "text",
        placeholder: "e.g., 15 years as VP of Operations, built a $2M fractional practice, mentored 50+ consultants.",
      },
      {
        id: "toneStyle",
        label: "Writing Tone & Style",
        type: "select",
        options: [
          "Tactical & Action-Oriented",
          "Authoritative & Research-Backed",
          "Inspirational & Conversational",
          "Direct & Provocative",
        ],
        defaultValue: "Tactical & Action-Oriented",
      },
    ],
    systemPrompt: `You are a master developmental book editor and literary publishing consultant specializing in commercial non-fiction bestsellers.

Your goal is to build an airtight, compelling book architecture that takes readers on a transformative step-by-step journey from friction to mastery.

Structure:
- Part I: The Paradigm Shift (Why the status quo is broken & the new model)
- Part II: The Core Methodology (The tactical frameworks, systems, and tools)
- Part III: Scaling & Long-Term Mastery (Implementation, roadblocks, and future-proofing)

Every chapter must specify:
1. Chapter Title & Punchy Subtitle
2. Chapter Hook & Core Lesson
3. Practical Exercise or Framework
4. Target Key Takeaway`,
    promptBuilder: (inputs) => `Design a comprehensive book architecture for:
- Concept: ${inputs.bookIdea}
- Target Reader: ${inputs.targetReader}
- Core Promise: ${inputs.corePromise}
- Scope: ${inputs.chapterCount || "12 Chapters"}
- Author Authority: ${inputs.authorAuthority || "Industry Practitioner"}
- Tone: ${inputs.toneStyle || "Tactical & Action-Oriented"}

Output in clean Markdown:
1. ### 📚 3 Bestseller Title & Subtitle Combinations
2. ### 🎯 One-Sentence Book Premise & Transformation Thesis
3. ### 🧭 The Reader's Journey Map (Status Quo -> Breakdown -> Breakthrough -> New Reality)
4. ### 📑 Complete Chapter-by-Chapter Architecture (Parts, Chapters, Hooks, Frameworks, and Exercises)
5. ### 💡 Book Marketing Hook & Back-Cover Blurb Pitch`,
  },

  {
    id: "seo-article",
    name: "SEO-Optimized Deep Dive Article",
    category: "authority",
    badge: "Rank #1",
    icon: "article",
    headline: "Authoritative, search-optimized long-form article designed to rank on Google & AI search",
    description: "Generate comprehensive, structured articles with optimized H2/H3 hierarchy, key takeaway callouts, comparison tables, actionable checklists, and E-E-A-T signals.",
    framework: "Search Intent Fulfillment & E-E-A-T Framework",
    inputFields: [
      {
        id: "primaryKeyword",
        label: "Primary Target Keyword",
        type: "text",
        placeholder: "e.g., how to build a fractional consulting business",
        required: true,
      },
      {
        id: "secondaryKeywords",
        label: "Secondary / LSI Keywords",
        type: "text",
        placeholder: "e.g., fractional cmo rates, consulting retainer contract, fractional executive jobs",
        helpText: "Keywords to weave naturally into subheaders and body paragraphs.",
      },
      {
        id: "searchIntent",
        label: "Search Intent Type",
        type: "select",
        options: [
          "Informational (How-To / Definitive Guide)",
          "Commercial Investigation (Best / Comparison)",
          "Transactional (Buying Decision Guide)",
        ],
        defaultValue: "Informational (How-To / Definitive Guide)",
      },
      {
        id: "targetAudience",
        label: "Target Reader & Expertise Level",
        type: "text",
        placeholder: "e.g., Mid to senior professionals with 10+ years experience looking for actionable tactical steps.",
        required: true,
      },
      {
        id: "keyAngles",
        label: "Unique Angles / Fresh Insights",
        type: "textarea",
        placeholder: "e.g., Why hourly billing is suicidal for fractional work; how value-based retainers protect your sanity.",
      },
      {
        id: "targetWordCount",
        label: "Target Word Count",
        type: "select",
        options: [
          "1,200 words (Standard Article)",
          "2,000 words (Comprehensive Guide)",
          "3,500+ words (Ultimate Pillar Guide)",
        ],
        defaultValue: "2,000 words (Comprehensive Guide)",
      },
    ],
    systemPrompt: `You are an elite SEO editorial director and subject matter expert copywriter who builds content that outranks competitors and wins AI search citations (ChatGPT, Perplexity, Google AI Overviews).

Strict SEO & Quality Directives:
1. SEARCH INTENT FULFILLMENT: Answer the core user query within the first 150 words with zero fluff or generic intro clichés.
2. HEADER HIERARCHY: Use clean H1, H2, and H3 markdown hierarchy. Naturally integrate target keywords in headings without keyword stuffing.
3. E-E-A-T PROTOCOL: Include concrete data points, operational frameworks, real-world examples, and nuanced trade-offs that generic AI cannot invent.
4. ENGAGEMENT ELEMENTS: Include callout boxes (> [!NOTE] or > [!TIP]), Markdown comparison tables, and bulleted checklists.
5. FAQ ACCORDION: Conclude with 3-5 high-value FAQs targeting "People Also Ask" search queries.`,
    promptBuilder: (inputs) => `Write an authoritative, search-optimized article targeting:
- Primary Keyword: ${inputs.primaryKeyword}
- Secondary Keywords: ${inputs.secondaryKeywords || "None specified"}
- Search Intent: ${inputs.searchIntent || "Informational"}
- Target Audience: ${inputs.targetAudience}
- Unique Angle/Thesis: ${inputs.keyAngles || "Focus on practical, repeatable implementation"}
- Scope: ${inputs.targetWordCount || "2,000 words"}

Produce a publication-ready Markdown article featuring:
1. Click-worthy H1 title with keyword near front
2. Executive Summary callout box (Quick Verdict / Direct Answer)
3. Logical H2 & H3 structured content sections
4. Markdown data/comparison table
5. Actionable Implementation Checklist
6. 4-question FAQ section answering top SERP search queries`,
  },

  {
    id: "content-rewriter",
    name: "Content Humanizer & Anti-AI Rewriter",
    category: "authority",
    badge: "Anti-AI Slop",
    icon: "auto_fix_high",
    headline: "Transform generic, robotic AI content into authentic, punchy human voice",
    description: "Strip out AI cliches ('delve', 'testament', 'tapestry', 'crucial', 'in conclusion', robotic symmetry) and rewrite with natural rhythm, conversational punch, and authentic cadence.",
    framework: "Anti-AI Slop Elimination & Human Voice Cadence Protocol",
    inputFields: [
      {
        id: "originalContent",
        label: "Original Text to Rewrite / Humanize",
        type: "textarea",
        placeholder: "Paste your draft, AI output, or rough notes here...",
        helpText: "Paste up to 2,000 words for complete tone, cadence, and vocabulary transformation.",
        required: true,
      },
      {
        id: "targetVoice",
        label: "Desired Voice Persona",
        type: "select",
        options: [
          "Experienced Practitioner / Operator",
          "Witty & Conversational Storyteller",
          "Punchy & Direct Copywriter",
          "Authoritative Thought Leader",
        ],
        defaultValue: "Experienced Practitioner / Operator",
      },
      {
        id: "rewriteGoal",
        label: "Primary Transformation Goal",
        type: "select",
        options: [
          "Remove AI Fluff & Increase Crispness",
          "Make Simpler & More Accessible (5th Grade Level)",
          "Make More Persuasive & Conversion-Driven",
          "Expand with Vivid Real-World Analogies",
        ],
        defaultValue: "Remove AI Fluff & Increase Crispness",
      },
      {
        id: "bannedPhrases",
        label: "Custom Banned Phrases or Jargon (Optional)",
        type: "text",
        placeholder: "e.g., synergy, paradigm shift, 10x, seamless",
      },
    ],
    systemPrompt: `You are an uncompromising human developmental editor and anti-AI voice coach.

Your mission: Take robotic, formulaic AI writing and rewrite it into compelling, rhythmic, authentic human prose.

Banned AI Tell-Tale Markers (PURGE ON SIGHT):
- Overused verbs/nouns: "delve", "tapestry", "beacon", "testament", "orchestrate", "elevate", "foster", "crucial", "pivotal", "paramount".
- Formulaic transitions: "In a world where...", "In conclusion...", "Furthermore...", "Moreover...", "It is important to remember that...".
- Symmetrical 3-part bullet lists that all start with the same verb tense.
- Passive corporate hedge words: "can be seen as", "serves to facilitate".

Human Writing Hallmarks to Infuse:
- Dynamic sentence variety: 3-word punchy sentences followed by rhythmic compound explanations.
- Concrete specifics instead of abstractions (e.g. "$4,200/mo retainer" instead of "substantial income").
- Strong personal viewpoint, earned authority, and colloquial flow.`,
    promptBuilder: (inputs) => `Rewrite and humanize this text:
- Target Voice: ${inputs.targetVoice || "Experienced Practitioner"}
- Core Goal: ${inputs.rewriteGoal || "Remove AI Fluff & Increase Crispness"}
- Additional Banned Words: ${inputs.bannedPhrases || "None"}

Original Text:
"""
${inputs.originalContent}
"""

Deliver in clean Markdown:
1. ### ✨ Humanized, Polished Output (Ready to publish)
2. ### 🧹 Slop Audit Summary (List of robotic patterns, AI clichés, and passive filler removed)
3. ### 📊 Voice & Cadence Metrics (Readability level, sentence variation, before vs after word count)`,
  },

  {
    id: "seo-silo",
    name: "Topical SILO & Internal Link Architecture",
    category: "authority",
    badge: "Topical Authority",
    icon: "account_tree",
    headline: "Map out a complete pillar-cluster content SILO to dominate search engine topical authority",
    description: "Design a high-yield content architecture with 1 central pillar page, 4-6 sub-pillar clusters, 15+ supporting articles, and bidirectional internal linking rules.",
    framework: "Bruce Clay SILO Model & Semantic Cluster Graph",
    inputFields: [
      {
        id: "coreTopic",
        label: "Core Niche or Broad Subject",
        type: "text",
        placeholder: "e.g., B2B Cold Email Outreach & Deliverability",
        required: true,
      },
      {
        id: "targetAudience",
        label: "Target Audience & Business Model",
        type: "text",
        placeholder: "e.g., Sales development reps, agency founders, and growth marketers using sales engagement platforms.",
        required: true,
      },
      {
        id: "existingPillars",
        label: "Existing Pages or High-Performing Content (Optional)",
        type: "textarea",
        placeholder: "e.g., /cold-email-guide, /pricing, /case-studies",
      },
      {
        id: "monetizationGoal",
        label: "Monetization / Conversion Goal",
        type: "select",
        options: [
          "SaaS Signups & Free Trials",
          "High-Ticket Consulting / Inbound Leads",
          "Affiliate & Ad Monetization",
          "Digital Product & Course Sales",
        ],
        defaultValue: "High-Ticket Consulting / Inbound Leads",
      },
    ],
    systemPrompt: `You are an elite Technical SEO and Information Architect specialized in Semantic SILO structures and Google Knowledge Graph topical authority.

Architecture Guidelines:
1. PILLAR (Tier 1): The definitive 4,000+ word parent guide covering the entire umbrella topic.
2. SUB-PILLARS (Tier 2): 4-5 core thematic sub-categories (each 2,000+ words).
3. CLUSTER LEAVES (Tier 3): 3-4 specific, long-tail tactical articles supporting each sub-pillar.
4. STRICT LINKING PROTOCOL: Leaves link UP to their Sub-Pillar and sibling leaves. Sub-Pillars link UP to the Pillar. Never link haphazardly across unrelated silos.`,
    promptBuilder: (inputs) => `Architect a complete topical SILO content structure for:
- Core Topic: ${inputs.coreTopic}
- Target Audience: ${inputs.targetAudience}
- Monetization Objective: ${inputs.monetizationGoal || "Inbound Leads"}
- Existing Pages: ${inputs.existingPillars || "None"}

Deliver in clean Markdown:
1. ### 🏛️ Central Pillar Page (H1 Title, URL Slug, Core Intent, Conversion Asset)
2. ### 🌳 4 Sub-Pillar Clusters with Supporting Long-Tail Topics
   - For each cluster: Sub-Pillar Slug + 3 Supporting Long-Tail Titles & Search Intent
3. ### 🔗 Bidirectional Internal Linking Rules & Exact Anchor Text Table
4. ### 🗺️ Mermaid Diagram representing the hierarchical link graph`,
  },

  // ==========================================
  // TIER 2: UTILITY & LOCAL SEO PACK
  // ==========================================
  {
    id: "meta-tags",
    name: "High-CTR SEO Meta Titles & Descriptions",
    category: "traffic",
    badge: "CTR Booster",
    icon: "label",
    headline: "Click-optimized meta titles (<=60 chars) and meta descriptions (<=155 chars)",
    description: "Produce 5 variations of high-CTR meta tags strictly constrained to search snippet limits, with exact character counts, keyword placement, and curiosity hooks.",
    framework: "SERP CTR Maximizer & Snippet Character Bounds",
    inputFields: [
      {
        id: "pageTitleOrTopic",
        label: "Page Topic or Current Headline",
        type: "text",
        placeholder: "e.g., The Ultimate Guide to B2B Cold Email in 2026",
        required: true,
      },
      {
        id: "primaryKeyword",
        label: "Primary Keyword to Front-Load",
        type: "text",
        placeholder: "e.g., B2B cold email",
        required: true,
      },
      {
        id: "pageType",
        label: "Page Type",
        type: "select",
        options: [
          "Blog Post / Guide",
          "Product / Service Landing Page",
          "Homepage",
          "E-commerce Category Page",
          "Free Tool / Calculator",
        ],
        defaultValue: "Blog Post / Guide",
      },
      {
        id: "uniqueBenefit",
        label: "Unique Benefit / Hook / Year / Number",
        type: "text",
        placeholder: "e.g., 35% reply rates, free templates included, 2026 updated",
        required: true,
      },
      {
        id: "characterStrictness",
        label: "Character Boundary Standard",
        type: "select",
        options: [
          "Strict Google Bounds (Title <= 60 chars, Desc <= 155 chars)",
          "Extended OpenGraph / Social Bounds (Title <= 70, Desc <= 200)",
        ],
        defaultValue: "Strict Google Bounds (Title <= 60 chars, Desc <= 155 chars)",
      },
    ],
    systemPrompt: `You are an elite Search Engine Optimization (SEO) title tag and snippet conversion engineer.

STRICT LENGTH RESTRICTIONS (NON-NEGOTIABLE):
- META TITLE: Maximum 60 characters (including spaces and brand suffix). Google truncates at ~600px.
- META DESCRIPTION: Maximum 155 characters (including spaces). Mobile/Desktop truncates beyond 155-160 chars.

Every variation MUST calculate and display the character count at the end: e.g. [54 chars].
Variations should test different psychological levers:
1. Direct Search Match (front-loaded keyword)
2. Curiosity / Contrarian Hook
3. Metric / Proof Hook
4. Action / How-To Hook
5. Power Word / Urgency Hook`,
    promptBuilder: (inputs) => `Generate 5 pairs of high-CTR Meta Titles and Meta Descriptions:
- Topic: ${inputs.pageTitleOrTopic}
- Primary Keyword: ${inputs.primaryKeyword}
- Page Type: ${inputs.pageType || "Blog Post"}
- Unique Benefit/Angle: ${inputs.uniqueBenefit}
- Boundary Rule: ${inputs.characterStrictness || "Strict Google Bounds"}

Output in clean Markdown:
1. ### 🏷️ 5 Meta Title Variations (Strictly <= 60 characters with [X chars] label)
2. ### 📝 5 Meta Description Variations (Strictly <= 155 characters with [X chars] label)
3. ### 🏆 Recommended Best Pairing for Maximum SERP CTR
4. ### 💻 Copy-Ready HTML Snippet for <head>`,
  },

  {
    id: "faq-generator",
    name: "FAQ Generator & JSON-LD Schema",
    category: "authority",
    badge: "Rich Snippets",
    icon: "quiz",
    headline: "High-value FAQ accordions and ready-to-paste Google FAQPage JSON-LD structured data",
    description: "Formulate 6-10 high-intent customer questions and concise authoritative answers, paired with valid, copy-paste Schema.org JSON-LD structured data.",
    framework: "Google Search Central FAQPage Schema & Zero-Click Answer Target",
    inputFields: [
      {
        id: "productOrTopic",
        label: "Product, Service, or Article Topic",
        type: "textarea",
        placeholder: "e.g., Writerdost AI - Multi-agent long-form book and blog writing platform with BYOK and native exports.",
        required: true,
      },
      {
        id: "targetAudience",
        label: "Target Customer / Reader Persona",
        type: "text",
        placeholder: "e.g., Non-fiction authors, content agency owners, and independent bloggers.",
        required: true,
      },
      {
        id: "keyQuestions",
        label: "Specific Questions or Objections to Address (Optional)",
        type: "textarea",
        placeholder: "e.g., Can I bring my own OpenAI/Claude API keys? How does it prevent hallucinations? What export formats are supported?",
      },
      {
        id: "includeSchema",
        label: "Include JSON-LD Schema Code Block?",
        type: "select",
        options: [
          "Yes - Include Valid JSON-LD Code Block",
          "No - Markdown Q&A Only",
        ],
        defaultValue: "Yes - Include Valid JSON-LD Code Block",
      },
    ],
    systemPrompt: `You are a technical SEO specialist and structured data architect.

Objectives:
1. Formulate 6-8 direct, high-value FAQ questions that address authentic user hesitation, pricing, functionality, and comparison.
2. Keep each answer concise (45-75 words), authoritative, and actionable.
3. If requested, provide a 100% valid, syntax-checked Schema.org FAQPage JSON-LD code snippet ready to paste into website <head> or CMS custom code.`,
    promptBuilder: (inputs) => `Generate a comprehensive FAQ suite and JSON-LD schema for:
- Subject: ${inputs.productOrTopic}
- Target Audience: ${inputs.targetAudience}
- Specific Questions to Cover: ${inputs.keyQuestions || "Generate the 6-8 most critical buyer questions"}
- Schema Required: ${inputs.includeSchema || "Yes"}

Output in clean Markdown:
1. ### ❓ Editorial FAQ (Clean Markdown Q&A with bold questions and punchy answers)
${inputs.includeSchema !== "No - Markdown Q&A Only" ? "2. ### 💻 Valid Schema.org JSON-LD Code Block (Inside ```json formatted code block)" : ""}
3. ### 📌 Placement & Implementation Guide`,
  },

  {
    id: "youtube-metadata",
    name: "YouTube Video Metadata & SEO Pack",
    category: "traffic",
    badge: "Algorithm Ready",
    icon: "subtitles",
    headline: "Click-worthy video titles, timestamped descriptions, SEO tags, and hashtag packs",
    description: "Generate 5 high-CTR video titles, an algorithm-friendly description with timestamp chapter placeholders, relevant search tags (comma-separated), and 5 targeted hashtags.",
    framework: "YouTube Search & Suggested Algorithm Optimization",
    inputFields: [
      {
        id: "videoTopicOrSummary",
        label: "Video Summary & Core Takeaways",
        type: "textarea",
        placeholder: "e.g., A comprehensive tutorial teaching beginners how to use Google Antigravity to automate SEO content publishing without code.",
        required: true,
      },
      {
        id: "targetKeywords",
        label: "Target Search Keywords",
        type: "text",
        placeholder: "e.g., Google Antigravity tutorial, AI automation, programmatic SEO 2026",
        required: true,
      },
      {
        id: "linksToInclude",
        label: "Important Links / CTAs to Include",
        type: "text",
        placeholder: "e.g., Free Workflow Template: https://writerdost.com/free-template, Twitter: @writerdost",
      },
      {
        id: "titleStyle",
        label: "Preferred Title Vibe",
        type: "select",
        options: [
          "High-Curiosity / Click-Worthy",
          "Search & Keyword-First",
          "Story & Personal Narrative",
          "Contrarian / Hot-Take",
        ],
        defaultValue: "High-Curiosity / Click-Worthy",
      },
    ],
    systemPrompt: `You are an elite YouTube growth strategist and metadata engineer.

Metadata Architecture:
1. 5 TITLE OPTIONS: High-CTR titles under 65 characters to avoid truncation on mobile.
2. DESCRIPTION: First 2 lines (120 characters) hook the user above the "Show More" fold. Followed by a detailed summary, timestamp chapter outline placeholders, resources, and disclaimers.
3. TAGS: 15-20 comma-separated tags mixing broad category keywords and hyper-specific long-tail phrases.
4. HASHTAGS: Exactly 3-5 high-relevance hashtags for the top of the video page.`,
    promptBuilder: (inputs) => `Create a complete YouTube Video Metadata Pack for:
- Video Summary: ${inputs.videoTopicOrSummary}
- Target Keywords: ${inputs.targetKeywords}
- Links & CTAs: ${inputs.linksToInclude || "None provided"}
- Title Vibe: ${inputs.titleStyle || "High-Curiosity"}

Deliver in clean Markdown:
1. ### 🎬 5 Optimized Title Proposals (Under 65 chars with character counts)
2. ### 📝 Complete YouTube Description (Above-the-fold hook, chapter outline, links, summary)
3. ### 🏷️ Comma-Separated Video Tags (Copy-paste ready for YouTube Studio)
4. ### #️⃣ 5 Targeted Hashtags
5. ### 🖼️ Thumbnail Concept Brief (Visual foreground, background, and 3-word bold overlay)`,
  },

  {
    id: "gmb-updates",
    name: "Google Business Profile (GMB) Weekly Updates",
    category: "traffic",
    badge: "Local SEO",
    icon: "storefront",
    headline: "Pack of 5 to 15 engaging Google Business Profile updates to boost local map rankings",
    description: "Create ready-to-publish Google Business Profile updates highlighting special offers, local trust signals, services, and local geo-targeted keywords.",
    framework: "Local SEO 3-Pack Prominence & Proximity Strategy",
    inputFields: [
      {
        id: "businessName",
        label: "Business Name & Primary Category",
        type: "text",
        placeholder: "e.g., Apex Dental Care - Family & Cosmetic Dentistry",
        required: true,
      },
      {
        id: "location",
        label: "City, Neighborhood, or Service Area",
        type: "text",
        placeholder: "e.g., Downtown Austin, TX and South Congress neighborhood",
        required: true,
      },
      {
        id: "postCount",
        label: "Number of Updates to Generate",
        type: "select",
        options: [
          "5 Updates (Weekly Pack for 1 Month)",
          "10 Updates (Bi-Weekly Pack)",
          "15 Updates (Complete Monthly Blitz)",
        ],
        defaultValue: "5 Updates (Weekly Pack for 1 Month)",
      },
      {
        id: "featuredOffers",
        label: "Featured Services / Offers / Community Hook",
        type: "textarea",
        placeholder: "e.g., $99 New Patient Exam & Cleaning, Same-Day Emergency Appointments, Invisalign consultation discounts.",
        required: true,
      },
      {
        id: "targetKeywords",
        label: "Local Search Keywords to Embed",
        type: "text",
        placeholder: "e.g., best dentist Austin, emergency tooth extraction downtown, cosmetic teeth whitening",
      },
    ],
    systemPrompt: `You are a Local SEO specialist helping small and multi-location businesses dominate the Google Maps 3-pack through consistent, optimized Google Business Profile (formerly GMB) updates.

Guidelines:
1. Each update must be between 100-150 words (optimal viewing length in the GMB knowledge panel).
2. Naturally include local geo-modifiers (neighborhoods, nearby landmarks, street intersections).
3. Include an explicit CTA button selection (e.g., "Call Now", "Learn More", "Book", "Order Online").
4. Include a suggested photo or graphic prompt to pair with the update.`,
    promptBuilder: (inputs) => `Generate a batch of ${inputs.postCount || "5 Updates"} for Google Business Profile:
- Business: ${inputs.businessName}
- Location / Service Area: ${inputs.location}
- Core Offers / Services: ${inputs.featuredOffers}
- Local Keywords: ${inputs.targetKeywords || "Local service terms"}

Deliver in clean Markdown:
Format each update as:
### Update #[N]: [Catchy Title]
- **Post Copy:** (100-150 words with local geo mentions)
- **Call to Action Button:** (e.g., "Call Now", "Book Online", "Learn More")
- **Suggested Photo/Graphic:** (Visual description for the business owner)
- **Target Keywords Used:** (Geo and service terms included)`,
  },

  {
    id: "gmb-qa",
    name: "Google Business Profile Q&A Local Pack",
    category: "traffic",
    badge: "Local Authority",
    icon: "contact_support",
    headline: "8-12 local SEO rich questions and authoritative business answers for your GBP profile",
    description: "Pre-empt buyer hesitations, resolve doubts, and embed geo-relevance and keyword signals in the official Google Q&A section to increase local conversions.",
    framework: "Google Local Knowledge Graph & User Intent Seeding",
    inputFields: [
      {
        id: "businessNameAndType",
        label: "Business Name & Core Specialty",
        type: "text",
        placeholder: "e.g., Precision Auto Repair - European Car Specialists",
        required: true,
      },
      {
        id: "location",
        label: "City, Service Suburbs & Landmarks",
        type: "text",
        placeholder: "e.g., North Seattle, WA (serving Ballard, Fremont, and Queen Anne)",
        required: true,
      },
      {
        id: "topServices",
        label: "Top 3-5 Services Offered",
        type: "textarea",
        placeholder: "e.g., BMW/Audi brake service, synthetic oil changes, check engine light diagnostics, transmission repair.",
        required: true,
      },
      {
        id: "commonObjections",
        label: "Common Hesitations / Real Customer Questions (Optional)",
        type: "textarea",
        placeholder: "e.g., Do you offer loaner cars? Do you honor third-party warranties? What are your weekend hours?",
      },
    ],
    systemPrompt: `You are a Local SEO practitioner who optimizes the Google Business Profile "Questions & Answers" module to seed high-intent search signals and eliminate customer conversion friction.

Rules:
1. Generate 8-12 realistic, high-intent questions written from an everyday customer's perspective.
2. Provide authoritative, warm, and professional answers from the "Business Owner" persona.
3. Weave in local geo-terms, parking details, pricing expectations, warranties, and emergency policies naturally.`,
    promptBuilder: (inputs) => `Create a complete Google Business Profile Q&A Pack for:
- Business: ${inputs.businessNameAndType}
- Location: ${inputs.location}
- Services: ${inputs.topServices}
- Specific Hesitations: ${inputs.commonObjections || "General pricing, warranty, and booking logistics"}

Deliver in clean Markdown:
8-12 Q&A pairs formatted as:
### Q[N]: [Customer Question in authentic, natural voice]
- **Business Owner Answer:** [Clear, helpful answer embedding location, reassurance, and call-to-action]
- **SEO Signal Embedded:** [Keyword / Geo benefit]`,
  },

  {
    id: "keyword-strategy",
    name: "Semantic Keyword Clustering & Roadmap",
    category: "authority",
    badge: "Strategy Lead",
    icon: "hub",
    headline: "Clustered topical hubs, search intents, and a 90-day publishing roadmap from a seed keyword",
    description: "Cluster semantic search queries into funnel stages (TOFU, MOFU, BOFU), calculate topical priority, and build an actionable content roadmap to dominate the niche.",
    framework: "Semantic Distance & Search Intent Funnel Clustering",
    inputFields: [
      {
        id: "seedKeyword",
        label: "Core Seed Keyword or Niche Topic",
        type: "text",
        placeholder: "e.g., fractional cmo",
        required: true,
      },
      {
        id: "targetMarket",
        label: "Target Market & Geography",
        type: "text",
        placeholder: "e.g., US B2B SaaS companies generating $1M-$10M ARR",
        required: true,
      },
      {
        id: "businessOffering",
        label: "Your Business Offering & Value Prop",
        type: "textarea",
        placeholder: "e.g., Fractional CMO agency providing go-to-market architecture, paid acquisition audits, and marketing team hiring.",
        required: true,
      },
      {
        id: "competitorDomains",
        label: "Competitor Domains or Benchmarks (Optional)",
        type: "text",
        placeholder: "e.g., competitor1.com, marketingexecs.io",
      },
      {
        id: "timeline",
        label: "Roadmap Scope / Plan Duration",
        type: "select",
        options: [
          "30-Day Sprint (12 Topics)",
          "60-Day Architecture (24 Topics)",
          "90-Day Authority Dominance (36 Topics)",
        ],
        defaultValue: "90-Day Authority Dominance (36 Topics)",
      },
    ],
    systemPrompt: `You are a Principal Content Strategist and Semantic Search Architect.

Clustering Principles:
1. SEMANTIC GROUPING: Group keywords by underlying search intent rather than identical wording.
2. FUNNEL STAGING:
   - TOFU (Top of Funnel): Problem-aware, educational guides, trends, definitions.
   - MOFU (Middle of Funnel): Solution-aware, frameworks, vendor comparisons, teardowns.
   - BOFU (Bottom of Funnel): High-intent commercial queries, pricing, ROI calculations, alternatives.
3. ROADMAP: Prioritize quick-win long-tail queries first to build initial topical authority before targeting high-difficulty root terms.`,
    promptBuilder: (inputs) => `Develop a complete Semantic Keyword Strategy and ${inputs.timeline || "90-Day"} Content Roadmap for:
- Seed Keyword: ${inputs.seedKeyword}
- Target Market: ${inputs.targetMarket}
- Business Offering: ${inputs.businessOffering}
- Competitors: ${inputs.competitorDomains || "Standard industry players"}

Deliver in clean Markdown:
1. ### 🎯 Executive Strategy & Search Landscape Summary
2. ### 🗂️ 4-6 Semantic Keyword Clusters (Cluster Name, Intent, Primary & LSI Keywords, Business Value)
3. ### 🎪 Funnel Staging Matrix (TOFU vs MOFU vs BOFU allocation)
4. ### 📅 Actionable Editorial Roadmap (Week-by-week scheduled topics with working H1 titles and target intent)
5. ### 🚀 Quick-Win Fast Mover Recommendations`,
  },
];

export function getTemplateById(id: string): CopywritingTemplate | undefined {
  return COPYWRITING_TEMPLATES.find((t) => t.id === id);
}

export function getTemplatesByCategory(
  category: CopywritingCategory | "all"
): CopywritingTemplate[] {
  if (category === "all") {
    return COPYWRITING_TEMPLATES;
  }
  return COPYWRITING_TEMPLATES.filter((t) => t.category === category);
}
