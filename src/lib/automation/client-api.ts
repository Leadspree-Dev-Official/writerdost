/**
 * Browser-side calls to this app's automation routes.
 *
 * Every call carries a freshly minted Appwrite JWT, so the server can resolve
 * the caller and Appwrite's row permissions can scope the query. Nothing here
 * talks to Appwrite's data API directly: credentials must be encrypted with a
 * server-held key on the way in, which only a route can do.
 */
import { authHeader } from "@/lib/appwrite/client";
import type {
  AutomationInput,
  AutomationWire,
  DestinationInput,
  DestinationWire,
  PostInput,
  PostWire,
} from "./wire";
import type { UpgradeRequest, User } from "@/lib/store-types";

async function call<T>(path: string, init: RequestInit = {}): Promise<T> {
  const headers = {
    "content-type": "application/json",
    ...(await authHeader()),
    ...(init.headers as Record<string, string> | undefined),
  };

  const response = await fetch(path, { ...init, headers });
  const text = await response.text();
  const body = text ? (JSON.parse(text) as Record<string, unknown>) : {};

  if (!response.ok) {
    throw new Error((body.error as string) || `Request failed (${response.status}).`);
  }
  return body as T;
}

/* ---------------------------------------------------------------- */
/* Automations                                                       */
/* ---------------------------------------------------------------- */

export async function fetchAutomations(): Promise<AutomationWire[]> {
  return (await call<{ automations: AutomationWire[] }>("/api/automations")).automations;
}

export async function createAutomation(input: AutomationInput): Promise<AutomationWire> {
  return (
    await call<{ automation: AutomationWire }>("/api/automations", {
      method: "POST",
      body: JSON.stringify(input),
    })
  ).automation;
}

export async function patchAutomation(
  id: string,
  input: AutomationInput,
): Promise<AutomationWire> {
  return (
    await call<{ automation: AutomationWire }>(`/api/automations/${id}`, {
      method: "PATCH",
      body: JSON.stringify(input),
    })
  ).automation;
}

export async function removeAutomation(id: string): Promise<void> {
  await call(`/api/automations/${id}`, { method: "DELETE" });
}

/* ---------------------------------------------------------------- */
/* Destinations                                                      */
/* ---------------------------------------------------------------- */

export async function fetchDestinations(): Promise<DestinationWire[]> {
  return (await call<{ destinations: DestinationWire[] }>("/api/destinations")).destinations;
}

export async function saveDestination(
  input: DestinationInput & { id?: string },
): Promise<DestinationWire> {
  const { id, ...body } = input;
  const path = id ? `/api/destinations/${id}` : "/api/destinations";

  return (
    await call<{ destination: DestinationWire }>(path, {
      method: id ? "PUT" : "POST",
      body: JSON.stringify(body),
    })
  ).destination;
}

export async function removeDestination(id: string): Promise<void> {
  await call(`/api/destinations/${id}`, { method: "DELETE" });
}

/* ---------------------------------------------------------------- */
/* Generated posts                                                   */
/* ---------------------------------------------------------------- */

export async function fetchPosts(): Promise<PostWire[]> {
  return (await call<{ posts: PostWire[] }>("/api/posts")).posts;
}

export async function savePost(input: PostInput): Promise<PostWire> {
  return (await call<{ post: PostWire }>("/api/posts", { method: "POST", body: JSON.stringify(input) }))
    .post;
}

export async function removePost(id: string): Promise<void> {
  await call(`/api/posts/${id}`, { method: "DELETE" });
}

/* ---------------------------------------------------------------- */
/* Upgrade requests                                                  */
/* ---------------------------------------------------------------- */

export async function fetchUpgradeRequests(): Promise<UpgradeRequest[]> {
  return (await call<{ requests: UpgradeRequest[] }>("/api/upgrade-requests")).requests;
}

export async function raiseUpgradeRequest(feature: string): Promise<UpgradeRequest> {
  return (
    await call<{ request: UpgradeRequest }>("/api/upgrade-requests", {
      method: "POST",
      body: JSON.stringify({ feature }),
    })
  ).request;
}

export async function resolveUpgradeRequest(id: string): Promise<void> {
  await call("/api/upgrade-requests", { method: "PATCH", body: JSON.stringify({ id }) });
}

/* ---------------------------------------------------------------- */
/* Administration                                                    */
/* ---------------------------------------------------------------- */

/** Headers for a hand-rolled fetch that wants the same authentication. */
export async function authHeaders(): Promise<Record<string, string>> {
  return { "content-type": "application/json", ...(await authHeader()) };
}

/**
 * The admin calls report failure as a value rather than throwing: the screen
 * shows the message next to the row it belongs to, and a rejected promise
 * would have to be unwrapped at every call site to do that.
 */
export async function patchUser(
  id: string,
  updates: Partial<User>,
): Promise<{ user?: User; error?: string }> {
  try {
    const user = await call<{ user: User }>(`/api/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(updates),
    });
    return { user: user.user };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not update the account." };
  }
}

export async function createUser(
  payload: Partial<User> & { password?: string },
): Promise<{ user?: User; error?: string }> {
  try {
    const created = await call<{ user: User }>("/api/admin/users", {
      method: "POST",
      body: JSON.stringify(payload),
    });
    return { user: created.user };
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Could not create the account." };
  }
}

/** Returns an error message, or null on success. */
export async function deleteUser(id: string): Promise<string | null> {
  try {
    await call(`/api/admin/users/${id}`, { method: "DELETE" });
    return null;
  } catch (error) {
    return error instanceof Error ? error.message : "Could not delete the account.";
  }
}
