// Pure helpers used by both the browser and the server (no SDK imports here).
import type { SponsorPackage } from "./types";

/** Turns each uncovered cost into a priced sponsor package. Prices come from the budget, not the AI. */
export function buildPackages(asks: { label: string; amount: number }[], attendance: number): SponsorPackage[] {
  return [...asks].sort((x, y) => y.amount - x.amount).map((a) => {
    const big = a.amount >= 1000;
    return {
      title: a.label,
      covers: a.label,
      amount: Math.round(a.amount),
      offer: [
        big ? "5-minute talk to the room" : "Thank-you on the main slides",
        `Logo on event materials seen by about ${attendance} students`,
        big ? "Recruiting table during the event" : "Mention in the post-event recap",
      ],
    };
  });
}
