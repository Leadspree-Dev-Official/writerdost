export interface BookTemplate {
  id: string;
  name: string;
  badge: string;
  genre: "Non-Fiction & Thought Leadership" | "Memoir & Narrative" | "Epic Fiction & Sci-Fi" | "Technical & Educational" | "Business & Strategy";
  headline: string;
  description: string;
  icon: string;
  suggestedLength: number;
  tone: string;
  audience: string;
  visionPrompt: string;
  structureHighlights: string[];
}

export const BOOK_TEMPLATES: BookTemplate[] = [
  {
    id: "definitive-thought-leadership",
    name: "Definitive Thought Leadership Masterwork",
    badge: "Trade Non-Fiction (60k-100k Words)",
    genre: "Non-Fiction & Thought Leadership",
    headline: "Establish Category Dominance with a Groundbreaking Non-Fiction Authority Book",
    description: "Designed for industry leaders, researchers, and thinkers aiming to write the defining book of their domain (akin to Thinking Fast & Slow or Sapiens).",
    icon: "psychology",
    suggestedLength: 75000,
    tone: "Authoritative",
    audience: "C-suite executives, senior practitioners, founders, researchers, and intellectually curious general readers",
    visionPrompt: `Write a definitive, seminal trade non-fiction book that dismantles common conventional wisdom and establishes a new operating philosophy for the modern era.
The book should be structured into thematic parts:
Part I: The Broken Paradigm — An exhaustive breakdown of why existing systems and methodologies fail under current pressures.
Part II: The First Principles — Core foundational models, empirical research, and contrarian frameworks that reveal the hidden truths of the domain.
Part III: Case Studies & High-Stakes Evidence — Deep investigative analyses of real organizations, historical inflection points, and turning points.
Part IV: The Future Playbook — Step-by-step strategic principles, governance architectures, and predictive forecasts for the next decade.
Enrich each chapter with rich historical analogies, rigorous logic, and unforgettable mental models.`,
    structureHighlights: [
      "Rigorous 4-Part Macro Architecture",
      "Contrarian First-Principles Theses",
      "Historical Case Studies & Empirical Data",
      "Actionable Future Prediction Frameworks",
    ],
  },
  {
    id: "epic-narrative-novel",
    name: "Epic Fiction & Worldbuilding Tome",
    badge: "Epic Novel (100k-250k Words)",
    genre: "Epic Fiction & Sci-Fi",
    headline: "Immersive Worldbuilding, Multi-POV Arcs, and Uncompromising Literary Pacing",
    description: "Built for epic fantasy, space opera sci-fi, and sweeping literary sagas with deep continuity memory across dozens of chapters.",
    icon: "auto_stories",
    suggestedLength: 120000,
    tone: "Engaging",
    audience: "Avid readers of epic fantasy, immersive science fiction, historical fiction, and complex multi-generational character sagas",
    visionPrompt: `An epic novel set in a meticulously realized world on the precipice of profound geopolitical and magical/technological transformation.
Key Narrative Pillars:
1. Multi-POV Character Web: Interlocking journeys of 3-4 distinct protagonists with conflicting motivations, moral complexities, and personal stakes.
2. Layered Worldbuilding: Rich societal hierarchies, forgotten mythologies, linguistic nuances, and realistic political friction.
3. Escalating Stakes: From intimate personal dilemmas to societal upheaval and cataclysmic revelations.
4. Foreshadowing & Sensory Prose: Organic sensory textures, atmospheric scene setting, dialogue subtext, and emotionally resonant payoff arcs.`,
    structureHighlights: [
      "Interlocking Multi-POV Character Arcs",
      "Deep Lore, Magic Systems & Technology Trees",
      "Subtext-Driven Dialogue & Scene Blocking",
      "Cross-Chapter Narrative Continuity Tracking",
    ],
  },
  {
    id: "memoir-narrative-nonfiction",
    name: "Memoir & Narrative Non-Fiction",
    badge: "Personal History (60k-85k Words)",
    genre: "Memoir & Narrative",
    headline: "Transform Raw Personal Experience into an Emotionally Captivating Legacy Book",
    description: "For founders, luminaries, survivors, and visionaries sharing their unfiltered life journey, hard-won insights, and pivotal turning points.",
    icon: "history_edu",
    suggestedLength: 70000,
    tone: "Conversational",
    audience: "Readers who cherish vulnerable autobiographies, founder memoirs, and transformational life journeys",
    visionPrompt: `A deeply human, evocative memoir exploring the collision of ambition, vulnerability, existential crisis, and triumph.
Structure:
- The Inciting Awakening: The ordinary world before the journey began and the catalyst that forced radical change.
- The Crucible Years: The brutal setbacks, hidden doubts, failures, and sacrifices that tested character to its limits.
- The Breakthrough: The turning point where clarity emerged and new wisdom was forged in the fire of real experience.
- The Horizon: Reflections on legacy, reconciliation, and timeless lessons for future generations.`,
    structureHighlights: [
      "Vulnerable Emotional Resonance",
      "Cinematic Scene Construction & Pacing",
      "Hard-Won Philosophy & Timeless Lessons",
      "Reflective Legacy Synthesis",
    ],
  },
  {
    id: "technical-handbook",
    name: "Engineering & Technical Reference Tome",
    badge: "Definitive Guide (80k-140k Words)",
    genre: "Technical & Educational",
    headline: "The Comprehensive Engineering Guide with Architecture Diagrams and Deep Practice",
    description: "For principal architects, engineers, and scientists authoring an exhaustive reference manual or university-grade textbook.",
    icon: "code",
    suggestedLength: 95000,
    tone: "Technical",
    audience: "Senior software engineers, system architects, technical leaders, computer science students, and researchers",
    visionPrompt: `A rigorous, comprehensive technical guide and reference handbook exploring modern software architecture, distributed systems, and real-world implementation patterns.
Include:
- System Design Trade-offs: CAP theorem, latency vs throughput, consistency models, and fault tolerance.
- Code Artifacts & Schemas: Clean, illustrative pseudo-code, production configuration guidelines, and boundary contracts.
- Failure Modes & Post-Mortems: Real-world operational outages, root cause analyses, and disaster recovery blueprints.
- Production Hardening: Security, observability, performance benchmarks, and automated operational runbooks.`,
    structureHighlights: [
      "System Architecture & Trade-Off Analysis",
      "Practical Code & Schema Snippets",
      "Outage Post-Mortems & Anti-Patterns",
      "Enterprise Observability & Runbooks",
    ],
  },
  {
    id: "epic-omnibus-tome",
    name: "Multi-Volume Omnibus & Epic Series",
    badge: "Epic Tome (200k-300k Words)",
    genre: "Epic Fiction & Sci-Fi",
    headline: "Unleash Maximum Narrative Scale: 300,000 Words of Continuous World & Lore",
    description: "The ultimate long-form canvas for monumental sagas, complete trilogies collected into a single volume, and exhaustive encyclopedic works.",
    icon: "library_books",
    suggestedLength: 250000,
    tone: "Authoritative",
    audience: "Die-hard readers who seek immersive, sweeping sagas that span centuries, multiple continents, and immense world depth",
    visionPrompt: `A monumental multi-book epic saga or encyclopedic compendium designed to span hundreds of pages across multiple cohesive acts or volumes.
Requirements:
1. Act/Volume Segmentation: Clear demarcation of Book 1, Book 2, and Book 3 within a single overarching omnibus.
2. Global Lore & Lexicon: Persistent faction genealogies, technological epochs, philosophical treatises, and cross-volume character evolutions.
3. Master Narrative Arc: Macro thematic conflicts that culminate in a cataclysmic, universe-altering climax.`,
    structureHighlights: [
      "3-Volume Comprehensive Arc Segmentation",
      "Persistent Lexicon & Faction Continuity",
      "Massive Scale Pacing & Climactic Resolutions",
      "Extended Appendix & Lore Addendums",
    ],
  },
];
