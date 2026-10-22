import Link from "next/link";

export default function NotFound() {
  return (
    <main className="min-h-screen flex items-center justify-center bg-surface px-4">
      <div className="max-w-md text-center space-y-4">
        <p className="text-sm font-bold uppercase tracking-widest text-primary">404</p>
        <h1 className="text-2xl font-bold">Page not found</h1>
        <p className="text-sm text-on-surface-variant">
          That page does not exist or you no longer have access to it.
        </p>
        <Link href="/" className="btn btn-primary inline-flex">
          Return home
        </Link>
      </div>
    </main>
  );
}
