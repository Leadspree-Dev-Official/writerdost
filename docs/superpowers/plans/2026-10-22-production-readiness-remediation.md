# Writerdost AI Production Readiness Remediation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Close every Critical/High finding in the 2026-10-22 production-readiness audit, then ship a secure, recoverable, observable public launch without unverified commercial claims.

**Architecture:** The app stays on Next.js 16 + Appwrite, but all expensive routes become authenticated, all untrusted HTML is sanitized, outbound requests are default-deny and pinned, the scheduler gets atomic leases and an idempotent publish outbox, and the browser gets a local recovery buffer. Deployment is standardized on the existing standalone Node build in Docker behind Caddy, with Redis for shared rate limiting. Paid plans/billing are removed from launch scope; WordPress Connect is fixed and versioned before it ships.

**Tech Stack:** Next.js 16.4+, React 19, TypeScript, Appwrite 2.0/TablesDB, Redis, Docker, Caddy, Vitest, Playwright, axe-core, PHP/WordPress, GitHub Actions.

**Assumptions and ground rules:**
- Run every command from `writerdost-frontend/` unless a task says otherwise.
- The uncommitted working tree is preserved. Never run `git reset --hard`, `git checkout .`, or discard the current WIP. Fix it in place on `main` or a dedicated branch.
- Launch is a free/BYO-key beta with admin-granted access. No paid plans, trials, testimonials, or uptime claims are launched until they are real. Billing is a separate post-launch project.
- Deployment target is standalone Node in Docker behind Caddy on a VPS/container host, with Redis. This avoids serverless request/stream limits. The app-level limits and queue boundaries below keep a later move to Vercel feasible.
- WordPress Connect is in launch scope and must be fixed; it may run in parallel with Phases 1, 2, 4, and 5.
- A dedicated Appwrite staging project is required for destructive and cross-tenant tests. Never run tests against production.
- Every phase ends at a gate. Do not start the next phase until the gate is green and the commit is on the branch.

---

## Phase 0 — Stop the bleeding and create a release baseline

**Outcome:** The current WIP compiles, the app has a real test/CI baseline, configuration fails closed, and there is a runnable production container. This phase is a prerequisite for every security fix.

### Task 0.1: Restore a green production build without discarding WIP

**Files:**
- Modify: `src/app/api/generate-from-outline/route.ts:138-139`
- Modify: `src/app/api/rewrite-swarm/route.ts:83-84`
- Modify: `src/lib/ebook-standards.ts:34`
- Test: `npm run build`, `npx tsc --noEmit`

- [ ] **Step 1: Confirm the failure**

Run:
```bash
npx tsc --noEmit
```
Expected: FAIL with `TS1109: Expression expected` in the three files above.

- [ ] **Step 2: Escape the backticks inside the template literals**

Change the three prompt strings to escaped backticks. The exact replacements are:

```ts
// generate-from-outline/route.ts around line 138
3. DO NOT use \`>\` blockquotes. Use bold callouts (**Core Insight:**) for key takeaways.
4. DO NOT output blank table cells, empty worksheet rows, or placeholder pipes (e.g. \`||||\`).
```

```ts
// rewrite-swarm/route.ts around line 83
4. DO NOT use \`>\` blockquotes. Use bold emphasis (**Core Principle:**) for key insights.
5. DO NOT leave blank table cells or empty placeholder rows (e.g. \`||||\`).
```

```ts
// ebook-standards.ts around line 34
- NEVER generate blank tables, empty worksheet rows, or placeholder pipes (e.g. \`||||\` or \`| Col 1 | |\`).
- DO NOT use \`>\` blockquotes anywhere in the manuscript.
```

- [ ] **Step 3: Verify the compiler and build**

Run:
```bash
npx tsc --noEmit
npm run build
```
Expected: both exit 0.

- [ ] **Step 4: Commit the repaired WIP**

```bash
git add src/app/api/generate-from-outline/route.ts \
  src/app/api/rewrite-swarm/route.ts \
  src/lib/ebook-standards.ts \
  src/app/api/generate-ebook/route.ts \
  src/app/api/generate-wrappers/route.ts \
  src/app/editor/page.tsx src/app/globals.css src/app/rewrite/page.tsx \
  src/components/CoverSettings.tsx src/components/DesignSettings.tsx \
  src/components/layout/Header.tsx src/components/layout/LayoutWrapper.tsx \
  src/components/layout/Sidebar.tsx src/components/ui/Editor.tsx \
  src/lib/app-store.ts src/lib/markdown-utils.ts \
  src/components/ProjectMetrics.tsx
git commit -m "fix: preserve WIP and restore a parseable build"
```

### Task 0.2: Make lint a real gate

**Files:**
- Modify: `src/lib/marketplace.ts:432-445`
- Modify: `src/app/marketplace/page.tsx` (remove unused `Project` import)
- Modify: `src/components/BundleKartPublishModal.tsx` (remove unused `useMemo` import)
- Modify: `src/components/ThemeWrapper.tsx` (effect dependency)
- Test: `npm run lint`
- Optional: `eslint.config.mjs` only if a rule is genuinely wrong; do not disable `no-explicit-any` globally.

- [ ] **Step 1: Run lint and record the pre-existing errors**

Run:
```bash
npm run lint
```
Expected: 3 errors at `marketplace.ts:432`, `:436`, `:445`, plus any new errors.

- [ ] **Step 2: Replace `any` with narrow record parsing**

Add near the top of `marketplace.ts`:

```ts
function asRecord(value: unknown): Record<string, unknown> {
  return typeof value === "object" && value !== null ? (value as Record<string, unknown>) : {};
}
```

Replace the three mapped branches with:

```ts
deliverables:
  Array.isArray(parsed.deliverables) && parsed.deliverables.length > 0
    ? parsed.deliverables
        .map((raw) => {
          const item = asRecord(raw);
          return {
            name: String(item.name ?? ""),
            format: String(item.format ?? ""),
            description: String(item.description ?? ""),
          };
        })
        .filter((item) => item.name.length > 0)
    : fallback.deliverables,
bonuses:
  Array.isArray(parsed.bonuses) && parsed.bonuses.length > 0
    ? parsed.bonuses.map((raw) => {
        const item = asRecord(raw);
        return {
          title: String(item.title || "Bonus Vault"),
          description: String(item.description || "Exclusive resource"),
          valueInr: Number(item.valueInr) || 499,
          valueUsd: Number(item.valueUsd) || 9,
        };
      })
    : fallback.bonuses,
faqs:
  Array.isArray(parsed.faqs) && parsed.faqs.length > 0
    ? parsed.faqs.map((raw) => {
        const item = asRecord(raw);
        return { q: String(item.q || ""), a: String(item.a || "") };
      })
    : fallback.faqs,
```

- [ ] **Step 3: Clear the non-blocking warnings**

Remove the unused imports flagged by ESLint: `Project` in `src/app/marketplace/page.tsx`, `useMemo` in `src/components/BundleKartPublishModal.tsx`, and `BundleKartDeliverableFile`/`BundleKartLandingPageConfig` in `src/lib/marketplace.ts`. In `src/components/ThemeWrapper.tsx`, add `isDarkMode` to the effect dependency array so the class toggle reruns when the state changes.

The `react-hooks/purity` `Date.now()` warnings are already configured as non-blocking in `eslint.config.mjs`; leave them as warnings rather than disabling the rule or changing generation behavior.

- [ ] **Step 4: Verify lint and typecheck**

Run:
```bash
npm run lint
npx tsc --noEmit
```
Expected: exit 0 for both. React purity warnings are warnings, not errors.

- [ ] **Step 5: Commit**

```bash
git add src/lib/marketplace.ts src/app/marketplace/page.tsx \
  src/components/BundleKartPublishModal.tsx src/components/ThemeWrapper.tsx
git commit -m "fix: remove explicit any and clear lint warnings"
```

### Task 0.3: Add unit, browser, and accessibility test infrastructure

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `playwright.config.ts`
- Create: `tests/setup.ts`
- Create: `tests/unit/app-utils.test.ts`
- Create: `e2e/public.spec.ts`
- Modify: `.gitignore`

- [ ] **Step 1: Install the test stack**

```bash
npm install -D vitest vite-tsconfig-paths @testing-library/react @testing-library/jest-dom jsdom @playwright/test @axe-core/playwright
npx playwright install chromium
```

- [ ] **Step 2: Add scripts**

In `package.json`, add:

```json
"typecheck": "tsc --noEmit",
"test": "npm run test:unit",
"test:unit": "vitest run",
"test:unit:watch": "vitest",
"test:e2e": "playwright test",
"test:e2e:ui": "playwright test --ui"
```

- [ ] **Step 3: Add Vitest configuration**

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    setupFiles: ["./tests/setup.ts"],
    include: ["tests/**/*.test.ts"],
    passWithNoTests: false,
  },
});
```

Create `tests/setup.ts`:

```ts
import "@testing-library/jest-dom/vitest";
```

Create `tests/unit/app-utils.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { slugify } from "@/lib/app-utils";

describe("slugify", () => {
  it("creates a stable slug", () => {
    expect(slugify("  Hello, WriterDost!  ")).toBe("hello-writerdost");
  });
});
```

- [ ] **Step 4: Add Playwright configuration and a public smoke test**

Create `playwright.config.ts`:

```ts
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "on-first-retry",
  },
  webServer: {
    command: "npm run dev -- -p 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 180_000,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["iPhone 13"] } },
  ],
});
```

Create `e2e/public.spec.ts`:

```ts
import { expect, test } from "@playwright/test";

test("landing page renders", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveTitle(/Writerdost/i);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("login page renders", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByPlaceholder("you@company.com")).toBeVisible();
  await expect(page.getByPlaceholder("••••••••")).toBeVisible();
});
```

The label-association and axe assertions are added in Task 5.1 after the forms are fixed; do not make the Phase 0 gate fail on known a11y debt.

- [ ] **Step 5: Ignore test artifacts**

Append to `.gitignore`:

```gitignore
/coverage
/playwright-report
/test-results
```

- [ ] **Step 6: Verify the baseline tests**

```bash
npm run test:unit
npm run test:e2e -- --project=chromium e2e/public.spec.ts
```

Expected: unit test passes; both Playwright tests pass on the current landing/login implementation.

- [ ] **Step 7: Commit**

```bash
git add package.json package-lock.json vitest.config.ts playwright.config.ts tests e2e .gitignore
git commit -m "test: add unit, browser, and accessibility baseline"
```

### Task 0.4: Add CI with build, type, lint, test, and secret gates

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `.github/dependabot.yml`

- [ ] **Step 1: Add the CI workflow**

Create `.github/workflows/ci.yml`:

```yaml
name: ci

on:
  pull_request:
  push:
    branches: [main]

concurrency:
  group: ci-${{ github.ref }}
  cancel-in-progress: true

jobs:
  checks:
    runs-on: ubuntu-latest
    timeout-minutes: 25
    env:
      APPWRITE_ENDPOINT: https://example.appwrite.test/v1
      NEXT_PUBLIC_APPWRITE_ENDPOINT: https://example.appwrite.test/v1
      APPWRITE_PROJECT_ID: ci-project
      NEXT_PUBLIC_APPWRITE_PROJECT_ID: ci-project
      APPWRITE_API_KEY: ci-api-key-placeholder
      APPWRITE_DATABASE_ID: writerdost
      WRITERDOST_ENCRYPTION_KEY: AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=
      WRITERDOST_CRON_SECRET: 0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
      REDIS_URL: redis://localhost:6379
      WRITERDOST_ALLOW_LOCAL_AI: "false"
      WRITERDOST_SELF_HOSTED: "false"
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
      - run: npm ci
      - run: npm run typecheck
      - run: npm run lint
      - run: npm run test:unit
      - run: npm run build
      - run: npx playwright install --with-deps chromium
      - run: npm run test:e2e -- --project=chromium e2e/public.spec.ts
      - name: Secret scan
        uses: trufflesecurity/trufflehog@main
        with:
          extra_args: --only-verified
```

The dependency audit is intentionally added in Task 1.8, because the current critical Next.js advisory would fail CI before the patched upgrade is installed. Do not mark Gate 0 green by suppressing it.

- [ ] **Step 2: Add dependency updates**

Create `.github/dependabot.yml`:

```yaml
version: 2
updates:
  - package-ecosystem: npm
    directory: /
    schedule:
      interval: weekly
    open-pull-requests-limit: 5
    groups:
      next:
        patterns: ["next", "eslint-config-next"]
      tiptap:
        patterns: ["@tiptap/*"]
  - package-ecosystem: github-actions
    directory: /
    schedule:
      interval: weekly
```

- [ ] **Step 3: Require the checks in branch protection**

In GitHub repository settings, require the `checks` job for `main` and disallow direct pushes. Document the change in `README.md`.

- [ ] **Step 4: Verify CI on a pull request**

Open a draft PR with this plan and the Phase 0 changes. Expected: all checks pass. If `npm run build` needs an external font fetch, keep it enabled; CI has network access.

- [ ] **Step 5: Commit**

```bash
git add .github/workflows/ci.yml .github/dependabot.yml README.md
git commit -m "ci: require build, type, lint, test, audit, and secret gates"
```

### Task 0.5: Fail closed on environment configuration

**Files:**
- Create: `src/lib/env.server.ts`
- Create: `src/lib/env.public.ts`
- Create: `src/instrumentation.ts`
- Modify: `src/lib/appwrite/client.ts:15-18`
- Modify: `src/lib/appwrite/server.ts:19-23`
- Modify: `src/lib/appwrite/session.ts:25-29`
- Modify: `.env.example`
- Modify: `README.md:60`
- Test: `tests/unit/env.test.ts`

- [ ] **Step 1: Add Zod and the schemas**

```bash
npm install zod
```

Create `src/lib/env.server.ts`:

```ts
import { z } from "zod";

const schema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    APPWRITE_ENDPOINT: z.string().url(),
    APPWRITE_PROJECT_ID: z.string().min(1),
    APPWRITE_API_KEY: z.string().min(1),
    APPWRITE_DATABASE_ID: z.string().min(1),
    WRITERDOST_ENCRYPTION_KEY: z.string().min(1),
    WRITERDOST_CRON_SECRET: z.string().min(32),
    REDIS_URL: z.string().url().optional(),
    WRITERDOST_ALLOWED_AI_HOSTS: z.string().default(""),
    WRITERDOST_ALLOW_LOCAL_AI: z.enum(["true", "false"]).default("false"),
    WRITERDOST_SELF_HOSTED: z.enum(["true", "false"]).default("false"),
  })
  .superRefine((value, ctx) => {
    if (value.NODE_ENV === "production" && !value.REDIS_URL) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["REDIS_URL"],
        message: "REDIS_URL is required so rate limits are shared across instances.",
      });
    }
    if (
      value.NODE_ENV === "production" &&
      value.WRITERDOST_ALLOW_LOCAL_AI === "true" &&
      value.WRITERDOST_SELF_HOSTED !== "true"
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["WRITERDOST_ALLOW_LOCAL_AI"],
        message: "Local AI endpoints in production require WRITERDOST_SELF_HOSTED=true.",
      });
    }
  });

export type ServerEnv = z.infer<typeof schema>;

export function parseServerEnv(input: NodeJS.ProcessEnv): ServerEnv {
  const parsed = schema.safeParse(input);
  if (!parsed.success) {
    const details = parsed.error.issues
      .map((issue) => `${issue.path.join(".") || "(root)"}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid server environment:\n${details}`);
  }
  return parsed.data;
}

let cached: ServerEnv | null = null;
export function serverEnv(): ServerEnv {
  if (!cached) cached = parseServerEnv(process.env);
  return cached;
}
```

Create `src/lib/env.public.ts`:

```ts
import { z } from "zod";

const schema = z.object({
  NEXT_PUBLIC_APPWRITE_ENDPOINT: z.string().url(),
  NEXT_PUBLIC_APPWRITE_PROJECT_ID: z.string().min(1),
});

export type PublicEnv = z.infer<typeof schema>;

export function publicEnv(): PublicEnv {
  const parsed = schema.safeParse({
    NEXT_PUBLIC_APPWRITE_ENDPOINT: process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT,
    NEXT_PUBLIC_APPWRITE_PROJECT_ID: process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID,
  });
  if (!parsed.success) {
    throw new Error(
      "Invalid public environment. Set NEXT_PUBLIC_APPWRITE_ENDPOINT and NEXT_PUBLIC_APPWRITE_PROJECT_ID.",
    );
  }
  return parsed.data;
}
```

- [ ] **Step 2: Add startup validation**

Create `src/instrumentation.ts`:

```ts
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs" && process.env.NEXT_PHASE !== "phase-production-build") {
    const { serverEnv } = await import("@/lib/env.server");
    serverEnv();
  }
}
```

Server secrets are validated at runtime; `next build` only receives the public Appwrite values needed for inlining. This keeps secrets out of build layers while still failing a misconfigured server at startup.

- [ ] **Step 3: Remove every production fallback**

In `src/lib/appwrite/client.ts`, replace the endpoint/project constants with:

```ts
import { publicEnv } from "@/lib/env.public";

function config() {
  return publicEnv();
}
```

Then use `config().NEXT_PUBLIC_APPWRITE_ENDPOINT` and `config().NEXT_PUBLIC_APPWRITE_PROJECT_ID` inside `account()`. Do not retain the hardcoded `sgp.cloud.appwrite.io` or project ID.

In `src/lib/appwrite/server.ts`, replace the constants:

```ts
import { serverEnv } from "@/lib/env.server";
const config = () => serverEnv();
```

Use `config().APPWRITE_ENDPOINT`, `config().APPWRITE_PROJECT_ID`, `config().APPWRITE_API_KEY`, and `config().APPWRITE_DATABASE_ID` inside the client factories. Remove the `appwriteConfigured()` shortcut that treats fallback values as configured; return true only after `serverEnv()` parses.

In `src/lib/appwrite/session.ts`, read the endpoint/project/API key from `serverEnv()` inside the functions rather than module-level constants.

- [ ] **Step 4: Update the environment template**

In `.env.example`, add and document:

```env
# Required in production: shared rate limiting
REDIS_URL=redis://localhost:6379

# Local Ollama is only allowed for a same-machine self-hosted deployment.
WRITERDOST_ALLOW_LOCAL_AI=false
WRITERDOST_SELF_HOSTED=false
```

Remove the unused `WRITERDOST_PLATFORM_*` block until the platform-key feature exists. Change the Node prerequisite in `README.md` to `Node.js 20.9+ (22 LTS recommended)`.

- [ ] **Step 5: Add environment tests**

Create `tests/unit/env.test.ts`:

```ts
import { describe, expect, it } from "vitest";
import { parseServerEnv } from "@/lib/env.server";

