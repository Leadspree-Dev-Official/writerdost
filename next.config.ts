import type { NextConfig } from "next";
import path from "node:path";

/**
 * Applied to every response. `unsafe-inline`/`unsafe-eval` are required by
 * Next's dev overlay and the inline theme script; tighten with a nonce if the
 * app later moves to a stricter CSP.
 */
const securityHeaders = [
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "X-DNS-Prefetch-Control", value: "off" },
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), interest-cohort=()",
  },
  {
    key: "Strict-Transport-Security",
    value: "max-age=63072000; includeSubDomains; preload",
  },
];

const nextConfig: NextConfig = {
  output: process.env.VERCEL ? undefined : "standalone",
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  // Silences the multi-lockfile warning by pinning the workspace root here.
  turbopack: {
    root: __dirname,
  },

  // Client router cache staleTimes: prevents redundant RSC refetches on navigation
  experimental: {
    staleTimes: {
      dynamic: 300,
      static: 300,
    },
  },

  // Hide the on-screen dev route indicator. Build and runtime errors are still
  // surfaced; this only removes the floating badge from the corner.
  devIndicators: false,

  // Do not advertise the framework version to attackers.
  poweredByHeader: false,

  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.alias = {
      ...config.resolve.alias,
      undici: path.resolve(__dirname, "src/lib/undici-shim.ts"),
    };
    return config;
  },

  async headers() {
    // `next dev` serves some internal manifests with a JSON content type but
    // loads them as scripts, which nosniff blocks. Skip that one dev-only path;
    // production builds get the headers everywhere.
    const source =
      process.env.NODE_ENV === "development"
        ? "/((?!_next/static/development).*)"
        : "/:path*";

    return [{ source, headers: securityHeaders }];
  },
};

export default nextConfig;
