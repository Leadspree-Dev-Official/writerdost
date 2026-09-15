/**
 * The workspace, in Appwrite.
 *
 * Manuscripts, drafts, editor settings and the BYO AI key used to live in the
 * browser's localStorage. They live here now: one `workspaces` row per account
 * for the small state, one `workspace_projects` row per manuscript. Nothing
 * about a workspace is kept on the machine it was written from.
 *
 * Every call takes a JWT-scoped TablesDB client, so Appwrite's own row
 * permissions decide what is reachable — a filter mistake here returns
 * nothing, never somebody else's book.
 *
 * Secrets never enter a row in the clear. `stripSecrets` pulls the API keys
 * out of the settings blob, they are AES-256-GCM encrypted with the server's
 * key, and `restoreSecrets` puts them back only for the account that owns
 * them. Without WRITERDOST_ENCRYPTION_KEY the secrets are dropped rather than
 * stored, and the caller is told so.
 */
import type { TablesDB } from "node-appwrite";
import {
  DATABASE_ID,
  Query,
  TABLES,
  decodeJson,
  encodeJson,
  ownerPermissions,
  rowKey,
} from "@/lib/appwrite/server";
import { decryptSecret, encryptSecret, encryptionAvailable } from "@/lib/secure-store";
import type { StoredProject, WorkspacePatch, WorkspaceSettings, WorkspaceSnapshot } from "./wire";

/** Appwrite rejects a larger page. Nobody has this many books, but page anyway. */
const PAGE = 100;

/**
 * A guard against a runaway autosave, not a product limit. The store sends 25
 * at a time, so reaching this means something other than the app is writing.
 */
export const MAX_PROJECTS_PER_SAVE = 50;

