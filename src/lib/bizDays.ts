// Business-day helpers (Mon-Fri). Deadlines still come from deadlines.ts; this only
// covers follow-up windows and fix/post-event clocks that the app already counted by hand.
import { addBusinessDays as dfAdd, differenceInBusinessDays, isWeekend, parseISO } from "date-fns";

function toNoon(iso: string) {
  // Noon UTC keeps LA calendar dates stable across DST for day-only ISO strings.
  return parseISO(iso.includes("T") ? iso : `${iso}T12:00:00`);
}

function toISODate(d: Date) {
  return d.toISOString().slice(0, 10);
}

/** Add n business days (skips Sat/Sun) to an ISO date (YYYY-MM-DD). */
export function addBusinessDays(iso: string, n: number): string {
  if (!Number.isFinite(n) || n === 0) return iso.slice(0, 10);
  return toISODate(dfAdd(toNoon(iso), n));
}

/** Business days from a to b (can be negative). Weekends on either end are skipped like date-fns. */
export function businessDaysBetween(a: string, b: string): number {
  return differenceInBusinessDays(toNoon(b), toNoon(a));
}

export function isBusinessDay(iso: string): boolean {
  return !isWeekend(toNoon(iso));
}

/** Next calendar day that is Mon-Fri (today if already a weekday). */
export function nextBusinessDay(iso: string): string {
  let d = toNoon(iso);
  while (isWeekend(d)) d = dfAdd(d, 1);
  return toISODate(d);
}
