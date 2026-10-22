export default function Loading() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-surface" role="status" aria-live="polite">
      <div className="flex flex-col items-center gap-3">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-300 border-t-indigo-600" />
        <p className="text-sm text-on-surface-variant">Loading your workspace…</p>
      </div>
    </div>
  );
}
