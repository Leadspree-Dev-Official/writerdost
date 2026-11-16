"use client";

import React, { useState } from "react";
import { useAppStore } from "@/lib/app-store";
import type { KdpLaunchKit } from "@/lib/kdp-types";
import { generateLocalKdpFallback } from "@/lib/kdp-launch-service";
import { apiFetch } from "@/lib/api-client";
import SafeHtml from "@/components/SafeHtml";

interface KdpLaunchModalProps {
  projectId: string;
  isOpen: boolean;
  onClose: () => void;
}

type KdpTab = "description" | "keywords" | "categories" | "social" | "pricing";

export const KdpLaunchModal: React.FC<KdpLaunchModalProps> = ({
  projectId,
  isOpen,
  onClose,
}) => {
  const projects = useAppStore((state) => state.projects);
  const setProjectKdpLaunchKit = useAppStore(
    (state) => state.setProjectKdpLaunchKit,
  );
  const api = useAppStore((state) => state.api);
  const settings = useAppStore((state) => state.settings);

  const project = projects.find((p) => p.id === projectId);

  const [activeTab, setActiveTab] = useState<KdpTab>("description");
  const [descView, setDescView] = useState<"preview" | "html" | "plain">(
    "preview",
  );
  const [loading, setLoading] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !project) return null;

  const launchKit: KdpLaunchKit | undefined = project.kdpLaunchKit;

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleGenerate = async () => {
    setLoading(true);
    setError(null);
    try {
      let resultLaunchKit: KdpLaunchKit | null = null;
      try {
        const res = await apiFetch("/api/kdp-launch-kit", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            project,
            api,
            settings,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          if (data.success && data.launchKit) {
            resultLaunchKit = data.launchKit;
          }
        }
      } catch (netErr) {
        console.warn("Backend API call failed, falling back to local strategist engine:", netErr);
      }

      // If backend auth or rate limit declined, generate via local strategist engine
      if (!resultLaunchKit) {
        resultLaunchKit = generateLocalKdpFallback({
          title: project.title,
          description: project.description || project.metaDescription,
          audience: project.audience,
          tone: project.tone,
          genre: (project as { genre?: string }).genre || "Non-Fiction",
          chapters: (project.chapters || []).map((c) => ({
            title: c.title,
            content: typeof c.content === "string" ? c.content.slice(0, 300) : "",
          })),
        });
      }

      setProjectKdpLaunchKit(projectId, resultLaunchKit);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Generation failed");
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadMarkdown = () => {
    if (!launchKit) return;

    const md = `# Amazon KDP Launch Kit & Marketing Suite
**Book Title:** ${project.title}
**Generated Date:** ${new Date().toLocaleDateString()}

---

## 1. Amazon Headline Hook
${launchKit.headline}

## 2. Amazon HTML Description
\`\`\`html
${launchKit.htmlDescription}
\`\`\`

## 3. Plain Text Description
${launchKit.plainDescription}

---

## 4. 7 Amazon Backend Search Keywords
${launchKit.searchKeywords.map((k, i) => `${i + 1}. ${k}`).join("\n")}

---

## 5. Recommended Amazon BISAC Categories
${launchKit.recommendedCategories
  .map(
    (c, i) =>
      `### Category ${i + 1}: ${c.category}\n*Rationale:* ${c.rationale}\n`,
  )
  .join("\n")}

---

## 6. Pricing Strategy
- **Suggested Price:** ${launchKit.pricingRecommendation.suggestedPriceUsd}
- **Royalty Tier:** ${launchKit.pricingRecommendation.kdpRoyaltyTier}
- **Strategy:** ${launchKit.pricingRecommendation.strategy}

---

## 7. Social Launch Campaign

### Viral Twitter / X Thread (5 Tweets)
${launchKit.socialPosts.twitterThread
  .map((t, i) => `**Tweet ${i + 1}:**\n${t}\n`)
  .join("\n")}

### LinkedIn Launch Article
${launchKit.socialPosts.linkedinPost}

### Email Newsletter Teaser
${launchKit.socialPosts.newsletterTeaser}
`;

    const blob = new Blob([md], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${project.title.replace(/\s+/g, "_")}_KDP_Launch_Kit.md`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/80 backdrop-blur-md animate-fade-in font-body overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-surface-container border border-outline-variant/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-outline-variant/20 bg-surface-container-high/40">
          <div className="flex items-center gap-3">
            <span className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shadow-md">
              <span className="material-symbols-outlined text-lg">rocket_launch</span>
            </span>
            <div>
              <h3 className="text-base font-bold text-on-surface">
                Amazon KDP Launch Kit &amp; Marketing Suite
              </h3>
              <p className="text-xs text-on-surface-variant">
                High-converting KDP descriptions, 7 search keywords, BISAC categories &amp; social campaign
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest transition-colors"
          >
            <span className="material-symbols-outlined text-xl">close</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="flex items-center gap-1 px-6 pt-3 border-b border-outline-variant/15 overflow-x-auto bg-surface-container-high/20">
          {[
            { id: "description", label: "Amazon Description", icon: "description" },
            { id: "keywords", label: "7 Search Keywords", icon: "key" },
            { id: "categories", label: "Categories", icon: "category" },
            { id: "pricing", label: "Pricing Strategy", icon: "payments" },
            { id: "social", label: "Social Campaign", icon: "share" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as KdpTab)}
              className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-semibold rounded-t-lg border-b-2 transition-all whitespace-nowrap ${
                activeTab === t.id
                  ? "border-primary text-primary bg-primary/5"
                  : "border-transparent text-on-surface-variant hover:text-on-surface"
              }`}
            >
              <span className="material-symbols-outlined text-sm">{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* Content Area */}
        <div className="flex-1 p-6 overflow-y-auto min-h-[350px]">
          {error && (
            <div className="mb-4 p-3 rounded-lg bg-red-950/40 border border-red-800/40 text-red-400 text-xs flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">error</span>
              <span>{error}</span>
            </div>
          )}

          {!launchKit && !loading && (
            <div className="py-12 flex flex-col items-center justify-center text-center max-w-md mx-auto">
              <div className="w-16 h-16 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20 flex items-center justify-center mb-4">
                <span className="material-symbols-outlined text-3xl">storefront</span>
              </div>
              <h4 className="text-base font-bold text-on-surface mb-1">
                Generate Your Launch Kit
              </h4>
              <p className="text-xs text-on-surface-variant mb-6 leading-relaxed">
                Writerdost AI will analyze &ldquo;{project.title}&rdquo;, your chapters, audience, and tone to craft a tailored Amazon KDP description, 7 backend search terms, category targets, and viral social campaign.
              </p>
              <button
                type="button"
                onClick={handleGenerate}
                disabled={loading}
                className="btn btn-primary px-6 py-2.5 text-xs font-bold shadow-lg shadow-primary/25 flex items-center gap-2 cursor-pointer"
              >
                <span className="material-symbols-outlined text-base">auto_awesome</span>
                <span>Generate KDP Launch Kit</span>
              </button>
            </div>
          )}

          {loading && (
            <div className="py-16 flex flex-col items-center justify-center text-center">
              <div className="w-12 h-12 rounded-full border-3 border-outline-variant/30 border-t-amber-500 animate-spin mb-4" />
              <p className="text-sm font-semibold text-on-surface">
                Synthesizing Amazon KDP Launch Kit...
              </p>
              <p className="text-xs text-on-surface-variant mt-1">
                Optimizing search keywords, BISAC categories, and HTML copy
              </p>
            </div>
          )}

          {launchKit && !loading && (
            <>
              {/* Tab 1: Description */}
              {activeTab === "description" && (
                <div className="space-y-4">
                  {/* Headline Banner */}
                  <div className="p-4 rounded-xl bg-surface-container-high/60 border border-outline-variant/20 flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-amber-500 block mb-1">
                        Headline Hook
                      </span>
                      <p className="text-sm font-bold text-on-surface">
                        {launchKit.headline}
                      </p>
                    </div>
                    <button
                      onClick={() => handleCopy(launchKit.headline, "headline")}
                      className="btn btn-secondary btn-sm text-xs shrink-0"
                    >
                      <span className="material-symbols-outlined text-xs">
                        {copiedKey === "headline" ? "check" : "content_copy"}
                      </span>
                      {copiedKey === "headline" ? "Copied" : "Copy"}
                    </button>
                  </div>

                  {/* Format Selector & Copy */}
                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-1 bg-surface-container-high/40 p-1 rounded-lg border border-outline-variant/20">
                      {(["preview", "html", "plain"] as const).map((view) => (
                        <button
                          key={view}
                          onClick={() => setDescView(view)}
                          className={`px-3 py-1 rounded text-xs font-semibold capitalize transition-all ${
                            descView === view
                              ? "bg-primary text-white shadow-sm"
                              : "text-on-surface-variant hover:text-on-surface"
                          }`}
                        >
                          {view}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() =>
                        handleCopy(
                          descView === "html"
                            ? launchKit.htmlDescription
                            : launchKit.plainDescription,
                          "desc",
                        )
                      }
                      className="btn btn-secondary btn-sm text-xs flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-xs">
                        {copiedKey === "desc" ? "check" : "content_copy"}
                      </span>
                      <span>
                        {copiedKey === "desc"
                          ? "Copied to Clipboard!"
                          : descView === "html"
                          ? "Copy KDP HTML"
                          : "Copy Plain Text"}
                      </span>
                    </button>
                  </div>

                  {/* Body Content */}
                  <div className="p-5 rounded-xl border border-outline-variant/20 bg-surface-container-highest/20 min-h-[220px]">
                    {descView === "preview" && (
                      <div className="prose prose-invert prose-sm max-w-none text-on-surface">
                        <SafeHtml html={launchKit.htmlDescription} />
                      </div>
                    )}
                    {descView === "html" && (
                      <pre className="text-xs font-mono text-slate-300 whitespace-pre-wrap select-all">
                        {launchKit.htmlDescription}
                      </pre>
                    )}
                    {descView === "plain" && (
                      <pre className="text-xs font-body text-slate-300 whitespace-pre-wrap select-all">
                        {launchKit.plainDescription}
                      </pre>
                    )}
                  </div>
                </div>
              )}

              {/* Tab 2: 7 Keywords */}
              {activeTab === "keywords" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                        Amazon KDP 7 Backend Keywords
                      </h4>
                      <p className="text-xs text-on-surface-variant">
                        Paste each into the 7 keyword slots in your KDP book setup
                      </p>
                    </div>
                    <button
                      onClick={() =>
                        handleCopy(launchKit.searchKeywords.join(", "), "all-keywords")
                      }
                      className="btn btn-secondary btn-sm text-xs flex items-center gap-1.5"
                    >
                      <span className="material-symbols-outlined text-xs">
                        {copiedKey === "all-keywords" ? "check" : "content_copy"}
                      </span>
                      <span>
                        {copiedKey === "all-keywords"
                          ? "All Copied!"
                          : "Copy All 7 Keywords"}
                      </span>
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                    {launchKit.searchKeywords.map((kw, i) => (
                      <div
                        key={i}
                        className="flex items-center justify-between p-3 rounded-xl border border-outline-variant/20 bg-surface-container-high/30 hover:border-primary/40 transition-colors"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <span className="w-5 h-5 rounded-full bg-primary/10 text-primary text-[10px] font-bold flex items-center justify-center shrink-0">
                            {i + 1}
                          </span>
                          <span className="text-xs font-semibold text-on-surface truncate">
                            {kw}
                          </span>
                        </div>
                        <button
                          onClick={() => handleCopy(kw, `kw-${i}`)}
                          className="p-1 rounded text-on-surface-variant hover:text-on-surface hover:bg-surface-container-highest"
                          title="Copy keyword"
                        >
                          <span className="material-symbols-outlined text-xs">
                            {copiedKey === `kw-${i}` ? "check" : "content_copy"}
                          </span>
                        </button>
                      </div>
                    ))}
                  </div>

                  <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300">
                    <span className="font-bold">Amazon KDP Keyword Tip:</span> Avoid repeating words that already appear in your book title or subtitle. Amazon&apos;s indexing algorithm combines title + subtitle + backend keywords automatically.
                  </div>
                </div>
              )}

              {/* Tab 3: Categories */}
              {activeTab === "categories" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider">
                        Recommended BISAC Categories
                      </h4>
                      <p className="text-xs text-on-surface-variant">
                        Targeted for high buyer intent and Amazon Best Seller rank velocity
                      </p>
                    </div>
                  </div>

                  <div className="space-y-3 pt-2">
                    {launchKit.recommendedCategories.map((c, i) => (
                      <div
                        key={i}
                        className="p-4 rounded-xl border border-outline-variant/20 bg-surface-container-high/30"
                      >
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                          <span className="text-xs font-bold text-primary flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-sm">label</span>
                            {c.category}
                          </span>
                          <button
                            onClick={() => handleCopy(c.category, `cat-${i}`)}
                            className="btn btn-secondary btn-sm text-[11px] py-1 px-2.5"
                          >
                            <span className="material-symbols-outlined text-xs">
                              {copiedKey === `cat-${i}` ? "check" : "content_copy"}
                            </span>
                            {copiedKey === `cat-${i}` ? "Copied" : "Copy"}
                          </button>
                        </div>
                        <p className="text-xs text-on-surface-variant">
                          {c.rationale}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Tab 4: Pricing Strategy */}
              {activeTab === "pricing" && (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="p-4 rounded-xl border border-outline-variant/20 bg-surface-container-high/40">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1">
                        Recommended Price (USD)
                      </span>
                      <p className="text-2xl font-black text-on-surface">
                        {launchKit.pricingRecommendation.suggestedPriceUsd}
                      </p>
                    </div>
                    <div className="p-4 rounded-xl border border-outline-variant/20 bg-surface-container-high/40">
                      <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant block mb-1">
                        KDP Royalty Tier
                      </span>
                      <p className="text-2xl font-black text-emerald-400">
                        {launchKit.pricingRecommendation.kdpRoyaltyTier} Royalty
                      </p>
                    </div>
                  </div>

                  <div className="p-5 rounded-xl border border-outline-variant/20 bg-surface-container-highest/20">
                    <h5 className="text-xs font-bold uppercase tracking-wider text-on-surface mb-2">
                      Launch Velocity Strategy
                    </h5>
                    <p className="text-xs text-on-surface-variant leading-relaxed">
                      {launchKit.pricingRecommendation.strategy}
                    </p>
                  </div>
                </div>
              )}

              {/* Tab 5: Social Campaign */}
              {activeTab === "social" && (
                <div className="space-y-6">
                  {/* Twitter / X Thread */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-sky-400">chat</span>
                        Viral Twitter / X Thread ({launchKit.socialPosts.twitterThread.length} Tweets)
                      </h4>
                      <button
                        onClick={() =>
                          handleCopy(
                            launchKit.socialPosts.twitterThread.join("\n\n---\n\n"),
                            "twitter-all",
                          )
                        }
                        className="btn btn-secondary btn-sm text-[11px]"
                      >
                        {copiedKey === "twitter-all" ? "All Copied!" : "Copy Full Thread"}
                      </button>
                    </div>

                    <div className="space-y-2.5">
                      {launchKit.socialPosts.twitterThread.map((tweet, i) => (
                        <div
                          key={i}
                          className="p-3.5 rounded-xl border border-outline-variant/20 bg-surface-container-high/30 flex items-start justify-between gap-3"
                        >
                          <div className="flex items-start gap-2.5">
                            <span className="text-[11px] font-bold text-sky-400 shrink-0 mt-0.5">
                              #{i + 1}
                            </span>
                            <p className="text-xs text-on-surface whitespace-pre-wrap">
                              {tweet}
                            </p>
                          </div>
                          <button
                            onClick={() => handleCopy(tweet, `tweet-${i}`)}
                            className="p-1 rounded text-on-surface-variant hover:text-on-surface shrink-0"
                            title="Copy tweet"
                          >
                            <span className="material-symbols-outlined text-xs">
                              {copiedKey === `tweet-${i}` ? "check" : "content_copy"}
                            </span>
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* LinkedIn Article */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-blue-400">feed</span>
                        LinkedIn Launch Post
                      </h4>
                      <button
                        onClick={() =>
                          handleCopy(launchKit.socialPosts.linkedinPost, "linkedin")
                        }
                        className="btn btn-secondary btn-sm text-[11px]"
                      >
                        {copiedKey === "linkedin" ? "Copied!" : "Copy Post"}
                      </button>
                    </div>
                    <div className="p-4 rounded-xl border border-outline-variant/20 bg-surface-container-high/30">
                      <p className="text-xs text-on-surface whitespace-pre-wrap leading-relaxed">
                        {launchKit.socialPosts.linkedinPost}
                      </p>
                    </div>
                  </div>

                  {/* Newsletter Teaser */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
                        <span className="material-symbols-outlined text-sm text-purple-400">mail</span>
                        Subscriber Newsletter Teaser
                      </h4>
                      <button
                        onClick={() =>
                          handleCopy(launchKit.socialPosts.newsletterTeaser, "newsletter")
                        }
                        className="btn btn-secondary btn-sm text-[11px]"
                      >
                        {copiedKey === "newsletter" ? "Copied!" : "Copy Email"}
                      </button>
                    </div>
                    <div className="p-4 rounded-xl border border-outline-variant/20 bg-surface-container-high/30">
                      <p className="text-xs text-on-surface whitespace-pre-wrap leading-relaxed font-mono">
                        {launchKit.socialPosts.newsletterTeaser}
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-outline-variant/20 bg-surface-container-high/40">
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary btn-sm"
          >
            Close
          </button>

          <div className="flex items-center gap-2">
            {launchKit && (
              <>
                <button
                  type="button"
                  onClick={handleGenerate}
                  disabled={loading}
                  className="btn btn-secondary btn-sm flex items-center gap-1 text-xs"
                >
                  <span className="material-symbols-outlined text-xs">refresh</span>
                  <span>Re-generate</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadMarkdown}
                  className="btn btn-primary btn-sm flex items-center gap-1.5 text-xs shadow-md shadow-primary/20"
                >
                  <span className="material-symbols-outlined text-xs">download</span>
                  <span>Export Launch Kit (.md)</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
