"use client";

import clsx from "clsx";

export function SkeletonBox({
  className,
  rounded = "rounded-[var(--radius)]",
}: {
  className?: string;
  rounded?: string;
}) {
  return (
    <div
      className={clsx(
        "bg-slate-200/70 dark:bg-white/[0.06] animate-pulse",
        rounded,
        className,
      )}
    />
  );
}

export function SettingsSkeleton() {
  return (
    <div className="space-y-6 animate-pulse">
      {/* Page Title Skeleton */}
      <div className="space-y-2">
        <SkeletonBox className="h-6 w-36" rounded="rounded-md" />
        <SkeletonBox className="h-4 w-96 max-w-full" rounded="rounded" />
      </div>

      {/* Tabs Skeleton */}
      <div className="flex items-center gap-2 border-b border-[var(--hairline)] pb-3">
        <SkeletonBox className="h-8 w-28" rounded="rounded-lg" />
        <SkeletonBox className="h-8 w-20" rounded="rounded-lg" />
        <SkeletonBox className="h-8 w-28" rounded="rounded-lg" />
      </div>

      {/* Content Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Main Credentials Panel */}
          <div className="panel p-5 space-y-4 rounded-xl border border-[var(--hairline)]">
            <div className="flex items-center justify-between">
              <SkeletonBox className="h-5 w-32" />
              <SkeletonBox className="h-4 w-24" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <div className="space-y-2">
                <SkeletonBox className="h-3 w-16" />
                <SkeletonBox className="h-10 w-full" rounded="rounded-lg" />
              </div>
              <div className="space-y-2">
                <SkeletonBox className="h-3 w-16" />
                <SkeletonBox className="h-10 w-full" rounded="rounded-lg" />
              </div>
            </div>
            <div className="space-y-2 pt-1">
              <SkeletonBox className="h-3 w-20" />
              <SkeletonBox className="h-10 w-full" rounded="rounded-lg" />
            </div>
            <div className="pt-3 border-t border-[var(--hairline)] flex items-center justify-between">
              <SkeletonBox className="h-9 w-32" rounded="rounded-lg" />
              <SkeletonBox className="h-3 w-48" />
            </div>
          </div>

          {/* Secondary Controls Panel */}
          <div className="panel p-5 space-y-4 rounded-xl border border-[var(--hairline)]">
            <SkeletonBox className="h-5 w-44" />
            <div className="space-y-3">
              <SkeletonBox className="h-4 w-full" />
              <SkeletonBox className="h-4 w-5/6" />
            </div>
          </div>
        </div>

        {/* Sidebar Info Panel */}
        <div className="space-y-5">
          <div className="panel p-5 space-y-3 rounded-xl border border-[var(--hairline)]">
            <SkeletonBox className="h-4 w-28" />
            <div className="space-y-2 pt-2">
              <div className="flex justify-between">
                <SkeletonBox className="h-3 w-16" />
                <SkeletonBox className="h-3 w-20" />
              </div>
              <div className="flex justify-between">
                <SkeletonBox className="h-3 w-14" />
                <SkeletonBox className="h-3 w-16" />
              </div>
              <div className="flex justify-between">
                <SkeletonBox className="h-3 w-16" />
                <SkeletonBox className="h-3 w-12" />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export function PageContentSkeleton() {
  return (
    <div className="page space-y-6 animate-pulse">
      {/* Title */}
      <div className="space-y-2">
        <SkeletonBox className="h-6 w-44" rounded="rounded-md" />
        <SkeletonBox className="h-4 w-80 max-w-full" rounded="rounded" />
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="p-5 rounded-xl border border-[var(--hairline)] bg-surface dark:bg-white/[0.02] space-y-3"
          >
            <div className="flex items-center gap-3">
              <SkeletonBox className="w-10 h-10" rounded="rounded-lg" />
              <div className="space-y-1.5 flex-1">
                <SkeletonBox className="h-4 w-24" />
                <SkeletonBox className="h-3 w-36" />
              </div>
            </div>
            <SkeletonBox className="h-16 w-full" rounded="rounded-lg" />
          </div>
        ))}
      </div>

      {/* Main Panel */}
      <div className="p-6 rounded-xl border border-[var(--hairline)] bg-surface dark:bg-white/[0.02] space-y-4">
        <SkeletonBox className="h-5 w-48" />
        <div className="space-y-2.5">
          <SkeletonBox className="h-3 w-full" />
          <SkeletonBox className="h-3 w-11/12" />
          <SkeletonBox className="h-3 w-4/5" />
          <SkeletonBox className="h-3 w-9/12" />
        </div>
      </div>
    </div>
  );
}

