"use client";

import { useEffect } from "react";
import { useAppStore } from "@/lib/app-store";

export default function ThemeWrapper() {
  const isDarkMode = useAppStore((state) => state.isDarkMode);
  const updateApiSettings = useAppStore((state) => state.updateApiSettings);

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
    } else {
      document.documentElement.classList.remove("dark");
      document.documentElement.classList.add("light");
    }
  }, [isDarkMode]);

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

  // The choice is part of the workspace, so it is saved to Appwrite with the
  // rest of it and follows the account to the next device.

  return null;
}
