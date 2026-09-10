"use client";

import { useMemo, useState } from "react";
import { useAppStore } from "@/lib/app-store";
import {
  FREQUENCY_LABELS,
  FREQUENCY_HINTS,
  FREQUENCY_ORDER,
  describeNextRun,
} from "@/lib/automation/schedule";
import type {
  AutomationFrequency,
  AutomationDestination,
  AutomationDestinationKind,
  AutomationSourceKind,
  AutomationPublishMode,
  BlogAutomation,
} from "@/lib/store-types";

/** Mirrors the server adapters so the form knows what each platform needs. */
const DESTINATION_FIELDS: Record<
  AutomationDestinationKind,
  { label: string; fields: Array<{ name: string; label: string; secret?: boolean; help?: string }> }
> = {
  wordpress: {
    label: "WordPress",
    fields: [
      { name: "siteUrl", label: "Site URL", help: "https://example.com — /wp-json is added for you" },
      { name: "username", label: "Username" },
      { name: "secret", label: "Application password", secret: true, help: "Users → Profile → Application Passwords" },
      { name: "categoryId", label: "Category ID (optional)" },
    ],
  },
  ghost: {
    label: "Ghost",
    fields: [
      { name: "siteUrl", label: "Site URL" },
      { name: "secret", label: "Admin API key", secret: true, help: "Format: <id>:<hex secret>" },
    ],
  },
  webflow: {
    label: "Webflow",
    fields: [
      { name: "collectionId", label: "Collection ID" },
      { name: "secret", label: "API token", secret: true },
      { name: "fieldMap", label: "Field slugs", help: "name,slug,post-body" },
    ],
  },
  strapi: {
    label: "Strapi",
    fields: [
      { name: "siteUrl", label: "API URL" },
      { name: "collection", label: "Collection", help: "e.g. articles" },
      { name: "secret", label: "API token", secret: true },
    ],
  },
  sanity: {
    label: "Sanity",
    fields: [
      { name: "projectId", label: "Project ID" },
      { name: "dataset", label: "Dataset" },
      { name: "docType", label: "Document type" },
      { name: "secret", label: "API token", secret: true },
    ],
  },
  webhook: {
    label: "Generic webhook",
    fields: [
      { name: "endpoint", label: "Endpoint URL" },
      { name: "secret", label: "Signing secret (optional)", secret: true },
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
    bodyHtml: string;
    bodyMarkdown: string;
    metaDescription: string;
    excerpt: string;
    keywords: string[];
    sourceUrl?: string;
  };
  quality?: { passed: boolean; wordCount: number; issues: string[] };
  tokens?: number;
  source?: { url: string | null; title: string; words: number };
};

const field =
  "w-full h-9 px-2.5 rounded-[var(--radius)] bg-surface-container-lowest border border-[var(--hairline)] text-[13px] text-on-surface focus:outline-none focus:border-primary transition-colors";
const labelCls = "block text-[11px] font-semibold uppercase tracking-wide text-on-surface-variant mb-1.5";
const card = "rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-surface p-4";

export default function AutomationsPage() {
  const automations = useAppStore((s) => s.automations);
  const destinations = useAppStore((s) => s.automationDestinations);
  const api = useAppStore((s) => s.api);
  const createAutomation = useAppStore((s) => s.createAutomation);
  const updateAutomation = useAppStore((s) => s.updateAutomation);
  const deleteAutomation = useAppStore((s) => s.deleteAutomation);
  const saveDestination = useAppStore((s) => s.saveAutomationDestination);
  const deleteDestination = useAppStore((s) => s.deleteAutomationDestination);

  const [selectedId, setSelectedId] = useState<string | null>(automations[0]?.id ?? null);
  const [preview, setPreview] = useState<PreviewState>({ loading: false });
  const [showDestForm, setShowDestForm] = useState(false);
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

  // Campaigns created before the frequency field existed read as daily.
  const frequency: AutomationFrequency = selected?.frequency ?? "daily";

  const patch = (payload: Partial<BlogAutomation>) => {
    if (selected) updateAutomation(selected.id, payload);
  };

  const aiReady = Boolean(api.model && (api.apiKey || api.provider === "ollama"));

  const runPreview = async () => {
    if (!selected) return;
    setPreview({ loading: true });

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

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-[17px] font-bold text-on-surface">BlogGen</h1>
          <p className="text-[12.5px] text-on-surface-variant">
            Blog campaigns that write from a topic list or a source feed, then push to your site.
          </p>
        </div>
        <button
          type="button"
          className="btn btn-filled btn-sm"
          onClick={() => {
            const created = createAutomation(`Blog Campaign ${automations.length + 1}`);
            setSelectedId(created.id);
          }}
        >
          <span className="material-symbols-outlined text-[16px]">add</span>
          New Blog Campaign
        </button>
      </header>

      {!aiReady && (
        <div className="rounded-[var(--radius)] border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-[12.5px] text-on-surface">
          Set an AI provider and model in <strong>AI settings</strong> before running a campaign.
        </div>
      )}

      <div className="rounded-[var(--radius)] border border-[var(--hairline)] bg-surface-container-lowest px-3 py-2 text-[12.5px] text-on-surface-variant">
        <span className="material-symbols-outlined text-[15px] align-middle mr-1">schedule</span>
        Preview runs work now. <strong className="text-on-surface">Unattended scheduling</strong> needs
        the Supabase backend — apply the migrations in <code>supabase/migrations/</code> and set the
        environment variables in <code>.env.example</code>.
      </div>

      {automations.length === 0 ? (
        <div className={`${card} text-center py-10`}>
          <p className="text-[13px] text-on-surface-variant">
            No blog campaigns yet. Create one to get started.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-[200px_minmax(0,1fr)_minmax(0,1fr)] gap-4">
          {/* List */}
          <aside className="space-y-1.5">
            {automations.map((automation) => (
              <button
                key={automation.id}
                type="button"
                onClick={() => {
                  setSelectedId(automation.id);
                  setPreview({ loading: false });
                }}
                className={`w-full text-left px-2.5 py-2 rounded-[var(--radius)] border transition-colors ${
                  selected?.id === automation.id
                    ? "border-primary bg-primary/10"
                    : "border-[var(--hairline)] hover:bg-on-surface/[0.04]"
                }`}
              >
                <span className="block text-[13px] font-semibold text-on-surface truncate">
                  {automation.name}
                </span>
                <span className="block text-[11px] text-on-surface-variant">
                  {SOURCE_LABELS[automation.sourceKind]}
                </span>
              </button>
            ))}
          </aside>

          {/* Configuration */}
          {selected && (
            <section className={`${card} space-y-4`}>
              <div>
                <label className={labelCls} htmlFor="auto-name">Name</label>
                <input
                  id="auto-name"
                  className={field}
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
                    rows={4}
                    className={`${field} h-auto py-2 resize-y`}
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
                    value={selected.timezone}
                    onChange={(e) => patch({ timezone: e.target.value })}
                  />
                </div>
              </div>

              {frequency === "custom" && (
                <div>
                  <label className={labelCls} htmlFor="auto-cron">Cron expression</label>
                  <input
                    id="auto-cron"
                    className={field}
                    value={selected.scheduleCron}
                    onChange={(e) => patch({ scheduleCron: e.target.value })}
                  />
                </div>
              )}

              <p className="text-[11.5px] text-on-surface-variant">
                {FREQUENCY_HINTS[frequency]} {describeNextRun({ ...selected, frequency })}
              </p>

              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  className="btn btn-filled btn-sm"
                  onClick={runPreview}
                  disabled={preview.loading || !aiReady}
                >
                  {preview.loading ? "Writing…" : "Run preview"}
                </button>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm text-red-500"
                  onClick={() => {
                    deleteAutomation(selected.id);
                    setSelectedId(null);
                    setPreview({ loading: false });
                  }}
                >
                  Delete
                </button>
              </div>
            </section>
          )}

          {/* Preview output */}
          <section className={`${card} space-y-3`}>
            <h2 className="text-[13px] font-bold text-on-surface">Preview</h2>

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
              <p className="text-[12.5px] text-on-surface-variant">
                Run a preview to see exactly what this automation would publish. Nothing is sent
                anywhere.
              </p>
            )}

            {preview.post && (
              <div className="space-y-3">
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
                <p className="text-[12px] text-on-surface-variant italic">
                  {preview.post.metaDescription}
                </p>

                <div
                  className="prose prose-sm dark:prose-invert max-w-none text-[13px] max-h-[420px] overflow-y-auto pr-1"
                  dangerouslySetInnerHTML={{ __html: preview.post.bodyHtml }}
                />

                <p className="text-[11px] text-on-surface-variant">
                  {preview.tokens?.toLocaleString()} tokens used
                </p>
              </div>
            )}
          </section>
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
              Stored in this browser for now. Once Supabase is connected, credentials are encrypted
              server-side and never sent back to the browser.
            </p>

            <div className="flex gap-2 justify-end pt-1">
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setShowDestForm(false)}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-filled btn-sm"
                onClick={() => {
                  if (!draftDest.name.trim()) return;
                  saveDestination(draftDest);
                  if (selected) patch({ destinationId: draftDest.id });
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
