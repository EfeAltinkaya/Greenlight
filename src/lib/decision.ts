// USG decision support, in plain code: a suggested range and the context a reviewer needs,
// each number traceable to the rules or to past decisions in the system.
import { BOARDS, RULES } from "@/data/rules";
import { requestItems, requestTotal, runChecks } from "./engine";
import type { Application, Club } from "./types";

export type DecisionSupport = {
  low: number;
  high: number;
  basis: string[];
  costPerAttendee: number;
  boardMedianPerAttendee: number | null;
  boardUsedAfter: number; // share of the board's budget used if `high` is awarded
  clubLeft: number;
  firstTime: boolean;
  similar: { title: string; club: string; requested: number; awarded: number; outcome: string }[];
  flags: string[];
};

const median = (xs: number[]) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
};

export function decisionSupport(app: Application, club: Club, all: Application[], clubs: Club[]): DecisionSupport {
  const checks = runChecks(app, club);
  const items = requestItems(app);
  const total = requestTotal(app);
  const failed = new Set(checks.filter((c) => c.level === "fail" && c.itemId).map((c) => c.itemId));
  const fundable = items.filter((i) => !failed.has(i.id));
  const fundableSum = fundable.reduce((s, i) => s + i.total, 0);
  const core = fundable.filter((i) => ["venue", "personnel", "food", "registration", "lodging", "airfare"].includes(i.category)).reduce((s, i) => s + i.total, 0);
  const clubLeft = Math.max(0, RULES.annualCap.limit - club.receivedThisYear);
  const board = BOARDS[app.event.board];
  const awardedOnBoard = all.filter((a) => a.event.board === app.event.board && a.decision && a.id !== app.id).reduce((s, a) => s + (a.decision?.amount ?? 0), 0);
  const boardLeft = Math.max(0, board.fy26Budget - awardedOnBoard);

  const basis: string[] = [];
  let high = fundableSum;
  if (fundableSum < total) basis.push(`Lines that fail a rule are left out (${failed.size}).`);
  if (high > clubLeft) { high = clubLeft; basis.push("Capped at what the club has left of its $8,000 for the year."); }
  if (high > boardLeft) { high = boardLeft; basis.push("Capped at what is left on this board."); }
  let low = Math.min(high, core || high);
  if (total > RULES.overFourK.limit) { low = Math.min(low, RULES.overFourK.limit); basis.push("Over $4,000: USG reviews case by case, so the low end funds core costs up to $4,000."); }
  if (!basis.length) basis.push("Every line passes the rules, so the full request is in range.");

  const att = Math.max(1, app.event.attendance);
  const peers = all.filter((a) => a.id !== app.id && a.event.board === app.event.board && a.status !== "draft").map((a) => requestTotal(a) / Math.max(1, a.event.attendance));
  const firstTime = !all.some((a) => a.clubId === club.id && a.id !== app.id && a.decision && a.decision.outcome !== "denied") && club.receivedThisYear === 0;
  const similar = all
    .filter((a) => a.id !== app.id && a.decision && a.event.board === app.event.board)
    .slice(0, 4)
    .map((a) => ({ title: a.event.title, club: clubs.find((c) => c.id === a.clubId)?.name ?? "", requested: requestTotal(a), awarded: a.decision!.amount, outcome: a.decision!.outcome }));

  const flags: string[] = [];
  if (firstTime) flags.push("First award for this club this year");
  if (club.startupEligible) flags.push("New club (registered in the last two semesters)");
  if ((awardedOnBoard + high) / board.fy26Budget > 0.5) flags.push("Award would take this board past 50% of its budget");
  if (club.eventsThisSemester >= 3) flags.push(`${club.eventsThisSemester} funded events already this semester`);

  return {
    low: Math.round(low), high: Math.round(high), basis,
    costPerAttendee: total / att,
    boardMedianPerAttendee: median(peers),
    boardUsedAfter: (awardedOnBoard + high) / board.fy26Budget,
    clubLeft, firstTime, similar, flags,
  };
}
