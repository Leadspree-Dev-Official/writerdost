import { afterEach, describe, expect, it } from "vitest";
import { decryptSecret, encryptSecret } from "@/lib/secure-store";

const keyA = Buffer.alloc(32, 1).toString("base64");
const keyB = Buffer.alloc(32, 2).toString("base64");

describe("secure-store key rotation", () => {
  afterEach(() => {
    delete process.env.WRITERDOST_ENCRYPTION_KEY;
    delete process.env.WRITERDOST_ENCRYPTION_KEY_PREVIOUS;
  });

  it("decrypts with the current key", () => {
    process.env.WRITERDOST_ENCRYPTION_KEY = keyA;
    expect(decryptSecret(encryptSecret("secret"))).toBe("secret");
  });

  it("falls back to the previous key during rotation", () => {
    process.env.WRITERDOST_ENCRYPTION_KEY = keyA;
    const payload = encryptSecret("secret");
    process.env.WRITERDOST_ENCRYPTION_KEY = keyB;
    process.env.WRITERDOST_ENCRYPTION_KEY_PREVIOUS = keyA;
    expect(decryptSecret(payload)).toBe("secret");
  });
});
