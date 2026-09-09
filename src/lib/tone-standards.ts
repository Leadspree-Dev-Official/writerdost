/**
 * AI SYSTEM DIRECTIVE: TONE AND STYLE EXECUTION GUIDE
 * Centralized registry of tones, icons, and execution rules for the AI.
 */

export const TONE_GUIDE = {
  Professional: {
    icon: "business_center",
    objective: "Convey competence, reliability, and objective truth.",
    execution: "Use active voice. Avoid hyperbole and overly emotional language. Keep sentences medium-length and structured. Use industry-standard terminology accurately without being overly dense.",
  },
  Storytelling: {
    icon: "auto_stories",
    objective: "Keep the reader emotionally invested and eager to know what happens next.",
    execution: "Use narrative arcs (Setup, Conflict, Resolution). Focus on human impact and character-driven examples. Use sensory details and varied sentence lengths to create rhythm. Transition smoothly between scenes or ideas.",
  },
  Technical: {
    icon: "terminal",
    objective: "Deliver precise, unambiguous, and highly structured information.",
    execution: "Prioritize clarity over flowery prose. Use formatting (bullet points, code blocks, bold text) heavily. Define complex terms immediately. Avoid metaphors unless strictly necessary for explanation.",
  },
  Conversational: {
    icon: "forum",
    objective: "Break down the barrier between author and reader; feel like a dialogue.",
    execution: "Use contractions (you're, we'll). Occasionally start sentences with conjunctions (And, But, So). Address the reader directly as 'you.' Keep paragraphs short and use rhetorical questions to prompt thought.",
  },
  Persuasive: {
    icon: "bolt",
    objective: "Drive the reader to take a specific, immediate action.",
    execution: "Focus heavily on the reader's pain points, followed by immediate, tangible benefits. Use strong, action-oriented verbs. Keep sentences punchy. Use psychological triggers like urgency and scarcity natively in the text.",
  },
  Atmospheric: {
    icon: "landscape",
    objective: "Immerse the reader in a deeply visual and sensory environment.",
    execution: "'Show, don't tell.' Use evocative, highly descriptive adjectives and verbs. Focus on ambient sounds, weather elements, textures, and isolation. Create a slow, deliberate pacing that builds tension or awe.",
  },
  Authoritative: {
    icon: "school",
    objective: "Establish absolute subject matter expertise and facilitate structured learning.",
    execution: "Maintain an objective, third-person perspective. Cite data, theories, or historical context. Use a highly structured hierarchy. Avoid colloquialisms entirely. Ensure all claims are backed by rigorous explanation.",
  },
  Empathetic: {
    icon: "favorite",
    objective: "Make the reader feel deeply understood and validated before offering a solution.",
    execution: "Use validating language ('It makes sense why you feel...', 'You are not alone in...'). Soften transitions. Focus on the emotional weight of a problem before introducing the mechanics of the solution.",
  },
  Provocative: {
    icon: "campaign",
    objective: "Challenge the status quo and make the reader rethink their assumptions.",
    execution: "Take a strong, definitive stance against a common industry belief. Use contrasting statements ('They told you X, but the truth is Y'). Be unapologetic and bold, but back up the claims with hard logic.",
  }
} as const;

export type ToneType = keyof typeof TONE_GUIDE;
export const TONES = Object.keys(TONE_GUIDE) as ToneType[];

export const getToneDirective = (tone: string): string => {
  const guide = TONE_GUIDE[tone as ToneType] || TONE_GUIDE.Professional;
  return `
=== TONE & STYLE EXECUTION: ${tone} ===
Objective: ${guide.objective}
Execution Rules: ${guide.execution}
`.trim();
};
