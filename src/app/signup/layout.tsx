import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Create an account — Writerdost AI",
  description: "Create a free Writerdost AI beta account.",
  robots: { index: false, follow: false },
};

export default function SignupLayout({ children }: { children: React.ReactNode }) {
  return children;
}
