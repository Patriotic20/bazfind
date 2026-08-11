import { API_BASE_URL } from "./config";
import { ApiError, type ApiErrorBody, type TokenPair } from "./types";

/**
 * Session storage and token refresh.
 *
 * The backend hands out a short-lived access token (15 minutes) and an opaque
 * refresh token it keeps in the database. Neither arrives as a cookie — the API
 * sets none — and since the browser calls it cross-origin with no proxy in
 * front, httpOnly storage is not available to us either.
 *
 * So: the access token lives in memory and dies with the tab, and only the
 * refresh token is persisted. That is a deliberate trade — a persisted access
 * token would be the more useful thing for an attacker to read, and the refresh
 * token at least rotates on every use.
 */

const REFRESH_TOKEN_KEY = "bazmly.refresh_token";

let accessToken: string | null = null;

/** Notified whenever the session appears or disappears, so React can re-render. */
type SessionListener = () => void;
const listeners = new Set<SessionListener>();

function announce(): void {
  for (const listener of listeners) listener();
}

export function subscribeToSession(listener: SessionListener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getAccessToken(): string | null {
  return accessToken;
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function storeSession(pair: TokenPair): void {
  accessToken = pair.access_token;
  if (typeof window !== "undefined") {
    window.localStorage.setItem(REFRESH_TOKEN_KEY, pair.refresh_token);
  }
  announce();
}

export function clearSession(): void {
  accessToken = null;
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
  announce();
}

export function hasSession(): boolean {
  return accessToken !== null || getRefreshToken() !== null;
}

/**
 * In flight refresh, shared by every caller.
 *
 * This is not an optimisation. The backend rotates refresh tokens and treats a
 * second use of an already-rotated one as theft — it then revokes *every* token
 * the user has. Two requests expiring at the same moment and refreshing
 * independently would therefore log the user out rather than renew them. One
 * promise, shared: the second caller waits for the first.
 */
let inFlight: Promise<TokenPair> | null = null;

export function refreshSession(): Promise<TokenPair> {
  if (inFlight) return inFlight;

  inFlight = performRefresh().finally(() => {
    inFlight = null;
  });
  return inFlight;
}

async function performRefresh(): Promise<TokenPair> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearSession();
    throw new ApiError(401, {
      code: "unauthenticated",
      message: "Sessiya tugagan. Iltimos, qaytadan kiring.",
      details: {},
      request_id: null,
    });
  }

  // A bare `fetch`, not `apiFetch`: the client retries through this function on
  // a 401, and routing the retry back through the client would recurse.
  const response = await fetch(`${API_BASE_URL}/v1/auth/refresh`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ refresh_token: refreshToken }),
  });

  if (!response.ok) {
    // Refusal is terminal. The backend answers a revoked or expired refresh
    // token with 403, and by the time it does the whole token family is gone.
    clearSession();
    throw new ApiError(response.status, await readErrorBody(response));
  }

  const pair = (await response.json()) as TokenPair;
  storeSession(pair);
  return pair;
}

/** Parse the error envelope, falling back to something honest if the body is not one. */
export async function readErrorBody(response: Response): Promise<ApiErrorBody> {
  try {
    const body = (await response.json()) as Partial<ApiErrorBody>;
    if (typeof body?.code === "string" && typeof body?.message === "string") {
      return {
        code: body.code,
        message: body.message,
        details: body.details ?? {},
        request_id: body.request_id ?? null,
      };
    }
  } catch {
    // A gateway timeout or a crash upstream of the app returns HTML, not JSON.
  }

  return {
    code: "http_error",
    message: "Serverga ulanishda xatolik yuz berdi.",
    details: {},
    request_id: response.headers.get("X-Request-ID"),
  };
}
