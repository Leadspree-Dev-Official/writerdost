"use client";

import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/app-store";
import WorkspaceStatus from "@/components/WorkspaceStatus";
import { useState, useEffect, useRef } from "react";
import { calculateProjectWords } from "@/lib/app-utils";
import { AnimatePresence, motion } from "framer-motion";
import { downloadTxt, generateProjectText, triggerPdfExport, downloadDocx, downloadEpub, downloadMarkdown } from "@/lib/export-utils";

const SECTION_LABELS: Record<string, string> = {
  "/": "Home",
  "/dashboard": "Dashboard",
  "/projects": "Projects",
  "/create": "New ebook",
  "/rewrite": "Rewrite",
  "/blog-generator": "Blog draft",
  "/automations": "BlogGen",
  "/editor": "Editor",
  "/settings": "Settings",
  "/profile": "Profile",
  "/admin": "Admin",
  "/help": "Help",
};

export default function Header() {
  const pathname = usePathname();
  const projects = useAppStore((state) => state.projects);
  const currentProjectId = useAppStore((state) => state.currentProjectId);
  const currentProject = projects.find((item) => item.id === currentProjectId) ?? projects[0];
  const profile = useAppStore((state) => state.profile);
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const toggleDarkMode = useAppStore((state) => state.toggleDarkMode);
  const collapsed = useAppStore((state) => state.isGlobalSidebarCollapsed);
  const toggleSidebar = useAppStore((state) => state.toggleGlobalSidebar);
  const setManuscriptFullView = useAppStore((state) => state.setManuscriptFullView);

  const [notification, setNotification] = useState<{ message: string; type: "success" | "info" } | null>(null);
  const [exportOpen, setExportOpen] = useState(false);
  const exportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!notification) return;
    const timer = setTimeout(() => setNotification(null), 2600);
    return () => clearTimeout(timer);
  }, [notification]);

  // Close the export menu on an outside click or Escape, like any other menu.
  useEffect(() => {
    if (!exportOpen) return;
    const onPointerDown = (event: MouseEvent) => {
      if (!exportRef.current?.contains(event.target as Node)) setExportOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setExportOpen(false);
    };
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [exportOpen]);

  const showNotification = (message: string, type: "success" | "info" = "info") =>
    setNotification({ message, type });

  const sectionLabel =
    SECTION_LABELS[pathname] ??
    pathname.replace("/", "").split("-").map((w) => w[0]?.toUpperCase() + w.slice(1)).join(" ");

  const exportItems = [
    {
      label: "Word (.docx)",
      icon: "description",
      run: () => {
        if (!currentProject) return;
        downloadDocx(currentProject);
        showNotification("Word document downloaded", "success");
      },
    },
    {
      label: "EPUB (.epub)",
      icon: "menu_book",
      run: async () => {
        if (!currentProject) return;
        showNotification("Building EPUB\u2026", "info");
        try {
          await downloadEpub(currentProject, profile.penName || profile.fullName || "Writerdost AI");
          showNotification("EPUB downloaded", "success");
        } catch (error) {
          console.error("EPUB export failed", error);
          showNotification("Could not build the EPUB", "info");
        }
      },
    },
    {
      label: "PDF",
      icon: "picture_as_pdf",
      run: () => {
        // PDF export prints whatever is on screen. In the editor that would be
        // the open chapter alone, so switch to the full manuscript first —
        // that view is the one that renders the cover and every chapter.
        if (pathname === "/editor") {
          setManuscriptFullView(true);
          // Two frames plus a beat: React commits the manuscript, then the
          // browser has a chance to decode the cover image before printing.
          requestAnimationFrame(() =>
            requestAnimationFrame(() => setTimeout(triggerPdfExport, 120)),
          );
          return;
        }
        triggerPdfExport();
      },
    },
    {
      label: "Markdown (.md)",
      icon: "markdown",
      run: () => {
        if (!currentProject) return;
        downloadMarkdown(currentProject, profile.penName || profile.fullName || undefined);
        showNotification("Markdown file downloaded", "success");
      },
    },
    {
      label: "Plain text (.txt)",
      icon: "notes",
      run: () => {
        if (!currentProject) return;
        downloadTxt(`${currentProject.title.replace(/\s+/g, "_")}.txt`, generateProjectText(currentProject));
        showNotification("Text file downloaded", "success");
      },
    },
  ];

  return (
    <header className="sticky top-0 z-40 w-full h-[var(--app-header-h)] shrink-0 flex items-center justify-between gap-3 px-3 border-b border-[var(--hairline)] bg-surface/85 backdrop-blur-md">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ y: -8, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -8, opacity: 0 }}
            transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
            role="status"
            className="fixed top-[calc(var(--app-header-h)+0.5rem)] left-1/2 -translate-x-1/2 z-[100] flex items-center gap-2 px-3 h-8 rounded-[var(--radius)] bg-surface-container-lowest dark:bg-[#16162a] border border-[var(--hairline-strong)] shadow-lg"
          >
            <span
              className={`w-1.5 h-1.5 rounded-full ${notification.type === "success" ? "bg-emerald-500" : "bg-primary"}`}
            />
            <span className="text-[12.5px] font-medium text-on-surface">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center gap-2 min-w-0">
        <button
          type="button"
          onClick={toggleSidebar}
          aria-label={collapsed ? "Open sidebar" : "Close sidebar"}
          className={`btn btn-ghost btn-icon btn-sm ${collapsed ? "" : "md:hidden"}`}
        >
          <span className="material-symbols-outlined text-[17px]">
            {collapsed ? "left_panel_open" : "menu"}
          </span>
        </button>

        <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 min-w-0 text-[12.5px]">
          <span className="text-on-surface-variant shrink-0">{sectionLabel}</span>
          {pathname === "/editor" && currentProject && (
            <>
              <span className="text-on-surface-variant/45 shrink-0">/</span>
              <span className="font-semibold text-on-surface truncate">{currentProject.title}</span>
            </>
          )}
        </nav>
      </div>

      <div className="flex items-center gap-1.5">
        <WorkspaceStatus />

        {pathname === "/editor" && currentProject && (
          <>
            <span className="hidden sm:inline text-[12px] text-on-surface-variant num tabular-nums mr-1">
              {calculateProjectWords(currentProject).toLocaleString()} words
            </span>

            <div className="relative" ref={exportRef}>
              <button
                type="button"
                onClick={() => setExportOpen((open) => !open)}
                aria-haspopup="menu"
                aria-expanded={exportOpen}
                className="btn btn-primary btn-sm"
              >
                <span className="material-symbols-outlined text-[15px]">download</span>
                Export
              </button>

              {exportOpen && (
                <div
                  role="menu"
                  className="absolute right-0 top-[calc(100%+4px)] z-50 w-48 p-1 rounded-[var(--radius-lg)] bg-surface-container-lowest dark:bg-[#16162a] border border-[var(--hairline-strong)] shadow-xl no-print"
                >
                  {exportItems.map((item) => (
                    <button
                      key={item.label}
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        item.run();
                        setExportOpen(false);
                      }}
                      className="w-full flex items-center gap-2 h-7 px-2 rounded-[var(--radius)] text-[12.5px] text-on-surface hover:bg-on-surface/[0.06] transition-colors text-left"
                    >
                      <span className="material-symbols-outlined text-[16px] text-on-surface-variant">
                        {item.icon}
                      </span>
                      {item.label}
                    </button>
                  ))}
                </div>
              )}
            </div>

            <span className="w-px h-4 bg-[var(--hairline-strong)] mx-1" />
          </>
        )}

        <button
          type="button"
          onClick={toggleDarkMode}
          aria-label={isDarkMode ? "Switch to light theme" : "Switch to dark theme"}
          className="btn btn-ghost btn-icon btn-sm"
        >
          <span className="material-symbols-outlined text-[17px]">
            {isDarkMode ? "light_mode" : "dark_mode"}
          </span>
        </button>
      </div>
    </header>
  );
}
