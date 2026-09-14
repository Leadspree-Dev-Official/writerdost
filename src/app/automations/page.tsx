"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/lib/app-store";
import {
  FREQUENCY_LABELS,
  FREQUENCY_ORDER,
  DATE_LABELS,
  describeFrequency,
  describeNextRun,
  todayIso,
} from "@/lib/automation/schedule";
import type {
  AutomationFrequency,
  AutomationDestination,
  AutomationDestinationKind,
  AutomationSourceKind,
  AutomationPublishMode,
  BlogAutomation,
  CampaignPost,
} from "@/lib/store-types";

/** Mirrors the server adapters so the form knows what each platform needs. */
const DESTINATION_FIELDS: Record<
  AutomationDestinationKind,
  { label: string; fields: Array<{ name: string; label: string; secret?: boolean; help?: string; placeholder?: string }> }
> = {
  wordpress: {
    label: "WordPress",
    fields: [
      { name: "siteUrl", label: "Site URL", help: "https://example.com — /wp-json is added for you", placeholder: "https://example.com" },
      { name: "username", label: "Username", placeholder: "admin" },
      { name: "secret", label: "Application password", secret: true, help: "Users → Profile → Application Passwords", placeholder: "••••••••••••••••" },
      { name: "categoryId", label: "Category ID (optional)", placeholder: "e.g. 1" },
    ],
  },
  ghost: {
    label: "Ghost",
    fields: [
      { name: "siteUrl", label: "Site URL", placeholder: "https://your-blog.ghost.io" },
      { name: "secret", label: "Admin API key", secret: true, help: "Format: <id>:<hex secret>", placeholder: "63f...:9a8..." },
    ],
  },
  webflow: {
    label: "Webflow",
    fields: [
      { name: "collectionId", label: "Collection ID", placeholder: "e.g. 5f8a..." },
      { name: "secret", label: "API token", secret: true, placeholder: "••••••••••••••••" },
      { name: "fieldMap", label: "Field slugs", help: "name,slug,post-body", placeholder: "name,slug,post-body" },
    ],
  },
  strapi: {
    label: "Strapi",
    fields: [
      { name: "siteUrl", label: "API URL", placeholder: "https://api.example.com" },
      { name: "collection", label: "Collection", help: "e.g. articles", placeholder: "articles" },
      { name: "secret", label: "API token", secret: true, placeholder: "••••••••••••••••" },
    ],
  },
  sanity: {
    label: "Sanity",
    fields: [
      { name: "projectId", label: "Project ID", placeholder: "e.g. a1b2c3d4" },
      { name: "dataset", label: "Dataset", placeholder: "production" },
      { name: "docType", label: "Document type", placeholder: "post" },
      { name: "secret", label: "API token", secret: true, placeholder: "••••••••••••••••" },
    ],
  },
  webhook: {
    label: "Generic webhook",
    fields: [
      { name: "endpoint", label: "Endpoint URL", placeholder: "https://hooks.example.com/blog" },
      { name: "secret", label: "Signing secret (optional)", secret: true, placeholder: "Optional webhook secret" },
    ],
  },
};

const SOURCE_LABELS: Record<AutomationSourceKind, string> = {
  topic: "Fixed topics",
  rss: "RSS / Atom feed",
  sitemap: "Sitemap",
  url: "Single article URL",
};

const PUBLISH_LABELS: Record<AutomationPublishMode, string> = {
  draft: "Always draft (review before it goes live)",
  gated: "Publish only if it passes the quality gate",
  publish: "Publish immediately",
};

type PreviewState = {
  loading: boolean;
  error?: string;
  post?: {
    title: string;
    slug?: string;
    bodyHtml: string;
    bodyMarkdown: string;
    metaDescription: string;
    excerpt?: string;
    keywords?: string[];
    sourceUrl?: string;
    featuredImage?: string | null;
  };
  quality?: { passed: boolean; wordCount: number; issues: string[] };
  tokens?: number;
  source?: { url: string | null; title: string; words: number };
};

const field =
  "w-full h-11 px-3 rounded-[var(--radius)] bg-surface-container-lowest border border-[var(--hairline)] text-[14px] text-on-surface focus:outline-none focus:border-primary transition-colors";
const labelCls = "block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant mb-1.5";
const card = "rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-surface p-4";

