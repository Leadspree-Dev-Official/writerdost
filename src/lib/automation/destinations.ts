/**
 * Publishing adapters.
 *
 * Every CMS gets the same `GeneratedPost` and returns the same
 * `PublishResult`, so the pipeline never knows which platform it is talking
 * to. Adding a platform means adding one entry to `ADAPTERS` — nothing in the
 * pipeline or the UI changes, because the form fields are declared here too.
 *
 * Endpoints are user-supplied, so all of them go through `safeFetch`.
 */
import { safeFetch } from "@/lib/net-guard";
import type {
  Destination,
  DestinationAdapter,
  DestinationKind,
  GeneratedPost,
  PublishResult,
  PublishMode,
} from "./types";

type Mode = Exclude<PublishMode, "gated">;

/** Reads a string out of a destination's non-secret config. */
function conf(destination: Destination, key: string): string {
  const value = destination.config?.[key];
  return typeof value === "string" ? value.trim() : "";
}

function required(destination: Destination, key: string, label: string): string {
  const value = conf(destination, key);
  if (!value) throw new Error(`${destination.name}: ${label} is not configured.`);
  return value;
}

/** Normalises a site root so joining paths is predictable. */
function siteRoot(raw: string): string {
  return raw.replace(/\/+$/, "");
}

