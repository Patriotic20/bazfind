import type { VenueWorkingHoursRead } from "@/lib/api/types";
import { parseApiDate, toApiDate } from "@/lib/format";

/** Monday-first, matching `venue_working_hours.weekday`. */
export function weekdayOf(isoDate: string): number {
  return (parseApiDate(isoDate).getDay() + 6) % 7;
}

const toMinutes = (hhmm: string) => Number(hhmm.slice(0, 2)) * 60 + Number(hhmm.slice(3, 5));
const toHHMM = (minutes: number) =>
  `${String(Math.floor(minutes / 60) % 24).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;

/**
 * Every start time on that weekday, `stepMinutes` apart from opening, with
 * whether a booking of `durationHours` still fits before closing. Empty when the
 * venue is closed that day or has no hours.
 */
export function startTimes(
  hours: VenueWorkingHoursRead[],
  weekday: number,
  durationHours = 2,
  stepMinutes = 60,
): { time: string; fits: boolean }[] {
  const day = hours.find((h) => h.weekday === weekday);
  if (!day || day.is_closed || !day.opens_at || !day.closes_at) return [];
  const open = Math.ceil(toMinutes(day.opens_at) / stepMinutes) * stepMinutes;
  let close = toMinutes(day.closes_at);
  // Closing at or before opening runs past midnight (10:00-02:00, or 00:00-00:00
  // for round the clock). A booking still has to end the same day — the API
  // takes an end after its start — so the last end is 23:00.
  if (close <= toMinutes(day.opens_at)) close += 24 * 60;
  const lastEnd = Math.min(close, 23 * 60);
  const slots: { time: string; fits: boolean }[] = [];
  for (let at = open; at < lastEnd; at += stepMinutes) {
    slots.push({ time: toHHMM(at), fits: at + durationHours * 60 <= lastEnd });
  }
  return slots;
}

/**
 * Start times a booking of `durationHours` fits into on that weekday, as
 * `"HH:MM"`, on the hour unless a finer step is asked for.
 */
export function slotsFor(
  hours: VenueWorkingHoursRead[],
  weekday: number,
  durationHours = 2,
  stepMinutes = 60,
): string[] {
  return startTimes(hours, weekday, durationHours, stepMinutes)
    .filter((slot) => slot.fits)
    .map((slot) => slot.time);
}

/** The Monday-to-Sunday week holding `isoDate`, as seven `YYYY-MM-DD`. */
export function weekOf(isoDate: string): string[] {
  const monday = parseApiDate(isoDate);
  monday.setDate(monday.getDate() - weekdayOf(isoDate));
  return Array.from({ length: 7 }, (_, i) => {
    const day = new Date(monday);
    day.setDate(monday.getDate() + i);
    return toApiDate(day);
  });
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
