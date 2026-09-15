/**
 * AI SYSTEM DIRECTIVE: OUTPUT LANGUAGE REGISTRY
 * The single list of languages a manuscript can be written in. Grouped so the
 * Indian languages the audience actually asks for sit at the top of the picker
 * instead of being buried under the international list.
 */

export type LanguageGroup = { label: string; options: string[] };

export const LANGUAGE_GROUPS: LanguageGroup[] = [
  {
    label: "India",
    options: [
      "English (India)",
      "Hindi",
      "Bengali",
      "Marathi",
      "Telugu",
      "Tamil",
      "Gujarati",
      "Kannada",
      "Malayalam",
      "Punjabi",
      "Odia",
      "Assamese",
      "Urdu",
      "Maithili",
      "Sanskrit",
      "Konkani",
      "Nepali",
      "Sindhi",
      "Bhojpuri",
      "Manipuri (Meitei)",
      "Santali",
      "Dogri",
      "Kashmiri",
      "Bodo",
    ],
  },
  {
    label: "English variants",
    options: ["English (US)", "English (UK)", "English (Australia)", "English (Canada)"],
  },
  {
    label: "Europe",
    options: [
      "Spanish",
      "Portuguese",
      "Portuguese (Brazil)",
      "French",
      "German",
      "Italian",
      "Dutch",
      "Polish",
      "Romanian",
      "Czech",
      "Slovak",
      "Hungarian",
      "Greek",
      "Swedish",
      "Norwegian",
      "Danish",
      "Finnish",
      "Icelandic",
      "Irish",
      "Ukrainian",
      "Russian",
      "Bulgarian",
      "Serbian",
      "Croatian",
      "Bosnian",
      "Slovenian",
      "Lithuanian",
      "Latvian",
      "Estonian",
      "Albanian",
      "Catalan",
      "Basque",
      "Galician",
    ],
  },
  {
    label: "Middle East & Africa",
    options: [
      "Arabic",
      "Hebrew",
      "Persian (Farsi)",
      "Turkish",
      "Kurdish",
      "Pashto",
      "Swahili",
      "Amharic",
      "Somali",
      "Hausa",
      "Yoruba",
      "Igbo",
      "Zulu",
      "Afrikaans",
    ],
  },
  {
    label: "Asia Pacific",
    options: [
      "Chinese (Simplified)",
      "Chinese (Traditional)",
      "Japanese",
      "Korean",
      "Thai",
      "Vietnamese",
      "Indonesian",
      "Malay",
      "Filipino (Tagalog)",
      "Burmese",
      "Khmer",
      "Lao",
      "Sinhala",
      "Mongolian",
      "Kazakh",
      "Uzbek",
    ],
  },
];

export const LANGUAGES: string[] = LANGUAGE_GROUPS.flatMap((group) => group.options);

/** What the picker starts on, and what an older saved draft falls back to. */
export const DEFAULT_LANGUAGE = "English (India)";

const isEnglish = (language: string) => /^english/i.test(language.trim());

/**
 * The instruction block appended to every agent prompt. English variants only
 * need a spelling rule; every other language needs the model told explicitly
 * that headings, lists and wrap-ups are translated too, or it drifts back to
 * English for structural text.
 */
export function getLanguageDirective(language?: string): string {
  const target = (language || DEFAULT_LANGUAGE).trim();

  if (isEnglish(target)) {
    const variant =
      target === "English (UK)"
        ? "British English spelling and punctuation conventions"
        : target === "English (India)"
          ? "Indian English conventions, with examples and references that land for Indian readers"
          : target === "English (Australia)"
            ? "Australian English spelling conventions"
            : target === "English (Canada)"
              ? "Canadian English spelling conventions"
              : "American English spelling conventions";
    return `OUTPUT LANGUAGE: English. Use ${variant} consistently throughout.`;
  }

  return `OUTPUT LANGUAGE — MANDATORY: Write everything in ${target}.
- Every chapter title, heading, subheading, bullet point, summary, table entry and wrap-up must be in ${target}. Do not leave structural or boilerplate text in English.
- Use the natural grammar, idiom and script of ${target}; never transliterate into Latin script unless ${target} is normally written that way.
- Do not translate word-for-word from English phrasing. Write as a native author of ${target} would write for this audience.
- Keep proper nouns, brand names, and widely used technical terms in their original form when a native writer would, rather than forcing an unnatural translation.
- JSON keys, HTML tags and Markdown syntax stay exactly as specified in English; only the human-readable values are in ${target}.`;
}