function message(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

/* ------------------------------------------------------------------ */
/* Secrets                                                             */
/* ------------------------------------------------------------------ */

/**
 * The fields inside the settings blob that are credentials. Each is a path
 * from the root of the blob.
 */
const SECRET_PATHS: string[][] = [
  ["api", "apiKey"],
  ["platform", "marketplaceApiKey"],
  ["platform", "webhookSecret"],
];

function readPath(source: unknown, path: string[]): string {
  let cursor: unknown = source;
  for (const step of path) {
    if (!cursor || typeof cursor !== "object") return "";
    cursor = (cursor as Record<string, unknown>)[step];
  }
  return typeof cursor === "string" ? cursor : "";
}

/** Writes `value` at `path`, creating the objects on the way down. */
function writePath(target: Record<string, unknown>, path: string[], value: string): void {
  let cursor = target;
  for (const step of path.slice(0, -1)) {
    const next = cursor[step];
    if (!next || typeof next !== "object") cursor[step] = {};
    cursor = cursor[step] as Record<string, unknown>;
  }
  cursor[path[path.length - 1]] = value;
}

type Split = { plain: WorkspaceSettings; secrets: Record<string, string>; dropped: boolean };

/** Lifts the credentials out of the blob so they are never stored in the clear. */
function stripSecrets(settings: WorkspaceSettings): Split {
  // A structured clone: the caller's object must not be mutated, and the blob
  // is plain JSON by construction.
  const plain = JSON.parse(JSON.stringify(settings ?? {})) as Record<string, unknown>;
  const secrets: Record<string, string> = {};
  const canEncrypt = encryptionAvailable();
  let dropped = false;

  for (const path of SECRET_PATHS) {
    const value = readPath(plain, path);
    if (!value) continue;

    writePath(plain, path, "");
    if (canEncrypt) secrets[path.join(".")] = encryptSecret(value);
    else dropped = true;
  }

  // API tokens are shown once and then only ever compared, so the stored copy
  // is the encrypted one too.
  const platform = plain.platform as Record<string, unknown> | undefined;
  if (platform && Array.isArray(platform.tokens)) {
    platform.tokens = platform.tokens.map((entry) => {
      const token = entry as Record<string, unknown>;
      const value = typeof token.token === "string" ? token.token : "";
      if (!value) return token;
      if (!canEncrypt) {
        dropped = true;
        return { ...token, token: "" };
      }
      return { ...token, token: "", cipher: encryptSecret(value) };
    });
  }

  return { plain, secrets, dropped };
}

/** Puts the decrypted credentials back for the account that owns them. */
function restoreSecrets(plain: WorkspaceSettings, secrets: Record<string, string>): WorkspaceSettings {
  const restored = JSON.parse(JSON.stringify(plain ?? {})) as Record<string, unknown>;

  for (const path of SECRET_PATHS) {
    const cipher = secrets[path.join(".")];
    if (!cipher) continue;
    try {
      writePath(restored, path, decryptSecret(cipher));
    } catch {
      // A key rotation makes old ciphertext unreadable. The user re-enters it.
      writePath(restored, path, "");
    }
  }

  const platform = restored.platform as Record<string, unknown> | undefined;
  if (platform && Array.isArray(platform.tokens)) {
    platform.tokens = platform.tokens.map((entry) => {
      const token = entry as Record<string, unknown>;
      const cipher = typeof token.cipher === "string" ? token.cipher : "";
      const { cipher: _cipher, ...rest } = token;
      void _cipher;
      if (!cipher) return rest;
      try {
        return { ...rest, token: decryptSecret(cipher) };
      } catch {
        return rest;
      }
    });
  }

  return restored;
}

/* ------------------------------------------------------------------ */
/* Rows                                                                */
/* ------------------------------------------------------------------ */

type WorkspaceRow = { $id: string; data: string | null; secrets?: string | null };
type ProjectRow = { $id: string; projectId: string; data: string | null };

/** One row per account, so the id can be derived instead of searched for. */
const workspaceRowId = (userId: string) => rowKey("workspace", userId);
const projectRowId = (userId: string, projectId: string) => rowKey("project", userId, projectId);

export async function loadWorkspace(db: TablesDB, userId: string): Promise<WorkspaceSnapshot> {
  let settings: WorkspaceSettings | null = null;
  let existed = false;

  try {
    const row = (await db.getRow({
      databaseId: DATABASE_ID,
      tableId: TABLES.workspaces,
      rowId: workspaceRowId(userId),
    })) as unknown as WorkspaceRow;

    const stored = decodeJson<{ settings: WorkspaceSettings; secrets: Record<string, string> }>(
      row.data,
      { settings: {}, secrets: {} },
    );
    settings = restoreSecrets(stored.settings || {}, stored.secrets || {});
    existed = true;
  } catch (error) {
    // 404 is the ordinary "new account" case; anything else is a real failure.
    if ((error as { code?: number })?.code !== 404) {
      throw new Error(`Could not load the workspace: ${message(error)}`);
    }
  }

  const projects: StoredProject[] = [];
  try {
    let cursor: string | null = null;
    for (;;) {
      const queries = [Query.equal("userId", userId), Query.limit(PAGE)];
      if (cursor) queries.push(Query.cursorAfter(cursor));

      const page = await db.listRows({
        databaseId: DATABASE_ID,
        tableId: TABLES.workspaceProjects,
        queries,
      });
      const rows = page.rows as unknown as ProjectRow[];

      for (const row of rows) {
        const project = decodeJson<StoredProject | null>(row.data, null);
        if (project && typeof project.id === "string") projects.push(project);
      }

      if (rows.length < PAGE) break;
      cursor = rows[rows.length - 1].$id;
    }
  } catch (error) {
    throw new Error(`Could not load the manuscripts: ${message(error)}`);
  }

  return { settings, projects, existed };
}

/** Creates or replaces one row, whichever it turns out to need. */
async function upsert(
  db: TablesDB,
  tableId: string,
  rowId: string,
  userId: string,
  data: Record<string, unknown>,
): Promise<void> {
  const permissions = ownerPermissions(userId);
  try {
    await db.updateRow({ databaseId: DATABASE_ID, tableId, rowId, data });
  } catch (error) {
    if ((error as { code?: number })?.code !== 404) throw error;
    await db.createRow({
      databaseId: DATABASE_ID,
      tableId,
      rowId,
      data: { ...data, userId },
      permissions,
    });
  }
}

export async function saveWorkspace(
  db: TablesDB,
  userId: string,
  patch: WorkspacePatch,
): Promise<{ secretsDropped: boolean }> {
  let secretsDropped = false;

  if (patch.settings) {
    const { plain, secrets, dropped } = stripSecrets(patch.settings);
    secretsDropped = dropped;

    try {
      await upsert(db, TABLES.workspaces, workspaceRowId(userId), userId, {
        data: encodeJson({ settings: plain, secrets }),
        savedAt: new Date().toISOString(),
      });
    } catch (error) {
      throw new Error(`Could not save the workspace: ${message(error)}`);
    }
  }

  if (
    (patch.projects?.length ?? 0) > MAX_PROJECTS_PER_SAVE ||
    (patch.deletedProjectIds?.length ?? 0) > MAX_PROJECTS_PER_SAVE
  ) {
    // Refused rather than truncated: a partial save that reported success
    // would let the client mark unsaved manuscripts as written.
    throw new Error(`A single save may touch at most ${MAX_PROJECTS_PER_SAVE} manuscripts.`);
  }

  for (const project of patch.projects ?? []) {
    if (!project || typeof project.id !== "string" || !project.id) continue;
    try {
      await upsert(db, TABLES.workspaceProjects, projectRowId(userId, project.id), userId, {
        projectId: project.id,
        title: String(project.title ?? "Untitled").slice(0, 512),
        data: encodeJson(project),
        savedAt: new Date().toISOString(),
      });
    } catch (error) {
      throw new Error(`Could not save "${project.title ?? project.id}": ${message(error)}`);
    }
  }

  for (const projectId of patch.deletedProjectIds ?? []) {
    if (!projectId) continue;
    try {
      await db.deleteRow({
        databaseId: DATABASE_ID,
        tableId: TABLES.workspaceProjects,
        rowId: projectRowId(userId, projectId),
      });
    } catch (error) {
      // Already gone is the expected outcome of a retried delete.
      if ((error as { code?: number })?.code !== 404) {
        throw new Error(`Could not delete the manuscript: ${message(error)}`);
      }
    }
  }

  return { secretsDropped };
}
