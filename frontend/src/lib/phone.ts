/**
 * Uzbek phone numbers, one way everywhere.
 *
 * Screens keep the nine national digits (`991234567`); the API takes E.164
 * (`+998991234567`); people read `+998 (99) 123 45 67`. Every conversion goes
 * through here — the old screens each prefixed "998" only when the number did
 * not already start with it, which mangled every 99 8xx xx xx number.
 */

/** The nine national digits from anything a person typed or pasted. */
export function phoneDigits(value: string | null | undefined): string {
  const text = (value ?? "").trim();
  // The masked field shows "+998 (" itself; those three digits are the prefix,
  // not the start of the number — or typing "9" after "+998 (9" reads as 99899.
  let digits = (text.startsWith("+998") ? text.slice(4) : text).replace(/\D/g, "");
  // A full number pasted without the plus.
  if (digits.length > 9 && digits.startsWith("998")) digits = digits.slice(3);
  return digits.slice(0, 9);
}

/** `"991234567"` as `"+998991234567"`. Null until all nine digits are there. */
export function toE164(digits: string): string | null {
  const national = phoneDigits(digits);
  return national.length === 9 ? `+998${national}` : null;
}

/** `"991234567"` (or `"+998991234567"`) as `"+998 (99) 123 45 67"`; partial input stays partial. */
export function formatPhone(value: string | null | undefined): string {
  const d = phoneDigits(value);
  if (!d) return "";
  let out = `+998 (${d.slice(0, 2)}`;
  if (d.length >= 2) out += ")";
  if (d.length > 2) out += ` ${d.slice(2, 5)}`;
  if (d.length > 5) out += ` ${d.slice(5, 7)}`;
  if (d.length > 7) out += ` ${d.slice(7, 9)}`;
  return out;
}

export const PHONE_PLACEHOLDER = "+998 (99) 000 00 00";