const valid = {
  NODE_ENV: "production",
  APPWRITE_ENDPOINT: "https://appwrite.example/v1",
  APPWRITE_PROJECT_ID: "project",
  APPWRITE_API_KEY: "key",
  APPWRITE_DATABASE_ID: "writerdost",
  WRITERDOST_ENCRYPTION_KEY: "a".repeat(44),
  WRITERDOST_CRON_SECRET: "b".repeat(64),
  REDIS_URL: "redis://redis:6379",
  WRITERDOST_ALLOW_LOCAL_AI: "false",
  WRITERDOST_SELF_HOSTED: "false",
} as NodeJS.ProcessEnv;

describe("parseServerEnv", () => {
  it("accepts a complete production configuration", () => {
    expect(parseServerEnv(valid).APPWRITE_PROJECT_ID).toBe("project");
  });

  it("rejects production without Redis", () => {
    const { REDIS_URL, ...withoutRedis } = valid;
    expect(() => parseServerEnv(withoutRedis as NodeJS.ProcessEnv)).toThrow(/REDIS_URL/);
  });

  it("rejects local AI without self-hosted mode", () => {
    expect(() =>
      parseServerEnv({ ...valid, WRITERDOST_ALLOW_LOCAL_AI: "true" } as NodeJS.ProcessEnv),
    ).toThrow(/SELF_HOSTED/);
  });
});
```

- [ ] **Step 6: Verify**

```bash
npm run test:unit
npx tsc --noEmit
npm run build
```

Expected: pass. A missing env var now fails startup with a named error instead of silently using a developer project.

- [ ] **Step 7: Commit**

```bash
git add src/lib/env.server.ts src/lib/env.public.ts src/instrumentation.ts \
  src/lib/appwrite/client.ts src/lib/appwrite/server.ts src/lib/appwrite/session.ts \
  .env.example README.md tests/unit/env.test.ts package.json package-lock.json
git commit -m "fix: fail fast on missing or unsafe environment configuration"
```

### Task 0.6: Add the production container, reverse proxy, and shallow health endpoint

**Files:**
- Create: `Dockerfile`
- Create: `.dockerignore`
- Create: `deploy/docker-compose.yml`
- Create: `deploy/Caddyfile`
- Create: `deploy/README.md`
- Create: `src/app/api/health/route.ts`

- [ ] **Step 1: Add the health route**

Create `src/app/api/health/route.ts`:

```ts
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    ok: true,
    service: "writerdost",
    version: process.env.BUILD_VERSION || "dev",
    time: new Date().toISOString(),
  });
}
```

The shallow route exposes no dependency details. Add an authenticated deep check in Phase 6.

- [ ] **Step 2: Add the Docker build**

Create `Dockerfile`:

```dockerfile
FROM node:22-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

FROM node:22-alpine AS builder
WORKDIR /app
ARG NEXT_PUBLIC_APPWRITE_ENDPOINT
ARG NEXT_PUBLIC_APPWRITE_PROJECT_ID
ARG NEXT_PUBLIC_SITE_URL
ENV NEXT_PUBLIC_APPWRITE_ENDPOINT=$NEXT_PUBLIC_APPWRITE_ENDPOINT
ENV NEXT_PUBLIC_APPWRITE_PROJECT_ID=$NEXT_PUBLIC_APPWRITE_PROJECT_ID
ENV NEXT_PUBLIC_SITE_URL=$NEXT_PUBLIC_SITE_URL
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
RUN addgroup -S nextjs && adduser -S nextjs -G nextjs
COPY --from=builder --chown=nextjs:nextjs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nextjs /app/.next/static ./.next/static
COPY --from=builder --chown=nextjs:nextjs /app/public ./public
USER nextjs
EXPOSE 3000
CMD ["node", "server.js"]
```

Create `.dockerignore`:

```dockerignore
node_modules
.next
.git
.env*
coverage
playwright-report
test-results
docs
```

- [ ] **Step 3: Add Redis and Caddy**

Create `deploy/docker-compose.yml`:

```yaml
services:
  app:
    build:
      context: ..
      args:
        NEXT_PUBLIC_APPWRITE_ENDPOINT: ${NEXT_PUBLIC_APPWRITE_ENDPOINT}
        NEXT_PUBLIC_APPWRITE_PROJECT_ID: ${NEXT_PUBLIC_APPWRITE_PROJECT_ID}
        NEXT_PUBLIC_SITE_URL: ${NEXT_PUBLIC_SITE_URL}
    restart: unless-stopped
    env_file:
      - ../.env.production
    depends_on:
      redis:
        condition: service_healthy
    healthcheck:
      test:
        [
          "CMD",
          "node",
          "-e",
          "fetch('http://127.0.0.1:3000/api/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))",
        ]
      interval: 30s
      timeout: 5s
      retries: 3
    networks: [writerdost]

  redis:
    image: redis:7-alpine
    command: ["redis-server", "--save", "", "--appendonly", "no"]
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 10s
      timeout: 3s
      retries: 5
    networks: [writerdost]

  caddy:
    image: caddy:2-alpine
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./Caddyfile:/etc/caddy/Caddyfile:ro
      - caddy_data:/data
      - caddy_config:/config
    depends_on:
      app:
        condition: service_healthy
    networks: [writerdost]

volumes:
  caddy_data:
  caddy_config:

networks:
  writerdost:
```

Create `deploy/Caddyfile`:

```caddyfile
{$WRITERDOST_DOMAIN:localhost} {
  encode zstd gzip
  request_body {
    max_size 26MB
  }
  reverse_proxy app:3000 {
    flush_interval -1
    transport http {
      read_timeout 15m
      write_timeout 15m
    }
  }
}
```

`flush_interval -1` is required for the generation SSE streams. The 26 MB body cap matches the current workspace endpoint; the extract-text route enforces its own 10 MB form limit.

- [ ] **Step 4: Document the deployment**

Create `deploy/README.md` with these exact steps:

```bash
cp .env.example .env.production
# Fill every value; generate secrets with:
# openssl rand -base64 32   -> WRITERDOST_ENCRYPTION_KEY
# openssl rand -hex 32      -> WRITERDOST_CRON_SECRET
# Export the public build values in the shell or CI environment:
export NEXT_PUBLIC_APPWRITE_ENDPOINT="$(grep '^NEXT_PUBLIC_APPWRITE_ENDPOINT=' .env.production | cut -d= -f2-)"
export NEXT_PUBLIC_APPWRITE_PROJECT_ID="$(grep '^NEXT_PUBLIC_APPWRITE_PROJECT_ID=' .env.production | cut -d= -f2-)"
export NEXT_PUBLIC_SITE_URL="$(grep '^NEXT_PUBLIC_SITE_URL=' .env.production | cut -d= -f2-)"
docker compose -f deploy/docker-compose.yml build
docker compose -f deploy/docker-compose.yml up -d
curl -fsS https://your-domain/api/health
```

Also document that `.env.production` is never committed, that the public Appwrite values are build args (they are inlined into the browser bundle), that server secrets are runtime-only, and that the Appwrite schema must be applied before the app starts.

- [ ] **Step 5: Verify the container**

```bash
docker compose -f deploy/docker-compose.yml build
docker compose -f deploy/docker-compose.yml up -d
curl -fsS http://localhost/api/health
docker compose -f deploy/docker-compose.yml down
```

Expected: HTTP 200 with `{"ok":true,...}`. If Docker is unavailable locally, run this on a staging host and attach the output to the PR.

- [ ] **Step 6: Commit**

```bash
git add Dockerfile .dockerignore deploy src/app/api/health/route.ts
git commit -m "ops: add standalone container, caddy proxy, redis, and health check"
```

### Gate 0 — Release baseline

- [ ] `npm ci && npm run typecheck && npm run lint && npm run test:unit && npm run build` is green.
- [ ] CI is required on `main` and includes build/type/lint/unit/public-E2E/secret gates; the dependency audit is added in Task 1.8.
- [ ] Missing Appwrite/Redis/encryption env fails startup with a named error.
- [ ] `docker compose build` succeeds and `/api/health` returns 200.
- [ ] No hardcoded Appwrite endpoint or project ID remains in `src/`.

---

## Phase 1 — Security-critical release blockers

**Outcome:** No expensive route is anonymous; SSRF and redirect credential leaks are closed; client-controlled work is bounded; untrusted HTML is sanitized; CSP is enforced; known critical dependency advisories are cleared.

### Task 1.1: Authenticate every AI, generation, upload, marketplace, and preview route

**Files:**
- Create: `src/lib/api-client.ts`
- Modify: `src/app/api/ai/route.ts`
- Modify: `src/app/api/generate-ebook/route.ts`
- Modify: `src/app/api/generate-from-outline/route.ts`
- Modify: `src/app/api/generate-wrappers/route.ts`
- Modify: `src/app/api/draft-chapters/route.ts`
- Modify: `src/app/api/rewrite-swarm/route.ts`
- Modify: `src/app/api/translate-project/route.ts`
- Modify: `src/app/api/extract-text/route.ts`
- Modify: `src/app/api/marketplace/route.ts`
- Modify: `src/lib/ai-client.ts`
- Modify: `src/app/create/page.tsx`, `src/app/editor/page.tsx`, `src/app/rewrite/page.tsx`, `src/app/automations/page.tsx`, `src/lib/marketplace.ts`
- Test: `e2e/security.spec.ts`

- [ ] **Step 1: Add a single authenticated fetch helper**

Create `src/lib/api-client.ts`:

```ts
import { authHeader } from "@/lib/appwrite/client";

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const auth = await authHeader();
  for (const [key, value] of Object.entries(auth)) headers.set(key, value);
  return fetch(input, { ...init, headers });
}
```

Never set `content-type` for `FormData`; let the browser set the multipart boundary.

- [ ] **Step 2: Add the session guard to every route**

At the top of each listed POST, before reading the body or constructing a stream:

```ts
const { session, denied } = await requireUser(request);
if (denied) return denied;
```

For routes that do not use `session` yet, import only `requireUser` and destructure `{ denied }`. Do not use `currentUser` alone; the route must return 401.

- [ ] **Step 3: Update every client call**

Replace `fetch("/api/...")` with `apiFetch("/api/...")` in the listed client files. For `ai-client.ts`:

```ts
import { apiFetch } from "@/lib/api-client";

const response = await apiFetch("/api/ai", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ api, systemPrompt, userPrompt, temperature, topP }),
});
```

For the `FormData` upload in `rewrite/page.tsx`:

```ts
const response = await apiFetch("/api/extract-text", {
  method: "POST",
  body: formData,
});
```

For the marketplace proxy calls in `marketplace.ts`, use `apiFetch(MARKETPLACE_PROXY, ...)`.

- [ ] **Step 4: Add the security test**

Create `e2e/security.spec.ts` with a table-driven check. Every request must be unauthenticated and must not include an `Origin` header:

```ts
import { expect, test } from "@playwright/test";

const endpoints = [
  "/api/ai",
  "/api/generate-ebook",
  "/api/generate-from-outline",
  "/api/generate-wrappers",
  "/api/draft-chapters",
  "/api/rewrite-swarm",
  "/api/translate-project",
  "/api/extract-text",
  "/api/marketplace",
  "/api/automations/preview",
];

for (const endpoint of endpoints) {
  test(`rejects anonymous POST ${endpoint}`, async ({ request }) => {
    const response = await request.post(endpoint, { data: {} });
    expect(response.status()).toBe(401);
  });
}
```

For `/api/extract-text`, send an empty multipart body instead of JSON:

```ts
const response = await request.post("/api/extract-text", { multipart: { file: { name: "a.txt", mimeType: "text/plain", buffer: Buffer.from("x") } } });
```

- [ ] **Step 5: Verify**

```bash
npm run test:e2e -- --project=chromium e2e/security.spec.ts
npm run build
```

Expected: all endpoints return 401 for anonymous requests; authenticated browser flows still work.

- [ ] **Step 6: Commit**

```bash
git add src/lib/api-client.ts src/app/api src/app/create/page.tsx src/app/editor/page.tsx \
  src/app/rewrite/page.tsx src/app/automations/page.tsx src/lib/ai-client.ts src/lib/marketplace.ts e2e/security.spec.ts
git commit -m "security: require a user session for all expensive API routes"
```

### Task 1.2: Remove anonymous inline publishing from the preview endpoint

**Files:**
- Modify: `src/app/api/automations/preview/route.ts`
- Modify: `src/lib/automation/user-repository.ts`
- Modify: `src/app/automations/page.tsx`
- Test: `e2e/security.spec.ts`, `tests/unit/preview.test.ts`

- [ ] **Step 1: Add an ownership-scoped destination loader**

In `src/lib/automation/user-repository.ts`, export:

```ts
export async function getDestinationForUser(
  db: TablesDB,
  id: string,
): Promise<Destination | null> {
  try {
    const row = await db.getRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.destinations,
      rowId: id,
    });
    return toDestination(row as unknown as DestinationRow);
  } catch (error) {
    if ((error as { code?: number }).code === 404) return null;
    throw error;
  }
}
```

The caller must pass the JWT-scoped `session.tables`; a row belonging to another user then returns 404.

- [ ] **Step 2: Change the preview contract**

Replace the inline `destination` and unrestricted `publishNow` with:

```ts
type PreviewPayload = {
  automation: AutomationInput;
  destinationId?: string;
  publishNow?: boolean;
};
```

In the handler:

```ts
const { session, denied } = await requireUser(request);
if (denied) return denied;

const { automation, destinationId, publishNow } = await readJsonBody<PreviewPayload>(request, 250_000);
if (publishNow && !destinationId) {
  return NextResponse.json({ error: "Choose a saved destination before test publishing." }, { status: 400 });
}
const destination = destinationId
  ? await getDestinationForUser(session.tables, destinationId)
  : null;
if (destinationId && !destination) {
  return NextResponse.json({ error: "Destination not found." }, { status: 404 });
}
```

Use `userId: session.user.id` for the preview config and `destination` from the loader. Reject any `automation.destination` property with 400 rather than silently ignoring it. Keep `publishNow` writing only a draft; do not allow `publish` mode from preview.

- [ ] **Step 3: Update the UI**

In `runPreview`, send `destinationId: selected.destinationId || undefined` and `publishNow: false`, or omit `publishNow` entirely. Do not serialize a destination object or any secret into the preview request.

- [ ] **Step 4: Test cross-tenant access**

Add to `e2e/security.spec.ts` a test that signs in as test user A, creates a destination as user B in the staging fixture, and calls preview with B's ID. Expected: 404. Also test `publishNow: true` with no `destinationId` returns 400.

- [ ] **Step 5: Verify and commit**

```bash
npm run test:unit
npm run test:e2e -- --project=chromium e2e/security.spec.ts
git add src/app/api/automations/preview/route.ts src/lib/automation/user-repository.ts \
  src/app/automations/page.tsx e2e/security.spec.ts tests/unit/preview.test.ts
git commit -m "security: scope preview publishing to owned destinations"
```

### Task 1.3: Make outbound HTTP default-deny, IP-pinned, and redirect-safe

**Files:**
- Modify: `package.json`
- Create: `src/lib/outbound-policy.ts`
- Modify: `src/lib/net-guard.ts`
- Modify: `src/lib/ai-upstream.ts`
- Modify: `src/lib/ai-server-utils.ts`
- Modify: `src/lib/automation/destinations.ts`
- Test: `tests/unit/outbound-policy.test.ts`, `tests/unit/redirect-headers.test.ts`

- [ ] **Step 1: Install the IP and dispatcher dependencies**

```bash
npm install ipaddr.js undici
npm install -D @types/ipaddr.js
```

- [ ] **Step 2: Add strict address classification**

Create `src/lib/outbound-policy.ts`:

```ts
import ipaddr from "ipaddr.js";
import { isIP } from "node:net";

const BLOCKED_RANGES = new Set([
  "unspecified",
  "broadcast",
  "multicast",
  "loopback",
  "linkLocal",
  "private",
  "uniqueLocal",
  "carrierGradeNat",
  "reserved",
  "benchmarking",
  "documentation",
  "as112",
]);

export function isPublicAddress(address: string): boolean {
  if (!isIP(address)) return false;
  let parsed = ipaddr.parse(address);
  if (parsed.kind() === "ipv6" && parsed.isIPv4MappedAddress()) {
    parsed = parsed.toIPv4Address();
  }
  return !BLOCKED_RANGES.has(parsed.range());
}

export function assertPublicAddresses(addresses: string[], hostname: string): void {
  if (addresses.length === 0) throw new Error(`Could not resolve ${hostname}.`);
  for (const address of addresses) {
    if (!isPublicAddress(address)) {
      throw new Error(`The host "${hostname}" resolves to a non-public address.`);
    }
  }
}
```

Do not special-case loopback here. The only loopback exception is the explicit self-hosted Ollama mode in Task 1.3 Step 4.

- [ ] **Step 3: Pin the validated IP for the actual connection**

Add to `outbound-policy.ts`:

```ts
import { Agent } from "undici";

export function pinnedAgent(address: string): Agent {
  const family = isIP(address) === 6 ? 6 : 4;
  return new Agent({
    connect: {
      lookup: (_hostname, _options, callback) => callback(null, address, family),
    },
  });
}
```

`net-guard.safeFetch` must resolve the hostname once, validate **all** returned addresses, choose the first validated address, and create the pinned `Agent` for that hop. Use `undici`’s `fetch` with that dispatcher. Read the response body to completion under the byte/time cap, then close the agent in `finally`. Do not close the dispatcher before the body is consumed, and do not call the global `fetch` with the hostname after validation; doing so re-resolves DNS and reintroduces rebinding.

For the self-hosted Ollama exception, pass `allowLoopback` to the pinned fetch path only when `WRITERDOST_SELF_HOSTED=true` and `WRITERDOST_ALLOW_LOCAL_AI=true`. The default path has no loopback exception.

- [ ] **Step 4: Make loopback opt-in only for an explicit self-hosted deployment**

In `src/lib/ai-upstream.ts`:

```ts
const allowLoopback =
  process.env.WRITERDOST_ALLOW_LOCAL_AI === "true" &&
  (process.env.WRITERDOST_SELF_HOSTED === "true" || process.env.NODE_ENV === "development");
