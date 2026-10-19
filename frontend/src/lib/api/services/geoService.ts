import { apiFetch } from "../config";
import {
  RegionRead,
  RegionCreate,
  RegionUpdate,
  DistrictRead,
  DistrictCreate,
  DistrictUpdate,
  NearestDistrictRead,
} from "../types";

export const geoService = {
  // Regions
  async getRegions(): Promise<RegionRead[]> {
    return apiFetch<RegionRead[]>("/api/v1/regions", { skipAuth: true });
  },

  async createRegion(data: RegionCreate): Promise<RegionRead> {
    return apiFetch<RegionRead>("/api/v1/regions", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateRegion(regionId: number, data: RegionUpdate): Promise<RegionRead> {
    return apiFetch<RegionRead>(`/api/v1/regions/${regionId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteRegion(regionId: number): Promise<void> {
    return apiFetch<void>(`/api/v1/regions/${regionId}`, {
      method: "DELETE",
    });
  },

  // Districts
  async getDistricts(regionId: number): Promise<DistrictRead[]> {
    return apiFetch<DistrictRead[]>(`/api/v1/regions/${regionId}/districts`, { skipAuth: true });
  },

  async getNearestDistrict(lat: number, lng: number): Promise<NearestDistrictRead> {
    return apiFetch<NearestDistrictRead>("/api/v1/districts/nearest", {
      params: { lat, lng },
      skipAuth: true,
    });
  },

  async createDistrict(data: DistrictCreate): Promise<DistrictRead> {
    return apiFetch<DistrictRead>("/api/v1/districts", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async updateDistrict(districtId: number, data: DistrictUpdate): Promise<DistrictRead> {
    return apiFetch<DistrictRead>(`/api/v1/districts/${districtId}`, {
      method: "PATCH",
      body: JSON.stringify(data),
    });
  },

  async deleteDistrict(districtId: number): Promise<void> {
    return apiFetch<void>(`/api/v1/districts/${districtId}`, {
      method: "DELETE",
    });
  },
};
