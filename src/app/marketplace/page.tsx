"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/app-store";
import { calculateProjectWords } from "@/lib/app-utils";
import {
  MARKETPLACE,
  testBundleKartConnection,
} from "@/lib/marketplace";
import { BundleKartPublishModal } from "@/components/BundleKartPublishModal";
import type { Project } from "@/lib/app-store";

export default function MarketplacePage() {
  const platform = useAppStore((state) => state.platform);
  const projects = useAppStore((state) => state.projects);
  const updatePlatformApi = useAppStore((state) => state.updatePlatformApi);
  const disconnectMarketplace = useAppStore((state) => state.disconnectMarketplace);

  const [inputKey, setInputKey] = useState(platform.marketplaceApiKey || "");
  const [endpointUrl, setEndpointUrl] = useState(platform.marketplaceBaseUrl || MARKETPLACE.defaultBaseUrl);
  const [sellerId, setSellerId] = useState(platform.sellerId || "");
  const [isVerifying, setIsVerifying] = useState(false);
  const [connectError, setConnectError] = useState("");
  const [notice, setNotice] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [showAdvancedUrl, setShowAdvancedUrl] = useState(false);

  const isConnected = platform.connectionState === "connected" && Boolean(platform.marketplaceApiKey);

  // Quick stats
  const publishedProjects = projects.filter((p) => p.publish?.status === "published");
  const readyProjects = projects.filter((p) => p.status === "Ready" && p.publish?.status !== "published");
  const totalWords = projects.reduce((acc, p) => acc + calculateProjectWords(p), 0);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputKey.trim()) {
      setConnectError("Please enter your BundleKart Creator API key.");
      return;
    }

    setIsVerifying(true);
    setConnectError("");

    const testPlatform = {
      ...platform,
      marketplaceApiKey: inputKey.trim(),
      marketplaceBaseUrl: endpointUrl.trim() || MARKETPLACE.defaultBaseUrl,
      sellerId: sellerId.trim() || "creator",
    };

    try {
      const result = await testBundleKartConnection(testPlatform);
      updatePlatformApi({
        marketplaceApiKey: inputKey.trim(),
        marketplaceBaseUrl: endpointUrl.trim() || MARKETPLACE.defaultBaseUrl,
        sellerId: result.seller?.sellerId || sellerId.trim() || "creator",
        connectionState: "connected",
        connectionMessage: `Connected to ${result.service || "BundleKart Creator API"}.`,
        seller: result.seller,
        lastCheckedAt: Date.now(),
        marketplaceEnabled: true,
      });
      setNotice(`🟢 Successfully connected to BundleKart as ${result.seller?.displayName || "Creator"}!`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to verify BundleKart API key.";
      setConnectError(msg);
      updatePlatformApi({
        connectionState: "error",
        connectionMessage: msg,
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleDisconnect = () => {
    disconnectMarketplace();
    setInputKey("");
    setNotice("Disconnected from BundleKart.");
  };

  return (
    <div className="page space-y-6 max-w-6xl mx-auto">
      {/* Page Header */}
      <div className="page-head flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="w-6 h-6 rounded bg-primary/10 text-primary flex items-center justify-center">
              <span className="material-symbols-outlined text-[16px]">storefront</span>
            </span>
            <span className="text-[11.5px] font-bold uppercase tracking-wider text-primary">
              Creator Marketplace Studio
            </span>
          </div>
          <h1 className="page-title">BundleKart Publishing</h1>
          <p className="page-sub">
            Monetize your manuscripts, ebooks, prompt packs, and playbooks with 1-click publishing to BundleKart.
          </p>
        </div>

        {isConnected && (
          <div className="flex items-center gap-3">
            <a
              href={platform.marketplaceBaseUrl || MARKETPLACE.storeUrl}
              target="_blank"
              rel="noreferrer"
              className="btn btn-secondary btn-sm"
            >
              <span className="material-symbols-outlined text-[15px]">open_in_new</span>
              View Live Storefront
            </a>
            <Link href="/create" className="btn btn-primary btn-sm">
              <span className="material-symbols-outlined text-[15px]">add</span>
              New Manuscript
            </Link>
          </div>
        )}
      </div>

      {/* Notice Banner */}
      {notice && (
        <div className="p-3.5 rounded-xl border border-emerald-300 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-800 dark:text-emerald-300 text-sm font-medium flex items-center justify-between">
          <span>{notice}</span>
          <button type="button" className="btn btn-ghost btn-xs" onClick={() => setNotice("")}>
            ✕
          </button>
        </div>
      )}

      {/* STATE 1: ONBOARDING & CONNECTION CARD (When not connected) */}
      {!isConnected ? (
        <div className="rounded-2xl border border-[var(--hairline-strong)] bg-surface-container-lowest dark:bg-[#121222] p-6 sm:p-8 shadow-sm space-y-6">
          <div className="max-w-2xl space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-bold">
              <span>🚀 1-Click Publishing to BundleKart</span>
            </div>
            <h2 className="text-2xl font-bold text-on-surface tracking-tight">
              Monetize your writing on BundleKart Marketplace
            </h2>
            <p className="text-sm text-on-surface-variant leading-relaxed">
              Connect your BundleKart Creator account to push your finished manuscripts, structured prompt guides, or digital playbooks directly to BundleKart with 1-click. Writerdost automatically generates high-converting landing page copy and delivers DRM-free PDF and EPUB packages.
            </p>
          </div>

          <form onSubmit={handleConnect} className="max-w-xl space-y-4 pt-2">
            <div>
              <label htmlFor="bk-key-input" className="label text-[13px] font-semibold">
                BundleKart Creator API Key
              </label>
              <input
                id="bk-key-input"
                type="password"
                autoComplete="off"
                spellCheck={false}
                className="input font-mono text-[13px]"
                placeholder="bk_live_sk_... or bk_test_sk_..."
                value={inputKey}
                onChange={(e) => setInputKey(e.target.value)}
              />
              <p className="hint flex items-center gap-1 mt-1.5 text-[11.5px]">
                <span className="material-symbols-outlined text-[14px]">key</span>
                Find your API Key in your{" "}
                <a
                  href="https://bundlekart.in"
                  target="_blank"
                  rel="noreferrer"
                  className="font-semibold text-primary hover:underline"
                >
                  BundleKart Dashboard → Settings → API Keys
                </a>
                .
              </p>
            </div>

            {showAdvancedUrl && (
              <div className="space-y-3 p-3.5 rounded-xl border border-[var(--hairline)] bg-surface-container-low dark:bg-[#18182e] animate-in fade-in">
                <div>
                  <label htmlFor="bk-endpoint-input" className="label text-xs">
                    Marketplace Base URL / Dev Host
                  </label>
                  <input
                    id="bk-endpoint-input"
                    type="text"
                    className="input font-mono text-xs"
                    placeholder="https://bundlekart.in or http://localhost:3000"
                    value={endpointUrl}
                    onChange={(e) => setEndpointUrl(e.target.value)}
                  />
                  <p className="hint text-[11px]">Default is https://bundlekart.in. Use http://localhost:3000 for local testing.</p>
                </div>
                <div>
                  <label htmlFor="bk-seller-id" className="label text-xs">
                    Seller Studio ID (Optional)
                  </label>
                  <input
                    id="bk-seller-id"
                    type="text"
                    className="input text-xs"
                    placeholder="e.g. my-studio"
                    value={sellerId}
                    onChange={(e) => setSellerId(e.target.value)}
                  />
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <button
                type="button"
                className="text-[11.5px] text-on-surface-variant hover:text-on-surface hover:underline cursor-pointer"
                onClick={() => setShowAdvancedUrl(!showAdvancedUrl)}
              >
                {showAdvancedUrl ? "▲ Hide Endpoint Config" : "⚙️ Advanced: Custom Endpoint (e.g. localhost)"}
              </button>
            </div>

            {connectError && (
              <div className="p-3 rounded-lg border border-rose-300 dark:border-rose-500/30 bg-rose-50 dark:bg-rose-500/10 text-rose-800 dark:text-rose-300 text-xs font-medium">
                {connectError}
              </div>
            )}

            <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <button
                type="submit"
                disabled={isVerifying || !inputKey.trim()}
                className="btn btn-primary font-bold px-5 py-2.5 !bg-emerald-600 hover:!bg-emerald-500 text-white cursor-pointer shadow-md"
              >
                {isVerifying ? (
                  <>
                    <span className="inline-block animate-spin mr-1.5">⟳</span>
                    Verifying API Key…
                  </>
                ) : (
                  <>
                    <span className="material-symbols-outlined text-[17px]">verified</span>
                    Verify & Connect Account
                  </>
                )}
              </button>

              <a
                href={MARKETPLACE.onboardUrl}
                target="_blank"
                rel="noreferrer"
                className="text-xs text-primary font-semibold hover:underline flex items-center gap-1"
              >
                Don&rsquo;t have a seller account yet? Create your BundleKart Seller Account in 60s →
              </a>
            </div>
          </form>
        </div>
      ) : (
        /* STATE 2: CONNECTED STUDIO DASHBOARD */
        <div className="space-y-6">
          {/* Connection Status Banner */}
          <div className="rounded-2xl border border-[var(--hairline)] bg-surface-container-lowest dark:bg-[#121222] p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-500 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[24px]">verified</span>
              </span>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-[15px] font-bold text-on-surface">
                    Connected to BundleKart: {platform.seller?.displayName || "Creator Studio"}
                  </h2>
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                </div>
                <p className="text-[12px] text-on-surface-variant font-mono">
                  Endpoint: {platform.marketplaceBaseUrl || MARKETPLACE.defaultBaseUrl} · Key: {platform.marketplaceApiKey.slice(0, 10)}••••
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                className="btn btn-ghost btn-sm text-on-surface-variant hover:text-error cursor-pointer"
                onClick={handleDisconnect}
              >
                Disconnect / Change Key
              </button>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="panel p-4">
              <p className="text-[11.5px] font-semibold text-on-surface-variant uppercase tracking-wider">Total Projects</p>
              <p className="text-2xl font-bold text-on-surface mt-1">{projects.length}</p>
            </div>
            <div className="panel p-4">
              <p className="text-[11.5px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Live on BundleKart</p>
              <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400 mt-1">{publishedProjects.length}</p>
            </div>
            <div className="panel p-4">
              <p className="text-[11.5px] font-semibold text-amber-600 dark:text-amber-400 uppercase tracking-wider">Ready to Publish</p>
              <p className="text-2xl font-bold text-amber-600 dark:text-amber-400 mt-1">{readyProjects.length}</p>
            </div>
            <div className="panel p-4">
              <p className="text-[11.5px] font-semibold text-on-surface-variant uppercase tracking-wider">Total Words Authored</p>
              <p className="text-2xl font-bold text-on-surface mt-1">{totalWords.toLocaleString()}</p>
            </div>
          </div>

          {/* RECENT PROJECTS READY TO PUBLISH SECTION */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-on-surface">Recent Projects Ready to Publish</h2>
                <p className="text-xs text-on-surface-variant">
                  Select any manuscript to review copy, generate high-converting landing elements with AI, and publish with 1-click.
                </p>
              </div>
            </div>

            {projects.length === 0 ? (
              <div className="panel p-8 text-center space-y-3">
                <span className="material-symbols-outlined text-[36px] text-on-surface-variant/50">menu_book</span>
                <p className="text-sm font-semibold text-on-surface">No manuscripts created yet</p>
                <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
                  Start drafting your first ebook or import an outline to get started.
                </p>
                <Link href="/create" className="btn btn-primary btn-sm inline-flex">
                  Create Your First Ebook
                </Link>
              </div>
            ) : (
              <div className="panel overflow-hidden">
                <div className="divide-y divide-[var(--hairline)]">
                  {projects.map((project) => {
                    const words = calculateProjectWords(project);
                    const pages = Math.max(1, Math.ceil(words / 250));
                    const isPublished = project.publish?.status === "published";
                    const isReady = project.status === "Ready";

                    return (
                      <div
                        key={project.id}
                        className="p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:bg-on-surface/[0.02] transition-colors"
                      >
                        {/* Cover + Info */}
                        <div className="flex items-start sm:items-center gap-4 min-w-0 flex-1">
                          <div
                            className="w-14 h-18 rounded-lg shrink-0 flex items-center justify-center text-white text-xs font-bold shadow-sm p-1 text-center"
                            style={{
                              background: project.coverAccent || "linear-gradient(150deg, #7b5bff, #ff4d9d)",
                            }}
                          >
                            <span className="line-clamp-2 text-[10px] leading-tight drop-shadow">
                              {project.title.slice(0, 20)}
                            </span>
                          </div>

                          <div className="space-y-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="text-sm font-bold text-on-surface truncate">{project.title}</h3>
                              {isPublished ? (
                                <span className="chip bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 font-semibold text-[10.5px]">
                                  🟢 Synced to BundleKart
                                </span>
                              ) : isReady ? (
                                <span className="chip bg-amber-500/10 text-amber-700 dark:text-amber-400 font-semibold text-[10.5px]">
                                  ⚡ Ready to Publish
                                </span>
                              ) : (
                                <span className="chip chip-neutral text-[10.5px]">{project.status}</span>
                              )}
                            </div>

                            <p className="text-xs text-on-surface-variant line-clamp-1">
                              {project.description || "Practical framework and implementation manual."}
                            </p>

                            <div className="flex items-center gap-3 text-[11.5px] text-on-surface-variant/80 font-mono">
                              <span>{words.toLocaleString()} words</span>
                              <span>·</span>
                              <span>~{pages} pages</span>
                              <span>·</span>
                              <span>{project.chapters.length} chapters</span>
                              {project.publish?.bundlekartInr && (
                                <>
                                  <span>·</span>
                                  <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                                    ₹{project.publish.bundlekartInr} / ${project.publish.bundlekartUsd || Math.round(project.publish.bundlekartInr / 35)}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Actions */}
                        <div className="flex items-center gap-2 self-end md:self-center shrink-0">
                          {isPublished && project.publish?.bundlekartLandingUrl && (
                            <a
                              href={project.publish.bundlekartLandingUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-ghost btn-sm text-indigo-600 dark:text-indigo-400"
                              title="Preview Live Landing Page"
                            >
                              <span className="material-symbols-outlined text-[15px]">visibility</span>
                              Landing Page
                            </a>
                          )}

                          {isPublished && project.publish?.bundlekartStoreUrl && (
                            <a
                              href={project.publish.bundlekartStoreUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="btn btn-ghost btn-sm text-primary"
                              title="Open Storefront Listing"
                            >
                              <span className="material-symbols-outlined text-[15px]">open_in_new</span>
                              Store
                            </a>
                          )}

                          <button
                            type="button"
                            className={
                              isPublished
                                ? "btn btn-secondary btn-sm"
                                : "btn btn-primary btn-sm !bg-emerald-600 hover:!bg-emerald-500 text-white"
                            }
                            onClick={() => setSelectedProjectId(project.id)}
                          >
                            <span className="material-symbols-outlined text-[16px]">
                              {isPublished ? "sync" : "rocket_launch"}
                            </span>
                            {isPublished ? "Update Listing" : "Publish to BundleKart"}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Publish Modal Instance */}
      {selectedProjectId && (
        <BundleKartPublishModal
          projectId={selectedProjectId}
          onClose={() => setSelectedProjectId(null)}
          onDone={(msg) => {
            setNotice(msg);
            setSelectedProjectId(null);
          }}
        />
      )}
    </div>
  );
}
