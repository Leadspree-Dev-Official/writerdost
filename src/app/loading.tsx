export default function Loading() {
  return (
    <div
      className="min-h-screen flex items-center justify-center bg-[#0c0c14] text-slate-100"
      role="status"
      aria-live="polite"
    >
      <div className="flex flex-col items-center gap-4">
        {/* Sleek Glowing Spinner */}
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-3 border-slate-800" />
          <div className="absolute inset-0 rounded-full border-3 border-indigo-500 border-t-amber-400 animate-spin" />
        </div>
        <p className="text-xs uppercase tracking-widest text-slate-400 font-semibold animate-pulse">
          Loading workspace…
        </p>
      </div>
    </div>
  );
}
