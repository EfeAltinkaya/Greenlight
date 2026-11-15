// Guards on a USG decision, in plain code. The award limits, the email facts and the
// "does this draft contradict the decision?" check all live here, so no AI wording can
// approve more than the rules allow or claim nothing was excluded when lines were.
// Pattern borrowed from Chancery: instructions ask, validators enforce.
import { RULES } from "@/data/rules";
import { money, requestItems, requestTotal } from "./engine";
import type { Application, Check, Club } from "./types";

export type Outcome = "approved" | "partial" | "denied";

export const REASONS = [
  { id: "complete", label: "Complete and within the guidelines", section: "" },
  { id: "partial-ineligible", label: "Some lines are not fundable", section: "Section 5" },
  { id: "over-4k", label: "Over $4,000: reviewed case by case", section: "Section 3" },
  { id: "food-cap", label: "Food above $35 per person", section: "Section 5" },
  { id: "late", label: "Submitted after the deadline", section: "Section 1" },
  { id: "missing-docs", label: "Missing required documents", section: "Section 2" },
  { id: "not-fixed", label: "Missing items not sent after the application was returned", section: "Section 2" },
  { id: "low-funds", label: "Low remaining funds due to high utilization", section: "Section 6" },
  { id: "other-university", label: "Already funded by another University source", section: "Section 6" },
] as const;
export type ReasonId = (typeof REASONS)[number]["id"];

export type Excluded = { label: string; total: number; why: string; section: string };

export function excludedLines(app: Application, checks: Check[]): Excluded[] {
  return requestItems(app).flatMap((i) => {
    const c = checks.find((x) => x.itemId === i.id && x.level === "fail");
    return c ? [{ label: i.item, total: i.total, why: c.title, section: c.section }] : [];
  });
}

/** Open problems a reviewer should resolve (or knowingly exclude) before approving in full. */
export const openFixes = (checks: Check[]) => checks.filter((c) => c.level === "fail");

/** The amount the code suggests for each outcome. */
export function suggestedAmount(app: Application, club: Club, checks: Check[], outcome: Outcome) {
  if (outcome === "denied") return 0;
  const left = Math.max(0, RULES.annualCap.limit - club.receivedThisYear);
  const fundable = requestTotal(app) - excludedLines(app, checks).reduce((s, x) => s + x.total, 0);
  return Math.max(0, Math.min(outcome === "approved" ? requestTotal(app) : fundable, left));
}

/** The outcome to start on: fund part whenever any line fails a rule. */
export const defaultOutcome = (checks: Check[]): Outcome => (openFixes(checks).length ? "partial" : "approved");

/** Why this award cannot be sent, or null when it can. */
export function awardError(outcome: Outcome, amount: number, app: Application, club: Club, checks: Check[]): string | null {
  if (outcome === "denied") return null;
  const requested = requestTotal(app);
  const left = Math.max(0, RULES.annualCap.limit - club.receivedThisYear);
  if (!Number.isFinite(amount) || amount <= 0) return "Enter an amount above $0, or choose Deny.";
  if (amount > requested) return `Can't be more than the ${money(requested)} requested.`;
  if (amount > left) return `Can't be more than the ${money(left)} this club has left of its $8,000 for the year (Section 6).`;
  const excluded = excludedLines(app, checks).reduce((s, x) => s + x.total, 0);
  if (outcome === "approved" && excluded > 0) return `${money(excluded)} of this request fails a rule. Choose Fund part, or Approve once fixed with conditions.`;
  if (outcome === "partial" && amount >= requested) return "That is the full request. Choose Approve instead.";
  return null;
}

/** Allow a full approve when the reviewer is using Approve once fixed (conditions cover the open fails). */
export function awardErrorWithConditions(
  outcome: Outcome,
  amount: number,
  app: Application,
  club: Club,
  checks: Check[],
  conditions: string[],
): string | null {
  if (conditions.length > 0 && outcome !== "denied") {
    const requested = requestTotal(app);
    const left = Math.max(0, RULES.annualCap.limit - club.receivedThisYear);
    if (!Number.isFinite(amount) || amount <= 0) return "Enter an amount above $0, or choose Deny.";
    if (amount > requested) return `Can't be more than the ${money(requested)} requested.`;
    if (amount > left) return `Can't be more than the ${money(left)} this club has left of its $8,000 for the year (Section 6).`;
    return null;
  }
  return awardError(outcome, amount, app, club, checks);
}

export type DecisionFacts = {
  clubName: string;
  eventTitle: string;
  outcome: Outcome;
  amount: number;
  requested: number;
  reason: ReasonId;
  excluded: Excluded[];
  notes: string[]; // reviewer notes, each already carrying its section
  /** Approve-once-fixed conditions the club must complete. */
  conditions?: string[];
};

