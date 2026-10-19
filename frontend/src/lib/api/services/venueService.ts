import { apiFetch } from "../config";
import {
  VenueDetailRead,
  VenueListItem,
  VenueSearchParams,
  Page,
  BlockedDatesRead,
  AvailableTableRead,
  VenueZoneRead,
  MenuItemListItem,
  VenueServiceRead,
  ReviewListItem,
  ReviewAggregateRead,
  ReviewCreate,
  ReviewRead,
} from "../types";

export const venueService = {
  // Search & Filter venues
  async searchVenues(params?: VenueSearchParams): Promise<Page<VenueListItem>> {
    return apiFetch<Page<VenueListItem>>("/api/v1/venues/search", {
      params: params as Record<string, any>,
      skipAuth: true,
    });
  },

  // Venue details
  async getVenueDetail(venueId: number | string): Promise<VenueDetailRead> {
    return apiFetch<VenueDetailRead>(`/api/v1/venues/${venueId}`, { skipAuth: true });
  },

  // Blocked dates for wedding hall / event booking
  async getAvailability(
    venueId: number | string,
    dateFrom: string,
    dateTo: string
  ): Promise<BlockedDatesRead> {
    return apiFetch<BlockedDatesRead>(`/api/v1/venues/${venueId}/availability`, {
      params: { date_from: dateFrom, date_to: dateTo },
      skipAuth: true,
    });
  },

  // Free tables for restaurant booking
  async getFreeTables(
    venueId: number | string,
    bookingDate: string,
    startTime: string,
    endTime: string,
    minSeats: number = 1
  ): Promise<AvailableTableRead[]> {
    return apiFetch<AvailableTableRead[]>(`/api/v1/venues/${venueId}/tables`, {
      params: {
        booking_date: bookingDate,
        start_time: startTime,
        end_time: endTime,
        min_seats: minSeats,
      },
      skipAuth: true,
    });
  },

  // Venue Zones (Ichkari, Tashqari)
  async getZones(venueId: number | string): Promise<VenueZoneRead[]> {
    return apiFetch<VenueZoneRead[]>(`/api/v1/venues/${venueId}/zones`, { skipAuth: true });
  },

  // Venue Menu Items
  async getMenu(
    venueId: number | string,
    categoryId?: number | null
  ): Promise<MenuItemListItem[]> {
    return apiFetch<MenuItemListItem[]>(`/api/v1/venues/${venueId}/menu`, {
      params: categoryId ? { category_id: categoryId } : undefined,
      skipAuth: true,
    });
  },

  // Venue Additional Services
  async getServices(
    venueId: number | string,
    groupId: number | string
  ): Promise<VenueServiceRead[]> {
    return apiFetch<VenueServiceRead[]>(`/api/v1/venues/${venueId}/services`, {
      params: { group_id: groupId },
      skipAuth: true,
    });
  },

  // Venue Reviews
  async getReviews(
    venueId: number | string,
    limit: number = 20,
    offset: number = 0
  ): Promise<Page<ReviewListItem>> {
    return apiFetch<Page<ReviewListItem>>(`/api/v1/venues/${venueId}/reviews`, {
      params: { limit, offset },
      skipAuth: true,
    });
  },

  // Review aggregate
  async getReviewAggregate(venueId: number | string): Promise<ReviewAggregateRead> {
    return apiFetch<ReviewAggregateRead>(`/api/v1/reviews/venue/${venueId}/aggregate`, {
      skipAuth: true,
    });
  },

  // Create review for completed booking
  async createReview(data: ReviewCreate): Promise<ReviewRead> {
    return apiFetch<ReviewRead>("/api/v1/reviews", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
