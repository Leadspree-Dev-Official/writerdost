"use client";

import { useEffect } from "react";

export default function ErrorPage({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Application error", { digest: error.digest, message: error.message });
  }, [error]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="max-w-md text-center space-y-4">
        <h1 className="text-2xl font-bold">Something went wrong</h1>
        <p className="text-sm text-on-surface-variant">
          The page could not be loaded. Your saved workspace is not affected.
        </p>
        <div className="flex items-center justify-center gap-3">
          <button type="button" onClick={reset} className="btn btn-primary">
            Try again
          </button>
          <a href="mailto:contact@leadspree.in" className="btn btn-secondary">
            Contact support
          </a>
        </div>
      </div>
    </main>
  );
}
