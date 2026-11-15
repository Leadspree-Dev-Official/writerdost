"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/lib/app-store";

interface DemoAccount {
  id: string;
  name: string;
  plan: string;
  email: string;
  badge: string;
  badgeClass: string;
  icon: string;
  iconColor: string;
  description: string;
  role: "user" | "admin";
}

const DEMO_ACCOUNTS: DemoAccount[] = [
  {
    id: "free",
    name: "Free Forever",
    plan: "Free",
    email: "demo-free@writerdost.com",
    badge: "2 Books / mo",
    badgeClass: "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
    icon: "eco",
    iconColor: "text-emerald-400",
    description: "Basic outline, book drafting & standard AI models",
    role: "user",
  },
  {
    id: "basic",
    name: "Basic Creator",
    plan: "Basic",
    email: "demo-basic@writerdost.com",
    badge: "10 Books / mo",
    badgeClass: "bg-blue-500/15 text-blue-400 border-blue-500/30",
    icon: "draw",
    iconColor: "text-blue-400",
    description: "10 books, 20 blogs, manuscript rewrite tool",
    role: "user",
  },
  {
    id: "pro",
    name: "Pro Writer",
    plan: "Pro",
    email: "demo-pro@writerdost.com",
    badge: "Popular • 50 Books",
    badgeClass: "bg-purple-500/15 text-purple-400 border-purple-500/30",
    icon: "rocket_launch",
    iconColor: "text-purple-400",
    description: "Advanced multi-agent swarms & WordPress cron automations",
    role: "user",
  },
  {
    id: "enterprise",
    name: "Enterprise Partner",
    plan: "Enterprise",
    email: "demo-enterprise@writerdost.com",
    badge: "Unlimited",
    badgeClass: "bg-amber-500/15 text-amber-400 border-amber-500/30",
    icon: "stars",
    iconColor: "text-amber-400",
    description: "Unlimited generation, custom endpoints & dedicated pipelines",
    role: "user",
  },
  {
    id: "admin",
    name: "Administrator Console",
    plan: "Enterprise (Admin)",
    email: "demo-admin@writerdost.com",
    badge: "Full Access",
    badgeClass: "bg-rose-500/15 text-rose-400 border-rose-500/30",
    icon: "admin_panel_settings",
    iconColor: "text-rose-400",
    description: "User quotas, database tables & system management panel",
    role: "admin",
  },
];

