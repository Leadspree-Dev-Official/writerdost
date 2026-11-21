"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/app-store";
import { PLAN_DEFAULT_CREDITS, type User, type UserPlan, type UserFeatures } from "@/lib/store-types";

interface AdminUsersTabProps {
  onNotifyError: (msg: string) => void;
}

export function AdminUsersTab({ onNotifyError }: AdminUsersTabProps) {
  const users = useAppStore((state) => state.users);
  const currentUser = useAppStore((state) => state.currentUser);
  const adminUpdateUser = useAppStore((state) => state.adminUpdateUser);
  const adminUpdateUserCredits = useAppStore((state) => state.adminUpdateUserCredits);
  const adminAutoRefillPlanCredits = useAppStore((state) => state.adminAutoRefillPlanCredits);
  const adminDeleteUser = useAppStore((state) => state.adminDeleteUser);
  const adminAddUser = useAppStore((state) => state.adminAddUser);
  const adminSetUserPlanAndFeatures = useAppStore((state) => state.adminSetUserPlanAndFeatures);

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
    advancedModels: false,
  });
  const [editPlanCredits, setEditPlanCredits] = useState<number>(2000);
  const [editPlanUnlimited, setEditPlanUnlimited] = useState<boolean>(false);

  // Manage Credits Modal State
  const [managingCreditsUser, setManagingCreditsUser] = useState<User | null>(null);
  const [creditInput, setCreditInput] = useState<number>(500);
  const [isUnlimitedInput, setIsUnlimitedInput] = useState<boolean>(false);
  const [isSavingCredits, setIsSavingCredits] = useState<boolean>(false);

  // Batch Auto-Refill State
  const [isRefillingBatch, setIsRefillingBatch] = useState<boolean>(false);
  const [refillNotification, setRefillNotification] = useState<string | null>(null);

  // New User Form State
  const [showAddForm, setShowAddForm] = useState(false);
  const [newFullName, setNewFullName] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"user" | "admin">("user");
  const [newPlan, setNewPlan] = useState<UserPlan>("Basic");
  const [newCredits, setNewCredits] = useState<number>(2000);
  const [newUnlimited, setNewUnlimited] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [formSuccess, setFormSuccess] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Confirm delete state
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Metrics
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
    setIsSubmitting(true);

    if (!newFullName || !newEmail || !newPassword) {
      setFormError("Please fill in all fields.");
      setIsSubmitting(false);
      return;
    }

    const res = await adminAddUser({
      fullName: newFullName,
      email: newEmail,
      role: newRole,
      status: "active",
      password: newPassword,
      plan: newPlan,
      credits: newCredits,
      unlimitedCredits: newUnlimited,
      allowedFeatures: {
        createEbook: true,
        rewriteEbook: newPlan === "Pro" || newPlan === "Enterprise",
        blogGenerator: newPlan !== "Basic",
        advancedModels: newPlan === "Enterprise",
      },
    });

    setIsSubmitting(false);
    if (res.success) {
      setFormSuccess(`Successfully registered ${newFullName}!`);
      setNewFullName("");
      setNewEmail("");
      setNewPassword("");
      setNewRole("user");
      setNewPlan("Basic");
      setNewCredits(2000);
      setNewUnlimited(false);
      setTimeout(() => {
        setShowAddForm(false);
        setFormSuccess(null);
      }, 1400);
    } else {
      setFormError(res.error || "Failed to create user.");
    }
  };

  const handleToggleStatus = async (user: User) => {
    if (currentUser?.id === user.id) {
      onNotifyError("You cannot suspend your own account.");
      return;
    }
    const newStatus = user.status === "active" ? "suspended" : "active";
    const res = await adminUpdateUser(user.id, { status: newStatus });
    if (!res.success) onNotifyError(res.error || "Could not update account status.");
  };

  const handleToggleRole = async (user: User) => {
    if (currentUser?.id === user.id) {
      onNotifyError("You cannot change your own admin role.");
      return;
    }
    const newRole = user.role === "admin" ? "user" : "admin";
    const res = await adminUpdateUser(user.id, { role: newRole });
    if (!res.success) onNotifyError(res.error || "Could not update role.");
  };

  const confirmDelete = async (userId: string) => {
    if (currentUser?.id === userId) {
      onNotifyError("You cannot delete your own admin account.");
      return;
    }
    const res = await adminDeleteUser(userId);
    if (!res.success) onNotifyError(res.error || "Could not delete user.");
    setConfirmDeleteId(null);
  };

  const handlePlanChange = (plan: UserPlan) => {
    setSelectedPlan(plan);
    setEditPlanCredits(PLAN_DEFAULT_CREDITS[plan] ?? 2000);
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
    setEditPlanCredits(user.credits ?? PLAN_DEFAULT_CREDITS[user.plan || "Basic"] ?? 2000);
    setEditPlanUnlimited(Boolean(user.unlimitedCredits));
    setSelectedFeatures(
      user.allowedFeatures || {
        createEbook: true,
        rewriteEbook: false,
        blogGenerator: false,
        advancedModels: false,
      }
    );
  };

  const handleSaveAccess = async () => {
    if (!editingUser) return;
    const res = await adminUpdateUser(editingUser.id, {
      plan: selectedPlan,
      allowedFeatures: selectedFeatures,
      credits: editPlanCredits,
      unlimitedCredits: editPlanUnlimited,
    });
    if (!res.success) onNotifyError(res.error || "Could not save the plan settings.");
    setEditingUser(null);
  };

  const handleOpenManageCredits = (user: User) => {
    setManagingCreditsUser(user);
    setCreditInput(user.credits ?? PLAN_DEFAULT_CREDITS[user.plan || "Basic"] ?? 500);
    setIsUnlimitedInput(Boolean(user.unlimitedCredits));
  };

  const handleIncrementCredits = (amount: number) => {
    setCreditInput((prev) => Math.max(0, prev + amount));
  };

  const handleSaveCredits = async () => {
    if (!managingCreditsUser) return;
    setIsSavingCredits(true);
    const res = await adminUpdateUserCredits(
      managingCreditsUser.id,
      creditInput,
      isUnlimitedInput,
    );
    setIsSavingCredits(false);
    if (!res.success) {
      onNotifyError(res.error || "Failed to update credits.");
    } else {
      setManagingCreditsUser(null);
    }
  };

  const handleBatchRefill = async (mode: "reset" | "topup" = "reset") => {
    setIsRefillingBatch(true);
    const res = await adminAutoRefillPlanCredits(undefined, mode);
    setIsRefillingBatch(false);
    if (res.success) {
      setRefillNotification(res.message || `Successfully refilled monthly credits for all active users.`);
      setTimeout(() => setRefillNotification(null), 5000);
    } else {
      onNotifyError(res.error || "Failed to auto-refill monthly credits.");
    }
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const getPlanBadgeClass = (plan?: UserPlan) => {
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
      {/* Metrics Row */}
      <section className="metrics !grid-cols-2 lg:!grid-cols-4" aria-label="User directory metrics">
        <div className="metric">
          <p className="metric-label">Total Accounts</p>
          <p className="metric-value">{totalUsers}</p>
          <p className="metric-note">registered users</p>
        </div>
        <div className="metric">
          <p className="metric-label">Active Users</p>
          <p className="metric-value text-emerald-600 dark:text-emerald-400">{activeUsers}</p>
          <p className="metric-note">enabled access</p>
        </div>
        <div className="metric">
          <p className="metric-label">Workspace Admins</p>
          <p className="metric-value text-primary">{adminUsers}</p>
          <p className="metric-note">privileged roles</p>
        </div>
        <div className="metric">
          <p className="metric-label">Suspended</p>
          <p className="metric-value text-rose-500">{suspendedUsers}</p>
          <p className="metric-note">restricted accounts</p>
        </div>
      </section>

      {/* New User Inline Form (if toggled) */}
      {showAddForm && (
        <section className="panel p-5 max-w-xl animate-fade-in border-primary/30">
          <div className="flex items-center justify-between pb-3 mb-4 border-b border-[var(--hairline)]">
            <span className="panel-title flex items-center gap-2">
              <span className="material-symbols-outlined text-primary text-base">person_add</span>
              Provision New Workspace Account
            </span>
            <button
              type="button"
              onClick={() => setShowAddForm(false)}
              className="btn btn-ghost btn-icon btn-sm"
            >
              <span className="material-symbols-outlined text-base">close</span>
            </button>
          </div>

          {formError && (
            <div className="mb-4 p-3 rounded bg-rose-500/10 border border-rose-500/20 text-rose-600 dark:text-rose-400 text-xs font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-sm shrink-0">error</span>
              <span>{formError}</span>
            </div>
          )}
          {formSuccess && (
            <div className="mb-4 p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center gap-2">
              <span className="material-symbols-outlined text-sm shrink-0">check_circle</span>
              <span>{formSuccess}</span>
            </div>
          )}

          <form onSubmit={handleAddUser} className="space-y-3.5">
            <div className="field">
              <label className="label">Full Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Jane Austen"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                className="input"
              />
            </div>
            <div className="field">
              <label className="label">Email Address</label>
              <input
                type="email"
                required
                placeholder="author@example.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="input"
              />
            </div>
            <div className="field">
              <label className="label">Initial Password</label>
              <input
                type="text"
                required
                placeholder="Temporary login password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input font-mono"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="field">
                <label className="label">Account Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as "user" | "admin")}
                  className="select"
                >
                  <option value="user">Standard Author (User)</option>
                  <option value="admin">Workspace Admin</option>
                </select>
              </div>

              <div className="field">
                <label className="label">Subscription Plan</label>
                <select
                  value={newPlan}
                  onChange={(e) => {
                    const p = e.target.value as UserPlan;
                    setNewPlan(p);
                    setNewCredits(PLAN_DEFAULT_CREDITS[p] ?? 2000);
                  }}
                  className="select"
                >
                  <option value="Free">Free (500 credits)</option>
                  <option value="Basic">Basic (2,000 credits)</option>
                  <option value="Pro">Pro (6,000 credits)</option>
                  <option value="Enterprise">Enterprise (25,000 credits)</option>
                </select>
              </div>
            </div>

            <div className="p-3 rounded-lg border border-[var(--hairline)] bg-[var(--color-surface-container-low)] space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[var(--color-on-surface)]">Credit Allocation</span>
                <label className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 font-semibold cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newUnlimited}
                    onChange={(e) => setNewUnlimited(e.target.checked)}
                    className="rounded border-[var(--hairline-strong)] text-purple-600 accent-purple-600"
                  />
                  <span>Unlimited Credits (∞)</span>
                </label>
              </div>
              {!newUnlimited && (
                <div className="field !mt-1">
                  <input
                    type="number"
                    min="0"
                    value={newCredits}
                    onChange={(e) => setNewCredits(Math.max(0, parseInt(e.target.value) || 0))}
                    className="input !h-[var(--ctl-md)] font-mono text-xs"
                    placeholder="Initial credits"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-2.5 pt-2">
              <button
                type="submit"
                disabled={isSubmitting}
                className="btn btn-primary btn-sm flex items-center gap-1.5"
              >
                <span className="material-symbols-outlined text-sm">
                  {isSubmitting ? "hourglass_empty" : "check"}
                </span>
                {isSubmitting ? "Creating..." : "Save Account"}
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="btn btn-secondary btn-sm"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      )}

      {/* Users Data Table Panel */}
      <section className="panel overflow-hidden">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-[var(--hairline)] flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          <div className="flex flex-1 items-center gap-3">
            <div className="relative w-full max-w-xs">
              <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-base text-[var(--color-on-surface-variant)] pointer-events-none">
                search
              </span>
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="input !h-[var(--ctl-md)] !pl-8 !text-xs"
              />
            </div>

            <select
              aria-label="Filter by role"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as "all" | "user" | "admin")}
              className="select !h-[var(--ctl-md)] !py-0 !text-xs w-auto min-w-[7rem]"
            >
              <option value="all">All roles</option>
              <option value="user">Authors only</option>
              <option value="admin">Admins only</option>
            </select>

            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "suspended")}
              className="select !h-[var(--ctl-md)] !py-0 !text-xs w-auto min-w-[7.5rem]"
            >
              <option value="all">All statuses</option>
              <option value="active">Active only</option>
              <option value="suspended">Suspended</option>
            </select>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleBatchRefill("reset")}
              disabled={isRefillingBatch}
              title="Automatically top up all active users to their plan's monthly credit quota"
              className="btn btn-secondary btn-sm flex items-center gap-1.5"
            >
              <span className={`material-symbols-outlined text-sm ${isRefillingBatch ? "animate-spin" : "text-amber-500"}`}>
                {isRefillingBatch ? "refresh" : "autorenew"}
              </span>
              <span>{isRefillingBatch ? "Refilling..." : "Auto-Refill Monthly"}</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setShowAddForm(!showAddForm);
                setFormError(null);
                setFormSuccess(null);
              }}
              className="btn btn-primary btn-sm flex items-center gap-1.5"
            >
              <span className="material-symbols-outlined text-sm">
                {showAddForm ? "close" : "person_add"}
              </span>
              {showAddForm ? "Cancel Add" : "New User"}
            </button>
          </div>
        </div>

        {refillNotification && (
          <div className="mx-4 mt-4 p-3 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-semibold flex items-center justify-between gap-2 animate-fade-in">
            <div className="flex items-center gap-2">
              <span className="material-symbols-outlined text-sm">check_circle</span>
              <span>{refillNotification}</span>
            </div>
            <button
              type="button"
              onClick={() => setRefillNotification(null)}
              className="btn btn-ghost btn-icon btn-sm !h-5 !w-5"
            >
              <span className="material-symbols-outlined text-xs">close</span>
            </button>
          </div>
        )}

        {/* Users Table */}
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>User Account</th>
                <th>Registered Date</th>
                <th>Role</th>
                <th>Plan Tier</th>
                <th>Credits</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => {
                  const isSelf = currentUser?.id === user.id;
                  const isDeleting = confirmDeleteId === user.id;

                  return (
                    <tr key={user.id}>
                      {/* User Profile */}
                      <td>
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-primary/10 text-primary font-bold text-xs flex items-center justify-center shrink-0 uppercase border border-primary/20">
                            {user.fullName.charAt(0) || "U"}
                          </div>
                          <div>
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-xs text-[var(--color-on-surface)]">
                                {user.fullName}
                              </span>
                              {isSelf && (
                                <span className="chip chip-neutral text-[9px] font-bold">You</span>
                              )}
                            </div>
                            <span className="text-[11px] text-[var(--color-on-surface-variant)] block">
                              {user.email}
                            </span>
                          </div>
                        </div>
                      </td>

                      {/* Registered Date */}
                      <td className="text-xs text-[var(--color-on-surface-variant)] tabular-nums">
                        {formatDate(user.registeredAt)}
                      </td>

                      {/* Role */}
                      <td>
                        <span
                          className={`chip ${
                            user.role === "admin"
                              ? "bg-primary/15 text-primary border border-primary/25"
                              : "chip-neutral"
                          }`}
                        >
                          {user.role === "admin" ? "Admin" : "Author"}
                        </span>
                      </td>

                      {/* Plan Tier */}
                      <td>
                        <span className={`badge ${getPlanBadgeClass(user.plan)}`}>
                          {user.plan || "Basic"}
                        </span>
                      </td>

                      {/* Credits */}
                      <td>
                        {user.unlimitedCredits ? (
                          <span className="badge bg-purple-500/15 text-purple-700 dark:text-purple-300 border border-purple-500/30 inline-flex items-center gap-1 font-bold">
                            <span className="text-sm leading-none">∞</span> Unlimited
                          </span>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-xs font-semibold text-[var(--color-on-surface)] tabular-nums">
                            <span className="material-symbols-outlined text-amber-500 text-sm">toll</span>
                            {(user.credits ?? 500).toLocaleString()}
                          </div>
                        )}
                      </td>

                      {/* Status */}
                      <td>
                        <span
                          className={`badge ${
                            user.status === "active" ? "badge-success" : "badge-error"
                          }`}
                        >
                          {user.status}
                        </span>
                      </td>

                      {/* Actions */}
                      <td className="text-right">
                        {isDeleting ? (
                          <div className="inline-flex items-center gap-1.5 p-1 rounded bg-rose-500/10 border border-rose-500/20">
                            <span className="text-[10px] text-rose-600 dark:text-rose-400 font-bold">Confirm delete?</span>
                            <button
                              type="button"
                              onClick={() => confirmDelete(user.id)}
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
                            {/* Manage Credits */}
                            <button
                              type="button"
                              onClick={() => handleOpenManageCredits(user)}
                              title="Manage AI credits or set unlimited"
                              className="btn btn-ghost btn-icon btn-sm hover:text-amber-500"
                            >
                              <span className="material-symbols-outlined text-sm">toll</span>
                            </button>

                            {/* Edit Plan & Features */}
                            <button
                              type="button"
                              onClick={() => handleOpenEditAccess(user)}
                              title="Edit user access plan & feature overrides"
                              className="btn btn-ghost btn-icon btn-sm hover:text-primary"
                            >
                              <span className="material-symbols-outlined text-sm">tune</span>
                            </button>

                            {/* Switch Role */}
                            <button
                              type="button"
                              onClick={() => handleToggleRole(user)}
                              disabled={isSelf}
                              title={
                                isSelf
                                  ? "You cannot modify your own role"
                                  : `Switch role to ${user.role === "admin" ? "user" : "admin"}`
                              }
                              className={`btn btn-ghost btn-icon btn-sm ${
                                isSelf ? "opacity-30 cursor-not-allowed" : "hover:text-primary"
                              }`}
                            >
                              <span className="material-symbols-outlined text-sm">manage_accounts</span>
                            </button>

                            {/* Suspend / Activate */}
                            <button
                              type="button"
                              onClick={() => handleToggleStatus(user)}
                              disabled={isSelf}
                              title={
                                isSelf
                                  ? "You cannot suspend yourself"
                                  : `${user.status === "active" ? "Suspend" : "Activate"} user`
                              }
                              className={`btn btn-ghost btn-icon btn-sm ${
                                user.status === "active"
                                  ? "hover:text-rose-500"
                                  : "hover:text-emerald-500"
                              } ${isSelf ? "opacity-30 cursor-not-allowed" : ""}`}
                            >
                              <span className="material-symbols-outlined text-sm">
                                {user.status === "active" ? "block" : "check_circle"}
                              </span>
                            </button>

                            {/* Delete User */}
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(user.id)}
                              disabled={isSelf}
                              title={isSelf ? "You cannot delete yourself" : "Delete user account"}
                              className={`btn btn-ghost btn-icon btn-sm hover:text-rose-500 ${
                                isSelf ? "opacity-30 cursor-not-allowed" : ""
                              }`}
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
                  <td colSpan={7} className="py-10 text-center">
                    <div className="flex flex-col items-center justify-center gap-2 text-[var(--color-on-surface-variant)]">
                      <span className="material-symbols-outlined text-3xl opacity-40">group</span>
                      <p className="text-xs font-semibold">No matching user records found.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Edit Access Plan & Overrides Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-lg panel bg-[var(--color-surface)] border border-[var(--hairline-strong)] shadow-2xl overflow-hidden rounded-[var(--radius-lg)]">
            <div className="panel-head">
              <span className="panel-title flex items-center gap-2">
                <span className="material-symbols-outlined text-primary text-base">tune</span>
                Edit Access Permissions: {editingUser.fullName}
              </span>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                className="btn btn-ghost btn-icon btn-sm"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Plan Dropdown Selection */}
              <div className="field">
                <label className="label">Select Access Plan</label>
                <select
                  value={selectedPlan}
                  onChange={(e) => handlePlanChange(e.target.value as UserPlan)}
                  className="select"
                >
                  <option value="Free">Free Plan (500 credits/mo, 2 Projects, 2 Blogs)</option>
                  <option value="Basic">Basic Plan (2,000 credits/mo, Create Only)</option>
                  <option value="Pro">Pro Plan (6,000 credits/mo, Create, Rewrite, Blog)</option>
                  <option value="Enterprise">Enterprise Plan (25,000 credits/mo, All Modules)</option>
                  <option value="Custom">Custom Plan (Individual Overrides)</option>
                </select>
                <p className="hint">
                  Changing plan tier automatically updates default module allowances and recommended credits below.
                </p>
              </div>

              {/* Credit Quota & Unlimited Option */}
              <div className="space-y-2 p-3 rounded-lg border border-[var(--hairline)] bg-[var(--color-surface-container-low)]">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-[var(--color-on-surface)]">Plan Credit Allocation</span>
                  <label className="flex items-center gap-1.5 text-xs text-purple-600 dark:text-purple-400 font-semibold cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editPlanUnlimited}
                      onChange={(e) => setEditPlanUnlimited(e.target.checked)}
                      className="rounded border-[var(--hairline-strong)] text-purple-600 accent-purple-600"
                    />
                    <span>Unlimited Credits (∞)</span>
                  </label>
                </div>
                {!editPlanUnlimited && (
                  <div className="field !mt-1.5">
                    <input
                      type="number"
                      min="0"
                      value={editPlanCredits}
                      onChange={(e) => setEditPlanCredits(Math.max(0, parseInt(e.target.value) || 0))}
                      className="input !h-[var(--ctl-md)] font-mono text-xs"
                      placeholder="Credits balance"
                    />
                    <p className="hint text-[10px]">Defaults to monthly allowance for {selectedPlan} ({(PLAN_DEFAULT_CREDITS[selectedPlan] ?? 500).toLocaleString()} credits).</p>
                  </div>
                )}
              </div>

              {/* Individual Feature Toggles */}
              <div>
                <label className="label">Allowed Modules & Feature Overrides</label>
                <div className="space-y-2 mt-1.5">
                  {[
                    { key: "createEbook", label: "Create Ebook Module", desc: "Full outline and autonomous book drafting" },
                    { key: "rewriteEbook", label: "Rewrite Passage Module", desc: "Paragraph rewriting and style transformations" },
                    { key: "blogGenerator", label: "Blog Generator Module", desc: "Article production and blog draft generation" },
                    { key: "advancedModels", label: "Advanced AI Settings", desc: "BYOK keys and custom provider model endpoints" },
                  ].map((feat) => {
                    const k = feat.key as keyof UserFeatures;
                    return (
                      <label
                        key={feat.key}
                        className="flex items-start gap-3 p-3 rounded border border-[var(--hairline)] bg-[var(--color-surface-container-low)] hover:bg-[var(--color-surface-container)] cursor-pointer transition-colors"
                      >
                        <input
                          type="checkbox"
                          checked={selectedFeatures[k]}
                          onChange={() => handleFeatureToggle(k)}
                          className="mt-0.5 rounded border-[var(--hairline-strong)] text-primary accent-primary"
                        />
                        <div>
                          <span className="text-xs font-bold text-[var(--color-on-surface)] block">
                            {feat.label}
                          </span>
                          <span className="text-[10px] text-[var(--color-on-surface-variant)] block">
                            {feat.desc}
                          </span>
                        </div>
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 justify-end pt-3 border-t border-[var(--hairline)]">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveAccess}
                  className="btn btn-primary btn-sm flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">check</span>
                  Save Access Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dedicated Manage Credits Modal */}
      {managingCreditsUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-fade-in">
          <div className="relative w-full max-w-md panel bg-[var(--color-surface)] border border-[var(--hairline-strong)] shadow-2xl overflow-hidden rounded-[var(--radius-lg)]">
            <div className="panel-head">
              <span className="panel-title flex items-center gap-2">
                <span className="material-symbols-outlined text-amber-500 text-base">toll</span>
                Manage Credits: {managingCreditsUser.fullName}
              </span>
              <button
                type="button"
                onClick={() => setManagingCreditsUser(null)}
                className="btn btn-ghost btn-icon btn-sm"
              >
                <span className="material-symbols-outlined text-base">close</span>
              </button>
            </div>

            <div className="p-5 space-y-4">
              {/* Current Status banner */}
              <div className="p-3 rounded-lg border border-[var(--hairline)] bg-[var(--color-surface-container-low)] flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-medium text-[var(--color-on-surface-variant)] block">Current Balance</span>
                  <span className="text-sm font-bold text-[var(--color-on-surface)]">
                    {managingCreditsUser.unlimitedCredits ? "∞ Unlimited" : `${(managingCreditsUser.credits ?? 500).toLocaleString()} credits`}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-[11px] font-medium text-[var(--color-on-surface-variant)] block">Plan Monthly Quota</span>
                  <span className="text-xs font-semibold text-primary">
                    {(PLAN_DEFAULT_CREDITS[managingCreditsUser.plan || "Basic"] ?? 500).toLocaleString()} / mo
                  </span>
                </div>
              </div>

              {/* Unlimited Toggle */}
              <label className="flex items-start gap-3 p-3 rounded-lg border border-purple-500/30 bg-purple-500/5 hover:bg-purple-500/10 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={isUnlimitedInput}
                  onChange={(e) => setIsUnlimitedInput(e.target.checked)}
                  className="mt-0.5 rounded border-[var(--hairline-strong)] text-purple-600 accent-purple-600"
                />
                <div>
                  <span className="text-xs font-bold text-purple-700 dark:text-purple-300 flex items-center gap-1.5">
                    <span className="text-sm leading-none">∞</span> Unlimited Credits
                  </span>
                  <span className="text-[11px] text-[var(--color-on-surface-variant)] block mt-0.5">
                    Bypasses all token deductions and monthly limits. Book generation and chapter drafting will never halt due to lack of credits.
                  </span>
                </div>
              </label>

              {/* Credit Amount Input (disabled if unlimited) */}
              <div className={isUnlimitedInput ? "opacity-40 pointer-events-none space-y-3" : "space-y-3"}>
                <div className="field">
                  <label className="label">Credit Balance</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-2.5 top-1/2 -translate-y-1/2 text-sm text-amber-500 pointer-events-none">
                      toll
                    </span>
                    <input
                      type="number"
                      min="0"
                      value={creditInput}
                      onChange={(e) => setCreditInput(Math.max(0, parseInt(e.target.value) || 0))}
                      disabled={isUnlimitedInput}
                      className="input !pl-8 font-mono tabular-nums font-semibold"
                    />
                  </div>
                  <p className="hint">Set exact credit balance or use quick adjustments below.</p>
                </div>

                {/* Quick Increment Buttons */}
                <div>
                  <span className="text-[11px] font-semibold text-[var(--color-on-surface-variant)] block mb-1.5">
                    Quick Adjustments
                  </span>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => handleIncrementCredits(100)}
                      className="btn btn-secondary btn-sm text-[11px] !py-1"
                    >
                      +100
                    </button>
                    <button
                      type="button"
                      onClick={() => handleIncrementCredits(500)}
                      className="btn btn-secondary btn-sm text-[11px] !py-1"
                    >
                      +500
                    </button>
                    <button
                      type="button"
                      onClick={() => handleIncrementCredits(1000)}
                      className="btn btn-secondary btn-sm text-[11px] !py-1"
                    >
                      +1,000
                    </button>
                    <button
                      type="button"
                      onClick={() => handleIncrementCredits(5000)}
                      className="btn btn-secondary btn-sm text-[11px] !py-1"
                    >
                      +5,000
                    </button>
                    <button
                      type="button"
                      onClick={() => handleIncrementCredits(10000)}
                      className="btn btn-secondary btn-sm text-[11px] !py-1"
                    >
                      +10,000
                    </button>
                    <button
                      type="button"
                      onClick={() => handleIncrementCredits(-500)}
                      className="btn btn-secondary btn-sm text-[11px] !py-1 text-rose-500 hover:text-rose-600"
                    >
                      -500
                    </button>
                  </div>
                  <div className="mt-2">
                    <button
                      type="button"
                      onClick={() => setCreditInput(PLAN_DEFAULT_CREDITS[managingCreditsUser.plan || "Basic"] ?? 500)}
                      className="btn btn-ghost btn-sm text-[11px] w-full text-[var(--color-on-surface-variant)] hover:text-primary"
                    >
                      Reset to Plan Default ({(PLAN_DEFAULT_CREDITS[managingCreditsUser.plan || "Basic"] ?? 500).toLocaleString()})
                    </button>
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2.5 justify-end pt-3 border-t border-[var(--hairline)]">
                <button
                  type="button"
                  onClick={() => setManagingCreditsUser(null)}
                  className="btn btn-secondary btn-sm"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleSaveCredits}
                  disabled={isSavingCredits}
                  className="btn btn-primary btn-sm flex items-center gap-1.5"
                >
                  <span className="material-symbols-outlined text-sm">
                    {isSavingCredits ? "hourglass_empty" : "check"}
                  </span>
                  {isSavingCredits ? "Saving..." : "Save Credits"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
