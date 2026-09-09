"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import clsx from "clsx";
import { useAppStore } from "@/lib/app-store";

type FeatureKey = "createEbook" | "rewriteEbook" | "blogGenerator" | "advancedModels";

/** Grouped so the nav reads as three short lists rather than one long one. */
const NAV_GROUPS: Array<{
  label: string;
  items: Array<{ name: string; href: string; icon: string; feature?: FeatureKey }>;
}> = [
  {
    label: "Workspace",
    items: [
      { name: "Dashboard", href: "/", icon: "dashboard" },
      { name: "Projects", href: "/projects", icon: "menu_book" },
    ],
  },
  {
    label: "Create",
    items: [
      { name: "New ebook", href: "/create", icon: "auto_awesome", feature: "createEbook" },
      { name: "Rewrite", href: "/rewrite", icon: "book_5", feature: "rewriteEbook" },
      { name: "Blog draft", href: "/blog-generator", icon: "edit_note", feature: "blogGenerator" },
    ],
  },
  {
    label: "Account",
    items: [
      { name: "AI settings", href: "/settings", icon: "settings", feature: "advancedModels" },
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
        <Link href="/" className="flex items-center gap-2 min-w-0">
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
                const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
                const locked = isLocked(item.feature);

                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    title={collapsed ? item.name : undefined}
                    aria-current={active ? "page" : undefined}
                    className={clsx(
                      "relative flex items-center rounded-[var(--radius)] text-[13px] transition-colors duration-100",
                      collapsed ? "justify-center h-8 w-8 mx-auto" : "h-[26px] gap-2 px-2",
                      active
                        ? "bg-primary/10 text-primary dark:bg-primary/15 dark:text-indigo-300 font-semibold"
                        : "text-on-surface-variant hover:bg-on-surface/[0.055] hover:text-on-surface",
                    )}
                  >
                    <span className="material-symbols-outlined text-[17px] shrink-0">{item.icon}</span>
                    {!collapsed && <span className="truncate">{item.name}</span>}
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

      <div className={clsx("border-t border-[var(--hairline)] shrink-0", collapsed ? "p-1.5" : "p-2")}>
        {currentUser && !collapsed && (
          <div className="flex items-center gap-2 px-1 py-1 mb-1 min-w-0">
            <span className="w-[22px] h-[22px] rounded-full bg-primary/12 text-primary flex items-center justify-center text-[11px] font-bold uppercase shrink-0">
              {currentUser.fullName.charAt(0)}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[12px] font-semibold text-on-surface truncate">
                {currentUser.fullName}
              </span>
              <span className="block text-[10.5px] text-on-surface-variant truncate">
                {currentUser.role === "admin" ? "Admin" : currentUser.plan}
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
              collapsed ? "justify-center h-8 w-8" : "flex-1 gap-2 h-[26px] px-2",
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
              collapsed ? "justify-center h-8 w-8" : "gap-2 h-[26px] px-2",
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
