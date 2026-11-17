"use client";

import { usePathname, useRouter } from "next/navigation";
import { useEffect } from "react";
import { useAppStore } from "@/lib/app-store";
import WorkspaceSkeleton from "@/components/ui/WorkspaceSkeleton";

const PUBLIC_PATHS = new Set([
  "/",
  "/login",
  "/signup",
  "/forgot-password",
  "/reset-password",
  "/privacy",
  "/terms",
]);

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
    const isPublicPage = PUBLIC_PATHS.has(pathname);
    
    if (!currentUser && !isPublicPage) {
      router.push("/login");
    } else if (currentUser && isAuthPage) {
      router.push("/dashboard");
    } else if (currentUser && pathname.startsWith("/admin") && currentUser.role !== "admin") {
      router.push("/dashboard");
    }
  }, [currentUser, pathname, isReady, router]);

  const isPublicPage = PUBLIC_PATHS.has(pathname);

  if (!isReady && !isPublicPage) {
    return <WorkspaceSkeleton label="Connecting Workspace..." />;
  }

  // If not logged in and on a protected route, or logged in as standard user on admin route,
  // render a seamless dark loader during transition to avoid white screen flashing
  const isAuthPage = pathname === "/login" || pathname === "/signup";
  if (!currentUser && !isPublicPage) {
    return <WorkspaceSkeleton label="Redirecting to sign in..." />;
  }
  if (currentUser && isAuthPage) {
    return <WorkspaceSkeleton label="Entering Workspace..." />;
  }
  if (currentUser && pathname.startsWith("/admin") && currentUser.role !== "admin") {
    return <WorkspaceSkeleton label="Redirecting..." />;
  }

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