export default function WorkspaceSkeleton({
  label,
  children,
}: {
  label?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen w-full bg-[#0c0c14] text-slate-100 flex flex-col justify-between overflow-x-hidden selection:bg-primary/20">
      {/* Top Header Skeleton */}
      <header className="h-[var(--app-header-h)] border-b border-white/[0.06] flex items-center justify-between px-4 lg:px-6 bg-[#0c0c14]/90 backdrop-blur sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <SkeletonBox className="w-7 h-7 md:hidden" rounded="rounded-md" />
          <SkeletonBox className="w-28 h-4 hidden sm:block" rounded="rounded" />
        </div>
        <div className="flex items-center gap-3">
          <SkeletonBox className="w-20 h-7" rounded="rounded-full" />
          <SkeletonBox className="w-8 h-8" rounded="rounded-lg" />
          <SkeletonBox className="w-8 h-8" rounded="rounded-full" />
        </div>
      </header>

      <div className="flex flex-1">
        {/* Desktop Sidebar Skeleton */}
        <aside className="w-[var(--app-sidebar-w)] hidden md:flex flex-col border-r border-white/[0.06] p-4 bg-[#0a0a12] space-y-6 shrink-0">
          {/* Logo */}
          <div className="flex items-center gap-2.5 px-2 py-1">
            <SkeletonBox className="w-8 h-8 bg-indigo-500/20" rounded="rounded-lg" />
            <SkeletonBox className="w-24 h-4" rounded="rounded" />
          </div>

          {/* Nav Items */}
          <div className="space-y-5 flex-1">
            {/* Group 1 */}
            <div className="space-y-1.5">
              <SkeletonBox className="w-16 h-2.5 mx-2" rounded="rounded" />
              <div className="space-y-1">
                <SkeletonBox className="w-full h-8" rounded="rounded-lg" />
                <SkeletonBox className="w-full h-8" rounded="rounded-lg" />
              </div>
            </div>

            {/* Group 2 */}
            <div className="space-y-1.5">
              <SkeletonBox className="w-14 h-2.5 mx-2" rounded="rounded" />
              <div className="space-y-1">
                <SkeletonBox className="w-full h-8" rounded="rounded-lg" />
                <SkeletonBox className="w-full h-8" rounded="rounded-lg" />
                <SkeletonBox className="w-full h-8" rounded="rounded-lg" />
                <SkeletonBox className="w-full h-8" rounded="rounded-lg" />
              </div>
            </div>

            {/* Group 3 */}
            <div className="space-y-1.5">
              <SkeletonBox className="w-16 h-2.5 mx-2" rounded="rounded" />
              <div className="space-y-1">
                <SkeletonBox className="w-full h-8" rounded="rounded-lg" />
                <SkeletonBox className="w-full h-8" rounded="rounded-lg" />
              </div>
            </div>
          </div>

          {/* Bottom Card */}
          <div className="p-3 rounded-xl border border-white/[0.06] bg-white/[0.02] space-y-2">
            <SkeletonBox className="w-20 h-3" />
            <SkeletonBox className="w-full h-2" rounded="rounded-full" />
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 flex flex-col min-w-0 bg-[#0c0c14]">
          {label && (
            <div className="px-6 pt-4 pb-0 flex items-center gap-2 text-xs font-semibold text-slate-400">
              <SkeletonBox className="w-2 h-2 rounded-full bg-indigo-500 animate-ping" />
              <span>{label}</span>
            </div>
          )}
          <div className="flex-1 p-4 lg:p-6">
            {children || <PageContentSkeleton />}
          </div>
        </main>
      </div>
    </div>
  );
}
