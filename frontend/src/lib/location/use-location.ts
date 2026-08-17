"use client";

import { useEffect, useSyncExternalStore } from "react";

import {
  choose,
  detect,
  detectOnce,
  forget,
  getServerSnapshot,
  getSnapshot,
  subscribe,
  type ChosenLocation,
  type LocationStatus,
  type NamedPlace,
} from "@/lib/location/store";

/**
 * Finding the customer without asking them.
 *
 * On the first visit the app asks the browser for a position and turns it into a
 * district, so the home screen opens on what is actually nearby instead of on
 * whatever ranked highest nationally. Pass `auto` on the screen that should do
 * the asking; everywhere else just reads the answer.
 *
 * The permission prompt is asked once. A refusal is remembered, because asking
 * again on every navigation is how an app teaches people to refuse for good.
 *
 * All the state lives in the store, so this hook sets none of its own — the
 * effect below starts an external operation rather than scheduling a render.
 */
export interface UseLocation {
  location: ChosenLocation | null;
  status: LocationStatus;
  /** Ask the browser where we are. Safe to call again after a refusal. */
  detect: () => void;
  /** Take the district the customer picked by hand. */
  choose: (region: NamedPlace, district: NamedPlace) => void;
  forget: () => void;
}

export function useLocation({ auto = false } = {}): UseLocation {
  const { location, status } = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (auto) detectOnce();
  }, [auto]);

  return { location, status, detect, choose, forget };
}
