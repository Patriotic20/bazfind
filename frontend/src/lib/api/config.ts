import { ApiErrorResponse, TokenPair } from "./types";

/**
 * Where the API is, up to and including its `/api` prefix.
 *
 * The browser talks to the backend directly — there is no proxy in front of it —
 * so this has to be a URL the *user's* machine can resolve. Inside docker compose
 * that is still the published host port, not the `backend` service name.
 *
 * `NEXT_PUBLIC_*` is inlined at build time, not read at runtime: a container
 * built with the wrong value cannot be fixed by restarting it with the right one.
 */
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"
).replace(/\/$/, "");

/**
 * The services spell every path from the site root (`/api/v1/...`), as they did
 * when Next proxied `/api/*`. The base already ends in `/api`, so that prefix is
 * dropped here rather than in each of the hundred call sites.
 */
function apiUrl(endpoint: string): string {
  return `${API_BASE_URL}${endpoint.replace(/^\/api(?=\/)/, "")}`;
}

export class BazmlyApiError extends Error {
  public code: string;
  public status: number;
  public details?: Record<string, any> | null;
  public requestId?: string;

  constructor(status: number, data: any) {
    let msg = data?.message;
    // A validation refusal carries the field's own sentence in details.errors;
    // the top-level message is only "So'rov tekshiruvdan o'tmadi".
    const fieldErrors = data?.details?.errors;
    if (Array.isArray(fieldErrors) && fieldErrors[0]?.msg) {
      msg = String(fieldErrors[0].msg).replace(/^Value error, /, "");
    }
    if (!msg && Array.isArray(data?.detail)) {
      msg = data.detail.map((d: any) => d.msg || `${d.loc?.join(".")}: ${d.msg}`).join(", ");
    } else if (!msg && typeof data?.detail === "string") {
      msg = data.detail;
    }
    super(msg || `So'rov bajarilmadi (${status})`);
    this.name = "BazmlyApiError";
    this.status = status;
    this.code = data?.code || "unknown_error";
    this.details = data?.details || (Array.isArray(data?.detail) ? { errors: data.detail } : null);
    this.requestId = data?.request_id;
  }
}

// Token storage helpers
export const TOKEN_STORAGE_KEY = "bazmly_access_token";
export const REFRESH_TOKEN_STORAGE_KEY = "bazmly_refresh_token";

export function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(TOKEN_STORAGE_KEY);
}

export function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
}

export function setTokens(tokens: { access_token: string; refresh_token: string }) {
  if (typeof window === "undefined") return;
  localStorage.setItem(TOKEN_STORAGE_KEY, tokens.access_token);
  localStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, tokens.refresh_token);
  document.cookie = `access_token=${tokens.access_token}; path=/; max-age=2592000; SameSite=Lax`;
}

export function clearTokens() {
  if (typeof window === "undefined") return;
  localStorage.removeItem(TOKEN_STORAGE_KEY);
  localStorage.removeItem(REFRESH_TOKEN_STORAGE_KEY);
  document.cookie = "access_token=; path=/; max-age=0";
}

let isRefreshing = false;
let refreshSubscribers: ((token: string) => void)[] = [];

function onTokenRefreshed(newToken: string) {
  refreshSubscribers.forEach((cb) => cb(newToken));
  refreshSubscribers = [];
}

function addRefreshSubscriber(cb: (token: string) => void) {
  refreshSubscribers.push(cb);
}

async function tryRefreshToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearTokens();
    return null;
  }

  try {
    const res = await fetch(apiUrl("/api/v1/auth/refresh"), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      clearTokens();
      return null;
    }

    const data: TokenPair = await res.json();
    setTokens({
      access_token: data.access_token,
      refresh_token: data.refresh_token,
    });
    return data.access_token;
  } catch {
    clearTokens();
    return null;
  }
}

export interface FetchOptions extends RequestInit {
  params?: Record<string, any>;
  skipAuth?: boolean;
}

export async function apiFetch<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
  const { params, skipAuth, headers: customHeaders, ...restOptions } = options;

  let url = endpoint.startsWith("http") ? endpoint : apiUrl(endpoint);

  if (params) {
    const searchParams = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== "") {
        searchParams.append(key, String(value));
      }
    });
    const queryString = searchParams.toString();
    if (queryString) {
      url += (url.includes("?") ? "&" : "?") + queryString;
    }
  }

  const token = !skipAuth ? getAccessToken() : null;

  const headers = new Headers(customHeaders || {});
  if (!headers.has("Content-Type") && !(restOptions.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  let response = await fetch(url, {
    ...restOptions,
    headers,
  });

  // Handle 401 token refresh
  if (response.status === 401 && !skipAuth) {
    if (getRefreshToken()) {
      if (!isRefreshing) {
        isRefreshing = true;
        const newToken = await tryRefreshToken();
        isRefreshing = false;

        if (newToken) {
          onTokenRefreshed(newToken);
          headers.set("Authorization", `Bearer ${newToken}`);
          response = await fetch(url, { ...restOptions, headers });
        } else {
          clearTokens();
          if (typeof window !== "undefined") {
            window.dispatchEvent(new Event("auth:logout"));
          }
        }
      } else {
        // Wait for existing refresh to complete
        const retryPromise = new Promise<Response>((resolve) => {
          addRefreshSubscriber(async (newToken) => {
            headers.set("Authorization", `Bearer ${newToken}`);
            const retryRes = await fetch(url, { ...restOptions, headers });
            resolve(retryRes);
          });
        });
        response = await retryPromise;
      }
    } else {
      clearTokens();
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("auth:logout"));
      }
    }
  }

  if (!response.ok) {
    let errorData: Partial<ApiErrorResponse> = {};
    try {
      errorData = await response.json();
    } catch {
      errorData = {
        code: "http_error",
        message: `HTTP xatosi: ${response.status} ${response.statusText}`,
      };
    }
    throw new BazmlyApiError(response.status, errorData);
  }

  // 204 No Content
  if (response.status === 204) {
    return {} as T;
  }

  return (await response.json()) as T;
}
