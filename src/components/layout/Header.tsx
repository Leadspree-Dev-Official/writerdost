"use client";
 
import { usePathname, useRouter } from "next/navigation";
import { useAppStore } from "@/lib/app-store";
import { useState, useEffect } from "react";
import { calculateProjectWords } from "@/lib/app-utils";
import { motion, AnimatePresence } from "framer-motion";
import { downloadTxt, generateProjectText, triggerPdfExport, downloadDocx } from "@/lib/export-utils";
 
export default function Header() {
  const pathname = usePathname();
  const router = useRouter();
  const projects = useAppStore((state) => state.projects);
  const currentProjectId = useAppStore((state) => state.currentProjectId);
  const finalizeProject = useAppStore((state) => state.finalizeProject);
  const currentProject = projects.find((item) => item.id === currentProjectId) ?? projects[0];
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const toggleDarkMode = useAppStore((state) => state.toggleDarkMode);
  const toggleGlobalSidebar = useAppStore((state) => state.toggleGlobalSidebar);
  
  const [notification, setNotification] = useState<{ message: string; type: "success" | "info" } | null>(null);
  const [exportOpen, setExportOpen] = useState(false);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => setNotification(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const showNotification = (message: string, type: "success" | "info" = "info") => {
    setNotification({ message, type });
  };

  const sectionLabel =
    pathname === "/"
      ? "Dashboard"
      : pathname === "/create"
      ? "Create Ebook"
      : pathname === "/rewrite"
      ? "Rewrite Ebook"
      : pathname.replace("/", "").split("-").map((word) => word[0]?.toUpperCase() + word.slice(1)).join(" ");

  return (
    <header className="sticky top-0 w-full z-40 bg-surface/70 backdrop-blur-xl flex items-center justify-between px-4 sm:px-8 h-16 border-b border-outline-variant/10 transition-colors duration-300">
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 20, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            className="fixed top-0 left-1/2 -translate-x-1/2 z-[100] px-6 py-3 rounded-full bg-surface shadow-2xl border border-outline-variant/20 flex items-center gap-3 editorial-shadow transition-colors duration-300"
          >
            <div className={`w-2 h-2 rounded-full ${notification.type === "success" ? "bg-emerald-500" : "bg-primary"} animate-pulse`} />
            <span className="text-xs font-black text-on-surface tracking-tight">{notification.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex items-center space-x-2 sm:space-x-4 min-w-0">
        <button 
          onClick={toggleGlobalSidebar}
          className="md:hidden w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 dark:text-slate-500 hover:text-primary hover:bg-primary/10 dark:hover:bg-primary/10 transition-colors shrink-0"
          type="button"
        >
          <span className="material-symbols-outlined">menu</span>
        </button>

        <span className="text-on-surface-variant text-xs font-medium truncate max-w-[80px] sm:max-w-none">{sectionLabel}</span>
        <span className="material-symbols-outlined text-outline-variant text-sm shrink-0">chevron_right</span>
        <span className="text-on-surface font-bold text-sm truncate max-w-[100px] sm:max-w-[180px] md:max-w-none">{currentProject?.title ?? "Untitled Project"}</span>
      </div>
      
      <div className="flex items-center space-x-6">
        <div className="flex items-center space-x-1">
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-white/[0.06] hidden md:block"></div>
        
        {pathname === "/editor" && currentProject ? (
          <div className="flex items-center gap-3 pr-6 border-r border-slate-100 dark:border-white/[0.06] relative group">
            {/* Status indicators */}
            <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 dark:bg-white/[0.04] rounded-lg border border-slate-100 dark:border-white/[0.06]">
              <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider">Word count</span>
              <span className="text-xs font-black text-slate-700 dark:text-slate-200">
                {calculateProjectWords(currentProject).toLocaleString()}
              </span>
            </div>
            
            <div 
              className="relative group/export"
              onMouseLeave={() => setExportOpen(false)}
            >
              <button
                 type="button"
                 onClick={() => setExportOpen(!exportOpen)}
                 className="flex items-center gap-2 px-5 py-2 bg-slate-900 dark:bg-indigo-500 text-white rounded-full text-xs font-bold shadow-xl dark:shadow-indigo-500/20 hover:scale-105 transition-all outline-none"
              >
                <span className="material-symbols-outlined text-sm">download</span>
                Export Manuscript
                <span className="material-symbols-outlined text-xs">arrow_drop_down</span>
              </button>
              
              <div className={`absolute right-0 top-full pt-2 transition-all duration-200 z-50 no-print ${
                exportOpen 
                  ? "opacity-100 translate-y-0 pointer-events-auto" 
                  : "opacity-0 translate-y-2 pointer-events-none group-hover/export:opacity-100 group-hover/export:translate-y-0 group-hover/export:pointer-events-auto"
              }`}>
                <div className="bg-white dark:bg-[#141420] rounded-2xl p-2 shadow-2xl border border-slate-100 dark:border-white/[0.06] editorial-shadow w-56">
                  <button
                    className="w-full flex items-center p-3 hover:bg-slate-50 dark:hover:bg-white/[0.04] rounded-xl transition-all text-left"
                    onClick={() => {
                      downloadDocx(currentProject);
                      showNotification("Word document generated!", "success");
                      setExportOpen(false);
                    }}
                  >
                    <span className="material-symbols-outlined text-blue-500 text-sm mr-3">description</span>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-none">Save as Word (.docx)</p>
                      <p className="text-[10px] text-slate-500 mt-1">Microsoft Word Format</p>
                    </div>
                  </button>
                  <button
                    className="w-full flex items-center p-3 hover:bg-slate-50 dark:hover:bg-white/[0.04] rounded-xl transition-all text-left mt-1"
                    onClick={() => {
                      triggerPdfExport();
                      setExportOpen(false);
                    }}
                  >
                    <span className="material-symbols-outlined text-rose-500 text-sm mr-3">picture_as_pdf</span>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-none">Save as PDF</p>
                      <p className="text-[10px] text-slate-500 mt-1">Ready for Print</p>
                    </div>
                  </button>
                  <button
                    className="w-full flex items-center p-3 hover:bg-slate-50 dark:hover:bg-white/[0.04] rounded-xl transition-all text-left mt-1 overflow-hidden"
                    onClick={() => {
                      if (currentProject) {
                        const text = generateProjectText(currentProject);
                        downloadTxt(`${currentProject.title.replace(/\s+/g, "_")}.txt`, text);
                        showNotification("Text file downloaded!", "success");
                        setExportOpen(false);
                      }
                    }}
                  >
                    <span className="material-symbols-outlined text-slate-400 text-sm mr-3">description</span>
                    <div>
                      <p className="text-xs font-bold text-slate-900 dark:text-slate-100 leading-none">Plain Text</p>
                      <p className="text-[10px] text-slate-500 mt-1">Clean .txt file</p>
                    </div>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : null}
 
        <div className="flex items-center space-x-3 ml-4">
          <button 
            className="material-symbols-outlined text-slate-400 dark:text-slate-500 hover:text-slate-600 dark:hover:text-indigo-300 transition-colors"
            onClick={toggleDarkMode}
          >
            {isDarkMode ? "light_mode" : "dark_mode"}
          </button>
          <button className="material-symbols-outlined text-slate-500 dark:text-slate-500 dark:hover:text-slate-300 transition-colors">notifications</button>
          <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-white/[0.06] border-2 border-white dark:border-white/[0.08] shadow-sm flex items-center justify-center overflow-hidden">
             <span className="material-symbols-outlined text-sm dark:text-white">person</span>
          </div>
        </div>
      </div>
    </header>
  );
}
