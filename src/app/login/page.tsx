"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/lib/app-store";

export default function LoginPage() {
  const router = useRouter();
  const login = useAppStore((state) => state.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError(null);

    // Simulate small network delay for premium feel / micro-interactions
    setTimeout(() => {
      const res = login(email, password);
      setLoading(false);
      if (res.success) {
        router.push("/");
      } else {
        setError(res.error || "Authentication failed.");
      }
    }, 800);
  };

  const handleQuickAccess = (presetEmail: string, presetPass: string) => {
    setEmail(presetEmail);
    setPassword(presetPass);
    setError(null);
    setLoading(true);

    setTimeout(() => {
      const res = login(presetEmail, presetPass);
      setLoading(false);
      if (res.success) {
        router.push("/");
      } else {
        setError(res.error || "Authentication failed.");
      }
    }, 600);
  };

  return (
    <div className="w-full flex items-center justify-center font-body py-6">

      {/* Main card container */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* LeadSpree Branding */}
        <div className="flex flex-col items-center mb-5 text-center">
          <div className="relative flex items-center justify-center w-16 h-16 mb-4 rounded-[var(--radius-lg)] bg-gradient-to-br from-indigo-600 via-indigo-700 to-amber-500 shadow-xl shadow-indigo-950/50">
            {/* LeadSpree Custom SVG Icon (Lead nodes with spree line) */}
            <svg
              className="w-10 h-10 text-white animate-pulse"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M13 10V3L4 14h7v7l9-11h-7z"
              />
            </svg>
            <div className="absolute inset-0 rounded-[var(--radius-lg)] border border-white/20 scale-95" />
          </div>

          <h2 className="text-[22px] font-semibold tracking-tight text-white">
            WriterDost <span className="text-indigo-400">AI</span>
          </h2>
          <p className="text-xs uppercase text-slate-400 font-semibold mt-1.5">
            by LeadSpree
          </p>
        </div>

        {/* Form Card */}
        <div className="bg-[#141424]/60 backdrop-blur-xl border border-slate-800 rounded-[var(--radius-lg)] p-5 shadow-2xl shadow-black/40">
          <h3 className="text-xl font-bold text-slate-100 mb-4 text-center">Sign In</h3>

          {error && (
            <div className="mb-4 p-4 rounded-[var(--radius)] bg-red-950/50 border border-red-800/40 text-red-400 text-xs font-semibold flex items-start gap-2.5">
              <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Work Email Address
              </label>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="input !bg-[#0c0c14]/80 !border-slate-800 text-slate-200"
                disabled={loading}
              />
            </div>

            <div>
              <div className="flex justify-between items-center mb-2">
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider">
                  Password
                </label>
              </div>
              <input
                type="password"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input !bg-[#0c0c14]/80 !border-slate-800 text-slate-200"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg w-full"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Continue to Workspace"
              )}
            </button>
          </form>

          {/* Redirect to Register */}
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400">
              Need an account?{" "}
              <Link
                href="/signup"
                className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
              >
                Sign up here
              </Link>
            </p>
          </div>
        </div>

        {/* Demo Accounts Panel */}
        <div className="mt-6 bg-slate-900/30 border border-slate-800/40 rounded-[var(--radius-lg)] p-5 text-center">
          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-3">
            Quick Demo Accounts
          </p>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handleQuickAccess("admin@leadspree.com", "admin123")}
              disabled={loading}
              className="px-3 py-2 rounded-[var(--radius)] bg-indigo-950/30 border border-indigo-900/30 text-indigo-300 text-xs font-bold hover:bg-indigo-900/30 active:scale-95 transition-all text-left flex flex-col gap-0.5"
            >
              <span className="text-[10px] text-indigo-400/70 font-semibold uppercase">Super Admin</span>
              <span className="truncate">admin@leadspree.com</span>
            </button>
            <button
              onClick={() => handleQuickAccess("julian@example.com", "password")}
              disabled={loading}
              className="px-3 py-2 rounded-[var(--radius)] bg-amber-950/20 border border-amber-900/20 text-amber-300 text-xs font-bold hover:bg-amber-900/20 active:scale-95 transition-all text-left flex flex-col gap-0.5"
            >
              <span className="text-[10px] text-amber-400/70 font-semibold uppercase">Author</span>
              <span className="truncate">julian@example.com</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
