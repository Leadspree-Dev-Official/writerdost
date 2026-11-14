"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useAppStore } from "@/lib/app-store";

const AUTH_PATHS = new Set([
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
]);

export default function ThemeWrapper() {
  const pathname = usePathname();
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const updateApiSettings = useAppStore((state) => state.updateApiSettings);

  const isAuthPage = AUTH_PATHS.has(pathname);

  // On mount, sync store state if localStorage already had a preference
  useEffect(() => {
    try {
      const saved = localStorage.getItem("writerdost_theme");
      if (saved === "dark" && !isDarkMode) {
        useAppStore.setState({ isDarkMode: true });
      } else if (saved !== "dark" && saved !== null && isDarkMode) {
        useAppStore.setState({ isDarkMode: false });
      }
    } catch {}
  }, [isDarkMode]);

  useEffect(() => {
    // Auth pages always enforce dark theme to protect cosmic visuals
    if (isAuthPage || isDarkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      if (!isAuthPage) {
        try {
          localStorage.setItem("writerdost_theme", "dark");
        } catch {}
      }
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
      try {
        localStorage.setItem("writerdost_theme", "light");
      } catch {}
    }
  }, [isDarkMode, isAuthPage]);

  useEffect(() => {
    // Safety: Reset generation status on fresh app load
    // Since client-side streams cannot survive a page refresh, 
    // we ensure the UI doesn't get stuck in a "generating" state.
    useAppStore.getState().finishGeneration();
    
    // Sync siteUrl to current origin to avoid prefetch/CORS issues in dev
    const api = useAppStore.getState().api;
    if (typeof window !== "undefined" && (!api.siteUrl || api.siteUrl !== window.location.origin)) {
      useAppStore.getState().updateApiSettings({ siteUrl: window.location.origin });
    }
  }, [updateApiSettings]);

  return null;
}
