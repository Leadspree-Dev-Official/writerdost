"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex items-center justify-center p-6 font-sans">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-2xl font-bold">Writerdost could not start</h1>
          <p className="text-sm text-slate-600">
            Reload the page to try again. If it keeps happening, contact contact@leadspree.in.
          </p>
          <button type="button" onClick={reset} className="rounded-lg bg-indigo-600 px-4 py-2 text-white">
            Reload
          </button>
        </div>
      </body>
    </html>
  );
}
