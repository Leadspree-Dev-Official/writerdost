"use client";

import { useAppStore } from "@/lib/app-store";
import clsx from "clsx";

export default function MainWrapper({ children }: { children: React.ReactNode }) {
  const collapsed = useAppStore((state) => state.isGlobalSidebarCollapsed);

  return (
    <main
      className={clsx(
        "flex flex-col min-h-screen transition-[margin] duration-200 ml-0",
        collapsed ? "md:ml-[var(--app-sidebar-w-collapsed)]" : "md:ml-[var(--app-sidebar-w)]",
      )}
    >
      {children}
    </main>
  );
}
