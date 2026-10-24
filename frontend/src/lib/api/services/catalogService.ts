import { apiFetch } from "../config";
import {
  AmenityRead,
  ServiceCatalogRead,
  VenueServiceRead,
  VenueServiceCreate,
  VenueTypeSlug,
} from "../types";

export const catalogService = {
  // Amenities
  async getAmenities(): Promise<AmenityRead[]> {
    return apiFetch<AmenityRead[]>("/api/v1/amenities", { skipAuth: true });
  },

  // Service Catalog
  async getServiceCatalog(venueType?: VenueTypeSlug): Promise<ServiceCatalogRead[]> {
    return apiFetch<ServiceCatalogRead[]>("/api/v1/service-catalog", {
      skipAuth: true,
      params: venueType ? { venue_type: venueType } : undefined,
    });
  },

  // Venue Services Pricing
  /** Both ids are required by the API: the permission is checked at the branch. */
  async createVenueService(
    data: VenueServiceCreate,
    venueId: number | string,
    groupId: number | string
  ): Promise<VenueServiceRead> {
    return apiFetch<VenueServiceRead>("/api/v1/venue/services", {
      method: "POST",
      params: { venue_id: venueId, group_id: groupId },
      body: JSON.stringify(data),
    });
  },
};
