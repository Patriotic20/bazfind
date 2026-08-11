/**
 * Where the API is.
 *
 * The browser talks to the backend directly — there is no proxy in front of it —
 * so this value ends up in the bundle and has to be a URL the *user's* machine
 * can resolve. Inside docker compose that is still the published host port, not
 * the `backend` service name, which only exists on the compose network.
 *
 * `NEXT_PUBLIC_*` is inlined at build time, not read at runtime: a container
 * built with the wrong value cannot be fixed by restarting it with the right one.
 */
export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000/api"
).replace(/\/$/, "");

/** A value that can be sent as a query parameter. `undefined` means "omit". */
export type QueryValue = string | number | boolean | null | undefined | readonly (string | number)[];

/**
 * Build a query string the way FastAPI reads one.
 *
 * Arrays repeat the key — `?statuses=pending&statuses=confirmed` — because that
 * is what `list[BookingStatus] = Query()` parses. A comma-joined value arrives
 * as one string and fails validation.
 */
export function toQueryString(params: Record<string, QueryValue> | undefined): string {
  if (!params) return "";

  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) continue;
    if (Array.isArray(value)) {
      for (const entry of value) search.append(key, String(entry));
    } else {
      search.append(key, String(value));
    }
  }

  const query = search.toString();
  return query ? `?${query}` : "";
}
