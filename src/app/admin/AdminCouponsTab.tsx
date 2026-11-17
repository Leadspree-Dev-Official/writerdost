"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/app-store";
import type { Coupon, UserPlan } from "@/lib/store-types";

interface AdminCouponsTabProps {
  onNotifyError: (msg: string) => void;
}

export function AdminCouponsTab({ onNotifyError }: AdminCouponsTabProps) {
  const coupons = useAppStore((state) => state.coupons);
  const adminCreateCoupon = useAppStore((state) => state.adminCreateCoupon);
  const adminUpdateCoupon = useAppStore((state) => state.adminUpdateCoupon);
  const adminDeleteCoupon = useAppStore((state) => state.adminDeleteCoupon);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "expired">("all");

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState<Coupon | null>(null);

  // Form State
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState<number>(20);
  const [maxUses, setMaxUses] = useState<string>("");
  const [expiry, setExpiry] = useState<string>("");
  const [minPlan, setMinPlan] = useState<UserPlan | "">("");
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Copy feedback
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  // Confirm delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Current timestamp initialized on mount
  const [currentTime] = useState(() => (typeof window !== "undefined" ? Date.now() : 0));

  const handleCopyCode = async (couponCode: string) => {
    try {
      await navigator.clipboard.writeText(couponCode);
      setCopiedCode(couponCode);
      setTimeout(() => setCopiedCode(null), 2000);
    } catch {
      // ignore
    }
  };

  const isExpired = (c: Coupon) => {
    if (!c.validUntil || !currentTime) return false;
    return new Date(c.validUntil).getTime() < currentTime;
  };

  // Metrics calculations
  const totalCoupons = coupons.length;
  const activeCoupons = coupons.filter((c) => c.isActive && !isExpired(c)).length;
  const totalRedemptions = coupons.reduce((sum, c) => sum + (c.timesUsed || 0), 0);
  const highestDiscount = coupons.reduce((max, c) => {
    if (c.discountType === "percent" && c.discountValue > max) return c.discountValue;
    return max;
  }, 0);

  // Filtered list
  const filteredCoupons = coupons.filter((c) => {
    const matchesSearch =
      c.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (c.minPlan && c.minPlan.toLowerCase().includes(searchTerm.toLowerCase()));

    const expired = isExpired(c);
    let matchesStatus = true;
    if (statusFilter === "active") matchesStatus = c.isActive && !expired;
    else if (statusFilter === "inactive") matchesStatus = !c.isActive;
    else if (statusFilter === "expired") matchesStatus = expired;

    return matchesSearch && matchesStatus;
  });

  const openCreateModal = () => {
    setEditingCoupon(null);
    setCode("");
    setDiscountType("percent");
    setDiscountValue(20);
    setMaxUses("");
    setExpiry("");
    setMinPlan("");
    setIsActive(true);
    setFormError(null);
    setFormSuccess(null);
    setShowModal(true);
  };

  const openEditModal = (c: Coupon) => {
    setEditingCoupon(c);
    setCode(c.code);
    setDiscountType(c.discountType);
    setDiscountValue(c.discountValue);
    setMaxUses(c.maxUses != null ? String(c.maxUses) : "");
    setExpiry(c.validUntil ? c.validUntil.split("T")[0] : "");
    setMinPlan(c.minPlan || "");
    setIsActive(c.isActive);
    setFormError(null);
    setFormSuccess(null);
    setShowModal(true);
  };

  const applyPreset = (presetCode: string, type: "percent" | "fixed", value: number, plan: UserPlan | "" = "") => {
    setCode(presetCode);
    setDiscountType(type);
    setDiscountValue(value);
    setMinPlan(plan);
  };

  const handleSaveCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);
    setIsSubmitting(true);

    const cleanCode = code.trim().toUpperCase();
    if (!cleanCode) {
      setFormError("Coupon code is required.");
      setIsSubmitting(false);
      return;
    }

    if (discountValue <= 0) {
      setFormError("Discount value must be greater than zero.");
      setIsSubmitting(false);
      return;
    }

    try {
      if (editingCoupon) {
        // Update existing
        const res = await adminUpdateCoupon(editingCoupon.id, {
          code: cleanCode,
          discountType,
          discountValue: Number(discountValue),
          maxUses: maxUses ? parseInt(maxUses, 10) : null,
          validUntil: expiry ? new Date(expiry).toISOString() : null,
          minPlan: minPlan || undefined,
          isActive,
        });

        if (res.success) {
          setFormSuccess(`Coupon "${cleanCode}" updated successfully!`);
          setTimeout(() => {
            setShowModal(false);
            setFormSuccess(null);
          }, 1000);
        } else {
          setFormError(res.error || "Failed to update coupon.");
        }
      } else {
        // Create new
        const res = await adminCreateCoupon({
          code: cleanCode,
          discountType,
          discountValue: Number(discountValue),
          maxUses: maxUses ? parseInt(maxUses, 10) : null,
          validUntil: expiry ? new Date(expiry).toISOString() : null,
          minPlan: minPlan || undefined,
          isActive,
        });

        if (res.success) {
          setFormSuccess(`Coupon "${cleanCode}" created successfully!`);
          setTimeout(() => {
            setShowModal(false);
            setFormSuccess(null);
          }, 1000);
        } else {
          setFormError(res.error || "Failed to create coupon.");
        }
      }
    } catch (err) {
      setFormError(err instanceof Error ? err.message : "Operation failed.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleActive = async (c: Coupon) => {
    const res = await adminUpdateCoupon(c.id, { isActive: !c.isActive });
    if (!res.success) onNotifyError(res.error || "Failed to toggle coupon status.");
  };

  const handleDelete = async (id: string) => {
    const res = await adminDeleteCoupon(id);
    if (!res.success) onNotifyError(res.error || "Failed to delete coupon.");
    setConfirmDeleteId(null);
  };

  const formatDate = (isoString?: string | null) => {
    if (!isoString) return "Never expires";
    return new Date(isoString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Metrics Row */}
      <section className="metrics !grid-cols-2 lg:!grid-cols-4" aria-label="Coupon performance metrics">
        <div className="metric">
          <p className="metric-label">Active Coupons</p>
          <p className="metric-value text-emerald-600 dark:text-emerald-400">{activeCoupons}</p>
          <p className="metric-note">{totalCoupons} total created</p>
        </div>
        <div className="metric">
          <p className="metric-label">Total Redemptions</p>
          <p className="metric-value">{totalRedemptions}</p>
          <p className="metric-note">checkout orders</p>
        </div>
        <div className="metric">
          <p className="metric-label">Top Discount</p>
          <p className="metric-value text-primary">{highestDiscount > 0 ? `${highestDiscount}%` : "—"}</p>
          <p className="metric-note">active percent tier</p>
        </div>
        <div className="metric">
          <p className="metric-label">Promo Campaigns</p>
          <p className="metric-value">{coupons.filter((c) => c.minPlan).length}</p>
          <p className="metric-note">plan-targeted codes</p>
        </div>
      </section>

      {/* Main Table Panel */}
      <section className="panel overflow-hidden">
        {/* Table Head / Search & Filter Controls */}
        <div className="p-4 border-b border-[var(--hairline)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative w-full max-w-xs">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-base text-[var(--color-on-surface-variant)] pointer-events-none">
                search
              </span>
              <input
                type="text"
                placeholder="Search code or plan..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input !h-[var(--ctl-md)] !pl-8 !text-xs"
              />
            </div>

            <select
              aria-label="Filter coupons by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive" | "expired")}
              className="select !h-[var(--ctl-md)] !py-0 !text-xs w-auto min-w-[7.5rem]"
            >
              <option value="all">All statuses</option>
              <option value="active">Active only</option>
              <option value="inactive">Inactive</option>
              <option value="expired">Expired</option>
            </select>
          </div>

          <button
            type="button"
            onClick={openCreateModal}
            className="btn btn-primary btn-sm flex items-center gap-1.5 shrink-0"
          >
            <span className="material-symbols-outlined text-sm">add</span>
            Create Coupon
          </button>
        </div>

        {/* Coupons Table */}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Coupon Code</th>
                <th>Discount Benefit</th>
                <th>Redemptions</th>
                <th>Validity</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredCoupons.length > 0 ? (
                filteredCoupons.map((c) => {
                  const expired = isExpired(c);
                  const isCopied = copiedCode === c.code;

                  return (
                    <tr key={c.id}>
                      {/* Code + Copy */}
                      <td>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-xs px-2 py-0.5 rounded bg-[var(--color-surface-container)] border border-[var(--hairline-strong)] text-primary">
                            {c.code}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleCopyCode(c.code)}
                            title="Copy coupon code"
                            className="btn btn-ghost btn-icon !w-6 !h-6"
                          >
                            <span className="material-symbols-outlined text-xs">
                              {isCopied ? "check" : "content_copy"}
                            </span>
                          </button>
                          {isCopied && (
                            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                              Copied!
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Discount value & target plan */}
                      <td>
                        <div className="flex flex-col gap-0.5">
                          <span className="font-bold text-xs text-[var(--color-on-surface)]">
                            {c.discountType === "percent" ? `${c.discountValue}% OFF` : `$${c.discountValue} FLAT OFF`}
                          </span>
                          {c.minPlan ? (
                            <span className="chip chip-neutral text-[10px] w-fit">
                              Min plan: {c.minPlan}
                            </span>
                          ) : (
                            <span className="text-[11px] text-[var(--color-on-surface-variant)]">All plans</span>
                          )}
                        </div>
                      </td>

                      {/* Redemptions count & usage progress */}
                      <td>
                        <div className="flex flex-col gap-1 max-w-[120px]">
                          <span className="text-xs font-semibold tabular-nums text-[var(--color-on-surface)]">
                            {c.timesUsed}{" "}
                            <span className="text-[var(--color-on-surface-variant)] font-normal">
                              / {c.maxUses ? `${c.maxUses} uses` : "unlimited"}
                            </span>
                          </span>
                          {c.maxUses && c.maxUses > 0 && (
                            <div className="w-full bg-[var(--color-surface-container-high)] h-1 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full transition-all ${
                                  c.timesUsed >= c.maxUses
                                    ? "bg-rose-500"
                                    : "bg-primary"
                                }`}
                                style={{ width: `${Math.min(100, (c.timesUsed / c.maxUses) * 100)}%` }}
                              />
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Validity date */}
                      <td>
                        <div className="flex flex-col gap-0.5">
                          <span className={`text-xs ${expired ? "text-rose-500 font-semibold" : "text-[var(--color-on-surface)]"}`}>
                            {formatDate(c.validUntil)}
                          </span>
                          {expired && (
                            <span className="text-[10px] text-rose-500 font-semibold">
                              Expired
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status badge */}
                      <td>
                        {expired ? (
                          <span className="badge badge-error">Expired</span>
                        ) : c.isActive ? (
                          <span className="badge badge-success">Active</span>
                        ) : (
                          <span className="badge badge-neutral">Inactive</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="text-right">
                        {confirmDeleteId === c.id ? (
                          <div className="inline-flex items-center gap-1.5 p-1 rounded bg-rose-500/10 border border-rose-500/20">
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">Delete?</span>
                            <button
                              type="button"
                              onClick={() => handleDelete(c.id)}
                              className="btn btn-sm !h-5 !px-1.5 bg-rose-600 text-white font-bold text-[10px] rounded hover:bg-rose-700"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="btn btn-ghost btn-sm !h-5 !px-1.5 text-[10px]"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1">
                            {/* Toggle Active Switch/Button */}
                            <button
                              type="button"
                              onClick={() => handleToggleActive(c)}
                              title={c.isActive ? "Deactivate coupon" : "Activate coupon"}
                              className={`btn btn-ghost btn-icon btn-sm ${
                                c.isActive ? "text-emerald-600 dark:text-emerald-400" : "text-[var(--color-on-surface-variant)]"
                              }`}
                            >
                              <span className="material-symbols-outlined text-base">
                                {c.isActive ? "toggle_on" : "toggle_off"}
                              </span>
                            </button>

                            {/* Edit Coupon Button */}
                            <button
                              type="button"
                              onClick={() => openEditModal(c)}
                              title="Edit coupon settings"
                              className="btn btn-ghost btn-icon btn-sm hover:text-primary"
                            >
                              <span className="material-symbols-outlined text-sm">edit</span>
                            </button>

                            {/* Delete Coupon Button */}
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(c.id)}
                              title="Delete coupon"
                              className="btn btn-ghost btn-icon btn-sm hover:text-rose-500"
                            >
                              <span className="material-symbols-outlined text-sm">delete</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={6} className="py-10 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-[var(--color-on-surface-variant)]">
                      <span className="material-symbols-outlined text-3xl opacity-40">confirmation_number</span>
                      <p className="text-xs font-semibold">No coupons match your filter criteria.</p>
                      <button
                        type="button"
                        onClick={openCreateModal}
                        className="btn btn-secondary btn-sm mt-1"
                      >
                        Create new coupon
                      </button>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Create / Edit Coupon Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-lg panel bg-[var(--color-surface)] border border-[var(--hairline-strong)] shadow-2xl overflow-hidden rounded-[var(--radius-lg)]">
            {/* Modal Header */}
            <div className="panel-head">
              <span className="panel-title flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">confirmation_number</span>
                {editingCoupon ? "Edit Discount Coupon" : "Create New Discount Coupon"}
              </span>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn btn-ghost btn-icon btn-sm"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <form onSubmit={handleSaveCoupon} className="p-5 space-y-4">
              {formError && (
                <div className="p-3 rounded bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm shrink-0">error</span>
                  <span>{formError}</span>
                </div>
              )}
              {formSuccess && (
                <div className="p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
                  <span className="material-symbols-outlined text-sm shrink-0">check_circle</span>
                  <span>{formSuccess}</span>
                </div>
              )}

              {/* Quick Presets (Only when creating) */}
              {!editingCoupon && (
                <div>
                  <label className="label">Quick Preset Templates</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => applyPreset("LAUNCH20", "percent", 20)}
                      className="btn btn-secondary btn-sm !text-[11px]"
                    >
                      LAUNCH20 (20% OFF)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("PRO30", "percent", 30, "Pro")}
                      className="btn btn-secondary btn-sm !text-[11px]"
                    >
                      PRO30 (30% OFF Pro)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("FLASH50", "percent", 50)}
                      className="btn btn-secondary btn-sm !text-[11px]"
                    >
                      FLASH50 (50% OFF)
                    </button>
                    <button
                      type="button"
                      onClick={() => applyPreset("SAVE10", "fixed", 10)}
                      className="btn btn-secondary btn-sm !text-[11px]"
                    >
                      SAVE10 ($10 Flat)
                    </button>
                  </div>
                </div>
              )}

              {/* Code Field */}
              <div className="field">
                <label className="label">Coupon Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. AUTHOR50"
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase().replace(/\s+/g, ""))}
                  className="input font-mono font-bold tracking-wider"
                />
                <p className="hint">Must be uppercase alphanumeric. Customers enter this at checkout.</p>
              </div>

              {/* Discount Type & Value */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="field">
                  <label className="label">Discount Type</label>
                  <select
                    value={discountType}
                    onChange={(e) => setDiscountType(e.target.value as "percent" | "fixed")}
                    className="select"
                  >
                    <option value="percent">Percentage (% Discount)</option>
                    <option value="fixed">Fixed Amount ($ USD Flat)</option>
                  </select>
                </div>
                <div className="field">
                  <label className="label">
                    {discountType === "percent" ? "Percentage Off (%)" : "Amount Off ($ USD)"}
                  </label>
                  <input
                    type="number"
                    min="1"
                    max={discountType === "percent" ? 100 : 500}
                    required
                    value={discountValue}
                    onChange={(e) => setDiscountValue(Number(e.target.value))}
                    className="input"
                  />
                </div>
              </div>

              {/* Usage Limit & Minimum Plan */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="field">
                  <label className="label">Usage Limit (Optional)</label>
                  <input
                    type="number"
                    min="1"
                    placeholder="Unlimited"
                    value={maxUses}
                    onChange={(e) => setMaxUses(e.target.value)}
                    className="input"
                  />
                  <p className="hint">Leave empty for unlimited redemptions.</p>
                </div>
                <div className="field">
                  <label className="label">Required Plan Tier</label>
                  <select
                    value={minPlan}
                    onChange={(e) => setMinPlan(e.target.value as UserPlan | "")}
                    className="select"
                  >
                    <option value="">Any Plan (No requirement)</option>
                    <option value="Basic">Basic Plan or higher</option>
                    <option value="Pro">Pro Plan or higher</option>
                    <option value="Enterprise">Enterprise Plan only</option>
                  </select>
                  <p className="hint">Restricts coupon to designated tiers.</p>
                </div>
              </div>

              {/* Expiry Date */}
              <div className="field">
                <label className="label">Expiration Date (Optional)</label>
                <input
                  type="date"
                  value={expiry}
                  onChange={(e) => setExpiry(e.target.value)}
                  className="input"
                />
                <p className="hint">Coupon will automatically deactivate after midnight on this date.</p>
              </div>

              {/* Active Toggle */}
              <div className="p-3 rounded border border-[var(--hairline)] bg-[var(--color-surface-container-low)] flex items-center justify-between">
                <div>
                  <span className="text-xs font-semibold text-[var(--color-on-surface)] block">
                    Coupon Active Status
                  </span>
                  <span className="text-[11px] text-[var(--color-on-surface-variant)] block">
                    When enabled, authors can validate and apply this coupon at checkout.
                  </span>
                </div>
                <button
                  type="button"
                  role="switch"
                  aria-checked={isActive}
                  onClick={() => setIsActive(!isActive)}
                  className="switch shrink-0"
                  data-on={isActive}
                />
              </div>

              {/* Live Voucher Preview */}
              <div className="p-3.5 rounded border border-dashed border-primary/30 bg-primary/5 flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0">
                    <span className="material-symbols-outlined text-lg">local_offer</span>
                  </div>
                  <div>
                    <span className="font-mono font-bold text-xs text-primary block">
                      {code || "COUPONCODE"}
                    </span>
                    <span className="text-xs font-semibold text-[var(--color-on-surface)]">
                      {discountType === "percent" ? `${discountValue}% OFF` : `$${discountValue} OFF`}
                      {minPlan ? ` on ${minPlan} plan` : " on any plan"}
                    </span>
                  </div>
                </div>
                <span className="badge badge-accent text-[10px]">
                  {isActive ? "Valid" : "Disabled"}
                </span>
              </div>

              {/* Modal Actions */}
              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-[var(--hairline)]">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  disabled={isSubmitting}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="btn btn-primary btn-sm flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">
                    {isSubmitting ? "hourglass_empty" : "check"}
                  </span>
                  {isSubmitting ? "Saving..." : editingCoupon ? "Update Coupon" : "Create Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
