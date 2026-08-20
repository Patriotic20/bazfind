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
 * change takes effect immediately.
 */

export const partnerKeys = {
  branches: (groupId: number) => ["partner", "branches", groupId] as const,
  dashboard: (groupId: number, venueId: number) =>
    ["partner", "dashboard", groupId, venueId] as const,
  dayBookings: (venueId: number, day: string) => ["partner", "bookings", venueId, day] as const,
  rangeBookings: (venueId: number, from: string, days: number) =>
    ["partner", "bookings-range", venueId, from, days] as const,
  staff: (groupId: number) => ["partner", "staff", groupId] as const,
  staffCounts: (groupId: number) => ["partner", "staff-counts", groupId] as const,
  roles: () => ["partner", "staff-roles"] as const,
  menuCategories: (groupId: number, venueId: number | null) =>
    ["partner", "menu-categories", groupId, venueId] as const,
  menuItems: (venueId: number, categoryId: number | null) =>
    ["partner", "menu-items", venueId, categoryId] as const,
};

export interface GroupWithBranches {
  group: VenueGroup;
  branches: Branch[];
}

export function getGroupWithBranches(
  groupId: number,
  signal?: AbortSignal,
): Promise<GroupWithBranches> {
  return apiFetch<GroupWithBranches>(`/v1/venue/groups/${groupId}/branches`, {
    auth: "required",
    signal,
  });
}

export function getDashboard(
  groupId: number,
  venueId: number,
  signal?: AbortSignal,
): Promise<Dashboard> {
  return apiFetch<Dashboard>("/v1/venue/analytics/dashboard", {
    auth: "required",
    signal,
    query: { group_id: groupId, venue_id: venueId },
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

export type VenueGroupWithBranchCreate = components["schemas"]["VenueGroupWithBranchCreate"];

/**
 * The chain, its first branch and the caller's owner row — one transaction.
 * One chain per owner: a second call answers 409 `group_already_exists`.
 */
export function createVenueGroup(input: VenueGroupWithBranchCreate): Promise<GroupWithBranches> {
  return apiFetch<GroupWithBranches>("/v1/venue/groups", {
    method: "POST",
    auth: "required",
    body: input,
  });
}

export type WorkingHoursInput = components["schemas"]["WorkingHoursCreate"];

/** All seven days rewritten at once, so a removed day cannot linger. */
export function replaceWorkingHours(
  venueId: number,
  days: WorkingHoursInput[],
): Promise<unknown> {
  return apiFetch<unknown>(`/v1/venue/venues/${venueId}/working-hours`, {
    method: "PUT",
    auth: "required",
    body: { days },
  });
}

export type MenuCategory = components["schemas"]["MenuCategoryRead"];
export type PartnerMenuItem = components["schemas"]["MenuItemListItem"];

/** Categories belong to the chain; the count next to each is computed live. */
export function listMenuCategories(
  groupId: number,
  venueId: number | null,
  signal?: AbortSignal,
): Promise<MenuCategory[]> {
  return apiFetch<MenuCategory[]>("/v1/venue/menu/categories", {
    auth: "required",
    signal,
    query: { group_id: groupId, venue_id: venueId ?? undefined },
  });
}

/** Only what this branch serves, priced with its own override when it has one. */
export function listMenuItems(
  venueId: number,
  categoryId: number | null,
  signal?: AbortSignal,
): Promise<PartnerMenuItem[]> {
  return apiFetch<PartnerMenuItem[]>("/v1/venue/menu/items", {
    auth: "required",
    signal,
    query: { venue_id: venueId, category_id: categoryId ?? undefined },
  });
}

export function listStaff(groupId: number, signal?: AbortSignal): Promise<StaffMember[]> {
  return apiFetch<StaffMember[]>("/v1/venue/staff", {
    auth: "required",
    signal,
    query: { group_id: groupId },
  });
}

export type StaffCounts = components["schemas"]["StaffCountsRead"];

export function getStaffCounts(groupId: number, signal?: AbortSignal): Promise<StaffCounts> {
  return apiFetch<StaffCounts>("/v1/venue/staff/counts", {
    auth: "required",
    signal,
    query: { group_id: groupId },
  });
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
 * `venueId` in the query is what the `staff.manage` permission is checked
 * against; the optional `venue_id` in the body is the branch the new person is
 * assigned to (null = the whole chain).
 */
export function inviteStaff(
  groupId: number,
  venueId: number,
  input: StaffInvitationInput,
): Promise<StaffInvitationCreated> {
  return apiFetch<StaffInvitationCreated>("/v1/venue/staff/invitations", {
    method: "POST",
    auth: "required",
    query: { group_id: groupId, venue_id: venueId },
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
