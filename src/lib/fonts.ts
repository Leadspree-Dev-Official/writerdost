/**
 * The typefaces a writer can pick per project.
 *
 * `cssVar` matches the variable each family is registered under in layout.tsx;
 * `family` is the real family name, which the .docx export needs because Word
 * resolves fonts by name rather than by CSS stack.
 */
export type FontCategory = "Sans" | "Serif" | "Display";

export type FontOption = {
  id: string;
  label: string;
  category: FontCategory;
  /** Real family name — used by the Word export. */
  family: string;
  /** Full CSS stack, including the fallbacks. */
  stack: string;
  /** A word about what the face is good for, shown as the select's title. */
  note: string;
};

export const FONT_OPTIONS: FontOption[] = [
  {
    id: "inter",
    label: "Inter",
    category: "Sans",
    family: "Inter",
    stack: 'var(--font-inter), "Helvetica Neue", Arial, sans-serif',
    note: "Neutral screen sans. The app default.",
  },
  {
    id: "lato",
    label: "Lato",
    category: "Sans",
    family: "Lato",
    stack: 'var(--font-lato), "Helvetica Neue", Arial, sans-serif',
    note: "Warmer sans, softer than Inter.",
  },
  {
    id: "source-sans",
    label: "Source Sans 3",
    category: "Sans",
    family: "Source Sans 3",
    stack: 'var(--font-source-sans), "Helvetica Neue", Arial, sans-serif',
    note: "Clean sans that holds up at small sizes.",
  },
  {
    id: "lora",
    label: "Lora",
    category: "Serif",
    family: "Lora",
    stack: 'var(--font-lora), Georgia, "Times New Roman", serif',
    note: "Contemporary book serif. A good default for fiction.",
  },
  {
    id: "merriweather",
    label: "Merriweather",
    category: "Serif",
    family: "Merriweather",
    stack: 'var(--font-merriweather), Georgia, "Times New Roman", serif',
    note: "Sturdy serif designed for reading on screens.",
  },
  {
    id: "eb-garamond",
    label: "EB Garamond",
    category: "Serif",
    family: "EB Garamond",
    stack: 'var(--font-eb-garamond), Garamond, Georgia, serif',
    note: "Classical old-style serif. Traditional and light on the page.",
  },
  {
    id: "libre-baskerville",
    label: "Libre Baskerville",
    category: "Serif",
    family: "Libre Baskerville",
    stack: 'var(--font-libre-baskerville), Georgia, "Times New Roman", serif',
    note: "High-contrast book serif. Wants a little extra line height.",
  },
  {
    id: "playfair",
    label: "Playfair Display",
    category: "Display",
    family: "Playfair Display",
    stack: 'var(--font-playfair), Georgia, serif',
    note: "Display serif. Best on headings, not body text.",
  },
  {
    id: "georgia",
    label: "Georgia",
    category: "Serif",
    family: "Georgia",
    stack: 'Georgia, "Times New Roman", serif',
    note: "Installed on nearly every device — nothing to download.",
  },
];

export const DEFAULT_BODY_FONT = "inter";
export const DEFAULT_HEADING_FONT = "inter";

export const FONTS_BY_CATEGORY: { category: FontCategory; fonts: FontOption[] }[] = (
  ["Serif", "Sans", "Display"] as FontCategory[]
).map((category) => ({
  category,
  fonts: FONT_OPTIONS.filter((font) => font.category === category),
}));

export function findFont(id: string | undefined, fallbackId: string): FontOption {
  return (
    FONT_OPTIONS.find((font) => font.id === id) ??
    FONT_OPTIONS.find((font) => font.id === fallbackId) ??
    FONT_OPTIONS[0]
  );
}

/** The CSS `font-family` value for a stored font id. */
export function fontStack(id: string | undefined, fallbackId: string): string {
  return findFont(id, fallbackId).stack;
}
