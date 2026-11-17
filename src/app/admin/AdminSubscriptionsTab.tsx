"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/app-store";
import type { SubscriptionOrder, ReferralRecord, UserPlan } from "@/lib/store-types";

interface AdminSubscriptionsTabProps {
  onNotifyError?: (msg: string) => void;
}

export function AdminSubscriptionsTab({ onNotifyError: _onNotifyError }: AdminSubscriptionsTabProps) {
  void _onNotifyError;
  const subscriptions = useAppStore((state) => state.subscriptions);
  const referrals = useAppStore((state) => state.referrals);

  // Section switcher
  const [activeSection, setActiveSection] = useState<"subscriptions" | "referrals">("subscriptions");

  // Search & Filter for Subscriptions
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [intervalFilter, setIntervalFilter] = useState<string>("all");

  // Copy feedback
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedId(text);
      setTimeout(() => setCopiedId(null), 2000);
    } catch {
      // ignore
    }
  };

  // KPI Calculations
  const totalRevenue = subscriptions.reduce((sum, s) => sum + (s.amountPaid || 0), 0);
  const activeSubs = subscriptions.filter((s) => s.status === "active").length;
  const yearlySubs = subscriptions.filter((s) => s.billingInterval === "yearly").length;
  const monthlySubs = subscriptions.filter((s) => s.billingInterval === "monthly").length;
  const avgOrderValue = subscriptions.length > 0 ? totalRevenue / subscriptions.length : 0;

  // Filtered Subscriptions
  const filteredSubscriptions = subscriptions.filter((s) => {
    const matchesSearch =
      s.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (s.userEmail && s.userEmail.toLowerCase().includes(searchTerm.toLowerCase())) ||
      (s.couponCode && s.couponCode.toLowerCase().includes(searchTerm.toLowerCase()));

    const matchesPlan = planFilter === "all" || s.plan === planFilter;
    const matchesStatus = statusFilter === "all" || s.status === statusFilter;
    const matchesInterval = intervalFilter === "all" || s.billingInterval === intervalFilter;

    return matchesSearch && matchesPlan && matchesStatus && matchesInterval;
  });

  const formatDate = (isoString?: string) => {
    if (!isoString) return "—";
    return new Date(isoString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getPlanBadgeClass = (plan: UserPlan) => {
    switch (plan) {
      case "Enterprise":
        return "badge-warning";
      case "Pro":
        return "badge-accent";
      case "Basic":
        return "bg-sky-500/12 text-sky-700 dark:text-sky-400 border border-sky-500/20";
      default:
        return "badge-neutral";
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Revenue & Performance Metrics */}
      <section className="metrics !grid-cols-2 lg:!grid-cols-4" aria-label="Subscription revenue metrics">
        <div className="metric">
          <p className="metric-label">Total Revenue Processed</p>
          <p className="metric-value text-emerald-600 dark:text-emerald-400">
            ${totalRevenue.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </p>
          <p className="metric-note">{subscriptions.length} orders total</p>
        </div>
        <div className="metric">
          <p className="metric-label">Active Subscriptions</p>
          <p className="metric-value">{activeSubs}</p>
          <p className="metric-note">recurrent accounts</p>
        </div>
        <div className="metric">
          <p className="metric-label">Billing Ratio</p>
          <p className="metric-value text-primary">
            {subscriptions.length > 0
              ? `${Math.round((yearlySubs / subscriptions.length) * 100)}% Annual`
              : "—"}
          </p>
          <p className="metric-note">
            {yearlySubs} annual · {monthlySubs} monthly
          </p>
        </div>
        <div className="metric">
          <p className="metric-label">Avg Order Value</p>
          <p className="metric-value">
            ${avgOrderValue.toFixed(2)}
          </p>
          <p className="metric-note">per checkout</p>
        </div>
      </section>

      {/* Sub-Section Switcher */}
      <div className="flex items-center gap-2 border-b border-[var(--hairline)] pb-3">
        <button
          type="button"
          onClick={() => setActiveSection("subscriptions")}
          className={`btn btn-sm ${
            activeSection === "subscriptions"
              ? "btn-primary"
              : "btn-secondary"
          } flex items-center gap-1.5`}
        >
          <span className="material-symbols-outlined text-sm">receipt_long</span>
          Subscription Orders ({subscriptions.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveSection("referrals")}
          className={`btn btn-sm ${
            activeSection === "referrals"
              ? "btn-primary"
              : "btn-secondary"
          } flex items-center gap-1.5`}
        >
          <span className="material-symbols-outlined text-sm">share_reviews</span>
          Referral Attributions ({referrals.length})
        </button>
      </div>

      {activeSection === "subscriptions" ? (
        /* Subscriptions Table Section */
        <section className="panel overflow-hidden">
          {/* Table Toolbar */}
          <div className="p-4 border-b border-[var(--hairline)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
            <div className="flex flex-1 flex-wrap items-center gap-2.5">
              {/* Search */}
              <div className="relative w-full max-w-xs">
                <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-base text-[var(--color-on-surface-variant)] pointer-events-none">
                  search
                </span>
                <input
                  type="text"
                  placeholder="Search user, order ID, coupon..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="input !h-[var(--ctl-md)] !pl-8 !text-xs"
                />
              </div>

              {/* Plan Filter */}
              <select
                aria-label="Filter by plan"
                value={planFilter}
                onChange={(e) => setPlanFilter(e.target.value)}
                className="select !h-[var(--ctl-md)] !py-0 !text-xs w-auto min-w-[6.5rem]"
              >
                <option value="all">All plans</option>
                <option value="Basic">Basic</option>
                <option value="Pro">Pro</option>
                <option value="Enterprise">Enterprise</option>
              </select>

              {/* Interval Filter */}
              <select
                aria-label="Filter by interval"
                value={intervalFilter}
                onChange={(e) => setIntervalFilter(e.target.value)}
                className="select !h-[var(--ctl-md)] !py-0 !text-xs w-auto min-w-[6.5rem]"
              >
                <option value="all">All intervals</option>
                <option value="monthly">Monthly</option>
                <option value="yearly">Yearly</option>
              </select>

              {/* Status Filter */}
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="select !h-[var(--ctl-md)] !py-0 !text-xs w-auto min-w-[6.5rem]"
              >
                <option value="all">All statuses</option>
                <option value="active">Active</option>
                <option value="cancelled">Cancelled</option>
                <option value="expired">Expired</option>
              </select>
            </div>
          </div>

          {/* Table */}
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Order Reference</th>
                  <th>Customer Profile</th>
                  <th>Tier & Interval</th>
                  <th>Amount Paid</th>
                  <th>Billing Dates</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {filteredSubscriptions.length > 0 ? (
                  filteredSubscriptions.map((s: SubscriptionOrder) => {
                    const isCopied = copiedId === s.id;
                    const shortId = s.id.length > 12 ? `${s.id.slice(0, 10)}...` : s.id;

                    return (
                      <tr key={s.id}>
                        {/* Order Reference */}
                        <td>
                          <div className="flex items-center gap-1.5">
                            <span
                              className="font-mono text-xs text-[var(--color-on-surface-variant)] cursor-pointer hover:text-primary transition-colors"
                              title={s.id}
                              onClick={() => handleCopy(s.id)}
                            >
                              {shortId}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(s.id)}
                              title="Copy full order reference"
                              className="btn btn-ghost btn-icon !w-5 !h-5"
                            >
                              <span className="material-symbols-outlined text-xs">
                                {isCopied ? "check" : "content_copy"}
                              </span>
                            </button>
                            {isCopied && (
                              <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                Copied
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Customer Email & Initial */}
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="w-7 h-7 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 uppercase">
                              {(s.userEmail || s.userId || "U").charAt(0)}
                            </div>
                            <div className="min-w-0">
                              <span className="font-semibold text-xs text-[var(--color-on-surface)] block truncate max-w-[180px]">
                                {s.userEmail || "Anonymous Author"}
                              </span>
                              <span className="font-mono text-[10px] text-[var(--color-on-surface-variant)] block truncate max-w-[180px]">
                                {s.userId}
                              </span>
                            </div>
                          </div>
                        </td>

                        {/* Plan & Interval */}
                        <td>
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className={`badge ${getPlanBadgeClass(s.plan)}`}>
                              {s.plan}
                            </span>
                            <span className="chip chip-neutral text-[10px] capitalize">
                              {s.billingInterval}
                            </span>
                          </div>
                        </td>

                        {/* Amount & Applied Promo */}
                        <td>
                          <div>
                            <span className="font-bold text-xs tabular-nums text-[var(--color-on-surface)]">
                              ${s.amountPaid.toFixed(2)}
                            </span>
                            {s.couponCode && (
                              <span className="chip bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/20 text-[10px] font-mono mt-0.5 block w-fit">
                                Promo: {s.couponCode}
                                {s.discountAmount ? ` (-$${s.discountAmount})` : ""}
                              </span>
                            )}
                            {s.referralCode && !s.couponCode && (
                              <span className="chip bg-indigo-500/10 text-indigo-700 dark:text-indigo-400 border border-indigo-500/20 text-[10px] font-mono mt-0.5 block w-fit">
                                Ref: {s.referralCode}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Dates */}
                        <td>
                          <div className="flex flex-col gap-0.5 text-xs">
                            <span className="text-[var(--color-on-surface)]">
                              Started: {formatDate(s.startDate || s.createdAt)}
                            </span>
                            <span className="text-[var(--color-on-surface-variant)] text-[11px]">
                              Renews: {formatDate(s.renewDate)}
                            </span>
                          </div>
                        </td>

                        {/* Status */}
                        <td>
                          <span
                            className={`badge ${
                              s.status === "active"
                                ? "badge-success"
                                : s.status === "cancelled"
                                ? "badge-neutral"
                                : "badge-error"
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-10 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-[var(--color-on-surface-variant)]">
                        <span className="material-symbols-outlined text-3xl opacity-40">receipt_long</span>
                        <p className="text-xs font-semibold">No subscription orders match your criteria.</p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        /* Referral Attributions Section */
        <section className="panel overflow-hidden">
          <div className="p-4 border-b border-[var(--hairline)]">
            <h3 className="text-sm font-semibold text-[var(--color-on-surface)] flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">share</span>
              Community Referral Program Attributions
            </h3>
            <p className="text-xs text-[var(--color-on-surface-variant)] mt-1">
              Tracks users referred by other community authors. Referees receive a 10% discount on their selected subscription plan.
            </p>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Referrer Code</th>
                  <th>Referee Author</th>
                  <th>Plan Chosen</th>
                  <th>Discount Given</th>
                  <th>Attribution Date</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {referrals.length > 0 ? (
                  referrals.map((r: ReferralRecord) => {
                    const isCopied = copiedId === r.referrerCode;

                    return (
                      <tr key={r.id}>
                        <td>
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-primary/10 text-primary border border-primary/20">
                              {r.referrerCode}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleCopy(r.referrerCode)}
                              title="Copy referral code"
                              className="btn btn-ghost btn-icon !w-5 !h-5"
                            >
                              <span className="material-symbols-outlined text-xs">
                                {isCopied ? "check" : "content_copy"}
                              </span>
                            </button>
                          </div>
                        </td>
                        <td>
                          <span className="text-xs font-semibold text-[var(--color-on-surface)]">
                            {r.refereeEmail || r.refereeUserId}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${getPlanBadgeClass(r.plan)}`}>
                            {r.plan}
                          </span>
                        </td>
                        <td>
                          <span className="font-semibold text-xs text-emerald-600 dark:text-emerald-400">
                            {typeof r.discountApplied === "number" && r.discountApplied > 1
                              ? `$${r.discountApplied.toFixed(2)} OFF`
                              : `${r.discountApplied}% OFF`}
                          </span>
                        </td>
                        <td>
                          <span className="text-xs text-[var(--color-on-surface-variant)]">
                            {formatDate(r.createdAt)}
                          </span>
                        </td>
                        <td>
                          <span className="badge badge-success text-[10px]">
                            {r.status || "completed"}
                          </span>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-10 text-center">
                      <div className="flex flex-col items-center justify-center gap-2 text-[var(--color-on-surface-variant)]">
                        <span className="material-symbols-outlined text-3xl opacity-40">share_reviews</span>
                        <p className="text-xs font-semibold">No referral attributions logged yet.</p>
                        <p className="text-[11px] text-[var(--color-on-surface-variant)] max-w-sm">
                          When authors share their referral link, new signups who subscribe will appear here automatically.
                        </p>
                      </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}
