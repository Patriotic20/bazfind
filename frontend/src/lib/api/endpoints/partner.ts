import { apiFetch } from "../client";
import type { components } from "../schema";
import type {
  Booking,
  BookingStatus,
  Branch,
  Dashboard,
  StaffMember,
  StaffRole,
  VenueGroup,
} from "../types";

/**
 * The partner's half of the API — everything under `/v1/venue/...`.
 *
 * Every route needs a token, and the backend checks the caller's employment row
 * (`venue_staff`) on each request rather than a claim in the token, so a role
 * change takes effect immediately. Which chain a request concerns is the same
 * fact, so no `group_id` travels — the server derives it from the token.
 */

export const partnerKeys = {
  branches: () => ["partner", "branches"] as const,
  dashboard: (venueId: number) => ["partner", "dashboard", venueId] as const,
  dayBookings: (venueId: number, day: string) => ["partner", "bookings", venueId, day] as const,
  staff: () => ["partner", "staff"] as const,
  staffCounts: () => ["partner", "staff-counts"] as const,
  roles: () => ["partner", "staff-roles"] as const,
};

export interface GroupWithBranches {
  group: VenueGroup;
  branches: Branch[];
}

export function getMyBranches(signal?: AbortSignal): Promise<GroupWithBranches> {
  return apiFetch<GroupWithBranches>("/v1/venue/groups/me/branches", {
    auth: "required",
    signal,
  });
}

export function getDashboard(venueId: number, signal?: AbortSignal): Promise<Dashboard> {
  return apiFetch<Dashboard>("/v1/venue/analytics/dashboard", {
    auth: "required",
    signal,
    query: { venue_id: venueId },
  });
}

/** One branch, one day — the queue the staff works through. */
export function listDayBookings(
  venueId: number,
  day: string,
  statuses?: BookingStatus[],
  signal?: AbortSignal,
): Promise<Booking[]> {
  return apiFetch<Booking[]>("/v1/venue/bookings", {
    auth: "required",
    signal,
    query: { venue_id: venueId, day, statuses },
  });
}

export function confirmBooking(bookingId: number, venueId: number): Promise<Booking> {
  return apiFetch<Booking>(`/v1/venue/bookings/${bookingId}/confirm`, {
    method: "POST",
    auth: "required",
    query: { venue_id: venueId },
  });
}

export function rejectBooking(
  bookingId: number,
  venueId: number,
  reason?: string,
): Promise<Booking> {
  return apiFetch<Booking>(`/v1/venue/bookings/${bookingId}/reject`, {
    method: "POST",
    auth: "required",
    query: { venue_id: venueId },
    body: { reason: reason ?? null },
  });
}

export function listStaff(signal?: AbortSignal): Promise<StaffMember[]> {
  return apiFetch<StaffMember[]>("/v1/venue/staff", { auth: "required", signal });
}

export type StaffCounts = components["schemas"]["StaffCountsRead"];

export function getStaffCounts(signal?: AbortSignal): Promise<StaffCounts> {
  return apiFetch<StaffCounts>("/v1/venue/staff/counts", { auth: "required", signal });
}

export function listStaffRoles(signal?: AbortSignal): Promise<StaffRole[]> {
  return apiFetch<StaffRole[]>("/v1/venue/staff/roles", { auth: "required", signal });
}

export type StaffInvitationInput = components["schemas"]["StaffInvitationCreate"];
export type StaffInvitationCreated = components["schemas"]["StaffInvitationCreated"];

/**
 * The login and temporary password exist only in this response — the owner
 * hands them to the person directly. Nothing re-reads them later.
 *
 * The optional `venue_id` in the body is the branch the new person is assigned
 * to; a venue-scoped role (waiter, chef) requires one.
 */
export function inviteStaff(input: StaffInvitationInput): Promise<StaffInvitationCreated> {
  return apiFetch<StaffInvitationCreated>("/v1/venue/staff/invitations", {
    method: "POST",
    auth: "required",
    body: input,
  });
}

export type VenueStaff = components["schemas"]["VenueStaffRead"];

export function setStaffActive(
  staffId: number,
  venueId: number,
  isActive: boolean,
): Promise<VenueStaff> {
  return apiFetch<VenueStaff>(`/v1/venue/staff/${staffId}/active`, {
    method: "PATCH",
    auth: "required",
    query: { venue_id: venueId, is_active: isActive },
  });
}
