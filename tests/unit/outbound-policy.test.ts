import { describe, expect, it } from "vitest";
import { isLoopbackAddress, isPublicAddress, normalizeHost } from "@/lib/outbound-policy";
import { assertSafeUrl, BlockedRequestError } from "@/lib/net-guard";

describe("outbound address policy", () => {
  it("accepts public addresses", () => {
    expect(isPublicAddress("8.8.8.8")).toBe(true);
    expect(isPublicAddress("2606:4700:4700::1111")).toBe(true);
  });

  it("blocks private, link-local, CGNAT, and loopback ranges", () => {
    for (const address of [
      "127.0.0.1",
      "10.0.0.1",
      "172.16.0.1",
      "192.168.1.1",
      "169.254.169.254",
      "100.64.0.1",
      "::1",
      "fd00::1",
      "fe80::1",
      "::ffff:127.0.0.1",
    ]) {
      expect(isPublicAddress(address), address).toBe(false);
    }
  });

  it("recognizes loopback, including IPv4-mapped IPv6", () => {
    expect(isLoopbackAddress("127.0.0.1")).toBe(true);
    expect(isLoopbackAddress("::1")).toBe(true);
    expect(isLoopbackAddress("::ffff:7f00:1")).toBe(true);
    expect(isLoopbackAddress("8.8.8.8")).toBe(false);
  });

  it("normalizes bracketed IPv6 hosts", () => {
    expect(normalizeHost("[::1]")).toBe("::1");
  });

  it("rejects private URLs before fetching", async () => {
    await expect(assertSafeUrl("http://127.0.0.1:3000")).rejects.toBeInstanceOf(
      BlockedRequestError,
    );
  });
});
