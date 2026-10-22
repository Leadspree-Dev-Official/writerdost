import { expect, test } from "@playwright/test";

const jsonEndpoints = [
  "/api/ai",
  "/api/generate-ebook",
  "/api/generate-from-outline",
  "/api/generate-wrappers",
  "/api/draft-chapters",
  "/api/rewrite-swarm",
  "/api/translate-project",
  "/api/marketplace",
  "/api/automations/preview",
];

for (const endpoint of jsonEndpoints) {
  test(`rejects anonymous POST ${endpoint}`, async ({ request }) => {
    const response = await request.post(endpoint, { data: {} });
    expect(response.status()).toBe(401);
  });
}

test("serves a nonce-based CSP without script unsafe-inline", async ({ request }) => {
  const response = await request.get("/");
  const csp = response.headers()["content-security-policy"] || "";
  expect(csp).toContain("script-src 'self' 'nonce-");
  expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
  expect(csp).toContain("frame-ancestors 'none'");
});

test("rejects anonymous text extraction", async ({ request }) => {
  const response = await request.post("/api/extract-text", {
    multipart: {
      file: {
        name: "sample.txt",
        mimeType: "text/plain",
        buffer: Buffer.from("sample"),
      },
    },
  });
  expect(response.status()).toBe(401);
});
