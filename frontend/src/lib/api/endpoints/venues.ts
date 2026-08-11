import { apiFetch } from "../client";
import type {
  AvailableTable,
  MenuItem,
  Page,
  Review,
  Venue,
  VenueDetail,
  VenueType,
  VenueZone,
} from "../types";

/**
 * The customer-facing venue surface: search, detail, menu, reviews, free tables.
 *
 * Search and detail personalise for a signed-in user but work without one, so
 * both are `auth: "optional"`. The OpenAPI schema marks them secured — the
 * optional-user dependency still declares the scheme — and a client that
 * believed it would refuse to show a signed-out visitor anything at all.
 */

export interface VenueSearchQuery {
  query?: string;
  venue_type?: VenueType;
  district_id?: number;
  guest_count?: number;
  min_rating?: number;
  requires_deposit?: boolean;
  only_open_now?: boolean;
  /** `rating` | `distance` | `price` — the backend's own default is `rating`. */
  sort?: string;
  limit?: number;
  offset?: number;
  /** Both or neither: one alone is a 422. */
  lat?: number;
  lng?: number;
  radius_m?: number;
}

export const venueKeys = {
  search: (params: VenueSearchQuery) => ["venues", "search", params] as const,
  detail: (venueId: number) => ["venues", venueId] as const,
  menu: (venueId: number) => ["venues", venueId, "menu"] as const,
  reviews: (venueId: number) => ["venues", venueId, "reviews"] as const,
  zones: (venueId: number) => ["venues", venueId, "zones"] as const,
  freeTables: (venueId: number, date: string, start: string, end: string, minSeats: number) =>
    ["venues", venueId, "tables", { date, start, end, minSeats }] as const,
};

/**
 * `VenueSearchParams` is declared in OpenAPI as a single object-typed query
 * parameter with no `style: deepObject`, because FastAPI renders
 * `Annotated[Model, Query()]` that way. At runtime it flattens the model and
 * reads each field as its own parameter, so a client that trusted the schema
 * would send `?params={...}` and get a 422. Hence the hand-written mapping.
 *
 * `lat`/`lng` are separate parameters from the model's own `latitude`/
 * `longitude`, and the route overwrites the latter from the former — so only
 * `lat`/`lng` have any effect.
 */
export function searchVenues(
  params: VenueSearchQuery,
  signal?: AbortSignal,
): Promise<Page<Venue>> {
  return apiFetch<Page<Venue>>("/v1/venues/search", {
    auth: "optional",
    signal,
    query: { ...params },
  });
}

export function getVenue(venueId: number, signal?: AbortSignal): Promise<VenueDetail> {
  return apiFetch<VenueDetail>(`/v1/venues/${venueId}`, { auth: "optional", signal });
}

export function listVenueMenu(
  venueId: number,
  categoryId?: number,
  signal?: AbortSignal,
): Promise<MenuItem[]> {
  return apiFetch<MenuItem[]>(`/v1/venues/${venueId}/menu`, {
    auth: "none",
    signal,
    query: { category_id: categoryId },
  });
}

export function listVenueReviews(
  venueId: number,
  limit = 20,
  offset = 0,
  signal?: AbortSignal,
): Promise<Page<Review>> {
  return apiFetch<Page<Review>>(`/v1/venues/${venueId}/reviews`, {
    auth: "none",
    signal,
    query: { limit, offset },
  });
}

export function listVenueZones(venueId: number, signal?: AbortSignal): Promise<VenueZone[]> {
  return apiFetch<VenueZone[]>(`/v1/venues/${venueId}/zones`, { auth: "none", signal });
}

/** Tables with no overlapping booking in the window. Restaurants only. */
export function listFreeTables(
  venueId: number,
  bookingDate: string,
  startTime: string,
  endTime: string,
  minSeats = 1,
  signal?: AbortSignal,
): Promise<AvailableTable[]> {
  return apiFetch<AvailableTable[]>(`/v1/venues/${venueId}/tables`, {
    auth: "none",
    signal,
    query: {
      booking_date: bookingDate,
      start_time: startTime,
      end_time: endTime,
      min_seats: minSeats,
    },
  });
}
