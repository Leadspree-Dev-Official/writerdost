"use client";

import { useState } from "react";
import { useAppStore } from "@/lib/app-store";
import { User, UserPlan, UserFeatures, UpgradeRequest } from "@/lib/store-types";

export default function AdminDashboard() {
  const users = useAppStore((state) => state.users);
  const currentUser = useAppStore((state) => state.currentUser);
  const adminUpdateUser = useAppStore((state) => state.adminUpdateUser);
  const adminDeleteUser = useAppStore((state) => state.adminDeleteUser);
  const adminAddUser = useAppStore((state) => state.adminAddUser);
  const upgradeRequests = useAppStore((state) => state.upgradeRequests);
  const adminSetUserPlanAndFeatures = useAppStore((state) => state.adminSetUserPlanAndFeatures);
  const adminResolveUpgradeRequest = useAppStore((state) => state.adminResolveUpgradeRequest);

  // Tab State
  const [activeTab, setActiveTab] = useState<"users" | "requests">("users");

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

  const handleAddUser = (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setFormSuccess(null);

    if (!newFullName || !newEmail || !newPassword) {
      setFormError("Please fill in all fields.");
      return;
    }

    const res = adminAddUser({
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

  const handleToggleStatus = (user: User) => {
    const newStatus = user.status === "active" ? "suspended" : "active";
    adminUpdateUser(user.id, { status: newStatus });
  };

  const handleToggleRole = (user: User) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    // Prevent locking yourself out as admin
    if (currentUser?.id === user.id) {
      alert("You cannot change your own admin role.");
      return;
    }
    adminUpdateUser(user.id, { role: newRole });
  };

  const handleDeleteClick = (userId: string) => {
    if (currentUser?.id === userId) {
      alert("You cannot delete your own admin account.");
      return;
    }
    setConfirmDeleteId(userId);
  };

  const confirmDelete = (userId: string) => {
    adminDeleteUser(userId);
    setConfirmDeleteId(null);
  };

  const handlePlanChange = (plan: UserPlan) => {
    setSelectedPlan(plan);
    if (plan === "Basic") {
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

  const handleSaveAccess = () => {
    if (!editingUser) return;
    adminSetUserPlanAndFeatures(editingUser.id, selectedPlan, selectedFeatures);
    setEditingUser(null);
  };

  const handleApproveRequest = (req: UpgradeRequest) => {
    const user = users.find((u) => u.id === req.userId);
    if (user) {
      const nextFeatures = {
        ...(user.allowedFeatures || { createEbook: true, rewriteEbook: false, blogGenerator: false, advancedModels: false }),
        [req.feature]: true
      };
      
      const isEnterprise = nextFeatures.createEbook && nextFeatures.rewriteEbook && nextFeatures.blogGenerator && nextFeatures.advancedModels;
      const isPro = nextFeatures.createEbook && nextFeatures.rewriteEbook && nextFeatures.blogGenerator && !nextFeatures.advancedModels;
      const planName = isEnterprise ? "Enterprise" : (isPro ? "Pro" : "Custom");

      adminSetUserPlanAndFeatures(user.id, planName, nextFeatures);
    }
    adminResolveUpgradeRequest(req.id);
  };

  const formatDate = (isoString: string) => {
    return new Date(isoString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <main className="flex-1 p-8 max-w-7xl mx-auto w-full font-body">
      {/* Title & Add User Header */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div>
          <h2 className="text-3xl font-black text-on-surface tracking-tight">Admin Control Panel</h2>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            Superuser settings. Add, update, and manage LeadSpree workspace accounts.
          </p>
        </div>
        <button
          onClick={() => {
            setShowAddForm(!showAddForm);
            setFormError(null);
            setFormSuccess(null);
          }}
          className="bg-primary hover:bg-primary-container text-on-primary font-bold px-5 py-3 rounded-xl shadow-lg shadow-primary/20 active:scale-95 transition-all flex items-center gap-2 self-start sm:self-auto"
        >
          <span className="material-symbols-outlined text-sm">person_add</span>
          {showAddForm ? "View Users Table" : "Create New User"}
        </button>
      </section>

      {/* Metrics Row */}
      <section className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <div className="bg-surface-container-low border border-outline-variant/10 p-5 rounded-2xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">Total Users</p>
          <p className="text-2xl font-black text-on-surface mt-1">{totalUsers}</p>
        </div>
        <div className="bg-surface-container-low border border-outline-variant/10 p-5 rounded-2xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500">Active Status</p>
          <p className="text-2xl font-black text-on-surface mt-1">{activeUsers}</p>
        </div>
        <div className="bg-surface-container-low border border-outline-variant/10 p-5 rounded-2xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500 dark:text-indigo-400">Super Admins</p>
          <p className="text-2xl font-black text-on-surface mt-1">{adminUsers}</p>
        </div>
        <div className="bg-surface-container-low border border-outline-variant/10 p-5 rounded-2xl">
          <p className="text-[10px] font-bold uppercase tracking-wider text-rose-500">Suspended</p>
          <p className="text-2xl font-black text-on-surface mt-1">{suspendedUsers}</p>
        </div>
      </section>

      {/* Tabs Selector */}
      <section className="flex border-b border-outline-variant/10 mb-6 gap-6">
        <button
          onClick={() => { setActiveTab("users"); setShowAddForm(false); }}
          className={`pb-3 font-bold text-sm tracking-wider uppercase border-b-2 transition-all ${
            activeTab === "users" && !showAddForm
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-400"
          }`}
        >
          User Accounts ({totalUsers})
        </button>
        <button
          onClick={() => { setActiveTab("requests"); setShowAddForm(false); }}
          className={`pb-3 font-bold text-sm tracking-wider uppercase border-b-2 transition-all flex items-center gap-2 ${
            activeTab === "requests"
              ? "border-primary text-primary"
              : "border-transparent text-slate-500 hover:text-slate-400"
          }`}
        >
          Upgrade Requests
          {upgradeRequests.filter(r => r.status === 'pending').length > 0 && (
            <span className="bg-amber-500 text-slate-950 font-black text-[10px] w-5 h-5 rounded-full flex items-center justify-center">
              {upgradeRequests.filter(r => r.status === 'pending').length}
            </span>
          )}
        </button>
      </section>

      {/* Conditional View: Add User Form, Requests Table, or Users Table */}
      {showAddForm ? (
        <section className="max-w-xl bg-surface-container-low border border-outline-variant/15 rounded-3xl p-6 shadow-sm">
          <h3 className="text-lg font-extrabold text-on-surface mb-6">Create New User Account</h3>
          
          {formError && (
            <div className="mb-4 p-4 rounded-xl bg-red-950/20 border border-red-800/30 text-red-500 text-xs font-semibold">
              {formError}
            </div>
          )}
          {formSuccess && (
            <div className="mb-4 p-4 rounded-xl bg-emerald-950/20 border border-emerald-800/30 text-emerald-500 text-xs font-semibold">
              {formSuccess}
            </div>
          )}

          <form onSubmit={handleAddUser} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Full Name</label>
              <input
                type="text"
                placeholder="Name"
                value={newFullName}
                onChange={(e) => setNewFullName(e.target.value)}
                className="w-full bg-surface border border-outline-variant/20 rounded-xl py-3 px-4 text-on-surface text-sm font-semibold outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Email Address</label>
              <input
                type="email"
                placeholder="user@leadspree.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
                className="w-full bg-surface border border-outline-variant/20 rounded-xl py-3 px-4 text-on-surface text-sm font-semibold outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Password</label>
              <input
                type="text"
                placeholder="Choose temporary password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full bg-surface border border-outline-variant/20 rounded-xl py-3 px-4 text-on-surface text-sm font-semibold outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">User Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as "user" | "admin")}
                className="w-full bg-surface border border-outline-variant/20 rounded-xl py-3 px-4 text-on-surface text-sm font-semibold outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              >
                <option value="user">Standard User (Author)</option>
                <option value="admin">Super Admin</option>
              </select>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="submit"
                className="bg-primary hover:bg-primary-container text-on-primary font-bold px-6 py-3 rounded-xl transition-all"
              >
                Save Account
              </button>
              <button
                type="button"
                onClick={() => setShowAddForm(false)}
                className="border border-outline-variant/30 text-on-surface hover:bg-surface-container-high font-bold px-6 py-3 rounded-xl transition-all"
              >
                Cancel
              </button>
            </div>
          </form>
        </section>
      ) : activeTab === "requests" ? (
        /* Upgrade Requests Tracker Dashboard */
        <section className="bg-surface-container-low border border-outline-variant/10 rounded-3xl overflow-hidden shadow-sm">
          <div className="p-6 border-b border-outline-variant/10">
            <h3 className="text-base font-extrabold text-on-surface">Feature Access Requests</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Approve upgrade requests submitted by authors wishing to access locked modules.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left">
              <thead>
                <tr className="border-b border-outline-variant/10 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider bg-surface-container-high/30">
                  <th className="py-4 px-6">Author Profile</th>
                  <th className="py-4 px-6">Requested Module</th>
                  <th className="py-4 px-6">Request Date</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
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
                        <td className="py-4 px-6">
                          <div>
                            <p className="font-bold text-sm text-on-surface">{req.userName}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-0.5">{req.userEmail}</p>
                          </div>
                        </td>
                        <td className="py-4 px-6">
                          <span className="font-bold text-white bg-indigo-500/10 border border-indigo-500/20 px-2.5 py-1 rounded-lg">
                            {featureNames[req.feature] || req.feature}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-slate-500 dark:text-slate-400">
                          {formatDate(req.timestamp)}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                            req.status === "pending"
                              ? "bg-amber-500/10 text-amber-500 border-amber-500/20"
                              : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                          }`}>
                            {req.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          {req.status === "pending" ? (
                            <div className="flex items-center justify-end gap-2">
                              <button
                                onClick={() => handleApproveRequest(req)}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-3.5 py-1.5 rounded-lg text-xs transition-colors flex items-center gap-1.5"
                              >
                                <span className="material-symbols-outlined text-[14px]">check</span>
                                Grant Access
                              </button>
                              <button
                                onClick={() => adminResolveUpgradeRequest(req.id)}
                                className="border border-outline-variant/20 hover:bg-white/[0.04] text-slate-400 hover:text-white font-bold px-3.5 py-1.5 rounded-lg text-xs transition-colors"
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
      ) : (
        /* Users Table Dashboard */
        <section className="bg-surface-container-low border border-outline-variant/10 rounded-3xl overflow-hidden shadow-sm">
          {/* Table Controls (Search & Filters) */}
          <div className="p-6 border-b border-outline-variant/10 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="relative w-full md:w-80">
              <span className="absolute left-3 top-3.5 text-slate-400 text-sm material-symbols-outlined">search</span>
              <input
                type="text"
                placeholder="Search users by name or email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-surface border border-outline-variant/20 rounded-xl py-2.5 pl-10 pr-4 text-on-surface text-xs font-semibold outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
              />
            </div>

            <div className="flex items-center gap-3 w-full md:w-auto self-end md:self-auto">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Role</span>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value as "all" | "user" | "admin")}
                  className="bg-surface border border-outline-variant/20 rounded-lg py-1.5 px-3 text-on-surface text-xs font-semibold outline-none"
                >
                  <option value="all">All Roles</option>
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                </select>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-wider">Status</span>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "suspended")}
                  className="bg-surface border border-outline-variant/20 rounded-lg py-1.5 px-3 text-on-surface text-xs font-semibold outline-none"
                >
                  <option value="all">All Statuses</option>
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
                <tr className="border-b border-outline-variant/10 text-slate-500 dark:text-slate-400 text-[10px] font-bold uppercase tracking-wider bg-surface-container-high/30">
                  <th className="py-4 px-6">User Profile</th>
                  <th className="py-4 px-6">Registered Date</th>
                  <th className="py-4 px-6">Access Role</th>
                  <th className="py-4 px-6">Subscription Plan</th>
                  <th className="py-4 px-6">Status</th>
                  <th className="py-4 px-6 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/5">
                {filteredUsers.length > 0 ? (
                  filteredUsers.map((user) => {
                    const isSelf = currentUser?.id === user.id;
                    const isDeleting = confirmDeleteId === user.id;

                    return (
                      <tr key={user.id} className="hover:bg-surface-container-high/20 transition-colors text-xs font-semibold text-on-surface">
                        <td className="py-4 px-6 flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500/10 to-amber-500/10 border border-outline-variant/10 flex items-center justify-center text-primary font-black uppercase text-sm shrink-0">
                            {user.fullName.charAt(0)}
                          </div>
                          <div>
                            <p className="font-bold text-sm text-on-surface">{user.fullName}</p>
                            <p className="text-slate-500 dark:text-slate-400 text-xs font-medium mt-0.5">{user.email}</p>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-slate-500 dark:text-slate-400">
                          {formatDate(user.registeredAt)}
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                            user.role === "admin"
                              ? "bg-indigo-500/10 text-indigo-500 border-indigo-500/20"
                              : "bg-slate-500/10 text-slate-400 border-slate-500/20"
                          }`}>
                            {user.role}
                          </span>
                        </td>
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
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
                        <td className="py-4 px-6">
                          <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold tracking-wider uppercase border ${
                            user.status === "active"
                              ? "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                              : "bg-red-500/10 text-red-500 border-red-500/20"
                          }`}>
                            {user.status}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex items-center justify-end gap-2.5">
                            {isDeleting ? (
                              <div className="flex items-center gap-2 bg-red-950/20 p-1 px-2 rounded-lg border border-red-800/30">
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
                                  className="p-1.5 rounded-lg border border-outline-variant/10 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all"
                                >
                                  <span className="material-symbols-outlined text-sm">key</span>
                                </button>
                                <button
                                  onClick={() => handleToggleRole(user)}
                                  disabled={isSelf}
                                  title={isSelf ? "You cannot modify your own role" : `Switch to ${user.role === "admin" ? "user" : "admin"}`}
                                  className={`p-1.5 rounded-lg border border-outline-variant/10 text-slate-500 hover:text-indigo-400 hover:bg-indigo-500/10 transition-all ${isSelf ? "opacity-30 cursor-not-allowed" : ""}`}
                                >
                                  <span className="material-symbols-outlined text-sm">manage_accounts</span>
                                </button>
                                <button
                                  onClick={() => handleToggleStatus(user)}
                                  disabled={isSelf}
                                  title={isSelf ? "You cannot suspend yourself" : `${user.status === "active" ? "Suspend" : "Activate"} user`}
                                  className={`p-1.5 rounded-lg border border-outline-variant/10 text-slate-500 transition-all ${
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
                                  className={`p-1.5 rounded-lg border border-outline-variant/10 text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-all ${isSelf ? "opacity-30 cursor-not-allowed" : ""}`}
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
          <div className="relative w-full max-w-lg rounded-3xl border border-white/[0.08] bg-slate-900 p-6 md:p-8 shadow-2xl overflow-hidden">
            {/* Ambient glows inside modal */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-500/10 blur-[80px] pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-amber-500/5 blur-[80px] pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-between border-b border-white/[0.06] pb-4 mb-6">
                <div>
                  <h3 className="text-lg font-black text-white">Edit Access Permissions</h3>
                  <p className="text-xs text-slate-400 mt-1">Configure subscription plans and overrides for {editingUser.fullName}</p>
                </div>
                <button
                  onClick={() => setEditingUser(null)}
                  className="w-8 h-8 rounded-lg hover:bg-white/[0.04] text-slate-400 hover:text-white flex items-center justify-center transition-all"
                >
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>

              {/* Form Controls */}
              <div className="space-y-6">
                {/* Plan Dropdown Selection */}
                <div>
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2.5">
                    Select Access Plan
                  </label>
                  <select
                    value={selectedPlan}
                    onChange={(e) => handlePlanChange(e.target.value as UserPlan)}
                    className="w-full bg-slate-950 border border-white/[0.08] rounded-xl py-3 px-4 text-white text-sm font-semibold outline-none focus:ring-1 focus:ring-primary focus:border-primary transition-all"
                  >
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
                  <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
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
                          className="flex items-start gap-3 p-3.5 rounded-xl border border-white/[0.04] hover:bg-white/[0.02] cursor-pointer transition-colors"
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
                  className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-2.5 rounded-xl text-xs shadow-lg shadow-indigo-950/45 transition-all"
                >
                  Save Access Settings
                </button>
                <button
                  onClick={() => setEditingUser(null)}
                  className="border border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.04] font-bold px-5 py-2.5 rounded-xl text-xs transition-all"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
