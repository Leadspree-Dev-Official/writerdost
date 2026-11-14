import { describe, expect, it } from "vitest";
import { parseServerEnv } from "@/lib/env.server";

const valid = {
  NODE_ENV: "production",
  APPWRITE_ENDPOINT: "https://appwrite.example/v1",
  APPWRITE_PROJECT_ID: "project",
  APPWRITE_API_KEY: "key",
  APPWRITE_DATABASE_ID: "writerdost",
  WRITERDOST_ENCRYPTION_KEY: "a".repeat(44),
  WRITERDOST_CRON_SECRET: "b".repeat(64),
  REDIS_URL: "redis://redis:6379",
  WRITERDOST_ALLOW_LOCAL_AI: "false",
  WRITERDOST_SELF_HOSTED: "false",
} as NodeJS.ProcessEnv;

describe("parseServerEnv", () => {
  it("accepts a complete production configuration", () => {
    expect(parseServerEnv(valid).APPWRITE_PROJECT_ID).toBe("project");
  });

  it("accepts production configuration without Redis (optional)", () => {
    const withoutRedis: NodeJS.ProcessEnv = { ...valid };
    delete withoutRedis.REDIS_URL;
    expect(parseServerEnv(withoutRedis).APPWRITE_PROJECT_ID).toBe("project");
  });

  it("rejects local AI without self-hosted mode in production", () => {
    expect(() =>
      parseServerEnv({ ...valid, WRITERDOST_ALLOW_LOCAL_AI: "true" } as NodeJS.ProcessEnv),
    ).toThrow(/SELF_HOSTED/);
  });
});
