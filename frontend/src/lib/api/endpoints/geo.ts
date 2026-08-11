import { apiFetch } from "../client";
import type { District, Region } from "../types";

/**
 * Regions and districts.
 *
 * Both reads are public — a customer picks a location before signing in, and
 * before an account exists at all.
 *
 * These are reference data, seeded by a migration: 14 first-level units and the
 * 209 districts under them. They change roughly never, which is why the cache
 * times below are hours rather than seconds.
 */

export const geoKeys = {
  regions: () => ["geo", "regions"] as const,
  districts: (regionId: number) => ["geo", "regions", regionId, "districts"] as const,
};

export function listRegions(signal?: AbortSignal): Promise<Region[]> {
  return apiFetch<Region[]>("/v1/regions", { auth: "none", signal });
}

export function listDistricts(regionId: number, signal?: AbortSignal): Promise<District[]> {
  return apiFetch<District[]>(`/v1/regions/${regionId}/districts`, { auth: "none", signal });
}
