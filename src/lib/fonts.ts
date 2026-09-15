/**
 * The typefaces a writer can pick per project.
 *
 * `cssVar` matches the variable each family is registered under in layout.tsx;
 * `family` is the real family name, which the .docx export needs because Word
 * resolves fonts by name rather than by CSS stack.
 */
export type FontCategory =
  | "Serif"
  | "Sans"
  | "Display"
  | "Handwriting"
  | "Monospace"
  | "System"
  | "Custom";

export type FontOption = {
  id: string;
  label: string;
  category: FontCategory;
  /** Real family name — used by the Word export and Google Fonts loader. */
  family: string;
  /** Full CSS stack, including the fallbacks. */
  stack: string;
  /** A word about what the face is good for, shown as the select's title. */
  note: string;
  /** True if loaded dynamically via Google Fonts. */
  isGoogleFont?: boolean;
};

export const FONT_OPTIONS: FontOption[] = [
  // ─── SERIF (Classic & Modern Book Serifs) ──────────────────────────────────
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
    id: "cormorant-garamond",
    label: "Cormorant Garamond",
    category: "Serif",
    family: "Cormorant Garamond",
    stack: '"Cormorant Garamond", Garamond, Georgia, serif',
    note: "Delicate, elegant literary typeface with sharp details.",
    isGoogleFont: true,
  },
  {
    id: "pt-serif",
    label: "PT Serif",
    category: "Serif",
    family: "PT Serif",
    stack: '"PT Serif", Georgia, serif',
    note: "Balanced and versatile transitional book serif.",
    isGoogleFont: true,
  },
  {
    id: "bitter",
    label: "Bitter",
    category: "Serif",
    family: "Bitter",
    stack: '"Bitter", Georgia, serif',
    note: "Contemporary slab-serif engineered for comfortable screen reading.",
    isGoogleFont: true,
  },
  {
    id: "crimson-text",
    label: "Crimson Text",
    category: "Serif",
    family: "Crimson Text",
    stack: '"Crimson Text", Garamond, Georgia, serif',
    note: "Classic book production serif inspired by old-style masters.",
    isGoogleFont: true,
  },
  {
    id: "spectral",
    label: "Spectral",
    category: "Serif",
    family: "Spectral",
    stack: '"Spectral", Georgia, serif',
    note: "Production Type editorial serif built for dense text environments.",
    isGoogleFont: true,
  },
  {
    id: "alegreya",
    label: "Alegreya",
    category: "Serif",
    family: "Alegreya",
    stack: '"Alegreya", Georgia, serif',
    note: "Dynamic, rhythmic literary face designed for literature and essays.",
    isGoogleFont: true,
  },
  {
    id: "cardo",
    label: "Cardo",
    category: "Serif",
    family: "Cardo",
    stack: '"Cardo", Georgia, "Times New Roman", serif',
    note: "Classic humanist serif inspired by Aldus Manutius.",
    isGoogleFont: true,
  },
  {
    id: "frank-ruhl-libre",
    label: "Frank Ruhl Libre",
    category: "Serif",
    family: "Frank Ruhl Libre",
    stack: '"Frank Ruhl Libre", Georgia, serif',
    note: "Classic high-legibility book serif with gentle contrast.",
    isGoogleFont: true,
  },
  {
    id: "bodoni-moda",
    label: "Bodoni Moda",
    category: "Serif",
    family: "Bodoni Moda",
    stack: '"Bodoni Moda", Georgia, serif',
    note: "High-fashion luxury serif with dramatic vertical stress.",
    isGoogleFont: true,
  },
  {
    id: "castoro",
    label: "Castoro",
    category: "Serif",
    family: "Castoro",
    stack: '"Castoro", Georgia, serif',
    note: "Scholarly serif designed for academic and nonfiction prose.",
    isGoogleFont: true,
  },
  {
    id: "domine",
    label: "Domine",
    category: "Serif",
    family: "Domine",
    stack: '"Domine", Georgia, serif',
    note: "Warm, robust serif tailored for continuous long-form reading.",
    isGoogleFont: true,
  },
  {
    id: "newsreader",
    label: "Newsreader",
    category: "Serif",
    family: "Newsreader",
    stack: '"Newsreader", Georgia, serif',
    note: "Designed by Production Type specifically for editorial articles.",
    isGoogleFont: true,
  },
  {
    id: "vollkorn",
    label: "Vollkorn",
    category: "Serif",
    family: "Vollkorn",
    stack: '"Vollkorn", Georgia, serif',
    note: "Modest and sturdy text face with pronounced dark serifs.",
    isGoogleFont: true,
  },
  {
    id: "source-serif-4",
    label: "Source Serif 4",
    category: "Serif",
    family: "Source Serif 4",
    stack: '"Source Serif 4", Georgia, serif',
    note: "Adobe's open-source companion serif for editorial reading.",
    isGoogleFont: true,
  },
  {
    id: "cinzel",
    label: "Cinzel",
    category: "Serif",
    family: "Cinzel",
    stack: '"Cinzel", Georgia, serif',
    note: "Classical Roman inscriptions. Perfect for fantasy, history & covers.",
    isGoogleFont: true,
  },
  {
    id: "faustina",
    label: "Faustina",
    category: "Serif",
    family: "Faustina",
    stack: '"Faustina", Georgia, serif',
    note: "Tailored for literary work, magazines, and digital books.",
    isGoogleFont: true,
  },
  {
    id: "libre-caslon-text",
    label: "Libre Caslon Text",
    category: "Serif",
    family: "Libre Caslon Text",
    stack: '"Libre Caslon Text", Georgia, serif',
    note: "Handcrafted revival of classic William Caslon eighteenth-century types.",
    isGoogleFont: true,
  },
  {
    id: "noto-serif",
    label: "Noto Serif",
    category: "Serif",
    family: "Noto Serif",
    stack: '"Noto Serif", Georgia, serif',
    note: "Google's harmonious, highly readable multi-script serif.",
    isGoogleFont: true,
  },
  {
    id: "arvo",
    label: "Arvo",
    category: "Serif",
    family: "Arvo",
    stack: '"Arvo", Georgia, serif',
    note: "Geometric slab-serif typeface with punchy editorial presence.",
    isGoogleFont: true,
  },
  {
    id: "roboto-slab",
    label: "Roboto Slab",
    category: "Serif",
    family: "Roboto Slab",
    stack: '"Roboto Slab", Georgia, serif',
    note: "Geometric slab-serif with dual personality: crisp and rhythmic.",
    isGoogleFont: true,
  },
  {
    id: "zilla-slab",
    label: "Zilla Slab",
    category: "Serif",
    family: "Zilla Slab",
    stack: '"Zilla Slab", Georgia, serif',
    note: "Mozilla's contemporary, industrial-strength slab serif.",
    isGoogleFont: true,
  },
  {
    id: "besley",
    label: "Besley",
    category: "Serif",
    family: "Besley",
    stack: '"Besley", Georgia, serif',
    note: "Clarendon-inspired serif with friendly, bookish character.",
    isGoogleFont: true,
  },

  // ─── SANS (Modern, Editorial & Screen Sans) ────────────────────────────────
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
    id: "roboto",
    label: "Roboto",
    category: "Sans",
    family: "Roboto",
    stack: '"Roboto", "Helvetica Neue", Arial, sans-serif',
    note: "Modern neo-grotesque sans with geometric yet friendly curves.",
    isGoogleFont: true,
  },
  {
    id: "open-sans",
    label: "Open Sans",
    category: "Sans",
    family: "Open Sans",
    stack: '"Open Sans", "Helvetica Neue", Arial, sans-serif',
    note: "Clean, neutral humanist sans with open apertures.",
    isGoogleFont: true,
  },
  {
    id: "montserrat",
    label: "Montserrat",
    category: "Sans",
    family: "Montserrat",
    stack: '"Montserrat", "Helvetica Neue", Arial, sans-serif',
    note: "Geometric sans inspired by vintage urban Buenos Aires posters.",
    isGoogleFont: true,
  },
  {
    id: "poppins",
    label: "Poppins",
    category: "Sans",
    family: "Poppins",
    stack: '"Poppins", "Helvetica Neue", Arial, sans-serif',
    note: "Geometric sans with striking circular geometry.",
    isGoogleFont: true,
  },
  {
    id: "raleway",
    label: "Raleway",
    category: "Sans",
    family: "Raleway",
    stack: '"Raleway", "Helvetica Neue", Arial, sans-serif',
    note: "Elegant geometric sans with unique crossed 'W' and modern flair.",
    isGoogleFont: true,
  },
  {
    id: "nunito",
    label: "Nunito",
    category: "Sans",
    family: "Nunito",
    stack: '"Nunito", "Helvetica Neue", Arial, sans-serif',
    note: "Balanced rounded sans with friendly, approachable personality.",
    isGoogleFont: true,
  },
  {
    id: "work-sans",
    label: "Work Sans",
    category: "Sans",
    family: "Work Sans",
    stack: '"Work Sans", "Helvetica Neue", Arial, sans-serif',
    note: "Early grotesque sans optimized for on-screen reading.",
    isGoogleFont: true,
  },
  {
    id: "plus-jakarta-sans",
    label: "Plus Jakarta Sans",
    category: "Sans",
    family: "Plus Jakarta Sans",
    stack: '"Plus Jakarta Sans", "Helvetica Neue", Arial, sans-serif',
    note: "Modern, energetic geometric sans popular in modern tech and publishing.",
    isGoogleFont: true,
  },
  {
    id: "dm-sans",
    label: "DM Sans",
    category: "Sans",
    family: "DM Sans",
    stack: '"DM Sans", "Helvetica Neue", Arial, sans-serif',
    note: "Low-contrast geometric sans for crisp digital reading.",
    isGoogleFont: true,
  },
  {
    id: "outfit",
    label: "Outfit",
    category: "Sans",
    family: "Outfit",
    stack: '"Outfit", "Helvetica Neue", Arial, sans-serif',
    note: "Minimalist geometric sans inspired by contemporary brand design.",
    isGoogleFont: true,
  },
  {
    id: "rubik",
    label: "Rubik",
    category: "Sans",
    family: "Rubik",
    stack: '"Rubik", "Helvetica Neue", Arial, sans-serif',
    note: "Slightly rounded corners providing a gentle, welcoming feel.",
    isGoogleFont: true,
  },
  {
    id: "quicksand",
    label: "Quicksand",
    category: "Sans",
    family: "Quicksand",
    stack: '"Quicksand", "Helvetica Neue", Arial, sans-serif',
    note: "Soft geometric display and body sans with rounded ends.",
    isGoogleFont: true,
  },
  {
    id: "fira-sans",
    label: "Fira Sans",
    category: "Sans",
    family: "Fira Sans",
    stack: '"Fira Sans", "Helvetica Neue", Arial, sans-serif',
    note: "Designed for Mozilla with exceptional legibility across screen types.",
    isGoogleFont: true,
  },
  {
    id: "ubuntu",
    label: "Ubuntu",
    category: "Sans",
    family: "Ubuntu",
    stack: '"Ubuntu", "Helvetica Neue", Arial, sans-serif',
    note: "Distinctive contemporary humanist sans with rounded warmth.",
    isGoogleFont: true,
  },
  {
    id: "oswald",
    label: "Oswald",
    category: "Sans",
    family: "Oswald",
    stack: '"Oswald", "Helvetica Neue", Arial, sans-serif',
    note: "Reworked classic gothic style for compact, impactful titles.",
    isGoogleFont: true,
  },
  {
    id: "cabin",
    label: "Cabin",
    category: "Sans",
    family: "Cabin",
    stack: '"Cabin", "Helvetica Neue", Arial, sans-serif',
    note: "Humanist sans with subtle Art Deco roots and clean proportions.",
    isGoogleFont: true,
  },
  {
    id: "mulish",
    label: "Mulish",
    category: "Sans",
    family: "Mulish",
    stack: '"Mulish", "Helvetica Neue", Arial, sans-serif',
    note: "Minimalist, versatile sans engineered for modern publications.",
    isGoogleFont: true,
  },
  {
    id: "manrope",
    label: "Manrope",
    category: "Sans",
    family: "Manrope",
    stack: '"Manrope", "Helvetica Neue", Arial, sans-serif',
    note: "Crossover between geometric and neo-grotesque with sharp geometry.",
    isGoogleFont: true,
  },
  {
    id: "space-grotesk",
    label: "Space Grotesk",
    category: "Sans",
    family: "Space Grotesk",
    stack: '"Space Grotesk", "Helvetica Neue", Arial, sans-serif',
    note: "Proportional variant of Space Mono. Tech-forward and distinctive.",
    isGoogleFont: true,
  },
  {
    id: "lexend",
    label: "Lexend",
    category: "Sans",
    family: "Lexend",
    stack: '"Lexend", "Helvetica Neue", Arial, sans-serif',
    note: "Scientifically engineered to improve reading speed and fluency.",
    isGoogleFont: true,
  },
  {
    id: "urbanist",
    label: "Urbanist",
    category: "Sans",
    family: "Urbanist",
    stack: '"Urbanist", "Helvetica Neue", Arial, sans-serif',
    note: "Low-contrast, clean geometric sans inspired by modern architecture.",
    isGoogleFont: true,
  },
  {
    id: "figtree",
    label: "Figtree",
    category: "Sans",
    family: "Figtree",
    stack: '"Figtree", "Helvetica Neue", Arial, sans-serif',
    note: "Friendly, contemporary geometric sans designed for clear interfaces.",
    isGoogleFont: true,
  },
  {
    id: "public-sans",
    label: "Public Sans",
    category: "Sans",
    family: "Public Sans",
    stack: '"Public Sans", "Helvetica Neue", Arial, sans-serif',
    note: "Strong, neutral sans created for official government design systems.",
    isGoogleFont: true,
  },
  {
    id: "karla",
    label: "Karla",
    category: "Sans",
    family: "Karla",
    stack: '"Karla", "Helvetica Neue", Arial, sans-serif',
    note: "Grotesque sans with charming idiosyncratic proportions.",
    isGoogleFont: true,
  },
  {
    id: "syne",
    label: "Syne",
    category: "Sans",
    family: "Syne",
    stack: '"Syne", "Helvetica Neue", Arial, sans-serif',
    note: "Avant-garde artistic sans designed by French design studio Bonjour Monde.",
    isGoogleFont: true,
  },

  // ─── DISPLAY & EDITORIAL (Headings, Posters & Covers) ───────────────────────
  {
    id: "playfair",
    label: "Playfair Display",
    category: "Display",
    family: "Playfair Display",
    stack: 'var(--font-playfair), Georgia, serif',
    note: "Display serif. Best on headings, not body text.",
  },
  {
    id: "abril-fatface",
    label: "Abril Fatface",
    category: "Display",
    family: "Abril Fatface",
    stack: '"Abril Fatface", Georgia, serif',
    note: "Dramatic 19th-century European advertising titling face.",
    isGoogleFont: true,
  },
  {
    id: "bebas-neue",
    label: "Bebas Neue",
    category: "Display",
    family: "Bebas Neue",
    stack: '"Bebas Neue", "Arial Black", sans-serif',
    note: "All-caps compact display powerhouse for dramatic chapter titles.",
    isGoogleFont: true,
  },
  {
    id: "righteous",
    label: "Righteous",
    category: "Display",
    family: "Righteous",
    stack: '"Righteous", cursive, sans-serif',
    note: "Retro-futuristic Art Deco display font inspired by 1930s posters.",
    isGoogleFont: true,
  },
  {
    id: "cinzel-decorative",
    label: "Cinzel Decorative",
    category: "Display",
    family: "Cinzel Decorative",
    stack: '"Cinzel Decorative", Georgia, serif',
    note: "Ornate classical Roman titling with decorative swashes.",
    isGoogleFont: true,
  },
  {
    id: "yeseva-one",
    label: "Yeseva One",
    category: "Display",
    family: "Yeseva One",
    stack: '"Yeseva One", Georgia, serif',
    note: "Graceful serif display designed for striking, feminine titles.",
    isGoogleFont: true,
  },
  {
    id: "dm-serif-display",
    label: "DM Serif Display",
    category: "Display",
    family: "DM Serif Display",
    stack: '"DM Serif Display", Georgia, serif',
    note: "High-contrast transitional serif with romantic character.",
    isGoogleFont: true,
  },
  {
    id: "prata",
    label: "Prata",
    category: "Display",
    family: "Prata",
    stack: '"Prata", Georgia, serif',
    note: "Didone-style display typeface with elegant teardrop terminals.",
    isGoogleFont: true,
  },
  {
    id: "shrikhand",
    label: "Shrikhand",
    category: "Display",
    family: "Shrikhand",
    stack: '"Shrikhand", cursive, serif',
    note: "Bold, vibrant hand-painted retro display with Gujarati signage roots.",
    isGoogleFont: true,
  },
  {
    id: "alfa-slab-one",
    label: "Alfa Slab One",
    category: "Display",
    family: "Alfa Slab One",
    stack: '"Alfa Slab One", Georgia, serif',
    note: "Ultra-heavy 20th-century slab-serif poster face.",
    isGoogleFont: true,
  },
  {
    id: "italiana",
    label: "Italiana",
    category: "Display",
    family: "Italiana",
    stack: '"Italiana", Georgia, serif',
    note: "Inspired by classic Italian calligraphy and fashion editorial headers.",
    isGoogleFont: true,
  },
  {
    id: "rozha-one",
    label: "Rozha One",
    category: "Display",
    family: "Rozha One",
    stack: '"Rozha One", Georgia, serif',
    note: "Extreme contrast serif with opulent East-meets-West character.",
    isGoogleFont: true,
  },
  {
    id: "unna",
    label: "Unna",
    category: "Display",
    family: "Unna",
    stack: '"Unna", Georgia, serif',
    note: "Delicate serif display with classical proportions from Argentina.",
    isGoogleFont: true,
  },
  {
    id: "lobster",
    label: "Lobster",
    category: "Display",
    family: "Lobster",
    stack: '"Lobster", cursive, sans-serif',
    note: "Bold retro script headline powerhouse with connectable letters.",
    isGoogleFont: true,
  },
  {
    id: "comfortaa",
    label: "Comfortaa",
    category: "Display",
    family: "Comfortaa",
    stack: '"Comfortaa", cursive, sans-serif',
    note: "Smooth geometric rounded display sans for playful headings.",
    isGoogleFont: true,
  },
  {
    id: "special-elite",
    label: "Special Elite",
    category: "Display",
    family: "Special Elite",
    stack: '"Special Elite", monospace, serif',
    note: "Vintage retro Remington typewriter style for gritty manuscripts.",
    isGoogleFont: true,
  },

  // ─── HANDWRITING & SCRIPT (Calligraphy, Casual & Signatures) ────────────────
  {
    id: "caveat",
    label: "Caveat",
    category: "Handwriting",
    family: "Caveat",
    stack: '"Caveat", cursive, sans-serif',
    note: "Natural, spontaneous handwritten cursive with personal flair.",
    isGoogleFont: true,
  },
  {
    id: "dancing-script",
    label: "Dancing Script",
    category: "Handwriting",
    family: "Dancing Script",
    stack: '"Dancing Script", cursive, sans-serif',
    note: "Lively, bouncing casual script with friendly rhythm.",
    isGoogleFont: true,
  },
  {
    id: "pacifico",
    label: "Pacifico",
    category: "Handwriting",
    family: "Pacifico",
    stack: '"Pacifico", cursive, sans-serif',
    note: "Fun brush script inspired by 1950s American surf culture.",
    isGoogleFont: true,
  },
  {
    id: "great-vibes",
    label: "Great Vibes",
    category: "Handwriting",
    family: "Great Vibes",
    stack: '"Great Vibes", cursive, serif',
    note: "Flowing, elegant formal calligraphy script with looping ascenders.",
    isGoogleFont: true,
  },
  {
    id: "sacramento",
    label: "Sacramento",
    category: "Handwriting",
    family: "Sacramento",
    stack: '"Sacramento", cursive, sans-serif',
    note: "Delicate monoline semi-connected script inspired by 1950s brush lettering.",
    isGoogleFont: true,
  },
  {
    id: "shadows-into-light",
    label: "Shadows Into Light",
    category: "Handwriting",
    family: "Shadows Into Light",
    stack: '"Shadows Into Light", cursive, sans-serif',
    note: "Clean, neat handwritten style with friendly rounded edges.",
    isGoogleFont: true,
  },
  {
    id: "kalam",
    label: "Kalam",
    category: "Handwriting",
    family: "Kalam",
    stack: '"Kalam", cursive, sans-serif',
    note: "Organic handwriting based on casual ballpoint pen writing.",
    isGoogleFont: true,
  },
  {
    id: "satisfy",
    label: "Satisfy",
    category: "Handwriting",
    family: "Satisfy",
    stack: '"Satisfy", cursive, sans-serif',
    note: "Smooth brush script with a timeless retro flair.",
    isGoogleFont: true,
  },
  {
    id: "alex-brush",
    label: "Alex Brush",
    category: "Handwriting",
    family: "Alex Brush",
    stack: '"Alex Brush", cursive, serif',
    note: "Classic flowing cursive with restrained flourishes and high legibility.",
    isGoogleFont: true,
  },
  {
    id: "yellowtail",
    label: "Yellowtail",
    category: "Handwriting",
    family: "Yellowtail",
    stack: '"Yellowtail", cursive, sans-serif',
    note: "Flat brush script with old-school sign painter vibes.",
    isGoogleFont: true,
  },
  {
    id: "marck-script",
    label: "Marck Script",
    category: "Handwriting",
    family: "Marck Script",
    stack: '"Marck Script", cursive, sans-serif',
    note: "Free-flowing, soft calligraphy script with loose, graceful strokes.",
    isGoogleFont: true,
  },
  {
    id: "kaushan-script",
    label: "Kaushan Script",
    category: "Handwriting",
    family: "Kaushan Script",
    stack: '"Kaushan Script", cursive, sans-serif',
    note: "Rustic brush script with rough, expressive organic strokes.",
    isGoogleFont: true,
  },
  {
    id: "cookie",
    label: "Cookie",
    category: "Handwriting",
    family: "Cookie",
    stack: '"Cookie", cursive, sans-serif',
    note: "1950s pin-up advertising script, legible and sweet.",
    isGoogleFont: true,
  },
  {
    id: "homemade-apple",
    label: "Homemade Apple",
    category: "Handwriting",
    family: "Homemade Apple",
    stack: '"Homemade Apple", cursive, sans-serif',
    note: "Authentic cursive script written with real pencil.",
    isGoogleFont: true,
  },
  {
    id: "parisienne",
    label: "Parisienne",
    category: "Handwriting",
    family: "Parisienne",
    stack: '"Parisienne", cursive, serif',
    note: "Charming French boutique casual calligraphy with intentional bounce.",
    isGoogleFont: true,
  },

  // ─── MONOSPACE & CODE (Typewriter, Technical & Manuscripts) ─────────────────
  {
    id: "jetbrains-mono",
    label: "JetBrains Mono",
    category: "Monospace",
    family: "JetBrains Mono",
    stack: '"JetBrains Mono", Menlo, Consolas, Monaco, monospace',
    note: "The premier developer typeface with tailored character heights.",
    isGoogleFont: true,
  },
  {
    id: "fira-code",
    label: "Fira Code",
    category: "Monospace",
    family: "Fira Code",
    stack: '"Fira Code", Menlo, Monaco, Consolas, monospace',
    note: "Clean monospace with famous programming ligatures.",
    isGoogleFont: true,
  },
  {
    id: "roboto-mono",
    label: "Roboto Mono",
    category: "Monospace",
    family: "Roboto Mono",
    stack: '"Roboto Mono", Menlo, Monaco, monospace',
    note: "Geometric monospace optimized for screen readability.",
    isGoogleFont: true,
  },
  {
    id: "space-mono",
    label: "Space Mono",
    category: "Monospace",
    family: "Space Mono",
    stack: '"Space Mono", "Courier New", monospace',
    note: "Retro-futuristic fixed-width font developed by Colophon Foundry.",
    isGoogleFont: true,
  },
  {
    id: "source-code-pro",
    label: "Source Code Pro",
    category: "Monospace",
    family: "Source Code Pro",
    stack: '"Source Code Pro", Menlo, Monaco, monospace',
    note: "Adobe's clean, legible coding typeface with open shapes.",
    isGoogleFont: true,
  },
  {
    id: "courier-prime",
    label: "Courier Prime",
    category: "Monospace",
    family: "Courier Prime",
    stack: '"Courier Prime", "Courier New", monospace',
    note: "The gold standard for screenplay and manuscript drafts.",
    isGoogleFont: true,
  },
  {
    id: "inconsolata",
    label: "Inconsolata",
    category: "Monospace",
    family: "Inconsolata",
    stack: '"Inconsolata", Consolas, monospace',
    note: "Refined humanist monospace inspired by Consolas and Aja.",
    isGoogleFont: true,
  },
  {
    id: "ibm-plex-mono",
    label: "IBM Plex Mono",
    category: "Monospace",
    family: "IBM Plex Mono",
    stack: '"IBM Plex Mono", Menlo, Monaco, monospace',
    note: "Industrial corporate monospace celebrating IBM's tech heritage.",
    isGoogleFont: true,
  },
  {
    id: "anonymous-pro",
    label: "Anonymous Pro",
    category: "Monospace",
    family: "Anonymous Pro",
    stack: '"Anonymous Pro", "Courier New", monospace',
    note: "Characters designed specifically for crisp terminal reading.",
    isGoogleFont: true,
  },
  {
    id: "share-tech-mono",
    label: "Share Tech Mono",
    category: "Monospace",
    family: "Share Tech Mono",
    stack: '"Share Tech Mono", monospace',
    note: "Futuristic sci-fi terminal monospace for cyberpunk/tech themes.",
    isGoogleFont: true,
  },

  // ─── SYSTEM & WEB-SAFE (Universal, Zero-Download) ───────────────────────────
  {
    id: "georgia",
    label: "Georgia",
    category: "System",
    family: "Georgia",
    stack: 'Georgia, "Times New Roman", serif',
    note: "Installed on nearly every device — instant, zero download.",
  },
  {
    id: "times-new-roman",
    label: "Times New Roman",
    category: "System",
    family: "Times New Roman",
    stack: '"Times New Roman", Times, Georgia, serif',
    note: "The universal academic and publication standard serif.",
  },
  {
    id: "palatino",
    label: "Palatino",
    category: "System",
    family: "Palatino",
    stack: 'Palatino, "Palatino Linotype", "Book Antiqua", Georgia, serif',
    note: "Hermann Zapf's iconic Renaissance-proportioned book face.",
  },
  {
    id: "arial",
    label: "Arial",
    category: "System",
    family: "Arial",
    stack: 'Arial, "Helvetica Neue", Helvetica, sans-serif',
    note: "Ubiquitous neo-grotesque sans found on almost all operating systems.",
  },
  {
    id: "trebuchet-ms",
    label: "Trebuchet MS",
    category: "System",
    family: "Trebuchet MS",
    stack: '"Trebuchet MS", "Lucida Grande", "Lucida Sans Unicode", sans-serif',
    note: "Microsoft's humanist sans with open forms and crisp screen clarity.",
  },
  {
    id: "verdana",
    label: "Verdana",
    category: "System",
    family: "Verdana",
    stack: 'Verdana, Geneva, sans-serif',
    note: "Large x-height sans engineered by Matthew Carter for screen legibility.",
  },
  {
    id: "courier-new",
    label: "Courier New",
    category: "System",
    family: "Courier New",
    stack: '"Courier New", Courier, monospace',
    note: "Universal system typewriter font available on all machines.",
  },
];

