import type { Metadata } from "next";
import {
  Inter,
  Lato,
  Source_Sans_3,
  Lora,
  Merriweather,
  EB_Garamond,
  Libre_Baskerville,
  Playfair_Display,
} from "next/font/google";
import "./globals.css";

/**
 * Inter dresses the app chrome and is the default manuscript face, so it is the
 * only one worth preloading. The rest are opt-in per project (see
 * `src/lib/fonts.ts`); the browser fetches one only once a project actually
 * selects it, which is why `preload` is off for them.
 */
const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  display: "swap",
});

const lato = Lato({
  variable: "--font-lato",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "700"],
  style: ["normal", "italic"],
});

const sourceSans = Source_Sans_3({
  variable: "--font-source-sans",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  style: ["normal", "italic"],
});

const lora = Lora({
  variable: "--font-lora",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  style: ["normal", "italic"],
});

const merriweather = Merriweather({
  variable: "--font-merriweather",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  style: ["normal", "italic"],
});

const ebGaramond = EB_Garamond({
  variable: "--font-eb-garamond",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  style: ["normal", "italic"],
});

// Libre Baskerville ships no bold italic, so it stays upright-only and the
// browser synthesises any italics.
const libreBaskerville = Libre_Baskerville({
  variable: "--font-libre-baskerville",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  weight: ["400", "700"],
});

const playfair = Playfair_Display({
  variable: "--font-playfair",
  subsets: ["latin"],
  display: "swap",
  preload: false,
  style: ["normal", "italic"],
});

const fontVariables = [
  inter.variable,
  lato.variable,
  sourceSans.variable,
  lora.variable,
  merriweather.variable,
  ebGaramond.variable,
  libreBaskerville.variable,
  playfair.variable,
].join(" ");

export const metadata: Metadata = {
  title: "Writerdost AI - Quick Ebook Generators with AI Agents",
  description: "A SaaS platform for generating ebooks end-to-end using AI agents.",
};

import ThemeWrapper from "@/components/ThemeWrapper";
import LayoutWrapper from "@/components/layout/LayoutWrapper";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fontVariables} light`}>
      <head>
        <ThemeWrapper />
        {/* App Router: a link in the root layout head is global, so the
            "loads for a single page" warning (a Pages Router concern) does
            not apply. next/font cannot express this icon font's axis range. */}
        {/* eslint-disable-next-line @next/next/no-page-custom-font */}
        <link
          href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-surface text-on-surface font-body selection:bg-primary/20 min-h-screen transition-colors duration-300">
        <LayoutWrapper>
          {children}
        </LayoutWrapper>
      </body>
    </html>
  );
}
