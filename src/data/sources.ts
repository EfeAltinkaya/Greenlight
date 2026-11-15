// The only numbers the landing page may state, each with where it comes from.
// Add a stat here (with its source) before putting it on a public page.
import { BOARDS, GUIDELINES_URL } from "./rules";

export type Source = { id: string; stat: string; claim: string; source: string; url: string | null; date: string };

const FY26_TOTAL = Object.values(BOARDS).reduce((s, b) => s + b.fy26Budget, 0);
const FUNDING_URL = "https://usg.usc.edu/branches/funding/";

export const SOURCES: Source[] = [
  {
    id: "fy26-total",
    stat: `$${Math.round(FY26_TOTAL / 1000)}K`,
    claim: "across USG's four funding boards in FY26, for 1,000+ clubs.",
    source: "USG FY26 Financial Report",
    url: FUNDING_URL,
    date: "2026",
  },
  {
    id: "professional-overspent",
    stat: `${Math.round(BOARDS.professional.fy26Used * 100)}%`,
    claim: "of the Professional/Academic board's FY26 budget already used.",
    source: "USG FY26 Financial Report",
    url: FUNDING_URL,
    date: "2026",
  },
  {
    id: "deadline",
    stat: "6 weeks",
    claim: "before the event is the deadline. Miss it and the request is denied automatically.",
    source: "USG Funding Department 2026-27 Guidelines",
    url: GUIDELINES_URL,
    date: "2026-27",
  },
  {
    id: "same-review",
    stat: "Every request",
    claim: "gets the same review, whether it asks for $500 or $3,000.",
    source: "Conversation with a USG Funding Department officer, Nov 14, 2026 (paraphrased, at her request)",
    url: null,
    date: "2026-11-14",
  },
];

export const source = (id: string) => {
  const s = SOURCES.find((x) => x.id === id);
  if (!s) throw new Error(`Unknown source ${id}`);
  return s;
};
