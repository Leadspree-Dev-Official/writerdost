export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PHASE !== "phase-production-build") {
    try {
      const { serverEnv } = await import("@/lib/env.server");
      serverEnv();
    } catch (err) {
      console.warn(
        "[Writerdost] Startup environment warning:",
        err instanceof Error ? err.message : err,
      );
    }
  }
}
