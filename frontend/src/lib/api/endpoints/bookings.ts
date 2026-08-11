import { apiFetch } from "../client";
import type {
  Booking,
  BookingDetail,
  BookingListItem,
  BookingStatus,
  MenuItem,
} from "../types";

/**
 * The customer's own bookings.
 *
 * Every route here needs a token — a booking belongs to somebody by definition.
 */

export const bookingKeys = {
  mine: (statuses?: BookingStatus[]) => ["bookings", "mine", statuses ?? null] as const,
  detail: (bookingId: number) => ["bookings", bookingId] as const,
};

export interface BookingItemInput {
  menu_item_id: number;
  variant_id?: number | null;
  quantity: number;
}

export interface TableReservationInput {
  venue_id: number;
  table_id: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  guests_count: number;
  contact_name: string;
  contact_phone: string;
  note?: string | null;
  items?: BookingItemInput[];
}

export interface HallEventInput {
  venue_id: number;
  booking_date: string;
  start_time: string;
  end_time: string;
  guests_count: number;
  contact_name: string;
  contact_phone: string;
  note?: string | null;
  /** The chain-level services to include — dasturxon, raqqoslar and the rest. */
  venue_service_ids?: number[];
}

export function listMyBookings(
  statuses?: BookingStatus[],
  signal?: AbortSignal,
): Promise<BookingListItem[]> {
  return apiFetch<BookingListItem[]>("/v1/bookings", {
    auth: "required",
    signal,
    query: { statuses },
  });
}

export function getBooking(bookingId: number, signal?: AbortSignal): Promise<BookingDetail> {
  return apiFetch<BookingDetail>(`/v1/bookings/${bookingId}`, { auth: "required", signal });
}

/** Restaurants. The table has to be free for the window — check first. */
export function createTableReservation(input: TableReservationInput): Promise<BookingDetail> {
  return apiFetch<BookingDetail>("/v1/bookings/table", {
    method: "POST",
    auth: "required",
    body: input,
  });
}

/**
 * To'yxona. No guest-tier field: the backend picks the tier from `guests_count`
 * itself, so a client that offered a tier picker would be guessing at the price.
 */
export function createHallEvent(input: HallEventInput): Promise<BookingDetail> {
  return apiFetch<BookingDetail>("/v1/bookings/hall", {
    method: "POST",
    auth: "required",
    body: input,
  });
}

export function cancelBooking(bookingId: number, reason?: string): Promise<Booking> {
  return apiFetch<Booking>(`/v1/bookings/${bookingId}/cancel`, {
    method: "POST",
    auth: "required",
    body: { reason: reason ?? null },
  });
}

/** Turn a `{itemId: qty}` cart into the request shape, dropping zeroed rows. */
export function toBookingItems(
  cart: Record<number, number>,
  menu: MenuItem[],
): BookingItemInput[] {
  return Object.entries(cart)
    .filter(([, quantity]) => quantity > 0)
    .filter(([itemId]) => menu.some((item) => item.id === Number(itemId)))
    .map(([itemId, quantity]) => ({ menu_item_id: Number(itemId), quantity }));
}
