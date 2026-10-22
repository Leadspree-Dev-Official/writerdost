import { authHeader } from "@/lib/appwrite/client";

export async function apiFetch(input: RequestInfo | URL, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  const auth = await authHeader();
  for (const [key, value] of Object.entries(auth)) headers.set(key, value);
  return fetch(input, { ...init, headers });
}
