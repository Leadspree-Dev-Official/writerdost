"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import clsx from "clsx";
import { useAppStore } from "@/lib/app-store";
import { CoinsIcon } from "@/components/ui/CoinsIcon";

type FeatureKey = "createEbook" | "rewriteEbook" | "blogGenerator" | "advancedModels";

/** Grouped so the nav reads as three short lists rather than one long one. */
const NAV_GROUPS: Array<{
  label: string;
  items: Array<{
    name: string;
    href: string;
    icon: string;
    feature?: FeatureKey;
    beta?: boolean;
    badge?: string;
    badgeColor?: string;
  }>;
}> = [
  {
    label: "Workspace",
    items: [
      { name: "Dashboard", href: "/dashboard", icon: "dashboard" },
      { name: "Projects", href: "/projects", icon: "menu_book" },
      { name: "Research Lab", href: "/research", icon: "travel_explore" },
    ],
  },
  {
    label: "Create",
    items: [
      { name: "New Ebook", href: "/create", icon: "auto_stories", feature: "createEbook" },
      { name: "New Book", href: "/book", icon: "menu_book", feature: "createEbook" },
      { name: "Outline & Rewrite", href: "/rewrite", icon: "auto_awesome_motion", feature: "rewriteEbook" },
      { name: "Copywriting", href: "/copywriting", icon: "campaign" },
      { name: "Blog Draft", href: "/blog-generator", icon: "edit_note", feature: "blogGenerator" },
      { name: "BlogGen", href: "/automations", icon: "schedule_send", feature: "blogGenerator", badge: "Soon" },
    ],
  },
  {
    label: "Publishing",
    items: [
      {
        name: "BundleKart Marketplace",
        href: "/marketplace",
        icon: "storefront",
        badge: "Soon",
      },
    ],
  },
  {
    label: "Account",
    items: [
      { name: "Pricing & Plans", href: "/pricing", icon: "loyalty" },
      { name: "Settings", href: "/settings", icon: "settings" },
      { name: "Profile", href: "/profile", icon: "account_circle" },
    ],
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const projects = useAppStore((state) => state.projects);
  const currentProjectId = useAppStore((state) => state.currentProjectId);
  const collapsed = useAppStore((state) => state.isGlobalSidebarCollapsed);
  const toggleSidebar = useAppStore((state) => state.toggleGlobalSidebar);
  const currentUser = useAppStore((state) => state.currentUser);
  const storeCredits = useAppStore((state) => state.userCredits);
  const userCredits = currentUser?.credits ?? storeCredits ?? 500;
  const logout = useAppStore((state) => state.logout);
  const hasAutoClosed = useRef(false);

  const currentProject = projects.find((item) => item.id === currentProjectId) ?? projects[0];

  // Below `md` the sidebar is a drawer over the content, so it must start
  // closed and close again on navigation. The collapsed flag is persisted and
  // shared with desktop, where it means "narrow rail" instead.
  const lastPath = useRef(pathname);
  useEffect(() => {
    const isMobile = window.matchMedia("(max-width: 767px)").matches;
    if (!isMobile) return;
    const navigated = lastPath.current !== pathname;
    lastPath.current = pathname;
    if (!collapsed && (navigated || !hasAutoClosed.current)) {
      hasAutoClosed.current = true;
      toggleSidebar();
    }
  }, [pathname, collapsed, toggleSidebar]);

  const groups = currentUser?.role === "admin"
    ? [...NAV_GROUPS, { label: "Admin", items: [{ name: "Control panel", href: "/admin", icon: "shield_person" }] }]
    : NAV_GROUPS;

  const isLocked = (feature?: FeatureKey) =>
    Boolean(
      feature &&
        currentUser &&
        currentUser.role !== "admin" &&
        currentUser.allowedFeatures &&
        !currentUser.allowedFeatures[feature],
    );

  return (
    <>
      {!collapsed && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={toggleSidebar}
          className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-[1px] md:hidden"
        />
      )}

      <nav
      aria-label="Main"
      className={clsx(
        "fixed left-0 top-0 h-screen z-50 flex flex-col transition-[width,transform] duration-200 overflow-x-hidden",
        "bg-surface-container-low dark:bg-[#09090f] border-r border-[var(--hairline)]",
        collapsed
          ? "w-0 -translate-x-full md:translate-x-0 md:w-[var(--app-sidebar-w-collapsed)]"
          : "w-[var(--app-sidebar-w)] translate-x-0",
      )}
    >
      {/* Brand + collapse toggle, on the same line as the header height */}
      <div
        className={clsx(
          "flex items-center h-[var(--app-header-h)] shrink-0 border-b border-[var(--hairline)]",
          collapsed ? "justify-center px-0" : "justify-between pl-3 pr-2",
        )}
      >
        <Link href="/dashboard" prefetch={true} className="flex items-center gap-2 min-w-0">
          <span className="w-[22px] h-[22px] rounded-[5px] bg-primary flex items-center justify-center shrink-0">
            <span
              className="material-symbols-outlined text-white text-[14px]"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              auto_awesome
            </span>
          </span>
          {!collapsed && (
            <span className="text-[13px] font-semibold tracking-[-0.01em] text-on-surface truncate">
              WriterDost
            </span>
          )}
        </Link>
        {!collapsed && (
          <button
            type="button"
            onClick={toggleSidebar}
            aria-label="Collapse sidebar"
            className="btn btn-ghost btn-icon btn-sm"
          >
            <span className="material-symbols-outlined text-[16px]">left_panel_close</span>
          </button>
        )}
      </div>

      <div className={clsx("flex-1 overflow-y-auto py-2", collapsed ? "px-1.5" : "px-2")}>
        {groups.map((group) => (
          <div key={group.label} className="mb-3 last:mb-0">
            {!collapsed && (
              <p className="px-2 mb-1 text-[10.5px] font-semibold tracking-[0.04em] text-on-surface-variant/75">
                {group.label}
              </p>
            )}
            <div className="space-y-px">
              {group.items.map((item) => {
                const active = item.href === "/dashboard" ? pathname === "/dashboard" : pathname.startsWith(item.href);
                const locked = isLocked(item.feature);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    prefetch={true}
                    title={collapsed ? item.name : undefined}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "relative flex items-center rounded-[var(--radius)] text-[13px] transition-colors duration-100",
                      collapsed ? "justify-center h-8 w-8 mx-auto" : "h-10 md:h-[26px] gap-2.5 md:gap-2 px-2.5 md:px-2",
                      active
                        ? "bg-primary/10 text-primary dark:bg-primary/15 dark:text-indigo-300 font-semibold"
                        : "text-on-surface-variant hover:bg-on-surface/[0.055] hover:text-on-surface",
                    )}
                  >
                    <span className="material-symbols-outlined text-[17px] shrink-0">{item.icon}</span>
                    {!collapsed && <span className="truncate">{item.name}</span>}
                    {item.beta && !collapsed && (
                      <span className="shrink-0 rounded-full bg-primary/10 px-1.5 py-px text-[9.5px] font-semibold uppercase tracking-[0.04em] text-primary dark:bg-primary/20 dark:text-indigo-300">
                        Beta
                      </span>
                    )}
                    {item.badge && !collapsed && (
                      <span
                        className={clsx(
                          "shrink-0 rounded-full px-1.5 py-px text-[9.5px] font-semibold tracking-[0.02em]",
                          item.badgeColor
                            ? item.badgeColor
                            : item.badge.toLowerCase() === "soon"
                            ? "bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400"
                            : "bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400",
                        )}
                      >
                        {item.badge}
                      </span>
                    )}
                    {locked && (
                      <span
                        className={clsx(
                          "material-symbols-outlined text-amber-500 shrink-0",
                          collapsed ? "absolute top-0 right-0 text-[11px]" : "ml-auto text-[13px]",
                        )}
                        style={{ fontVariationSettings: "'FILL' 1" }}
                        title="Upgrade required"
                      >
                        lock
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Active project: a single line of context, not a card */}
      {!collapsed && currentProject && (
        <Link
          href="/editor"
          className="mx-2 mb-1 px-2 py-1.5 rounded-[var(--radius)] hover:bg-on-surface/[0.055] transition-colors"
        >
          <p className="text-[10.5px] font-semibold text-on-surface-variant/75">Active project</p>
          <p className="text-[12.5px] font-semibold text-on-surface truncate mt-px">{currentProject.title}</p>
        </Link>
      )}

      <div
        className={clsx("border-t border-[var(--hairline)] shrink-0", collapsed ? "p-1.5" : "p-2 pb-[max(0.75rem,env(safe-area-inset-bottom))]")}
      >
        {currentUser && !collapsed && (
          <div className="flex items-center gap-2 px-1 py-1.5 mb-1 min-w-0">
            <span className="w-[24px] h-[24px] rounded-full bg-primary/12 text-primary flex items-center justify-center text-[11px] font-bold uppercase shrink-0">
              {currentUser.fullName.charAt(0)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-semibold text-on-surface truncate">
                {currentUser.fullName}
              </span>
              <span className="flex items-center gap-1 text-[10.5px] text-on-surface-variant truncate">
                <span className={`font-mono font-semibold flex items-center gap-2 ${
                  currentUser.unlimitedCredits
                    ? "text-purple-600 dark:text-purple-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}>
                  <CoinsIcon className={`w-3.5 h-3.5 shrink-0 mr-1.5 ${currentUser.unlimitedCredits ? "text-purple-500" : "text-amber-500"}`} />
                  {currentUser.unlimitedCredits ? (
                    <span className="font-bold flex items-center gap-1">
                      <span className="text-xs">∞</span>
                      <span>Unlimited</span>
                    </span>
                  ) : (
                    <span>{userCredits.toLocaleString()} credits</span>
                  )}
                </span>
                <span>•</span>
                <span>{currentUser.role === "admin" ? "Admin" : currentUser.plan}</span>
              </span>
            </span>
          </div>
        )}

        <div className={clsx("flex", collapsed ? "flex-col items-center gap-1" : "gap-1")}>
          <Link
            href="/help"
            title="Help"
            className={clsx(
              "flex items-center rounded-[var(--radius)] text-[12.5px] text-on-surface-variant hover:bg-on-surface/[0.055] hover:text-on-surface transition-colors",
              collapsed ? "justify-center h-8 w-8" : "flex-1 gap-2 h-9 md:h-[26px] px-2",
            )}
          >
            <span className="material-symbols-outlined text-[17px]">help</span>
            {!collapsed && <span>Help</span>}
          </Link>
          <button
            type="button"
            onClick={logout}
            title="Sign out"
            className={clsx(
              "flex items-center rounded-[var(--radius)] text-[12.5px] text-on-surface-variant hover:bg-error/10 hover:text-error transition-colors cursor-pointer",
              collapsed ? "justify-center h-8 w-8" : "gap-2 h-9 md:h-[26px] px-2",
            )}
          >
            <span className="material-symbols-outlined text-[17px]">logout</span>
            {!collapsed && <span>Sign out</span>}
          </button>
        </div>
      </div>
      </nav>
    </>
  );
}
