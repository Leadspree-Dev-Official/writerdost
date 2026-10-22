import { expect, test, type Page } from "@playwright/test";
import { Client, ID, Query, TablesDB, Users } from "node-appwrite";

type TestUser = {
  id: string;
  email: string;
};

const endpoint = process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const projectId =
  process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const apiKey = process.env.APPWRITE_API_KEY || "";
const password = "E2e!Passw0rd-2026";

const users = new Map<string, TestUser>();
let jwtA = "";

function adminUsers(): Users {
  return new Users(new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey));
}

async function deleteOwnedRows(userId: string): Promise<void> {
  const db = new TablesDB(
    new Client().setEndpoint(endpoint).setProject(projectId).setKey(apiKey),
  );
  const databaseId = process.env.APPWRITE_DATABASE_ID || "writerdost";
  for (const tableId of [
    "workspaces",
    "workspace_projects",
    "destinations",
    "automations",
    "generated_posts",
  ]) {
    try {
      const page = await db.listRows({
        databaseId,
        tableId,
        queries: [Query.equal("userId", userId), Query.limit(100)],
      });
      for (const row of page.rows) {
        await db.deleteRow({ databaseId, tableId, rowId: row.$id }).catch(() => {});
      }
    } catch {
      // A table may not exist in an older project schema; user deletion still proceeds.
    }
  }
}

async function createUser(label: string): Promise<TestUser> {
  const email = `e2e+${Date.now()}-${label}@example.com`;
  const created = await adminUsers().create({
    userId: ID.unique(),
    email,
    password,
    name: `E2E ${label}`,
  });
  return { id: created.$id, email };
}

async function loginAndJwt(page: Page, user: TestUser): Promise<string> {
  await page.goto("/login");
  await page.getByLabel("Work Email Address").fill(user.email);
  await page.getByLabel("Password", { exact: true }).fill(password);
  await page.getByRole("button", { name: "Continue to Workspace" }).click();
  await expect(page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

  return page.evaluate(
    async ({ endpoint, projectId }) => {
      const headers: Record<string, string> = {
        "x-appwrite-project": projectId,
        "content-type": "application/json",
      };
      const fallback = localStorage.getItem("cookieFallback");
      if (fallback) headers["x-fallback-cookies"] = fallback;

      const response = await fetch(`${endpoint}/account/jwts`, {
        method: "POST",
        credentials: "include",
        headers,
        body: "{}",
      });
      if (!response.ok) throw new Error(`JWT request failed (${response.status}).`);
      const body = (await response.json()) as { jwt?: string };
      if (!body.jwt) throw new Error("Appwrite returned no JWT.");
      return body.jwt;
    },
    { endpoint, projectId },
  );
}

test.describe.configure({ mode: "serial" });

test.beforeAll(async () => {
  if (!endpoint || !projectId || !apiKey) {
    throw new Error("Appwrite admin credentials are required for the authenticated suite.");
  }
  users.set("a", await createUser("a"));
  users.set("b", await createUser("b"));
});

test.afterAll(async () => {
  for (const user of users.values()) {
    await deleteOwnedRows(user.id);
    try {
      await adminUsers().delete({ userId: user.id });
    } catch {
      // A failed run may already have removed the disposable account.
    }
  }
});

test("a real account can sign in and reach the dashboard", async ({ page }) => {
  jwtA = await loginAndJwt(page, users.get("a")!);
  expect(jwtA.length).toBeGreaterThan(20);
});

test("the workspace is readable with a valid user JWT", async ({ request }) => {
  const response = await request.get("/api/workspace", {
    headers: { authorization: `Bearer ${jwtA}` },
  });
  expect(response.status()).toBe(200);
  const body = await response.json();
  expect(body).toHaveProperty("projects");
});

test("a workspace can be saved and reloaded", async ({ request }) => {
  const projectId = "e2e-project";
  const saved = await request.put("/api/workspace", {
    headers: { authorization: `Bearer ${jwtA}` },
    data: {
      settings: {},
      projects: [
        {
          id: projectId,
          title: "E2E project",
          description: "Persistence check",
          audience: "Testers",
          tone: "Professional",
          type: "ebook",
          progress: 10,
          status: "Drafting",
          updatedLabel: "just now",
          manuscript: "",
          coverAccent: "indigo",
          blogTitle: "",
          blogDraft: "",
          metaDescription: "",
          seoKeywords: [],
          researchSources: [],
          chapters: [
            {
              id: "e2e-chapter",
              title: "Chapter one",
              status: "In Progress",
              wordCount: 1,
              content: "<p>Hello from the authenticated E2E test.</p>",
            },
          ],
        },
      ],
    },
  });
  expect(saved.status()).toBe(200);

  const reloaded = await request.get("/api/workspace", {
    headers: { authorization: `Bearer ${jwtA}` },
  });
  expect(reloaded.status()).toBe(200);
  const body = await reloaded.json();
  expect(body.projects.some((project: { id: string }) => project.id === projectId)).toBe(true);
});

test("a user cannot preview another user's publishing destination", async ({ request, browser }) => {
  const userB = users.get("b")!;
  const context = await browser.newContext();
  const page = await context.newPage();
  const jwtB = await loginAndJwt(page, userB);
  await context.close();

  const created = await request.post("/api/destinations", {
    headers: { authorization: `Bearer ${jwtA}` },
    data: {
      name: "E2E webhook",
      kind: "webhook",
      config: { endpoint: "https://example.com/hook", secret: "e2e-secret" },
    },
  });
  expect(created.status()).toBe(201);
  const destination = (await created.json()).destination as { id: string };

  try {
    const payload = {
      automation: {
        api: { provider: "openai", apiKey: "not-used", model: "not-used" },
        sourceKind: "topic",
        sourceConfig: { topics: ["cross tenant check"] },
        contentConfig: { targetWords: 1000 },
      },
      destinationId: destination.id,
      publishNow: true,
    };
    const response = await request.post("/api/automations/preview", {
      headers: { authorization: `Bearer ${jwtB}` },
      data: payload,
    });
    expect(response.status()).toBe(404);

    // The preview limit is four per minute. The first call above is one; three
    // more reach the cap, and the fifth must be rejected without touching AI.
    for (let i = 0; i < 3; i += 1) {
      const repeat = await request.post("/api/automations/preview", {
        headers: { authorization: `Bearer ${jwtB}` },
        data: payload,
      });
      expect(repeat.status()).toBe(404);
    }
    const limited = await request.post("/api/automations/preview", {
      headers: { authorization: `Bearer ${jwtB}` },
      data: payload,
    });
    expect(limited.status()).toBe(429);
    expect(limited.headers()["retry-after"]).toBeTruthy();
  } finally {
    await request.delete(`/api/destinations/${destination.id}`, {
      headers: { authorization: `Bearer ${jwtA}` },
    });
  }
});
