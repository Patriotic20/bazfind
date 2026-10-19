import { apiFetch } from "../config";
import {
  AmenityRead,
  ServiceCatalogRead,
  VenueServiceRead,
  VenueServiceCreate,
} from "../types";

export const catalogService = {
  // Amenities
  async getAmenities(): Promise<AmenityRead[]> {
    return apiFetch<AmenityRead[]>("/api/v1/amenities", { skipAuth: true });
  },

  // Service Catalog
  async getServiceCatalog(): Promise<ServiceCatalogRead[]> {
    return apiFetch<ServiceCatalogRead[]>("/api/v1/service-catalog", { skipAuth: true });
  },

  // Venue Services Pricing
  async createVenueService(data: VenueServiceCreate): Promise<VenueServiceRead> {
    return apiFetch<VenueServiceRead>("/api/v1/venue/services", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },
};