```

Default both flags to false. Local developers who use Ollama must set `WRITERDOST_ALLOW_LOCAL_AI=true`; production additionally requires `WRITERDOST_SELF_HOSTED=true`. Remove the `allowLoopback || isDev` behavior from `net-guard.ts`; tests that need a local server must pass an explicit test-only option, never infer it from `NODE_ENV`.

- [ ] **Step 5: Route AI calls through the pinned fetch path**

Add `safePostJson` to `src/lib/net-guard.ts` as a thin wrapper around the same pinned implementation, then change `callModel` in `src/lib/ai-server-utils.ts` to use it instead of the global `fetch`. Keep the 300-second per-call cap, but pass the remaining run deadline as `timeoutMs`. Parse the JSON body from `safePostJson` and keep the existing retry rules for 429/5xx.

- [ ] **Step 6: Strip credentials on cross-origin redirects and require 2xx**

In `net-guard.safeFetch`, create a fresh headers object for each hop. On an origin change:

```ts
const SENSITIVE_HEADERS = ["authorization", "cookie", "x-api-key", "x-cron-secret"];
const nextHeaders = new Headers(headers);
if (new URL(nextUrl).origin !== new URL(currentUrl).origin) {
  for (const key of SENSITIVE_HEADERS) nextHeaders.delete(key);
}
```

Read the response body with a reader and a live abort timer, counting `byteLength` as data arrives. Abort as soon as `maxBytes` is exceeded. In `destinations.ts`, change the success check from `status >= 400` to `status < 200 || status >= 300`; a 3xx is an error, not a published post.

- [ ] **Step 7: Add tests**

`tests/unit/outbound-policy.test.ts` must cover:

```ts
expect(isPublicAddress("8.8.8.8")).toBe(true);
expect(isPublicAddress("127.0.0.1")).toBe(false);
expect(isPublicAddress("169.254.169.254")).toBe(false);
expect(isPublicAddress("10.0.0.1")).toBe(false);
expect(isPublicAddress("::1")).toBe(false);
expect(isPublicAddress("fd00::1")).toBe(false);
expect(isPublicAddress("::ffff:127.0.0.1")).toBe(false);
```

`tests/unit/redirect-headers.test.ts` must call the header-stripping helper with same-origin and cross-origin URLs and assert `authorization` survives only for the same origin. Mock the resolver to return a public address; do not hit the network.

- [ ] **Step 8: Verify and commit**

```bash
npm run test:unit
npm run test:e2e -- --project=chromium e2e/security.spec.ts
npm run build
git add package.json package-lock.json src/lib/outbound-policy.ts src/lib/net-guard.ts \
  src/lib/ai-upstream.ts src/lib/ai-server-utils.ts src/lib/automation/destinations.ts \
  tests/unit/outbound-policy.test.ts tests/unit/redirect-headers.test.ts
git commit -m "security: pin outbound IPs, default-deny loopback, strip redirect credentials"
```

### Task 1.4: Replace the in-memory IP limiter with authenticated Redis rate limits

**Files:**
- Modify: `package.json`
- Create: `src/lib/rate-limit.ts`
- Create: `src/lib/route-limit.ts`
- Modify: all routes from Task 1.1
- Modify: `deploy/docker-compose.yml` (Redis already added in Phase 0)
- Test: `tests/unit/rate-limit.test.ts`, `e2e/security.spec.ts`

- [ ] **Step 1: Install Redis and the limiter**

```bash
npm install ioredis rate-limiter-flexible
```

- [ ] **Step 2: Implement a shared limiter with a development-only memory fallback**

Create `src/lib/rate-limit.ts`:

```ts
import Redis from "ioredis";
import { RateLimiterMemory, RateLimiterRedis } from "rate-limiter-flexible";

type Result = { ok: true } | { ok: false; retryAfter: number };

const redis = process.env.REDIS_URL
  ? new Redis(process.env.REDIS_URL, { maxRetriesPerRequest: 1, enableOfflineQueue: false })
  : null;

const limiters = new Map<string, RateLimiterMemory | RateLimiterRedis>();

function limiter(bucket: string, points: number, durationSeconds: number) {
  const key = `${bucket}:${points}:${durationSeconds}`;
  const existing = limiters.get(key);
  if (existing) return existing;

  const created = redis
    ? new RateLimiterRedis({
        storeClient: redis,
        keyPrefix: `writerdost:${bucket}`,
        points,
        duration: durationSeconds,
      })
    : new RateLimiterMemory({ points, duration: durationSeconds });
  limiters.set(key, created);
  return created;
}

export async function consumeRateLimit(
  userId: string,
  bucket: string,
  points: number,
  durationSeconds: number,
): Promise<Result> {
  try {
    await limiter(bucket, points, durationSeconds).consume(userId);
    return { ok: true };
  } catch (rejection) {
    if (rejection instanceof Error) throw rejection;
    const msBeforeNext = Number((rejection as { msBeforeNext?: number }).msBeforeNext ?? 1000);
    return { ok: false, retryAfter: Math.max(1, Math.ceil(msBeforeNext / 1000)) };
  }
}
```

If `NODE_ENV=production` and Redis is unavailable, the limiter `.consume()` error is thrown; the route returns 503. Do not silently fall back to memory in production.

- [ ] **Step 3: Add route helper**

Create `src/lib/route-limit.ts`:

```ts
import { NextResponse } from "next/server";
import { consumeRateLimit } from "@/lib/rate-limit";

export async function enforceRateLimit(
  userId: string,
  bucket: string,
  points: number,
  durationSeconds = 60,
): Promise<NextResponse | null> {
  try {
    const result = await consumeRateLimit(userId, bucket, points, durationSeconds);
    if (result.ok) return null;
    return NextResponse.json(
      { error: "Too many requests. Please wait a moment and try again." },
      { status: 429, headers: { "Retry-After": String(result.retryAfter) } },
    );
  } catch (error) {
    console.error("Rate limiter unavailable", { bucket, error });
    return NextResponse.json(
      { error: "The service is temporarily unavailable. Please try again." },
      { status: 503 },
    );
  }
}
```

- [ ] **Step 4: Apply the limits**

After `requireUser` in each route:

```ts
const limited = await enforceRateLimit(session.user.id, "ai", 30, 60);
if (limited) return limited;
```

Use these buckets:

| Route | Points / window |
|---|---:|
| `/api/ai` | 30 / 60s |
| `/api/automations/preview` | 4 / 60s |
| `/api/generate-ebook` | 6 / 60s |
| `/api/draft-chapters` | 6 / 60s |
| `/api/generate-from-outline` | 6 / 60s |
| `/api/generate-wrappers` | 6 / 60s |
| `/api/rewrite-swarm` | 10 / 60s |
| `/api/translate-project` | 6 / 60s |
| `/api/extract-text` | 10 / 60s |
| `/api/marketplace` | 20 / 60s |
| `/api/workspace` PUT | 30 / 60s |

Delete `guardRequest` usage from these authenticated routes. Keep `readJsonBody` for body caps. Do not keep an IP-keyed limiter as the only control; a user ID is the identity that matters.

- [ ] **Step 5: Add tests**

`tests/unit/rate-limit.test.ts` uses `RateLimiterMemory` and verifies 2 requests pass and the third returns a retry delay. Add a Playwright test that signs in, calls `/api/ai` with a deliberately failing-but-cheap payload 31 times, and expects a 429; if that is too slow, test the limiter function directly and keep an integration smoke test for one 429.

- [ ] **Step 6: Verify and commit**

```bash
npm run test:unit
npm run build
git add package.json package-lock.json src/lib/rate-limit.ts src/lib/route-limit.ts src/app/api tests
git commit -m "security: add shared per-user rate limiting for costly routes"
```

### Task 1.5: Bound request bodies, chapters, target lengths, and uploads

**Files:**
- Create: `src/lib/validation.ts`
- Modify: `src/app/api/ai/route.ts`
- Modify: `src/app/api/generate-ebook/route.ts`
- Modify: `src/app/api/draft-chapters/route.ts`
- Modify: `src/app/api/generate-from-outline/route.ts`
- Modify: `src/app/api/rewrite-swarm/route.ts`
- Modify: `src/app/api/translate-project/route.ts`
- Modify: `src/app/api/generate-wrappers/route.ts`
- Modify: `src/app/api/extract-text/route.ts`
- Modify: `deploy/Caddyfile` only if a route needs a smaller limit than the global 26 MB
- Test: `tests/unit/validation.test.ts`

- [ ] **Step 1: Add shared limits**

Create `src/lib/validation.ts`:

```ts
export const LIMITS = {
  promptChars: 400_000,
  systemPromptChars: 100_000,
  manuscriptChars: 2_000_000,
  chapters: 60,
  sectionsPerChapter: 30,
  targetWords: 100_000,
  researchSources: 20,
  uploadBytes: 10 * 1024 * 1024,
} as const;

export function clampInt(value: unknown, fallback: number, min: number, max: number): number {
  const parsed = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(max, Math.max(min, Math.trunc(parsed)));
}
```

- [ ] **Step 2: Validate and clamp the high-risk generation inputs**

For `/api/ai`, reject non-string prompts over `LIMITS.promptChars`, non-finite temperature/topP, and oversized request bodies using `readJsonBody(request, 500_000)`.

For `/api/generate-ebook`, use:

```ts
const targetWords = clampInt(draft.length, 10_000, 1_000, LIMITS.targetWords);
const researchSources = Array.isArray(draft.researchSources)
  ? draft.researchSources.slice(0, LIMITS.researchSources)
  : [];
```

For `/api/draft-chapters`, replace the quota calculation with:

```ts
const TOTAL_TARGET_WORDS = clampInt(project.targetLength, 10_000, 1_000, LIMITS.targetWords);
const CHAPTER_COUNT = Math.min(LIMITS.chapters, Math.max(1, project.chapters.length));
const SECTIONS_PER_CHAPTER = Math.min(
  LIMITS.sectionsPerChapter,
  Math.max(1, Math.round(TOTAL_TARGET_WORDS / 900 / CHAPTER_COUNT)),
);
```

Process at most `LIMITS.chapters` chapters; ignore extras. For `generate-from-outline`, `rewrite-swarm`, and `translate-project`, reject more than `LIMITS.chapters` chapters and more than `LIMITS.manuscriptChars` total input. For `generate-wrappers`, cap chapters and prompt sizes with the same constants.

For every route, use `readJsonBody` with a bounded byte ceiling; do not call `request.json()` directly.

- [ ] **Step 3: Bound the upload**

In `/api/extract-text`, require a session and a rate limit, retain the 10 MB `file.size` check, and reject a missing or oversized `content-length` before `formData()`. After reading the buffer, verify the magic bytes: `%PDF-` for `.pdf` and `PK\x03\x04` for `.docx`; reject a mismatch with 400. The Caddy `request_body max_size 26MB` enforces an outer cap even for chunked requests. Add `export const maxDuration = 60;`.

- [ ] **Step 4: Add tests**

`tests/unit/validation.test.ts` must assert:

```ts
expect(clampInt(1e9, 10_000, 1_000, 100_000)).toBe(100_000);
expect(clampInt(-1, 10_000, 1_000, 100_000)).toBe(1_000);
expect(clampInt("not-a-number", 10_000, 1_000, 100_000)).toBe(10_000);
```

Add route tests that send `targetLength: 1_000_000_000` and `chapters: Array(10_000)` and assert the handler uses at most 60 chapters and 100,000 target words. Mock `callModel` and assert it is never called for an invalid payload.

- [ ] **Step 5: Verify and commit**

```bash
npm run test:unit
npm run build
git add src/lib/validation.ts src/app/api tests/unit/validation.test.ts
git commit -m "security: bound generation inputs and upload handling"
```

### Task 1.6: Sanitize every untrusted HTML sink and backfill existing rows

**Files:**
- Modify: `package.json`
- Create: `src/lib/sanitize.ts`
- Create: `src/components/SafeHtml.tsx`
- Modify: `src/lib/automation/pipeline.ts:146`
- Modify: `src/lib/workspace/repository.ts`
- Modify: `src/app/automations/page.tsx:1075,1162`
- Modify: `src/app/editor/page.tsx:516`
- Modify: `src/app/help/page.tsx:184`
- Create: `scripts/sanitize-content.mjs`
- Test: `tests/unit/sanitize.test.ts`, `e2e/security.spec.ts`

- [ ] **Step 1: Install sanitizers**

```bash
npm install sanitize-html dompurify
npm install -D @types/sanitize-html
```

- [ ] **Step 2: Add server-side sanitization**

Create `src/lib/sanitize.ts`:

```ts
import sanitizeHtml from "sanitize-html";

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    "p", "h1", "h2", "h3", "h4", "ul", "ol", "li", "strong", "em", "code", "pre",
    "blockquote", "br", "hr", "a", "table", "thead", "tbody", "tr", "th", "td", "img",
  ],
  allowedAttributes: {
    a: ["href", "title", "target", "rel"],
    img: ["src", "alt", "title"],
    th: ["colspan", "rowspan"],
    td: ["colspan", "rowspan"],
  },
  allowedSchemes: ["http", "https", "mailto"],
  transformTags: {
    a: (_tag, attrs) => ({
      tagName: "a",
      attribs: {
        ...attrs,
        rel: "noopener noreferrer",
        ...(attrs.target === "_blank" ? { target: "_blank" } : {}),
      },
    }),
  },
};

export function sanitizeGeneratedHtml(html: string): string {
  return sanitizeHtml(html, OPTIONS);
}
```

- [ ] **Step 3: Sanitize on write**

In `pipeline.ts`, change:

```ts
const bodyHtml = sanitizeGeneratedHtml(mdToHtml(bodyMarkdown));
```

In `src/lib/workspace/repository.ts`, before `encodeJson(project)`, sanitize every chapter’s `content`:

```ts
const safeProject = {
  ...project,
  chapters: Array.isArray(project.chapters)
    ? project.chapters.map((chapter: { content?: unknown }) => ({
        ...chapter,
        content: typeof chapter.content === "string" ? sanitizeGeneratedHtml(chapter.content) : "",
      }))
    : [],
};
```

Use `safeProject` for the row `data`; keep the original `project.title` and IDs. Apply the same sanitizer to any generated post `bodyHtml` before persisting.

- [ ] **Step 4: Add the client-side defense**

Create `src/components/SafeHtml.tsx`:

```tsx
"use client";

import DOMPurify from "dompurify";
import { useEffect, useState } from "react";

export default function SafeHtml({ html, className }: { html: string; className?: string }) {
  const [safe, setSafe] = useState("");

  useEffect(() => {
    setSafe(
      DOMPurify.sanitize(html, {
        USE_PROFILES: { html: true },
        ADD_ATTR: ["target"],
      }),
    );
  }, [html]);

  return <div className={className} dangerouslySetInnerHTML={{ __html: safe }} />;
}
```

Replace the four raw `dangerouslySetInnerHTML` sites with:

```tsx
<SafeHtml className="prose ..." html={preview.post.bodyHtml} />
```

For the help response, use `<SafeHtml html={mdToHtml(aiResponse)} ... />`. Keep the existing class names.

- [ ] **Step 5: Backfill stored content**

Create `scripts/sanitize-content.mjs` that:

1. Reads `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`, and `APPWRITE_DATABASE_ID` from the environment.
2. Iterates `generated_posts` rows in pages of 100 and sanitizes `bodyHtml`.
3. Iterates `workspace_projects` rows and sanitizes `data.projects[].chapters[].content`, preserving all other JSON fields.
4. Updates only rows whose sanitized value differs.
5. Logs counts, never logs content.

Run it against staging first:

```bash
node scripts/sanitize-content.mjs --dry-run
node scripts/sanitize-content.mjs
```

Require a manual confirmation (`--apply`) before writing. Commit the script; do not commit a run log.

- [ ] **Step 6: Test XSS payloads**

In `tests/unit/sanitize.test.ts`:

```ts
import { expect, it } from "vitest";
import { sanitizeGeneratedHtml } from "@/lib/sanitize";

it("removes event handlers and javascript: links", () => {
  const output = sanitizeGeneratedHtml(
    '<p>ok</p><img src=x onerror="alert(1)"><a href="javascript:alert(1)">bad</a>',
  );
  expect(output).not.toContain("onerror");
  expect(output).not.toContain("javascript:");
  expect(output).toContain("<p>ok</p>");
});
```

Add a Playwright test that injects a post with `<img src=x onerror=...>` into the staging fixture and opens the preview; assert no dialog is raised and no `onerror` attribute remains in the DOM.

- [ ] **Step 7: Verify and commit**

```bash
npm run test:unit
npm run build
git add package.json package-lock.json src/lib/sanitize.ts src/components/SafeHtml.tsx \
  src/lib/automation/pipeline.ts src/lib/workspace/repository.ts \
  src/app/automations/page.tsx src/app/editor/page.tsx src/app/help/page.tsx \
  scripts/sanitize-content.mjs tests/unit/sanitize.test.ts e2e/security.spec.ts
git commit -m "security: sanitize generated and stored HTML at every boundary"
```

### Task 1.7: Enforce a nonce-based Content Security Policy

**Files:**
- Create: `src/proxy.ts`
- Modify: `src/app/layout.tsx`
- Modify: `src/components/layout/LayoutWrapper.tsx:113`
- Modify: `src/app/globals.css`
- Test: `e2e/security.spec.ts`, `e2e/public.spec.ts`

- [ ] **Step 1: Add the Next 16 Proxy**

Create `src/proxy.ts`:

```ts
import { NextResponse, type NextRequest } from "next/server";

function appwriteOrigin(): string {
  const endpoint = process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT;
  if (!endpoint) throw new Error("NEXT_PUBLIC_APPWRITE_ENDPOINT is required.");
  return new URL(endpoint).origin;
}

