export default function RootLoading() {
  return (
    <div className="min-h-screen bg-[#0c0c14] flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        <div className="relative w-12 h-12">
          <div className="absolute inset-0 rounded-full border-3 border-slate-800" />
          <div className="absolute inset-0 rounded-full border-3 border-indigo-600 border-t-amber-500 animate-spin" />
        </div>
        <p className="text-slate-400 font-bold text-xs tracking-[0.2em] uppercase animate-pulse">
          Loading…
        </p>
      </div>
    </div>
  );
}
