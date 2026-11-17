export const LIMITS = {
  promptChars: 400_000,
  systemPromptChars: 100_000,
  manuscriptChars: 4_000_000,
  chapters: 80,
  sectionsPerChapter: 30,
  targetWords: 300_000,
  researchSources: 20,
  uploadBytes: 10 * 1024 * 1024,
} as const;

export function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}
