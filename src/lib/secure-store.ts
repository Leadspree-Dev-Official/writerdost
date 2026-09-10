/**
 * Server-side credential encryption.
 *
 * Destination tokens (WordPress application passwords, Ghost admin keys) and
 * the AI key an automation spends are stored in Postgres. They are encrypted
 * here with AES-256-GCM so a database dump — or a stray `select *` — does not
 * hand over the user's publishing credentials.
 *
 * The key comes from WRITERDOST_ENCRYPTION_KEY (32 bytes, base64 or hex).
 * Generate one with:  openssl rand -base64 32
 */
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

const IV_BYTES = 12; // GCM standard nonce length
const TAG_BYTES = 16;

function readKey(): Buffer {
  const raw = process.env.WRITERDOST_ENCRYPTION_KEY || "";
  if (!raw) {
    throw new Error(
      "WRITERDOST_ENCRYPTION_KEY is not set. Generate one with `openssl rand -base64 32`.",
    );
  }

  const key = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (key.length !== 32) {
    throw new Error("WRITERDOST_ENCRYPTION_KEY must decode to exactly 32 bytes.");
  }
  return key;
}

/** Encrypts a secret. Output is `v1.<iv>.<tag>.<ciphertext>`, all base64url. */
export function encryptSecret(plaintext: string): string {
  const key = readKey();
  const iv = randomBytes(IV_BYTES);
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return [
    "v1",
    iv.toString("base64url"),
    tag.toString("base64url"),
    ciphertext.toString("base64url"),
  ].join(".");
}

/** Reverses `encryptSecret`. Throws if the payload was tampered with. */
export function decryptSecret(payload: string): string {
  const parts = (payload || "").split(".");
  if (parts.length !== 4 || parts[0] !== "v1") {
    throw new Error("Stored credential is not in the expected format.");
  }

  const key = readKey();
  const iv = Buffer.from(parts[1], "base64url");
  const tag = Buffer.from(parts[2], "base64url");
  const ciphertext = Buffer.from(parts[3], "base64url");

  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new Error("Stored credential is malformed.");
  }

  const decipher = createDecipheriv("aes-256-gcm", key, iv);
  decipher.setAuthTag(tag);

  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString("utf8");
}

/** True when encryption is configured, so the UI can warn before saving keys. */
export function encryptionAvailable(): boolean {
  try {
    readKey();
    return true;
  } catch {
    return false;
  }
}

/** Shows only enough of a secret to recognise it. Never log the raw value. */
export function maskSecret(secret: string): string {
  if (!secret) return "";
  if (secret.length <= 8) return "••••";
  return `${secret.slice(0, 3)}••••${secret.slice(-4)}`;
}
