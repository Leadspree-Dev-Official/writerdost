import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client, Users, ID, Query } from "node-appwrite";

function loadEnvFile(name) {
  let text;
  try {
    text = readFileSync(resolve(process.cwd(), name), "utf8");
  } catch {
    return;
  }
  for (const line of text.split("\n")) {
    const match = /^\s*(?:export\s+)?([A-Z0-9_]+)\s*=\s*(.*)$/i.exec(line);
    if (!match) continue;
    const [, key, rawValue] = match;
    if (process.env[key]) continue;
    const value = rawValue.trim().replace(/^(['"])(.*)\1$/s, "$2");
    if (value) process.env[key] = value;
  }
}

loadEnvFile(".env.local");
loadEnvFile(".env");

const ENDPOINT = process.env.APPWRITE_ENDPOINT || "https://sgp.cloud.appwrite.io/v1";
const PROJECT_ID = process.env.APPWRITE_PROJECT_ID || "6aa84ecb00304c7935ad";
const API_KEY = process.env.APPWRITE_API_KEY || "";

if (!API_KEY) {
  console.error("APPWRITE_API_KEY missing.");
  process.exit(1);
}

const client = new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY);
const users = new Users(client);

const DEMO_ACCOUNTS = [
  {
    plan: "Free",
    name: "Demo Free User",
    email: "demo-free@writerdost.com",
    password: "Password123!",
    role: "user",
    prefs: {
      plan: "Free",
      allowedFeatures: {
        createEbook: true,
        rewriteEbook: false,
        blogGenerator: true,
        advancedModels: false,
      },
    },
    labels: [],
  },
  {
    plan: "Basic",
    name: "Demo Basic Creator",
    email: "demo-basic@writerdost.com",
    password: "Password123!",
    role: "user",
    prefs: {
      plan: "Basic",
      allowedFeatures: {
        createEbook: true,
        rewriteEbook: true,
        blogGenerator: true,
        advancedModels: false,
      },
    },
    labels: [],
  },
  {
    plan: "Pro",
    name: "Demo Pro Writer",
    email: "demo-pro@writerdost.com",
    password: "Password123!",
    role: "user",
    prefs: {
      plan: "Pro",
      allowedFeatures: {
        createEbook: true,
        rewriteEbook: true,
        blogGenerator: true,
        advancedModels: true,
      },
    },
    labels: [],
  },
  {
    plan: "Enterprise",
    name: "Demo Enterprise Partner",
    email: "demo-enterprise@writerdost.com",
    password: "Password123!",
    role: "user",
    prefs: {
      plan: "Enterprise",
      allowedFeatures: {
        createEbook: true,
        rewriteEbook: true,
        blogGenerator: true,
        advancedModels: true,
      },
    },
    labels: [],
  },
  {
    plan: "Enterprise",
    name: "Demo Administrator",
    email: "demo-admin@writerdost.com",
    password: "Password123!",
    role: "admin",
    prefs: {
      plan: "Enterprise",
      allowedFeatures: {
        createEbook: true,
        rewriteEbook: true,
        blogGenerator: true,
        advancedModels: true,
      },
    },
    labels: ["admin"],
  },
];

async function seed() {
  console.log("Seeding Demo Accounts into Appwrite...\n");

  for (const acc of DEMO_ACCOUNTS) {
    try {
      const found = await users.list({
        queries: [Query.equal("email", acc.email), Query.limit(1)],
      });

      let userId;
      if (found.total > 0 && found.users[0]) {
        userId = found.users[0].$id;
        console.log(`• Updating existing account: ${acc.email} (${userId})`);
        await users.updatePassword({ userId, password: acc.password });
        await users.updateName({ userId, name: acc.name });
      } else {
        userId = ID.unique();
        console.log(`• Creating new account: ${acc.email} (${userId})`);
        await users.create({
          userId,
          email: acc.email,
          password: acc.password,
          name: acc.name,
        });
      }

      // Ensure verified email so no auth gates block them
      await users.updateEmailVerification({ userId, emailVerification: true });

      // Update preferences (plan and features)
      await users.updatePrefs({ userId, prefs: acc.prefs });

      // Update labels (admin or clean)
      await users.updateLabels({ userId, labels: acc.labels });

      console.log(`  ✅ Plan: ${acc.plan} | Role: ${acc.role} | Password: ${acc.password}`);
    } catch (err) {
      console.error(`  ❌ Failed for ${acc.email}:`, err.message);
    }
  }

  console.log("\nDemo account seeding finished successfully!");
}

seed();
