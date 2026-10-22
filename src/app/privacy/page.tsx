import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Privacy Policy — Writerdost AI",
  description: "How Writerdost AI stores account data, manuscripts, and connected credentials.",
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <main className="min-h-screen bg-surface text-on-surface py-16 px-4">
      <article className="max-w-3xl mx-auto prose prose-slate dark:prose-invert">
        <h1>Privacy Policy</h1>
        <p className="text-sm text-on-surface-variant">Last updated: 22 October 2026</p>
        <p>
          Writerdost AI is operated by LeadSpree Business Solutions. This policy explains
          what we collect, where it is stored, and the choices you have. The service is
          currently in beta; we will update this policy before introducing billing.
        </p>
        <h2>What we collect</h2>
        <ul>
          <li>Account details: name, email address, account preferences, and plan/access flags.</li>
          <li>Workspace content: manuscripts, chapters, project settings, and generated drafts.</li>
          <li>Connected-service credentials: AI, marketplace, and publishing credentials, encrypted with a server-held AES-256-GCM key.</li>
          <li>Operational data: automation runs, generated posts, errors, and token usage.</li>
        </ul>
        <h2>Where it is processed</h2>
        <p>
          Account and workspace data are stored in Appwrite Cloud. When you use an AI
          provider, the prompts and content needed for that request are sent to the provider
          you select. If you self-host and enable local Ollama, the AI request can stay on
          your own machine. Google Fonts and other third-party assets may receive standard
          request metadata when your browser loads them.
        </p>
        <h2>How long we keep it</h2>
        <p>
          Workspace content is kept while your account is active. Operational run data is
          retained for up to 90 days, publish-job records for up to 180 days, and
          source-deduplication history is compacted periodically. Backups are retained on a
          rolling schedule. You can ask us to delete your account and its content by
          contacting contact@leadspree.in; self-service deletion will be added before
          general availability.
        </p>
        <h2>Your choices</h2>
        <p>
          You can export your manuscripts from the editor. You can remove connected
          destinations and AI keys from Settings. To request a copy or deletion of your
          account data, contact contact@leadspree.in. We may need to verify that you own the
          account before acting.
        </p>
        <h2>Security</h2>
        <p>
          We use encrypted credential storage, scoped server credentials, row-level access
          controls, authenticated API routes, and outbound network restrictions. No system is
          perfectly secure; report a concern to contact@leadspree.in.
        </p>
        <h2>Contact</h2>
        <p>
          LeadSpree Business Solutions · <a href="mailto:contact@leadspree.in">contact@leadspree.in</a>
        </p>
        <p><Link href="/terms">Read the Terms of Service</Link></p>
      </article>
    </main>
  );
}