async function postJson(
  url: string,
  body: unknown,
  headers: Record<string, string>,
  label: string,
): Promise<{ status: number; json: Record<string, unknown>; raw: string }> {
  const response = await safeFetch(url, {
    method: "POST",
    label,
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

  let json: Record<string, unknown> = {};
  try {
    json = JSON.parse(response.body) as Record<string, unknown>;
  } catch {
    // Some platforms return HTML on error; keep the raw body for the message.
  }

  if (response.status >= 400) {
    const message =
      (typeof json.message === "string" && json.message) ||
      (typeof json.error === "string" && json.error) ||
      response.body.slice(0, 200) ||
      `HTTP ${response.status}`;
    throw new Error(`${label} rejected the post: ${message}`);
  }

  return { status: response.status, json, raw: response.body };
}

/* ------------------------------------------------------------------ */
/* WordPress                                                           */
/* ------------------------------------------------------------------ */

const wordpress: DestinationAdapter = {
  kind: "wordpress",
  label: "WordPress",
  fields: [
    {
      name: "siteUrl",
      label: "Site URL",
      placeholder: "https://example.com",
      required: true,
      help: "The site root. The REST endpoint /wp-json/wp/v2 is added automatically.",
    },
    { name: "username", label: "Username", required: true },
    {
      name: "secret",
      label: "Application password",
      secret: true,
      required: true,
      help: "Users → Profile → Application Passwords. Not your login password.",
    },
    { name: "categoryId", label: "Category ID", help: "Optional. Numeric category to file posts under." },
  ],
  async publish(post, destination, mode): Promise<PublishResult> {
    const site = siteRoot(required(destination, "siteUrl", "Site URL"));
    const username = required(destination, "username", "Username");
    if (!destination.secret) throw new Error(`${destination.name}: application password is missing.`);

    const auth = Buffer.from(`${username}:${destination.secret}`).toString("base64");
    const categoryId = Number(conf(destination, "categoryId"));

    const { json } = await postJson(
      `${site}/wp-json/wp/v2/posts`,
      {
        title: post.title,
        content: post.bodyHtml,
        excerpt: post.excerpt,
        slug: post.slug,
        status: mode === "publish" ? "publish" : "draft",
        ...(Number.isFinite(categoryId) && categoryId > 0 ? { categories: [categoryId] } : {}),
      },
      { Authorization: `Basic ${auth}` },
      "WordPress",
    );

    return {
      remoteId: String(json.id ?? ""),
      remoteUrl: typeof json.link === "string" ? json.link : undefined,
      state: mode === "publish" ? "published" : "draft",
    };
  },
};

/* ------------------------------------------------------------------ */
/* Ghost                                                               */
/* ------------------------------------------------------------------ */

/**
 * Ghost authenticates with a short-lived JWT signed from the admin key. The
 * token is built here rather than pulling in a Ghost SDK for one endpoint.
 */
async function ghostToken(adminKey: string): Promise<string> {
  const [id, secret] = adminKey.split(":");
  if (!id || !secret) {
    throw new Error("The Ghost admin key must be in the form <id>:<hex secret>.");
  }

  const { createHmac } = await import("node:crypto");
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "HS256", typ: "JWT", kid: id };
  const payload = { iat: now, exp: now + 300, aud: "/admin/" };
  const encode = (value: unknown) =>
    Buffer.from(JSON.stringify(value)).toString("base64url");

  const body = `${encode(header)}.${encode(payload)}`;
  const signature = createHmac("sha256", Buffer.from(secret, "hex"))
    .update(body)
    .digest("base64url");

  return `${body}.${signature}`;
}

const ghost: DestinationAdapter = {
  kind: "ghost",
  label: "Ghost",
  fields: [
    { name: "siteUrl", label: "Site URL", placeholder: "https://example.ghost.io", required: true },
    {
      name: "secret",
      label: "Admin API key",
      secret: true,
      required: true,
      help: "Settings → Integrations → Add custom integration. Format: <id>:<secret>.",
    },
  ],
  async publish(post, destination, mode): Promise<PublishResult> {
    const site = siteRoot(required(destination, "siteUrl", "Site URL"));
    if (!destination.secret) throw new Error(`${destination.name}: admin API key is missing.`);

    const token = await ghostToken(destination.secret);

    const { json } = await postJson(
      `${site}/ghost/api/admin/posts/?source=html`,
      {
        posts: [
          {
            title: post.title,
            html: post.bodyHtml,
            slug: post.slug,
            custom_excerpt: post.excerpt.slice(0, 300),
            meta_description: post.metaDescription.slice(0, 500),
            tags: post.keywords.map((name) => ({ name })),
            status: mode === "publish" ? "published" : "draft",
          },
        ],
      },
      { Authorization: `Ghost ${token}` },
      "Ghost",
    );

    const created = (json.posts as Array<Record<string, unknown>> | undefined)?.[0] ?? {};
    return {
      remoteId: String(created.id ?? ""),
      remoteUrl: typeof created.url === "string" ? created.url : undefined,
      state: mode === "publish" ? "published" : "draft",
    };
  },
};

/* ------------------------------------------------------------------ */
/* Webflow                                                             */
/* ------------------------------------------------------------------ */

const webflow: DestinationAdapter = {
  kind: "webflow",
  label: "Webflow CMS",
  fields: [
    { name: "collectionId", label: "Collection ID", required: true },
    { name: "secret", label: "API token", secret: true, required: true },
    {
      name: "fieldMap",
      label: "Field slugs",
      placeholder: "name,slug,post-body",
      help: "Optional. Title, slug and body field slugs, comma separated.",
    },
  ],
  async publish(post, destination, mode): Promise<PublishResult> {
    const collectionId = required(destination, "collectionId", "Collection ID");
    if (!destination.secret) throw new Error(`${destination.name}: API token is missing.`);

    const [titleField = "name", slugField = "slug", bodyField = "post-body"] = conf(
      destination,
      "fieldMap",
    )
      .split(",")
      .map((f) => f.trim())
      .filter(Boolean);

    const { json } = await postJson(
      `https://api.webflow.com/v2/collections/${encodeURIComponent(collectionId)}/items`,
      {
        isArchived: false,
        isDraft: mode !== "publish",
        fieldData: {
          [titleField]: post.title,
          [slugField]: post.slug,
          [bodyField]: post.bodyHtml,
        },
      },
      { Authorization: `Bearer ${destination.secret}`, "accept-version": "2.0.0" },
      "Webflow",
    );

    return {
      remoteId: String(json.id ?? ""),
      state: mode === "publish" ? "published" : "draft",
    };
  },
};

/* ------------------------------------------------------------------ */
/* Strapi                                                              */
/* ------------------------------------------------------------------ */

const strapi: DestinationAdapter = {
  kind: "strapi",
  label: "Strapi",
  fields: [
    { name: "siteUrl", label: "API URL", placeholder: "https://cms.example.com", required: true },
    { name: "collection", label: "Collection", placeholder: "articles", required: true },
    { name: "secret", label: "API token", secret: true, required: true },
  ],
  async publish(post, destination, mode): Promise<PublishResult> {
    const site = siteRoot(required(destination, "siteUrl", "API URL"));
    const collection = required(destination, "collection", "Collection");
    if (!destination.secret) throw new Error(`${destination.name}: API token is missing.`);

    const { json } = await postJson(
      `${site}/api/${encodeURIComponent(collection)}`,
      {
        data: {
          title: post.title,
          slug: post.slug,
          content: post.bodyHtml,
          excerpt: post.excerpt,
          // Strapi treats a null publishedAt as a draft.
          publishedAt: mode === "publish" ? new Date().toISOString() : null,
        },
      },
      { Authorization: `Bearer ${destination.secret}` },
      "Strapi",
    );

    const data = (json.data as Record<string, unknown> | undefined) ?? {};
    return {
      remoteId: String(data.id ?? ""),
      state: mode === "publish" ? "published" : "draft",
    };
  },
};

/* ------------------------------------------------------------------ */
/* Sanity                                                              */
/* ------------------------------------------------------------------ */

const sanity: DestinationAdapter = {
  kind: "sanity",
  label: "Sanity",
  fields: [
    { name: "projectId", label: "Project ID", required: true },
    { name: "dataset", label: "Dataset", placeholder: "production", required: true },
    { name: "docType", label: "Document type", placeholder: "post", required: true },
    { name: "secret", label: "API token", secret: true, required: true },
  ],
  async publish(post, destination, mode): Promise<PublishResult> {
    const projectId = required(destination, "projectId", "Project ID");
    const dataset = required(destination, "dataset", "Dataset");
    const docType = required(destination, "docType", "Document type");
    if (!destination.secret) throw new Error(`${destination.name}: API token is missing.`);

    // A `drafts.` id prefix is how Sanity marks a document as a draft.
    const id = `${mode === "publish" ? "" : "drafts."}${post.slug}-${Date.now().toString(36)}`;

    const { json } = await postJson(
      `https://${projectId}.api.sanity.io/v2021-06-07/data/mutate/${encodeURIComponent(dataset)}`,
      {
        mutations: [
          {
            create: {
              _id: id,
              _type: docType,
              title: post.title,
              slug: { _type: "slug", current: post.slug },
              body: post.bodyMarkdown,
              excerpt: post.excerpt,
            },
          },
        ],
      },
      { Authorization: `Bearer ${destination.secret}` },
      "Sanity",
    );

    const results = (json.results as Array<Record<string, unknown>> | undefined) ?? [];
    return {
      remoteId: String(results[0]?.id ?? id),
      state: mode === "publish" ? "published" : "draft",
    };
  },
};

/* ------------------------------------------------------------------ */
/* Generic webhook                                                     */
/* ------------------------------------------------------------------ */

const webhook: DestinationAdapter = {
  kind: "webhook",
  label: "Generic webhook",
  fields: [
    { name: "endpoint", label: "Endpoint URL", placeholder: "https://example.com/hooks/posts", required: true },
    {
      name: "secret",
      label: "Signing secret",
      secret: true,
      help: "Optional. Sent as an HMAC-SHA256 signature in x-writerdost-signature.",
    },
  ],
  async publish(post, destination, mode): Promise<PublishResult> {
    const endpoint = required(destination, "endpoint", "Endpoint URL");

    const payload = { ...post, mode, generatedAt: new Date().toISOString() };
    const body = JSON.stringify(payload);

    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (destination.secret) {
      // Signing lets the receiver verify the post really came from here.
      const { createHmac } = await import("node:crypto");
      headers["x-writerdost-signature"] = createHmac("sha256", destination.secret)
        .update(body)
        .digest("hex");
    }

    const response = await safeFetch(endpoint, {
      method: "POST",
      label: "Webhook",
      headers,
      body,
    });

    if (response.status >= 400) {
      throw new Error(`Webhook returned HTTP ${response.status}.`);
    }

    return {
      remoteId: `webhook-${Date.now().toString(36)}`,
      state: mode === "publish" ? "published" : "draft",
    };
  },
};

export const ADAPTERS: Record<DestinationKind, DestinationAdapter> = {
  wordpress,
  ghost,
  webflow,
  strapi,
  sanity,
  webhook,
};

export function getAdapter(kind: DestinationKind): DestinationAdapter {
  const adapter = ADAPTERS[kind];
  if (!adapter) throw new Error(`Unknown destination type "${kind}".`);
  return adapter;
}

/** Field definitions for the UI, without leaking any stored secret. */
export function describeAdapters() {
  return Object.values(ADAPTERS).map(({ kind, label, fields }) => ({ kind, label, fields }));
}

export async function publishPost(
  post: GeneratedPost,
  destination: Destination,
  mode: Mode,
): Promise<PublishResult> {
  return getAdapter(destination.kind).publish(post, destination, mode);
}
