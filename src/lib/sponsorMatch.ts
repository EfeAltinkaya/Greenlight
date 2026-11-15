// Sponsor matching in plain code, so every rank can be explained:
// audience majors the company hires, what it can give that the event needs, and a sourced USC tie.
import type { Major, Sponsor } from "@/data/sponsors";

export type Need = Sponsor["inKind"][number];

const NEED_WORDS: [Need, RegExp][] = [
  ["food", /food|cater|lunch|dinner|breakfast|snack|pizza|meal/i],
  ["swag", /swag|merch|shirt|sticker|tote|banner/i],
  ["prizes", /prize|gift card|gift|winner/i],
  ["speakers", /speaker|performer|dj|talent|panel/i],
  ["venue", /venue|room|hall|auditorium/i],
  ["supplies", /supplies|gloves|bags|materials|equipment/i],
  ["credits", /credit|cloud|software|license/i],
];

/** What the event needs sponsors to give, read from the names of the sponsor asks. */
export function needsFrom(labels: string[]): Need[] {
  const out = new Set<Need>();
  for (const l of labels) for (const [n, re] of NEED_WORDS) if (re.test(l)) out.add(n);
  return [...out];
}

export type Match = { sponsor: Sponsor; score: number; reasons: string[]; parts: { points: number; why: string }[] };

export function rankSponsors(list: Sponsor[], majors: Major[], needs: Need[]): Match[] {
  return list
    .map((s) => {
      const reasons: string[] = [];
      const parts: { points: number; why: string }[] = [];
      let score = 0;
      const overlap = s.hires.filter((h) => majors.includes(h));
      if (overlap.length) {
        score += Math.min(3, overlap.length) * 14;
        parts.push({ points: Math.min(3, overlap.length) * 14, why: `hires ${overlap.length} of your majors` });
        reasons.push(`Hires ${overlap.slice(0, 2).join(" and ")}`);
      }
      const gives = s.inKind.filter((k) => needs.includes(k));
      if (gives.length) {
        score += Math.min(2, gives.length) * 12;
        parts.push({ points: Math.min(2, gives.length) * 12, why: `can give ${gives.join(" and ")}` });
        reasons.push(`Can cover ${gives.join(" and ")}`);
      }
      if (s.tie) {
        score += 22;
        parts.push({ points: 22, why: "sourced USC tie" });
        reasons.push("USC tie on record");
      }
      if (s.custom) {
        score += 6;
        parts.push({ points: 6, why: "added by your club" });
        reasons.push("Added by your club");
      }
      return { sponsor: s, score: Math.min(99, score), reasons, parts, overlap: overlap.length, gives: gives.length };
    })
    // Ties break on the sourced USC tie first, then more of your majors hired, then more needs covered.
    .sort((a, b) => b.score - a.score || Number(Boolean(b.sponsor.tie)) - Number(Boolean(a.sponsor.tie)) || b.overlap - a.overlap || b.gives - a.gives || a.sponsor.name.localeCompare(b.sponsor.name))
    .map(({ overlap: _o, gives: _g, ...m }) => m);
}
