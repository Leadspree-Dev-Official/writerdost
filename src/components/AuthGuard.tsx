"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppStore } from "@/lib/app-store";

export default function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const currentUser = useAppStore((state) => state.currentUser);
  const authStatus = useAppStore((state) => state.authStatus);
  const restoreSession = useAppStore((state) => state.restoreSession);

  // Nothing is stored in this browser, so there is no local hydration to wait
  // for: the session comes from Appwrite and the workspace comes with it.
  // Until that answer arrives `authStatus` is "unknown", and redirecting on it
  // would bounce a signed-in user to /login on every refresh.
  useEffect(() => {
    if (authStatus === "unknown") void restoreSession();
  }, [authStatus, restoreSession]);

  // `restoreSession` loads the workspace before it flips authStatus, so this
  // single check covers both the session and the manuscripts.
  const isReady = authStatus !== "unknown";

  useEffect(() => {
    if (!isReady) return;

    const isAuthPage = pathname === "/login" || pathname === "/signup";
    const isPublicPage = pathname === "/" || isAuthPage;
    
    if (!currentUser && !isPublicPage) {
      router.push("/login");
    } else if (currentUser && isAuthPage) {
      router.push("/dashboard");
    } else if (currentUser && pathname.startsWith("/admin") && currentUser.role !== "admin") {
      router.push("/dashboard");
    }
  }, [currentUser, pathname, isReady, router]);

  if (!isReady) {
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
  const isPublicPage = pathname === "/" || isAuthPage;
  if (!currentUser && !isPublicPage) return null;
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
  }

  return <>{children}</>;
}

import AccessLocked from "@/components/AccessLocked";