export default function LoginPage() {
  const router = useRouter();
  const login = useAppStore((state) => state.login);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [demoLoadingId, setDemoLoadingId] = useState<string | null>(null);

  const handleStandardSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      setError("Please fill in all fields.");
      return;
    }

    setLoading(true);
    setError(null);

    const res = await login(email, password);
    setLoading(false);

    if (res.success) {
      router.push("/dashboard");
    } else {
      setError(res.error || "Authentication failed.");
    }
  };

  const handle1ClickDemo = async (demo: DemoAccount) => {
    const demoPassword = "Password123!";
    setEmail(demo.email);
    setPassword(demoPassword);
    setDemoLoadingId(demo.id);
    setError(null);

    // 1. First attempt direct login
    let res = await login(demo.email, demoPassword);

    // 2. If login failed (e.g. account needs on-the-fly provision), provision via server API
    if (!res.success) {
      try {
        const provRes = await fetch("/api/demo-account", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ plan: demo.id }),
        });
        if (provRes.ok) {
          res = await login(demo.email, demoPassword);
        }
      } catch {
        // ignore and let original error show
      }
    }

    setDemoLoadingId(null);

    if (res.success) {
      if (demo.role === "admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } else {
      setError(res.error || "Could not log into demo account.");
    }
  };

  return (
    <div className="w-full flex items-center justify-center font-body py-10 px-4 min-h-[calc(100vh-80px)]">
      <div className="relative z-10 w-full max-w-5xl">
        {/* Header Branding */}
        <div className="flex flex-col items-center mb-8 text-center">
          <Link href="/" className="flex items-center gap-2.5 mb-2 group">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-primary to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-primary/25 group-hover:scale-105 transition-transform">
              <span className="material-symbols-outlined text-[26px]">auto_stories</span>
            </div>
          </Link>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-on-surface">
            Sign In to Writerdost <span className="text-primary">AI</span>
          </h1>
          <p className="text-xs sm:text-sm text-on-surface-variant font-medium mt-1">
            Autonomous Multi-Agent AI Writing &amp; Publishing Studio
          </p>
        </div>

        {/* Global Error Banner */}
        {error && (
          <div className="max-w-md mx-auto mb-6 p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-500 dark:text-red-400 text-xs font-semibold flex items-start gap-2.5 shadow-sm">
            <span className="material-symbols-outlined text-sm mt-0.5 shrink-0">error</span>
            <span>{error}</span>
          </div>
        )}

        {/* Two-Column Grid: 1-Click Demos & Standard Login */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left Column: 1-Click Demo Accounts (7 Cols) */}
          <div className="lg:col-span-7 bg-surface-container-lowest dark:bg-[#121222] border border-outline-variant/30 rounded-2xl p-6 shadow-xl">
            <div className="flex items-center justify-between gap-2 mb-4 pb-3 border-b border-outline-variant/20">
              <div className="flex items-center gap-2">
                <span className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center">
                  <span className="material-symbols-outlined text-[18px]">bolt</span>
                </span>
                <div>
                  <h2 className="text-base font-bold text-on-surface leading-tight">
                    1-Click Demo Accounts
                  </h2>
                  <p className="text-[11.5px] text-on-surface-variant">
                    Instant access to pre-configured plans. No signup or password typing required.
                  </p>
                </div>
              </div>
              <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 shrink-0">
                Live Ready
              </span>
            </div>

            {/* Demo Accounts List */}
            <div className="space-y-2.5">
              {DEMO_ACCOUNTS.map((demo) => {
                const isThisLoading = demoLoadingId === demo.id;
                return (
                  <button
                    key={demo.id}
                    type="button"
                    onClick={() => handle1ClickDemo(demo)}
                    disabled={demoLoadingId !== null || loading}
                    className="w-full text-left p-3.5 rounded-xl border border-outline-variant/30 bg-surface-container-low/40 dark:bg-[#18182e]/60 hover:border-primary/50 hover:bg-surface-container/60 transition-all duration-200 group flex items-center justify-between gap-3 cursor-pointer shadow-xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 rounded-lg bg-surface-container dark:bg-[#20203a] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                        <span className={`material-symbols-outlined text-[20px] ${demo.iconColor}`}>
                          {demo.icon}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-[13px] font-bold text-on-surface truncate">
                            {demo.name}
                          </span>
                          <span
                            className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.2 rounded-md border shrink-0 ${demo.badgeClass}`}
                          >
                            {demo.badge}
                          </span>
                        </div>
                        <p className="text-[11px] text-on-surface-variant truncate mt-0.5">
                          {demo.description}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 pl-2">
                      {isThisLoading ? (
                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11.5px] font-bold text-primary group-hover:translate-x-0.5 transition-transform">
                          <span>Enter</span>
                          <span className="material-symbols-outlined text-[15px]">arrow_forward</span>
                        </span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            <p className="text-[11px] text-on-surface-variant/70 text-center mt-4">
              Demo sessions auto-reset after testing. Your created data stays private in your active workspace.
            </p>
          </div>

          {/* Right Column: Standard Credentials Login (5 Cols) */}
          <div className="lg:col-span-5 bg-surface-container-lowest dark:bg-[#121222] border border-outline-variant/30 rounded-2xl p-6 shadow-xl">
            <h2 className="text-base font-bold text-on-surface mb-1">
              Account Credentials
            </h2>
            <p className="text-[12px] text-on-surface-variant mb-5">
              Sign in with your registered email and password.
            </p>

            <form onSubmit={handleStandardSubmit} className="space-y-4">
              <div>
                <label
                  htmlFor="login-email"
                  className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5"
                >
                  Work Email Address
                </label>
                <input
                  id="login-email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  placeholder="name@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input w-full text-[13px]"
                  disabled={loading || demoLoadingId !== null}
                />
              </div>

              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label
                    htmlFor="login-password"
                    className="block text-[11px] font-bold text-on-surface-variant uppercase tracking-wider"
                  >
                    Password
                  </label>
                  <Link
                    href="/forgot-password"
                    className="text-[11px] font-semibold text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <div className="relative">
                  <input
                    id="login-password"
                    name="password"
                    autoComplete="current-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input w-full text-[13px] pr-10"
                    disabled={loading || demoLoadingId !== null}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-pressed={showPassword}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-surface transition-colors p-1"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    <span className="material-symbols-outlined text-[17px] leading-none select-none">
                      {showPassword ? "visibility_off" : "visibility"}
                    </span>
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || demoLoadingId !== null}
                className="btn btn-primary w-full py-2.5 text-[13.5px] font-bold mt-2 shadow-md shadow-primary/25 cursor-pointer"
              >
                {loading ? (
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mx-auto" />
                ) : (
                  "Sign In to Workspace"
                )}
              </button>
            </form>

            {/* Redirect to Register */}
            <div className="mt-6 pt-4 border-t border-outline-variant/20 text-center">
              <p className="text-[12px] text-on-surface-variant">
                Don&apos;t have an account yet?{" "}
                <Link
                  href="/signup"
                  className="text-primary font-bold hover:underline transition-colors ml-1"
                >
                  Create one free
                </Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
