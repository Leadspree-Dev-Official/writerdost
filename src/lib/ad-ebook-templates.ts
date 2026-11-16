export interface AdEbookTemplate {
  id: string;
  name: string;
  badge: string;
  pricePoint: "₹99" | "₹199" | "₹299" | "₹349" | "₹399" | "₹499";
  niche: "Business & Freelancing" | "Marketing & Ads" | "Health & Fitness" | "Productivity & Wealth" | "Creator Economy";
  headline: string;
  description: string;
  icon: string;
  suggestedLength: number;
  tone: string;
  audience: string;
  visionPrompt: string;
  chaptersPreview: string[];
  adHooks: string[];
}

export const AD_EBOOK_TEMPLATES: AdEbookTemplate[] = [
  {
    id: "client-hunter",
    name: "Client Hunter Blueprint",
    badge: "Bestseller (₹199 / ₹299)",
    pricePoint: "₹199",
    niche: "Business & Freelancing",
    headline: "How Freelancers & Agency Owners Sign High-Ticket Clients Without Cold Calling",
    description: "The classic client acquisition playbook sold massively on FB/IG. Focuses on inbound positioning, cold outreach scripts, closing frameworks, and retainer systems.",
    icon: "target",
    suggestedLength: 12000,
    tone: "Authoritative",
    audience: "Freelancers, designers, copywriters, media buyers, and boutique agency owners struggling with erratic income",
    visionPrompt: `Write an actionable, step-by-step micro-guide titled "Client Hunter: The High-Ticket Inbound & Outreach System". 
It must be a complete blueprint designed to convert cold readers into profitable clients:
1. The High-Value Offer: How to package services into a ₹50,000 to ₹1,50,000+ irresistible solution.
2. The Direct Response Outreach Engine: 5 battle-tested LinkedIn, Instagram, and Email DM scripts that get 30%+ reply rates.
3. The Discovery Call Conversion Script: A 20-minute qualification and closing framework with zero pushy sales tactics.
4. Retainer Retention: How to turn one-off projects into monthly recurring retainers.
Include real script templates, checklists, and common objection handling scripts.`,
    chaptersPreview: [
      "The Foundation: Crafting an Irresistible Offer",
      "Finding Goldmines: Where High-Budget Clients Hang Out",
      "The 3-Sentence DM Scripts That Book Calls",
      "The 20-Minute No-Pitch Sales Framework",
      "Locking in Recurring Monthly Retainers"
    ],
    adHooks: [
      "Tired of chasing clients on Upwork for pennies?",
      "The exact 3-sentence DM that booked 14 discovery calls this week.",
      "Get the complete Client Hunter playbook for just ₹199 today."
    ]
  },
  {
    id: "fb-ads-masterclass",
    name: "FB & Meta Ads Profit Playbook",
    badge: "High ROAS (₹299 / ₹349)",
    pricePoint: "₹299",
    niche: "Marketing & Ads",
    headline: "The 2026 Meta Ads Blueprint: Scalable Campaigns, Creative Formats & Low-Cost Leads",
    description: "The micro-masterclass teaching DTC brands, local businesses, and marketers how to run profitable FB/IG ad campaigns with modern Advantage+ workflows.",
    icon: "campaign",
    suggestedLength: 15000,
    tone: "Action-Oriented",
    audience: "Small business owners, D2C brand founders, coaches, and digital marketers seeking higher ROAS",
    visionPrompt: `Write a modern, hyper-practical guide titled "Meta Ads Mastery: Scaling Profitable Campaigns in 2026".
Focus on modern Advantage+ creative strategies, tracking post-iOS changes, and low-cost customer acquisition:
1. The 3-Hook Video Ad Framework: Scripting UGC and short-form creatives that halt the scroll.
2. Campaign Architecture: Simple, scalable CBO and Advantage+ setups that don't reset learning phases.
3. Retargeting & LTV Funnels: Converting clickers into first-time and repeat buyers.
4. Ad Metrics That Actually Matter: Cutting unprofitable ad sets before losing money.
Include actual creative briefing templates, budget scaling formulas, and copy checklists.`,
    chaptersPreview: [
      "The 2026 Meta Algorithm Explained",
      "The Hook-Story-Offer Ad Creative Engine",
      "The $10/Day Testing Blueprint for Small Budgets",
      "Scaling Winning Ads Without Breaking Your ROAS",
      "Troubleshooting Ad Fatigue and High CPMs"
    ],
    adHooks: [
      "Stop burning money on Meta Ads without seeing profit.",
      "Copy our exact 3-part ad testing framework for just ₹299.",
      "How to scale your campaigns using AI & Advantage+ budgets."
    ]
  },
  {
    id: "yoga-365",
    name: "Yoga 365: Daily Micro-Routines",
    badge: "Viral Wellness (₹99 / ₹199)",
    pricePoint: "₹99",
    niche: "Health & Fitness",
    headline: "15-Minute Daily Asanas for Flexibility, Back Pain Relief, and Mental Calm",
    description: "High-volume consumer impulse buy. A day-by-day practical handbook designed for busy professionals, desk workers, and beginners wanting daily wellness.",
    icon: "self_improvement",
    suggestedLength: 10000,
    tone: "Inspiring",
    audience: "Working professionals, remote desk workers, beginners suffering from stiffness, chronic back pain, or stress",
    visionPrompt: `Write an engaging, accessible wellness guide titled "Yoga 365: 15-Minute Daily Micro-Routines for Energy & Flexibility".
Designed as a direct-to-consumer digital product:
1. The 15-Minute Morning Reset: Awakening spine mobility and boosting morning metabolism.
2. Desk Relief Protocol: 5 gentle poses to eliminate lower back and neck tension without leaving your chair.
3. Evening Unwind Sequence: Calming the nervous system for deep restorative sleep.
4. Consistency Blueprint: How to maintain a 365-day habit using micro-commitments.
Include clear step-by-step pose instructions, breathing cues (Pranayama), and beginner modifications.`,
    chaptersPreview: [
      "The Science of Micro-Practices: Why 15 Minutes Beats 1 Hour",
      "The Morning Sun Salutation & Spine Awakening",
      "The Desk-Worker's Desk Poses for Instant Pain Relief",
      "Pranayama: 3 Breathing Techniques to Kill Stress Instantly",
      "The 7-Day Quick-Start Habit Builder"
    ],
    adHooks: [
      "Have 15 minutes a day? Fix your stiff neck & lower back.",
      "No studio fees. No 1-hour sessions. Just daily relief for ₹99.",
      "Join 10,000+ desk workers doing Yoga 365."
    ]
  },
  {
    id: "ai-prompt-empire",
    name: "The 1,000+ AI Prompts Vault",
    badge: "Instant Utility (₹199 / ₹399)",
    pricePoint: "₹199",
    niche: "Productivity & Wealth",
    headline: "Copy-Paste Prompts for Marketing, Copywriting, Coding & Automating 80% of Daily Work",
    description: "One of the most viral impulse-purchase digital products on Meta ads. Provides battle-tested prompts categorized for businesses, creators, and freelancers.",
    icon: "terminal",
    suggestedLength: 14000,
    tone: "Concise",
    audience: "Entrepreneurs, content creators, students, and professionals looking to 10x their productivity with AI",
    visionPrompt: `Write a high-utility prompt engineering master guide titled "The Ultimate AI Prompt Playbook: 10x Your Output in 30 Days".
Structure it with plug-and-play templates across major use-cases:
1. The Core Prompt Architecture: How to feed context, role, criteria, and few-shot examples to get perfect output.
2. Sales & Marketing Prompts: High-converting landing page copy, email sequences, and social media hooks.
3. Content Machine Prompts: Repurposing 1 idea into 20 multi-platform posts, newsletters, and scripts.
4. Business Automation Prompts: Meeting summarization, contract analysis, and customer response systems.
Provide copy-paste prompt blocks with placeholder tags [like this] for immediate reader execution.`,
    chaptersPreview: [
      "The Anatomy of a Flawless AI Prompt",
      "The Copywriter's Swipe File: High-Converting Sales Prompts",
      "The Social Media Engine: 30 Days of Content in 60 Minutes",
      "Business Operations & Customer Support Automation Prompts",
      "Advanced Prompt Chaining & Persona Modeling"
    ],
    adHooks: [
      "Stop getting generic AI answers. Use these proven prompts instead.",
      "The exact prompts we use to automate 80% of our marketing for ₹199.",
      "1,000+ copy-paste prompts formatted for instant results."
    ]
  },
  {
    id: "fat-loss-fastrack",
    name: "The 30-Day Zero-Gym Fat Loss Protocol",
    badge: "High Conversion (₹299 / ₹499)",
    pricePoint: "₹349",
    niche: "Health & Fitness",
    headline: "Sustainable Weight Loss for Busy Professionals Without Crash Dieting or Gym Memberships",
    description: "Direct-response fitness guide covering home nutrition swaps, calorie budgeting, walking protocols, and habit loops that convert rapidly on Facebook Ads.",
    icon: "fitness_center",
    suggestedLength: 12000,
    tone: "Empathetic",
    audience: "Busy men and women aged 25-50 with desk jobs who want to lose 5-10kg without extreme starvation diets",
    visionPrompt: `Write a clear, non-intimidating health guide titled "The 30-Day Lean Habit: Sustainable Fat Loss for Busy Lifestyles".
Cover real-world science without fitness jargon:
1. The Energy Balance Truth: How fat loss actually works and why crash diets fail 95% of people.
2. The Plate Method: Easy portion control without weighing every gram of food.
3. Non-Exercise Physical Activity (NEAT): How daily 8,000-10,000 steps melt more fat than intense cardio.
4. Dining Out & Social Life Survival Guide: How to enjoy family dinners and weekends without guilt or weight regain.
Include sample weekly meal structures, grocery shopping lists, and progress tracking templates.`,
    chaptersPreview: [
      "The Myth of Hardcore Cardio: The NEAT Fat-Loss Secret",
      "The Busy Professional's Plate Method (No Calorie Counting)",
      "High-Protein Snack Swaps to Kill 4 PM Sugar Cravings",
      "Eating Out & Weekend Parties Without Ruining Progress",
      "The 4-Week Step-by-Step Habit Roadmap"
    ],
    adHooks: [
      "No extreme gym workouts. No starvation. Just real fat loss.",
      "The busy professional's guide to losing weight for ₹349.",
      "Lose stubborn fat with simple daily habit swaps."
    ]
  },
  {
    id: "creator-income",
    name: "The ₹1 Lakh/Month Creator Playbook",
    badge: "Trending Niche (₹399 / ₹499)",
    pricePoint: "₹399",
    niche: "Creator Economy",
    headline: "Monetize an Audience of Under 5,000 Followers with Micro-Products, Affiliates & Newsletters",
    description: "The digital product playbook for aspiring creators, educators, and indie makers wanting to monetize small audiences through low-ticket digital sales.",
    icon: "monetization_on",
    suggestedLength: 15000,
    tone: "Authoritative",
    audience: "Aspiring content creators, newsletter writers, educators, and social media influencers with under 10k followers",
    visionPrompt: `Write a high-converting creator economy blueprint titled "Micro-Monetization: How to Earn ₹1 Lakh/Month with a Small Audience".
Detailed breakdown of modern digital product ecosystems:
1. The Audience Fallacy: Why 1,000 true fans beat 100,000 passive followers.
2. The ₹99 to ₹499 Micro-Product Funnel: Creating digital books, templates, and swipe files in a single weekend.
3. Organic to Paid Ads Bridge: How to turn your best organic post into a profitable ₹500/day Meta ad.
4. Automated Email Funnels: Nurturing new leads into repeat customers on autopilot.
Include real revenue calculators, pricing ladder diagrams, and launch checklists.`,
    chaptersPreview: [
      "The 1,000 True Fans Math: Building Predictable ₹1L/Month",
      "Weekend Product Creation: How to Package Knowledge Fast",
      "The Low-Ticket Ad Strategy for Micro-Budget Creators",
      "The 5-Email Welcome Sequence That Sells While You Sleep",
      "Scaling from ₹99 Ebooks to High-Ticket Coaching"
    ],
    adHooks: [
      "You don't need 100k followers to make a full-time living online.",
      "How creators are making ₹1 Lakh/month with under 2,000 followers.",
      "Get the exact micro-product blueprint for ₹399."
    ]
  }
];
