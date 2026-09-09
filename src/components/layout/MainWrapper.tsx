"use client";

import { useAppStore } from "@/lib/app-store";
import clsx from "clsx";

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const isGlobalSidebarCollapsed = useAppStore((state) => state.isGlobalSidebarCollapsed);
  
  return (
    <main className={clsx(
      "flex flex-col min-h-screen transition-all duration-300 ml-0",
      isGlobalSidebarCollapsed ? "md:ml-20" : "md:ml-64"
    )}>
      {children}
    </main>
  );
}
