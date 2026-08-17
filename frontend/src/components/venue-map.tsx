"use client";

import { useEffect, useRef } from "react";
import type { Map as LeafletMap } from "leaflet";

import { parseCoordinate } from "@/lib/api/money";

/**
 * Where a venue actually is.
 *
 * Leaflet over OpenStreetMap, chosen for what it does *not* need: no API key,
 * no billing account, no per-load quota — nothing that can expire and take the
 * map down with it. Swapping the tile URL is all it takes to move to another
 * provider later.
 *
 * Loaded on the client only. Leaflet reaches for `window` on import, so it
 * cannot be part of a server render — hence the dynamic import in the effect
 * rather than a top-level one.
 */

const TILES = "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";
const ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>';

// Close enough to read street names, wide enough to show the neighbourhood.
const ZOOM = 16;

interface VenueMapProps {
  /** Numeric(9,6) from the API — a string, like every decimal it sends. */
  latitude: string;
  longitude: string;
  name: string;
  className?: string;
}

export function VenueMap({ latitude, longitude, name, className }: VenueMapProps) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);

  useEffect(() => {
    const node = container.current;
    if (!node || map.current) return;

    let cancelled = false;

    void (async () => {
      const L = await import("leaflet");
      // Leaflet's CSS ships with the package; without it the tiles stack in a
      // column instead of forming a map.
      await import("leaflet/dist/leaflet.css");
      if (cancelled || !container.current) return;

      const position: [number, number] = [parseCoordinate(latitude), parseCoordinate(longitude)];

      const instance = L.map(node, {
        center: position,
        zoom: ZOOM,
        // A map inside a scrolling page: wheel-zoom would hijack the scroll,
        // and on a phone one-finger drag has to keep scrolling the page.
        scrollWheelZoom: false,
        dragging: !L.Browser.mobile,
        attributionControl: true,
      });

      L.tileLayer(TILES, { attribution: ATTRIBUTION, maxZoom: 19 }).addTo(instance);

      // The default marker icon resolves its images relative to the CSS, which
      // a bundler rewrites — a divIcon avoids the broken-image problem entirely.
      L.marker(position, {
        icon: L.divIcon({
          className: "",
          html:
            '<div style="width:18px;height:18px;border-radius:9999px;background:#FF6B00;' +
            'border:3px solid #fff;box-shadow:0 0 0 1px rgba(0,0,0,.25)"></div>',
          iconSize: [18, 18],
          iconAnchor: [9, 9],
        }),
        title: name,
      }).addTo(instance);

      map.current = instance;
    })();

    return () => {
      cancelled = true;
      map.current?.remove();
      map.current = null;
    };
  }, [latitude, longitude, name]);

  return (
    <div
      ref={container}
      className={className ?? "h-48 w-full overflow-hidden rounded-2xl"}
      // Leaflet measures its container, so it needs a height before it draws.
      style={{ minHeight: "12rem" }}
    />
  );
}
