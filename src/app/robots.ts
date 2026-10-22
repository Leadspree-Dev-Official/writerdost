import type { MetadataRoute } from "next";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/privacy", "/terms"],
      disallow: ["/api/", "/dashboard", "/editor", "/admin", "/settings", "/profile", "/projects", "/create", "/rewrite", "/blog-generator", "/automations", "/marketplace", "/help", "/login", "/signup", "/forgot-password", "/reset-password"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
