import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Sign in — Writerdost AI",
  description: "Sign in to your Writerdost AI writing workspace.",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return children;
}
