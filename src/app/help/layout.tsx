import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Help — Writerdost AI",
  description: "Guides and AI-assisted support for WriterDost.",
  robots: { index: false, follow: false },
};

export default function HelpLayout({ children }: { children: React.ReactNode }) {
  return children;
}
