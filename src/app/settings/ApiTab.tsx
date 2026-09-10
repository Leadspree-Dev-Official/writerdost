"use client";

import { useState } from "react";
import Link from "next/link";
import { useAppStore } from "@/lib/app-store";
import {
  API_ENDPOINTS,
  API_SCOPES,
  LISTING_FORMATS,
  MARKETPLACE,
  MARKETPLACE_CATEGORIES,
  MARKETPLACE_LICENSES,
  isMarketplaceReady,
  maskToken,
  testMarketplaceConnection,
} from "@/lib/marketplace";
import type { ApiScope, ListingFormat, ListingVisibility, MarketplaceLicense } from "@/lib/store-types";

const CURRENCIES = ["USD", "INR", "EUR", "GBP"];
const DEFAULT_SCOPES: ApiScope[] = ["projects:read", "publish"];

/**
 * Settings → API. Two directions on one page:
 * outbound publishing to InstaGuru Marketplace, and inbound tokens that let
 * another tool or a contractor drive this workspace over HTTP.
 */
export function ApiTab() {
  const platform = useAppStore((state) => state.platform);
  const projects = useAppStore((state) => state.projects);
  const updatePlatformApi = useAppStore((state) => state.updatePlatformApi);
  const disconnectMarketplace = useAppStore((state) => state.disconnectMarketplace);
  const createApiToken = useAppStore((state) => state.createApiToken);
  const revokeApiToken = useAppStore((state) => state.revokeApiToken);
  const deleteApiToken = useAppStore((state) => state.deleteApiToken);

  const [testing, setTesting] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [message, setMessage] = useState("");
  const [tokenLabel, setTokenLabel] = useState("");
  const [tokenScopes, setTokenScopes] = useState<ApiScope[]>(DEFAULT_SCOPES);
  /** Shown in full exactly once, right after minting. */
  const [freshToken, setFreshToken] = useState<string | null>(null);

  const ready = isMarketplaceReady(platform);
  const publishedCount = projects.filter((project) => project.publish?.status === "published").length;

  let statusText = "Not connected";
  let statusDotClass = "bg-slate-400";
  let statusTextClass = "text-on-surface-variant";
  if (platform.connectionState === "connected") {
    statusText = "Connected";
    statusDotClass = "bg-emerald-500";
    statusTextClass = "text-emerald-600 dark:text-emerald-400";
  } else if (platform.connectionState === "error") {
    statusText = "Connection failed";
    statusDotClass = "bg-rose-500";
    statusTextClass = "text-rose-500 dark:text-rose-400";
  } else if (platform.marketplaceApiKey && platform.sellerId) {
    statusText = "Ready to test";
    statusDotClass = "bg-blue-500";
    statusTextClass = "text-blue-500 dark:text-blue-400";
  }

  const handleTest = async () => {
    setTesting(true);
    setMessage("");
    try {
      const result = await testMarketplaceConnection(platform);
      updatePlatformApi({
        connectionState: "connected",
        connectionMessage: `Connected as ${result.seller.displayName}.`,
        seller: result.seller,
        lastCheckedAt: Date.now(),
        marketplaceEnabled: true,
      });
      setMessage(`Connected to ${MARKETPLACE.name} as ${result.seller.displayName}.`);
    } catch (error) {
      const text = error instanceof Error ? error.message : "Could not reach the marketplace.";
      updatePlatformApi({
        connectionState: "error",
        connectionMessage: text,
        seller: null,
        lastCheckedAt: Date.now(),
      });
      setMessage(`Connection failed: ${text}`);
    } finally {
      setTesting(false);
    }
  };

  const toggleScope = (scope: ApiScope) =>
    setTokenScopes((current) =>
      current.includes(scope) ? current.filter((item) => item !== scope) : [...current, scope],
    );

  const toggleFormat = (format: ListingFormat) => {
    const next = platform.defaultFormats.includes(format)
      ? platform.defaultFormats.filter((item) => item !== format)
      : [...platform.defaultFormats, format];
    updatePlatformApi({ defaultFormats: next });
  };

  return (
    <div className="space-y-3">
      {message && (
        <div
          className={`rounded-[var(--radius-lg)] p-4 text-sm ${
            message.toLowerCase().includes("failed")
              ? "bg-rose-50 dark:bg-rose-500/10 border border-rose-100 dark:border-rose-500/20 text-rose-700 dark:text-rose-400"
              : "bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-100 dark:border-emerald-500/20 text-emerald-700 dark:text-emerald-400"
          }`}
        >
          {message}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_17rem] gap-4 items-start">
        <div className="min-w-0 space-y-3">
          {/* ---- Outbound: the marketplace connection ---- */}
          <section className="panel overflow-hidden">
            <div className="panel-head">
              <span className="panel-title">{MARKETPLACE.name}</span>
              <span className="flex items-center gap-1.5">
                <span className={`w-1.5 h-1.5 rounded-full ${statusDotClass}`} />
                <span className={`text-[11px] font-semibold ${statusTextClass}`}>{statusText}</span>
              </span>
            </div>

            <div className="panel-pad grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
              <div className="md:col-span-2 flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-bold">Publish projects to the marketplace</p>
                  <p className="text-xs text-on-surface-variant">
                    Turns on the Publish action in the editor and the projects list.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={platform.marketplaceEnabled}
                  aria-label="Enable marketplace publishing"
                  className="switch shrink-0"
                  data-on={platform.marketplaceEnabled}
                  onClick={() => updatePlatformApi({ marketplaceEnabled: !platform.marketplaceEnabled })}
                />
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="mk-key" className="label !mb-0">Marketplace API key</label>
                  {platform.marketplaceApiKey && (
                    <button
                      className="text-[11px] font-semibold text-primary hover:underline"
                      onClick={() => setShowKey((value) => !value)}
                      type="button"
                    >
                      {showKey ? "Hide" : "Show"}
                    </button>
                  )}
                </div>
                <div className="mt-1.5">
                  <input
                    id="mk-key"
                    className="input font-mono text-[12px]"
                    placeholder="ig_live_…"
                    type={showKey ? "text" : "password"}
                    autoComplete="off"
                    spellCheck={false}
                    value={platform.marketplaceApiKey}
                    onChange={(event) => updatePlatformApi({ marketplaceApiKey: event.target.value })}
                  />
                </div>
                <p className="hint">From your seller dashboard. Keys begin with ig_.</p>
              </div>

              <div>
                <label htmlFor="mk-seller" className="label">Seller ID</label>
                <input
                  id="mk-seller"
                  className="input font-mono text-[12px]"
                  placeholder="writerdost-studio"
                  value={platform.sellerId}
                  onChange={(event) => updatePlatformApi({ sellerId: event.target.value })}
                />
                <p className="hint">The store your listings appear under.</p>
              </div>

              <div className="md:col-span-2">
                <label htmlFor="mk-url" className="label">Marketplace endpoint</label>
                <input
                  id="mk-url"
                  className="input font-mono text-[12px]"
                  placeholder={MARKETPLACE.defaultBaseUrl}
                  value={platform.marketplaceBaseUrl}
                  onChange={(event) => updatePlatformApi({ marketplaceBaseUrl: event.target.value })}
                />
                <p className="hint">
                  {MARKETPLACE.isMock
                    ? `${MARKETPLACE.name} is not live yet, so requests go to this app's local mock. The URL is stored and used as soon as the service ships.`
                    : "Base URL for the marketplace API."}
                </p>
              </div>

              {platform.seller && (
                <dl className="md:col-span-2 panel panel-pad space-y-0.5">
                  <div className="kv">
                    <dt>Store</dt>
                    <dd>{platform.seller.displayName}</dd>
                  </div>
                  <div className="kv">
                    <dt>Storefront</dt>
                    <dd className="truncate">{platform.seller.storeUrl}</dd>
                  </div>
                  <div className="kv">
                    <dt>Plan</dt>
                    <dd>{platform.seller.plan}</dd>
                  </div>
                  <div className="kv">
                    <dt>Last checked</dt>
                    <dd>
                      {platform.lastCheckedAt ? new Date(platform.lastCheckedAt).toLocaleString() : "—"}
                    </dd>
                  </div>
                </dl>
              )}
            </div>

            <div className="panel-pad border-t border-[var(--hairline)] flex flex-wrap items-center gap-3">
              <button
                className="btn btn-primary"
                disabled={testing || !platform.marketplaceApiKey || !platform.sellerId}
                onClick={handleTest}
                type="button"
              >
                {testing ? "Testing…" : "Test connection"}
              </button>
              {platform.connectionState !== "disconnected" && (
                <button className="btn btn-ghost" onClick={disconnectMarketplace} type="button">
                  Disconnect
                </button>
              )}
              <p className="hint !mt-0 ml-auto max-w-xs text-right">
                Credentials are held in this browser only, like your AI keys.
              </p>
            </div>
          </section>

          {/* ---- Listing defaults ---- */}
          <section className="panel overflow-hidden">
            <div className="panel-head">
              <span className="panel-title">Listing defaults</span>
              <span className="row-meta">Pre-filled on every publish</span>
            </div>

            <div className="panel-pad grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <label htmlFor="mk-price" className="label">Price</label>
                <div className="flex gap-1.5">
                  <input
                    id="mk-price"
                    className="input num"
                    type="number"
                    min="0"
                    step="0.5"
                    value={platform.defaultPrice}
                    onChange={(event) => updatePlatformApi({ defaultPrice: Number(event.target.value) })}
                  />
                  <select
                    className="select w-auto"
                    aria-label="Default currency"
                    value={platform.currency}
                    onChange={(event) => updatePlatformApi({ currency: event.target.value })}
                  >
                    {CURRENCIES.map((item) => (
                      <option key={item} value={item}>{item}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="mk-cat" className="label">Category</label>
                <select
                  id="mk-cat"
                  className="select"
                  value={platform.defaultCategory}
                  onChange={(event) => updatePlatformApi({ defaultCategory: event.target.value })}
                >
                  {MARKETPLACE_CATEGORIES.map((item) => (
                    <option key={item} value={item}>{item}</option>
                  ))}
                </select>
              </div>

              <div className="md:col-span-2">
                <p className="label">License</p>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-1.5">
                  {MARKETPLACE_LICENSES.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className="tile"
                      data-selected={platform.defaultLicense === item.value}
                      aria-pressed={platform.defaultLicense === item.value}
                      onClick={() => updatePlatformApi({ defaultLicense: item.value as MarketplaceLicense })}
                    >
                      <span className="tile-name">{item.label}</span>
                      <span className="tile-desc">{item.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="label">Formats delivered</p>
                <div className="flex flex-wrap gap-1.5">
                  {LISTING_FORMATS.map((item) => (
                    <button
                      key={item.value}
                      type="button"
                      className={
                        platform.defaultFormats.includes(item.value)
                          ? "btn btn-primary btn-sm"
                          : "btn btn-secondary btn-sm"
                      }
                      aria-pressed={platform.defaultFormats.includes(item.value)}
                      onClick={() => toggleFormat(item.value)}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="label">Visibility</p>
                <div className="segmented">
                  {(["draft", "public"] as ListingVisibility[]).map((item) => (
                    <button
                      key={item}
                      type="button"
                      className="segment"
                      data-active={platform.defaultVisibility === item}
                      onClick={() => updatePlatformApi({ defaultVisibility: item })}
                    >
                      {item === "draft" ? "Draft on store" : "Public"}
                    </button>
                  ))}
                </div>
              </div>

              <div className="md:col-span-2 flex items-start justify-between gap-4 pt-1">
                <div>
                  <p className="text-sm font-bold">Publish automatically when a project is marked Ready</p>
                  <p className="text-xs text-on-surface-variant">
                    Uses these defaults, with no publish dialog. Listings still land as{" "}
                    {platform.defaultVisibility === "public" ? "public" : "a draft on the store"}.
                  </p>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={platform.autoPublishOnReady}
                  aria-label="Publish automatically when a project is marked ready"
                  className="switch shrink-0"
                  data-on={platform.autoPublishOnReady}
                  onClick={() => updatePlatformApi({ autoPublishOnReady: !platform.autoPublishOnReady })}
                />
              </div>
            </div>
          </section>

          {/* ---- Inbound: tokens for programmatic access ---- */}
          <section className="panel overflow-hidden">
            <div className="panel-head">
              <span className="panel-title">Access tokens</span>
              <span className="row-meta">
                {platform.tokens.filter((token) => !token.revoked).length} active
              </span>
            </div>

            <div className="panel-pad space-y-3">
              <p className="text-[12.5px] text-on-surface-variant">
                A token lets another tool, a contractor or a script work on these projects over HTTP — so a
                project can be outsourced without handing over your account.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_auto] gap-3 items-end">
                <div>
                  <label htmlFor="tok-label" className="label">Label</label>
                  <input
                    id="tok-label"
                    className="input"
                    placeholder="Freelance editor · Meera"
                    value={tokenLabel}
                    onChange={(event) => setTokenLabel(event.target.value)}
                  />
                </div>
                <button
                  type="button"
                  className="btn btn-primary btn-lg"
                  disabled={tokenScopes.length === 0}
                  onClick={() => {
                    const created = createApiToken(tokenLabel, tokenScopes);
                    setFreshToken(created.token);
                    setTokenLabel("");
                    setMessage(`Token created for ${created.label}. Copy it now — it is shown once.`);
                  }}
                >
                  <span className="material-symbols-outlined">key</span>
                  Create token
                </button>
              </div>

              <div>
                <p className="label">Scopes</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                  {API_SCOPES.map((scope) => (
                    <button
                      key={scope.value}
                      type="button"
                      className="tile"
                      data-selected={tokenScopes.includes(scope.value)}
                      aria-pressed={tokenScopes.includes(scope.value)}
                      onClick={() => toggleScope(scope.value)}
                    >
                      <span className="tile-name font-mono">{scope.label}</span>
                      <span className="tile-desc">{scope.description}</span>
                    </button>
                  ))}
                </div>
              </div>

              {freshToken && (
                <div className="rounded-[var(--radius-lg)] border border-emerald-200 dark:border-emerald-500/25 bg-emerald-50 dark:bg-emerald-500/10 p-3">
                  <p className="text-[12px] font-semibold text-emerald-800 dark:text-emerald-300">
                    Copy this token now. It is not shown again.
                  </p>
                  <div className="flex items-center gap-2 mt-1.5">
                    <code className="flex-1 min-w-0 truncate font-mono text-[12px] text-emerald-900 dark:text-emerald-200">
                      {freshToken}
                    </code>
                    <button
                      type="button"
                      className="btn btn-secondary btn-sm shrink-0"
                      onClick={() => {
                        navigator.clipboard?.writeText(freshToken);
                        setMessage("Token copied to the clipboard.");
                      }}
                    >
                      Copy
                    </button>
                    <button
                      type="button"
                      className="btn btn-ghost btn-sm shrink-0"
                      onClick={() => setFreshToken(null)}
                    >
                      Done
                    </button>
                  </div>
                </div>
              )}
            </div>

            {platform.tokens.length === 0 ? (
              <p className="empty">No tokens yet.</p>
            ) : (
              <>
                <div className="hidden md:flex items-center gap-4 h-8 px-3 border-t border-b border-[var(--hairline)] bg-on-surface/[0.02] text-[11px] font-semibold text-on-surface-variant">
                  <span className="flex-1 min-w-0">Label</span>
                  <span className="w-44">Token</span>
                  <span className="w-24">Created</span>
                  <span className="w-16">State</span>
                  <span className="w-16" />
                </div>
                {platform.tokens.map((token) => (
                  <div key={token.id} className="row px-3 gap-4">
                    <span className="flex-1 min-w-0">
                      <span className="block row-title truncate">{token.label}</span>
                      <span className="block row-meta truncate mt-0.5 font-mono">
                        {token.scopes.join(" · ") || "no scopes"}
                      </span>
                    </span>
                    <span className="w-44 shrink-0 row-meta font-mono truncate hidden md:block">
                      {maskToken(token.token)}
                    </span>
                    <span className="w-24 shrink-0 row-meta hidden md:block">
                      {new Date(token.createdAt).toLocaleDateString()}
                    </span>
                    <span className="w-16 shrink-0 hidden md:block">
                      <span className={`chip ${token.revoked ? "chip-neutral" : "bg-emerald-500/12 text-emerald-700 dark:text-emerald-400"}`}>
                        {token.revoked ? "Revoked" : "Active"}
                      </span>
                    </span>
                    <span className="w-16 shrink-0 flex justify-end gap-0.5">
                      {!token.revoked && (
                        <button
                          type="button"
                          className="btn btn-ghost btn-icon btn-sm"
                          title={`Revoke ${token.label}`}
                          aria-label={`Revoke ${token.label}`}
                          onClick={() => revokeApiToken(token.id)}
                        >
                          <span className="material-symbols-outlined text-[16px]">block</span>
                        </button>
                      )}
                      <button
                        type="button"
                        className="btn btn-ghost btn-icon btn-sm hover:text-error"
                        title={`Delete ${token.label}`}
                        aria-label={`Delete ${token.label}`}
                        onClick={() => deleteApiToken(token.id)}
                      >
                        <span className="material-symbols-outlined text-[16px]">delete</span>
                      </button>
                    </span>
                  </div>
                ))}
              </>
            )}
          </section>

          {/* ---- Webhook ---- */}
          <section className="panel panel-pad">
            <h3 className="section-title mb-3 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-primary">webhook</span>
              Webhook
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
              <div>
                <label htmlFor="wh-url" className="label">Delivery URL</label>
                <input
                  id="wh-url"
                  className="input font-mono text-[12px]"
                  placeholder="https://your-host/hooks/writerdost"
                  value={platform.webhookUrl}
                  onChange={(event) => updatePlatformApi({ webhookUrl: event.target.value })}
                />
                <p className="hint">Called on publish, listing update and generation complete.</p>
              </div>
              <div>
                <label htmlFor="wh-secret" className="label">Signing secret</label>
                <input
                  id="wh-secret"
                  className="input font-mono text-[12px]"
                  placeholder="whsec_…"
                  type="password"
                  autoComplete="off"
                  value={platform.webhookSecret}
                  onChange={(event) => updatePlatformApi({ webhookSecret: event.target.value })}
                />
                <p className="hint">Signs each payload so your endpoint can verify it.</p>
              </div>
            </div>
          </section>

          {/* ---- Endpoint reference ---- */}
          <section className="panel overflow-hidden">
            <div className="panel-head">
              <span className="panel-title">Endpoints</span>
              <span className="row-meta">{API_ENDPOINTS.length} routes</span>
            </div>
            {API_ENDPOINTS.map((endpoint) => (
              <div key={`${endpoint.method}-${endpoint.path}`} className="row px-3 gap-3">
                <span className="w-16 shrink-0 font-mono text-[11px] font-semibold text-primary">
                  {endpoint.method}
                </span>
                <span className="flex-1 min-w-0">
                  <span className="block font-mono text-[12px] text-on-surface truncate">{endpoint.path}</span>
                  <span className="block row-meta truncate mt-0.5">{endpoint.summary}</span>
                </span>
                <span className="hidden sm:block w-32 shrink-0 row-meta font-mono truncate text-right">
                  {endpoint.scope}
                </span>
              </div>
            ))}
            <p className="panel-pad border-t border-[var(--hairline)] hint !mt-0">
              Send the token as <code className="font-mono">Authorization: Bearer &lt;token&gt;</code>. These
              routes are the contract we are building against — projects currently live in this browser, so a
              real deployment needs the WriterDost backend behind them.
            </p>
          </section>
        </div>

        {/* ---- Rail ---- */}
        <aside className="min-w-0 space-y-3 lg:sticky lg:top-[calc(var(--app-header-h)+1rem)]">
          <div className="panel panel-pad space-y-3">
            <h3 className="section-title">Publishing</h3>
            <dl className="space-y-0.5">
              <div className="kv">
                <dt>Status</dt>
                <dd className={ready ? "text-emerald-600 dark:text-emerald-400" : undefined}>
                  {ready ? "Ready" : "Not ready"}
                </dd>
              </div>
              <div className="kv">
                <dt>Listings live</dt>
                <dd>{publishedCount}</dd>
              </div>
              <div className="kv">
                <dt>Projects</dt>
                <dd>{projects.length}</dd>
              </div>
            </dl>
            {!ready && (
              <p className="text-[12px] text-on-surface-variant">
                Add a marketplace key and seller ID, then test the connection. The editor&rsquo;s Publish button
                turns on once that check passes.
              </p>
            )}
            <Link href="/projects" className="btn btn-secondary btn-sm w-full">
              <span className="material-symbols-outlined text-[15px]">menu_book</span>
              Review projects
            </Link>
          </div>

          <div className="panel panel-pad">
            <p className="rail-title">Where publishing happens</p>
            <ul className="space-y-1.5 text-[12px] text-on-surface-variant">
              <li>· Editor sidebar, once a project is Ready</li>
              <li>· Projects list, per row</li>
              <li>· POST /api/v1/projects/{"{id}"}/publish</li>
            </ul>
          </div>
        </aside>
      </div>
    </div>
  );
}
