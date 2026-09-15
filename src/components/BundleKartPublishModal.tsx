"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/app-store";
import { calculateProjectWords } from "@/lib/app-utils";
import { htmlToText } from "@/lib/markdown-utils";
import {
  BUNDLEKART_ACCENT_COLORS,
  BUNDLEKART_TEMPLATES,
  DEFAULT_LANDING_BLOCKS,
  MARKETPLACE,
  MARKETPLACE_CATEGORIES,
  generateBundleKartLandingCopy,
  publishToBundleKart,
  marketplaceBlocker,
  projectBlocker,
  AiLandingPageElements,
} from "@/lib/marketplace";
import type {
  BundleKartBonus,
  BundleKartDeliverableFile,
  BundleKartFaq,
  BundleKartLandingBlock,
  BundleKartPublishPayload,
  BundleKartPublishResponse,
  BundleKartTemplateId,
} from "@/lib/store-types";

type RouteMode = "both" | "landing" | "store";
type AssetType = "ebook" | "prompts" | "template";

interface BundleKartPublishModalProps {
  projectId: string;
  onClose: () => void;
  onDone?: (message: string) => void;
}

export function BundleKartPublishModal({
  projectId,
  onClose,
  onDone,
}: BundleKartPublishModalProps) {
  const project = useAppStore((state) => state.projects.find((p) => p.id === projectId));
  const platform = useAppStore((state) => state.platform);
  const apiSettings = useAppStore((state) => state.api);
  const setProjectPublishState = useAppStore((state) => state.setProjectPublishState);

  const isAlreadyPublished = project?.publish?.status === "published" && Boolean(project?.publish?.bundlekartProductId);

  // Section A: AI Landing Page Copy Fields
  const [hook, setHook] = useState(
    project?.publish?.landingPageConfig?.blocks?.find((b) => b.id === "hero")?.headlineOverride ||
      `FOR AMBITIOUS ${(project?.audience || "CREATORS & SOLOPRENEURS").toUpperCase().replace(/^FOR\s+/i, "")}`,
  );
  const [promise, setPromise] = useState(
    `Deploy the frameworks from ${project?.title || "this book"} and ship your results in 14 days.`,
  );
  const [subtitle, setSubtitle] = useState(
    project?.description || "Step-by-step systems and actionable protocols ready for immediate implementation.",
  );
  const [painPoints, setPainPoints] = useState<string[]>([
    "Wasting hundreds of hours on trial and error without structured protocols",
    "Feeling overwhelmed by fragmented advice with zero tactical blueprint",
    "Stuck in execution paralysis without a step-by-step implementation guide",
  ]);
  const [benefits, setBenefits] = useState<string[]>([
    `Battle-tested frameworks synthesized across ${project?.chapters.length || 5} chapters`,
    "Direct copy-paste prompts, checklists, and tactical worksheets",
    "Lifetime purchase vault access with free automatic future revisions",
  ]);
  const [deliverables, setDeliverables] = useState<Array<{ name: string; format: string; description: string }>>([
    {
      name: `${project?.title || "Master Manual"}`,
      format: "PDF + EPUB",
      description: "Complete master manual with implementation rubrics",
    },
    {
      name: "Tactical Execution Vault",
      format: "DRM-Free Digital Asset",
      description: "Instant access worksheets and copy-paste templates",
    },
  ]);
  const [bonuses, setBonuses] = useState<BundleKartBonus[]>([
    {
      title: "24-Hour Quick-Action Implementation Checklist",
      description: "Step-by-step checklist to deploy the core frameworks within your first 24 hours.",
      valueInr: 499,
      valueUsd: 9,
    },
    {
      title: "Curated Resource Vault & Tool Matrix",
      description: "Curated database of industry tools, automations, and execution frameworks.",
      valueInr: 799,
      valueUsd: 14,
    },
  ]);
  const [faqs, setFaqs] = useState<BundleKartFaq[]>([
    {
      q: "What formats will I receive upon checkout?",
      a: "Instant access to DRM-free PDF, EPUB, and web editions in your personal BundleKart library vault.",
    },
    {
      q: "Are updates and future editions included?",
      a: "Yes! Any revisions pushed from Writerdost sync automatically to your purchase vault for free.",
    },
    {
      q: "Can I read this on Kindle or iPad?",
      a: "Yes! The EPUB file is optimized for Apple Books, Kindle, Kobo, and all major e-readers.",
    },
  ]);

  // Section B: Product & Pricing Controls
  const [title, setTitle] = useState(project?.title || "");
  const [assetType, setAssetType] = useState<AssetType>("ebook");
  const [category, setCategory] = useState<string>(
    project?.publish?.category || platform.defaultCategory || "Business & Startups",
  );
  const [priceInr, setPriceInr] = useState<number>(project?.publish?.bundlekartInr || 499);
  const [priceUsd, setPriceUsd] = useState<number>(
    project?.publish?.bundlekartUsd || Math.max(1, Math.round(priceInr / 35)),
  );
  const [chargeGst, setChargeGst] = useState<boolean>(false);
  const [routeMode, setRouteMode] = useState<RouteMode>("both");

  // Section C: Visual Preset & Blocks
  const [templateId, setTemplateId] = useState<BundleKartTemplateId>("high_conversion");
  const [accentColor, setAccentColor] = useState<string>(BUNDLEKART_ACCENT_COLORS[0].hex);
  const [showUrgencyBanner, setShowUrgencyBanner] = useState<boolean>(true);
  const [urgencyMinutes, setUrgencyMinutes] = useState<number>(15);
  const [blocks, setBlocks] = useState<BundleKartLandingBlock[]>(DEFAULT_LANDING_BLOCKS);

  // States
  const [isAiGenerating, setIsAiGenerating] = useState(false);
  const [aiSuccessMsg, setAiSuccessMsg] = useState("");
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishError, setPublishError] = useState("");
  const [publishedData, setPublishedData] = useState<BundleKartPublishResponse | null>(null);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  if (!project) return null;

  const totalWords = calculateProjectWords(project);
  const estimatedPages = Math.max(1, Math.ceil(totalWords / 250));
  const apiBlocker = marketplaceBlocker(platform);
  const readyBlocker = projectBlocker(project);

  const handleInrChange = (val: number) => {
    setPriceInr(val);
    setPriceUsd(Math.max(1, Math.round(val / 35)));
  };

  const handleGenerateAiCopy = async () => {
    setIsAiGenerating(true);
    setPublishError("");
    setAiSuccessMsg("");

    try {
      const generated: AiLandingPageElements = await generateBundleKartLandingCopy(project, apiSettings);
      setHook(generated.hook);
      setPromise(generated.promise);
      setSubtitle(generated.subtitle);
      if (generated.painPoints?.length) setPainPoints(generated.painPoints);
      if (generated.benefits?.length) setBenefits(generated.benefits);
      if (generated.bonuses?.length) setBonuses(generated.bonuses);
      if (generated.faqs?.length) setFaqs(generated.faqs);
      if (generated.suggestedInr) handleInrChange(generated.suggestedInr);
      if (generated.suggestedUsd) setPriceUsd(generated.suggestedUsd);

      setAiSuccessMsg("✨ AI generated high-converting copy from your manuscript!");
      setTimeout(() => setAiSuccessMsg(""), 4000);
    } catch (err) {
      setPublishError(err instanceof Error ? err.message : "AI copy generation failed.");
    } finally {
      setIsAiGenerating(false);
    }
  };

  const toggleBlock = (blockId: string) => {
    setBlocks((curr) =>
      curr.map((b) => (b.id === blockId ? { ...b, enabled: !b.enabled } : b)),
    );
  };

  const updateBlockHeadline = (blockId: string, headline: string) => {
    setBlocks((curr) =>
      curr.map((b) => (b.id === blockId ? { ...b, headlineOverride: headline } : b)),
    );
  };

  const handlePushToBundleKart = async () => {
    if (!title.trim()) {
      setPublishError("Please provide a title for your product.");
      return;
    }
    if (priceInr < 0) {
      setPublishError("Price must be 0 or higher.");
      return;
    }

    setIsPublishing(true);
    setPublishError("");

    // Prepare table of contents from project chapters
    const toc = project.chapters.map((c, i) => `${String(i + 1).padStart(2, "0")}. ${c.title}`);

    // Extract sample excerpt
    const firstChapterBody = project.chapters[0]?.content ? htmlToText(project.chapters[0].content) : "";
    const sampleExcerpt =
      firstChapterBody.slice(0, 450).trim() ||
      "Most creators fail not because their ideas are weak, but because their delivery systems lack leverage and consistency...";

    // Prepare deliverables
    const files: BundleKartDeliverableFile[] = [
      {
        format: "PDF",
        name: `${title.slice(0, 24).replace(/[^a-zA-Z0-9]/g, "_")}.pdf`,
        size: `${Math.max(1.2, (totalWords / 25000) * 2.8).toFixed(1)} MB`,
        version: `${(project.publish?.revision || 0) + 1}.0`,
      },
      {
        format: "EPUB",
        name: `${title.slice(0, 24).replace(/[^a-zA-Z0-9]/g, "_")}.epub`,
        size: `${Math.max(0.8, (totalWords / 35000) * 1.6).toFixed(1)} MB`,
        version: `${(project.publish?.revision || 0) + 1}.0`,
      },
    ];

    const payload: BundleKartPublishPayload = {
      title: title.trim(),
      type: assetType,
      subtitle: subtitle.trim(),
      hook: hook.trim(),
      promise: promise.trim(),
      cat: category,
      inr: priceInr,
      usd: priceUsd,
      pages: estimatedPages,
      units: `${estimatedPages} pages · EPUB & PDF`,
      chargeGst,
      routeMode,
      cover: project.coverAccent || "linear-gradient(150deg, #7b5bff, #ff4d9d)",
      imageUrl: project.coverImage || undefined,
      downloadUrl: `https://assets.bundlekart.in/vault/writerdost/${project.id}.pdf`,
      sampleExcerpt,
      bullets: benefits,
      about: [
        subtitle.trim(),
        `Authored and formatted in WriterDost Studio, this comprehensive ${estimatedPages}-page master manual provides ${totalWords.toLocaleString()} words of tested frameworks across ${project.chapters.length} chapters.`,
        "Every chapter includes actionable templates, copy-paste prompts, and implementation worksheets ready for instant deployment.",
      ],
      toc: toc.length ? toc : ["01. Introduction & Foundational Systems", "02. Core Execution Playbook"],
      files,
      faqs,
      bonuses,
      landingPageConfig: {
        templateId,
        customAccentColor: accentColor,
        showUrgencyBanner,
        urgencyTimerMinutes: urgencyMinutes,
        showLiveViewers: true,
        showRecentSales: true,
        blocks,
      },
    };

    try {
      const response = await publishToBundleKart(project, platform, payload);
      setPublishedData(response);

      // Persist in App Store
      const newRevision = (project.publish?.revision || 0) + 1;
      const baseUrl = (platform.marketplaceBaseUrl || MARKETPLACE.defaultBaseUrl).replace(/\/+$/, "");
      const storeUrl = response.storeUrl?.startsWith("http")
        ? response.storeUrl
        : `${baseUrl}${response.storeUrl || `/product/${response.data?.id || project.id}`}`;
      const landingUrl = response.landingUrl?.startsWith("http")
        ? response.landingUrl
        : `${baseUrl}${response.landingUrl || `/landing/${response.data?.id || project.id}`}`;

      setProjectPublishState(project.id, {
        status: "published",
        revision: newRevision,
        listingId: response.data?.id || `prod_${Date.now()}`,
        listingUrl: storeUrl,
        bundlekartProductId: response.data?.id || `prod_${Date.now()}`,
        bundlekartStoreUrl: storeUrl,
        bundlekartLandingUrl: landingUrl,
        bundlekartRevision: newRevision,
        bundlekartSlug: response.data?.slug,
        bundlekartInr: priceInr,
        bundlekartUsd: priceUsd,
        publishedAt: new Date().toISOString(),
        category,
        error: undefined,
      });

      onDone?.(`🎉 "${title}" published live on BundleKart!`);
    } catch (err) {
      const message = err instanceof Error ? err.message : "Publishing failed.";
      setPublishError(message);
    } finally {
      setIsPublishing(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedUrl(label);
    setTimeout(() => setCopiedUrl(null), 2500);
  };

  const getFullUrl = (relativeOrAbsolute?: string, fallbackPath = "") => {
    if (!relativeOrAbsolute) {
      const base = (platform.marketplaceBaseUrl || MARKETPLACE.defaultBaseUrl).replace(/\/+$/, "");
      return `${base}${fallbackPath}`;
    }
    if (relativeOrAbsolute.startsWith("http://") || relativeOrAbsolute.startsWith("https://")) {
      return relativeOrAbsolute;
    }
    const base = (platform.marketplaceBaseUrl || MARKETPLACE.defaultBaseUrl).replace(/\/+$/, "");
    return `${base}${relativeOrAbsolute.startsWith("/") ? "" : "/"}${relativeOrAbsolute}`;
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="bundlekart-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 dark:bg-black/75 backdrop-blur-[3px] p-2 sm:p-4 no-print overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isPublishing) onClose();
      }}
    >
      <div className="w-full max-w-4xl max-h-[92vh] flex flex-col rounded-[var(--radius-lg)] bg-surface-container-lowest dark:bg-[#121222] border border-[var(--hairline-strong)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-[var(--hairline)] bg-surface-container-lowest dark:bg-[#121222] shrink-0 sticky top-0 z-20">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-primary/10 dark:bg-primary/20 text-primary flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-[19px]">storefront</span>
            </span>
            <div>
              <h2 id="bundlekart-modal-title" className="text-[14px] font-bold text-on-surface flex items-center gap-2">
                {isAlreadyPublished ? "Update BundleKart Listing" : "Publish to BundleKart Marketplace"}
                <span className="rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 text-[10px] font-semibold px-2 py-0.5 uppercase tracking-wide">
                  1-Click Push
                </span>
              </h2>
              <p className="text-[11.5px] text-on-surface-variant">
                {project.title} · {totalWords.toLocaleString()} words · {estimatedPages} pages · {project.chapters.length} chapters
              </p>
            </div>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-icon btn-sm"
            onClick={onClose}
            aria-label="Close"
            disabled={isPublishing}
          >
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-6">
          {/* CELEBRATION VIEW WHEN PUBLISHED */}
          {publishedData ? (
            <div className="space-y-6 py-4 animate-in fade-in zoom-in-95 duration-200">
              <div className="text-center space-y-2">
                <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-emerald-500/15 text-emerald-500 mb-1">
                  <span className="material-symbols-outlined text-[36px]">celebration</span>
                </div>
                <h3 className="text-xl font-bold text-on-surface">🎉 Your Book is Live on BundleKart!</h3>
                <p className="text-sm text-on-surface-variant max-w-md mx-auto">
                  &ldquo;{title}&rdquo; has been successfully packaged, validated, and pushed directly to your BundleKart Creator storefront.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl mx-auto">
                {/* Storefront Link Card */}
                <div className="rounded-xl border border-[var(--hairline)] bg-surface-container-low dark:bg-[#18182e] p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-primary">
                      <span className="material-symbols-outlined text-[16px]">shopping_bag</span>
                      Marketplace Store Listing
                    </div>
                    <p className="text-[11.5px] text-on-surface-variant font-mono break-all line-clamp-1">
                      {getFullUrl(publishedData.storeUrl, `/product/${publishedData.data?.id || project.id}`)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={getFullUrl(publishedData.storeUrl, `/product/${publishedData.data?.id || project.id}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-sm flex-1 text-center"
                    >
                      <span className="material-symbols-outlined text-[14px]">open_in_new</span>
                      Open Storefront
                    </a>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        copyToClipboard(
                          getFullUrl(publishedData.storeUrl, `/product/${publishedData.data?.id || project.id}`),
                          "store",
                        )
                      }
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiedUrl === "store" ? "check" : "content_copy"}
                      </span>
                      {copiedUrl === "store" ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* Standalone Landing Page Link Card */}
                <div className="rounded-xl border border-indigo-500/30 bg-indigo-500/5 dark:bg-indigo-500/10 p-4 flex flex-col justify-between space-y-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600 dark:text-indigo-400">
                      <span className="material-symbols-outlined text-[16px]">rocket_launch</span>
                      High-Converting Landing Page
                    </div>
                    <p className="text-[11.5px] text-on-surface-variant font-mono break-all line-clamp-1">
                      {getFullUrl(publishedData.landingUrl, `/landing/${publishedData.data?.id || project.id}`)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <a
                      href={getFullUrl(publishedData.landingUrl, `/landing/${publishedData.data?.id || project.id}`)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="btn btn-primary btn-sm flex-1 text-center !bg-indigo-600 hover:!bg-indigo-700"
                    >
                      <span className="material-symbols-outlined text-[14px]">visibility</span>
                      Preview Landing Page
                    </a>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm"
                      onClick={() =>
                        copyToClipboard(
                          getFullUrl(publishedData.landingUrl, `/landing/${publishedData.data?.id || project.id}`),
                          "landing",
                        )
                      }
                    >
                      <span className="material-symbols-outlined text-[14px]">
                        {copiedUrl === "landing" ? "check" : "content_copy"}
                      </span>
                      {copiedUrl === "landing" ? "Copied" : "Copy"}
                    </button>
                  </div>
                </div>
              </div>

              {/* Instant Mobile QR Code */}
              <div className="rounded-xl border border-[var(--hairline)] bg-surface-container-low dark:bg-[#18182e] p-4 max-w-md mx-auto flex items-center gap-4">
                <div className="w-24 h-24 bg-white p-1.5 rounded-lg shrink-0 flex items-center justify-center shadow-sm">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(
                      getFullUrl(publishedData.landingUrl, `/landing/${publishedData.data?.id || project.id}`),
                    )}`}
                    alt="Scan to preview landing page"
                    className="w-full h-full object-contain"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-[13px] font-bold text-on-surface">📱 Instant Mobile Preview</p>
                  <p className="text-[12px] text-on-surface-variant leading-relaxed">
                    Scan with your phone camera to test your live high-converting sales page on iOS & Android.
                  </p>
                </div>
              </div>

              <div className="flex justify-center gap-3 pt-2">
                <button type="button" className="btn btn-secondary" onClick={onClose}>
                  Done & Close
                </button>
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={() => {
                    setPublishedData(null);
                  }}
                >
                  Edit & Update Listing Again
                </button>
              </div>
            </div>
          ) : (
            <>
              {/* Errors & Alerts */}
              {apiBlocker && (
                <div className="rounded-xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3.5 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-2.5">
                    <span className="material-symbols-outlined text-amber-600 dark:text-amber-400 mt-0.5">warning</span>
                    <div>
                      <p className="text-[13px] font-semibold text-amber-900 dark:text-amber-300">{apiBlocker}</p>
                      <p className="text-[12px] text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                        Connect your BundleKart Creator API key in Settings or Marketplace tab to enable 1-click publishing.
                      </p>
                    </div>
                  </div>
                  <Link href="/settings?tab=api" className="btn btn-secondary btn-sm shrink-0">
                    Connect Key →
                  </Link>
                </div>
              )}

              {readyBlocker && !apiBlocker && (
                <div className="rounded-xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 p-3.5 flex items-center gap-2.5 text-amber-900 dark:text-amber-300 text-[12.5px] font-semibold">
                  <span className="material-symbols-outlined text-[18px]">info</span>
                  {readyBlocker}
                </div>
              )}

              {publishError && (
                <div className="rounded-xl border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 p-3.5 flex items-start gap-2.5 text-rose-800 dark:text-rose-300 text-[12.5px]">
                  <span className="material-symbols-outlined text-[18px] shrink-0 mt-0.5">error</span>
                  <div className="flex-1">
                    <p className="font-semibold">{publishError}</p>
                    {publishError.toLowerCase().includes("key") && (
                      <p className="mt-1 text-[11.5px] text-rose-700/80 dark:text-rose-300/80">
                        Check your key under{" "}
                        <a
                          href="https://bundlekart.in"
                          target="_blank"
                          rel="noreferrer"
                          className="underline font-semibold"
                        >
                          BundleKart Dashboard → Settings → API Keys
                        </a>
                        .
                      </p>
                    )}
                  </div>
                </div>
              )}

              {aiSuccessMsg && (
                <div className="rounded-xl border border-emerald-300 dark:border-emerald-500/30 bg-emerald-50 dark:bg-emerald-500/10 p-3 flex items-center gap-2 text-emerald-800 dark:text-emerald-300 text-[12.5px] font-medium">
                  <span className="material-symbols-outlined text-[18px]">check_circle</span>
                  {aiSuccessMsg}
                </div>
              )}

              {/* TOP BANNER: AI COPY GENERATOR HIGHLIGHT */}
              <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-indigo-900 via-indigo-800 to-purple-900 text-white p-5 shadow-lg border border-indigo-500/30">
                <div className="relative z-10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-white/20 text-yellow-300 text-[14px]">
                        ✨
                      </span>
                      <h3 className="text-[15px] font-bold tracking-tight">AI Landing Page Copy Generator</h3>
                    </div>
                    <p className="text-[12px] text-indigo-100/85 max-w-xl leading-relaxed">
                      Analyze manuscript chapters and generate direct-response marketing elements: Hook, Transformational Promise, Pain Points, Curriculum TOC, Deliverables, Value Stack, Bonuses & FAQs.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={handleGenerateAiCopy}
                    disabled={isAiGenerating}
                    className="btn btn-primary !bg-white !text-indigo-900 hover:!bg-indigo-50 font-bold px-4 py-2 shrink-0 shadow-md cursor-pointer transition-transform active:scale-95"
                  >
                    {isAiGenerating ? (
                      <>
                        <span className="inline-block animate-spin mr-1">⟳</span>
                        Generating Direct-Response Copy…
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined text-[18px] text-indigo-700">auto_awesome</span>
                        ✨ Auto-Generate Copy with AI
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* SECTION A: AI LANDING PAGE COPY ELEMENTS */}
              <div className="panel p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-2.5">
                  <span className="text-[13px] font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">psychology</span>
                    Section A: High-Converting Landing Page Copy
                  </span>
                  <span className="text-[11px] text-on-surface-variant">Editable direct-response elements</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="label">Hero Hook Badge (Target Persona)</label>
                    <input
                      type="text"
                      className="input font-mono text-[12px] uppercase font-bold text-primary"
                      value={hook}
                      onChange={(e) => setHook(e.target.value)}
                      placeholder="FOR AMBITIOUS CREATORS & SOLOPRENEURS"
                    />
                    <p className="hint">Punchy all-caps badge displayed at the top of the hero.</p>
                  </div>

                  <div>
                    <label className="label">Bold Transformational Promise</label>
                    <input
                      type="text"
                      className="input text-[12.5px] font-semibold"
                      value={promise}
                      onChange={(e) => setPromise(e.target.value)}
                      placeholder="One clear, bold outcome the reader will achieve."
                    />
                    <p className="hint">Core value proposition that hooks visitors in 3 seconds.</p>
                  </div>
                </div>

                <div>
                  <label className="label">Benefit-Driven Subtitle / Framework Hook</label>
                  <textarea
                    className="textarea text-[12.5px]"
                    rows={2}
                    value={subtitle}
                    onChange={(e) => setSubtitle(e.target.value)}
                    placeholder="Clear explanation of the methodology and actionable benefits."
                  />
                </div>

                {/* Pain Points & Benefits Split */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="label flex items-center justify-between">
                      <span>Pain Points Solved (3-4 items)</span>
                      <button
                        type="button"
                        className="text-[11px] text-primary hover:underline font-semibold"
                        onClick={() => setPainPoints([...painPoints, "New frustrating problem reader faces"])}
                      >
                        + Add Pain Point
                      </button>
                    </label>
                    {painPoints.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className="text-rose-500 font-bold text-xs shrink-0">✕</span>
                        <input
                          type="text"
                          className="input text-[12px] flex-1"
                          value={item}
                          onChange={(e) => {
                            const next = [...painPoints];
                            next[idx] = e.target.value;
                            setPainPoints(next);
                          }}
                        />
                        {painPoints.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon btn-xs text-on-surface-variant hover:text-error"
                            onClick={() => setPainPoints(painPoints.filter((_, i) => i !== idx))}
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="space-y-2">
                    <label className="label flex items-center justify-between">
                      <span>Key Outcomes & Superpowers (3-4 items)</span>
                      <button
                        type="button"
                        className="text-[11px] text-primary hover:underline font-semibold"
                        onClick={() => setBenefits([...benefits, "New transformational outcome reader unlocks"])}
                      >
                        + Add Outcome
                      </button>
                    </label>
                    {benefits.map((item, idx) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className="text-emerald-500 font-bold text-xs shrink-0">✓</span>
                        <input
                          type="text"
                          className="input text-[12px] flex-1"
                          value={item}
                          onChange={(e) => {
                            const next = [...benefits];
                            next[idx] = e.target.value;
                            setBenefits(next);
                          }}
                        />
                        {benefits.length > 1 && (
                          <button
                            type="button"
                            className="btn btn-ghost btn-icon btn-xs text-on-surface-variant hover:text-error"
                            onClick={() => setBenefits(benefits.filter((_, i) => i !== idx))}
                          >
                            <span className="material-symbols-outlined text-[14px]">delete</span>
                          </button>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* Deliverables & Value Stack */}
                <div className="space-y-2">
                  <label className="label flex items-center justify-between">
                    <span>What Reader Receives (Deliverables Breakdown)</span>
                    <button
                      type="button"
                      className="text-[11px] text-primary hover:underline font-semibold"
                      onClick={() =>
                        setDeliverables([
                          ...deliverables,
                          { name: "Bonus Workbook", format: "PDF", description: "Step-by-step exercises" },
                        ])
                      }
                    >
                      + Add Deliverable
                    </button>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {deliverables.map((item, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-[var(--hairline)] bg-surface-container-low dark:bg-[#18182e] p-2.5 space-y-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            className="input text-[12px] font-semibold flex-1"
                            value={item.name}
                            placeholder="Deliverable Name"
                            onChange={(e) => {
                              const next = [...deliverables];
                              next[idx].name = e.target.value;
                              setDeliverables(next);
                            }}
                          />
                          <input
                            type="text"
                            className="input text-[11px] font-mono w-28"
                            value={item.format}
                            placeholder="Format (PDF, EPUB)"
                            onChange={(e) => {
                              const next = [...deliverables];
                              next[idx].format = e.target.value;
                              setDeliverables(next);
                            }}
                          />
                        </div>
                        <input
                          type="text"
                          className="input text-[11.5px] text-on-surface-variant"
                          value={item.description}
                          placeholder="Brief description of what is included"
                          onChange={(e) => {
                            const next = [...deliverables];
                            next[idx].description = e.target.value;
                            setDeliverables(next);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* High-Value Bonuses */}
                <div className="space-y-2">
                  <label className="label flex items-center justify-between">
                    <span>Fast-Action Bonuses (Free Value Stack)</span>
                    <button
                      type="button"
                      className="text-[11px] text-primary hover:underline font-semibold"
                      onClick={() =>
                        setBonuses([
                          ...bonuses,
                          {
                            title: "Exclusive Playbook Vault",
                            description: "Ready-to-use frameworks",
                            valueInr: 499,
                            valueUsd: 9,
                          },
                        ])
                      }
                    >
                      + Add Bonus
                    </button>
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {bonuses.map((item, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-amber-500/20 bg-amber-500/5 dark:bg-amber-500/10 p-2.5 space-y-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            className="input text-[12px] font-semibold flex-1"
                            value={item.title}
                            placeholder="Bonus Title"
                            onChange={(e) => {
                              const next = [...bonuses];
                              next[idx].title = e.target.value;
                              setBonuses(next);
                            }}
                          />
                          <div className="flex items-center text-[11px] font-bold text-amber-600 dark:text-amber-400 shrink-0">
                            ₹
                            <input
                              type="number"
                              className="input text-[11px] font-mono w-16 p-1 text-center"
                              value={item.valueInr}
                              onChange={(e) => {
                                const next = [...bonuses];
                                next[idx].valueInr = Number(e.target.value);
                                next[idx].valueUsd = Math.max(1, Math.round(Number(e.target.value) / 35));
                                setBonuses(next);
                              }}
                            />
                          </div>
                        </div>
                        <input
                          type="text"
                          className="input text-[11.5px] text-on-surface-variant"
                          value={item.description}
                          placeholder="Description of bonus value"
                          onChange={(e) => {
                            const next = [...bonuses];
                            next[idx].description = e.target.value;
                            setBonuses(next);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* FAQs */}
                <div className="space-y-2">
                  <label className="label flex items-center justify-between">
                    <span>Frequently Asked Questions (Instant Objection Busters)</span>
                    <button
                      type="button"
                      className="text-[11px] text-primary hover:underline font-semibold"
                      onClick={() => setFaqs([...faqs, { q: "New Question?", a: "Clear, reassuring answer." }])}
                    >
                      + Add FAQ
                    </button>
                  </label>
                  <div className="space-y-2">
                    {faqs.map((faq, idx) => (
                      <div
                        key={idx}
                        className="rounded-lg border border-[var(--hairline)] bg-surface-container-low dark:bg-[#18182e] p-2.5 space-y-1.5"
                      >
                        <div className="flex items-center gap-2">
                          <span className="text-[11px] font-bold text-primary shrink-0">Q{idx + 1}</span>
                          <input
                            type="text"
                            className="input text-[12px] font-semibold flex-1"
                            value={faq.q}
                            placeholder="Question"
                            onChange={(e) => {
                              const next = [...faqs];
                              next[idx].q = e.target.value;
                              setFaqs(next);
                            }}
                          />
                          {faqs.length > 1 && (
                            <button
                              type="button"
                              className="btn btn-ghost btn-icon btn-xs text-on-surface-variant hover:text-error"
                              onClick={() => setFaqs(faqs.filter((_, i) => i !== idx))}
                            >
                              <span className="material-symbols-outlined text-[14px]">delete</span>
                            </button>
                          )}
                        </div>
                        <input
                          type="text"
                          className="input text-[11.5px] text-on-surface-variant"
                          value={faq.a}
                          placeholder="Answer"
                          onChange={(e) => {
                            const next = [...faqs];
                            next[idx].a = e.target.value;
                            setFaqs(next);
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION B: PRODUCT & PRICING CONTROLS */}
              <div className="panel p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-2.5">
                  <span className="text-[13px] font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">sell</span>
                    Section B: Product Catalog & Pricing Controls
                  </span>
                  <span className="text-[11px] text-on-surface-variant">Storefront parameters</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="md:col-span-2">
                    <label className="label">Product Title</label>
                    <input
                      type="text"
                      className="input font-semibold text-[13px]"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="label">Asset Type</label>
                    <select
                      className="select text-[12.5px]"
                      value={assetType}
                      onChange={(e) => setAssetType(e.target.value as AssetType)}
                    >
                      <option value="ebook">Ebook / Manuscript</option>
                      <option value="prompts">AI Prompts & Workflows</option>
                      <option value="template">Digital Template / Playbook</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 items-end">
                  <div>
                    <label className="label">Category</label>
                    <select
                      className="select text-[12.5px]"
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      {MARKETPLACE_CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="label">Price (INR ₹)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">
                        ₹
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="10"
                        className="input pl-7 font-mono font-bold text-[13px]"
                        value={priceInr}
                        onChange={(e) => handleInrChange(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="label">Price (USD $)</label>
                    <div className="relative">
                      <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-on-surface-variant">
                        $
                      </span>
                      <input
                        type="number"
                        min="0"
                        step="1"
                        className="input pl-7 font-mono font-bold text-[13px]"
                        value={priceUsd}
                        onChange={(e) => setPriceUsd(Number(e.target.value))}
                      />
                    </div>
                  </div>

                  <div className="flex items-center h-10 pb-1">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={chargeGst}
                        onChange={(e) => setChargeGst(e.target.checked)}
                        className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                      <span className="text-[12px] font-semibold text-on-surface">Include 18% GST</span>
                    </label>
                  </div>
                </div>

                {/* Route Mode */}
                <div>
                  <label className="label">Distribution Route Mode</label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {[
                      {
                        mode: "both" as const,
                        label: "Marketplace + Landing Page",
                        desc: "Catalog search + standalone conversion funnel",
                      },
                      {
                        mode: "landing" as const,
                        label: "Standalone Landing Page Only",
                        desc: "Dedicated high-converting URL for ad traffic",
                      },
                      {
                        mode: "store" as const,
                        label: "Marketplace Storefront Only",
                        desc: "Catalog listing with organic search",
                      },
                    ].map((item) => (
                      <button
                        key={item.mode}
                        type="button"
                        className="tile !p-2.5 text-left"
                        data-selected={routeMode === item.mode}
                        aria-pressed={routeMode === item.mode}
                        onClick={() => setRouteMode(item.mode)}
                      >
                        <span className="tile-name text-[12px]">{item.label}</span>
                        <span className="tile-desc text-[10.5px] mt-0.5">{item.desc}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* SECTION C: VISUAL PRESETS & BLOCKS CUSTOMIZATION */}
              <div className="panel p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-[var(--hairline)] pb-2.5">
                  <span className="text-[13px] font-bold text-on-surface flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-primary text-[18px]">palette</span>
                    Section C: Landing Page Visual Preset & Blocks
                  </span>
                  <span className="text-[11px] text-on-surface-variant">Design tokens & urgency</span>
                </div>

                {/* Template Preset Selector */}
                <div>
                  <label className="label">Template Preset</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                    {BUNDLEKART_TEMPLATES.map((tmpl) => (
                      <button
                        key={tmpl.id}
                        type="button"
                        className="tile !p-2.5 text-left flex flex-col justify-between"
                        data-selected={templateId === tmpl.id}
                        aria-pressed={templateId === tmpl.id}
                        onClick={() => setTemplateId(tmpl.id)}
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="tile-name text-[12px]">{tmpl.name}</span>
                            <span className="text-[9.5px] font-bold uppercase tracking-wider text-primary">
                              {tmpl.badge}
                            </span>
                          </div>
                          <span className="tile-desc text-[10.5px] mt-1 line-clamp-2">{tmpl.desc}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Accent Color Palette & Urgency */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                  <div>
                    <label className="label">Accent Color Palette</label>
                    <div className="flex items-center gap-2 pt-1">
                      {BUNDLEKART_ACCENT_COLORS.map((col) => (
                        <button
                          key={col.hex}
                          type="button"
                          onClick={() => setAccentColor(col.hex)}
                          className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${col.bg} ${
                            accentColor === col.hex ? "ring-2 ring-offset-2 ring-primary scale-110" : "opacity-80 hover:opacity-100"
                          }`}
                          title={col.name}
                        >
                          {accentColor === col.hex && (
                            <span className="material-symbols-outlined text-white text-[16px]">check</span>
                          )}
                        </button>
                      ))}
                      <span className="text-xs font-semibold text-on-surface-variant ml-2 font-mono uppercase">
                        {BUNDLEKART_ACCENT_COLORS.find((c) => c.hex === accentColor)?.name || accentColor}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="flex items-center gap-2 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={showUrgencyBanner}
                        onChange={(e) => setShowUrgencyBanner(e.target.checked)}
                        className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                      />
                      <span className="text-[12.5px] font-semibold text-on-surface">
                        ⚡ Urgency Bar & Countdown Timer
                      </span>
                    </label>
                    {showUrgencyBanner && (
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-on-surface-variant">Timer:</span>
                        <input
                          type="number"
                          min="5"
                          max="60"
                          className="input text-xs w-20 py-1 font-mono text-center"
                          value={urgencyMinutes}
                          onChange={(e) => setUrgencyMinutes(Number(e.target.value))}
                        />
                        <span className="text-xs text-on-surface-variant">minutes left notification</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Modular Blocks Toggle */}
                <div>
                  <label className="label">Landing Page Modular Blocks & Headline Overrides</label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
                    {blocks.map((b) => (
                      <div
                        key={b.id}
                        className={`rounded-lg border p-2 flex items-center gap-2 transition-colors ${
                          b.enabled
                            ? "border-[var(--hairline-strong)] bg-surface-container-low dark:bg-[#18182e]"
                            : "border-[var(--hairline)] opacity-50 bg-surface-container-lowest"
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={b.enabled}
                          onChange={() => toggleBlock(b.id)}
                          className="rounded text-primary focus:ring-primary w-4 h-4 cursor-pointer"
                        />
                        <div className="flex-1 min-w-0">
                          <span className="text-[11.5px] font-semibold text-on-surface block capitalize truncate">
                            {b.id.replace(/_/g, " ")}
                          </span>
                          {b.enabled && b.headlineOverride !== undefined && (
                            <input
                              type="text"
                              className="input text-[10.5px] py-0.5 px-1.5 h-6 mt-1 w-full"
                              value={b.headlineOverride}
                              placeholder="Override headline..."
                              onChange={(e) => updateBlockHeadline(b.id, e.target.value)}
                            />
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {!publishedData && (
          <div className="px-5 py-3.5 border-t border-[var(--hairline)] bg-surface-container-lowest dark:bg-[#121222] shrink-0 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-on-surface-variant font-mono">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>Target: {platform.marketplaceBaseUrl || MARKETPLACE.defaultBaseUrl}</span>
            </div>

            <div className="flex items-center gap-2">
              <button type="button" className="btn btn-secondary" onClick={onClose} disabled={isPublishing}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn-primary font-bold px-4 py-2 !bg-emerald-600 hover:!bg-emerald-500 text-white shadow-md cursor-pointer transition-all active:scale-95 disabled:opacity-50"
                onClick={handlePushToBundleKart}
                disabled={Boolean(apiBlocker) || Boolean(readyBlocker) || isPublishing}
              >
                {isPublishing ? (
                  <>
                    <span className="inline-block animate-spin mr-1.5">⟳</span>
                    Publishing to BundleKart…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[18px]">rocket_launch</span>
                    🚀 Push to BundleKart
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
