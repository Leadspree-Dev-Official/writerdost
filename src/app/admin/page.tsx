"use client";

import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/app-store";
import {
  User,
  UserPlan,
  UserFeatures,
  UpgradeRequest,
  Coupon,
  FounderCampaignConfig,
  DEFAULT_FOUNDER_CAMPAIGN,
} from "@/lib/store-types";

export default function AdminDashboard() {
  const users = useAppStore((state) => state.users);
  const currentUser = useAppStore((state) => state.currentUser);
  const adminUpdateUser = useAppStore((state) => state.adminUpdateUser);
  const adminDeleteUser = useAppStore((state) => state.adminDeleteUser);
  const adminAddUser = useAppStore((state) => state.adminAddUser);
  const upgradeRequests = useAppStore((state) => state.upgradeRequests);
  const adminSetUserPlanAndFeatures = useAppStore((state) => state.adminSetUserPlanAndFeatures);
  const adminResolveUpgradeRequest = useAppStore((state) => state.adminResolveUpgradeRequest);
  const loadUsers = useAppStore((state) => state.loadUsers);
  const loadUpgradeRequests = useAppStore((state) => state.loadUpgradeRequests);

  // Coupons, subscriptions & referrals
  const coupons = useAppStore((state) => state.coupons);
  const subscriptions = useAppStore((state) => state.subscriptions);
  const referrals = useAppStore((state) => state.referrals);
  const loadCoupons = useAppStore((state) => state.loadCoupons);
  const loadSubscriptions = useAppStore((state) => state.loadSubscriptions);
  const loadReferrals = useAppStore((state) => state.loadReferrals);
  const adminCreateCoupon = useAppStore((state) => state.adminCreateCoupon);
  const adminUpdateCoupon = useAppStore((state) => state.adminUpdateCoupon);
  const adminDeleteCoupon = useAppStore((state) => state.adminDeleteCoupon);

  // Accounts, requests, coupons & subscriptions come from Appwrite / API
  useEffect(() => {
    void loadUsers();
    void loadUpgradeRequests();
    void loadCoupons();
    void loadSubscriptions(true);
    void loadReferrals(true);
  }, [loadUsers, loadUpgradeRequests, loadCoupons, loadSubscriptions, loadReferrals]);

  // Tab State
  const [activeTab, setActiveTab] = useState<"users" | "requests" | "coupons" | "referrals" | "campaign">("users");

  // Founder Campaign Admin State
  const [campaignConfig, setCampaignConfig] = useState<FounderCampaignConfig>(DEFAULT_FOUNDER_CAMPAIGN);
  const [campaignSaving, setCampaignSaving] = useState(false);
  const [campaignMsg, setCampaignMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetch("/api/founder-campaign")
      .then((r) => r.json())
      .then((d) => {
        if (d?.config) setCampaignConfig(d.config);
      })
      .catch(() => {});
  }, []);

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
        text: resetCycle ? "Campaign cycle restarted with a new start time!" : "Campaign settings saved successfully!",
      });
    } catch (err) {
      setCampaignMsg({ type: "error", text: err instanceof Error ? err.message : "Save failed" });
    } finally {
      setCampaignSaving(false);
    }
  };

  // Search and Filter State
  const [searchTerm, setSearchTerm] = useState("");
  const [roleFilter, setRoleFilter] = useState<"all" | "user" | "admin">("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "suspended">("all");

  // Plan & Feature Edit States
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<UserPlan>("Basic");
  const [selectedFeatures, setSelectedFeatures] = useState<UserFeatures>({
    createEbook: true,
    rewriteEbook: false,
    blogGenerator: false,
    advancedModels: false
  });

  // New User Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin">("user");
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);

  // Confirm delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Server-side failures from the row actions (suspend, promote, delete).
  const [actionError, setActionError] = useState<string | null>(null);

  // Coupon Creation State
  const [showAddCouponModal, setShowAddCouponModal] = useState(false);
  const [newCouponCode, setNewCouponCode] = useState("");
  const [newCouponType, setNewCouponType] = useState<"percent" | "fixed">("percent");
  const [newCouponValue, setNewCouponValue] = useState<number>(20);
  const [newCouponMaxUses, setNewCouponMaxUses] = useState<string>("");
  const [newCouponExpiry, setNewCouponExpiry] = useState<string>("");
  const [newCouponMinPlan, setNewCouponMinPlan] = useState<UserPlan | "">("");
  const [couponFormError, setCouponFormError] = useState<string | null>(null);
  const [couponFormSuccess, setCouponFormSuccess] = useState<string | null>(null);

  // Calculate Metrics
  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.status === "active").length;
  const adminUsers = users.filter((u) => u.role === "admin").length;
  const suspendedUsers = users.filter((u) => u.status === "suspended").length;

  // Filtered Users
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRole = roleFilter === "all" || user.role === roleFilter;
    const matchesStatus = statusFilter === "all" || user.status === statusFilter;
    return matchesSearch && matchesRole && matchesStatus;
  });

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!newFullName || !newEmail || !newPassword) {
      setFormError("Please fill in all fields.");
      return;
    }

    const res = await adminAddUser({
      fullName: newFullName,
      email: newEmail,
      role: newRole,
      status: "active",
      password: newPassword,
      plan: "Basic",
      allowedFeatures: {
        createEbook: true,
        rewriteEbook: false,
        blogGenerator: false,
        advancedModels: false
      }
    });

    if (res.success) {
      setFormSuccess(`Successfully registered ${newFullName}!`);
      setNewFullName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("user");
      // Keep alert for a moment then dismiss form
      setTimeout(() => {
        setShowAddForm(false);
        setFormSuccess(null);
      }, 1500);
    } else {
      setFormError(res.error || "Failed to create user.");
    }
  };

  const handleToggleStatus = async (user: User) => {
    const newStatus = user.status === "active" ? "suspended" : "active";
    const res = await adminUpdateUser(user.id, { status: newStatus });
    if (!res.success) setActionError(res.error || "Could not update the account.");
  };

  const handleToggleRole = async (user: User) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    // Prevent locking yourself out as admin
    if (currentUser?.id === user.id) {
      alert("You cannot change your own admin role.");
      return;
    }
    const res = await adminUpdateUser(user.id, { role: newRole });
    if (!res.success) setActionError(res.error || "Could not update the account.");
  };

  const handleDeleteClick = (userId: string) => {
    if (currentUser?.id === userId) {
      alert("You cannot delete your own admin account.");
      return;
    }
    setConfirmDeleteId(userId);
  };

  const confirmDelete = async (userId: string) => {
    const res = await adminDeleteUser(userId);
    if (!res.success) setActionError(res.error || "Could not delete the account.");
    setConfirmDeleteId(null);
  };

  const handlePlanChange = (plan: UserPlan) => {
    setSelectedPlan(plan);
    if (plan === "Free") {
      setSelectedFeatures({ createEbook: true, rewriteEbook: false, blogGenerator: true, advancedModels: false });
    } else if (plan === "Basic") {
      setSelectedFeatures({ createEbook: true, rewriteEbook: false, blogGenerator: false, advancedModels: false });
    } else if (plan === "Pro") {
      setSelectedFeatures({ createEbook: true, rewriteEbook: true, blogGenerator: true, advancedModels: false });
    } else if (plan === "Enterprise") {
      setSelectedFeatures({ createEbook: true, rewriteEbook: true, blogGenerator: true, advancedModels: true });
    }
  };

  const handleFeatureToggle = (key: keyof UserFeatures) => {
    const nextFeatures = { ...selectedFeatures, [key]: !selectedFeatures[key] };
    setSelectedFeatures(nextFeatures);
    
    const isBasic = nextFeatures.createEbook && !nextFeatures.rewriteEbook && !nextFeatures.blogGenerator && !nextFeatures.advancedModels;
    const isPro = nextFeatures.createEbook && nextFeatures.rewriteEbook && nextFeatures.blogGenerator && !nextFeatures.advancedModels;
    const isEnterprise = nextFeatures.createEbook && nextFeatures.rewriteEbook && nextFeatures.blogGenerator && nextFeatures.advancedModels;

    if (isBasic) setSelectedPlan("Basic");
    else if (isPro) setSelectedPlan("Pro");
    else if (isEnterprise) setSelectedPlan("Enterprise");
    else setSelectedPlan("Custom");
  };

  const handleOpenEditAccess = (user: User) => {
    setEditingUser(user);
    setSelectedPlan(user.plan || "Basic");
    setSelectedFeatures(user.allowedFeatures || {
      createEbook: true,
      rewriteEbook: false,
      blogGenerator: false,
      advancedModels: false
    });
  };

  const handleSaveAccess = async () => {
    if (!editingUser) return;
    const res = await adminSetUserPlanAndFeatures(editingUser.id, selectedPlan, selectedFeatures);
    if (!res.success) setActionError(res.error || "Could not save the plan.");
    setEditingUser(null);
  };

  const handleApproveRequest = async (req: UpgradeRequest) => {
    const user = users.find((u) => u.id === req.userId);
    if (user) {
      const nextFeatures = {
        ...(user.allowedFeatures || { createEbook: true, rewriteEbook: false, blogGenerator: false, advancedModels: false }),
        [req.feature]: true
      };
      
      const isEnterprise = nextFeatures.createEbook && nextFeatures.rewriteEbook && nextFeatures.blogGenerator && nextFeatures.advancedModels;
      const isPro = nextFeatures.createEbook && nextFeatures.rewriteEbook && nextFeatures.blogGenerator && !nextFeatures.advancedModels;
      const planName = isEnterprise ? "Enterprise" : (isPro ? "Pro" : "Custom");

      await adminSetUserPlanAndFeatures(user.id, planName, nextFeatures);
    }
    await adminResolveUpgradeRequest(req.id);
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const handleCreateCoupon = async (e: React.FormEvent) => {
    e.preventDefault();
    setCouponFormError(null);
    setCouponFormSuccess(null);

    if (!newCouponCode.trim()) {
      setCouponFormError("Coupon code is required.");
      return;
    }

    const res = await adminCreateCoupon({
      code: newCouponCode.trim().toUpperCase(),
      discountType: newCouponType,
      discountValue: Number(newCouponValue),
      maxUses: newCouponMaxUses ? parseInt(newCouponMaxUses, 10) : null,
      validUntil: newCouponExpiry ? new Date(newCouponExpiry).toISOString() : null,
      minPlan: newCouponMinPlan || undefined,
      isActive: true,
    });

    if (res.success) {
      setCouponFormSuccess("Coupon created successfully!");
      setNewCouponCode("");
      setNewCouponValue(20);
      setNewCouponMaxUses("");
      setNewCouponExpiry("");
      setNewCouponMinPlan("");
      setTimeout(() => {
        setShowAddCouponModal(false);
        setCouponFormSuccess(null);
      }, 1200);
    } else {
      setCouponFormError(res.error || "Failed to create coupon.");
    }
  };

  const handleToggleCouponActive = async (c: Coupon) => {
    const res = await adminUpdateCoupon(c.id, { isActive: !c.isActive });
    if (!res.success) setActionError(res.error || "Failed to toggle coupon status.");
  };

  const handleDeleteCoupon = async (id: string) => {
    if (!confirm("Are you sure you want to delete this coupon?")) return;
    const res = await adminDeleteCoupon(id);
    if (!res.success) setActionError(res.error || "Failed to delete coupon.");
  };

  return (
    <main className="page">
      <div className="page-head">
        <div>
          <h1 className="page-title">Admin</h1>
          <p className="page-sub">Add, update and manage workspace accounts.</p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setFormError(null);
            setFormSuccess(null);
          }}
          className="btn btn-primary btn-lg self-start sm:self-auto"
        >
          <span className="material-symbols-outlined">person_add</span>
          {showAddForm ? "View users" : "New user"}
        </button>
      </div>

      {actionError && (
        <div className="mb-4 p-4 rounded-[var(--radius)] bg-red-950/50 border border-red-800/40 text-red-400 text-xs font-semibold flex items-start justify-between gap-3">
          <span className="flex items-start gap-2.5">
            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">error</span>
            <span>{actionError}</span>
          </span>
          <button type="button" onClick={() => setActionError(null)} className="shrink-0 underline">
            Dismiss
          </button>
        </div>
      )}

      {/* Metrics Row */}
      <section className="metrics !grid-cols-2 lg:!grid-cols-4 mb-4">
        <div className="metric">
          <p className="metric-label">Total Users</p>
          <p className="metric-value">{totalUsers}</p>
        </div>
        <div className="metric">
          <p className="metric-label text-emerald-500">Active Status</p>
          <p className="metric-value">{activeUsers}</p>
        </div>
        <div className="metric">
          <p className="metric-label text-indigo-500 dark:text-indigo-400">Super Admins</p>
          <p className="metric-value">{adminUsers}</p>
        </div>
        <div className="metric">
          <p className="metric-label text-rose-500">Suspended</p>
          <p className="metric-value">{suspendedUsers}</p>
        </div>
      </section>

      {/* Tabs Selector */}
      <div className="tabs" role="tablist" aria-label="Admin sections">
        <button
          onClick={() => { setActiveTab("users"); setShowAddForm(false); }}
          className="tab"
          data-active={activeTab === "users" && !showAddForm}
          role="tab"
          type="button"
        >
          Users ({totalUsers})
        </button>
        <button
          onClick={() => { setActiveTab("requests"); setShowAddForm(false); }}
          className="tab"
          data-active={activeTab === "requests"}
          role="tab"
          type="button"
        >
          Upgrade requests
          {upgradeRequests.filter(r => r.status === 'pending').length > 0 && (
            <span className="bg-amber-500 text-amber-950 font-semibold text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
              {upgradeRequests.filter(r => r.status === 'pending').length}
            </span>
          )}
        </button>
        <button
          onClick={() => { setActiveTab("coupons"); setShowAddForm(false); }}
          className="tab"
          data-active={activeTab === "coupons"}
          role="tab"
          type="button"
        >
          Coupons ({coupons.length})
        </button>
        <button
          onClick={() => { setActiveTab("referrals"); setShowAddForm(false); }}
          className="tab"
          data-active={activeTab === "referrals"}
          role="tab"
          type="button"
        >
          Subscriptions & Referrals ({subscriptions.length})
        </button>
        <button
          onClick={() => { setActiveTab("campaign"); setShowAddForm(false); }}
          className="tab"
          data-active={activeTab === "campaign"}
          role="tab"
          type="button"
        >
          Founder Campaign {campaignConfig.isEnabled ? "🟢" : "⚪"}
        </button>
      </div>

      {/* Conditional View: Add User Form, Requests Table, or Users Table */}
      {showAddForm ? (
        <section className="panel panel-pad max-w-xl">
          <h3 className="text-lg font-semibold text-on-surface mb-6">Create New User Account</h3>
          
          {formError && (
            <div className="mb-4 p-4 rounded-[var(--radius)] bg-red-950/20 border border-red-800/30 text-red-500 text-xs font-semibold">
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="mb-4 p-4 rounded-[var(--radius)] bg-emerald-950/20 border border-emerald-800/30 text-emerald-500 text-xs font-semibold">
              {formSuccess}
            </div>
          )}

          <form onSubmit={handleAddUser} className="space-y-2">
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">Full Name</label>
              <input
                type="text"
                placeholder="e.g. Jane Doe"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                className="w-full bg-surface border border-outline-variant/20 rounded-[var(--radius)] py-3 px-4 text-on-surface text-sm font-semibold outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">Email Address</label>
              <input
                type="email"
                placeholder="user@leadspree.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full bg-surface border border-outline-variant/20 rounded-[var(--radius)] py-3 px-4 text-on-surface text-sm font-semibold outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">Password</label>
              <input
                type="text"
                placeholder="Choose temporary password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-surface border border-outline-variant/20 rounded-[var(--radius)] py-3 px-4 text-on-surface text-sm font-semibold outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 mb-2">User Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as "user" | "admin")}
                className="w-full bg-surface border border-outline-variant/20 rounded-[var(--radius)] py-3 px-4 text-on-surface text-sm font-semibold outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              >
                <option value="user">Standard User (Author)</option>
                <option value="admin">Super Admin</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="bg-primary hover:bg-primary-container text-on-primary font-bold px-6 py-3 rounded-[var(--radius)] transition-all"
              >
                Save Account
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="border border-outline-variant/30 text-on-surface hover:bg-surface-container-high font-bold px-6 py-3 rounded-[var(--radius)] transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : activeTab === "requests" ? (
        /* Upgrade Requests Tracker Dashboard */
        <section className="panel overflow-hidden">
          <div className="p-4 border-b border-outline-variant/10">
            <h3 className="text-base font-semibold text-on-surface">Feature Access Requests</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Approve upgrade requests submitted by authors wishing to access locked modules.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--hairline)] text-on-surface-variant text-[11px] font-semibold bg-on-surface/[0.02]">
                  <th className="py-2 px-6">Author Profile</th>
                  <th className="py-2 px-6">Requested Module</th>
                  <th className="py-2 px-6">Request Date</th>
                  <th className="py-2 px-6">Status</th>
                  <th className="py-2 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {upgradeRequests.length > 0 ? (
                  upgradeRequests.map((req) => {
                    const featureNames: Record<string, string> = {
                      createEbook: "Create Ebook",
                      rewriteEbook: "Rewrite Passage",
                      blogGenerator: "Blog Generator",
                      advancedModels: "Advanced AI Settings"
                    };

                    return (
                      <tr key={req.id} className="hover:bg-surface-container-high/20 transition-colors text-xs font-semibold text-on-surface">
                        <td className="py-2 px-6">
                          <div>
                            <p className="font-bold text-sm text-on-surface">{req.userName}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-0.5">{req.userEmail}</p>
                          </div>
                        </td>
                        <td className="py-2 px-6">
                          <span className="font-bold text-white bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-[var(--radius)]">
                            {featureNames[req.feature] || req.feature}
                          </span>
                        </td>
                        <td className="py-2 px-6 text-slate-500 dark:text-slate-400">
                          {formatDate(req.timestamp)}
                        </td>
                        <td className="py-2 px-6">
                          <span className={`chip border ${
                            req.status === "pending"
                              ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="py-2 px-6 text-right">
                          {req.status === "pending" ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApproveRequest(req)}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-1.5 rounded-[var(--radius)] text-xs transition-colors flex items-center gap-1.5"
                              >
                                <span className="material-symbols-outlined text-[14px]">check</span>
                                Grant Access
                              </button>
                              <button
                                onClick={() => adminResolveUpgradeRequest(req.id)}
                                className="border border-outline-variant/20 hover:bg-white/[0.04] text-slate-400 hover:text-white font-bold px-3.5 py-1.5 rounded-[var(--radius)] text-xs transition-colors"
                              >
                                Dismiss
                              </button>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-500 italic">Resolved</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-slate-500 dark:text-slate-400 font-bold uppercase text-xs tracking-wider">
                      No upgrade requests found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : activeTab === "coupons" ? (
        /* Coupons Management Section */
        <section className="panel overflow-hidden">
          <div className="p-4 border-b border-outline-variant/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-semibold text-on-surface">Discount Coupons</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Create promotional discount codes for subscription checkouts.
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                setShowAddCouponModal(true);
                setCouponFormError(null);
                setCouponFormSuccess(null);
              }}
              className="btn btn-primary btn-sm flex items-center gap-1.5 shrink-0"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              Create Coupon
            </button>
          </div>

          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Coupon Code</th>
                  <th>Discount</th>
                  <th>Usage Count</th>
                  <th>Valid Until</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {coupons.length > 0 ? (
                  coupons.map((c) => (
                    <tr key={c.id}>
                      <td className="font-mono font-bold text-xs text-primary">
                        {c.code}
                      </td>
                      <td className="text-xs font-semibold">
                        {c.discountType === "percent" ? `${c.discountValue}% OFF` : `$${c.discountValue} OFF`}
                        {c.minPlan && (
                          <span className="block text-[10px] text-muted-foreground font-normal">
                            Min plan: {c.minPlan}
                          </span>
                        )}
                      </td>
                      <td className="text-xs text-slate-500">
                        {c.timesUsed} {c.maxUses ? `/ ${c.maxUses}` : "uses"}
                      </td>
                      <td className="text-xs text-slate-500">
                        {c.validUntil ? formatDate(c.validUntil) : "Never expires"}
                      </td>
                      <td>
                        <span
                          className={`badge ${
                            c.isActive ? "badge-success" : "badge-neutral"
                          }`}
                        >
                          {c.isActive ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleCouponActive(c)}
                            title={c.isActive ? "Deactivate coupon" : "Activate coupon"}
                            className="btn btn-ghost btn-icon btn-sm"
                          >
                            <span className="material-symbols-outlined text-sm">
                              {c.isActive ? "toggle_on" : "toggle_off"}
                            </span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteCoupon(c.id)}
                            title="Delete coupon"
                            className="btn btn-ghost btn-icon btn-sm hover:text-error"
                          >
                            <span className="material-symbols-outlined text-sm">delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 font-bold uppercase text-xs tracking-wider">
                      No discount coupons found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      ) : activeTab === "referrals" ? (
        /* Subscriptions & Referrals Section */
        <div className="space-y-6">
          {/* Subscriptions Table */}
          <section className="panel overflow-hidden">
            <div className="p-4 border-b border-outline-variant/10">
              <h3 className="text-base font-semibold text-on-surface">Active Subscriptions</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Overview of all processed subscription orders and billing cycles.
              </p>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Order ID</th>
                    <th>User / Account</th>
                    <th>Plan Tier</th>
                    <th>Interval</th>
                    <th>Amount Paid</th>
                    <th>Date</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {subscriptions.length > 0 ? (
                    subscriptions.map((s) => (
                      <tr key={s.id}>
                        <td className="font-mono text-xs text-muted-foreground">{s.id.slice(0, 16)}</td>
                        <td className="text-xs font-medium">{s.userEmail || s.userId}</td>
                        <td>
                          <span className="badge badge-accent font-semibold">{s.plan}</span>
                        </td>
                        <td className="text-xs capitalize">{s.billingInterval}</td>
                        <td className="text-xs font-bold text-foreground">
                          ${s.amountPaid}
                          {s.couponCode && (
                            <span className="block text-[10px] text-emerald-600 font-normal">
                              Coupon: {s.couponCode}
                            </span>
                          )}
                        </td>
                        <td className="text-xs text-slate-500">{formatDate(s.createdAt)}</td>
                        <td>
                          <span className="badge badge-success text-[10px] font-bold">
                            {s.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500 font-bold uppercase text-xs tracking-wider">
                        No subscription orders found yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Referral Redemptions Table */}
          <section className="panel overflow-hidden">
            <div className="p-4 border-b border-outline-variant/10">
              <h3 className="text-base font-semibold text-on-surface">Referral Program Attributions</h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Track users who signed up or upgraded through community referral links.
              </p>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead>
                  <tr>
                    <th>Referral Code</th>
                    <th>Referee User</th>
                    <th>Plan Chosen</th>
                    <th>Discount Given</th>
                    <th>Created</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {referrals.length > 0 ? (
                    referrals.map((r) => (
                      <tr key={r.id}>
                        <td className="font-mono font-bold text-xs text-indigo-600 dark:text-indigo-400">
                          {r.referrerCode}
                        </td>
                        <td className="text-xs">{r.refereeEmail || r.refereeUserId}</td>
                        <td>
                          <span className="badge badge-neutral text-xs">{r.plan}</span>
                        </td>
                        <td className="text-xs font-semibold text-emerald-600">
                          {r.discountApplied}% OFF
                        </td>
                        <td className="text-xs text-slate-500">{formatDate(r.createdAt)}</td>
                        <td>
                          <span className="badge badge-success text-[10px]">
                            {r.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-500 font-bold uppercase text-xs tracking-wider">
                        No referral attributions logged yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      ) : activeTab === "campaign" ? (
        /* Founder Campaign Control Section */
        <section className="panel panel-pad max-w-4xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-outline-variant/10">
            <div>
              <h3 className="text-xl font-bold text-on-surface">Founder Pass & Scarcity Campaign Settings</h3>
              <p className="text-xs text-on-surface-variant mt-1">
                Configure the rolling scarcity counter, set duration in days, toggle automatic renewal, and edit prices & slots.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleSaveCampaign(false)}
                disabled={campaignSaving}
                className="btn btn-primary btn-sm flex items-center gap-1.5"
              >
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
                Restart Countdown Now
              </button>
            </div>
          </div>

          {campaignMsg && (
            <div
              className={`p-3 rounded-lg text-xs font-semibold ${
                campaignMsg.type === "success"
                  ? "bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400"
                  : "bg-rose-500/10 border border-rose-500/30 text-rose-500"
              }`}
            >
              {campaignMsg.text}
            </div>
          )}

          {/* Master Toggle & Rolling Auto-Renew */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-4 rounded-xl border border-outline-variant/20 bg-surface-container-low/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-on-surface">Campaign Active Status</h4>
                  <p className="text-xs text-on-surface-variant">Display the Founder 5-Year banner on the landing and pricing pages.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={campaignConfig.isEnabled}
                    onChange={(e) => setCampaignConfig({ ...campaignConfig, isEnabled: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>

            <div className="p-4 rounded-xl border border-outline-variant/20 bg-surface-container-low/30 space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-bold text-on-surface">Auto-Renew Rolling Cycle</h4>
                  <p className="text-xs text-on-surface-variant">When countdown reaches 0, automatically restart another cycle until manually switched off.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={campaignConfig.autoRenew}
                    onChange={(e) => setCampaignConfig({ ...campaignConfig, autoRenew: e.target.checked })}
                    className="sr-only peer"
                  />
                  <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer dark:bg-slate-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary"></div>
                </label>
              </div>
            </div>
          </div>

          {/* Duration in Days */}
          <div className="p-5 rounded-xl border border-outline-variant/20 bg-surface-container-low/30 space-y-3">
            <h4 className="text-sm font-bold text-on-surface">Cycle Duration</h4>
            <p className="text-xs text-on-surface-variant">Select how many days each rolling countdown cycle should run before renewing.</p>
            <div className="flex flex-wrap items-center gap-3 pt-1">
              {[7, 10, 14, 20, 30].map((days) => (
                <button
                  key={days}
                  type="button"
                  onClick={() => setCampaignConfig({ ...campaignConfig, durationDays: days })}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    campaignConfig.durationDays === days
                      ? "bg-primary text-white shadow-sm"
                      : "bg-surface border border-outline-variant/40 text-on-surface-variant hover:text-on-surface"
                  }`}
                >
                  {days} Days
                </button>
              ))}
              <div className="flex items-center gap-2 ml-2">
                <span className="text-xs text-on-surface-variant">Custom Days:</span>
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={campaignConfig.durationDays}
                  onChange={(e) => setCampaignConfig({ ...campaignConfig, durationDays: Math.max(1, parseInt(e.target.value) || 1) })}
                  className="input py-1 px-2 w-20 text-xs"
                />
              </div>
            </div>
          </div>

          {/* Tiers, Slots & Prices */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Founder Basic */}
            <div className="p-5 rounded-xl border border-amber-500/30 bg-amber-500/5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-black text-on-surface">Founder Basic Pass</h4>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-amber-500/20 text-amber-700 dark:text-amber-400">
                  Indie Deal
                </span>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-on-surface-variant font-semibold mb-1">Pass Price ($ USD)</label>
                  <input
                    type="number"
                    value={campaignConfig.basicPrice}
                    onChange={(e) => setCampaignConfig({ ...campaignConfig, basicPrice: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="input py-1.5 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-on-surface-variant font-semibold mb-1">Total Cap Slots</label>
                    <input
                      type="number"
                      value={campaignConfig.basicTotalSlots}
                      onChange={(e) => setCampaignConfig({ ...campaignConfig, basicTotalSlots: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="input py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-on-surface-variant font-semibold mb-1">Claimed Count</label>
                    <input
                      type="number"
                      value={campaignConfig.basicClaimedSlots}
                      onChange={(e) => setCampaignConfig({ ...campaignConfig, basicClaimedSlots: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="input py-1.5 text-xs"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-on-surface-variant font-medium">
                  Remaining spots shown to buyers: <strong className="text-amber-600 dark:text-amber-400">{Math.max(0, campaignConfig.basicTotalSlots - campaignConfig.basicClaimedSlots)}</strong>
                </p>
              </div>
            </div>

            {/* Founder Pro */}
            <div className="p-5 rounded-xl border border-primary/30 bg-primary/5 space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-base font-black text-on-surface">Founder Pro Pass</h4>
                <span className="px-2 py-0.5 rounded text-[11px] font-bold bg-primary/20 text-primary">
                  Pro Author Deal
                </span>
              </div>
              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-on-surface-variant font-semibold mb-1">Pass Price ($ USD)</label>
                  <input
                    type="number"
                    value={campaignConfig.proPrice}
                    onChange={(e) => setCampaignConfig({ ...campaignConfig, proPrice: Math.max(1, parseInt(e.target.value) || 1) })}
                    className="input py-1.5 text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-on-surface-variant font-semibold mb-1">Total Cap Slots</label>
                    <input
                      type="number"
                      value={campaignConfig.proTotalSlots}
                      onChange={(e) => setCampaignConfig({ ...campaignConfig, proTotalSlots: Math.max(1, parseInt(e.target.value) || 1) })}
                      className="input py-1.5 text-xs"
                    />
                  </div>
                  <div>
                    <label className="block text-on-surface-variant font-semibold mb-1">Claimed Count</label>
                    <input
                      type="number"
                      value={campaignConfig.proClaimedSlots}
                      onChange={(e) => setCampaignConfig({ ...campaignConfig, proClaimedSlots: Math.max(0, parseInt(e.target.value) || 0) })}
                      className="input py-1.5 text-xs"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-on-surface-variant font-medium">
                  Remaining spots shown to buyers: <strong className="text-primary">{Math.max(0, campaignConfig.proTotalSlots - campaignConfig.proClaimedSlots)}</strong>
                </p>
              </div>
            </div>
          </div>
        </section>
      ) : (
        /* Users Table Dashboard */
        <section className="panel overflow-hidden">
          {/* Table Controls (Search & Filters) */}
          <div className="p-4 border-b border-outline-variant/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <span className="absolute left-3 top-3.5 text-slate-400 text-sm material-symbols-outlined">search</span>
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input pl-8"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto self-end md:self-auto">
              <div className="flex items-center gap-2">
                <select
                  aria-label="Filter by role"
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as "all" | "user" | "admin")}
                  className="select w-auto min-w-[8rem]"
                >
                  <option value="all">All roles</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <select
                  aria-label="Filter by status"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "suspended")}
                  className="select w-auto min-w-[8rem]"
                >
                  <option value="all">All statuses</option>
                  <option value="active">Active</option>
                  <option value="suspended">Suspended</option>
                </select>
              </div>
            </div>
          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-[var(--hairline)] text-on-surface-variant text-[11px] font-semibold bg-on-surface/[0.02]">
                  <th className="py-2 px-6">User Profile</th>
                  <th className="py-2 px-6">Registered Date</th>
                  <th className="py-2 px-6">Access Role</th>
                  <th className="py-2 px-6">Subscription Plan</th>
                  <th className="py-2 px-6">Status</th>
                  <th className="py-2 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => {
                    const isSelf = currentUser?.id === user.id;
                    const isDeleting = confirmDeleteId === user.id;

                    return (
                      <tr key={user.id} className="hover:bg-surface-container-high/20 transition-colors text-xs font-semibold text-on-surface">
                        <td className="py-2 px-6 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-[var(--radius)] bg-gradient-to-tr from-indigo-500/10 to-amber-500/10 border border-outline-variant/10 flex items-center justify-center text-primary font-semibold uppercase text-sm shrink-0">
                            {user.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-on-surface">{user.fullName}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-0.5">{user.email}</p>
                          </div>
                        </td>
                        <td className="py-2 px-6 text-slate-500 dark:text-slate-400">
                          {formatDate(user.registeredAt)}
                        </td>
                        <td className="py-2 px-6">
                          <span className={`chip border ${
                            user.role === "admin"
                              ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                              : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-2 px-6">
                          <span className={`chip border ${
                            user.plan === "Enterprise"
                              ? "bg-amber-500/10 text-amber-400 border-amber-500/20"
                              : user.plan === "Pro"
                              ? "bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                              : user.plan === "Custom"
                              ? "bg-purple-500/10 text-purple-400 border-purple-500/20"
                              : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                          }`}>
                            {user.plan || "Basic"}
                          </span>
                        </td>
                        <td className="py-2 px-6">
                          <span className={`chip border ${
                            user.status === "active"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : "bg-red-500/10 text-red-500 border-red-500/20"
                          }`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="py-2 px-6 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            {isDeleting ? (
                              <div className="flex items-center gap-2 bg-red-950/20 p-1 px-2 rounded-[var(--radius)] border border-red-800/30">
                                <span className="text-[10px] text-red-400 font-bold uppercase mr-1">Confirm delete?</span>
                                <button
                                  onClick={() => confirmDelete(user.id)}
                                  className="bg-red-600 hover:bg-red-500 text-white font-bold px-2.5 py-1 rounded-md text-[10px] transition-colors"
                                >
                                  Yes
                                </button>
                                <button
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="text-slate-400 hover:text-white font-bold px-2 py-1 text-[10px] transition-colors"
                                >
                                  No
                                </button>
                              </div>
                            ) : (
                              <>
                                <button
                                  onClick={() => handleOpenEditAccess(user)}
                                  title="Edit user access plan & feature overrides"
                                  className="btn btn-ghost btn-icon btn-sm hover:text-primary"
                                >
                                  <span className="material-symbols-outlined text-sm">key</span>
                                </button>
                                <button
                                  onClick={() => handleToggleRole(user)}
                                  disabled={isSelf}
                                  title={isSelf ? "You cannot modify your own role" : `Switch to ${user.role === "admin" ? "user" : "admin"}`}
                                  className={`p-1.5 rounded-[var(--radius)] border border-outline-variant/10 text-on-surface-variant hover:text-primary hover:bg-primary/10 transition-all ${isSelf ? "opacity-30 cursor-not-allowed" : ""}`}
                                >
                                  <span className="material-symbols-outlined text-sm">manage_accounts</span>
                                </button>
                                <button
                                  onClick={() => handleToggleStatus(user)}
                                  disabled={isSelf}
                                  title={isSelf ? "You cannot suspend yourself" : `${user.status === "active" ? "Suspend" : "Activate"} user`}
                                  className={`p-1.5 rounded-[var(--radius)] border border-outline-variant/10 text-slate-500 transition-all ${
                                    user.status === "active"
                                      ? "hover:text-red-400 hover:bg-red-500/10"
                                      : "hover:text-emerald-400 hover:bg-emerald-500/10"
                                  } ${isSelf ? "opacity-30 cursor-not-allowed" : ""}`}
                                >
                                  <span className="material-symbols-outlined text-sm">
                                    {user.status === "active" ? "block" : "check_circle"}
                                  </span>
                                </button>
                                <button
                                  onClick={() => handleDeleteClick(user.id)}
                                  disabled={isSelf}
                                  title={isSelf ? "You cannot delete yourself" : "Delete user account"}
                                  className={`btn btn-ghost btn-icon btn-sm hover:text-error ${isSelf ? "opacity-30 cursor-not-allowed" : ""}`}
                                >
                                  <span className="material-symbols-outlined text-sm">delete</span>
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-slate-500 dark:text-slate-400 font-bold uppercase text-xs tracking-wider">
                      No matching user records found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Edit Access Plan & Overrides Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-fade-in">
          <div className="relative w-full max-w-lg rounded-[var(--radius-lg)] border border-white/[0.08] bg-slate-900 p-4 md:p-4 shadow-2xl overflow-hidden">
            {/* Ambient glows inside modal */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[80px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/5 blur-[80px] pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-white">Edit Access Permissions</h3>
                  <p className="text-xs text-slate-400 mt-1">Configure subscription plans and overrides for {editingUser.fullName}</p>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  className="w-8 h-8 rounded-[var(--radius)] hover:bg-white/[0.04] text-slate-400 hover:text-white flex items-center justify-center transition-all"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Form Controls */}
              <div className="space-y-3">
                {/* Plan Dropdown Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-2.5">
                    Select Access Plan
                  </label>
                  <select
                    value={selectedPlan}
                    onChange={(e) => handlePlanChange(e.target.value as UserPlan)}
                    className="w-full bg-slate-950 border border-white/[0.08] rounded-[var(--radius)] py-3 px-4 text-white text-sm font-semibold outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                  >
                    <option value="Free">Free Plan (2 Projects, 2 Blogs/mo)</option>
                    <option value="Basic">Basic Plan (Create Only)</option>
                    <option value="Pro">Pro Plan (Create, Rewrite, Blog)</option>
                    <option value="Enterprise">Enterprise Plan (All Features)</option>
                    <option value="Custom">Custom Plan (Manual Override)</option>
                  </select>
                  <p className="text-[10px] text-slate-500 mt-2">
                    Changing the plan resets allowed modules to their default configurations.
                  </p>
                </div>

                {/* Manual Checkbox Overrides */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 mb-3">
                    Allowed Features & Manual Overrides
                  </label>
                  <div className="space-y-2.5">
                    {[
                      { key: "createEbook", label: "Create Ebook module", desc: "Allows full book outline and text drafting" },
                      { key: "rewriteEbook", label: "Rewrite Passage module", desc: "Access to paragraph rewriting swarms" },
                      { key: "blogGenerator", label: "Blog Generator module", desc: "Autogenerates articles from drafts" },
                      { key: "advancedModels", label: "Advanced AI Settings", desc: "Configure custom providers and endpoints" }
                    ].map((feat) => {
                      const k = feat.key as keyof UserFeatures;
                      return (
                        <label
                          key={feat.key}
                          className="flex items-start gap-3 p-3.5 rounded-[var(--radius)] border border-white/[0.04] hover:bg-white/[0.02] cursor-pointer transition-colors"
                        >
                          <input
                            type="checkbox"
                            checked={selectedFeatures[k]}
                            onChange={() => handleFeatureToggle(k)}
                            className="w-4 h-4 rounded border-white/10 text-primary bg-slate-950 mt-0.5 accent-indigo-600 focus:ring-0 focus:ring-offset-0"
                          />
                          <div>
                            <span className="text-xs font-bold text-white block">{feat.label}</span>
                            <span className="text-[10px] text-slate-500 mt-0.5 block">{feat.desc}</span>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-3 justify-end border-t border-white/[0.06] pt-5 mt-6">
                <button
                  onClick={handleSaveAccess}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2.5 rounded-[var(--radius)] text-xs shadow-lg shadow-indigo-950/45 transition-all"
                >
                  Save Access Settings
                </button>
                <button
                  onClick={() => setEditingUser(null)}
                  className="border border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.04] font-bold px-5 py-2.5 rounded-[var(--radius)] text-xs transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Create Coupon Modal */}
      {showAddCouponModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-md p-4 animate-fade-in">
          <div className="relative w-full max-w-md rounded-[var(--radius-lg)] border border-white/[0.08] bg-slate-900 p-5 shadow-2xl">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3 mb-4">
              <h3 className="text-base font-semibold text-white">Create Discount Coupon</h3>
              <button
                type="button"
                onClick={() => setShowAddCouponModal(false)}
                className="w-7 h-7 rounded-[var(--radius)] hover:bg-white/[0.04] text-slate-400 hover:text-white flex items-center justify-center"
              >
                <span className="material-symbols-outlined text-sm">close</span>
              </button>
            </div>

            <form onSubmit={handleCreateCoupon} className="space-y-3.5">
              {couponFormError && (
                <p className="text-xs text-rose-400 bg-rose-500/10 p-2 rounded border border-rose-500/20">
                  {couponFormError}
                </p>
              )}
              {couponFormSuccess && (
                <p className="text-xs text-emerald-400 bg-emerald-500/10 p-2 rounded border border-emerald-500/20">
                  {couponFormSuccess}
                </p>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Coupon Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FLASH30"
                  value={newCouponCode}
                  onChange={(e) => setNewCouponCode(e.target.value.toUpperCase())}
                  className="w-full bg-slate-950 border border-white/10 rounded-[var(--radius)] p-2.5 text-xs text-white uppercase font-mono outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Discount Type</label>
                  <select
                    value={newCouponType}
                    onChange={(e) => setNewCouponType(e.target.value as "percent" | "fixed")}
                    className="w-full bg-slate-950 border border-white/10 rounded-[var(--radius)] p-2.5 text-xs text-white outline-none focus:border-primary"
                  >
                    <option value="percent">Percentage (%)</option>
                    <option value="fixed">Fixed Amount ($)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Discount Value</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={newCouponValue}
                    onChange={(e) => setNewCouponValue(Number(e.target.value))}
                    className="w-full bg-slate-950 border border-white/10 rounded-[var(--radius)] p-2.5 text-xs text-white outline-none focus:border-primary"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Usage Limit (Optional)</label>
                  <input
                    type="number"
                    placeholder="Unlimited"
                    value={newCouponMaxUses}
                    onChange={(e) => setNewCouponMaxUses(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 rounded-[var(--radius)] p-2.5 text-xs text-white outline-none focus:border-primary"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Minimum Plan</label>
                  <select
                    value={newCouponMinPlan}
                    onChange={(e) => setNewCouponMinPlan(e.target.value as UserPlan | "")}
                    className="w-full bg-slate-950 border border-white/10 rounded-[var(--radius)] p-2.5 text-xs text-white outline-none focus:border-primary"
                  >
                    <option value="">Any Plan</option>
                    <option value="Basic">Basic</option>
                    <option value="Pro">Pro</option>
                    <option value="Enterprise">Enterprise</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Expiration Date (Optional)</label>
                <input
                  type="date"
                  value={newCouponExpiry}
                  onChange={(e) => setNewCouponExpiry(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 rounded-[var(--radius)] p-2.5 text-xs text-white outline-none focus:border-primary"
                />
              </div>

              <div className="flex gap-2 justify-end pt-3 border-t border-white/[0.06]">
                <button
                  type="button"
                  onClick={() => setShowAddCouponModal(false)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary btn-sm">
                  Save Coupon
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
