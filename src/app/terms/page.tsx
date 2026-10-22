import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Terms of Service — Writerdost AI",
  description: "The terms that apply to the Writerdost AI beta.",
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <main className="min-h-screen bg-surface text-on-surface py-16 px-4">
      <article className="max-w-3xl mx-auto prose prose-slate dark:prose-invert">
        <h1>Terms of Service</h1>
        <p className="text-sm text-on-surface-variant">Last updated: 22 October 2026</p>
        <p>
          These terms govern your use of the Writerdost AI beta operated by LeadSpree
          Business Solutions. By creating an account you agree to them. If you do not agree,
          do not use the service.
        </p>
        <h2>Beta service</h2>
        <p>
          Features may change, be interrupted, or be withdrawn during the beta. AI-generated
          output can be inaccurate, incomplete, or unsuitable for your purpose. You are
          responsible for reviewing content before publishing it.
        </p>
        <h2>Your content and account</h2>
        <p>
          You retain ownership of the manuscripts and other content you submit. You grant us
          the limited permission needed to store, process, and transmit that content to
          provide the service and the integrations you enable. You must have the rights to
          the content you upload and must not use the service for unlawful, infringing, or
          abusive activity, or to publish spam or misleading material.
        </p>
        <h2>Third-party services</h2>
        <p>
          You are responsible for your own AI, marketplace, and publishing accounts, their
          terms, and any charges they apply. API keys you connect are stored encrypted and
          used only to make the requests you configure.
        </p>
        <h2>Availability and liability</h2>
        <p>
          The service is provided on an “as available” basis during the beta. To the maximum
          extent permitted by law, LeadSpree is not liable for indirect or consequential loss,
          lost profits, or loss of content arising from your use of the beta. Nothing in these
          terms limits rights that cannot lawfully be limited.
        </p>
        <h2>Changes and contact</h2>
        <p>
          We may update these terms as the product develops and will post the new version
          here. Questions: <a href="mailto:contact@leadspree.in">contact@leadspree.in</a>.
        </p>
        <p><Link href="/privacy">Read the Privacy Policy</Link></p>
      </article>
    </main>
  );
}
