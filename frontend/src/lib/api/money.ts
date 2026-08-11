/**
 * Money arrives as a string, and it has to stay one until it is displayed.
 *
 * Pydantic serialises every `Decimal` to a JSON string — `base_price`,
 * `rating_avg`, menu prices, booking totals. That is deliberate: a wedding hall
 * costs tens of millions of so'm, and JSON numbers are IEEE doubles. Calling
 * `toFixed` on a raw value, or letting one through `Number()` and back, is how
 * a price gains a rounding error nobody can explain.
 *
 * Coordinates are strings for the same reason. `distance_m` is a real number.
 */

/** A price as a number, for arithmetic only — never for display. */
export function parseMoney(value: string | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

const uzs = new Intl.NumberFormat("uz-UZ", { maximumFractionDigits: 0 });

/** `"45000000.00"` becomes `"45 000 000 so'm"`. */
export function formatUZS(value: string | number | null | undefined): string {
  const amount = typeof value === "number" ? value : parseMoney(value);
  return `${uzs.format(Math.round(amount))} so'm`;
}

/** `"4.5"` becomes `"4.5"`, `"5.0"` becomes `"5"`. Ratings are one decimal. */
export function formatRating(value: string | null | undefined): string {
  const rating = parseMoney(value);
  return rating % 1 === 0 ? String(rating) : rating.toFixed(1);
}

/** A `Numeric(9, 6)` coordinate, for map maths. */
export function parseCoordinate(value: string): number {
  return Number(value);
}
