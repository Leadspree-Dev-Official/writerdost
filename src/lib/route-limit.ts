import { NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/rate-limit";

export async function enforceRateLimit(
  userId: string,
  bucket: string,
  points: number,
  durationSeconds = 60,
): Promise<NextResponse | null> {
  try {
    const result = await consumeRateLimit(userId, bucket, points, durationSeconds);
    if (result.ok) return null;
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(result.retryAfter) } },
    );
  } catch (error) {
    console.error("Rate limiter unavailable", { bucket, error });
    return NextResponse.json(
      { error: "The service is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }
}
