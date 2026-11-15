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
    claim: "across USG's four funding boards in FY26, shared by more than 1,000 student organizations.",
    source: "USG FY26 Financial Report",
    url: FUNDING_URL,
    date: "2026",
  },
  {
    id: "professional-overspent",
    stat: `${Math.round(BOARDS.professional.fy26Used * 100)}%`,
    claim: "of its FY26 budget used by the Professional/Academic Research Fund, the board that funds engineering and research clubs.",
    source: "USG FY26 Financial Report",
    url: FUNDING_URL,
    date: "2026",
  },
  {
    id: "deadline",
    stat: "6 weeks",
    claim: "before the event is USG's deadline, 9 weeks for travel or a vendor not on USG's list. \"If this deadline is not met the application will be automatically denied.\" (Section 1)",
    source: "USG Funding Department 2026-27 Guidelines",
    url: GUIDELINES_URL,
    date: "2026-27",
  },
  {
    id: "same-review",
    stat: "Every request",
    claim: "gets the same checklist review from a board director, an associate director and a delegate, whether it asks for $500 or $3,000.",
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
