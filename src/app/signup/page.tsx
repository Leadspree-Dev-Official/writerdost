"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/lib/app-store";

export default function SignupPage() {
  const router = useRouter();
  const signup = useAppStore((state) => state.signup);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters long.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    setError(null);

    // Simulate delay for a premium interactive feel
    setTimeout(() => {
      const res = signup(fullName, email, password);
      setLoading(false);
      if (res.success) {
        router.push("/");
      } else {
        setError(res.error || "Failed to create account.");
      }
    }, 800);
  };

  return (
    <div className="w-full flex items-center justify-center font-body py-6">

      {/* Main card container */}
      <div className="relative z-10 w-full max-w-md mx-4">
        {/* LeadSpree Branding */}
        <div className="flex flex-col items-center mb-5 text-center">
          <div className="relative flex items-center justify-center w-16 h-16 mb-4 rounded-[var(--radius-lg)] bg-gradient-to-br from-indigo-600 via-indigo-700 to-amber-500 shadow-xl shadow-indigo-950/50">
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
          <h3 className="text-xl font-bold text-slate-100 mb-4 text-center">Create Account</h3>

          {error && (
            <div className="mb-4 p-4 rounded-[var(--radius)] bg-red-950/50 border border-red-800/40 text-red-400 text-xs font-semibold flex items-start gap-2.5">
              <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">error</span>
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Full Name
              </label>
              <input
                type="text"
                placeholder="Julian Thorne"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="w-full bg-[#0c0c14]/80 border border-slate-800 rounded-[var(--radius)] py-3 px-4 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-200 text-sm font-semibold outline-none transition-all"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Work Email Address
              </label>
              <input
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-[#0c0c14]/80 border border-slate-800 rounded-[var(--radius)] py-3 px-4 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-200 text-sm font-semibold outline-none transition-all"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Choose Password
              </label>
              <input
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-[#0c0c14]/80 border border-slate-800 rounded-[var(--radius)] py-3 px-4 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-200 text-sm font-semibold outline-none transition-all"
                disabled={loading}
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                placeholder="Re-enter password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full bg-[#0c0c14]/80 border border-slate-800 rounded-[var(--radius)] py-3 px-4 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-200 text-sm font-semibold outline-none transition-all"
                disabled={loading}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary btn-lg w-full mt-2"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                "Create Account & Start"
              )}
            </button>
          </form>

          {/* Redirect to Login */}
          <div className="mt-6 text-center">
            <p className="text-xs text-slate-400">
              Already have an account?{" "}
              <Link
                href="/login"
                className="text-indigo-400 hover:text-indigo-300 font-bold transition-colors"
              >
                Sign in here
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
