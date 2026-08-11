/** Presentation helpers shared by more than one screen. */

/** `1240` becomes `"1.2 km"`, `340` becomes `"340 m"`. Null when unknown. */
export function formatDistance(metres: number | null | undefined): string | null {
  if (metres === null || metres === undefined) return null;
  if (metres < 1000) return `${Math.round(metres)} m`;
  return `${(metres / 1000).toFixed(1)} km`;
}

const WEEKDAYS = ["Dush", "Sesh", "Chor", "Pay", "Jum", "Shan", "Yak"];
const MONTHS = [
  "Yanvar",
  "Fevral",
  "Mart",
  "Aprel",
  "May",
  "Iyun",
  "Iyul",
  "Avgust",
  "Sentabr",
  "Oktabr",
  "Noyabr",
  "Dekabr",
];

/**
 * Parse an API date without a timezone shift.
 *
 * `new Date("2026-08-18")` is parsed as UTC midnight and then rendered in local
 * time, which moves the date back a day for anyone west of Greenwich. Booking
 * dates are local venue values with no timezone at all — 18 August must stay
 * 18 August.
 */
export function parseApiDate(value: string): Date {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

/** `"2026-08-18"` becomes `"18 Avgust"`. */
export function formatDate(value: string): string {
  const date = parseApiDate(value);
  return `${date.getDate()} ${MONTHS[date.getMonth()]}`;
}

/** `"2026-08-18"` becomes `"18/08/2026"`. */
export function formatDateNumeric(value: string): string {
  const date = parseApiDate(value);
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  return `${day}/${month}/${date.getFullYear()}`;
}

/** Monday-first, matching `venue_working_hours.weekday`. */
export function weekdayName(weekday: number): string {
  return WEEKDAYS[weekday] ?? "";
}

/** `"18:00:00"` becomes `"18:00"`. The API sends seconds; nothing displays them. */
export function formatTime(value: string): string {
  return value.slice(0, 5);
}

/**
 * The next date falling on a named weekday, as `YYYY-MM-DD`.
 *
 * The pickers offer relative weekday labels ("Jum"), and the booking endpoints
 * take a calendar date. Passing the label straight through is what left the
 * booking screen with no date selected: it compares against day-of-month.
 */
export function nextDateForWeekday(label: string, from: Date = new Date()): string {
  const target = WEEKDAYS.indexOf(label);
  if (target < 0) return toApiDate(from);

  // `getDay()` is Sunday-first; `WEEKDAYS` is Monday-first, as the API is.
  const todayMondayFirst = (from.getDay() + 6) % 7;
  const ahead = (target - todayMondayFirst + 7) % 7;
  const date = new Date(from);
  date.setDate(from.getDate() + ahead);
  return toApiDate(date);
}

/** Today as `YYYY-MM-DD` in local time — the format every booking endpoint takes. */
export function toApiDate(date: Date): string {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}
