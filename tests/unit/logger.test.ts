import { describe, expect, it } from "vitest";
import pino from "pino";
import { REDACTED_PATHS } from "@/lib/logger";

describe("logger redaction", () => {
  it("redacts sensitive and proprietary fields", () => {
    let captured = "";
    const testLogger = pino(
      {
        level: "info",
        redact: {
          paths: REDACTED_PATHS,
          censor: "[REDACTED]",
        },
      },
      {
        write: (msg: string) => {
          captured += msg;
        },
      },
    );

    testLogger.info({
      apiKey: "sk-test-secret-key-12345",
      authorization: "Bearer sensitive-jwt-token",
      cookie: "session=xyz123",
      secret: "super-secret-password-val",
      token: "oauth2-token-abc",
      password: "my-plain-password",
      prompt: "Generate an exclusive book",
      manuscript: "Confidential draft chapter",
      rawErrorBody: "Raw upstream traceback containing key",
      safeInfo: "public-metadata",
    });

    const parsed = JSON.parse(captured);
    expect(parsed.apiKey).toBe("[REDACTED]");
    expect(parsed.authorization).toBe("[REDACTED]");
    expect(parsed.cookie).toBe("[REDACTED]");
    expect(parsed.secret).toBe("[REDACTED]");
    expect(parsed.token).toBe("[REDACTED]");
    expect(parsed.password).toBe("[REDACTED]");
    expect(parsed.prompt).toBe("[REDACTED]");
    expect(parsed.manuscript).toBe("[REDACTED]");
    expect(parsed.rawErrorBody).toBe("[REDACTED]");
    expect(parsed.safeInfo).toBe("public-metadata");
  });
});
