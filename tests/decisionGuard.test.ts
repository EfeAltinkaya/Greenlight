import { test } from "node:test";
import assert from "node:assert/strict";
import { runChecks } from "../src/lib/engine";
import { addBusinessDays, awardError, decisionEmailText, decisionFacts, defaultOutcome, emailProblems, fixDeadline, suggestedAmount } from "../src/lib/decisionGuard";
import type { Application, Club } from "../src/lib/types";

const club: Club = { id: "c1", name: "Test Club", school: "Viterbi", startupEligible: false, receivedThisYear: 3500, eventsThisSemester: 1 };
const app = (over: Partial<Application> = {}): Application => ({
  id: "a1", clubId: "c1", sample: true, createdAt: "", submittedAt: "2026-11-11", status: "in_review", history: [], aiComments: [], decision: null, sponsorPlan: null,
  uepa: "A12345", docs: {}, answers: { description: "", missionFit: "", otherSources: "" },
  event: { title: "Career Panel", type: "speaker", date: "2027-02-18", location: "Ginsburg", onCampus: true, attendance: 60, openToAll: true, ticketed: false, privateResidence: false, travel: false, international: false, food: true, description: "", board: "professional", boardReason: "" },
  items: [
    { id: "i1", item: "Lunch", vendor: "Panda Catering", link: "", justification: "", quantity: 60, unitPrice: 15, total: 900, orderBy: "", category: "food", estimate: false, toSponsor: false },
    { id: "i2", item: "Gift cards for speakers", vendor: "", link: "", justification: "", quantity: 1, unitPrice: 200, total: 200, orderBy: "", category: "gift", estimate: false, toSponsor: false },
  ],
  ...over,
});

test("an award above the request or the club's remaining cap is blocked with a reason", () => {
  const a = app({ items: [app().items[0]] });
  const c = runChecks(a, club);
  assert.match(awardError("approved", 9000, a, club, c) ?? "", /more than the \$900 requested/);
  const rich = { ...club, receivedThisYear: 7800 };
  assert.match(awardError("approved", 900, a, rich, runChecks(a, rich)) ?? "", /\$200 this club has left/);
  assert.equal(awardError("approved", 900, a, club, c), null);
});

test("approving in full is blocked while a line fails a rule; the default is Fund part without it", () => {
  const a = app();
  const c = runChecks(a, club);
  assert.equal(defaultOutcome(c), "partial");
  assert.match(awardError("approved", 1100, a, club, c) ?? "", /Fund part/);
  assert.equal(suggestedAmount(a, club, c, "partial"), 900);
  assert.equal(awardError("partial", 900, a, club, c), null);
});

test("the code-built email lists excluded lines; a contradicting draft is rejected", () => {
  const a = app();
  const c = runChecks(a, club);
  const f = decisionFacts(a, club, c, "partial", 900, "partial-ineligible", []);
  const base = decisionEmailText(f);
  assert.match(base, /Gift cards for speakers \(\$200\)/);
  assert.deepEqual(emailProblems(base, f), []);
  const bad = "Hi team, your request is complete and within the guidelines. No items were excluded. You were approved for $900. [DIRECTOR TO CONFIRM]. Submit your post-event evaluation within 3 business days.";
  const p = emailProblems(bad, f);
  assert.ok(p.some((x) => /nothing was excluded/.test(x)));
  assert.ok(p.some((x) => /placeholder/.test(x)));
  assert.ok(p.some((x) => /post-event/.test(x)));
  assert.ok(emailProblems("Approved for $1,500.", f).some((x) => /\$1500/.test(x)));
});

test("a returned application is overdue two business days later", () => {
  assert.equal(addBusinessDays("2026-11-06", 2), "2026-11-10"); // Friday + 2 business days = Tuesday
  const a = app({ status: "needs_info", history: [{ at: "2026-11-06", status: "needs_info", note: "Returned" }] });
  assert.deepEqual(fixDeadline(a, "2026-11-14"), { returned: "2026-11-06", due: "2026-11-10", overdue: true });
  assert.equal(fixDeadline(a, "2026-11-09")?.overdue, false);
});

test("non-food purchases need a named vendor the club confirmed is USG-approved", () => {
  const print = { id: "p1", item: "Flyers", vendor: "Kinko Print Shop", link: "", justification: "", quantity: 1, unitPrice: 120, total: 120, orderBy: "", category: "printing" as const, estimate: false, toSponsor: false };
  const fails = (items: Application["items"]) => runChecks(app({ items }), club).filter((c) => c.ruleId === "vendor-list" && c.level === "fail").map((c) => c.title);
  assert.deepEqual(fails([print]), ["Confirm Kinko Print Shop is an approved USG vendor"]);
  assert.deepEqual(fails([{ ...print, vendor: "" }]), ["Flyers: add the vendor"]);
  assert.deepEqual(fails([{ ...print, vendorConfirmed: true }]), []);
});
