import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { DATABASE_ID, workerTables } from "@/lib/appwrite/server";
import { rateLimitHealthy } from "@/lib/rate-limit";
import { encryptionAvailable } from "@/lib/secure-store";

export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const expected = process.env.WRITERDOST_CRON_SECRET || "";
  const provided =
    request.headers.get("x-cron-secret") ||
    request.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ||
    "";
  if (!expected || !provided) return false;
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

export async function GET(request: Request) {
  if (!authorized(request)) {
    return NextResponse.json({ error: "Not authorised." }, { status: 401 });
  }

  const checks: Record<string, boolean> = {
    encryption: encryptionAvailable(),
    redis: await rateLimitHealthy(),
    appwrite: false,
  };

  try {
    await workerTables().get({ databaseId: DATABASE_ID });
    checks.appwrite = true;
  } catch {
    checks.appwrite = false;
  }

  const ok = Object.values(checks).every(Boolean);
  return NextResponse.json(
    { ok, checks, checkedAt: new Date().toISOString() },
    { status: ok ? 200 : 503 },
  );
}
