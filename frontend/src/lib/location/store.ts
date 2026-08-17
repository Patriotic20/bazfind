import { findNearestDistrict } from "@/lib/api/endpoints/geo";

/**
 * Where the customer is, in one place.
 *
 * Two screens ask the question — the home screen, which sorts venues by how far
 * they are, and the feed, which lets a person pick a district by hand — and they
 * have to agree. Before this the feed wrote a display string into
 * `localStorage.feedLocation` that nothing else could read, so a district chosen
 * there changed a label and nothing more.
 *
 * The whole of it lives outside React, including the "still looking" status.
 * That is what keeps two mounted screens from each running their own detection
 * and disagreeing about the result, and it means the hook that reads this has no
 * state of its own to set.
 */

const STORAGE_KEY = "bazmly.location";

/** Remembered separately: a refusal must not be re-asked on every navigation. */
const REFUSAL_KEY = "bazmly.location.refused";

/**
 * Past this, the nearest district centre is not the district you are standing
 * in. Uzbekistan's largest districts are wide, so the bound is generous — it is
 * here to reject a phone in another country, not to second-guess a rural fix.
 */
const MAX_PLAUSIBLE_DISTANCE_M = 150_000;

const GEOLOCATION_TIMEOUT_MS = 10_000;

/** A fix from the last five minutes is close enough; it saves waking the GPS. */
const ACCEPTABLE_AGE_MS = 5 * 60 * 1000;

export interface ChosenLocation {
  districtId: number;
  districtName: string;
  regionId: number;
  regionName: string;
  /** Where the person actually is. Null when the district was picked by hand. */
  latitude: number | null;
  longitude: number | null;
  /** `gps` was measured; `manual` was chosen from a list. */
  source: "gps" | "manual";
}

export type LocationStatus =
  | "unknown"
  | "locating"
  | "ready"
  | "refused"
  | "unsupported"
  | "unavailable"
  | "out-of-country";

export interface LocationSnapshot {
  location: ChosenLocation | null;
  status: LocationStatus;
}

/** The two fields a place is identified by — `Region` and `District` both fit. */
export interface NamedPlace {
  id: number;
  name: string;
}

const EMPTY: LocationSnapshot = { location: null, status: "unknown" };

// `useSyncExternalStore` compares snapshots by identity and re-reads on every
// render, so this has to be one cached object that changes only when something
// really changed. Building it fresh per call is an infinite render loop.
let snapshot: LocationSnapshot = EMPTY;
let loaded = false;
let detecting = false;
const listeners = new Set<() => void>();

function isLocation(value: unknown): value is ChosenLocation {
  if (typeof value !== "object" || value === null) return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.districtId === "number" &&
    typeof candidate.districtName === "string" &&
    typeof candidate.regionId === "number" &&
    typeof candidate.regionName === "string"
  );
}

function load(): void {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    // A shape check, not a cast: the key survives deploys, and a stored value
    // from an older shape would otherwise reach render as a valid object.
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (isLocation(parsed)) snapshot = { location: parsed, status: "ready" };
  } catch {
    snapshot = EMPTY;
  }
}

function publish(next: LocationSnapshot): void {
  snapshot = next;
  for (const listener of listeners) listener();
}

function readFlag(key: string): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function writeFlag(key: string, value: boolean): void {
  try {
    if (value) window.localStorage.setItem(key, "1");
    else window.localStorage.removeItem(key);
  } catch {
    // Losing the flag costs one extra prompt, not the session.
  }
}

export function subscribe(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getSnapshot(): LocationSnapshot {
  load();
  return snapshot;
}

/** The server renders without a browser, so it renders without a location. */
export function getServerSnapshot(): LocationSnapshot {
  return EMPTY;
}

function remember(location: ChosenLocation): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(location));
  } catch {
    // A full or blocked storage costs persistence, not the current session.
  }
  publish({ location, status: "ready" });
}

/**
 * Ask the browser where we are, and turn that into a district.
 *
 * Best-effort throughout: a refusal, a browser without the API, a phone that
 * cannot get a fix, and a coordinate from outside the country all end in the
 * same place — no location, and the district list still there to pick from.
 *
 * Re-entrant calls while a fix is in flight are dropped rather than queued; two
 * screens mounting at once must not raise two permission prompts.
 */
export function detect(): void {
  load();
  if (detecting) return;

  if (typeof navigator === "undefined" || !navigator.geolocation) {
    publish({ location: snapshot.location, status: "unsupported" });
    return;
  }

  detecting = true;
  publish({ location: snapshot.location, status: "locating" });

  navigator.geolocation.getCurrentPosition(
    (position) => {
      const { latitude, longitude } = position.coords;
      findNearestDistrict(latitude, longitude)
        .then((nearest) => {
          if (nearest.distance_m > MAX_PLAUSIBLE_DISTANCE_M) {
            // Somewhere real, but not somewhere this app has venues. Naming the
            // nearest tuman anyway would be a confident wrong answer.
            publish({ location: snapshot.location, status: "out-of-country" });
            return;
          }
          writeFlag(REFUSAL_KEY, false);
          remember({
            districtId: nearest.district_id,
            districtName: nearest.district_name,
            regionId: nearest.region_id,
            regionName: nearest.region_name,
            latitude,
            longitude,
            source: "gps",
          });
        })
        .catch(() => publish({ location: snapshot.location, status: "unavailable" }))
        .finally(() => {
          detecting = false;
        });
    },
    (error) => {
      detecting = false;
      if (error.code === error.PERMISSION_DENIED) {
        writeFlag(REFUSAL_KEY, true);
        publish({ location: snapshot.location, status: "refused" });
        return;
      }
      publish({ location: snapshot.location, status: "unavailable" });
    },
    {
      enableHighAccuracy: false,
      timeout: GEOLOCATION_TIMEOUT_MS,
      maximumAge: ACCEPTABLE_AGE_MS,
    },
  );
}

/** Detect only if we do not already know, and only if we were not refused. */
export function detectOnce(): void {
  load();
  if (snapshot.location || readFlag(REFUSAL_KEY)) return;
  detect();
}

export function choose(region: NamedPlace, district: NamedPlace): void {
  load();
  remember({
    districtId: district.id,
    districtName: district.name,
    regionId: region.id,
    regionName: region.name,
    // A picked district is a filter, not a position: sorting venues by their
    // distance from the centre of a tuman would be a made-up ordering.
    latitude: null,
    longitude: null,
    source: "manual",
  });
}

export function forget(): void {
  load();
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // As above.
  }
  publish(EMPTY);
}
