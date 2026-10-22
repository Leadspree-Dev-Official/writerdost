"use client";

import Link from "next/link";
import { useState } from "react";
import { account, appwriteMessage } from "@/lib/appwrite/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError(null);
    setMessage(null);
    try {
      await account().createRecovery({
        email,
        url: `${window.location.origin}/reset-password`,
      });
      setMessage("If an account exists for that email, a reset link has been sent.");
    } catch (cause) {
      setError(appwriteMessage(cause, "Could not start password recovery."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0a0a12]">
      <div className="w-full max-w-md bg-[#141424]/80 border border-slate-800 rounded-2xl p-6">
        <h1 className="text-xl font-bold text-slate-100 mb-2">Reset your password</h1>
        <p className="text-sm text-slate-400 mb-6">
          Enter the email you use for Writerdost and we will send a recovery link.
        </p>
        {error && <p role="alert" className="mb-4 text-xs text-rose-400">{error}</p>}
        {message && <p role="status" className="mb-4 text-xs text-emerald-400">{message}</p>}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="recovery-email" className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
              Work Email Address
            </label>
            <input
              id="recovery-email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              className="w-full bg-[#0c0c14]/80 border border-slate-800 rounded-lg py-3 px-4 text-slate-200 text-sm"
              disabled={loading}
            />
          </div>
          <button type="submit" disabled={loading} className="btn btn-primary w-full">
            {loading ? "Sending…" : "Send reset link"}
          </button>
        </form>
        <p className="mt-6 text-center text-xs text-slate-400">
          <Link href="/login" className="text-indigo-400 hover:text-indigo-300">
            Back to sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
