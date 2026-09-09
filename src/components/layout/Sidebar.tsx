"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import clsx from "clsx";
import { useAppStore } from "@/lib/app-store";



export default function Sidebar() {
  const pathname = usePathname();
  const projects = useAppStore((state) => state.projects);
  const currentProjectId = useAppStore((state) => state.currentProjectId);
  const isGlobalSidebarCollapsed = useAppStore((state) => state.isGlobalSidebarCollapsed);
  const toggleGlobalSidebar = useAppStore((state) => state.toggleGlobalSidebar);
  
  const currentUser = useAppStore((state) => state.currentUser);
  const logout = useAppStore((state) => state.logout);

  const currentProject = projects.find((item) => item.id === currentProjectId) ?? projects[0];

  const menuItems = [
    { name: "Dashboard", href: "/", icon: "dashboard" },
    { name: "Create Ebook", href: "/create", icon: "auto_awesome" },
    { name: "Rewrite Ebook", href: "/rewrite", icon: "book_5" },
    { name: "Blog Generator", href: "/blog-generator", icon: "edit_note" },
    { name: "My Projects", href: "/projects", icon: "menu_book" },
    { name: "AI Settings", href: "/settings", icon: "settings" },
    { name: "Author Profile", href: "/profile", icon: "account_circle" },
  ];

  if (currentUser?.role === "admin") {
    menuItems.push({ name: "Admin Panel", href: "/admin", icon: "admin_panel_settings" });
  }

  return (
    <nav className={clsx(
      "fixed left-0 top-0 h-screen flex flex-col space-y-2 z-50 transition-all duration-300 overflow-x-hidden",
      "bg-slate-50 dark:bg-[#0a0a12] border-r border-transparent dark:border-white/[0.04]",
      isGlobalSidebarCollapsed 
        ? "w-0 p-0 border-none -translate-x-full md:translate-x-0 md:w-20 md:p-4 md:items-center md:px-2 md:border-r" 
        : "w-64 p-4 translate-x-0 border-r"
    )}>
      <div className={clsx("flex items-center py-6 mb-4", isGlobalSidebarCollapsed ? "justify-center w-full flex-col gap-4 md:flex-col" : "px-0 justify-between")}>
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gradient-to-br from-primary to-primary-container rounded-lg flex items-center justify-center shrink-0 shadow-lg shadow-primary/20">
            <span className="material-symbols-outlined text-white text-xl" style={{ fontVariationSettings: "'FILL' 1" }}>
              auto_awesome
            </span>
          </div>
          {!isGlobalSidebarCollapsed && (
            <div className="ml-3">
              <h1 className="text-lg font-black text-slate-900 dark:text-white leading-none whitespace-nowrap">WriterDost AI</h1>
              <p className="text-[10px] uppercase tracking-widest text-slate-500 dark:text-indigo-400/60 font-bold mt-1 whitespace-nowrap">by LeadSpree</p>
            </div>
          )}
        </div>
        <button 
          onClick={toggleGlobalSidebar}
          className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/10 transition-colors shrink-0"
        >
          <span className="material-symbols-outlined">{isGlobalSidebarCollapsed ? 'menu' : 'menu_open'}</span>
        </button>
      </div>
      
      <div className={clsx("space-y-1 flex-1 overflow-y-auto", isGlobalSidebarCollapsed ? "w-full" : "pr-2")}>
        {menuItems.map((item) => {
          const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          
          const featureKeyMap: Record<string, "createEbook" | "rewriteEbook" | "blogGenerator" | "advancedModels"> = {
            "/create": "createEbook",
            "/rewrite": "rewriteEbook",
            "/blog-generator": "blogGenerator",
            "/settings": "advancedModels"
          };
          const featureKey = featureKeyMap[item.href];
          const isLocked = currentUser?.role !== "admin" && featureKey && currentUser?.allowedFeatures ? !currentUser.allowedFeatures[featureKey] : false;

          return (
            <Link
              key={item.name}
              href={item.href}
              title={isGlobalSidebarCollapsed ? (isLocked ? `${item.name} (Locked)` : item.name) : undefined}
              className={clsx(
                "flex items-center rounded-xl transform transition-all duration-200 relative",
                isGlobalSidebarCollapsed ? "justify-center p-3 w-12 h-12 mx-auto" : "px-4 py-2.5 justify-between",
                isActive
                  ? "bg-white dark:bg-primary/[0.12] text-primary dark:text-indigo-300 font-semibold shadow-sm dark:shadow-none dark:border dark:border-primary/10"
                  : "text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/[0.04] hover:text-primary dark:hover:text-indigo-300"
              )}
            >
              <div className="flex items-center">
                <span className={clsx("material-symbols-outlined", !isGlobalSidebarCollapsed && "mr-3")}>{item.icon}</span>
                {!isGlobalSidebarCollapsed && <span className="font-body text-sm whitespace-nowrap">{item.name}</span>}
              </div>

              {isLocked && (
                isGlobalSidebarCollapsed ? (
                  <div className="absolute top-1 right-1 w-4 h-4 bg-slate-900 border border-white/10 rounded-full flex items-center justify-center shadow">
                    <span className="material-symbols-outlined text-[10px] text-amber-500 font-bold" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                  </div>
                ) : (
                  <span className="material-symbols-outlined text-sm text-slate-400 dark:text-slate-600 ml-2" style={{ fontVariationSettings: "'FILL' 1" }}>lock</span>
                )
              )}
            </Link>
          );
        })}
      </div>
      
      {!isGlobalSidebarCollapsed && (
        <div className="rounded-2xl bg-white dark:bg-white/[0.04] p-4 shadow-sm dark:shadow-none border border-slate-100 dark:border-white/[0.06] transition-colors duration-300 shrink-0 mb-4">
          <p className="text-[10px] uppercase tracking-[0.2em] text-slate-400 dark:text-slate-500 font-bold mb-2">Active Project</p>
          <p className="text-sm font-bold text-slate-900 dark:text-white line-clamp-1">{currentProject?.title ?? "No project yet"}</p>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">{currentProject?.description ?? "Create a project to begin writing."}</p>
        </div>
      )}

      {/* User Section & Logout */}
      <div className={clsx(
        "mt-auto pt-4 border-t border-slate-200 dark:border-white/[0.06] shrink-0 flex flex-col gap-2", 
        isGlobalSidebarCollapsed ? "items-center" : ""
      )}>
        {currentUser && (
          <div className={clsx(
            "flex items-center gap-3 p-2 rounded-xl bg-slate-200/40 dark:bg-white/[0.02] border border-slate-200/20 dark:border-white/[0.02]",
            isGlobalSidebarCollapsed ? "justify-center w-12 h-12" : "w-full"
          )}>
            <div className="w-8 h-8 rounded-lg bg-indigo-500/10 text-indigo-500 flex items-center justify-center text-sm font-black uppercase shrink-0">
              {currentUser.fullName.charAt(0)}
            </div>
            {!isGlobalSidebarCollapsed && (
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">{currentUser.fullName}</p>
                <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate">{currentUser.role === 'admin' ? 'Super Admin' : currentUser.email}</p>
              </div>
            )}
          </div>
        )}

        <button
          onClick={logout}
          title={isGlobalSidebarCollapsed ? "Sign Out" : undefined}
          className={clsx(
            "flex items-center text-rose-500 hover:bg-rose-500/10 hover:text-rose-600 transform transition-all duration-200 rounded-xl cursor-pointer w-full text-left font-semibold",
            isGlobalSidebarCollapsed ? "w-12 h-12 justify-center mx-auto" : "px-4 py-2.5"
          )}
        >
          <span className={clsx("material-symbols-outlined", !isGlobalSidebarCollapsed && "mr-3")}>logout</span>
          {!isGlobalSidebarCollapsed && <span className="font-body text-sm">Sign Out</span>}
        </button>

        <Link
          href="/help"
          title={isGlobalSidebarCollapsed ? "Help Center" : undefined}
          className={clsx(
            "flex items-center text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/[0.04] transform transition-all duration-200 rounded-xl",
            isGlobalSidebarCollapsed ? "w-12 h-12 justify-center mx-auto" : "px-4 py-2.5"
          )}
        >
          <span className={clsx("material-symbols-outlined", !isGlobalSidebarCollapsed && "mr-3")}>help_outline</span>
          {!isGlobalSidebarCollapsed && <span className="font-body text-sm whitespace-nowrap">Help Center</span>}
        </Link>
      </div>
    </nav>
  );
}
