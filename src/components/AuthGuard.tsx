"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAppStore } from "@/lib/app-store";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentUser = useAppStore((state) => state.currentUser);
  const [isHydrated, setIsHydrated] = useState(false);

  // Wait for store hydration to avoid premature redirects
  // Zustand's persist middleware fills the store on the client only. Until
  // that has happened `currentUser` is null everywhere, so redirecting before
  // this flips would bounce a signed-in user to /login on every refresh.
  useEffect(() => {
    setIsHydrated(true);
  }, []);

  useEffect(() => {
    if (!isHydrated) return;

    const isAuthPage = pathname === "/login" || pathname === "/signup";
    
    if (!currentUser && !isAuthPage) {
      router.push("/login");
    } else if (currentUser && isAuthPage) {
      router.push("/");
    } else if (currentUser && pathname.startsWith("/admin") && currentUser.role !== "admin") {
      router.push("/");
    }
  }, [currentUser, pathname, isHydrated, router]);

  if (!isHydrated) {
    return (
      <div className="min-h-screen bg-slate-955 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          {/* Glowing Spinner with LeadSpree Color Scheme */}
          <div className="relative w-14 h-14">
            <div className="absolute inset-0 rounded-full border-4 border-slate-800" />
            <div className="absolute inset-0 rounded-full border-4 border-indigo-600 border-t-amber-500 animate-spin" />
          </div>
          <p className="text-slate-400 font-bold text-xs tracking-[0.2em] uppercase animate-pulse">
            Connecting Workspace...
          </p>
        </div>
      </div>
    );
  }

  // If not logged in and on a protected route, or logged in as standard user on admin route,
  // hide children during transition to avoid content flashing
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  if (!currentUser && !isAuthPage) return null;
  if (currentUser && isAuthPage) return null;
  if (currentUser && pathname.startsWith("/admin") && currentUser.role !== "admin") return null;

  // Intercept locked features for standard users
  if (currentUser && currentUser.role !== "admin") {
    if (pathname.startsWith("/create") && !currentUser.allowedFeatures?.createEbook) {
      return <AccessLocked featureName="Create Ebook" featureKey="createEbook" />;
    }
    if (pathname.startsWith("/rewrite") && !currentUser.allowedFeatures?.rewriteEbook) {
      return <AccessLocked featureName="Rewrite Passage" featureKey="rewriteEbook" />;
    }
    if (pathname.startsWith("/blog-generator") && !currentUser.allowedFeatures?.blogGenerator) {
      return <AccessLocked featureName="Blog Generator" featureKey="blogGenerator" />;
    }
    if (pathname.startsWith("/settings") && !currentUser.allowedFeatures?.advancedModels) {
      return <AccessLocked featureName="Advanced AI Settings" featureKey="advancedModels" />;
    }
  }

  return <>{children}</>;
}

import AccessLocked from "@/components/AccessLocked";
