"use client";

import { useState, useEffect } from "react";
import { type FounderCampaignConfig, DEFAULT_FOUNDER_CAMPAIGN } from "@/lib/store-types";

interface AdminCampaignTabProps {
  onNotifyError?: (msg: string) => void;
}

export function AdminCampaignTab({ onNotifyError }: AdminCampaignTabProps) {
  const [campaignConfig, setCampaignConfig] = useState<FounderCampaignConfig>(DEFAULT_FOUNDER_CAMPAIGN);
  const [campaignSaving, setCampaignSaving] = useState(false);
  const [campaignMsg, setCampaignMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/founder-campaign")
      .then((r) => r.json())
      .then((d) => {
        if (d?.config) setCampaignConfig(d.config);
      })
      .catch((err) => {
        onNotifyError?.(err instanceof Error ? err.message : "Failed to load campaign");
      });
  }, [onNotifyError]);

  const handleSaveCampaign = async (resetCycle = false) => {
    setCampaignSaving(true);
    setCampaignMsg(null);
    try {
      const res = await fetch("/api/founder-campaign", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ ...campaignConfig, resetCycle }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update campaign");
      setCampaignConfig(data.config);
      setCampaignMsg({
        type: "success",
        text: resetCycle
          ? "Campaign cycle restarted with a new start time!"
          : "Campaign settings saved successfully!",
      });
    } catch (err) {
      const errMsg = err instanceof Error ? err.message : "Save failed";
      setCampaignMsg({ type: "error", text: errMsg });
      onNotifyError?.(errMsg);
    } finally {
      setCampaignSaving(false);
    }
  };

  const basicRemaining = Math.max(0, campaignConfig.basicTotalSlots - campaignConfig.basicClaimedSlots);
  const proRemaining = Math.max(0, campaignConfig.proTotalSlots - campaignConfig.proClaimedSlots);
  const currentSales =
    campaignConfig.basicClaimedSlots * campaignConfig.basicPrice +
    campaignConfig.proClaimedSlots * campaignConfig.proPrice;

  return (
    <div className="space-y-6">
      {/* Campaign Top Metrics */}
      <section className="metrics !grid-cols-2 lg:!grid-cols-4" aria-label="Campaign performance metrics">
        <div className="metric">
          <p className="metric-label">Campaign Status</p>
          <p className="metric-value flex items-center gap-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                campaignConfig.isEnabled ? "bg-emerald-500 animate-pulse" : "bg-slate-400"
              }`}
            />
            {campaignConfig.isEnabled ? "Live" : "Paused"}
          </p>
          <p className="metric-note">
            {campaignConfig.autoRenew ? "rolling auto-renew" : "single cycle"}
          </p>
        </div>
        <div className="metric">
          <p className="metric-label">Cycle Duration</p>
          <p className="metric-value">{campaignConfig.durationDays} Days</p>
          <p className="metric-note">rolling scarcity window</p>
        </div>
        <div className="metric">
          <p className="metric-label">Current Revenue</p>
          <p className="metric-value text-emerald-600 dark:text-emerald-400">
            ${currentSales.toLocaleString()}
          </p>
          <p className="metric-note">from claimed founder passes</p>
        </div>
        <div className="metric">
          <p className="metric-label">Remaining Slots</p>
          <p className="metric-value text-primary">
            {basicRemaining + proRemaining} / {campaignConfig.basicTotalSlots + campaignConfig.proTotalSlots}
          </p>
          <p className="metric-note">total spots available</p>
        </div>
      </section>

      {/* Campaign Settings Panel */}
      <section className="panel p-5 max-w-4xl space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-[var(--hairline)]">
          <div>
            <h3 className="text-base font-bold text-[var(--color-on-surface)] flex items-center gap-2">
              <span className="material-symbols-outlined text-amber-500 text-xl">local_fire_department</span>
              Founder Pass & Scarcity Campaign Settings
            </h3>
            <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">
              Configure the rolling scarcity counter, duration in days, automatic renewal, and pass allocations.
            </p>
          </div>
          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={() => handleSaveCampaign(false)}
              disabled={campaignSaving}
              className="btn btn-primary btn-sm flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">save</span>
              {campaignSaving ? "Saving..." : "Save Settings"}
            </button>
            <button
              type="button"
              onClick={() => {
                if (confirm("Restart campaign countdown now? This resets the cycle timer to Day 0.")) {
                  handleSaveCampaign(true);
                }
              }}
              disabled={campaignSaving}
              className="btn btn-secondary btn-sm flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">restart_alt</span>
              Reset Countdown
            </button>
          </div>
        </div>

        {campaignMsg && (
          <div
            className={`p-3 rounded-[var(--radius)] text-xs font-semibold flex items-center gap-2 ${
              campaignMsg.type === "success"
                ? "bg-emerald-500/10 border border-emerald-500/25 text-emerald-600 dark:text-emerald-400"
                : "bg-rose-500/10 border border-rose-500/25 text-rose-500"
            }`}
          >
            <span className="material-symbols-outlined text-sm">
              {campaignMsg.type === "success" ? "check_circle" : "error"}
            </span>
            <span>{campaignMsg.text}</span>
          </div>
        )}

        {/* Master Toggles */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-[var(--color-surface-container-low)] flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-[var(--color-on-surface)] block">
                Campaign Active Status
              </span>
              <span className="text-[11px] text-[var(--color-on-surface-variant)] block mt-0.5">
                Display the 5-Year Founder pass banner on the landing and pricing pages.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={campaignConfig.isEnabled}
              onClick={() => setCampaignConfig({ ...campaignConfig, isEnabled: !campaignConfig.isEnabled })}
              className="switch shrink-0"
              data-on={campaignConfig.isEnabled}
            />
          </div>

          <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-[var(--color-surface-container-low)] flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-[var(--color-on-surface)] block">
                Auto-Renew Rolling Cycle
              </span>
              <span className="text-[11px] text-[var(--color-on-surface-variant)] block mt-0.5">
                Automatically restarts countdown when it reaches 0 until manually paused.
              </span>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={campaignConfig.autoRenew}
              onClick={() => setCampaignConfig({ ...campaignConfig, autoRenew: !campaignConfig.autoRenew })}
              className="switch shrink-0"
              data-on={campaignConfig.autoRenew}
            />
          </div>
        </div>

        {/* Duration in Days */}
        <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--hairline)] bg-[var(--color-surface-container-low)] space-y-3">
          <div>
            <span className="text-xs font-bold text-[var(--color-on-surface)] block">
              Cycle Scarcity Duration
            </span>
            <span className="text-[11px] text-[var(--color-on-surface-variant)] block mt-0.5">
              Choose how many days each rolling countdown cycle should display before renewing.
            </span>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {[7, 10, 14, 20, 30].map((days) => (
              <button
                key={days}
                type="button"
                onClick={() => setCampaignConfig({ ...campaignConfig, durationDays: days })}
                className={`btn btn-sm ${
                  campaignConfig.durationDays === days ? "btn-primary" : "btn-secondary"
                }`}
              >
                {days} Days
              </button>
            ))}
            <div className="flex items-center gap-2 ml-2">
              <span className="text-xs text-[var(--color-on-surface-variant)] font-semibold">Custom:</span>
              <input
                type="number"
                min="1"
                max="365"
                value={campaignConfig.durationDays}
                onChange={(e) =>
                  setCampaignConfig({
                    ...campaignConfig,
                    durationDays: Math.max(1, parseInt(e.target.value) || 1),
                  })
                }
                className="input !h-[var(--ctl-sm)] !py-0 !text-xs w-20 text-center"
              />
              <span className="text-xs text-[var(--color-on-surface-variant)]">days</span>
            </div>
          </div>
        </div>

        {/* Tiers, Slots & Prices */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Founder Basic */}
          <div className="p-4 rounded-[var(--radius-lg)] border border-amber-500/25 bg-amber-500/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[var(--color-on-surface)]">
                Founder Basic Pass (5 Years)
              </span>
              <span className="chip bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold">
                Indie Deal
              </span>
            </div>
            <div className="space-y-3">
              <div className="field !mb-2">
                <label className="label">Pass Price ($ USD)</label>
                <input
                  type="number"
                  value={campaignConfig.basicPrice}
                  onChange={(e) =>
                    setCampaignConfig({
                      ...campaignConfig,
                      basicPrice: Math.max(1, parseInt(e.target.value) || 1),
                    })
                  }
                  className="input !h-[var(--ctl-md)] text-xs font-semibold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="field !mb-0">
                  <label className="label">Total Slots</label>
                  <input
                    type="number"
                    value={campaignConfig.basicTotalSlots}
                    onChange={(e) =>
                      setCampaignConfig({
                        ...campaignConfig,
                        basicTotalSlots: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    className="input !h-[var(--ctl-md)] text-xs"
                  />
                </div>
                <div className="field !mb-0">
                  <label className="label">Claimed Slots</label>
                  <input
                    type="number"
                    value={campaignConfig.basicClaimedSlots}
                    onChange={(e) =>
                      setCampaignConfig({
                        ...campaignConfig,
                        basicClaimedSlots: Math.max(0, parseInt(e.target.value) || 0),
                      })
                    }
                    className="input !h-[var(--ctl-md)] text-xs"
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-amber-500/20 flex items-center justify-between text-xs">
                <span className="text-[var(--color-on-surface-variant)]">Remaining visible to buyers:</span>
                <span className="font-bold text-amber-600 dark:text-amber-400">{basicRemaining} spots</span>
              </div>
            </div>
          </div>

          {/* Founder Pro */}
          <div className="p-4 rounded-[var(--radius-lg)] border border-primary/25 bg-primary/5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-[var(--color-on-surface)]">
                Founder Pro Pass (5 Years)
              </span>
              <span className="chip bg-primary/20 text-primary font-bold">
                Pro Author Deal
              </span>
            </div>
            <div className="space-y-3">
              <div className="field !mb-2">
                <label className="label">Pass Price ($ USD)</label>
                <input
                  type="number"
                  value={campaignConfig.proPrice}
                  onChange={(e) =>
                    setCampaignConfig({
                      ...campaignConfig,
                      proPrice: Math.max(1, parseInt(e.target.value) || 1),
                    })
                  }
                  className="input !h-[var(--ctl-md)] text-xs font-semibold"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="field !mb-0">
                  <label className="label">Total Slots</label>
                  <input
                    type="number"
                    value={campaignConfig.proTotalSlots}
                    onChange={(e) =>
                      setCampaignConfig({
                        ...campaignConfig,
                        proTotalSlots: Math.max(1, parseInt(e.target.value) || 1),
                      })
                    }
                    className="input !h-[var(--ctl-md)] text-xs"
                  />
                </div>
                <div className="field !mb-0">
                  <label className="label">Claimed Slots</label>
                  <input
                    type="number"
                    value={campaignConfig.proClaimedSlots}
                    onChange={(e) =>
                      setCampaignConfig({
                        ...campaignConfig,
                        proClaimedSlots: Math.max(0, parseInt(e.target.value) || 0),
                      })
                    }
                    className="input !h-[var(--ctl-md)] text-xs"
                  />
                </div>
              </div>
              <div className="pt-2 border-t border-primary/20 flex items-center justify-between text-xs">
                <span className="text-[var(--color-on-surface-variant)]">Remaining visible to buyers:</span>
                <span className="font-bold text-primary">{proRemaining} spots</span>
              </div>
            </div>
          </div>
        </div>

        {/* Live Scarcity Preview */}
        <div className="space-y-2 pt-2">
          <span className="text-xs font-bold text-[var(--color-on-surface)] flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-base">visibility</span>
            Live Author Scarcity Banner Preview
          </span>
          <div className="p-4 rounded-[var(--radius-lg)] border border-[var(--hairline-strong)] bg-gradient-to-r from-amber-500/10 via-primary/5 to-purple-500/10">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="chip bg-amber-500/20 text-amber-700 dark:text-amber-400 font-bold text-[10px]">
                    FOUNDER SPECIAL
                  </span>
                  <span className="text-xs font-bold text-[var(--color-on-surface)]">
                    5-Year Access Pass (Save up to 80%)
                  </span>
                </div>
                <p className="text-[11px] text-[var(--color-on-surface-variant)]">
                  Only <strong className="text-[var(--color-on-surface)]">{proRemaining} Pro slots</strong> remaining in this {campaignConfig.durationDays}-day cycle.
                </p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-right">
                  <span className="text-sm font-bold text-[var(--color-on-surface)] block">${campaignConfig.proPrice}</span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block">5-Year License</span>
                </div>
                <button type="button" className="btn btn-primary btn-sm pointer-events-none opacity-90">
                  Claim Pass
                </button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
