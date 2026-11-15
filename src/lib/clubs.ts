import { SEED_CLUBS } from "./seed";
import type { Club } from "./types";

const SEED_IDS = new Set(SEED_CLUBS.map((c) => c.id));

/** Seed / demo clubs always shown in the Acting-for switcher. */
export function isSeedClub(c: Pick<Club, "id"> | string) {
  const id = typeof c === "string" ? c : c.id;
  return SEED_IDS.has(id);
}

/**
 * Clubs that should appear in switchers and insights.
 * Hides officer-less test clubs synced from Supabase (e.g. "a", "RPL").
 * Seed clubs are always kept; other clubs need at least one officer.
 */
export function visibleClubs(clubs: Club[]): Club[] {
  return clubs.filter((c) => isSeedClub(c) || c.hasOfficers === true || c.sample === true);
}

/** Clubs a demo user may act for (seed only). */
export function switchableClubs(clubs: Club[]): Club[] {
  const seeded = clubs.filter(isSeedClub);
  return seeded.length ? seeded : visibleClubs(clubs);
}