export const DEFAULT_BODY_FONT = "inter";
export const DEFAULT_HEADING_FONT = "inter";

// ─── DYNAMIC GOOGLE FONT LOADER ─────────────────────────────────────────────
const loadedFontsSet = new Set<string>();

const SYSTEM_FONT_FAMILIES = new Set([
  "georgia",
  "times new roman",
  "palatino",
  "palatino linotype",
  "book antiqua",
  "arial",
  "helvetica",
  "helvetica neue",
  "trebuchet ms",
  "verdana",
  "courier new",
  "courier",
  "sans-serif",
  "serif",
  "monospace",
  "cursive",
]);

/**
 * Dynamically injects a Google Fonts link tag into document head.
 * Safe to call repeatedly — will only load each family once.
 */
export function loadGoogleFont(family: string): void {
  if (typeof document === "undefined" || !family) return;

  const cleanFamily = family.trim().replace(/^["']|["']$/g, "");
  if (!cleanFamily) return;

  const lower = cleanFamily.toLowerCase();
  if (SYSTEM_FONT_FAMILIES.has(lower) || loadedFontsSet.has(lower)) return;

  const elementId = `gf-${lower.replace(/[^a-z0-9]/g, "-")}`;
  if (document.getElementById(elementId)) {
    loadedFontsSet.add(lower);
    return;
  }

  try {
    const link = document.createElement("link");
    link.id = elementId;
    link.rel = "stylesheet";
    link.href = `https://fonts.googleapis.com/css2?family=${encodeURIComponent(cleanFamily).replace(/%20/g, "+")}&display=swap`;
    document.head.appendChild(link);
    loadedFontsSet.add(lower);
  } catch {
    // Gracefully ignore DOM append errors in edge environments
  }
}

// ─── CUSTOM FONTS ───────────────────────────────────────────────────────────
//
// A custom font is a Google Fonts family the author named themselves. The list
// belongs to the workspace, so it is held in the store and saved with it —
// nothing about it is kept on this machine.

/** Builds the entry for a family name. Throws when the name is empty. */
export function buildCustomFont(familyName: string): FontOption {
  const clean = familyName.trim().replace(/^["']|["']$/g, "");
  if (!clean) throw new Error("Font name cannot be empty.");

  return {
    id: `custom-${clean.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
    label: clean,
    category: "Custom",
    family: clean,
    stack: `"${clean}", sans-serif`,
    note: "Custom Google Font added by you.",
    isGoogleFont: true,
  };
}

// ─── CATEGORIZED FONT ACCESSORS ─────────────────────────────────────────────
const BASE_CATEGORIES: FontCategory[] = [
  "Serif",
  "Sans",
  "Display",
  "Handwriting",
  "Monospace",
  "System",
];

export function getAllFonts(custom: FontOption[] = []): FontOption[] {
  return [...FONT_OPTIONS, ...custom];
}

export const FONTS_BY_CATEGORY: { category: FontCategory; fonts: FontOption[] }[] =
  BASE_CATEGORIES.map((category) => ({
    category,
    fonts: FONT_OPTIONS.filter((font) => font.category === category),
  }));

export function getDynamicFontsByCategory(
  custom: FontOption[] = [],
): { category: FontCategory; fonts: FontOption[] }[] {
  const list: { category: FontCategory; fonts: FontOption[] }[] = BASE_CATEGORIES.map((category) => ({
    category,
    fonts: FONT_OPTIONS.filter((font) => font.category === category),
  }));

  if (custom.length > 0) {
    list.push({ category: "Custom", fonts: custom });
  }

  return list;
}

export function findFont(
  id: string | undefined,
  fallbackId: string,
  custom: FontOption[] = [],
): FontOption {
  if (!id) {
    return FONT_OPTIONS.find((f) => f.id === fallbackId) ?? FONT_OPTIONS[0];
  }

  const all = getAllFonts(custom);

  // 1. Direct match on id
  const byId = all.find((f) => f.id === id);
  if (byId) return byId;

  // 2. Match on family name (case-insensitive)
  const cleanId = id.trim().replace(/^["']|["']$/g, "").toLowerCase();
  const byFamily = all.find((f) => f.family.toLowerCase() === cleanId);
  if (byFamily) return byFamily;

  // 3. Match on stack containing font family
  const byStack = all.find((f) => f.stack.toLowerCase().includes(cleanId));
  if (byStack) return byStack;

  // 4. Fallback font
  return FONT_OPTIONS.find((f) => f.id === fallbackId) ?? FONT_OPTIONS[0];
}

/** The CSS `font-family` value for a stored font id. */
export function fontStack(id: string | undefined, fallbackId: string): string {
  return findFont(id, fallbackId).stack;
}

