// Greenlight Check verdict: derived only from engine check results (never AI).
import type { Check } from "./types";

/** Hard fails that cannot be patched without changing the event itself (deadline, blackout, eligibility). */
export const HARD_FAIL_RULES = new Set([
  "blackout",
  "late",
  "open-to-all",
  "ticket-sales",
  "private-residence",
  "international-travel",
  "annual-cap",
  "events-per-semester",
]);

export type VerdictId = "matches" | "minor_fixes" | "back_and_forth" | "will_not_fund";

export type Verdict = {
  id: VerdictId;
  /** Club-facing sentence on Review and submit. */
  clubLabel: string;
  /** Short USG queue label. */
  usgLabel: string;
  /** Checks that drive the verdict (fails and warns only). */
  drivers: Check[];
  fixCount: number;
  hardFails: Check[];
  fixableFails: Check[];
  warns: Check[];
};

export function isHardFail(c: Check): boolean {
  return c.level === "fail" && HARD_FAIL_RULES.has(c.ruleId);
}

/** Sort key: Matches first, then Minor fixes, then Needs back-and-forth, then Will not be funded. */
export const VERDICT_ORDER: Record<VerdictId, number> = {
  matches: 0,
  minor_fixes: 1,
  back_and_forth: 2,
  will_not_fund: 3,
};

export const VERDICT_FILTERS: { id: VerdictId | "all"; label: string }[] = [
  { id: "all", label: "All verdicts" },
  { id: "matches", label: "Matches" },
  { id: "minor_fixes", label: "Minor fixes" },
  { id: "back_and_forth", label: "Needs back-and-forth" },
  { id: "will_not_fund", label: "Will not be funded" },
];

export function greenlightVerdict(checks: Check[]): Verdict {
  const hardFails = checks.filter(isHardFail);
  const fixableFails = checks.filter((c) => c.level === "fail" && !isHardFail(c));
  const warns = checks.filter((c) => c.level === "warn");
  const drivers = [...hardFails, ...fixableFails, ...warns];
  const fixCount = fixableFails.length + warns.length;

  if (hardFails.length > 0) {
    return {
      id: "will_not_fund",
      clubLabel: "Will not be funded as written",
      usgLabel: "Will not be funded",
      drivers,
      fixCount,
      hardFails,
      fixableFails,
      warns,
    };
  }
  if (fixableFails.length > 0) {
    return {
      id: "back_and_forth",
      clubLabel: `Matches after ${fixCount} fix${fixCount === 1 ? "" : "es"}`,
      usgLabel: "Needs back-and-forth",
      drivers,
      fixCount,
      hardFails,
      fixableFails,
      warns,
    };
  }
  if (warns.length > 0) {
    return {
      id: "minor_fixes",
      clubLabel: `Matches after ${warns.length} fix${warns.length === 1 ? "" : "es"}`,
      usgLabel: "Minor fixes",
      drivers,
      fixCount: warns.length,
      hardFails,
      fixableFails,
      warns,
    };
  }
  return {
    id: "matches",
    clubLabel: "Matches the guidelines",
    usgLabel: "Matches",
    drivers: [],
    fixCount: 0,
    hardFails,
    fixableFails,
    warns,
  };
}

export const RULES_VERSION = "USG Funding Department Guidelines, current as of October 21, 2026";
