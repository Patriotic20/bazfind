import { apiFetch } from "../client";
import type { District, NearestDistrict, Region } from "../types";

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
  nearest: (lat: number, lng: number) => ["geo", "nearest", lat, lng] as const,
};

export function listRegions(signal?: AbortSignal): Promise<Region[]> {
  return apiFetch<Region[]>("/v1/regions", { auth: "none", signal });
}

export function listDistricts(regionId: number, signal?: AbortSignal): Promise<District[]> {
  return apiFetch<District[]>(`/v1/regions/${regionId}/districts`, { auth: "none", signal });
}

/**
 * The district a pair of coordinates falls in, with its region.
 *
 * Answers "where am I" from the figure the phone gives, so the customer never
 * has to work down two dropdowns to see what is near them. It always returns a
 * district — the nearest of the 209 — so `distance_m` is the part that matters:
 * a phone outside the country resolves to something hundreds of kilometres away,
 * and the caller is expected to check before believing it.
 */
export function findNearestDistrict(
  latitude: number,
  longitude: number,
  signal?: AbortSignal,
): Promise<NearestDistrict> {
  return apiFetch<NearestDistrict>("/v1/districts/nearest", {
    auth: "none",
    signal,
    query: { lat: latitude, lng: longitude },
  });
}
