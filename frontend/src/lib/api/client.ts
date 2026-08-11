import { API_BASE_URL, toQueryString, type QueryValue } from "./config";
import { clearSession, getAccessToken, readErrorBody, refreshSession } from "./auth-tokens";
import { ApiError } from "./types";

/**
 * The one place a request leaves the app.
 *
 * Everything above this file works in domain types and `ApiError`; nothing else
 * touches `fetch`, headers, or status codes.
 */

export interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  query?: Record<string, QueryValue>;
  body?: unknown;
  signal?: AbortSignal;
  /**
   * Send the token when there is one, but never require it.
   *
   * Some routes personalise for a signed-in user and work fine without one —
   * venue search and venue detail both do. The OpenAPI schema marks them as
   * secured anyway, because the optional-user dependency still declares the
   * scheme, so this cannot be read off the generated types.
   */
  auth?: "required" | "optional" | "none";
}

export async function apiFetch<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { method = "GET", query, body, signal, auth = "optional" } = options;
  const url = `${API_BASE_URL}${path}${toQueryString(query)}`;

  const send = async (): Promise<Response> => {
    const headers = new Headers({ Accept: "application/json" });

    // Our own id rather than the server's. It comes back on the response and in
    // every log line for the request, so a failure can be traced from the screen
    // that produced it.
    headers.set("X-Request-ID", crypto.randomUUID());

    if (body !== undefined) headers.set("Content-Type", "application/json");

    const token = getAccessToken();
    if (token && auth !== "none") headers.set("Authorization", `Bearer ${token}`);

    return fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  };

  let response = await send();

  // One retry, and only for an expired access token. `refreshSession` is
  // single-flight, so ten simultaneous 401s produce one refresh.
  if (response.status === 401 && auth !== "none") {
    try {
      await refreshSession();
      response = await send();
    } catch (error) {
      clearSession();
      throw error;
    }
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorBody(response));
  }

  // 204 on every successful DELETE and on the logout routes.
  if (response.status === 204) return undefined as T;

  return (await response.json()) as T;
}
