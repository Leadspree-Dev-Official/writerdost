"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/app-store";
import { calculateProjectWords } from "@/lib/app-utils";
import {
  LISTING_FORMATS,
  MARKETPLACE,
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_LICENSES,
  marketplaceBlocker,
  projectBlocker,
  publishToMarketplace,
  unpublishFromMarketplace,
} from "@/lib/marketplace";
import type { ListingFormat, ListingVisibility, MarketplaceLicense } from "@/lib/store-types";

const CURRENCIES = ["USD", "INR", "EUR", "GBP"];

/**
 * Publishes one project to BundleKart Marketplace.
 *
 * Opened from the editor and from the projects list, so the listing fields and
 * the pre-flight checks live here rather than in either page.
 */
export function PublishDialog({
  projectId,
  onClose,
  onDone,
}: {
  projectId: string;
  onClose: () => void;
  onDone?: (message: string) => void;
}) {
  const project = useAppStore((state) => state.projects.find((item) => item.id === projectId));
  const platform = useAppStore((state) => state.platform);
  const setProjectPublishState = useAppStore((state) => state.setProjectPublishState);

  const published = project?.publish?.status === "published";

  const [price, setPrice] = useState(project?.publish?.price ?? platform.defaultPrice);
  const [currency, setCurrency] = useState(project?.publish?.currency ?? platform.currency);
  const [category, setCategory] = useState(project?.publish?.category ?? platform.defaultCategory);
  const [license, setLicense] = useState<MarketplaceLicense>(
    project?.publish?.license ?? platform.defaultLicense,
  );
  const [formats, setFormats] = useState<ListingFormat[]>(
    project?.publish?.formats ?? platform.defaultFormats,
  );
  const [visibility, setVisibility] = useState<ListingVisibility>(
    project?.publish?.visibility ?? platform.defaultVisibility,
  );
  const [summary, setSummary] = useState(project?.description ?? "");
  const [busy, setBusy] = useState<"publish" | "remove" | null>(null);
  const [error, setError] = useState("");

  if (!project) return null;

  const apiBlocker = marketplaceBlocker(platform);
  const readyBlocker = projectBlocker(project);
  const canPublish = !apiBlocker && !readyBlocker && formats.length > 0 && !busy;

  const toggleFormat = (value: ListingFormat) =>
    setFormats((current) =>
      current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
    );

  const handlePublish = async () => {
    setBusy("publish");
    setError("");
    setProjectPublishState(project.id, { status: "publishing", error: undefined });

    try {
      const result = await publishToMarketplace(
        project,
        platform,
        { price, currency, category, license, formats, visibility, summary, keywords: project.seoKeywords },
        project.publish?.revision ?? 0,
      );
      setProjectPublishState(project.id, {
        status: "published",
        listingId: result.listingId,
        listingUrl: result.listingUrl,
        publishedAt: result.publishedAt,
        revision: result.revision,
        price,
        currency,
        category,
        license,
        formats,
        visibility: result.visibility,
        error: undefined,
      });
      onDone?.(
        `${project.title} is live on ${MARKETPLACE.shortName} as ${result.listingId} (revision ${result.revision}).`,
      );
      onClose();
    } catch (caught) {
      const message = caught instanceof Error ? caught.message : "Publishing failed.";
      setProjectPublishState(project.id, { status: "failed", error: message });
      setError(message);
    } finally {
      setBusy(null);
    }
  };

  const handleRemove = async () => {
    const listingId = project.publish?.listingId;
    if (!listingId) return;
    setBusy("remove");
    setError("");
    try {
      await unpublishFromMarketplace(platform, listingId);
      setProjectPublishState(project.id, {
        status: "unpublished",
        listingId: undefined,
        listingUrl: undefined,
        publishedAt: undefined,
        error: undefined,
      });
      onDone?.(`${project.title} was removed from ${MARKETPLACE.shortName}.`);
      onClose();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove the listing.");
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="publish-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 dark:bg-black/60 backdrop-blur-[2px] p-4 no-print"
      onClick={(event) => {
        if (event.target === event.currentTarget && !busy) onClose();
      }}
    >
      <div className="w-full max-w-lg max-h-[88vh] overflow-y-auto rounded-[var(--radius-lg)] bg-surface-container-lowest dark:bg-[#16162a] border border-[var(--hairline-strong)] shadow-2xl">
        <div className="panel-head sticky top-0 bg-surface-container-lowest dark:bg-[#16162a] z-10">
          <span className="panel-title" id="publish-title">
            {published ? "Update listing" : "Publish"} · {MARKETPLACE.shortName}
          </span>
          <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close">
            <span className="material-symbols-outlined text-[16px]">close</span>
          </button>
        </div>

        <div className="panel-pad space-y-3">
          <div>
            <p className="text-[13px] font-semibold text-on-surface">{project.title}</p>
            <p className="row-meta mt-0.5">
              {calculateProjectWords(project).toLocaleString()} words · {project.chapters.length} chapters ·{" "}
              {project.status}
            </p>
          </div>

          {apiBlocker && (
            <div className="rounded-[var(--radius-lg)] border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 p-3">
              <p className="text-[12.5px] font-semibold text-amber-800 dark:text-amber-300">{apiBlocker}</p>
              <Link href="/settings?tab=api" className="text-[12px] font-semibold text-primary hover:underline">
                Set up the API →
              </Link>
            </div>
          )}

          {readyBlocker && !apiBlocker && (
            <p className="rounded-[var(--radius-lg)] border border-amber-200 dark:border-amber-500/25 bg-amber-50 dark:bg-amber-500/10 p-3 text-[12.5px] font-semibold text-amber-800 dark:text-amber-300">
              {readyBlocker}
            </p>
          )}

          {error && (
            <p className="rounded-[var(--radius-lg)] border border-rose-200 dark:border-rose-500/25 bg-rose-50 dark:bg-rose-500/10 p-3 text-[12.5px] text-rose-700 dark:text-rose-300">
              {error}
            </p>
          )}

          {published && project.publish?.listingUrl && (
            <div className="rounded-[var(--radius-lg)] border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 p-3">
              <p className="text-[12.5px] font-semibold text-emerald-800 dark:text-emerald-300">
                Live as {project.publish.listingId} · revision {project.publish.revision}
              </p>
              <p className="text-[11.5px] text-emerald-700/85 dark:text-emerald-300/75 break-all mt-0.5">
                {project.publish.listingUrl}
              </p>
            </div>
          )}

          <div>
            <label htmlFor="pub-summary" className="label">Listing summary</label>
            <textarea
              id="pub-summary"
              className="textarea min-h-[6.5rem] leading-relaxed"
              rows={4}
              value={summary}
              onChange={(event) => setSummary(event.target.value)}
              placeholder="What a buyer gets, in two or three sentences."
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3">
            <div>
              <label htmlFor="pub-price" className="label">Price</label>
              <div className="flex gap-1.5">
                <input
                  id="pub-price"
                  className="input num"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="0.00"
                  value={price}
                  onChange={(event) => setPrice(Number(event.target.value))}
                />
                <select
                  className="select w-auto"
                  aria-label="Currency"
                  value={currency}
                  onChange={(event) => setCurrency(event.target.value)}
                >
                  {CURRENCIES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>
              <p className="hint">Set 0 to list it free.</p>
            </div>

            <div>
              <label htmlFor="pub-category" className="label">Category</label>
              <select
                id="pub-category"
                className="select"
                value={category}
                onChange={(event) => setCategory(event.target.value)}
              >
                {MARKETPLACE_CATEGORIES.map((item) => (
                  <option key={item} value={item}>{item}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-2">
              <p className="label">License</p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                {MARKETPLACE_LICENSES.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className="tile"
                    data-selected={license === item.value}
                    aria-pressed={license === item.value}
                    onClick={() => setLicense(item.value)}
                  >
                    <span className="tile-name">{item.label}</span>
                    <span className="tile-desc">{item.description}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="sm:col-span-2">
              <p className="label">Formats delivered</p>
              <div className="flex flex-wrap gap-1.5">
                {LISTING_FORMATS.map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    className={formats.includes(item.value) ? "btn btn-primary btn-sm" : "btn btn-secondary btn-sm"}
                    aria-pressed={formats.includes(item.value)}
                    onClick={() => toggleFormat(item.value)}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
              {formats.length === 0 && <p className="hint">Pick at least one format.</p>}
            </div>

            <div className="sm:col-span-2">
              <p className="label">Visibility</p>
              <div className="segmented">
                {(["draft", "public"] as ListingVisibility[]).map((item) => (
                  <button
                    key={item}
                    type="button"
                    className="segment"
                    data-active={visibility === item}
                    onClick={() => setVisibility(item)}
                  >
                    {item === "draft" ? "Draft on store" : "Public"}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="panel-pad border-t border-[var(--hairline)] flex flex-wrap items-center gap-2">
          {published && (
            <button
              type="button"
              className="btn btn-danger"
              onClick={handleRemove}
              disabled={Boolean(busy)}
            >
              {busy === "remove" ? "Removing…" : "Remove listing"}
            </button>
          )}
          <button type="button" className="btn btn-secondary ml-auto" onClick={onClose} disabled={Boolean(busy)}>
            Cancel
          </button>
          <button type="button" className="btn btn-primary" onClick={handlePublish} disabled={!canPublish}>
            <span className="material-symbols-outlined">storefront</span>
            {busy === "publish" ? "Publishing…" : published ? "Publish update" : "Publish listing"}
          </button>
        </div>

        {MARKETPLACE.isMock && (
          <p className="px-4 pb-3 text-[11px] text-on-surface-variant">
            {MARKETPLACE.name} is not live yet. This publishes against a local mock that validates the same
            fields and returns the same shapes as the real API will.
          </p>
        )}
      </div>
    </div>
  );
}
