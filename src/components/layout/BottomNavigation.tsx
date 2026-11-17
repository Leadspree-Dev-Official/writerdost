"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import clsx from "clsx";
import { useAppStore } from "@/lib/app-store";
import { useMounted } from "@/lib/use-mounted";

export default function BottomNavigation() {
  const pathname = usePathname();
  const router = useRouter();
  const currentUser = useAppStore((state) => state.currentUser);
  const logout = useAppStore((state) => state.logout);
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const toggleDarkMode = useAppStore((state) => state.toggleDarkMode);

  const [moreOpen, setMoreOpen] = useState(false);
  const mounted = useMounted();

  // Close the sheet on route change
  const [prevPathname, setPrevPathname] = useState(pathname);
  if (prevPathname !== pathname) {
    setPrevPathname(pathname);
    setMoreOpen(false);
  }

  // Prevent background scrolling when bottom sheet is open
  useEffect(() => {
    if (moreOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [moreOpen]);

  const navItems = [
    { label: "Home", href: "/dashboard", icon: "dashboard" },
    { label: "Books", href: "/projects", icon: "menu_book" },
    { label: "New", href: "/create", icon: "add", isCenterAction: true },
    { label: "Studio", href: "/rewrite", icon: "auto_awesome_motion" },
    { label: "More", icon: "grid_view", isMoreTrigger: true },
  ];

  const handleLogout = async () => {
    setMoreOpen(false);
    await logout();
    router.push("/login");
  };

  return (
    <>
      {/* Mobile Bottom Tab Bar */}
      <nav
        aria-label="Mobile Navigation"
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-surface-container-lowest/92 dark:bg-[#090912]/95 backdrop-blur-xl border-t border-[var(--hairline)] transition-colors"
        style={{
          paddingBottom: "max(0.5rem, env(safe-area-inset-bottom))",
        }}
      >
        <div className="flex items-center justify-around h-14 px-2 max-w-md mx-auto">
          {navItems.map((item) => {
            if (item.isCenterAction) {
              const active = pathname === item.href;
              return (
                <Link
                  key={item.label}
                  href={item.href}
                  aria-label="Create new ebook"
                  className={clsx(
                    "flex flex-col items-center justify-center -translate-y-2.5 transition-transform active:scale-95 group",
                  )}
                >
                  <div
                    className={clsx(
                      "w-11 h-11 rounded-full flex items-center justify-center shadow-md transition-all",
                      active
                        ? "bg-primary text-white shadow-primary/40 ring-4 ring-primary/20"
                        : "bg-primary text-white shadow-primary/30 group-hover:scale-105",
                    )}
                  >
                    <span className="material-symbols-outlined text-[24px]">
                      auto_awesome
                    </span>
                  </div>
                  <span className="text-[10px] font-semibold text-primary mt-0.5 tracking-tight">
                    New
                  </span>
                </Link>
              );
            }

            if (item.isMoreTrigger) {
              const isMoreActive =
                moreOpen ||
                pathname.startsWith("/research") ||
                pathname.startsWith("/settings") ||
                pathname.startsWith("/profile") ||
                pathname.startsWith("/blog-generator") ||
                pathname.startsWith("/automations") ||
                pathname.startsWith("/marketplace") ||
                pathname.startsWith("/admin");

              return (
                <button
                  key={item.label}
                  type="button"
                  onClick={() => setMoreOpen(!moreOpen)}
                  aria-expanded={moreOpen}
                  aria-label="Open menu"
                  className={clsx(
                    "flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-colors active:scale-95",
                    isMoreActive
                      ? "text-primary dark:text-indigo-300"
                      : "text-on-surface-variant hover:text-on-surface",
                  )}
                >
                  <span
                    className={clsx(
                      "material-symbols-outlined text-[21px] transition-transform",
                      moreOpen && "rotate-90",
                    )}
                  >
                    {item.icon}
                  </span>
                  <span className="text-[10px] font-medium tracking-tight mt-0.5">
                    {item.label}
                  </span>
                </button>
              );
            }

            const active =
              item.href === "/dashboard"
                ? pathname === "/dashboard"
                : pathname.startsWith(item.href!);

            return (
              <Link
                key={item.label}
                href={item.href!}
                aria-current={active ? "page" : undefined}
                className={clsx(
                  "flex flex-col items-center justify-center w-14 h-12 rounded-xl transition-colors active:scale-95",
                  active
                    ? "text-primary dark:text-indigo-300 font-semibold"
                    : "text-on-surface-variant hover:text-on-surface",
                )}
              >
                <span
                  className={clsx(
                    "material-symbols-outlined text-[21px]",
                    active && "scale-105",
                  )}
                  style={
                    active
                      ? { fontVariationSettings: "'FILL' 1" }
                      : undefined
                  }
                >
                  {item.icon}
                </span>
                <span className="text-[10px] tracking-tight mt-0.5">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Slide-Up Bottom Sheet for "More" Actions */}
      <AnimatePresence>
        {moreOpen && (
          <>
            {/* Backdrop */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              onClick={() => setMoreOpen(false)}
              className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs md:hidden"
            />

            {/* Bottom Sheet Drawer */}
            <motion.div
              initial={{ y: "100%" }}
              animate={{ y: 0 }}
              exit={{ y: "100%" }}
              transition={{ type: "spring", damping: 28, stiffness: 300 }}
              className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-surface-container-lowest dark:bg-[#12121f] rounded-t-3xl border-t border-[var(--hairline-strong)] shadow-2xl overflow-hidden max-h-[85vh] flex flex-col"
              style={{
                paddingBottom: "max(1.5rem, env(safe-area-inset-bottom))",
              }}
            >
              {/* Grab Handle */}
              <div className="pt-3 pb-2 flex items-center justify-center shrink-0">
                <div className="w-10 h-1 rounded-full bg-on-surface-variant/30" />
              </div>

              {/* User Profile Card */}
              <div className="px-5 py-3 border-b border-[var(--hairline)] flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-full bg-primary/15 text-primary flex items-center justify-center font-bold text-sm shrink-0">
                    {currentUser?.fullName?.[0] || "U"}
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-on-surface truncate">
                      {currentUser?.fullName || "Author"}
                    </p>
                    <p className="text-xs text-on-surface-variant truncate">
                      {currentUser?.email || "Free Plan"}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={toggleDarkMode}
                  className="w-9 h-9 rounded-full flex items-center justify-center bg-on-surface/[0.06] text-on-surface transition-colors shrink-0"
                  aria-label="Toggle dark mode"
                >
                  <span className="material-symbols-outlined text-[18px]">
                    {mounted && isDarkMode ? "light_mode" : "dark_mode"}
                  </span>
                </button>
              </div>

              {/* Scrollable Links List */}
              <div className="overflow-y-auto px-4 py-3 space-y-1">
                <p className="text-[11px] font-bold text-on-surface-variant/75 uppercase tracking-wider px-3 py-1">
                  Workflows & Tools
                </p>

                <Link
                  href="/research"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-on-surface hover:bg-on-surface/[0.06] transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px] text-primary">
                    travel_explore
                  </span>
                  <span>Deep Research Lab</span>
                </Link>

                <Link
                  href="/blog-generator"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-on-surface hover:bg-on-surface/[0.06] transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px] text-primary">
                    edit_note
                  </span>
                  <span>Blog Draft</span>
                </Link>

                <Link
                  href="/automations"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-on-surface hover:bg-on-surface/[0.06] transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px] text-amber-500">
                    schedule_send
                  </span>
                  <div className="flex items-center gap-2">
                    <span>BlogGen Automations</span>
                    <span className="rounded-full bg-amber-500/10 dark:bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600 dark:text-amber-400">
                      Soon
                    </span>
                  </div>
                </Link>

                <Link
                  href="/marketplace"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-on-surface hover:bg-on-surface/[0.06] transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px] text-emerald-500">
                    storefront
                  </span>
                  <div className="flex items-center gap-2">
                    <span>BundleKart Marketplace</span>
                    <span className="rounded-full bg-amber-500/10 dark:bg-amber-500/20 px-1.5 py-0.5 text-[9px] font-semibold text-amber-600 dark:text-amber-400">
                      Soon
                    </span>
                  </div>
                </Link>

                <div className="my-2 border-t border-[var(--hairline)]" />

                <p className="text-[11px] font-bold text-on-surface-variant/75 uppercase tracking-wider px-3 py-1">
                  Account & Settings
                </p>

                <Link
                  href="/settings"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-on-surface hover:bg-on-surface/[0.06] transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
                    settings
                  </span>
                  <span>Settings & API Keys</span>
                </Link>

                <Link
                  href="/profile"
                  onClick={() => setMoreOpen(false)}
                  className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-on-surface hover:bg-on-surface/[0.06] transition-colors"
                >
                  <span className="material-symbols-outlined text-[20px] text-on-surface-variant">
                    account_circle
                  </span>
                  <span>Profile & Pen Name</span>
                </Link>

                {currentUser?.role === "admin" && (
                  <Link
                    href="/admin"
                    onClick={() => setMoreOpen(false)}
                    className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-indigo-500 hover:bg-indigo-500/10 transition-colors"
                  >
                    <span className="material-symbols-outlined text-[20px]">
                      shield_person
                    </span>
                    <span>Admin Control Panel</span>
                  </Link>
                )}

                <div className="my-2 border-t border-[var(--hairline)]" />

                <button
                  type="button"
                  onClick={handleLogout}
                  className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-500 hover:bg-rose-500/10 transition-colors text-left"
                >
                  <span className="material-symbols-outlined text-[20px]">
                    logout
                  </span>
                  <span>Sign out</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
