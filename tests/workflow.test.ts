import { test } from "node:test";
import assert from "node:assert/strict";
import { moveApp, moveDeal, autoAdvance } from "../src/lib/workflow";
import { decisionSupport } from "../src/lib/decision";
import { contractText } from "../src/lib/contract";
import type { Application, Club, Deal } from "../src/lib/types";

const club: Club = { id: "c1", name: "Test Club", school: "Viterbi", startupEligible: false, receivedThisYear: 7000, eventsThisSemester: 1 };
const app = (over: Partial<Application> = {}): Application => ({
  id: "a1", clubId: "c1", sample: true, createdAt: "", submittedAt: null, status: "draft", history: [], aiComments: [], decision: null, sponsorPlan: null,
  uepa: "A12345", docs: {}, answers: { description: "", missionFit: "", otherSources: "" },
  event: { title: "Hack", type: "hackathon", date: "2027-02-18", location: "Ginsburg", onCampus: true, attendance: 100, openToAll: true, ticketed: false, privateResidence: false, travel: false, international: false, food: true, description: "", board: "professional", boardReason: "" },
  items: [
    { id: "i1", item: "Lunch", vendor: "Panda Catering", link: "", justification: "", quantity: 100, unitPrice: 30, total: 3000, orderBy: "", category: "food", estimate: false, toSponsor: false },
    { id: "i2", item: "Gift cards", vendor: "", link: "", justification: "", quantity: 1, unitPrice: 500, total: 500, orderBy: "", category: "gift", estimate: false, toSponsor: false },
  ],
  ...over,
});

test("submitting notifies USG; a decision notifies the club", () => {
  const s = moveApp(app(), "submitted", "club", "Submitted");
  assert.equal(s.app.status, "submitted");
  assert.equal(s.notices[0].to, "usg");
  const d = moveApp(s.app, "denied", "usg", "Late");
  assert.equal(d.notices[0].to, "club");
  assert.match(d.notices[0].href, /\/club\/funding\?app=a1$/);
});

test("illegal application steps are refused", () => {
  assert.throws(() => moveApp(app(), "approved", "usg", "skip"));
});

test("after an approved event, the evaluation becomes due automatically", () => {
  const a = app({ status: "approved", event: { ...app().event, date: "2026-11-01" } });
  assert.equal(autoAdvance(a, "2026-11-14")?.app.status, "post_event_due");
  assert.equal(autoAdvance(app({ status: "approved" }), "2026-11-14"), null);
});

test("club can close out after post_event_due", () => {
  const pe = moveApp(app({ status: "post_event_due" }), "closed", "club", "Evaluation submitted");
  assert.equal(pe.app.status, "closed");
  assert.equal(pe.notices.length, 0);
});

test("deal steps notify the other side and refuse skips", () => {
  const deal: Deal = { id: "d1", offerId: null, clubId: "c1", appId: null, sponsorName: "Acme", sponsorEmail: "", stage: "requested", amount: 600, covers: "Prizes", deliverables: ["Logo"], message: "", contract: null, invoice: null, recap: "", history: [] };
  const r = moveDeal(deal, "details_sent", "sponsor", "Here are details");
  assert.equal(r.notices[0].to, "club");
  const c = moveDeal(r.deal, "contract_ready", "club", "Signed by club");
  assert.equal(c.notices[0].to, "sponsor");
  assert.throws(() => moveDeal(deal, "paid", "sponsor", "skip"));
  assert.match(contractText(deal, "Test Club", app().event), /No money is paid to the Club/);
});

test("decision support: drops failing lines and caps at the club's remaining $1,000", () => {
  const ds = decisionSupport(app({ status: "submitted" }), club, [], [club]);
  assert.equal(ds.high, 1000);
  assert.ok(ds.basis.some((b) => b.includes("$8,000")));
  assert.equal(ds.costPerAttendee, 35);
});
