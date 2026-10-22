"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams } from "next/navigation";
import { account, appwriteMessage } from "@/lib/appwrite/client";

function ResetForm() {
  const searchParams = useSearchParams();
  const userId = searchParams.get("userId") ?? "";
  const secret = searchParams.get("secret") ?? "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    if (password.length < 8) {
      setError("Use at least 8 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("The passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await account().updateRecovery({ userId, secret, password });
      setMessage("Password updated. You can now sign in.");
    } catch (cause) {
      setError(appwriteMessage(cause, "That reset link is invalid or has expired."));
    } finally {
      setLoading(false);
    }
  };

  if (!userId || !secret) {
    return (
      <p role="alert" className="text-sm text-rose-400">
        This reset link is missing its token. Request a new one from the sign-in page.
      </p>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && <p role="alert" className="text-xs text-rose-400">{error}</p>}
      {message && <p role="status" className="text-xs text-emerald-400">{message}</p>}
      <div>
        <label htmlFor="new-password" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          New Password
        </label>
        <input id="new-password" name="password" type="password" autoComplete="new-password" required value={password} onChange={(event) => setPassword(event.target.value)} className="w-full bg-[#0c0c14]/80 border border-slate-800 rounded-lg py-3 px-4 text-slate-200 text-sm" disabled={loading} />
      </div>
      <div>
        <label htmlFor="confirm-password" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          Confirm Password
        </label>
        <input id="confirm-password" name="passwordAgain" type="password" autoComplete="new-password" required value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full bg-[#0c0c14]/80 border border-slate-800 rounded-lg py-3 px-4 text-slate-200 text-sm" disabled={loading} />
      </div>
      <button type="submit" disabled={loading} className="btn btn-primary w-full">
        {loading ? "Updating…" : "Update password"}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a12]">
      <div className="w-full max-w-md bg-[#141424]/80 border border-slate-800 rounded-2xl p-6">
        <h1 className="text-xl font-bold text-slate-100 mb-6">Choose a new password</h1>
        <Suspense fallback={<p className="text-sm text-slate-400">Loading reset link…</p>}>
          <ResetForm />
        </Suspense>
        <p className="mt-6 text-center text-xs text-slate-400">
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}
