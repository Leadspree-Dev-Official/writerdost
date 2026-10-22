import type { NextResponse } from "next/server";
import { requireUser, type Session } from "@/lib/appwrite/session";
import { enforceRateLimit } from "@/lib/route-limit";

type CostlyGuard =
  | { session: Session; denied: null }
  | { session: null; denied: NextResponse };

export async function guardCostlyRequest(
  request: Request,
  bucket: string,
  points: number,
  durationSeconds = 60,
): Promise<CostlyGuard> {
  const { session, denied } = await requireUser(request);
  if (denied) return { session: null, denied };

  const limited = await enforceRateLimit(session.user.id, bucket, points, durationSeconds);
  if (limited) return { session: null, denied: limited };

  return { session, denied: null };
}
