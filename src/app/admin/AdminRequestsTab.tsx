"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/app-store";
import type { UpgradeRequest, UserFeatures } from "@/lib/store-types";

interface AdminRequestsTabProps {
  onNotifyError?: (msg: string) => void;
}

const FEATURE_NAMES: Record<string, string> = {
  createEbook: "Create Ebook Module",
  rewriteEbook: "Rewrite Passage Module",
  blogGenerator: "Blog Generator Module",
  advancedModels: "Advanced AI Settings",
};

export function AdminRequestsTab({ onNotifyError }: AdminRequestsTabProps) {
  const users = useAppStore((state) => state.users);
  const upgradeRequests = useAppStore((state) => state.upgradeRequests);
  const adminSetUserPlanAndFeatures = useAppStore((state) => state.adminSetUserPlanAndFeatures);
  const adminResolveUpgradeRequest = useAppStore((state) => state.adminResolveUpgradeRequest);

  const [filter, setFilter] = useState<"all" | "pending" | "resolved">("pending");

  const pendingCount = upgradeRequests.filter((r) => r.status === "pending").length;
  const resolvedCount = upgradeRequests.filter((r) => r.status === "resolved").length;

  const filtered = upgradeRequests.filter((r) => {
    if (filter === "pending") return r.status === "pending";
    if (filter === "resolved") return r.status === "resolved";
    return true;
  });

  const handleApproveRequest = async (req: UpgradeRequest) => {
    try {
      const user = users.find((u) => u.id === req.userId);
      if (user) {
        const nextFeatures: UserFeatures = {
          ...(user.allowedFeatures || {
            createEbook: true,
            rewriteEbook: false,
            blogGenerator: false,
            advancedModels: false,
          }),
          [req.feature]: true,
        };

        const isEnterprise =
          nextFeatures.createEbook &&
          nextFeatures.rewriteEbook &&
          nextFeatures.blogGenerator &&
          nextFeatures.advancedModels;
        const isPro =
          nextFeatures.createEbook &&
          nextFeatures.rewriteEbook &&
          nextFeatures.blogGenerator &&
          !nextFeatures.advancedModels;
        const planName = isEnterprise ? "Enterprise" : isPro ? "Pro" : "Custom";

        await adminSetUserPlanAndFeatures(user.id, planName, nextFeatures);
      }
      await adminResolveUpgradeRequest(req.id);
    } catch (err) {
      onNotifyError?.(err instanceof Error ? err.message : "Failed to approve request");
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Metric Cards */}
      <section className="metrics !grid-cols-2 lg:!grid-cols-3" aria-label="Feature request metrics">
        <div className="metric">
          <p className="metric-label">Pending Review</p>
          <p className="metric-value text-amber-600 dark:text-amber-400">{pendingCount}</p>
          <p className="metric-note">action required</p>
        </div>
        <div className="metric">
          <p className="metric-label">Resolved Requests</p>
          <p className="metric-value text-emerald-600 dark:text-emerald-400">{resolvedCount}</p>
          <p className="metric-note">granted or dismissed</p>
        </div>
        <div className="metric">
          <p className="metric-label">Total Submissions</p>
          <p className="metric-value">{upgradeRequests.length}</p>
          <p className="metric-note">all time author requests</p>
        </div>
      </section>

      {/* Main Table Panel */}
      <section className="panel overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-[var(--hairline)] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h3 className="text-sm font-semibold text-[var(--color-on-surface)] flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">upgrade</span>
              Feature Module Access Requests
            </h3>
            <p className="text-xs text-[var(--color-on-surface-variant)] mt-0.5">
              Review and grant author requests for locked modules and experimental capabilities.
            </p>
          </div>

          <div className="flex items-center gap-1 bg-[var(--color-surface-container)] p-0.5 rounded-[var(--radius)]">
            <button
              type="button"
              onClick={() => setFilter("pending")}
              className={`btn btn-sm !h-7 !text-xs ${
                filter === "pending" ? "btn-primary" : "btn-ghost"
              }`}
            >
              Pending ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter("resolved")}
              className={`btn btn-sm !h-7 !text-xs ${
                filter === "resolved" ? "btn-primary" : "btn-ghost"
              }`}
            >
              Resolved ({resolvedCount})
            </button>
            <button
              type="button"
              onClick={() => setFilter("all")}
              className={`btn btn-sm !h-7 !text-xs ${
                filter === "all" ? "btn-primary" : "btn-ghost"
              }`}
            >
              All ({upgradeRequests.length})
            </button>
          </div>
        </div>

        {/* Table */}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Author Account</th>
                <th>Requested Module</th>
                <th>Submission Date</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length > 0 ? (
                filtered.map((req) => (
                  <tr key={req.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 uppercase border border-primary/20">
                          {req.userName.charAt(0) || "U"}
                        </div>
                        <div>
                          <span className="font-semibold text-xs text-[var(--color-on-surface)] block">
                            {req.userName}
                          </span>
                          <span className="text-[11px] text-[var(--color-on-surface-variant)] block">
                            {req.userEmail}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td>
                      <span className="chip bg-primary/10 text-primary border border-primary/20 font-bold text-xs">
                        {FEATURE_NAMES[req.feature] || req.feature}
                      </span>
                    </td>

                    <td className="text-xs text-[var(--color-on-surface-variant)] tabular-nums">
                      {formatDate(req.timestamp)}
                    </td>

                    <td>
                      <span
                        className={`badge ${
                          req.status === "pending"
                            ? "badge-warning"
                            : "badge-neutral"
                        }`}
                      >
                        {req.status}
                      </span>
                    </td>

                    <td className="text-right">
                      {req.status === "pending" ? (
                        <div className="inline-flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleApproveRequest(req)}
                            className="btn btn-primary btn-sm flex items-center gap-1"
                          >
                            <span className="material-symbols-outlined text-xs">check</span>
                            Grant Access
                          </button>
                          <button
                            type="button"
                            onClick={() => adminResolveUpgradeRequest(req.id)}
                            className="btn btn-secondary btn-sm"
                          >
                            Dismiss
                          </button>
                        </div>
                      ) : (
                        <span className="text-xs text-[var(--color-on-surface-variant)] italic">
                          Resolved
                        </span>
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={5} className="py-10 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-[var(--color-on-surface-variant)]">
                      <span className="material-symbols-outlined text-3xl opacity-40">task_alt</span>
                      <p className="text-xs font-semibold">
                        {filter === "pending"
                          ? "No pending upgrade requests! All author requests have been resolved."
                          : "No upgrade requests found."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
