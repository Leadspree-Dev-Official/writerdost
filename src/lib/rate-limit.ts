import Redis from "ioredis";
import { RateLimiterMemory, RateLimiterRedis } from "rate-limiter-flexible";

type Result = { ok: true } | { ok: false; retryAfter: number };

const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, enableOfflineQueue: false })
  : null;

redis?.on("error", () => {
  // Connection failures surface through consume(); avoid an unhandled emitter.
});

const limiters = new Map<string, RateLimiterMemory | RateLimiterRedis>();

function limiter(bucket: string, points: number, durationSeconds: number) {
  const key = `${bucket}:${points}:${durationSeconds}`;
  const existing = limiters.get(key);
  if (existing) return existing;

  const created = redis
    ? new RateLimiterRedis({
        storeClient: redis,
        keyPrefix: `writerdost:${bucket}`,
        points,
        duration: durationSeconds,
      })
    : new RateLimiterMemory({ points, duration: durationSeconds });
  limiters.set(key, created);
  return created;
}

export async function consumeRateLimit(
  userId: string,
  bucket: string,
  points: number,
  durationSeconds: number,
): Promise<Result> {
  try {
    await limiter(bucket, points, durationSeconds).consume(userId);
    return { ok: true };
  } catch (rejection) {
    if (rejection instanceof Error) throw rejection;
    const msBeforeNext = Number((rejection as { msBeforeNext?: number }).msBeforeNext ?? 1000);
    return { ok: false, retryAfter: Math.max(1, Math.ceil(msBeforeNext / 1000)) };
  }
}
