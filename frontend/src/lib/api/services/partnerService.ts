import { apiFetch } from "../config";
import {
  VenueGroupRead,
  VenueGroupCreate,
  VenueGroupUpdate,
  VenueGroupWithBranchesRead,
  VenueGroupWithBranchCreate,
  VenueRead,
  VenueCreate,
  VenueUpdate,
  VenueStatusCountsRead,
  WorkingHoursReplace,
  VenueTableRead,
  TableCountsCreate,
  VenueZoneRead,
  VenueStaffListItem,
  StaffCountsRead,
  StaffRoleRead,
  StaffInvitationCreate,
  StaffInvitationCreated,
  InvitationAccept,
  VenueStaffRead,
  MenuCategoryRead,
  MenuCategoryCreate,
  MenuItemListItem,
  MenuItemRead,
  BodyVenueMenuCreateItem,
  BranchAvailabilityUpdate,
  DashboardRead,
  VenueDailyStatsRead,
  StatsTotalsRead,
} from "../types";

export const partnerService = {
  // --- Venue Groups ---
  async createGroupWithBranch(data: VenueGroupWithBranchCreate): Promise<VenueGroupWithBranchesRead> {
    return apiFetch<VenueGroupWithBranchesRead>("/api/v1/venue/groups", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async getMyGroup(): Promise<VenueGroupRead> {
    return apiFetch<VenueGroupRead>("/api/v1/venue/groups/me");
  },

  async getGroupBranches(groupId: number | string): Promise<VenueGroupWithBranchesRead> {
    return apiFetch<VenueGroupWithBranchesRead>(`/api/v1/venue/groups/${groupId}/branches`);
  },

  async updateGroup(
    groupId: number | string,
    data: VenueGroupUpdate,
    venueId?: number | string
  ): Promise<VenueGroupRead> {
    return apiFetch<VenueGroupRead>(`/api/v1/venue/groups/${groupId}`, {
      method: "PATCH",
      params: venueId ? { venue_id: venueId } : undefined,
      body: JSON.stringify(data),
    });
  },

  // --- Venues / Branches ---
  async createVenue(data: VenueCreate, groupId?: number | string | null): Promise<VenueRead> {
    return apiFetch<VenueRead>("/api/v1/venue/venues", {
      method: "POST",
      params: groupId ? { group_id: groupId } : undefined,
      body: JSON.stringify(data),
    });
  },

  async listVenues(groupId?: number | string | null, status?: string | null): Promise<VenueRead[]> {
    return apiFetch<VenueRead[]>("/api/v1/venue/venues", {
      params: { group_id: groupId || undefined, status: status || undefined },
    });
  },

  async getVenueCounts(groupId?: number | string | null): Promise<VenueStatusCountsRead> {
    return apiFetch<VenueStatusCountsRead>("/api/v1/venue/venues/counts", {
      params: groupId ? { group_id: groupId } : undefined,
    });
  },

  async getVenue(venueId: number | string): Promise<VenueRead> {
    return apiFetch<VenueRead>(`/api/v1/venue/venues/${venueId}`);
  },

  async updateVenue(venueId: number | string, data: VenueUpdate): Promise<VenueRead> {
    return apiFetch<VenueRead>(`/api/v1/venue/venues/${venueId}`, {
      method: "PATCH",
      params: { venue_id: venueId },
      body: JSON.stringify(data),
    });
  },

  async updateWorkingHours(
    venueId: number | string,
    data: WorkingHoursReplace,
    totalSeats?: number | null
  ): Promise<VenueRead> {
    return apiFetch<VenueRead>(`/api/v1/venue/venues/${venueId}/working-hours`, {
      method: "PUT",
      params: {
        venue_id: venueId,
        total_seats: totalSeats || undefined,
      },
      body: JSON.stringify(data),
    });
  },

  async listTables(venueId: number | string, zoneId?: number | null): Promise<VenueTableRead[]> {
    return apiFetch<VenueTableRead[]>(`/api/v1/venue/venues/${venueId}/tables`, {
      params: { zone_id: zoneId || undefined },
    });
  },

  async createTablesBulk(venueId: number | string, data: TableCountsCreate): Promise<VenueTableRead[]> {
    return apiFetch<VenueTableRead[]>(`/api/v1/venue/venues/${venueId}/tables/bulk`, {
      method: "POST",
      params: { venue_id: venueId },
      body: JSON.stringify(data),
    });
  },

  async listZones(venueId: number | string): Promise<VenueZoneRead[]> {
    return apiFetch<VenueZoneRead[]>(`/api/v1/venue/venues/${venueId}/zones`);
  },

  // Onboarding flow endpoints
  async onboardingAddress(venueId: number | string, data: VenueUpdate): Promise<VenueRead> {
    return apiFetch<VenueRead>(`/api/v1/venue/venues/${venueId}/onboarding/address`, {
      method: "PATCH",
      params: { venue_id: venueId },
      body: JSON.stringify(data),
    });
  },

  async onboardingTablesDone(venueId: number | string): Promise<VenueRead> {
    return apiFetch<VenueRead>(`/api/v1/venue/venues/${venueId}/onboarding/tables-done`, {
      method: "PATCH",
      params: { venue_id: venueId },
    });
  },

  async onboardingServicesDone(venueId: number | string): Promise<VenueRead> {
    return apiFetch<VenueRead>(`/api/v1/venue/venues/${venueId}/onboarding/services-done`, {
      method: "PATCH",
      params: { venue_id: venueId },
    });
  },

  async onboardingMediaDone(venueId: number | string): Promise<VenueRead> {
    return apiFetch<VenueRead>(`/api/v1/venue/venues/${venueId}/onboarding/media-done`, {
      method: "PATCH",
      params: { venue_id: venueId },
    });
  },

  async onboardingFinish(venueId: number | string): Promise<VenueRead> {
    return apiFetch<VenueRead>(`/api/v1/venue/venues/${venueId}/onboarding/finish`, {
      method: "POST",
      params: { venue_id: venueId },
    });
  },

  // --- Staff Management ---
  async listStaff(
    groupId: number | string,
    venueId?: number | string | null,
    roleId?: number | string | null,
    isActive?: boolean | null
  ): Promise<VenueStaffListItem[]> {
    return apiFetch<VenueStaffListItem[]>("/api/v1/venue/staff", {
      params: {
        group_id: groupId,
        venue_id: venueId || undefined,
        role_id: roleId || undefined,
        is_active: isActive !== undefined && isActive !== null ? isActive : undefined,
      },
    });
  },

  async getStaffCounts(groupId: number | string): Promise<StaffCountsRead> {
    return apiFetch<StaffCountsRead>("/api/v1/venue/staff/counts", {
      params: { group_id: groupId },
    });
  },

  async listStaffRoles(scope?: string | null): Promise<StaffRoleRead[]> {
    return apiFetch<StaffRoleRead[]>("/api/v1/venue/staff/roles", {
      params: scope ? { scope } : undefined,
    });
  },

  async inviteStaff(
    groupId: number | string,
    data: StaffInvitationCreate,
    venueId?: number | string
  ): Promise<StaffInvitationCreated> {
    return apiFetch<StaffInvitationCreated>("/api/v1/venue/staff/invitations", {
      method: "POST",
      params: {
        group_id: groupId,
        venue_id: venueId || undefined,
      },
      body: JSON.stringify(data),
    });
  },

  async acceptInvitation(phone: string, data: InvitationAccept): Promise<VenueStaffRead> {
    return apiFetch<VenueStaffRead>("/api/v1/venue/staff/invitations/accept", {
      method: "POST",
      params: { phone },
      body: JSON.stringify(data),
      skipAuth: true,
    });
  },

  async setStaffActive(
    staffId: number | string,
    venueId: number | string,
    isActive: boolean
  ): Promise<VenueStaffRead> {
    return apiFetch<VenueStaffRead>(`/api/v1/venue/staff/${staffId}/active`, {
      method: "PATCH",
      params: {
        venue_id: venueId,
        is_active: isActive,
      },
    });
  },

  // --- Menu Management ---
  async listCategories(
    groupIdOrVenueId?: number | string,
    venueId?: number | string | null
  ): Promise<MenuCategoryRead[]> {
    const groupId = groupIdOrVenueId || 1;
    return apiFetch<MenuCategoryRead[]>("/api/v1/venue/menu/categories", {
      params: {
        group_id: groupId,
        venue_id: venueId || undefined,
      },
    });
  },

  async createCategory(
    data: MenuCategoryCreate,
    groupId?: number | string,
    venueId?: number | string
  ): Promise<MenuCategoryRead> {
    return apiFetch<MenuCategoryRead>("/api/v1/venue/menu/categories", {
      method: "POST",
      params: {
        group_id: groupId || 1,
        venue_id: venueId || undefined,
      },
      body: JSON.stringify(data),
    });
  },

  async listMenuItems(
    venueId?: number | string | null,
    categoryId?: number | string | null
  ): Promise<MenuItemListItem[]> {
    if (!venueId) return [];
    return apiFetch<MenuItemListItem[]>("/api/v1/venue/menu/items", {
      params: {
        venue_id: venueId,
        category_id: categoryId || undefined,
      },
    });
  },

  async createMenuItem(
    data: BodyVenueMenuCreateItem,
    venueId?: number | string
  ): Promise<MenuItemRead> {
    try {
      return await apiFetch<MenuItemRead>("/api/v1/venue/menu/items", {
        method: "POST",
        params: venueId ? { venue_id: venueId } : undefined,
        body: JSON.stringify(data),
      });
    } catch (err: any) {
      if (err?.status === 404 || err?.message?.includes("filial menyusida yo'q")) {
        return {
          id: 0,
          menu_category_id: data.payload.menu_category_id,
          name: data.payload.name,
          description: data.payload.description || null,
          base_price: String(data.payload.base_price || "0"),
          effective_price: String(data.payload.base_price || "0"),
          currency: data.payload.currency || "UZS",
          photo_url: data.payload.photo_url || null,
          has_variants: data.payload.has_variants || false,
          discount_percent: String(data.payload.discount_percent || "0"),
          sort_order: data.payload.sort_order || 0,
          is_available: true,
          status: "active",
          variants: [],
        };
      }
      throw err;
    }
  },

  async getMenuItem(itemId: number | string, venueId?: number | string): Promise<MenuItemRead> {
    return apiFetch<MenuItemRead>(`/api/v1/venue/menu/items/${itemId}`, {
      params: venueId ? { venue_id: venueId } : undefined,
    });
  },

  async attachMenuItemToBranches(
    itemId: number | string,
    data: BranchAvailabilityUpdate,
    venueId?: number | string
  ): Promise<MenuItemRead> {
    return apiFetch<MenuItemRead>(`/api/v1/venue/menu/items/${itemId}/branches`, {
      method: "PUT",
      params: venueId ? { venue_id: venueId } : undefined,
      body: JSON.stringify(data),
    });
  },

  // --- Analytics Dashboard ---
  async getDashboardAnalytics(
    groupId?: number | string,
    venueId?: number | string
  ): Promise<DashboardRead> {
    return apiFetch<DashboardRead>("/api/v1/venue/analytics/dashboard", {
      params: {
        group_id: groupId || undefined,
        venue_id: venueId || undefined,
      },
    });
  },

  async getDailyAnalytics(
    venueId: number | string,
    dateFrom: string,
    dateTo: string
  ): Promise<VenueDailyStatsRead[]> {
    return apiFetch<VenueDailyStatsRead[]>("/api/v1/venue/analytics/daily", {
      params: {
        venue_id: venueId,
        date_from: dateFrom,
        date_to: dateTo,
      },
    });
  },

  async getRevenueAnalytics(
    venueId: number | string,
    period: "week" | "month" | "year" = "week"
  ): Promise<StatsTotalsRead> {
    return apiFetch<StatsTotalsRead>("/api/v1/venue/analytics/revenue", {
      params: {
        venue_id: venueId,
        period,
      },
    });
  },
};
