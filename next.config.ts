import type { NextConfig } from "next";

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
  // Silences the multi-lockfile warning by pinning the workspace root here.
  turbopack: {
    root: __dirname,
  },

  // Do not advertise the framework version to attackers.
  poweredByHeader: false,

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
