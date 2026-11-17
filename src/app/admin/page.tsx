"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { useAppStore } from "@/lib/app-store";
import { AdminUsersTab } from "./AdminUsersTab";
import { AdminRequestsTab } from "./AdminRequestsTab";
import { AdminCouponsTab } from "./AdminCouponsTab";
import { AdminSubscriptionsTab } from "./AdminSubscriptionsTab";
import { AdminCampaignTab } from "./AdminCampaignTab";
import { AdminGatewayTab } from "./AdminGatewayTab";

const ADMIN_TABS = [
  {
    id: "users",
    label: "Users",
    icon: "group",
    sub: "Manage workspace author accounts, roles, access permissions, and feature module allowances.",
  },
  {
    id: "requests",
    label: "Access requests",
    icon: "upgrade",
    sub: "Review and resolve requests from authors seeking access to locked writing and generation modules.",
  },
  {
    id: "coupons",
    label: "Discount coupons",
    icon: "confirmation_number",
    sub: "Create promotional codes, configure percentage and flat discounts, set usage limits, and track redemptions.",
  },
  {
    id: "subscriptions",
    label: "Subscriptions & revenue",
    icon: "credit_card",
    sub: "Monitor processed subscription checkout orders, plan tiers, recurring billing, and community referral attributions.",
  },
  {
    id: "campaign",
    label: "Founder campaign",
    icon: "local_fire_department",
    sub: "Configure rolling scarcity windows, duration in days, pricing, and available seats for 5-Year Founder passes.",
  },
  {
    id: "gateway",
    label: "BizAI gateway & failover",
    icon: "shield_lock",
    sub: "Orchestrate real-time multi-model fallback chains, manage encrypted API keys, and prevent 429 rate limit outages.",
  },
] as const;

type AdminTabId = (typeof ADMIN_TABS)[number]["id"];

const isAdminTabId = (value: string | null): value is AdminTabId =>
  ADMIN_TABS.some((tab) => tab.id === value);

function AdminDashboardContent() {
  const searchParams = useSearchParams();
  const requested = searchParams.get("tab");

  const [activeTab, setActiveTab] = useState<AdminTabId>(
    isAdminTabId(requested) ? requested : "users"
  );
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const loadUsers = useAppStore((state) => state.loadUsers);
  const loadUpgradeRequests = useAppStore((state) => state.loadUpgradeRequests);
  const loadCoupons = useAppStore((state) => state.loadCoupons);
  const loadSubscriptions = useAppStore((state) => state.loadSubscriptions);
  const loadReferrals = useAppStore((state) => state.loadReferrals);

  const users = useAppStore((state) => state.users);
  const upgradeRequests = useAppStore((state) => state.upgradeRequests);
  const coupons = useAppStore((state) => state.coupons);
  const subscriptions = useAppStore((state) => state.subscriptions);

  const refreshAllData = async () => {
    setIsRefreshing(true);
    setGlobalError(null);
    try {
      await Promise.allSettled([
        loadUsers(),
        loadUpgradeRequests(),
        loadCoupons(),
        loadSubscriptions(true),
        loadReferrals(true),
      ]);
    } catch {
      setGlobalError("Failed to refresh some admin resources.");
    } finally {
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    void loadUsers();
    void loadUpgradeRequests();
    void loadCoupons();
    void loadSubscriptions(true);
    void loadReferrals(true);
  }, [loadUsers, loadUpgradeRequests, loadCoupons, loadSubscriptions, loadReferrals]);

  const selectTab = (tabId: AdminTabId) => {
    setActiveTab(tabId);
    const url = new URL(window.location.href);
    url.searchParams.set("tab", tabId);
    window.history.replaceState(null, "", url);
  };

  const activeTabMeta = ADMIN_TABS.find((t) => t.id === activeTab) || ADMIN_TABS[0];
  const pendingRequestsCount = upgradeRequests.filter((r) => r.status === "pending").length;

  return (
    <main className="page">
      {/* Page Header */}
      <div className="page-head">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <span className="material-symbols-outlined text-primary text-2xl">admin_panel_settings</span>
            Control Panel
          </h1>
          <p className="page-sub">{activeTabMeta.sub}</p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={refreshAllData}
            disabled={isRefreshing}
            className="btn btn-secondary btn-sm flex items-center gap-1.5"
            title="Sync all live data from server"
          >
            <span className={`material-symbols-outlined text-sm ${isRefreshing ? "animate-spin" : ""}`}>
              sync
            </span>
            {isRefreshing ? "Syncing..." : "Sync Data"}
          </button>
        </div>
      </div>

      {/* Global Action Error Banner */}
      {globalError && (
        <div className="mb-4 p-3 rounded-[var(--radius)] bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-base shrink-0">error</span>
            <span>{globalError}</span>
          </div>
          <button
            type="button"
            onClick={() => setGlobalError(null)}
            className="btn btn-ghost btn-sm !h-5 !px-1.5 text-xs underline"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Sub-Menus Tab Bar */}
      <div className="tabs" role="tablist" aria-label="Control panel navigation">
        {ADMIN_TABS.map((tab) => {
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={isActive}
              data-active={isActive}
              onClick={() => selectTab(tab.id)}
              className="tab"
            >
              <span className="material-symbols-outlined text-base">{tab.icon}</span>
              <span>{tab.label}</span>

              {/* Badges */}
              {tab.id === "users" && (
                <span className="chip chip-neutral text-[10px] tabular-nums">
                  {users.length}
                </span>
              )}
              {tab.id === "requests" && pendingRequestsCount > 0 && (
                <span className="chip bg-amber-500 text-amber-950 font-bold text-[10px] tabular-nums">
                  {pendingRequestsCount}
                </span>
              )}
              {tab.id === "coupons" && (
                <span className="chip chip-neutral text-[10px] tabular-nums">
                  {coupons.length}
                </span>
              )}
              {tab.id === "subscriptions" && (
                <span className="chip chip-neutral text-[10px] tabular-nums">
                  {subscriptions.length}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Active Tab View */}
      {activeTab === "users" && <AdminUsersTab onNotifyError={setGlobalError} />}
      {activeTab === "requests" && <AdminRequestsTab onNotifyError={setGlobalError} />}
      {activeTab === "coupons" && <AdminCouponsTab onNotifyError={setGlobalError} />}
      {activeTab === "subscriptions" && <AdminSubscriptionsTab onNotifyError={setGlobalError} />}
      {activeTab === "campaign" && <AdminCampaignTab onNotifyError={setGlobalError} />}
      {activeTab === "gateway" && <AdminGatewayTab onNotifyError={setGlobalError} />}
    </main>
  );
}

export default function AdminDashboard() {
  return (
    <Suspense
      fallback={
        <div className="page">
          <div className="page-head animate-pulse">
            <div className="h-6 w-48 bg-[var(--color-surface-container-high)] rounded" />
          </div>
          <div className="metrics animate-pulse">
            <div className="metric h-24 bg-[var(--color-surface-container)]" />
            <div className="metric h-24 bg-[var(--color-surface-container)]" />
            <div className="metric h-24 bg-[var(--color-surface-container)]" />
            <div className="metric h-24 bg-[var(--color-surface-container)]" />
          </div>
        </div>
      }
    >
      <AdminDashboardContent />
    </Suspense>
  );
}