export function decisionFacts(app: Application, club: Club, checks: Check[], outcome: Outcome, amount: number, reason: ReasonId, notes: string[], conditions: string[] = []): DecisionFacts {
  return { clubName: club.name, eventTitle: app.event.title, outcome, amount: outcome === "denied" ? 0 : amount, requested: requestTotal(app), reason, excluded: outcome === "denied" ? [] : excludedLines(app, checks), notes, conditions };
}

const reasonText = (id: ReasonId) => {
  const r = REASONS.find((x) => x.id === id)!;
  return r.section ? `${r.label} (${r.section})` : r.label;
};

/** The decision email, written from the data alone. The AI may only polish this text. */
export function decisionEmailText(f: DecisionFacts): string {
  const head =
    f.outcome === "denied"
      ? `Your application for ${f.eventTitle} was not approved.`
      : f.outcome === "partial"
        ? `Your application for ${f.eventTitle} was partly approved: ${money(f.amount)} of the ${money(f.requested)} requested.`
        : `Your application for ${f.eventTitle} was approved for ${money(f.amount)}.`;
  const lines = [`Hi ${f.clubName} team,`, "", head, "", `Reason: ${reasonText(f.reason)}.`];
  if (f.excluded.length) {
    lines.push("", "Not funded:");
    for (const x of f.excluded) lines.push(`- ${x.label} (${money(x.total)}): ${x.why} (${x.section})`);
  }
  if (f.conditions?.length) {
    lines.push("", "Approved once these fixes are done:");
    for (const c of f.conditions) lines.push(`- ${c}`);
  }
  if (f.notes.length) {
    lines.push("", "Notes from the reviewer:");
    for (const n of f.notes) lines.push(`- ${n}`);
  }
  lines.push("", "Reply to this email if you have questions about the decision.", "", "USG Funding Department");
  return lines.join("\n");
}

const PLACEHOLDER = /\[[^\]]*(confirm|todo|tbd|insert|name|director)[^\]]*\]/i;
const INVENTED_STEPS = /post[- ]event|evaluation|within \d+ (business )?days/i;

/** Ways a draft disagrees with the decision data. Empty means the draft is safe to send. */
export function emailProblems(email: string, f: DecisionFacts): string[] {
  const p: string[] = [];
  const text = email.replace(/,/g, "");
  if (!email.trim()) return ["The email is empty."];
  if (PLACEHOLDER.test(email)) p.push("It still has a placeholder in square brackets.");
  if (f.excluded.length && /no (items|lines|costs)[^.]*(excluded|removed|cut)|everything (was|is) funded/i.test(email)) p.push("It says nothing was excluded, but some lines were.");
  if (f.reason !== "complete" && /within the guidelines/i.test(email) && (f.excluded.length || f.outcome !== "approved")) p.push('It says "within the guidelines" although lines failed a rule.');
  if (f.outcome === "denied" && /\bapproved for\b|\bawarded\b/i.test(email)) p.push("It reads as an approval, but the decision is Deny.");
  if (f.outcome !== "denied" && !text.includes(money(f.amount).replace(/,/g, ""))) p.push(`It never states the ${money(f.amount)} awarded.`);
  if (INVENTED_STEPS.test(email)) p.push("It adds post-event steps that are not in the quoted rules.");
  const allowed = new Set([f.amount, f.requested, ...f.excluded.map((x) => x.total), 8000, 4000, 35].map((n) => Math.round(n)));
  for (const m of text.matchAll(/\$(\d+(?:\.\d+)?)/g)) {
    if (!allowed.has(Math.round(Number(m[1])))) { p.push(`It mentions $${m[1]}, which is not part of this decision.`); break; }
  }
  return p;
}

/** Add n business days (Mon-Fri) to an ISO date. */
export function addBusinessDays(iso: string, n: number) {
  const d = new Date(iso + "T12:00:00Z");
  while (n > 0) {
    d.setUTCDate(d.getUTCDate() + 1);
    const w = d.getUTCDay();
    if (w !== 0 && w !== 6) n--;
  }
  return d.toISOString().slice(0, 10);
}

/** For an application returned to the club: when the fix was due, and whether that has passed. */
export function fixDeadline(app: Application, today: string) {
  if (app.status !== "needs_info") return null;
  const ret = [...app.history].reverse().find((h) => h.status === "needs_info");
  if (!ret) return null;
  const due = addBusinessDays(ret.at, 2);
  return { returned: ret.at, due, overdue: today > due };
}