export function proxy(request: NextRequest) {
  const nonce = Buffer.from(crypto.randomUUID()).toString("base64");
  const isDev = process.env.NODE_ENV !== "production";
  const csp = [
    "default-src 'self'",
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src-elem 'self' 'nonce-${nonce}' https://fonts.googleapis.com`,
    "style-src-attr 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' https://fonts.gstatic.com",
    `connect-src 'self' ${appwriteOrigin()}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("Content-Security-Policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("Content-Security-Policy", csp);
  return response;
}

export const config = {
  matcher: [
    {
      source: "/((?!api|_next/static|_next/image|favicon.ico).*)",
      missing: [
        { type: "header", key: "next-router-prefetch" },
        { type: "header", key: "purpose", value: "prefetch" },
      ],
    },
  ],
};
```

The `style-src-attr 'unsafe-inline'` is required because the UI uses React inline style attributes; it does not permit injected `<style>` or `<link>` elements.

- [ ] **Step 2: Make rendering nonce-aware**

In `src/app/layout.tsx`:

```tsx
import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const nonce = (await headers()).get("x-nonce") ?? "";
  return (
    <html lang="en" className={fontVariables} suppressHydrationWarning>
      <head>
        <script
          nonce={nonce}
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var saved = localStorage.getItem('writerdost_theme');
                  var isDark = saved === 'dark' || (!saved && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
                  if (isDark) {
                    document.documentElement.classList.add('dark');
                    document.documentElement.classList.remove('light');
                  } else {
                    document.documentElement.classList.remove('dark');
                    document.documentElement.classList.add('light');
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
        {/* Google Fonts link remains; it is allowed by style-src-elem host */}
      </head>
      <body>
        <LayoutWrapper>{children}</LayoutWrapper>
      </body>
    </html>
  );
}
```

The script body above is the current theme bootstrap with `nonce={nonce}` added. `headers()` makes the app dynamically rendered for the nonce, which is required by Next’s CSP model.

- [ ] **Step 3: Remove the inline style element from the client layout**

Move the complete CSS text currently inside the `<style dangerouslySetInnerHTML={{__html: ...}}>` block in `LayoutWrapper.tsx` into `src/app/globals.css` unchanged. Delete the `<style>` element. Keep all animations working via classes/selectors.

- [ ] **Step 4: Add CSP assertions**

In `e2e/security.spec.ts`:

```ts
test("serves a nonce-based CSP without script unsafe-inline", async ({ request }) => {
  const response = await request.get("/");
  const csp = response.headers()["content-security-policy"] || "";
  expect(csp).toContain("script-src 'self' 'nonce-");
  expect(csp).not.toContain("script-src 'self' 'unsafe-inline'");
  expect(csp).toContain("frame-ancestors 'none'");
});

test("landing page has no CSP console violations", async ({ page }) => {
  const failures: string[] = [];
  page.on("console", (message) => {
    if (message.type() === "error" && message.text().includes("Content Security Policy")) {
      failures.push(message.text());
    }
  });
  await page.goto("/");
  await page.waitForLoadState("networkidle");
  expect(failures).toEqual([]);
});
```

- [ ] **Step 5: Verify and commit**

```bash
npm run test:e2e -- --project=chromium e2e/security.spec.ts e2e/public.spec.ts
npm run build
git add src/proxy.ts src/app/layout.tsx src/components/layout/LayoutWrapper.tsx src/app/globals.css e2e/security.spec.ts
git commit -m "security: enforce nonce-based CSP and remove inline style injection"
```

### Task 1.8: Upgrade vulnerable dependencies and clear the audit

**Files:**
- Modify: `package.json`
- Modify: `package-lock.json`
- Test: `npm audit`, `npm run build`, unit/E2E suites

- [ ] **Step 1: Upgrade Next and all Tiptap packages together**

```bash
npm install next@16.4.2 eslint-config-next@16.4.2
npm install @tiptap/react@3.32.0 @tiptap/starter-kit@3.32.0 \
  @tiptap/extension-bubble-menu@3.32.0 @tiptap/extension-image@3.32.0 \
  @tiptap/extension-placeholder@3.32.0 @tiptap/extension-text-align@3.32.0 \
  @tiptap/extension-text-style@3.32.0
npm install
```

All Tiptap packages must share the same version. Do not use `npm audit fix --force` or `--legacy-peer-deps`; resolve the actual peer set.

- [ ] **Step 2: Add safe transitive overrides only if the direct upgrade leaves an advisory**

In `package.json`, add an `overrides` block for the specific affected packages reported by `npm audit` (for example `prosemirror-view`, `@xmldom/xmldom`, `nanoid`, `sharp`, `postcss`), then run `npm install`. Do not add broad overrides that change major versions of runtime libraries without testing.

- [ ] **Step 3: Add the audit gate and verify the app**

Add this step to `.github/workflows/ci.yml` immediately after `npm ci`:

```yaml
      - run: npm audit --omit=dev --audit-level=high
```

Then run locally:

```bash
npm audit --omit=dev --audit-level=high
npm run typecheck
npm run lint
npm run test:unit
npm run build
npm run test:e2e -- --project=chromium
```

Expected: audit exits 0 for high/critical; all checks pass. Some Next advisories require ImageResponse/image optimization/Windows and may not be reachable here, but the pinned version must still be current.

- [ ] **Step 4: Commit**

```bash
git add package.json package-lock.json .github/workflows/ci.yml
git commit -m "chore: upgrade Next.js and Tiptap to patched releases"
```

### Task 1.9: Consolidate the security regression suite

**Files:**
- Modify: `e2e/security.spec.ts`
- Create: `tests/unit/auth.test.ts` if route mocking is preferred
- Modify: `README.md` with test instructions

- [ ] **Step 1: Cover each security invariant**

The final suite must assert:

- Anonymous POST to every costly route returns 401.
- Preview cannot use another user’s destination and cannot publish without a destination ID.
- `WRITERDOST_ALLOW_LOCAL_AI=true` without self-hosted mode fails env validation.
- `safeFetch` blocks private IPv4/IPv6 ranges and strips credentials on cross-origin redirects.
- A stored `<img onerror>` payload renders without executing.
- A 31st request in a minute to `/api/ai` is rate-limited.
- A missing `Content-Security-Policy` header fails the test.
- A 3xx publish response is recorded as failed, not published.

- [ ] **Step 2: Document how to run the security suite safely and wire it to staging CI**

Add to `README.md`: `npm run test:unit && npm run test:e2e -- --project=chromium e2e/security.spec.ts`; state that cross-tenant tests require the staging Appwrite project and must never run against production.

Create a `security-e2e` GitHub Actions job that runs only on `main`/nightly with staging secrets (`STAGING_APPWRITE_ENDPOINT`, `STAGING_APPWRITE_PROJECT_ID`, `STAGING_APPWRITE_API_KEY`, `STAGING_DATABASE_ID`, `NEXT_PUBLIC_APPWRITE_*`, `WRITERDOST_ENCRYPTION_KEY`, `WRITERDOST_CRON_SECRET`). It must seed two disposable users and one destination through a setup script, run the security suite, and delete the fixtures in an `always()` cleanup step. Do not run this job against production.

- [ ] **Step 3: Verify and commit**

```bash
npm run test:unit
npm run test:e2e -- --project=chromium e2e/security.spec.ts
git add e2e/security.spec.ts tests README.md
git commit -m "test: lock in the security regression suite"
```

### Task 1.10: Close the remaining API validation, privilege, and cost-control gaps

**Files:**
- Modify: `src/app/api/posts/route.ts`
- Modify: `src/lib/automation/user-repository.ts`
- Modify: `src/app/api/admin/users/[id]/route.ts`
- Modify: `src/app/api/upgrade-requests/route.ts`
- Modify: `src/app/api/destinations/route.ts` and `[id]/route.ts`
- Modify: `src/app/api/automations/route.ts` and `[id]/route.ts`
- Modify: `src/lib/automation/types.ts`, `src/lib/automation/wire.ts`
- Modify: `src/lib/ai-server-utils.ts:56-84`
- Test: `tests/unit/api-validation.test.ts`, `e2e/admin-safety.spec.ts`

- [ ] **Step 1: Stop post mass assignment**

In `src/lib/automation/user-repository.ts`, accept only these client fields when saving a manual post: `title`, `slug`, `bodyHtml`, `bodyMarkdown`, `excerpt`, `metaDescription`, `keywords`, `sourceUrl`, `sourceTitle`. Set `state: "draft"`, `remoteId: null`, `remoteUrl: null`, and `quality` from the server-side quality assessment. Ignore or reject `state`, `remoteId`, `remoteUrl`, `quality`, and `runId` from the request body.

If `automationId` is supplied, load that automation with the JWT-scoped table and verify it belongs to the caller; otherwise set it to null. Sanitize `bodyHtml` with `sanitizeGeneratedHtml` before storing. Add tests that a forged `state: "published"` is persisted as `draft` and that another user’s automation ID is rejected.

- [ ] **Step 2: Validate admin changes and prevent self-lockout**

In `admin/users/[id]/route.ts`, validate `status` against `"active" | "suspended"` and `role` against `"user" | "admin"`; return 400 for any other value. Compute the resolved changes first, then run the last-admin guard against the resolved values, not the raw strings. Add a test that `{ "status": "disabled" }` returns 400 instead of stripping the admin label.

Add a test that an admin cannot demote, suspend, or delete the final admin account. The check must count active admins through the Users API and compare the target against that count.

- [ ] **Step 3: Validate destination kinds and upgrade requests**

In both destination routes and the repository, accept only `wordpress`, `ghost`, `webflow`, `strapi`, `sanity`, `webhook`. Return 400 for anything else before writing.

In `upgrade-requests`, define a shared allowlist:

```ts
export const UPGRADE_FEATURES = ["createEbook", "rewriteEbook", "blogGenerator", "advancedModels"] as const;
```

Reject unknown features with 400. Cap pending requests per user at 5; if the cap is reached, return the existing pending request instead of inserting another row. Add tests for both.

- [ ] **Step 4: Stop reflecting internal errors**

For admin, destinations, automations, and upgrade routes, log the error name, message, and stack with a request ID (never the request body or credentials) and return a generic message:

```ts
console.error({ requestId, route: "destinations", error });
return NextResponse.json({ error: "The request could not be completed." }, { status: 500 });
```

Keep user-facing validation messages, but never return Appwrite table/column names, endpoints, or raw SDK messages. Add a test that a forced Appwrite failure does not include `APPWRITE` or a table name in the response body.

- [ ] **Step 5: Cap model output and automation cost**

In `buildBody` in `ai-server-utils.ts`, set `max_tokens: 4096` for OpenAI-compatible providers, matching Claude. In the automation repository, clamp `contentConfig.targetWords` to `100..5000` and `sourceConfig.maxPerRun` to `1..10` on both create and update. Reject a custom cron that would run more often than every 5 minutes (the scheduler cadence); return 400 with an explanation.

Add tests that an automation with `targetWords: 1_000_000` is stored as 5,000 and that an every-minute cron is rejected.

- [ ] **Step 6: Verify and commit**

```bash
npm run test:unit
npm run test:e2e -- --project=chromium e2e/admin-safety.spec.ts
npm run build
git add src/app/api/posts src/lib/automation/user-repository.ts src/app/api/admin/users/[id]/route.ts \
  src/app/api/upgrade-requests src/app/api/destinations src/app/api/automations \
  src/lib/automation/types.ts src/lib/automation/wire.ts src/lib/ai-server-utils.ts \
  tests/unit/api-validation.test.ts e2e/admin-safety.spec.ts
git commit -m "fix: validate remaining API inputs and cap automation costs"
```

### Gate 1 — Security

- [ ] All listed API routes require a session.
- [ ] No anonymous preview can publish; no inline destination is accepted.
- [ ] Loopback/private/metadata addresses are blocked by default; redirects cannot carry credentials to a new host.
- [ ] HTML is sanitized on write and on render; CSP is present with a nonce.
- [ ] No high/critical production dependency advisory remains.
- [ ] `npm audit`, typecheck, lint, unit, security E2E, and build are green.

---

## Phase 2 — Data integrity, workspace recovery, and scheduler correctness

**Outcome:** Users cannot silently lose manuscripts, two ticks cannot publish the same source twice, crashed runs are visible and recoverable, and generated posts are idempotent at the publish boundary.

### Task 2.1: Fix the workspace retry/recovery path

**Files:**
- Modify: `src/lib/app-store.ts`
- Modify: `src/components/WorkspaceStatus.tsx`
- Modify: `src/components/AuthGuard.tsx`
- Modify: `src/lib/workspace/wire.ts` if a load-error discriminant is needed
- Test: `tests/unit/workspace-recovery.test.ts`, `e2e/workspace-recovery.spec.ts`

- [ ] **Step 1: Separate load failures from save failures**

Add to the `AppStore` type and initial state:

```ts
workspaceErrorKind: "" | "load" | "save";
```

Set `workspaceErrorKind: "load"` in `openWorkspace`’s catch and in the initial workspace fetch failure. Set `workspaceErrorKind: "save"` in `flushWorkspace`’s catch. Clear it on a successful load/save.

Also distinguish a session lookup failure from an invalid session in `restoreSession`: if `account().get()` fails with a network/5xx error rather than 401, set `authStatus: "error"`, keep `currentUser: null`, and render a retry screen in `AuthGuard` that calls `restoreSession()` again. Do not redirect to `/login` on a transient network failure.

- [ ] **Step 2: Remove the discard bug**

In `flushWorkspace`, delete the block at approximately lines 823-838 that calls `fetchWorkspace()` and then sets `workspaceStatus: "ready"` without using the result. A failed load must remain `workspaceStatus: "error"` until a real reload occurs.

- [ ] **Step 3: Add an explicit reload action**

Add to the store:

```ts
retryWorkspaceLoad: async () => {
  const userId = get().currentUser?.id;
  if (!userId) return;
  set({ workspaceStatus: "loading", workspaceError: "", workspaceErrorKind: "" });
  try {
    const snapshot = await fetchWorkspace();
    applyWorkspaceSnapshot(snapshot, userId);
  } catch (error) {
    set({
      workspaceStatus: "error",
      workspaceError: error instanceof Error ? error.message : "Could not load your workspace.",
      workspaceErrorKind: "load",
    });
  }
},
```

Extract the snapshot application from `openWorkspace` into `applyWorkspaceSnapshot(snapshot, userId)` so both paths behave identically. It must set the baseline `saveState.settings`/`saveState.projects` and call `startSync()`.

If there are unsaved local changes (`pendingPatch()` is non-null), do not replace the local store with the snapshot. Keep the error state and show “Save or discard your local changes before reloading”; Task 2.2 adds the durable recovery prompt and conflict flow.

- [ ] **Step 4: Make the status button do the right thing**

In `WorkspaceStatus.tsx`, if `workspaceErrorKind === "load"`, call `retryWorkspaceLoad`; if `"save"`, call `saveWorkspaceNow(true)`. Do not use one button for both.

- [ ] **Step 5: Test the exact failure**

Use Playwright route interception to fail the first `GET /api/workspace` with 503, then fulfill the retry with a fixture project. Expected: after clicking the dedicated “Reload workspace” label, the fixture project appears; the app never marks a blank workspace as ready.

- [ ] **Step 6: Add the auth retry screen and verify**

Add the `authStatus: "error"` branch to `AuthGuard` with a “Retry connection” button; do not redirect. Test by intercepting the Appwrite session lookup with a network failure.

```bash
npm run test:unit
npm run test:e2e -- --project=chromium e2e/workspace-recovery.spec.ts
git add src/lib/app-store.ts src/components/WorkspaceStatus.tsx src/components/AuthGuard.tsx \
  tests/unit/workspace-recovery.test.ts e2e/workspace-recovery.spec.ts
git commit -m "fix: reload the workspace snapshot and retry transient auth failures"
```

### Task 2.2: Add a scoped local recovery buffer and protect unload/logout

**Files:**
- Modify: `package.json`
- Create: `src/lib/recovery-store.ts`
- Modify: `src/lib/app-store.ts`
- Create: `src/components/RecoveryPrompt.tsx`
- Modify: `src/components/layout/LayoutWrapper.tsx`
- Test: `tests/unit/recovery-store.test.ts`, `e2e/recovery.spec.ts`

- [ ] **Step 1: Add an IndexedDB-backed recovery snapshot**

```bash
npm install idb-keyval
```

Create `src/lib/recovery-store.ts`:

```ts
import { del, get, set } from "idb-keyval";

const keyFor = (userId: string) => `writerdost-recovery:${userId}`;

export type RecoverySnapshot = {
  userId: string;
  patch: unknown;
  savedAt: number;
};

export async function writeRecovery(userId: string, patch: unknown): Promise<void> {
  await set(keyFor(userId), { userId, patch, savedAt: Date.now() } satisfies RecoverySnapshot);
}

export async function readRecovery(userId: string): Promise<RecoverySnapshot | null> {
  return (await get<RecoverySnapshot>(keyFor(userId))) ?? null;
}

export async function clearRecovery(userId: string): Promise<void> {
  await del(keyFor(userId));
}
```

Store only workspace settings/projects, never API keys. Redact any `apiKey`, `secret`, `token`, `cipher`, or `platform` fields before writing. The buffer is plaintext IndexedDB, scoped to the user ID, cleared after a confirmed save or explicit discard, and disclosed in the privacy policy; it must not contain credentials. Add a unit test with `fake-indexeddb` to prove those fields are absent.

- [ ] **Step 2: Write recovery snapshots while saving**

In `flushWorkspace`, after `pendingPatch` builds a patch and before the network call:

```ts
await writeRecovery(saveState.userId, patch);
```

After a successful `pushWorkspace` and `markSaved`, clear the snapshot only if no newer pending change arrived. Add a local `recoveryRevision` counter, capture it before the request, and clear only when the current revision equals the captured revision.

- [ ] **Step 3: Offer recovery on load**

After a successful server load, if a recovery snapshot exists with `savedAt > serverUpdatedAt`, show a modal: “Unsaved changes found on this device. Restore them?” with `Restore` and `Discard`. Restoring applies the saved patch to the store and marks it pending; discarding calls `clearRecovery`.

- [ ] **Step 4: Protect closing and logout**

- Add `beforeunload` when `pendingPatch()` is non-null.
- Keep the pagehide keepalive for small patches; for large patches, the IndexedDB snapshot is the durable copy.
- Change `logout` to check `workspaceErrorKind === "save"` and unsaved changes. If a save fails, show a confirmation with “Retry save” and “Sign out anyway”; only clear the store and delete the session after the user chooses “Sign out anyway” or the save succeeds. Do not silently lose the last changes.

- [ ] **Step 5: Test**

- Simulate an offline save with Playwright; assert a recovery snapshot exists.
- Reload; assert the restore prompt appears and restores the manuscript.
- Simulate logout with a failing save; assert the logout is blocked until the user confirms.

- [ ] **Step 6: Verify and commit**

```bash
npm run test:unit
npm run test:e2e -- --project=chromium e2e/recovery.spec.ts
git add package.json package-lock.json src/lib/recovery-store.ts src/lib/app-store.ts \
  src/components/RecoveryPrompt.tsx src/components/layout/LayoutWrapper.tsx \
  tests/unit/recovery-store.test.ts e2e/recovery.spec.ts
git commit -m "fix: add durable local recovery and unsaved-change guards"
```

### Task 2.3: Add atomic automation leases and stale-run recovery

**Files:**
- Modify: `appwrite/setup.mjs`
- Modify: `src/lib/appwrite/server.ts` (table id)
- Modify: `src/lib/automation/repository.ts`
- Modify: `src/app/api/automations/tick/route.ts`
- Test: `tests/unit/automation-lease.test.ts`, `scripts/appwrite-schema-check.mjs`

- [ ] **Step 1: Add a worker-only lease table**

Add to `TABLES`:

```ts
leases: "automation_leases",
```

Add to `setup.mjs`:

```js
{
  id: "automation_leases",
  permissions: [],
  name: "Automation leases",
  columns: [
    s("automationId", 64, { required: true }),
    s("runId", 64, { required: true }),
    when("expiresAt", { required: true }),
  ],
  indexes: [key("leases_by_expiry", ["expiresAt"], [OrderBy.Asc])],
},
```

Run `npm run appwrite:setup` on staging and verify the table is created. No user table permission is granted.

- [ ] **Step 2: Implement claim/release**

In `repository.ts`:

```ts
const LEASE_MS = 15 * 60_000;

export async function claimAutomation(automation: Automation, runId: string): Promise<boolean> {
  const db = workerTables();
  const rowId = rowKey("lease", automation.id);
  const expiresAt = new Date(Date.now() + LEASE_MS).toISOString();

  try {
    await db.createRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.leases,
      rowId,
      data: { automationId: automation.id, runId, expiresAt },
      permissions: [],
    });
    return true;
  } catch (error) {
    if ((error as { code?: number }).code !== 409) throw error;
  }

  const existing = (await db.getRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.leases,
    rowId,
  })) as unknown as { runId: string; expiresAt: string };

  if (new Date(existing.expiresAt).getTime() > Date.now()) return false;
  await db.deleteRow({ databaseId: DATABASE_ID, tableId: TABLES.leases, rowId });
  return claimAutomation(automation, runId);
}

export async function releaseAutomation(automationId: string, runId: string): Promise<void> {
  const db = workerTables();
  const rowId = rowKey("lease", automationId);
  try {
    const row = (await db.getRow({ databaseId: DATABASE_ID, tableId: TABLES.leases, rowId })) as unknown as { runId: string };
    if (row.runId !== runId) return;
    await db.deleteRow({ databaseId: DATABASE_ID, tableId: TABLES.leases, rowId });
  } catch (error) {
    if ((error as { code?: number }).code !== 404) throw error;
  }
}
```

- [ ] **Step 3: Claim before executing and release in `finally`**

In `tick/route.ts`, for each due automation:

```ts
const runId = await openRun(automation, "schedule");
const claimed = await claimAutomation(automation, runId);
if (!claimed) {
  await skipRun(runId, "Another worker holds the lease.");
  continue;
}
try {
  await executeClaimed(automation, runId);
} finally {
  await releaseAutomation(automation.id, runId);
}
```

Add `skipRun` to `repository.ts`; it updates only the run row and does not advance `nextRunAt`:

```ts
export async function skipRun(runId: string, detail: string): Promise<void> {
  const db = workerTables();
  await db.updateRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.runs,
    rowId: runId,
    data: { status: "skipped", detail, finishedAt: new Date().toISOString() },
  });
}
```

Create the run before claiming so a lost claim leaves an immediately skipped record, not a stuck `running` row. Test this exact ordering.

- [ ] **Step 4: Add a stale-run reaper**

At the start of each tick, query `automation_runs` with `status = "running"` and `startedAt < now - 15m`. Mark each `status: "error"`, `detail: "Worker stopped before completing the run."`, set `finishedAt`, and release its lease if the runId matches. Log the count. This clears crashed runs without user intervention.

- [ ] **Step 5: Test two simultaneous claims**

`tests/unit/automation-lease.test.ts` should call `claimAutomation` concurrently for the same ID and assert exactly one `true`; then simulate an expired lease and assert the next claimant wins. Use a fake Appwrite adapter or the staging project; do not use production.

- [ ] **Step 6: Verify and commit**

```bash
npm run test:unit
npm run build
node appwrite/setup.mjs # staging only
git add appwrite/setup.mjs src/lib/appwrite/server.ts src/lib/automation/repository.ts \
  src/app/api/automations/tick/route.ts tests/unit/automation-lease.test.ts scripts/appwrite-schema-check.mjs
git commit -m "fix: add atomic automation leases and stale-run recovery"
```

### Task 2.4: Add a publish outbox with idempotency

**Files:**
- Modify: `appwrite/setup.mjs`
- Modify: `src/lib/appwrite/server.ts`
- Create: `src/lib/automation/outbox.ts`
- Modify: `src/lib/automation/pipeline.ts:216-253`
- Modify: `src/lib/automation/repository.ts:303-384`
- Modify: `src/lib/automation/destinations.ts`
- Modify: `../wordpress-plugin/writerdost-connect/includes/class-wd-importer.php`
- Test: `tests/unit/publish-outbox.test.ts`

- [ ] **Step 1: Add the publish-jobs table**

Schema:

```js
{
  id: "publish_jobs",
  permissions: [],
  name: "Publish jobs",
  columns: [
    s("automationId", 64, { required: true }),
    s("userId", 64, { required: true }),
    s("sourceHash", 64, { required: true }),
    oneOf("status", ["sending", "sent", "failed", "unknown"], { xdefault: "sending" }),
    s("remoteId", 255),
    s("remoteUrl", 2048),
    int("attempts", { min: 0, xdefault: 1 }),
    text("lastError"),
    when("updatedAt"),
  ],
  indexes: [key("jobs_by_automation", ["automationId", "sourceHash"], [OrderBy.Asc, OrderBy.Asc])],
},
```

Add `publishJobs: "publish_jobs"` to `TABLES`.

- [ ] **Step 2: Create a job before the remote call**

Create `src/lib/automation/outbox.ts` with:

```ts
export async function beginPublish(
  automation: Automation,
  sourceHash: string,
): Promise<{ allowed: boolean; status?: string }> {
  const db = workerTables();
  const rowId = rowKey("publish", automation.id, sourceHash);
  try {
    await db.createRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.publishJobs,
      rowId,
      data: {
        automationId: automation.id,
        userId: automation.userId,
        sourceHash,
        status: "sending",
        attempts: 1,
        updatedAt: new Date().toISOString(),
      },
      permissions: ownerPermissions(automation.userId),
    });
    return { allowed: true };
  } catch (error) {
    if ((error as { code?: number }).code !== 409) throw error;
  }

  const row = (await db.getRow({ databaseId: DATABASE_ID, tableId: TABLES.publishJobs, rowId })) as unknown as {
    status: string;
  };
  if (row.status === "sent" || row.status === "sending") return { allowed: false, status: row.status };
  await db.updateRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.publishJobs,
    rowId,
    data: { status: "sending", attempts: 2, updatedAt: new Date().toISOString(), lastError: null },
  });
  return { allowed: true };
}

export async function finishPublish(
  automation: Automation,
  sourceHash: string,
  result: { remoteId?: string; remoteUrl?: string },
): Promise<void> {
  const db = workerTables();
  await db.updateRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.publishJobs,
    rowId: rowKey("publish", automation.id, sourceHash),
    data: {
      status: "sent",
      remoteId: result.remoteId ?? null,
      remoteUrl: result.remoteUrl ?? null,
      lastError: null,
      updatedAt: new Date().toISOString(),
    },
  });
}

export async function failPublish(
  automation: Automation,
  sourceHash: string,
  error: unknown,
  unknownOutcome = false,
): Promise<void> {
  const db = workerTables();
  const message = error instanceof Error ? error.message.slice(0, 1000) : "Publish failed.";
  await db.updateRow({
    databaseId: DATABASE_ID,
    tableId: TABLES.publishJobs,
    rowId: rowKey("publish", automation.id, sourceHash),
    data: {
      status: unknownOutcome ? "unknown" : "failed",
      lastError: message,
      updatedAt: new Date().toISOString(),
    },
  });
}
```

Define this in `destinations.ts` and throw it when the request was sent but no response was received:

```ts
export class PublishTimeoutError extends Error {
  constructor() {
    super("The publish request timed out after it was sent.");
    this.name = "PublishTimeoutError";
  }
}
```

`finishPublish` sets `sent`; `failPublish` sets `failed` for a known failure and `unknown` for a timeout after sending, so the next run does not automatically republish. Persist an unknown post as `state: "failed"` and expose the linked publish job as “Needs review.”

- [ ] **Step 3: Use the outbox around the publish call**

In `pipeline.ts`, after the post/quality are ready and before `publishPost`:

```ts
const claim = await beginPublish(automation, sourceHash);
if (!claim.allowed) {
  outcome.posts.push({ post, quality, state: "draft", sourceHash });
  continue;
}
try {
  const result = await publishPost(post, automation.destination, mode, sourceHash);
  await finishPublish(automation, sourceHash, result);
  ...
} catch (error) {
  const isUnknown = error instanceof PublishTimeoutError;
  await failPublish(automation, sourceHash, error, isUnknown);
  ...
}
```

Add an `idempotencyKey`/`sourceHash` argument to `publishPost` and send `x-writerdost-idempotency-key` plus `externalId` in the webhook payload. For the WordPress plugin, use `externalId` for its existing dedupe lookup. The built-in WordPress adapter is best-effort because core `/wp/v2/posts` has no idempotency key; document that WriterDost Connect is required for strict publish idempotency.

- [ ] **Step 4: Persist only after outcome is known**

Keep post persistence in `closeRun`, but use deterministic post row IDs `rowKey("post", automation.id, sourceHash)` so a retry upserts the same row. For an `unknown` publish job, persist the post with `state: "failed"` and link it by `automationId` + `sourceHash` to the publish job; the UI labels that row “Needs review.” Do not mark a post `published` without a 2xx response and a remote identifier.

- [ ] **Step 5: Test the failure matrix**

`tests/unit/publish-outbox.test.ts` must cover:

1. No job → allowed, then finishes `sent`.
2. Existing `sent` job → not allowed, no second remote call.
3. Existing `failed` job → allowed to retry, attempts increments.
4. Timeout after the request was sent → `unknown`, no automatic retry, a review item is visible.
5. Database write failure after remote success → the job remains `sending`/`unknown`; the next tick does not republish.

- [ ] **Step 6: Verify and commit**

```bash
npm run test:unit
npm run build
node appwrite/setup.mjs # staging only
git add appwrite/setup.mjs src/lib/appwrite/server.ts src/lib/automation/outbox.ts \
  src/lib/automation/pipeline.ts src/lib/automation/repository.ts \
  src/lib/automation/destinations.ts ../wordpress-plugin/writerdost-connect/includes/class-wd-importer.php \
  tests/unit/publish-outbox.test.ts
git commit -m "fix: make scheduled publishing idempotent with a durable outbox"
```

### Task 2.5: Add absolute run deadlines, backoff, and correct failure scheduling

**Files:**
- Modify: `src/lib/automation/pipeline.ts`
- Modify: `src/lib/automation/sources.ts`
- Modify: `src/lib/ai-server-utils.ts`
- Modify: `src/lib/automation/repository.ts:388-414`
- Modify: `src/lib/automation/types.ts`
- Modify: `appwrite/setup.mjs`
- Modify: `src/app/api/automations/tick/route.ts`
- Test: `tests/unit/scheduler-deadline.test.ts`, `tests/unit/schedule-failure.test.ts`

- [ ] **Step 1: Pass a deadline through the run**

In `tick/route.ts`, before each automation:

```ts
const deadlineAt = Date.now() + 240_000;
const outcome = await runAutomation(automation, seen, { deadlineAt });
```

Add a helper:

```ts
export function remainingMs(deadlineAt: number): number {
  return Math.max(0, deadlineAt - Date.now());
}

export function assertTimeLeft(deadlineAt: number, label: string): void {
  if (remainingMs(deadlineAt) < 5_000) throw new Error(`Run deadline reached before ${label}.`);
}
```

- [ ] **Step 2: Stop work at the deadline**

Call `assertTimeLeft` before each source fetch, each AI call, each publish, and each item. Pass `Math.min(300_000, remainingMs(deadlineAt))` as the per-call timeout to `callModel`. In `collectSourceItems`, check the deadline before each attempt and return the items collected so far; do not start another fetch when fewer than 5 seconds remain.

- [ ] **Step 3: Correct failure scheduling**

Add `int("failureCount", { min: 0, xdefault: 0 })` to the `automations` table in `setup.mjs`, include it in the `Automation` type and row mapper, and reset it to 0 in `closeRun` on success.

Replace `failRun`’s raw `nextRunAt(...)` call with:

```ts
const failureCount = (automation.failureCount ?? 0) + 1;
const backoffMs = Math.min(6 * 60 * 60_000, 60_000 * 2 ** Math.min(6, failureCount));
const scheduled = nextRunFor({ ...automation, lastRunAt: now.toISOString() }, now);
const next =
  failureCount >= 5
    ? null
    : scheduled
      ? new Date(Math.max(scheduled.getTime(), now.getTime() + backoffMs))
      : new Date(now.getTime() + backoffMs);

await db.updateRow({
  databaseId: DATABASE_ID,
  tableId: TABLES.automations,
  rowId: automation.id,
  data: {
    lastRunAt: now.toISOString(),
    nextRunAt: next?.toISOString() ?? null,
    failureCount,
    ...(next ? {} : { enabled: false }),
  },
});
```

For a one-off failure, `nextRunFor` returns null and the automation is disabled immediately. After 5 consecutive failures, disable it and record `lastError` on the run. Do not silently keep retrying forever.

- [ ] **Step 4: Ensure a killed run cannot duplicate**

The lease TTL must exceed the run deadline (15 minutes > 4 minutes). If the process is killed, the reaper marks the run error and releases the lease; `nextRunAt` is advanced by the reaper or by a subsequent failure handler, not left due. Add a test that simulates a killed worker and runs the reaper twice; only one retry is scheduled.

- [ ] **Step 5: Test with fake time**

Use Vitest fake timers to prove that after the deadline, no further AI or fetch calls happen. Add a test that a failed `once` job does not get a new `nextRunAt`.

- [ ] **Step 6: Verify and commit**

```bash
npm run test:unit
npm run build
node appwrite/setup.mjs # staging only
git add src/lib/automation/pipeline.ts src/lib/automation/sources.ts src/lib/ai-server-utils.ts \
  src/lib/automation/repository.ts src/lib/automation/types.ts appwrite/setup.mjs \
  src/app/api/automations/tick/route.ts tests/unit/scheduler-deadline.test.ts tests/unit/schedule-failure.test.ts
git commit -m "fix: bound automation runs and schedule retries correctly"
```

### Task 2.6: Validate post fields, canonicalize dedupe, and expose run history

**Files:**
- Modify: `src/lib/automation/pipeline.ts:144-150`
- Modify: `src/lib/automation/sources.ts:151-210`
- Modify: `src/lib/automation/repository.ts`
- Create: `src/app/api/automations/[id]/runs/route.ts`
- Modify: `src/app/automations/page.tsx`
- Test: `tests/unit/automation-dedupe.test.ts`

- [ ] **Step 1: Clamp fields to the Appwrite schema**

Use `.slice(0, 512)` for titles and `.slice(0, 128)` for each keyword; cap keywords to 8; ensure meta description length; normalize missing fields. Validate before calling `publishPost` so one oversized post cannot fail the batch after a remote publish.

- [ ] **Step 2: Canonicalize URLs and make the dedupe window explicit**

In `sources.ts`, normalize the URL before hashing: lowercase host, remove default ports, remove trailing slashes except root, sort query parameters, and strip common tracking parameters (`utm_*`, `fbclid`, `gclid`). Before filtering, sort feed candidates by `publishedAt` descending (newest first), with undated items last; the current code claims newest-first but does not sort. Add tests for three URL variants producing the same hash and for newest-first selection.

Keep the 2,000-row read cap for prompt context and document it. Task 2.7 compacts each automation’s seen history to the newest 5,000 rows weekly; do not imply indefinite dedupe.

- [ ] **Step 3: Add a run-history endpoint**

Create `GET /api/automations/[id]/runs`:

1. `requireUser`.
2. Load the automation with `session.tables` and verify ownership.
3. Use the worker client to list `automation_runs` filtered by `automationId` and the session user ID.
4. Return `{ runs: [{ id, status, trigger, detail, tokensUsed, startedAt, finishedAt }] }`.
5. Limit to the newest 50 and never return other users’ automation data.

Add an expandable “Run history” section to the automations page showing status, time, and error detail. Do not show raw stack traces.

- [ ] **Step 4: Add tests**

Test URL canonicalization and field clamping. Add an API test that a user cannot read another user’s run history (expect 404). Test that an oversized title is clamped before persistence.

- [ ] **Step 5: Verify and commit**

```bash
npm run test:unit
npm run build
git add src/lib/automation src/app/api/automations src/app/automations/page.tsx tests/unit/automation-dedupe.test.ts
git commit -m "fix: validate generated post fields and expose run history"
```

### Task 2.7: Add operational retention and make failures visible

**Files:**
- Create: `scripts/retention.mjs`
- Modify: `src/lib/automation/repository.ts`
- Modify: `src/lib/automation/destinations.ts`
- Modify: `src/app/automations/page.tsx`
- Modify: `appwrite/setup.mjs` only if a retry/attempt column is needed
- Test: `tests/unit/retention.test.ts`, `e2e/publish-review.spec.ts`

- [ ] **Step 1: Record publish health and reap stale sends**

After every publish attempt, update the destination row with `lastOkAt` and clear `lastError` on 2xx; on failure set `lastError` to a short, non-secret message and keep `lastOkAt` unchanged. The automations page should show the last error and a “Retry” or “Review” action for `unknown` publish jobs.

At the start of each scheduler tick, find `publish_jobs` with `status = "sending"` and `updatedAt < now - 15m`. Mark them `unknown`, set `lastError` to “Worker stopped while publishing; verify the remote post before retrying,” and emit an alert. Never auto-retry a stale send.

- [ ] **Step 2: Record tokens even when a run fails**

Change `failRun` to accept an optional `tokensUsed` argument and persist it. When `runAutomation` throws after partial AI usage, pass the accumulated token count to `failRun`. Add a test that a failed run shows the real token count rather than zero.

- [ ] **Step 3: Make `unknown` publish jobs visible**

Add a “Needs review” filter to the automations page that lists `publish_jobs.status = "unknown"` for the user’s automations. The row must show the source title/URL, the last attempt time, and a manual “Retry publish” button that requires explicit confirmation. Do not auto-retry unknown jobs.

- [ ] **Step 4: Add a retention policy and script**

Document and implement:

- `automation_runs`: delete rows older than 90 days.
- `publish_jobs`: delete `sent`/`failed` rows older than 180 days; retain `unknown` until manually resolved.
- `seen_sources`: compact to the newest 5,000 rows per automation; run weekly.
- `generated_posts`: do not auto-delete user content; expose account export/deletion instead.

Create `scripts/retention.mjs` with a `--dry-run` default, `--apply` confirmation, pagination, and counts. Run it from a weekly job and log only counts.

- [ ] **Step 5: Test and commit**

```bash
npm run test:unit
npm run build
git add scripts/retention.mjs src/lib/automation/repository.ts src/lib/automation/destinations.ts \
  src/app/automations/page.tsx tests/unit/retention.test.ts e2e/publish-review.spec.ts
git commit -m "ops: make publish failures visible and add data retention"
```

### Gate 2 — Data integrity

- [ ] Workspace load retry restores the actual snapshot; a failed load cannot be marked ready with an empty store.
- [ ] Recovery snapshots exist for unsaved work; logout cannot silently discard them.
- [ ] Two concurrent scheduler claims produce one run and one remote publish.
- [ ] A remote publish timeout produces an `unknown` job and never auto-republishes.
- [ ] Killed runs are reaped; one-off failures do not reschedule; retries back off and auto-disable after five failures.
- [ ] Run history is visible only to the owning user.

---

## Phase 3 — WordPress Connect

**Outcome:** The documented generic-webhook setup works, the plugin cannot create arbitrary post types or bypass the publish switch, replayed requests are rejected, and the plugin is versioned and tested.

### Task 3.1: Put the plugin under version control and add a test harness

**Files:**
- Create: a separate git repository rooted at `wordpress-plugin/writerdost-connect`; the parent project folder is not a git repo
- Create: `wordpress-plugin/writerdost-connect/.wp-env.json`
- Create: `wordpress-plugin/writerdost-connect/package.json`
- Create: `wordpress-plugin/writerdost-connect/vitest.config.ts`
- Create: `wordpress-plugin/writerdost-connect/tests/e2e.test.ts`
- Create: `.github/workflows/plugin-ci.yml` in the plugin repository

- [ ] **Step 1: Version the source**

Do not continue shipping an untracked ZIP. Initialize a separate git repository in `wordpress-plugin/writerdost-connect`:

```bash
cd "../wordpress-plugin/writerdost-connect"
git init
git add .
git commit -m "chore: import WriterDost Connect 1.0.0 source"
```

Add a `.gitignore` for `.wp-env`, `vendor`, `node_modules`, and `*.zip`. Keep the existing `writerdost-connect.zip` out of source control; build it in CI. Tag `1.1.0` when the fixes are complete.

- [ ] **Step 2: Add a WordPress test environment**

Create `.wp-env.json`:

```json
{
  "core": "WordPress/WordPress",
  "phpVersion": "8.2",
  "plugins": ["."],
  "testsPort": 8889,
  "port": 8888,
  "config": {
    "WP_DEBUG": true,
    "SCRIPT_DEBUG": true
  }
}
```

- [ ] **Step 3: Add a Node E2E harness**

Create `package.json` in the plugin repository:

```json
{
  "name": "writerdost-connect-tests",
  "private": true,
  "scripts": {
    "test:plugin": "vitest run",
    "lint:php": "find . -name '*.php' -not -path './node_modules/*' -not -path './vendor/*' -exec php -l {} \\;"
  },
  "devDependencies": {
    "@wordpress/env": "^10.0.0",
    "vitest": "^3.0.0"
  }
}
```

Create `vitest.config.ts`:

```ts
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: { environment: "node", include: ["tests/**/*.test.ts"], testTimeout: 30_000 },
});
```

Create `tests/e2e.test.ts` with this structure:

```ts
import { execFileSync } from "node:child_process";
import { createHmac } from "node:crypto";
import { beforeAll, describe, expect, it } from "vitest";

const BASE = process.env.WP_BASE_URL || "http://localhost:8888";
const SECRET = "integration-test-secret";
const KEY = "";

function signedHeaders(body: string) {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHmac("sha256", SECRET)
    .update(`${timestamp}\nPOST\n${body}`)
    .digest("hex");
  return {
    "content-type": "application/json",
    "x-writerdost-timestamp": timestamp,
    "x-writerdost-signature": signature,
  };
}

async function post(body: string) {
  return fetch(`${BASE}/wp-json/writerdost/v1/posts`, {
    method: "POST",
    headers: signedHeaders(body),
    body,
  });
}

describe("WriterDost Connect", () => {
  beforeAll(() => {
    const settings = JSON.stringify({
      api_key: "",
      signing_secret: SECRET,
      post_type: "post",
      default_status: "draft",
      allow_publish: 0,
    });
    execFileSync(
      "npx",
      ["@wordpress/env", "run", "tests-cli", "wp", "option", "update", "writerdost_connect_settings", settings, "--format=json"],
      { stdio: "inherit" },
    );
  });

  it("accepts signature-only authentication", async () => {
    const response = await post(JSON.stringify({ title: "Signature only", bodyHtml: "<p>Hello</p>", mode: "draft" }));
    expect([200, 201]).toContain(response.status);
  });

  it("rejects a forged signature", async () => {
    const response = await fetch(`${BASE}/wp-json/writerdost/v1/posts`, {
      method: "POST",
      headers: { "content-type": "application/json", "x-writerdost-signature": "bad" },
      body: JSON.stringify({ title: "Forged", bodyHtml: "<p>x</p>" }),
    });
    expect(response.status).toBe(401);
  });
});
```

Add these scripts to the plugin `package.json` after `npm install`:

```bash
npm install
npx @wordpress/env start
npm run lint:php
npm run test:plugin
npx @wordpress/env stop
```

Use a WP-CLI seed script to seed `writerdost_connect_settings`; do not depend on a browser session for setup.

- [ ] **Step 4: Add CI**

Add a workflow in the plugin repository that starts `wp-env`, runs PHP lint (`php -l` on every PHP file), runs the Node E2E suite, and uploads the ZIP artifact. Do not deploy from a developer machine.

- [ ] **Step 5: Commit**

```bash
git add .wp-env.json tests package.json .gitignore
git commit -m "test: add a WordPress environment and publish E2E harness"
```

### Task 3.2: Make the documented signature-only setup work

**Files:**
- Modify: `../wordpress-plugin/writerdost-connect/includes/class-wd-auth.php`
- Modify: `../wordpress-plugin/writerdost-connect/writerdost-connect.php`
- Modify: `../wordpress-plugin/writerdost-connect/includes/class-wd-settings.php`
- Test: `tests/e2e.test.ts`

- [ ] **Step 1: Stop generating an API key on activation**

Delete the `api_key` generation block in `writerdost_connect_activate()`. Keep the signing secret generation. Default `api_key` to `''` in `WD_Settings::defaults()`; it is an optional second factor, not a mandatory credential.

- [ ] **Step 2: Accept either credential, not both**

Change `WD_Auth::authorize()`:

```php
if ( '' === $key && '' === $secret ) {
    return new WP_Error( 'writerdost_not_configured', __( 'WriterDost Connect has no credentials configured yet.', 'writerdost-connect' ), array( 'status' => 503 ) );
}

if ( '' !== $secret ) {
    // Verify the signature; a present key is not required when the signature is valid.
    // ... signature verification here ...
} else {
    // No secret configured: the API key is the only credential.
    $sent = self::header( $request, 'x-writerdost-key' );
    if ( '' === $sent || ! hash_equals( $key, $sent ) ) {
        return self::denied( __( 'Missing or invalid API key.', 'writerdost-connect' ) );
    }
}

return true;
```

If both are configured, the signature is sufficient; document that the key is optional. Never fail a signed request because the app did not send an optional key.

- [ ] **Step 3: Make the API key editable/clearable**

Replace the readonly key input with an editable password/text field plus a “Clear key” checkbox:

```php
<input type="text" name="api_key" value="<?php echo esc_attr( $settings['api_key'] ); ?>" class="regular-text code" autocomplete="off" />
<label><input type="checkbox" name="clear_api_key" value="1" /> <?php esc_html_e( 'Clear the API key', 'writerdost-connect' ); ?></label>
```

Sanitize with `sanitize_text_field` and store an empty string when the checkbox is set. Add a nonce and capability check to the save handler (already required by `manage_options`/`check_admin_referer`).

- [ ] **Step 4: Update the README**

State that signature-only is the default and supported. Show the exact app destination fields: endpoint URL + signing secret, with the API key left empty. Remove the instruction to clear a read-only field.

- [ ] **Step 5: Test**

In the test harness, configure a fresh plugin option with a secret and an empty key; sign a post with only `x-writerdost-signature`; expect 201. Then set a key and secret, send a signature without the key, and expect success. Send neither and expect 503. Send a bad signature and expect 401.

- [ ] **Step 6: Commit**

```bash
git add includes/class-wd-auth.php writerdost-connect.php includes/class-wd-settings.php README.md tests
git commit -m "fix: support the documented signature-only WordPress connection"
```

### Task 3.3: Restrict post types and enforce the publish switch

**Files:**
- Modify: `../wordpress-plugin/writerdost-connect/includes/class-wd-importer.php`
- Modify: `../wordpress-plugin/writerdost-connect/includes/class-wd-settings.php`
- Test: `tests/e2e.test.ts`

- [ ] **Step 1: Allowlist public post types**

Add a helper:

```php
private static function allowed_post_types(): array {
    $types = get_post_types( array( 'public' => true ), 'names' );
    unset( $types['attachment'], $types['revision'], $types['nav_menu_item'] );
    return array_values( array_diff( $types, array( 'wp_template', 'wp_template_part', 'wp_global_styles', 'wp_navigation' ) ) );
}
```

In `import_one()`:

```php
$allowed = self::allowed_post_types();
$post_type = self::text( $payload, array( 'postType', 'post_type' ) );
if ( '' === $post_type || ! in_array( $post_type, $allowed, true ) ) {
    $post_type = $settings['post_type'];
}
if ( ! in_array( $post_type, $allowed, true ) ) {
    return new WP_Error( 'writerdost_invalid_post_type', __( 'That post type is not allowed.', 'writerdost-connect' ), array( 'status' => 400 ) );
}
```

Validate the settings value with the same helper. Never pass an arbitrary `post_type_exists()` result to `wp_insert_post()`.

- [ ] **Step 2: Enforce publish status**

Replace `status()` logic with:

```php
$requested = strtolower( self::text( $payload, array( 'status', 'mode' ) ) );

if ( 'publish' === $requested || 'published' === $requested ) {
    return $settings['allow_publish'] ? 'publish' : $settings['default_status'];
}

if ( in_array( $requested, array( 'draft', 'pending', 'private', 'future' ), true ) ) {
    if ( ! $settings['allow_publish'] ) {
        return in_array( $requested, array( 'draft', 'pending' ), true ) ? $requested : $settings['default_status'];
    }
    return $requested;
}

return $settings['default_status'];
```

Also prevent `default_status = 'publish'` when `allow_publish` is off in the settings sanitizer.

- [ ] **Step 3: Bind the signature to timestamp and method and reject replays**

In the app webhook adapter, send:

```ts
const timestamp = Math.floor(Date.now() / 1000).toString();
const canonical = `${timestamp}\nPOST\n${body}`;
headers["x-writerdost-timestamp"] = timestamp;
headers["x-writerdost-signature"] = createHmac("sha256", destination.secret)
  .update(canonical)
  .digest("hex");
```

In the plugin:

```php
$timestamp = (int) self::header( $request, 'x-writerdost-timestamp' );
if ( $timestamp <= 0 || abs( time() - $timestamp ) > 300 ) {
    return self::denied( __( 'Request timestamp is missing or expired.', 'writerdost-connect' ) );
}
$canonical = $timestamp . "\n" . $request->get_method() . "\n" . (string) $request->get_body();
$expected = hash_hmac( 'sha256', $canonical, $secret );
if ( ! hash_equals( $expected, strtolower( $signature ) ) ) {
    return self::denied( __( 'Request signature does not match.', 'writerdost-connect' ) );
}
$replay_key = 'wd_sig_' . hash( 'sha256', $signature );
if ( get_transient( $replay_key ) ) {
    return self::denied( __( 'Request has already been processed.', 'writerdost-connect' ) );
}
set_transient( $replay_key, 1, 10 * MINUTE_IN_SECONDS );
```

The app and plugin must be deployed together. This plan requires the v2 signed contract; no v1 fallback is shipped. Existing installs update the plugin and app together.

- [ ] **Step 4: Test**

Add E2E cases: post type `wp_template` → 400; `future` with allow_publish off → draft; `private` with allow_publish off → draft; `publish` with allow_publish off → draft; a replayed signed request → 401; an old timestamp → 401.

- [ ] **Step 5: Commit**

```bash
git add includes/class-wd-importer.php includes/class-wd-settings.php includes/class-wd-auth.php tests
git commit -m "fix: restrict post types, enforce publish policy, and reject replays"
```

### Task 3.4: Harden author, media, HTML, update, and disclosure behavior

**Files:**
- Modify: `../wordpress-plugin/writerdost-connect/includes/class-wd-importer.php`
- Modify: `../wordpress-plugin/writerdost-connect/includes/class-wd-rest.php`
- Modify: `../wordpress-plugin/writerdost-connect/includes/class-wd-log.php`
- Modify: `../wordpress-plugin/writerdost-connect/readme.txt`
- Test: `tests/e2e.test.ts`

- [ ] **Step 1: Restrict author mapping**

Only accept an `authorEmail` that resolves to a user with the capability to edit the selected post type:

```php
$user = get_user_by( 'email', $requested );
if ( $user && user_can( $user, 'edit_posts' ) && user_can( $user, 'edit_others_posts' ) ) {
    return (int) $user->ID;
}
```

Use a configured integration user for the fallback; never fall back to the first administrator implicitly.

- [ ] **Step 2: Guard media imports**

If featured images are enabled, require the integration user to have `upload_files`, validate the URL with `wp_http_validate_url()` and an allowed image extension/mime, and skip the sideload when the existing thumbnail already matches. Do not sideload on every update.

- [ ] **Step 3: Always sanitize HTML and escape URLs**

Remove the `trust_html` option (or make it require an explicit `unfiltered_html` user; the REST importer has no such user). Always use `wp_kses_post`. Escape Markdown-generated link URLs with `esc_url()` before interpolation.

- [ ] **Step 4: Preserve live status on update**

When updating an existing post and no explicit status/mode is supplied, keep the existing `post_status`. Only change status when the payload explicitly asks for one or the post is new. Add an E2E test: publish a post, resend without a status, assert it stays published.

- [ ] **Step 5: Stop leaking emails and throttle logs**

In `/taxonomy`, return user IDs and display names only; remove `user_email`. Throttle failed-auth log inserts with a short transient per IP and cap the option array at 50 entries. Do not log secrets or full payloads.

- [ ] **Step 6: Verify and commit**

```bash
npx @wordpress/env start
npm run test:plugin
npx @wordpress/env stop
git add includes readme.txt tests
git commit -m "fix: harden WordPress author, media, HTML, update, and disclosure behavior"
```

### Task 3.5: Package and release the plugin

**Files:**
- Modify: `../wordpress-plugin/README.md`
- Create: plugin release workflow
- Create: `../wordpress-plugin/writerdost-connect/CHANGELOG.md`

- [ ] **Step 1: Add a version and changelog**

Set the plugin header to `1.1.0` and add a changelog entry covering auth compatibility, post-type restrictions, publish enforcement, replay protection, and security hardening. Update “Tested up to” to the current WordPress version tested in wp-env.

- [ ] **Step 2: Build the ZIP in CI**

Add a workflow that runs PHP lint and the E2E suite, then zips only the runtime files (`writerdost-connect.php`, `includes/`, `readme.txt`) as `writerdost-connect-1.1.0.zip` and uploads it as an artifact. Never ship a ZIP that includes tests, `.wp-env`, or local secrets.

- [ ] **Step 3: Do a staging publish**

Connect the plugin to a real staging WordPress site, publish one draft and one published post, then resend the same source and confirm the plugin updates rather than duplicates. Capture the response and add it to the release notes.

- [ ] **Step 4: Commit and tag**

```bash
git add .
git commit -m "release: WriterDost Connect 1.1.0"
git tag v1.1.0
```

### Gate 3 — WordPress

- [ ] The documented signature-only destination returns 200/201.
- [ ] Arbitrary post types, including FSE templates, return 400.
- [ ] `allow_publish` cannot be bypassed with private/future/publish modes.
- [ ] Replays and stale timestamps return 401; a valid request succeeds once.
- [ ] Updating without a status preserves the live status; media and author access are capability-checked.
- [ ] The plugin is versioned, tested in wp-env, and packaged by CI.

---

## Phase 4 — Account recovery, legal, and commercial truthfulness

**Outcome:** Users can recover accounts and delete/export their data; public signup has a lawful consent surface; pricing/testimonials/uptime claims match the product or are removed; the rewrite feature never returns the original text disguised as a rewrite.

### Task 4.1: Add password reset

**Files:**
- Create: `src/app/forgot-password/page.tsx`
- Create: `src/app/reset-password/page.tsx`
- Modify: `src/app/login/page.tsx`
- Modify: `src/components/AuthGuard.tsx` public-page list
- Modify: `README.md` with Appwrite recovery URL setup
- Test: `e2e/auth-recovery.spec.ts`

- [ ] **Step 1: Add the forgot-password screen**

Use the existing auth card layout. Submit:

```ts
await account().createRecovery({
  email,
  url: `${window.location.origin}/reset-password`,
});
```

Always show the same “If an account exists, a reset link has been sent” message, whether the email exists or not.

- [ ] **Step 2: Add the reset screen**

Read `userId` and `secret` from `useSearchParams()` and submit:

```ts
await account().updateRecovery({ userId, secret, password, passwordAgain: password });
await account().deleteSession({ sessionId: "current" }).catch(() => {});
router.push("/login?reset=1");
```

Validate both password fields and show a clear expired-link error.

- [ ] **Step 3: Link it**

Add “Forgot password?” next to the password label on `/login` and allow `/forgot-password` and `/reset-password` in `AuthGuard`.

- [ ] **Step 4: Test**

Playwright tests: forgot page renders; submitting an unknown email shows the neutral success message; the reset page rejects a missing secret. A real recovery email delivery test is manual and uses the staging project.

- [ ] **Step 5: Commit**

```bash
git add src/app/forgot-password src/app/reset-password src/app/login/page.tsx src/components/AuthGuard.tsx README.md e2e/auth-recovery.spec.ts
git commit -m "feat: add password recovery flow"
```

### Task 4.2: Add email verification without locking users out on day one

**Files:**
- Create: `src/app/verify-email/page.tsx`
- Create: `src/components/VerificationBanner.tsx`
- Modify: `src/lib/app-store.ts` signup/login
- Modify: `src/lib/auth/profile.ts`
- Modify: `src/lib/store-types.ts`
- Modify: `src/lib/appwrite/session.ts`
- Modify: `src/app/api/destinations/route.ts`, `src/app/api/destinations/[id]/route.ts`
- Modify: `src/app/api/automations/route.ts`, `src/app/api/automations/[id]/route.ts`
- Modify: `src/components/layout/Header.tsx`
- Modify: `README.md`
- Test: `e2e/auth-verification.spec.ts`, `tests/unit/verified-user.test.ts`

- [ ] **Step 1: Send a verification email at signup**

After creating the session:

```ts
await account().createVerification({ url: `${window.location.origin}/verify-email` });
```

Catch failures without failing the signup; expose a “Resend verification” button.

- [ ] **Step 2: Verify on the target page**

Read `userId` and `secret`; call `account().updateVerification({ userId, secret })`, then show success and a link to the dashboard. Handle expired links.

- [ ] **Step 3: Show an unverified banner and gate sensitive actions**

Add `emailVerified: boolean` to the app `User` type and map it from Appwrite’s `emailVerification` in `toUser`. Show a non-blocking `VerificationBanner` in the app shell and allow resend. Do not block drafting during the beta.

Add to `src/lib/appwrite/session.ts`:

```ts
export async function requireVerifiedUser(request: Request): Promise<Guarded<Session>> {
  const { session, denied } = await requireUser(request);
  if (denied) return { session: null, denied };
  if (!session.user.emailVerified) {
    return {
      session: null,
      denied: NextResponse.json(
        { error: "Verify your email before connecting a publishing destination." },
        { status: 403 },
      ),
    };
  }
  return { session, denied: null };
}
```

Use it in destination create/update and automation create/update. Those are the paths that can publish to a customer’s site; drafting with a BYO key can remain available. Add tests for the unverified 403 and the verified success path.

- [ ] **Step 4: Test and commit**

```bash
npm run build
git add src/app/verify-email src/lib/app-store.ts README.md e2e/auth-verification.spec.ts
git commit -m "feat: add email verification and resend flow"
```

### Task 4.3: Add account export and deletion

**Files:**
- Create: `src/app/api/account/export/route.ts`
- Create: `src/app/api/account/route.ts`
- Modify: `src/app/profile/page.tsx`
- Modify: `src/lib/appwrite/session.ts` only if a self-delete helper is needed
- Test: `e2e/account-lifecycle.spec.ts`

- [ ] **Step 1: Implement export**

Export the caller's workspace settings and projects through the JWT-scoped tables, and generated posts through a worker query filtered by `session.user.id`. Return a ZIP or JSON download named `writerdost-export-<date>.json`. Exclude all encrypted secrets, ciphertext, API keys, and tokens. Set `Cache-Control: no-store` and `Content-Disposition: attachment`.

- [ ] **Step 2: Implement deletion with confirmation**

`DELETE /api/account` must:

1. Require a session.
2. Require the caller to type their email in the request body and compare it case-insensitively.
3. Collect the user’s automation IDs. Delete owned rows in `workspaces`, `workspace_projects`, `destinations`, `generated_posts`, `upgrade_requests`, `publish_jobs`, and `automation_runs` with the worker client, filtered by `userId`.
4. Delete `seen_sources` and `automation_leases` rows for the collected automation IDs, then delete the `automations` rows themselves. These two dependent tables do not carry `userId`.
5. Delete the user via `adminUsers().delete({ userId: session.user.id })` only after the owned rows are gone.
6. Record a deletion audit row without PII, or log a non-reversible event ID.
7. Return 204.

Do not allow deleting another user; the ID always comes from the session. Add a typed-email confirmation modal in Profile.

- [ ] **Step 3: Test on staging only**

Create a disposable user, add a project and destination, export, delete, and verify the session is invalid and the rows are gone. Never run this test against production.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/account src/app/profile/page.tsx e2e/account-lifecycle.spec.ts
git commit -m "feat: add account data export and deletion"
```

### Task 4.4: Add privacy, terms, and signup consent

**Files:**
- Create: `src/app/privacy/page.tsx`
- Create: `src/app/terms/page.tsx`
- Modify: `src/app/signup/page.tsx`
- Modify: `src/lib/app-store.ts`
- Modify: `src/lib/auth/profile.ts`
- Modify: `src/components/website/WebsiteFooter.tsx`
- Modify: `src/components/AuthGuard.tsx` public-page list
- Create: `docs/legal/README.md` for counsel sign-off

- [ ] **Step 1: Draft the pages with counsel**

The privacy page must disclose: account data (name, email), Appwrite storage and region, manuscript/project content, encrypted third-party API/CMS keys, AI provider data flows (the user's chosen provider receives prompts), Google Fonts/external requests, retention, deletion/export, and a contact. The terms page must cover acceptable use, IP ownership, AI-output disclaimers, availability, and liability. Do not publish invented legal text; obtain sign-off and record the version/date.

- [ ] **Step 2: Require and record consent**

Add a required checkbox at signup:

```tsx
<label className="flex items-start gap-2 text-xs text-slate-400">
  <input type="checkbox" required name="accept_terms" checked={acceptedTerms} onChange={(event) => setAcceptedTerms(event.target.checked)} />
  <span>I agree to the <Link href="/terms" className="underline">Terms</Link> and <Link href="/privacy" className="underline">Privacy Policy</Link>.</span>
</label>
```

Block submission until checked. Change `signup(fullName, email, password)` to `signup(fullName, email, password, acceptedTerms)`, return an error if `acceptedTerms` is false, and after account creation store the evidence in preferences:

```ts
await account().updatePrefs({
  prefs: {
    ...defaultPrefs(),
    termsVersion: "2026-10-22",
    termsAcceptedAt: new Date().toISOString(),
  },
});
```

Add those optional fields to `AccountPrefs`. Preferences are user-writable, so this is consent evidence, not a security control. Add a test that the signup button stays disabled until the box is checked.

- [ ] **Step 3: Link from the footer and allow public access**

Add Privacy and Terms links to the footer. Add both routes to `AuthGuard`’s public pages.

- [ ] **Step 4: Test and commit**

```bash
npm run build
git add src/app/privacy src/app/terms src/app/signup/page.tsx src/components/website/WebsiteFooter.tsx src/components/AuthGuard.tsx docs/legal
git commit -m "legal: add privacy, terms, and signup consent"
```

### Task 4.5: Remove misleading commercial and trust claims

**Files:**
- Modify or delete: `src/components/website/PricingSection.tsx`
- Modify or delete: `src/components/website/TestimonialsSection.tsx`
- Modify: `src/components/website/Hero.tsx:88-113`
- Modify: `src/components/website/WebsiteFooter.tsx:38-42`
- Modify: `src/components/website/LogosTicker.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/components/website/Navbar.tsx` only if the section label/id changes; keep `id="pricing"` to avoid a dead anchor
- Test: `e2e/public.spec.ts`

- [ ] **Step 1: Replace the paid pricing block with beta reality**

For the free/BYO beta, replace the three priced cards and “Start 14-Day Free Trial” with one “Free during beta” card that explains BYO keys and admin-granted access. Remove dollar amounts and annual/monthly billing. If paid plans are a hard launch requirement, stop here and schedule a separate billing project before launch; do not ship priced CTAs without checkout, entitlements, tax, refunds, and terms.

- [ ] **Step 2: Remove unverified social proof and hardcoded status**

Delete the testimonial section and fabricated metrics (`28k words in 4 mins`, `2.4M+ words generated`) unless the team can provide source, permission, and reproducible evidence. Replace the footer’s `All Systems Operational • Swarm v2.2 Online` with a real health link only after Task 6.2; until then, remove the pill. Remove “100% privacy/offline” and “plagiarism-free” absolutes; use “BYO keys,” “local Ollama option,” and “AI originality pass.”

- [ ] **Step 3: Align remaining copy with the product**

Update the Starter “Local Browser Storage” feature (the workspace is in Appwrite, not browser storage). Update any “Trusted by” wording to only what is true. Remove dead nav links to deleted sections.

- [ ] **Step 4: Add a content regression test**

In `e2e/public.spec.ts`, assert the landing page does not contain `14-Day Free Trial`, `All Systems Operational`, `28k words in 4 mins`, or `Plagiarism-free`. This prevents accidental reintroduction.

- [ ] **Step 5: Commit**

```bash
git add src/components/website src/app/page.tsx e2e/public.spec.ts
git commit -m "content: remove unsupported pricing, social proof, and status claims"
```

### Task 4.6: Remove the silent rewrite fallback

**Files:**
- Modify: `src/lib/app-store.ts:619-633`
- Modify: `src/app/rewrite/page.tsx:1148-1180`
- Modify: `src/app/rewrite/page.tsx` where `generateRewritePreview` is called
- Test: `tests/unit/rewrite.test.ts`, `e2e/rewrite-failure.spec.ts`

- [ ] **Step 1: Make the no-key path fail loudly**

Remove `buildRewrite` and the local fallback. When no provider/key is configured, set a persistent error such as “Connect an AI provider in Settings → API to rewrite this passage” and link to `/settings?tab=api`. Do not populate `rewrite.preview`.

When an AI call fails, show the provider error with a Retry action. Do not create a project or enable “Apply to project” when `rewrite.preview` is empty.

- [ ] **Step 2: Guard the apply/save actions**

In `createProjectFromRewrite` and the UI button handlers, throw or disable when `rewrite.preview.trim()` is empty. Add a test that these actions cannot save empty/fallback content.

- [ ] **Step 3: Test and commit**

```bash
npm run test:unit
npm run build
git add src/lib/app-store.ts src/app/rewrite/page.tsx tests/unit/rewrite.test.ts e2e/rewrite-failure.spec.ts
git commit -m "fix: fail loudly instead of disguising the original text as a rewrite"
```

### Task 4.7: Align plan gates with the no-billing launch

**Files:**
- Modify: `src/lib/auth/profile.ts`
- Modify: `src/components/AuthGuard.tsx`
- Modify: `src/app/settings/ApplicationTab.tsx` or the plan display surface
- Modify: `src/app/admin/page.tsx` if plan labels are shown

- [ ] **Step 1: Remove paid-plan implications**

For the beta, grant all features to authenticated users and remove the client-only paid locks. If the team later needs an invite-only cohort, enforce it server-side with a label; that is a separate product change, not part of this launch.

- [ ] **Step 2: Do not treat preferences as a security boundary**

Keep `role` in Appwrite labels. If any feature later spends platform money or accesses another user’s data, enforce the entitlement server-side with a label or permissioned row; never trust `prefs`.

- [ ] **Step 3: Test and commit**

```bash
npm run build
git add src/lib/auth/profile.ts src/components/AuthGuard.tsx src/app/settings src/app/admin
git commit -m "fix: make beta access copy and gates match the product"
```

### Gate 4 — Account, legal, and claims

- [ ] Password reset and verification flows work against staging.
- [ ] Account export excludes secrets; deletion removes owned rows and invalidates the session.
- [ ] Privacy/terms are counsel-approved and linked at signup/footer.
- [ ] No paid trial, price, fabricated testimonial/metric, or hardcoded uptime claim remains.
- [ ] The rewrite feature cannot return the original text as a successful rewrite.

---

## Phase 5 — Frontend usability, accessibility, SEO, and performance

**Outcome:** The core editor is usable on mobile, auth forms and dialogs are keyboard/screen-reader accessible, the app has real error boundaries and per-page metadata, and the landing page’s heavy assets are controlled.

### Task 5.1: Fix auth form accessibility

**Files:**
- Modify: `src/app/login/page.tsx`
- Modify: `src/app/signup/page.tsx`
- Modify: `src/app/forgot-password/page.tsx`, `reset-password/page.tsx`
- Test: `e2e/public.spec.ts` with axe

- [ ] **Step 1: Give every input an id and label**

```tsx
<label htmlFor="login-email">Work Email Address</label>
<input
  id="login-email"
  name="email"
  type="email"
  autoComplete="email"
  required
  aria-invalid={Boolean(error)}
  aria-describedby={error ? "login-error" : undefined}
  ...
/>
```

Use `autoComplete="name"`, `"new-password"`/`"current-password"` appropriately. Remove `tabIndex={-1}` from the show-password button, add `type="button"` and `aria-pressed={showPassword}`.

- [ ] **Step 2: Make errors announceable**

Give each error container `id`/`role="alert"` and link it with `aria-describedby`. Ensure the spinner submit button has an accessible label such as `aria-label="Signing in"`.

- [ ] **Step 3: Upgrade the tests and commit**

In `e2e/public.spec.ts`, change the login assertion to `getByLabel("Work Email Address")` and `getByLabel("Password")`. Add an `AxeBuilder` scan for `/login` and `/signup` that fails on serious/critical violations.

```bash
npm run test:e2e -- --project=chromium e2e/public.spec.ts
git add src/app/login src/app/signup src/app/forgot-password src/app/reset-password e2e/public.spec.ts
git commit -m "a11y: label auth fields and expose validation state"
```

### Task 5.2: Add a reusable accessible dialog and keyboard-operable lists

**Files:**
- Create: `src/components/ui/Dialog.tsx`
- Modify: `src/app/projects/page.tsx:230-264`
- Modify: `src/components/BundleKartPublishModal.tsx:326-331`
- Modify: `src/app/automations/page.tsx:1099`
- Modify: `src/app/rewrite/page.tsx:1212-1220`
- Modify: `src/app/editor/page.tsx:640-655`
- Test: `e2e/accessibility.spec.ts`

- [ ] **Step 1: Add a focus-trapped dialog**

Create a `Dialog` with `role="dialog"`, `aria-modal="true"`, an accessible title, Escape to close, focus on the first actionable element, focus restore to the opener, and a body-scroll lock. Reuse the focus-trap pattern already present in `GenerationOverlay.tsx`.

- [ ] **Step 2: Replace the custom overlays**

Use `Dialog` for project delete, marketplace publish, post view, and rewrite resume. For destructive actions, keep the confirmation and add an explicit danger label.

- [ ] **Step 3: Replace the chapter-list div button**

Render each chapter as a real `<button type="button">` inside a list item. Put the delete action in a separate sibling button, never nested inside another interactive element. Add keyboard activation for Enter/Space via the native button.

- [ ] **Step 4: Test**

Playwright: open each dialog, assert focus is inside, press Escape, assert focus returns to the opener. Tab through a chapter list and switch chapters with Enter.

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Dialog.tsx src/app/projects/page.tsx src/components/BundleKartPublishModal.tsx \
  src/app/automations/page.tsx src/app/rewrite/page.tsx src/app/editor/page.tsx e2e/accessibility.spec.ts
git commit -m "a11y: add focus-trapped dialogs and keyboard chapter navigation"
```

### Task 5.3: Make the editor usable on mobile

**Files:**
- Modify: `src/app/editor/page.tsx`
- Modify: `src/app/globals.css`
- Test: `e2e/editor-mobile.spec.ts`

- [ ] **Step 1: Turn the tool rail into a drawer below `lg`**

Use a fixed/translated drawer with a backdrop and an explicit open button. Example classes:

```tsx
<aside className={clsx(
  "fixed inset-y-0 left-0 z-40 w-72 transform border-r bg-surface-container-low transition-transform lg:static lg:translate-x-0",
  sidebarOpen ? "translate-x-0" : "-translate-x-full",
  isEditorSidebarCollapsed ? "lg:w-14" : "lg:w-64",
)}>
```

Add `aria-expanded` and `aria-controls` to the toggle and close the drawer on route change/selection.

- [ ] **Step 2: Scale the manuscript preview instead of forcing 816px**

At widths below 1100px, wrap the preview in a scaling container:

```tsx
<div className="w-full overflow-auto">
  <div
    className="mx-auto origin-top"
    style={{ transform: "scale(var(--editor-preview-scale))", width: "fit-content" }}
  >
    {/* existing 816px pages */}
  </div>
</div>
```

Use a `ResizeObserver` on the preview container to set `--editor-preview-scale` to `Math.min(1, availableWidth / 816)`. Keep the exact 816×1056 page dimensions for print/export; apply scaling only on screen.

- [ ] **Step 3: Test and commit**

```bash
npm run test:e2e -- --project=mobile e2e/editor-mobile.spec.ts
git add src/app/editor/page.tsx src/app/globals.css e2e/editor-mobile.spec.ts
git commit -m "fix: make the editor and manuscript preview usable on mobile"
```

### Task 5.4: Add error boundaries, loading/not-found pages, and a generation navigation guard

**Files:**
- Create: `src/app/error.tsx`
- Create: `src/app/global-error.tsx`
- Create: `src/app/not-found.tsx`
- Create: `src/app/loading.tsx`
- Create: `src/components/GenerationNavigationGuard.tsx`
- Modify: `src/components/layout/LayoutWrapper.tsx`
- Modify: `src/app/create/page.tsx`, `src/app/editor/page.tsx`, `src/app/rewrite/page.tsx`
- Test: `e2e/error-boundary.spec.ts`

- [ ] **Step 1: Add the boundaries**

`error.tsx` must be a client component with a reset button and a support link. `global-error.tsx` must render a minimal full document. `not-found.tsx` must link home. `loading.tsx` must be a skeleton, not a blank screen.

- [ ] **Step 2: Add a navigation guard**

While `generationStatus.active` is true, intercept internal link clicks at the layout level and show a confirm dialog: “A generation is still running. Leave and stop it?” Confirm aborts the generation controller before navigating. Add `beforeunload` for browser close/refresh. Keep the cancel action explicit.

- [ ] **Step 3: Make errors persistent**

Replace transient overlay-only errors with an inline error banner that stays until retry/dismiss, including the provider message and a link to AI settings.

- [ ] **Step 4: Test and commit**

```bash
npm run build
git add src/app/error.tsx src/app/global-error.tsx src/app/not-found.tsx src/app/loading.tsx \
  src/components/GenerationNavigationGuard.tsx src/components/layout/LayoutWrapper.tsx src/app/create src/app/editor src/app/rewrite e2e/error-boundary.spec.ts
git commit -m "ux: add error boundaries and protect in-progress generations"
```

### Task 5.5: Add per-page metadata, robots, sitemap, and social image

**Files:**
- Modify: `src/app/layout.tsx`
- Create: `src/app/robots.ts`
- Create: `src/app/sitemap.ts`
- Create: static `public/og.png` (1200×630)
- Create: layout wrappers/metadata for `/`, `/login`, `/signup`, `/help`, `/privacy`, `/terms`
- Test: `e2e/seo.spec.ts`

- [ ] **Step 1: Add global metadata base and social cards**

Add `NEXT_PUBLIC_SITE_URL` to `src/lib/env.public.ts` (URL with no trailing slash), `.env.example`, and CI. The Dockerfile and compose build args already carry it. Set `metadataBase` from it, plus a default title template, description, and Open Graph/Twitter fields. Use the static `public/og.png` asset to avoid depending on the Next image route; reference it with absolute dimensions.

- [ ] **Step 2: Add per-route metadata**

For each public route, add a small server component layout that exports:

```ts
export const metadata = {
  title: "Sign in — Writerdost AI",
  description: "Access your Writerdost AI writing workspace.",
  alternates: { canonical: "/login" },
};
```

Mark authenticated app pages `robots: { index: false }`. Do not export metadata from a `"use client"` file.

- [ ] **Step 3: Add robots and sitemap**

`robots.ts` allows `/`, `/login`, `/signup`, `/help`, `/privacy`, `/terms` and disallows `/api`, `/dashboard`, `/editor`, `/admin`, `/settings`, `/profile`. `sitemap.ts` lists only the public pages with the canonical site URL.

- [ ] **Step 4: Test**

Assert `/robots.txt` and `/sitemap.xml` return 200, the landing has an OG image, `/login` has a unique title, and app routes are noindex.

- [ ] **Step 5: Commit**

```bash
git add src/app public/og.png e2e/seo.spec.ts
git commit -m "seo: add per-page metadata, robots, sitemap, and social image"
```

### Task 5.6: Reduce landing/auth payload and font cost

**Files:**
- Modify: `src/app/layout.tsx`
- Modify: `src/app/page.tsx`
- Modify: `src/components/website/HeroInteractivePreview.tsx`
- Modify: `src/components/layout/Header.tsx`
- Modify: `src/components/layout/LayoutWrapper.tsx`
- Replace/compress: `public/galaxy_bg.png` (832 KB)
- Modify: `next.config.ts` if adding image formats
- Test: Lighthouse CI or Playwright performance budget

- [ ] **Step 1: Compress the background**

Generate `public/galaxy_bg.avif` and `public/galaxy_bg.webp` at a maximum 1920px width using `sharp`; keep the PNG as a fallback. Target <150 KB for AVIF/WebP. Replace the auth background `<img>`/CSS reference with a `<picture>` element that serves AVIF, then WebP, then PNG. Verify visual quality at mobile and desktop widths.

- [ ] **Step 2: Cut font loading**

Keep Inter as the app/default face and at most two manuscript faces in `layout.tsx`. Remove the other next/font imports and use the existing `loadGoogleFont` helper to inject a stylesheet only when a project first selects one of those families. Self-host a subset of Material Symbols as `public/fonts/material-symbols.woff2` with an `@font-face` rule and remove the render-blocking Google icon stylesheet. Re-run axe/visual tests.

- [ ] **Step 3: Split interactive marketing code**

Convert static landing sections to server components and use `next/dynamic` for the interactive preview, marketplace modal, and heavy editor-only components. Keep `Hero` text/CTA server-rendered so the LCP element is not blocked by the client bundle.

- [ ] **Step 4: Add a budget test**

Add `@lhci/cli` with a `lighthouserc.js` that fails when LCP > 2.5s, CLS > 0.1, or total transferred JS for `/` exceeds 300 KB gzipped. Run it against a production build, not dev.

- [ ] **Step 5: Commit**

```bash
git add src/app/layout.tsx src/app/page.tsx src/components src/public public next.config.ts lighthouse.config.*
git commit -m "perf: compress assets, reduce fonts, and split landing bundles"
```

### Task 5.7: Remove dead ends and fix misleading UI states

**Files:**
- Modify: `src/app/profile/page.tsx:102-104`
- Modify: `src/components/ui/Editor.tsx:92`
- Modify: `src/app/help/page.tsx:43`
- Modify: `src/components/layout/Header.tsx:76-80`
- Modify: `src/lib/export-utils.ts:134`
- Modify: `src/app/automations/page.tsx:1308-1313`
- Test: `e2e/ux.spec.ts`

- [ ] **Step 1: Remove or implement dead controls**

Profile “Preview” either opens a real preview or is removed. Remove the “Type / for commands” promise or implement a TipTap suggestion menu with a real command list. Remove dead links. Replace the external `api.qrserver.com` QR image in `BundleKartPublishModal.tsx` with a client-side QR generated by the `qrcode` package; do not send the seller’s landing URL to a third party.

- [ ] **Step 2: Fix success-state timing**

Await the DOCX/export operation before showing “Downloaded”; show progress and errors. On destination removal, add a confirmation and handle failure.

- [ ] **Step 3: Add the test and commit**

```bash
npm run test:e2e -- --project=chromium e2e/ux.spec.ts
git add src/app/profile/page.tsx src/components/ui/Editor.tsx src/app/help/page.tsx \
  src/components/layout/Header.tsx src/lib/export-utils.ts src/app/automations/page.tsx e2e/ux.spec.ts
git commit -m "ux: remove dead controls and fix export/destination feedback"
```

### Gate 5 — Frontend quality

- [ ] Auth pages and dialogs pass an axe serious/critical scan.
- [ ] The editor is usable at 390px width and preserves print/export dimensions.
- [ ] Every mobile/desktop primary flow has a loading, error, and retry state.
- [ ] Public routes have correct metadata; app routes are noindex.
- [ ] The landing/auth payload and LCP meet the agreed budget.
- [ ] No dead buttons or promised-but-missing commands remain.

---

## Phase 6 — Operations, observability, and launch

**Outcome:** Production is deployable, observable, restorable, and supportable; secrets and Appwrite settings are hardened; a clean re-audit signs off the launch.

### Task 6.1: Add structured logging and error monitoring

**Files:**
- Modify: `package.json`
- Create: `src/lib/logger.ts`
- Create: `src/instrumentation.ts`
- Create: `sentry.server.config.ts`, `sentry.edge.config.ts`, `src/instrumentation-client.ts`
- Modify: `src/app/error.tsx`, `src/app/global-error.tsx`
- Modify: API catch blocks
- Test: unit tests for redaction

- [ ] **Step 1: Add a structured logger**

```bash
npm install pino
```

Create `src/lib/logger.ts` with a pino logger that records level, timestamp, requestId, route, userId (opaque), duration, and status. Configure redaction for `apiKey`, `authorization`, `cookie`, `secret`, `token`, and `password`. Never log prompts, manuscripts, or raw provider error bodies. Add a redaction test for each listed field.

- [ ] **Step 2: Add Sentry**

```bash
npm install @sentry/nextjs
npx @sentry/wizard@latest -i nextjs
```

Before committing the wizard output, review every modified file. The wizard may overwrite `src/proxy.ts` or `next.config.ts`; preserve the nonce-based CSP and the existing security headers. Configure `SENTRY_DSN`, environment, release (`BUILD_VERSION`/git SHA), traces sample rate, and PII scrubbing. Wire the error boundaries. Do not send full request bodies. Set `sendDefaultPii: false` and scrub `authorization`, `cookie`, `apiKey`, and manuscript content in `beforeSend`.

- [ ] **Step 3: Add alert rules**

Create alerts for: 5xx rate > 1% over 5 minutes, scheduler failure rate, publish `unknown` jobs, Redis errors, Appwrite 401/429 spikes, and error-boundary events. Route to the team’s on-call channel; document ownership.

- [ ] **Step 4: Verify and commit**

```bash
npm run build
npm run test:unit
git add src/lib/logger.ts src/instrumentation.ts sentry.* src/instrumentation-client.ts src/app/error.tsx src/app/global-error.tsx src/app/api package.json package-lock.json
git commit -m "ops: add structured logging and error monitoring"
```

### Task 6.2: Add deep health checks and remove the hardcoded status claim

**Files:**
- Modify: `src/app/api/health/route.ts`
- Create: `src/app/api/health/deep/route.ts`
- Modify: `deploy/docker-compose.yml`
- Modify: `src/components/website/WebsiteFooter.tsx`
- Test: `tests/unit/health.test.ts`

- [ ] **Step 1: Implement the deep check**

Require `WRITERDOST_CRON_SECRET`. Check: Appwrite `get()` on the database, Redis `ping`, encryption key decode, and scheduler lease query. Return 200 only if all required checks pass; return 503 with per-check booleans otherwise. Never return secret values.

- [ ] **Step 2: Use it for container health**

Point the Docker healthcheck at the shallow `/api/health`; point the uptime monitor at the deep endpoint with the secret header from the monitor’s secret store.

- [ ] **Step 3: Replace the footer claim**

Link “System status” to a real status page or health-backed indicator. Do not display “All Systems Operational” when no health check backs it.

- [ ] **Step 4: Commit**

```bash
git add src/app/api/health deploy/docker-compose.yml src/components/website/WebsiteFooter.tsx tests/unit/health.test.ts
git commit -m "ops: add deep health checks and truthful status UI"
```

### Task 6.3: Implement backups and prove restore

**Files:**
- Create: `scripts/backup.mjs`
- Create: `scripts/restore.mjs`
- Create: `docs/ops/backup-restore.md`
- Modify: scheduler/ops cron

- [ ] **Step 1: Export all tables**

Backup script uses a dedicated read-only Appwrite API key to export `workspaces`, `workspace_projects`, `automations`, `automation_runs`, `generated_posts`, `seen_sources`, `destinations`, `upgrade_requests`, `publish_jobs`, and `automation_leases` as newline-delimited JSON with checksums. Encrypt the archive with `age` using the team’s public recipient key before uploading to object storage. Exclude plaintext secrets by keeping only encrypted ciphertext fields.

- [ ] **Step 2: Schedule and retain**

Run nightly at 02:00 UTC, retain 7 daily + 4 weekly + 3 monthly copies, and alert on failure. Document the retention and deletion policy.

- [ ] **Step 3: Prove restore**

Create a staging restoration procedure: empty staging database, restore the latest archive, run row-count and checksum verification, start the app against staging, and complete a login + project load + automation read smoke test. Record the date and elapsed time. Do this before launch, not after.

- [ ] **Step 4: Commit**

```bash
git add scripts/backup.mjs scripts/restore.mjs docs/ops/backup-restore.md
git commit -m "ops: add encrypted backups and a tested restore procedure"
```

### Task 6.4: Finish production deployment and rollback

**Files:**
- Modify: `.github/workflows/deploy.yml`
- Create: `docs/ops/deployment.md`
- Modify: `deploy/docker-compose.yml`, `deploy/Caddyfile`

- [ ] **Step 1: Add image build/publish**

Build the Docker image in CI, tag it with the commit SHA and semantic version, push to GHCR, and scan it for critical CVEs. Do not deploy an untagged `latest` to production.

- [ ] **Step 2: Add staging and production deploys**

Use GitHub Environments with required reviewers for production. Deploy by pulling the new image and running `docker compose up -d`; keep the previous image tag for one-click rollback. Run `npm run appwrite:setup` only against the matching Appwrite project before starting the new app version.

- [ ] **Step 3: Add rollback**

Document and test: rerun the previous image tag, verify `/api/health`, and confirm no schema change requires a rollback. Never roll back the encryption key.

- [ ] **Step 4: Add incident response and customer communication**

Create `docs/ops/incident-response.md` with severity levels (SEV1 data breach/outage, SEV2 partial failure, SEV3 degraded feature), the on-call owner and backup, the alert-to-response path, customer communication templates, a status page URL, and a blameless post-incident review within 5 business days. Test the paging path with a synthetic SEV3 and record the response time.

- [ ] **Step 5: Verify and commit**

```bash
docker compose -f deploy/docker-compose.yml config
git add .github/workflows/deploy.yml docs/ops/deployment.md docs/ops/incident-response.md deploy
git commit -m "ops: add versioned deploys, rollback, and incident response"
```

### Task 6.5: Harden Appwrite console settings

**Files:**
- Create: `docs/ops/appwrite-checklist.md`
- Modify: `appwrite/README.md`

- [ ] **Step 1: Document and apply console settings**

- Use a custom API domain (for first-party cookies) with TLS.
- Set a short session duration appropriate to the product; test “sign out all devices.”
- Enable email verification emails for the public launch; keep sign-in available for unverified users, and enforce the app-side publish/destination gate from Task 4.2.
- Set password policy ≥ 12 characters and block breached/common passwords if available.
- Review rate limits for auth and database access; set project-level limits.
- Restrict the server API key to the exact required scopes and rotate it quarterly.
- Enable MFA for all admin accounts.
- Confirm the region and backup policy with Appwrite; record the data location in the privacy policy.

- [ ] **Step 2: Verify with a checklist**

Capture screenshots or console export (redact keys) and store the signed checklist in `docs/ops/`. No production launch without every item checked.

- [ ] **Step 3: Commit**

```bash
git add docs/ops/appwrite-checklist.md appwrite/README.md
git commit -m "ops: document Appwrite production security settings"
```

### Task 6.6: Make credential encryption rotatable

**Files:**
- Modify: `src/lib/secure-store.ts`
- Modify: `src/lib/env.server.ts`
- Create: `scripts/reencrypt-secrets.mjs`
- Create: `docs/ops/key-rotation.md`
- Test: `tests/unit/secure-store.test.ts`

- [ ] **Step 1: Support a previous key**

Add `WRITERDOST_ENCRYPTION_KEY_PREVIOUS` (optional). `decryptSecret` tries the current key first, then the previous key; both must be 32 bytes. `encryptSecret` always uses the current key and writes the existing `v1` format. Keep v1 decryption; do not introduce a new format in this task.

- [ ] **Step 2: Add a re-encryption script**

Iterate destinations and automations, decrypt with either key, and re-encrypt with the current key. Run with `--dry-run` first, log counts only, and require `--apply`.

- [ ] **Step 3: Test rotation**

Encrypt with key A, set A as previous/B as current, decrypt successfully; then run re-encrypt and verify the ciphertext decrypts with B only. Commit the test.

- [ ] **Step 4: Commit**

```bash
git add src/lib/secure-store.ts src/lib/env.server.ts scripts/reencrypt-secrets.mjs docs/ops/key-rotation.md tests/unit/secure-store.test.ts
git commit -m "ops: support encryption key rotation"
```

### Task 6.7: Load-test the real flows

**Files:**
- Create: `load/k6-smoke.js`
- Create: `load/README.md`
- Create: `docs/ops/capacity.md`

- [ ] **Step 1: Add k6 scenarios**

Cover: landing/auth page load, workspace GET/PUT with a realistic 1MB project, concurrent saves, AI proxy with a mocked cheap provider, scheduler tick health, and rate-limit behavior. Use a staging Appwrite project and a test provider that returns quickly; never spend production AI credits.

- [ ] **Step 2: Define pass criteria**

For example: p95 landing < 1s in the target region, workspace save p95 < 2s at 10 concurrent writers, no 5xx at 50 virtual users for 10 minutes, rate limiter returns 429 under burst, memory stable under the Caddy/Node limits. Record results in `docs/ops/capacity.md`.

- [ ] **Step 3: Fix the first bottleneck, then rerun**

If Appwrite or Redis errors dominate, tune limits/quotas; if Node memory grows, inspect SSE/publish buffering. Do not launch on untested assumptions.

- [ ] **Step 4: Commit**

```bash
git add load docs/ops/capacity.md
git commit -m "test: add k6 load scenarios and capacity baseline"
```

### Task 6.8: Run the launch audit and sign-off

**Files:**
- Create: `docs/ops/launch-checklist.md`

- [ ] **Step 1: Re-run every gate**

```bash
npm ci
npm run typecheck
npm run lint
npm run test:unit
npm run test:e2e
npm audit --omit=dev --audit-level=high
npm run build
docker compose -f deploy/docker-compose.yml build
```

- [ ] **Step 2: Re-run the external audit**

Repeat the original production-readiness audit with fresh evidence: build output, security tests, CSP headers, dependency audit, WordPress E2E, restore drill, and load results. A second reviewer signs off; the author of the fixes should not be the only approver.

- [ ] **Step 3: Check the go/no-go list**

- [ ] No uncommitted changes in the deploy commit.
- [ ] All env vars set in the deployment secret store, not a committed file.
- [ ] Appwrite schema applied and backed up.
- [ ] Restore drill passed.
- [ ] Monitoring/alerts tested with a synthetic error.
- [ ] On-call owner and support inbox documented.
- [ ] Privacy/terms published and linked.
- [ ] No paid/trial/testimonial/uptime claim without evidence.
- [ ] Rate limits and body caps active in production.
- [ ] Rollback image and procedure verified.
- [ ] Staging and production smoke tests pass.

- [ ] **Step 4: Launch**

Deploy the signed image, verify `/api/health`, complete a signup/login/create/save/reload/publish smoke test with a staging-like test account, and monitor the first 24 hours. Keep the previous image ready.

- [ ] **Step 5: Commit the checklist**

```bash
git add docs/ops/launch-checklist.md
git commit -m "docs: record the production launch go/no-go checklist"
```

### Gate 6 — Production launch

- [ ] Observability, deep health, backups, and restore are live and tested.
- [ ] Appwrite security settings are checked; secrets are in the deployment secret store.
- [ ] Production load and security tests pass.
- [ ] Rollback is tested; the launch checklist is signed by an independent reviewer.

---

## Audit-to-task coverage matrix

| Audit finding | Remediation tasks |
|---|---|
| Current tree build failure / lint failures | 0.1, 0.2, 0.4 |
| Unauthenticated AI and generation routes | 1.1, 1.4, 1.9 |
| Anonymous preview publishing / inline destination | 1.2, 1.9 |
| Loopback SSRF, DNS rebinding, redirect credential leak | 0.5, 1.3 |
| Unbounded generation/upload work | 1.5 |
| Stored XSS / raw `dangerouslySetInnerHTML` | 1.6, 1.9 |
| Missing CSP | 1.7 |
| Critical Next/Tiptap advisories | 1.8 |
| Scheduler duplicate runs, stuck runs, duplicate publishes | 2.3, 2.4, 2.5 |
| Publish-before-persist / retries | 2.4 |
| 3xx treated as success | 1.3, 2.5 |
| Workspace recovery/data-loss windows | 2.1, 2.2 |
| WordPress auth mismatch, post-type/publish bypass, replay | 3.2, 3.3, 3.4 |
| WordPress PII/media/author/update issues | 3.4 |
| Post mass assignment, admin self-lockout, upgrade spam, raw errors, model/target cost caps | 1.10 |
| Run/dedupe/post retention, destination health, failed-run tokens, unknown-publish review | 2.7 |
| Password reset, verification, deletion, export | 4.1, 4.2, 4.3 |
| Privacy/terms and signup consent | 4.4 |
| Trial/pricing/testimonials/uptime/offline claims | 4.5, 4.7, 5.6 |
| Silent rewrite fallback | 4.6 |
| Mobile editor | 5.3 |
| Auth/dialog/chapter accessibility | 5.1, 5.2 |
| Missing error boundaries / navigation loss | 5.4 |
| SEO/metadata/robots/social image | 5.5 |
| Fonts, 832 KB background, client bundle | 5.6 |
| Dead controls and misleading export states | 5.7 |
| Environment fallback / config validation | 0.5 |
| Appwrite custom domain, session policy, email verification, admin MFA, API-key scopes | 6.5 |
| Deployment, health, monitoring, backups, key rotation, incident response | 0.6, 6.1–6.6 |
| Load/capacity and final sign-off | 6.7, 6.8 |

## Suggested sequencing and effort

| Week | Workstream | Exit |
|---|---|---|
| Week 1 | Phase 0 + Phase 1 | Green CI, authenticated routes, pinned egress, sanitized HTML, CSP, patched deps |
| Week 2 | Phase 2 + Phase 3 | Recoverable workspace, atomic scheduler, idempotent outbox, working WordPress connection |
| Week 3 | Phase 4 + Phase 5 | Recovery/legal/claims, accessible mobile editor, metadata and performance budgets |
| Week 4 | Phase 6 | Monitoring, backups/restore, production deploy, load test, independent re-audit |
| Week 5–6 | Buffer | Regression fixes, second audit, launch window |

With one senior full-stack engineer and one QA/DevOps engineer, this is realistically **4–6 weeks**. Phase 3 (WordPress) and Phase 5 (frontend) can run in parallel with Phases 1–2 if staffing allows. Do not compress the security and data-integrity gates; the audit’s launch blockers are not cosmetic.

## Definition of done

The release is production-ready only when:

1. Every gate above is checked with evidence.
2. `npm audit --omit=dev --audit-level=high` is clean.
3. The security regression suite passes against staging.
4. A restore drill succeeds.
5. A load test meets the documented capacity target.
6. The WordPress plugin passes its E2E suite.
7. The legal pages are counsel-approved.
8. An independent reviewer signs the launch checklist.

## Execution handoff

This plan is deliberately phase-gated. Do not start Phase 1 security changes until Gate 0 is green, and do not launch from a working tree with uncommitted fixes. The critical path is Phase 0 → Phase 1 → Phase 2 → Phase 6; Phase 3/4/5 can run in parallel after Phase 0.
