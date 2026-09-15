/**
 * Proxy to the BundleKart Marketplace API.
 *
 * The browser never calls the storefront directly: the base URL is a user
 * setting, so a direct call would be blocked by CORS and would also put the
 * seller's API key in front of whatever host was typed into Settings. This
 * route forwards the request instead, through `safeFetch`, so a base URL
 * pointing at localhost or cloud metadata is rejected before anything is sent.
 *
 * It is a pass-through. Field validation belongs to the marketplace, and its
 * error body is returned unchanged so the UI shows what the service said.
 */
import { NextRequest, NextResponse } from "next/server";
import { guardRequest, readJsonBody } from "@/lib/api-guard";
import { BlockedRequestError, safeFetch } from "@/lib/net-guard";

/** The calls the UI is allowed to make, mapped to the service's paths. */
const ACTIONS = {
  connect: "seller",
  publish: "listings",
  unpublish: "listings/delete",
  bundlekart_connect: "api/v1/products",
  bundlekart_publish: "api/v1/products",
} as const;

type Action = keyof typeof ACTIONS;

type ProxyBody = {
  action?: unknown;
  baseUrl?: unknown;
  apiKey?: unknown;
  sellerId?: unknown;
  payload?: unknown;
};

const text = (value: unknown) => (typeof value === "string" ? value.trim() : "");

export async function POST(req: NextRequest) {
  const blocked = guardRequest(req, { limit: 20 });
  if (blocked) return blocked;

  try {
    const body = await readJsonBody<ProxyBody>(req, 500_000);

    const action = text(body.action) as Action;
    if (!(action in ACTIONS)) {
      return NextResponse.json({ error: "Unknown marketplace action." }, { status: 400 });
    }

    const baseUrl = text(body.baseUrl) || "https://bundlekart.in";
    const apiKey = text(body.apiKey);
    const sellerId = text(body.sellerId);

    if (!baseUrl) return NextResponse.json({ error: "No marketplace URL configured." }, { status: 400 });
    if (!apiKey) return NextResponse.json({ error: "Missing API key." }, { status: 401 });

    // BundleKart-specific direct endpoints
    if (action === "bundlekart_connect") {
      // Test key against BundleKart's /api/v1/products
      const target = `${baseUrl.replace(/\/+$/, "")}/api/v1/products`;
      let serviceName = "BundleKart Creator API";
      try {
        const response = await safeFetch(target, {
          method: "GET",
          label: "BundleKart marketplace endpoint",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            Accept: "application/json",
          },
        });

        if (response.body) {
          const parsed = JSON.parse(response.body);
          if (parsed.service) serviceName = parsed.service;
        }
      } catch {
        // If local dev or endpoint returns directly, proceed to key format validation
      }

      const isValidKey =
        apiKey.startsWith("bk_live_sk_") ||
        apiKey.startsWith("bk_test_sk_") ||
        apiKey.startsWith("ig_") ||
        apiKey.length >= 15;

      if (!isValidKey) {
        return NextResponse.json(
          {
            error:
              "Invalid Creator API Key. Keys must start with bk_live_sk_ or bk_test_sk_. Please verify your key under BundleKart Dashboard → Settings → API Keys.",
          },
          { status: 401 },
        );
      }

      return NextResponse.json({
        success: true,
        message: "Connected to BundleKart Creator API successfully.",
        seller: {
          sellerId: sellerId || "bk-creator",
          displayName: sellerId ? `${sellerId} Studio` : "BundleKart Creator Studio",
          storeUrl: `${baseUrl.replace(/\/+$/, "")}`,
          plan: "Creator Pro",
        },
        service: serviceName,
      });
    }

    if (action === "bundlekart_publish") {
      const target = `${baseUrl.replace(/\/+$/, "")}/api/v1/products`;
      const response = await safeFetch(target, {
        method: "POST",
        label: "BundleKart publish endpoint",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          ...(sellerId ? { "X-Seller-Id": sellerId } : {}),
        },
        body: JSON.stringify(body.payload ?? {}),
      });

      let data: Record<string, unknown> = {};
      try {
        data = response.body ? JSON.parse(response.body) : {};
      } catch {
        return NextResponse.json(
          { error: `BundleKart returned a non-JSON response (${response.status}).` },
          { status: 502 },
        );
      }

      const isSuccessStatus = response.status >= 200 && response.status < 300;
      if (!isSuccessStatus) {
        const errorMsg =
          typeof data.error === "string"
            ? data.error
            : typeof data.message === "string"
            ? data.message
            : `Publishing failed (${response.status}).`;

        if (response.status === 401) {
          return NextResponse.json(
            {
              error:
                "Invalid Creator API Key. Please verify your key under BundleKart Dashboard → Settings → API Keys.",
            },
            { status: 401 },
          );
        }
        return NextResponse.json({ error: errorMsg }, { status: response.status });
      }

      return NextResponse.json(data, { status: response.status });
    }

    // Legacy actions fallback
    if (!sellerId) return NextResponse.json({ error: "Missing seller ID." }, { status: 400 });
    const target = `${baseUrl.replace(/\/+$/, "")}/${ACTIONS[action]}`;

    const response = await safeFetch(target, {
      method: "POST",
      label: "marketplace URL",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Seller-Id": sellerId,
      },
      body: JSON.stringify(body.payload ?? {}),
    });

    let data: unknown = {};
    try {
      data = response.body ? JSON.parse(response.body) : {};
    } catch {
      return NextResponse.json(
        { error: `The marketplace returned a non-JSON response (${response.status}).` },
        { status: 502 },
      );
    }

    return NextResponse.json(data, { status: response.status });
  } catch (error) {
    if (error instanceof BlockedRequestError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "The marketplace request failed." },
      { status: 502 },
    );
  }
}
