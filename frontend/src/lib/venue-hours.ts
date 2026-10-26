import type { VenueWorkingHoursRead } from "@/lib/api/types";
import { parseApiDate, toApiDate } from "@/lib/format";

/** Monday-first, matching `venue_working_hours.weekday`. */
export function weekdayOf(isoDate: string): number {
  return (parseApiDate(isoDate).getDay() + 6) % 7;
}

/**
 * Whole hours a booking of `durationHours` fits into on that weekday, as
 * `"HH:00"`. Empty when the venue is closed that day or has no hours.
 */
export function slotsFor(
  hours: VenueWorkingHoursRead[],
  weekday: number,
  durationHours = 2,
): string[] {
  const day = hours.find((h) => h.weekday === weekday);
  if (!day || day.is_closed || !day.opens_at || !day.closes_at) return [];
  const open = Number(day.opens_at.slice(0, 2)) + (day.opens_at.slice(3, 5) === "00" ? 0 : 1);
  let close = Number(day.closes_at.slice(0, 2));
  // Closing at or before opening runs past midnight (10:00-02:00, or 00:00-00:00
  // for round the clock). A booking still has to end the same day — the API
  // takes an end after its start — so the last end is 23:00.
  if (day.closes_at.slice(0, 5) <= day.opens_at.slice(0, 5)) close += 24;
  const lastEnd = Math.min(close, 23);
  const slots: string[] = [];
  for (let hour = open; hour + durationHours <= lastEnd; hour++) {
    slots.push(`${String(hour).padStart(2, "0")}:00`);
  }
  return slots;
}

/** The bookable days: `count` consecutive dates starting `leadDays` from today. */
export function upcomingDates(leadDays: number, count = 7, from: Date = new Date()): string[] {
  return Array.from({ length: count }, (_, offset) => {
    const date = new Date(from);
    date.setDate(from.getDate() + leadDays + offset);
    return toApiDate(date);
  });
}

/** `"19:00"` plus two hours, as `"21:00"`. */
export function addHours(time: string, hours: number): string {
  const [h, m] = time.split(":").map(Number);
  return `${String((h + hours) % 24).padStart(2, "0")}:${String(m || 0).padStart(2, "0")}`;
}
