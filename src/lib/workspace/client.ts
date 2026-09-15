/**
 * Browser-side calls to /api/workspace.
 *
 * Every call carries a freshly minted Appwrite JWT so the server can resolve
 * the caller. Nothing is cached on disk on the way past: this module is the
 * only path a manuscript takes out of the tab.
 */
import { authHeader } from "@/lib/appwrite/client";
import type { WorkspacePatch, WorkspaceSnapshot } from "./wire";

const ROUTE = "/api/workspace";

async function headers(): Promise<Record<string, string>> {
  return { "content-type": "application/json", ...(await authHeader()) };
}

export async function fetchWorkspace(): Promise<WorkspaceSnapshot> {
  const response = await fetch(ROUTE, { headers: await headers(), cache: "no-store" });
  const text = await response.text();
  const body = text ? (JSON.parse(text) as Record<string, unknown>) : {};

  if (!response.ok) {
    throw new Error((body.error as string) || `Could not load the workspace (${response.status}).`);
  }
  return body as unknown as WorkspaceSnapshot;
}

/**
 * Saves a patch. `keepalive` lets the last save survive the tab closing, which
 * is the one moment a debounced write would otherwise be lost.
 */
export async function pushWorkspace(
  patch: WorkspacePatch,
  { keepalive = false }: { keepalive?: boolean } = {},
): Promise<{ secretsDropped?: boolean }> {
  const response = await fetch(ROUTE, {
    method: "PUT",
    headers: await headers(),
    body: JSON.stringify(patch),
    keepalive,
  });

  const text = await response.text();
  const body = text ? (JSON.parse(text) as Record<string, unknown>) : {};
  if (!response.ok) {
    throw new Error((body.error as string) || `Could not save the workspace (${response.status}).`);
  }
  return body as { secretsDropped?: boolean };
}
