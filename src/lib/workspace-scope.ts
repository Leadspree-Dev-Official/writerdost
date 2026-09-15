/**
 * Which localStorage key the workspace is saved under.
 *
 * Manuscripts, the create draft, the pen name and the BYO AI key are local by
 * design — they never reach Appwrite. That was fine until accounts arrived:
 * one key for the whole browser meant the next person to sign up inherited the
 * previous person's books and their API key, because signing out cleared the
 * session but not the disk.
 *
 * So the key is scoped to the account instead. Each person's workspace sits
 * under their own key and stays there: switching accounts switches keys rather
 * than deleting anything, and signing out and back in returns you to your own
 * drafts. Nothing is shared, and nothing is lost.
 *
 * This is storage hygiene, not a security boundary. Anything a determined
 * person must not read off their own disk does not belong in localStorage at
 * all — it belongs behind an API route.
 */

const PREFIX = "writerdost-app-store";

/**
 * The key every install used before workspaces were scoped. Adopted once, by
 * the first account to sign in on that browser, then removed.
 */
export const LEGACY_WORKSPACE_KEY = PREFIX;

/** Where a signed-out browser saves. Effectively scratch: the guard redirects. */
export const ANON_WORKSPACE_KEY = `${PREFIX}:anon`;

/** One account's workspace. Appwrite ids are already key-safe. */
export function workspaceKey(userId: string): string {
  return `${PREFIX}:u:${userId}`;
}

/** Reading localStorage throws in some privacy modes; treat that as "empty". */
function readKey(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function workspaceExists(key: string): boolean {
  return readKey(key) !== null;
}

/**
 * Moves a pre-scoping save onto the first account that signs in after the
 * upgrade, so nobody opens the app to find their books gone.
 *
 * It is a move, not a copy: once claimed the legacy key is removed, so a
 * second account signing in on the same browser starts empty rather than
 * inheriting the first one's work. Returns true when something was adopted.
 */
export function adoptLegacyWorkspace(target: string): boolean {
  if (workspaceExists(target)) return false;

  const legacy = readKey(LEGACY_WORKSPACE_KEY);
  if (legacy === null) return false;

  try {
    localStorage.setItem(target, legacy);
    localStorage.removeItem(LEGACY_WORKSPACE_KEY);
    return true;
  } catch {
    // Out of quota, or storage is blocked. The account simply starts fresh.
    return false;
  }
}
