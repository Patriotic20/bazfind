import type { components } from "./schema";

/**
 * The error envelope, written by hand on purpose.
 *
 * The OpenAPI schema declares only the success responses plus FastAPI's own
 * `HTTPValidationError`, which is `{detail: [...]}` — a shape this API never
 * actually returns. Every failure, including 422, comes back as the envelope
 * below, and no 401/403/404/409/429/500 is declared at all. Generated error
 * types would be confidently wrong, so they are not used.
 */
export interface ApiErrorBody {
  /** Stable English discriminator. Branch on this. */
  code: string;
  /** Uzbek display text. Carries no contract — show it, never parse it. */
  message: string;
  details: Record<string, unknown>;
  request_id: string | null;
}

/**
 * Every `code` the backend can send.
 *
 * Kept as a union of literals plus `(string & {})` so an unknown code from a
 * newer backend still type-checks as a string instead of breaking the build,
 * while the known ones keep their autocomplete.
 */
export type ApiErrorCode =
  | "bad_request"
  | "unauthenticated"
  | "unauthorized"
  | "permission_denied"
  | "forbidden"
  | "not_found"
  | "conflict"
  | "integrity_error"
  | "phone_already_registered"
  | "table_already_booked"
  | "venue_already_booked"
  | "table_has_open_order"
  | "receipt_already_issued"
  | "already_reviewed"
  | "group_already_exists"
  | "validation_error"
  | "validation_failed"
  | "venue_closed"
  | "lead_time_too_short"
  | "capacity_exceeded"
  | "deposit_required"
  | "payment_incomplete"
  | "booking_not_check_inable"
  | "too_many_attempts"
  | "http_error"
  | "internal_error"
  | (string & {});

/** A failed request. Thrown by `apiFetch`, so every call site can `catch` one thing. */
export class ApiError extends Error {
  readonly status: number;
  readonly code: ApiErrorCode;
  readonly details: Record<string, unknown>;
  readonly requestId: string | null;

  constructor(status: number, body: ApiErrorBody) {
    // `message` is the Uzbek text the backend wrote for a person to read, so it
    // is what a toast shows without any mapping table on this side.
    super(body.message);
    this.name = "ApiError";
    this.status = status;
    this.code = body.code;
    this.details = body.details ?? {};
    this.requestId = body.request_id ?? null;
  }

  /** The session is gone or was never there. */
  get isUnauthenticated(): boolean {
    return this.status === 401;
  }

  /**
   * Refused rather than unauthenticated.
   *
   * A failed token refresh lands here, not on 401 — the backend answers a
   * revoked or expired refresh token with 403 `permission_denied`. Retrying a
   * 403 loops forever; it means log out.
   */
  get isForbidden(): boolean {
    return this.status === 403;
  }
}

/** The pagination envelope. There is no `page`, `size` or `has_next`. */
export interface Page<T> {
  items: T[];
  total: number;
  limit: number;
  offset: number;
}

type Schemas = components["schemas"];

// Named re-exports, so screens import `Region` rather than spelling out
// `components["schemas"]["RegionRead"]` at every use site.
export type Region = Schemas["RegionRead"];
export type District = Schemas["DistrictRead"];
export type Language = Schemas["LanguageRead"];
export type TokenPair = Schemas["TokenPair"];
export type User = Schemas["UserRead"];
