/**
 * Writerdost AI — grant or revoke the administrator role.
 *
 *   node appwrite/grant-admin.mjs someone@example.com
 *   node appwrite/grant-admin.mjs someone@example.com --revoke
 *
 * The role is an Appwrite *label*, and labels can only be written with an API
 * key holding the `users.write` scope. That is the point: it means a signed-in
 * user cannot promote themselves by editing their own account preferences.
 *
 * It also means the first administrator has to be made from outside the app,
 * which is what this script is for. Afterwards that person can promote others
 * from the Admin screen.
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Client, Users, Query } from "node-appwrite";

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

const ADMIN_LABEL = "admin";

const email = process.argv[2];
const revoke = process.argv.includes("--revoke");

if (!email) {
  console.error("Usage: node appwrite/grant-admin.mjs <email> [--revoke]");
  process.exit(1);
}

const ENDPOINT =
  process.env.APPWRITE_ENDPOINT || process.env.NEXT_PUBLIC_APPWRITE_ENDPOINT || "";
const PROJECT_ID =
  process.env.APPWRITE_PROJECT_ID || process.env.NEXT_PUBLIC_APPWRITE_PROJECT_ID || "";
const API_KEY = process.env.APPWRITE_API_KEY || "";

if (!ENDPOINT || !PROJECT_ID || !API_KEY) {
  console.error(
    "Missing configuration. Set APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID and\n" +
      "APPWRITE_API_KEY in .env.local. The key needs the `users.write` scope.",
  );
  process.exit(1);
}

const users = new Users(
  new Client().setEndpoint(ENDPOINT).setProject(PROJECT_ID).setKey(API_KEY),
);

const found = await users.list({ queries: [Query.equal("email", email), Query.limit(1)] });
const user = found.users[0];

if (!user) {
  console.error(`No account with the email ${email}. Sign up first, then run this.`);
  process.exit(1);
}

// Preserve any other label; only the admin one is this script's business.
const others = (user.labels || []).filter((label) => label !== ADMIN_LABEL);
const labels = revoke ? others : [...others, ADMIN_LABEL];

await users.updateLabels({ userId: user.$id, labels });

console.log(
  `${revoke ? "Revoked" : "Granted"} admin for ${user.email} (${user.$id}).\n` +
    `Labels are now: ${JSON.stringify(labels)}\n` +
    "They must sign out and back in for the change to reach their session.",
);