export default function AutomationsPage() {
  const router = useRouter();
  const automations = useAppStore((s) => s.automations);
  const destinations = useAppStore((s) => s.automationDestinations);
  const campaignPosts = useAppStore((s) => s.campaignPosts);
  const api = useAppStore((s) => s.api);
  const createAutomation = useAppStore((s) => s.createAutomation);
  const updateAutomation = useAppStore((s) => s.updateAutomation);
  const deleteAutomation = useAppStore((s) => s.deleteAutomation);
  const saveDestination = useAppStore((s) => s.saveAutomationDestination);
  const deleteDestination = useAppStore((s) => s.deleteAutomationDestination);
  const saveCampaignPost = useAppStore((s) => s.saveCampaignPost);
  const deleteCampaignPost = useAppStore((s) => s.deleteCampaignPost);
  const loadCampaignPostToEditor = useAppStore((s) => s.loadCampaignPostToEditor);
  const loadAutomationData = useAppStore((s) => s.loadAutomationData);
  const automationsLoaded = useAppStore((s) => s.automationsLoaded);
  const automationSync = useAppStore((s) => s.automationSync);

  const [selectedId, setSelectedId] = useState<string | null>(automations[0]?.id ?? null);

  // Campaigns live in Appwrite, so the screen starts empty and fills in.
  useEffect(() => {
    void loadAutomationData();
  }, [loadAutomationData]);
  const [activeTab, setActiveTab] = useState<"posts" | "preview">("posts");
  const [preview, setPreview] = useState<PreviewState>({ loading: false });
  const [showDestForm, setShowDestForm] = useState(false);
  const [isGeneratingNow, setIsGeneratingNow] = useState(false);
  const [saveFeedback, setSaveFeedback] = useState<string | null>(null);
  const [viewingPost, setViewingPost] = useState<CampaignPost | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [draftDest, setDraftDest] = useState<AutomationDestination>({
    id: "",
    name: "",
    kind: "wordpress",
    config: {},
  });

  const selected = useMemo(
    () => automations.find((a) => a.id === selectedId) ?? automations[0] ?? null,
    [automations, selectedId],
  );

  // Campaigns created before these fields existed fall back to the old defaults.
  const frequency: AutomationFrequency = selected?.frequency ?? "daily";
  const schedule = selected
    ? {
        ...selected,
        frequency,
        startDate: selected.startDate || todayIso(),
        startTime: selected.startTime || "09:00",
      }
    : null;

  const patch = (payload: Partial<BlogAutomation>) => {
    if (selected) updateAutomation(selected.id, payload);
  };

  const aiReady = Boolean(api.model && (api.apiKey || api.provider === "ollama"));

  const selectedCampaignPosts = useMemo(
    () => (campaignPosts || []).filter((p) => p.automationId === selected?.id),
    [campaignPosts, selected?.id],
  );

  const copyText = async (text: string, id: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  const handleOpenInEditor = (post: CampaignPost) => {
    loadCampaignPostToEditor(post.id);
    router.push("/blog-generator");
  };

  const handleSavePreviewAsDraft = async () => {
    if (!preview.post || !selected) return null;
    const title = preview.post.title;
    const slug = preview.post.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    const saved = await saveCampaignPost({
      automationId: selected.id,
      title,
      slug,
      bodyHtml: preview.post.bodyHtml,
      bodyMarkdown: preview.post.bodyMarkdown,
      excerpt: preview.post.excerpt || "",
      metaDescription: preview.post.metaDescription,
      keywords: preview.post.keywords || [],
      sourceUrl: preview.post.sourceUrl,
      sourceTitle: preview.source?.title,
      state: "draft",
      quality: preview.quality,
      tokens: preview.tokens,
    });
    // A failed write is reported by the store; do not claim a draft was kept.
    if (!saved) return null;

    setSaveFeedback(`Saved "${saved.title}" to campaign drafts!`);
    setTimeout(() => setSaveFeedback(null), 3500);
    setActiveTab("posts");
    return saved;
  };

  const runPreview = async () => {
    if (!selected) return;
    setPreview({ loading: true, error: undefined });
    setActiveTab("preview");

    const destination = destinations.find((d) => d.id === selected.destinationId);

    try {
      const response = await fetch("/api/automations/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          automation: {
            name: selected.name,
            enabled: selected.enabled,
            sourceKind: selected.sourceKind,
            sourceConfig: selected.sourceConfig,
            contentConfig: selected.contentConfig,
            api,
            publish: selected.publish,
            frequency,
            startDate: schedule?.startDate ?? "",
            startTime: schedule?.startTime ?? "09:00",
            scheduleCron: selected.scheduleCron,
            timezone: selected.timezone,
            lastRunAt: null,
            nextRunAt: null,
            destination: destination
              ? {
                  id: destination.id,
                  name: destination.name,
                  kind: destination.kind,
                  config: destination.config,
                  secret: destination.config.secret,
                }
              : null,
          },
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        setPreview({ loading: false, error: payload.error || "The preview failed." });
        return;
      }

      updateAutomation(selected.id, { lastPreviewAt: new Date().toISOString() });
      setPreview({ loading: false, ...payload });
    } catch (error) {
      setPreview({
        loading: false,
        error: error instanceof Error ? error.message : "Could not reach the server.",
      });
    }
  };

  const handleGenerateBlogNow = async () => {
    if (!selected) return;
    if (!aiReady) {
      alert("Configure an AI provider and model in Settings → AI Settings before generating.");
      return;
    }

    setIsGeneratingNow(true);
    setSaveFeedback(null);

    const destination = destinations.find((d) => d.id === selected.destinationId);

    try {
      const response = await fetch("/api/automations/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          automation: {
            name: selected.name,
            enabled: selected.enabled,
            sourceKind: selected.sourceKind,
            sourceConfig: selected.sourceConfig,
            contentConfig: selected.contentConfig,
            api,
            publish: selected.publish,
            frequency,
            startDate: schedule?.startDate ?? "",
            startTime: schedule?.startTime ?? "09:00",
            scheduleCron: selected.scheduleCron,
            timezone: selected.timezone,
            lastRunAt: null,
            nextRunAt: null,
            destination: destination
              ? {
                  id: destination.id,
                  name: destination.name,
                  kind: destination.kind,
                  config: destination.config,
                  secret: destination.config.secret,
                }
              : null,
          },
        }),
      });

      const payload = await response.json();
      if (!response.ok) {
        alert(payload.error || "Generation failed.");
        return;
      }

      if (payload.post) {
        const title = payload.post.title;
        const slug = payload.post.slug || title.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
        const saved = await saveCampaignPost({
          automationId: selected.id,
          title,
          slug,
          bodyHtml: payload.post.bodyHtml,
          bodyMarkdown: payload.post.bodyMarkdown,
          excerpt: payload.post.excerpt,
          metaDescription: payload.post.metaDescription,
          keywords: payload.post.keywords || [],
          sourceUrl: payload.post.sourceUrl,
          sourceTitle: payload.source?.title,
          state: "draft",
          quality: payload.quality,
          tokens: payload.tokens,
        });

        updateAutomation(selected.id, { lastPreviewAt: new Date().toISOString() });
        setActiveTab("posts");
        if (saved) {
          setSaveFeedback(`Successfully generated and saved "${saved.title}"!`);
          setTimeout(() => setSaveFeedback(null), 4000);
        }
      }
    } catch (error) {
      alert(error instanceof Error ? error.message : "Could not reach the server.");
    } finally {
      setIsGeneratingNow(false);
    }
  };

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-[17px] font-bold text-on-surface">BlogGen</h1>
            <span className="rounded-full bg-primary/10 px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-[0.04em] text-primary dark:bg-primary/20 dark:text-indigo-300">
              Beta
            </span>
          </div>
          <p className="text-[12.5px] text-on-surface-variant">
            Blog campaigns that write from a topic list or a source feed, then push to your site.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-filled btn-sm"
          onClick={async () => {
            const created = await createAutomation(`Blog Campaign ${automations.length + 1}`);
            if (!created) return;
            setSelectedId(created.id);
            setActiveTab("posts");
          }}
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          New Blog Campaign
        </button>
      </header>

      {saveFeedback && (
        <div className="rounded-[var(--radius)] border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-[12.5px] text-emerald-800 dark:text-emerald-300 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-[18px]">check_circle</span>
            <span>{saveFeedback}</span>
          </div>
          <button
            type="button"
            className="text-on-surface-variant hover:text-on-surface text-[11px]"
            onClick={() => setSaveFeedback(null)}
          >
            Dismiss
          </button>
        </div>
      )}

      {!aiReady && (
        <div className="rounded-[var(--radius)] border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[12.5px] text-on-surface">
          Set an AI provider and model in <strong>AI settings</strong> before running a campaign.
        </div>
      )}

      {automationSync.error && (
        <div className="rounded-[var(--radius)] border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12.5px] text-on-surface flex items-start gap-2">
          <span className="material-symbols-outlined text-[15px] mt-0.5 shrink-0">cloud_off</span>
          <span>{automationSync.error}</span>
        </div>
      )}

      <div className="rounded-[var(--radius)] border border-[var(--hairline)] bg-surface-container-lowest px-3 py-2 text-[12.5px] text-on-surface-variant flex items-start gap-2">
        <span className="material-symbols-outlined text-[15px] mt-0.5 shrink-0">
          {automationSync.pending ? "cloud_sync" : "cloud_done"}
        </span>
        <span>
          {automationSync.pending ? (
            <>Saving to Appwrite&hellip;</>
          ) : (
            <>
              Campaigns are stored in Appwrite, so the scheduler can run them unattended. The AI key
              from <strong className="text-on-surface">AI settings</strong> is encrypted server-side
              and saved with each campaign, because a background run has no browser to ask.
            </>
          )}
        </span>
      </div>

      {!automationsLoaded ? (
        <div className={`${card} text-center py-10`}>
          <p className="text-[13px] text-on-surface-variant">Loading campaigns&hellip;</p>
        </div>
      ) : automations.length === 0 ? (
        <div className={`${card} text-center py-10`}>
          <p className="text-[13px] text-on-surface-variant">
            No blog campaigns yet. Create one to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[220px_minmax(0,1fr)_minmax(0,1.2fr)] gap-4">
          {/* List */}
          <aside className="space-y-1.5">
            {automations.map((automation) => {
              const count = (campaignPosts || []).filter((p) => p.automationId === automation.id).length;
              return (
                <button
                  key={automation.id}
                  type="button"
                  onClick={() => {
                    setSelectedId(automation.id);
                    setPreview({ loading: false });
                    setViewingPost(null);
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-[var(--radius)] border transition-colors ${
                    selected?.id === automation.id
                      ? "border-primary bg-primary/10"
                      : "border-[var(--hairline)] hover:bg-on-surface/[0.04]"
                  }`}
                >
                  <div className="flex items-center justify-between gap-1">
                    <span className="block text-[13px] font-semibold text-on-surface truncate">
                      {automation.name}
                    </span>
                    {count > 0 && (
                      <span className="px-1.5 py-0.2 rounded-full text-[10px] font-semibold bg-primary/15 text-primary shrink-0">
                        {count}
                      </span>
                    )}
                  </div>
                  <span className="block text-[11px] text-on-surface-variant">
                    <span
                      className={`inline-block w-1.5 h-1.5 rounded-full mr-1.5 align-middle ${
                        automation.enabled ? "bg-emerald-500" : "bg-on-surface/25"
                      }`}
                      aria-hidden="true"
                    />
                    {automation.enabled ? "Scheduled" : "Paused"} ·{" "}
                    {SOURCE_LABELS[automation.sourceKind]}
                  </span>
                </button>
              );
            })}
          </aside>

          {/* Configuration */}
          {selected && (
            <section className={`${card} space-y-4`}>
              <div>
                <label className={labelCls} htmlFor="auto-name">Name</label>
                <input
                  id="auto-name"
                  className={field}
                  placeholder="e.g. Weekly Tech Deep Dives"
                  value={selected.name}
                  onChange={(e) => patch({ name: e.target.value })}
                />
              </div>

              <div>
                <label className={labelCls} htmlFor="auto-source">Source</label>
                <select
                  id="auto-source"
                  className={field}
                  value={selected.sourceKind}
                  onChange={(e) => patch({ sourceKind: e.target.value as AutomationSourceKind })}
                >
                  {Object.entries(SOURCE_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              {selected.sourceKind === "topic" ? (
                <div>
                  <label className={labelCls} htmlFor="auto-topics">Topics (one per line)</label>
                  <textarea
                    id="auto-topics"
                    rows={6}
                    className={`${field} h-auto min-h-[9rem] py-2.5 resize-y leading-relaxed`}
                    value={(selected.sourceConfig.topics || []).join("\n")}
                    onChange={(e) =>
                      patch({
                        sourceConfig: {
                          ...selected.sourceConfig,
                          topics: e.target.value.split("\n").map((t) => t.trim()).filter(Boolean),
                        },
                      })
                    }
                    placeholder={"How to price a SaaS product\nWriting a launch email"}
                  />
                  <p className="mt-1 text-[11px] text-on-surface-variant">
                    Topics rotate, so the same subject is not written twice in a row.
                  </p>
                </div>
              ) : (
                <div>
                  <label className={labelCls} htmlFor="auto-feed">
                    {selected.sourceKind === "url" ? "Article URL" : "Feed URL"}
                  </label>
                  <input
                    id="auto-feed"
                    className={field}
                    value={selected.sourceConfig.feedUrl || ""}
                    onChange={(e) =>
                      patch({ sourceConfig: { ...selected.sourceConfig, feedUrl: e.target.value } })
                    }
                    placeholder="https://example.com/feed"
                  />
                  <p className="mt-1 text-[11px] text-on-surface-variant">
                    Source articles are research input. Each post is written fresh, not paraphrased.
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} htmlFor="auto-tone">Tone</label>
                  <input
                    id="auto-tone"
                    className={field}
                    placeholder="e.g. Professional"
                    value={selected.contentConfig.tone}
                    onChange={(e) =>
                      patch({ contentConfig: { ...selected.contentConfig, tone: e.target.value } })
                    }
                  />
                </div>
                <div>
                  <label className={labelCls} htmlFor="auto-words">Target words</label>
                  <input
                    id="auto-words"
                    type="number"
                    className={field}
                    placeholder="1000"
                    value={selected.contentConfig.targetWords}
                    onChange={(e) =>
                      patch({
                        contentConfig: {
                          ...selected.contentConfig,
                          targetWords: Number(e.target.value) || 1000,
                        },
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <label className={labelCls} htmlFor="auto-audience">Audience</label>
                <input
                  id="auto-audience"
                  className={field}
                  value={selected.contentConfig.audience}
                  onChange={(e) =>
                    patch({ contentConfig: { ...selected.contentConfig, audience: e.target.value } })
                  }
                  placeholder="Founders evaluating pricing models"
                />
              </div>

              <div>
                <label className={labelCls} htmlFor="auto-dest">Destination</label>
                <div className="flex gap-2">
                  <select
                    id="auto-dest"
                    className={field}
                    value={selected.destinationId ?? ""}
                    onChange={(e) => patch({ destinationId: e.target.value || null })}
                  >
                    <option value="">None — keep drafts here</option>
                    {destinations.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({DESTINATION_FIELDS[d.kind].label})
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm shrink-0"
                    onClick={() => {
                      setDraftDest({ id: `dest-${Date.now().toString(36)}`, name: "", kind: "wordpress", config: {} });
                      setShowDestForm(true);
                    }}
                  >
                    Add
                  </button>
                </div>
                {!selected.destinationId && (
                  <p className="mt-1 text-[11px] text-primary/80">
                    Drafts generated by this campaign are stored under &ldquo;Generated Blogs&rdquo; right here in Writerdost.
                  </p>
                )}
              </div>

              <div>
                <label className={labelCls} htmlFor="auto-publish">Publishing</label>
                <select
                  id="auto-publish"
                  className={field}
                  value={selected.publish}
                  onChange={(e) => patch({ publish: e.target.value as AutomationPublishMode })}
                >
                  {Object.entries(PUBLISH_LABELS).map(([value, label]) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls} htmlFor="auto-frequency">Frequency</label>
                  <select
                    id="auto-frequency"
                    className={field}
                    value={frequency}
                    onChange={(e) => patch({ frequency: e.target.value as AutomationFrequency })}
                  >
                    {FREQUENCY_ORDER.map((value) => (
                      <option key={value} value={value}>{FREQUENCY_LABELS[value]}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelCls} htmlFor="auto-tz">Timezone</label>
                  <input
                    id="auto-tz"
                    className={field}
                    placeholder="e.g. UTC or America/New_York"
                    value={selected.timezone}
                    onChange={(e) => patch({ timezone: e.target.value })}
                  />
                </div>
              </div>

              {/* The date is hidden for custom, where the cron says everything. */}
              {frequency !== "custom" && schedule && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className={labelCls} htmlFor="auto-start-date">
                      {DATE_LABELS[frequency]}
                    </label>
                    <input
                      id="auto-start-date"
                      type="date"
                      className={field}
                      value={schedule.startDate}
                      onChange={(e) => patch({ startDate: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className={labelCls} htmlFor="auto-start-time">Time</label>
                    <input
                      id="auto-start-time"
                      type="time"
                      className={field}
                      value={schedule.startTime}
                      onChange={(e) => patch({ startTime: e.target.value })}
                    />
                  </div>
                </div>
              )}

              {frequency === "custom" && (
                <div>
                  <label className={labelCls} htmlFor="auto-cron">Cron expression</label>
                  <input
                    id="auto-cron"
                    className={field}
                    placeholder="e.g. 0 9 * * *"
                    value={selected.scheduleCron}
                    onChange={(e) => patch({ scheduleCron: e.target.value })}
                  />
                </div>
              )}

              {schedule && (
                <p className="text-[11.5px] text-on-surface-variant">
                  {describeFrequency(schedule)} {describeNextRun(schedule)}
                </p>
              )}

              {/* Arming the campaign. Until this is on, the scheduler ignores
                  it: a paused campaign is stored with no next run time, which
                  is what keeps it out of the due query entirely. */}
              <label
                htmlFor="auto-enabled"
                className="flex items-start gap-2.5 rounded-[var(--radius)] border border-[var(--hairline)] px-3 py-2.5 cursor-pointer"
              >
                <input
                  id="auto-enabled"
                  type="checkbox"
                  className="mt-0.5 accent-[var(--primary)] w-4 h-4 shrink-0"
                  checked={selected.enabled}
                  onChange={(e) => patch({ enabled: e.target.checked })}
                />
                <span className="text-[12.5px] leading-snug">
                  <span className="font-semibold text-on-surface block">
                    Run this campaign on its schedule
                  </span>
                  <span className="text-on-surface-variant">
                    {selected.enabled
                      ? "Armed. The scheduler will pick this up unattended."
                      : "Paused. Generate and preview still work; nothing runs on its own."}
                  </span>
                </span>
              </label>

              <div className="flex items-center gap-2 pt-1 flex-wrap">
                <button
                  type="button"
                  className="btn btn-filled btn-sm"
                  onClick={handleGenerateBlogNow}
                  disabled={isGeneratingNow || !aiReady}
                  title="Generate a blog post right now and save it into this campaign"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {isGeneratingNow ? "sync" : "auto_awesome"}
                  </span>
                  {isGeneratingNow ? "Generating…" : "Generate blog now"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm border border-[var(--hairline)]"
                  onClick={runPreview}
                  disabled={preview.loading || !aiReady}
                >
                  {preview.loading ? "Writing…" : "Run preview"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm text-red-500 ml-auto"
                  onClick={() => {
                    if (window.confirm(`Delete "${selected.name}" and all its saved blogs?`)) {
                      deleteAutomation(selected.id);
                      setSelectedId(null);
                      setPreview({ loading: false });
                    }
                  }}
                >
                  Delete
                </button>
              </div>
            </section>
          )}

          {/* Right Panel: Campaign Posts & Preview */}
          <section className={`${card} flex flex-col space-y-3 min-h-[520px]`}>
            {/* Tab switch header */}
            <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-2.5 gap-2 flex-wrap">
              <div className="flex gap-1">
                <button
                  type="button"
                  onClick={() => setActiveTab("posts")}
                  className={`px-3 py-1.5 rounded-[var(--radius)] text-[12.5px] font-medium transition-colors flex items-center gap-1.5 ${
                    activeTab === "posts"
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-on-surface/[0.04]"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">library_books</span>
                  Generated Blogs ({selectedCampaignPosts.length})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("preview")}
                  className={`px-3 py-1.5 rounded-[var(--radius)] text-[12.5px] font-medium transition-colors flex items-center gap-1.5 ${
                    activeTab === "preview"
                      ? "bg-primary/10 text-primary font-semibold"
                      : "text-on-surface-variant hover:text-on-surface hover:bg-on-surface/[0.04]"
                  }`}
                >
                  <span className="material-symbols-outlined text-[16px]">visibility</span>
                  Preview &amp; Test
                </button>
              </div>

              {activeTab === "posts" && (
                <button
                  type="button"
                  onClick={handleGenerateBlogNow}
                  disabled={isGeneratingNow || !aiReady || !selected}
                  className="btn btn-filled btn-sm shrink-0"
                  title="Generate a new blog post and save it to this campaign"
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {isGeneratingNow ? "sync" : "add"}
                  </span>
                  {isGeneratingNow ? "Generating…" : "Generate blog"}
                </button>
              )}
            </div>

            {/* Tab 1: Generated Campaign Blogs */}
            {activeTab === "posts" && (
              <div className="flex-1 flex flex-col">
                {selectedCampaignPosts.length === 0 ? (
                  <div className="text-center py-12 px-4 space-y-3 my-auto">
                    <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center mx-auto">
                      <span className="material-symbols-outlined text-[24px]">article</span>
                    </div>
                    <div>
                      <h3 className="text-[14px] font-bold text-on-surface">No blogs generated yet</h3>
                      <p className="text-[12px] text-on-surface-variant max-w-xs mx-auto mt-1">
                        Generate a blog now using this campaign&apos;s topics and voice settings, or run a preview to test it first.
                      </p>
                    </div>
                    <div className="flex justify-center gap-2 pt-2 flex-wrap">
                      <button
                        type="button"
                        onClick={handleGenerateBlogNow}
                        disabled={isGeneratingNow || !aiReady || !selected}
                        className="btn btn-filled btn-sm"
                      >
                        <span className="material-symbols-outlined text-[16px]">auto_awesome</span>
                        {isGeneratingNow ? "Writing post…" : "Generate blog now"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveTab("preview");
                          if (!preview.post && !preview.loading) runPreview();
                        }}
                        disabled={!aiReady}
                        className="btn btn-ghost btn-sm border border-[var(--hairline)]"
                      >
                        Run preview first
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5 overflow-y-auto max-h-[620px] pr-1">
                    {selectedCampaignPosts.map((post) => (
                      <div
                        key={post.id}
                        className="p-3 rounded-[var(--radius)] border border-[var(--hairline)] bg-surface-container-lowest hover:border-[var(--hairline-strong)] transition-all space-y-2"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h4 className="text-[13.5px] font-bold text-on-surface line-clamp-1">
                              {post.title}
                            </h4>
                            <div className="flex items-center gap-2 text-[11px] text-on-surface-variant mt-0.5 flex-wrap">
                              <span className="inline-flex items-center px-1.5 py-0.2 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                                {post.state === "published" ? "Published" : "Draft"}
                              </span>
                              <span>
                                {new Date(post.createdAt).toLocaleDateString(undefined, {
                                  month: "short",
                                  day: "numeric",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </span>
                              {post.quality?.wordCount && (
                                <>
                                  <span>·</span>
                                  <span>{post.quality.wordCount} words</span>
                                </>
                              )}
                              {post.tokens && (
                                <>
                                  <span>·</span>
                                  <span>{post.tokens.toLocaleString()} tokens</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {post.metaDescription && (
                          <p className="text-[12px] text-on-surface-variant line-clamp-2 italic">
                            {post.metaDescription}
                          </p>
                        )}

                        <div className="flex items-center justify-between gap-2 pt-1 border-t border-[var(--hairline)]">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm text-[11.5px] px-2 h-7"
                              onClick={() => setViewingPost(post)}
                            >
                              <span className="material-symbols-outlined text-[14px]">visibility</span>
                              Read
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm text-[11.5px] px-2 h-7"
                              onClick={() => handleOpenInEditor(post)}
                              title="Open this draft in the standalone Blog Editor"
                            >
                              <span className="material-symbols-outlined text-[14px]">edit_note</span>
                              Open in Editor
                            </button>
                            <button
                              type="button"
                              className="btn btn-ghost btn-sm text-[11.5px] px-2 h-7"
                              onClick={() => copyText(post.bodyMarkdown, `md-${post.id}`)}
                              title="Copy Markdown"
                            >
                              <span className="material-symbols-outlined text-[14px]">
                                {copiedId === `md-${post.id}` ? "check" : "content_copy"}
                              </span>
                              {copiedId === `md-${post.id}` ? "Copied" : "Markdown"}
                            </button>
                          </div>

                          <button
                            type="button"
                            className="btn btn-ghost btn-sm text-[11.5px] px-2 h-7 text-red-500 hover:bg-red-500/10"
                            onClick={() => {
                              if (window.confirm(`Delete "${post.title}"?`)) {
                                deleteCampaignPost(post.id);
                              }
                            }}
                            title="Delete post"
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Preview & Dry Run */}
            {activeTab === "preview" && (
              <div className="space-y-3 flex-1">
                {preview.loading && (
                  <p className="text-[12.5px] text-on-surface-variant">
                    Fetching the source and writing a post. This can take a minute.
                  </p>
                )}

                {preview.error && (
                  <div className="rounded-[var(--radius)] border border-red-500/40 bg-red-500/10 px-3 py-2 text-[12.5px] text-on-surface">
                    {preview.error}
                  </div>
                )}

                {!preview.loading && !preview.error && !preview.post && (
                  <div className="text-center py-10 text-[12.5px] text-on-surface-variant space-y-2">
                    <p>Run a preview to see exactly what this campaign would produce.</p>
                    <button
                      type="button"
                      className="btn btn-filled btn-sm mt-2"
                      onClick={runPreview}
                      disabled={!aiReady}
                    >
                      Run preview
                    </button>
                  </div>
                )}

                {preview.post && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between gap-2 p-2 rounded-[var(--radius)] bg-surface-container-lowest border border-[var(--hairline)] flex-wrap">
                      <span className="text-[12px] font-semibold text-on-surface">Preview Generated</span>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          className="btn btn-filled btn-sm h-7 text-[11.5px]"
                          onClick={handleSavePreviewAsDraft}
                        >
                          <span className="material-symbols-outlined text-[14px]">bookmark_add</span>
                          Save as Campaign Draft
                        </button>
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm h-7 text-[11.5px]"
                          onClick={async () => {
                            const saved = await handleSavePreviewAsDraft();
                            if (saved) handleOpenInEditor(saved);
                          }}
                        >
                          <span className="material-symbols-outlined text-[14px]">edit_note</span>
                          Save &amp; Open in Editor
                        </button>
                      </div>
                    </div>

                    {preview.quality && (
                      <div
                        className={`rounded-[var(--radius)] px-3 py-2 text-[12px] border ${
                          preview.quality.passed
                            ? "border-emerald-500/40 bg-emerald-500/10"
                            : "border-amber-500/40 bg-amber-500/10"
                        }`}
                      >
                        <strong className="text-on-surface">
                          {preview.quality.passed ? "Passed the quality gate" : "Would be held as a draft"}
                        </strong>
                        <span className="text-on-surface-variant"> · {preview.quality.wordCount} words</span>
                        {preview.quality.issues.length > 0 && (
                          <ul className="mt-1 list-disc pl-4 text-on-surface-variant">
                            {preview.quality.issues.map((issue) => (
                              <li key={issue}>{issue}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}

                    {preview.source?.url && (
                      <p className="text-[11px] text-on-surface-variant">
                        Sourced from{" "}
                        <a href={preview.source.url} target="_blank" rel="noreferrer" className="underline">
                          {preview.source.title || preview.source.url}
                        </a>{" "}
                        ({preview.source.words} words read)
                      </p>
                    )}

                    <h3 className="text-[15px] font-bold text-on-surface">{preview.post.title}</h3>
                    {preview.post.metaDescription && (
                      <p className="text-[12px] text-on-surface-variant italic">
                        {preview.post.metaDescription}
                      </p>
                    )}

                    <div
                      className="prose prose-sm dark:prose-invert max-w-none text-[13px] max-h-[380px] overflow-y-auto pr-1 border border-[var(--hairline)] rounded-[var(--radius)] p-3 bg-surface-container-lowest"
                      dangerouslySetInnerHTML={{ __html: preview.post.bodyHtml }}
                    />

                    <div className="flex items-center justify-between text-[11px] text-on-surface-variant">
                      <span>{preview.tokens?.toLocaleString()} tokens used</span>
                      <button
                        type="button"
                        className="btn btn-ghost btn-sm text-[11px] h-6 px-2"
                        onClick={runPreview}
                      >
                        Run preview again
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Post viewer modal */}
      {viewingPost && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-[2px] p-4">
          <div className={`${card} w-full max-w-3xl max-h-[90vh] flex flex-col space-y-3 bg-surface shadow-2xl`}>
            <div className="flex items-start justify-between gap-3 border-b border-[var(--hairline)] pb-3">
              <div>
                <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 mb-1">
                  {viewingPost.state === "published" ? "Published" : "Draft"} · {selected?.name}
                </span>
                <h2 className="text-[16px] font-bold text-on-surface">{viewingPost.title}</h2>
                <div className="flex items-center gap-2 text-[11px] text-on-surface-variant mt-0.5">
                  <span>
                    {new Date(viewingPost.createdAt).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                  {viewingPost.quality?.wordCount && (
                    <>
                      <span>·</span>
                      <span>{viewingPost.quality.wordCount} words</span>
                    </>
                  )}
                  {viewingPost.tokens && (
                    <>
                      <span>·</span>
                      <span>{viewingPost.tokens.toLocaleString()} tokens</span>
                    </>
                  )}
                </div>
              </div>
              <button
                type="button"
                className="btn btn-ghost btn-icon btn-sm"
                onClick={() => setViewingPost(null)}
              >
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            </div>

            {viewingPost.metaDescription && (
              <div className="rounded-[var(--radius)] bg-surface-container-lowest p-2.5 border border-[var(--hairline)] text-[12px] text-on-surface-variant">
                <strong>Meta description:</strong> {viewingPost.metaDescription}
              </div>
            )}

            {viewingPost.keywords && viewingPost.keywords.length > 0 && (
              <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
                <span className="text-on-surface-variant font-medium">Keywords:</span>
                {viewingPost.keywords.map((k) => (
                  <span
                    key={k}
                    className="px-2 py-0.5 rounded-full bg-on-surface/[0.05] text-on-surface-variant border border-[var(--hairline)]"
                  >
                    {k}
                  </span>
                ))}
              </div>
            )}

            <div className="flex-1 overflow-y-auto pr-2 border border-[var(--hairline)] rounded-[var(--radius)] p-4 bg-surface-container-lowest">
              <div
                className="prose prose-sm dark:prose-invert max-w-none text-[13px]"
                dangerouslySetInnerHTML={{ __html: viewingPost.bodyHtml }}
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-2 border-t border-[var(--hairline)] flex-wrap">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => copyText(viewingPost.bodyMarkdown, `modal-md-${viewingPost.id}`)}
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {copiedId === `modal-md-${viewingPost.id}` ? "check" : "content_copy"}
                  </span>
                  {copiedId === `modal-md-${viewingPost.id}` ? "Copied Markdown" : "Copy Markdown"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => copyText(viewingPost.bodyHtml, `modal-html-${viewingPost.id}`)}
                >
                  <span className="material-symbols-outlined text-[15px]">
                    {copiedId === `modal-html-${viewingPost.id}` ? "check" : "code"}
                  </span>
                  {copiedId === `modal-html-${viewingPost.id}` ? "Copied HTML" : "Copy HTML"}
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  className="btn btn-filled btn-sm"
                  onClick={() => handleOpenInEditor(viewingPost)}
                >
                  <span className="material-symbols-outlined text-[15px]">edit_note</span>
                  Open in Blog Editor
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  onClick={() => setViewingPost(null)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Destination form */}
      {showDestForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className={`${card} w-full max-w-md space-y-3 max-h-[85vh] overflow-y-auto`}>
            <h2 className="text-[14px] font-bold text-on-surface">Add destination</h2>

            <div>
              <label className={labelCls} htmlFor="dest-name">Name</label>
              <input
                id="dest-name"
                className={field}
                value={draftDest.name}
                onChange={(e) => setDraftDest({ ...draftDest, name: e.target.value })}
                placeholder="My WordPress blog"
              />
            </div>

            <div>
              <label className={labelCls} htmlFor="dest-kind">Platform</label>
              <select
                id="dest-kind"
                className={field}
                value={draftDest.kind}
                onChange={(e) =>
                  setDraftDest({
                    ...draftDest,
                    kind: e.target.value as AutomationDestinationKind,
                    config: {},
                  })
                }
              >
                {Object.entries(DESTINATION_FIELDS).map(([kind, def]) => (
                  <option key={kind} value={kind}>{def.label}</option>
                ))}
              </select>
            </div>

            {DESTINATION_FIELDS[draftDest.kind].fields.map((f) => (
              <div key={f.name}>
                <label className={labelCls} htmlFor={`dest-${f.name}`}>{f.label}</label>
                <input
                  id={`dest-${f.name}`}
                  className={field}
                  type={f.secret ? "password" : "text"}
                  placeholder={f.placeholder}
                  value={draftDest.config[f.name] || ""}
                  onChange={(e) =>
                    setDraftDest({
                      ...draftDest,
                      config: { ...draftDest.config, [f.name]: e.target.value },
                    })
                  }
                />
                {f.help && <p className="mt-1 text-[11px] text-on-surface-variant">{f.help}</p>}
              </div>
            ))}

            <p className="text-[11px] text-on-surface-variant">
              Credentials are encrypted server-side before they are stored and are never sent back
              to the browser. Leave a secret field blank when editing to keep the stored one.
            </p>

            <div className="flex gap-2 justify-end pt-1">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowDestForm(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-filled btn-sm"
                onClick={async () => {
                  if (!draftDest.name.trim()) return;
                  // The id comes back from Appwrite, so the campaign can only
                  // be pointed at the destination once the write has landed.
                  const saved = await saveDestination(draftDest);
                  if (!saved) return;
                  if (selected) patch({ destinationId: saved.id });
                  setShowDestForm(false);
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {destinations.length > 0 && (
        <section className={card}>
          <h2 className="text-[13px] font-bold text-on-surface mb-2">Destinations</h2>
          <ul className="space-y-1.5">
            {destinations.map((d) => (
              <li key={d.id} className="flex items-center justify-between gap-2 text-[12.5px]">
                <span className="text-on-surface">
                  {d.name}{" "}
                  <span className="text-on-surface-variant">— {DESTINATION_FIELDS[d.kind].label}</span>
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm text-red-500"
                  onClick={() => deleteDestination(d.id)}
                >
                  Remove
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
