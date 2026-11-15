/** Campus-wide one-live-ask-per-company claims (Chancery invariant). */
export const CLAIM_HOLD_DAYS = 21;

export type CampusClaim = {
  id: string;
  companyId: string;
  companyName: string;
  clubId: string;
  clubName: string;
  eventDate: string | null;
  eventTitle: string | null;
  heldUntil: string; // YYYY-MM-DD
  status: "held" | "released" | "replied";
  createdAt: string;
};

export function claimActive(c: CampusClaim, today: string) {
  return c.status === "held" && c.heldUntil >= today;
}

export function holdUntil(fromISO: string, days = CLAIM_HOLD_DAYS) {
  const d = new Date(fromISO + "T12:00:00Z");
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Message other clubs see instead of a send button. */
export function claimBlockMessage(c: CampusClaim) {
  const when = c.eventDate
    ? ` about an event on ${new Date(c.eventDate + "T12:00:00Z").toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}`
    : "";
  return `Another USC club is talking to ${c.companyName}${when}; ask USG's RSO Outreach Team or co-host.`;
}
