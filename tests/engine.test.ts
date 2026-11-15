// Run: npm test
import { test } from "node:test";
import assert from "node:assert/strict";
import { deadlineSwitchHint, lookupDeadline, matchVendor, needsNineWeeks, runChecks, sponsorAsks, budgetCsv, documentList } from "../src/lib/engine";
import type { Application, Club } from "../src/lib/types";

const club: Club = { id: "c1", name: "Test Club", school: "Viterbi", startupEligible: false, receivedThisYear: 2000, eventsThisSemester: 1 };

function app(over: Partial<Application> = {}): Application {
  return {
    id: "a1", clubId: "c1", sample: true, createdAt: "2026-11-14", submittedAt: null, status: "draft", history: [], aiComments: [], decision: null, sponsorPlan: null,
    uepa: "", docs: {}, answers: { description: "", missionFit: "", otherSources: "" },
    event: { title: "Hackathon", type: "hackathon", date: "2027-02-18", location: "Ginsburg Hall", onCampus: true, attendance: 120, openToAll: true, ticketed: false, privateResidence: false, travel: false, international: false, food: true, description: "", board: "professional", boardReason: "" },
    items: [
      { id: "i1", item: "Catered lunch", vendor: "Panda Catering", link: "", justification: "", quantity: 120, unitPrice: 45, total: 5400, orderBy: "", category: "food", estimate: false, toSponsor: false },
      { id: "i2", item: "Winner gift cards", vendor: "Amazon", link: "", justification: "", quantity: 6, unitPrice: 100, total: 600, orderBy: "", category: "gift", estimate: false, toSponsor: false },
    ],
    ...over,
  };
}

test("deadline: Feb 18 2027 event uses the Nov 18 six-week deadline, 4 days from Nov 14", () => {
  const d = lookupDeadline("2027-02-18", false, "2026-11-14");
  assert.equal(d.kind, "ok");
  if (d.kind !== "ok") return;
  assert.equal(d.deadline, "2026-11-18");
  assert.equal(d.daysLeft, 4);
  assert.equal(d.passed, false);
  assert.ok(d.cliff, "should point out the later week");
  assert.equal(d.cliff?.deadline, "2027-01-13");
  // Hand check: Nov 18 -> Jan 13 = 12 + 31 + 13 = 56 days.
  assert.equal(d.cliff?.gainDays, 56);
});

test("deadline: 9-week for the same week already passed (Nov 11)", () => {
  const d = lookupDeadline("2027-02-18", true, "2026-11-14");
  assert.equal(d.kind, "ok");
  if (d.kind === "ok") { assert.equal(d.deadline, "2026-11-11"); assert.equal(d.passed, true); }
});

test("deadline: Saturday event maps to the week before", () => {
  const d = lookupDeadline("2027-02-20", false, "2026-11-14");
  assert.equal(d.kind, "ok");
  if (d.kind === "ok") assert.equal(d.row.weekStart, "2027-02-15");
});

test("deadline: winter break and after May 1 are blackouts", () => {
  assert.equal(lookupDeadline("2026-12-20", false, "2026-11-14").kind, "blackout");
  assert.equal(lookupDeadline("2027-05-05", false, "2026-11-14").kind, "blackout");
});

test("deadline: spring break week has no deadline", () => {
  assert.equal(lookupDeadline("2027-03-17", false, "2026-11-14").kind, "none");
});

test("vendor list: Panda Catering is listed, Chipotle is not, non-food is not covered", () => {
  assert.equal(matchVendor("Panda Catering", "food").kind, "listed");
  assert.equal(matchVendor("Chipotle", "food").kind, "not_listed");
  assert.equal(matchVendor("Amazon", "promo_merch").kind, "not_covered");
});

test("checks: $45/person food fails with a $4,200 max; gift cards fail; over $4K warns", () => {
  const c = runChecks(app(), club, "2026-11-14");
  const food = c.find((x) => x.ruleId === "food-per-person");
  assert.equal(food?.level, "fail");
  assert.match(food!.detail, /\$4,200/);
  assert.equal(c.find((x) => x.ruleId === "ineligible-gift")?.level, "fail");
  assert.equal(c.find((x) => x.ruleId === "over-4k")?.level, "warn");
  assert.equal(c.find((x) => x.ruleId === "food-docs")?.level, "fail");
  assert.equal(c.find((x) => x.ruleId === "uepa")?.level, "fail");
});

test("checks: after fixes the application is clean", () => {
  const a = app({ uepa: "A12345", docs: { healthPermit: true } });
  a.items[0].total = 4200; a.items[0].unitPrice = 35;
  a.items[1].toSponsor = true;
  const c = runChecks(a, club, "2026-11-14");
  assert.deepEqual(c.filter((x) => x.level === "fail").map((x) => x.title), []);
  assert.equal(c.find((x) => x.ruleId === "food-per-person")?.level, "pass");
});

test("checks: annual cap counts money already received", () => {
  const c = runChecks(app(), { ...club, receivedThisYear: 7000 }, "2026-11-14");
  assert.equal(c.find((x) => x.ruleId === "annual-cap")?.level, "fail");
});

test("checks: closed on-campus event, tickets, hotel over $400", () => {
  const a = app();
  a.event.openToAll = false; a.event.ticketed = true;
  a.items.push({ id: "i3", item: "Hotel", vendor: "Hilton", link: "", justification: "", quantity: 2, unitPrice: 450, total: 900, orderBy: "", category: "lodging", estimate: false, toSponsor: false });
  const c = runChecks(a, club, "2026-11-14");
  for (const id of ["open-to-all", "ticket-sales", "hotel-per-night"]) assert.equal(c.find((x) => x.ruleId === id)?.level, "fail", id);
});

test("sponsor asks: moved items plus the gap left by a partial award", () => {
  const a = app();
  a.items[1].toSponsor = true;
  a.decision = { outcome: "partial", amount: 4000, reasonCode: "", email: "", sentAt: "" };
  const asks = sponsorAsks(a);
  assert.equal(asks.length, 2);
  assert.equal(asks.find((x) => x.itemId === "gap")?.amount, 1400);
});

test("export: budget CSV uses USG's eight columns and skips sponsor items", () => {
  const a = app(); a.items[1].toSponsor = true;
  const csv = budgetCsv(a).split("\n");
  assert.equal(csv.length, 2);
  assert.match(csv[0], /Payment\/Order by Date/);
  assert.ok(documentList(a).some((d) => d.key === "healthPermit"));
});

test("needsNineWeeks: travel or unlisted food vendor, not listed caterers", () => {
  assert.equal(needsNineWeeks(app()), false);
  assert.equal(needsNineWeeks(app({ event: { ...app().event, travel: true } })), true);
  const chipotle = app();
  chipotle.items[0].vendor = "Chipotle";
  assert.equal(needsNineWeeks(chipotle), true);
});

test("checks: foodWhy warns without purpose; otherSources empty warns; hotel compare fails", () => {
  const a = app({
    answers: { description: "Short", missionFit: "", otherSources: "" },
    items: [
      ...app().items,
      { id: "i3", item: "Hotel", vendor: "Hilton", link: "", justification: "", quantity: 1, unitPrice: 200, total: 200, orderBy: "", category: "lodging", estimate: false, toSponsor: false },
    ],
  });
  a.items[0].total = 4200; a.items[0].unitPrice = 35;
  a.items[1].toSponsor = true;
  const c = runChecks(a, club, "2026-11-14");
  assert.equal(c.find((x) => x.ruleId === "food-why")?.level, "warn");
  assert.equal(c.find((x) => x.ruleId === "other-university-funding")?.level, "warn");
  assert.equal(c.find((x) => x.ruleId === "hotel-compare")?.level, "fail");
  assert.ok(documentList(a).some((d) => d.key === "hotelCompare"));
});

test("checks: foodWhy and otherSources pass when filled; hotel compare passes with doc", () => {
  const a = app({
    uepa: "A12345",
    docs: { healthPermit: true, hotelCompare: true },
    answers: {
      description: "A full-day hackathon with lunch so teams can stay and build.",
      missionFit: "Supports our professional development mission for engineers.",
      otherSources: "N/A",
    },
    items: [
      { id: "i1", item: "Catered lunch", vendor: "Panda Catering", link: "", justification: "", quantity: 120, unitPrice: 35, total: 4200, orderBy: "", category: "food", estimate: false, toSponsor: false },
      { id: "i3", item: "Hotel", vendor: "Hilton", link: "", justification: "", quantity: 1, unitPrice: 200, total: 200, orderBy: "", category: "lodging", estimate: false, toSponsor: false },
    ],
  });
  const c = runChecks(a, club, "2026-11-14");
  assert.equal(c.find((x) => x.ruleId === "food-why")?.level, "pass");
  assert.equal(c.find((x) => x.ruleId === "other-university-funding")?.level, "pass");
  assert.equal(c.find((x) => x.ruleId === "hotel-compare")?.level, "pass");
});

test("checks: durable keyword warns with FAQ quote and sponsor fix", () => {
  const a = app({
    items: [
      { id: "i1", item: "Bluetooth speakers for the room", vendor: "Amazon", link: "https://amazon.com/x", justification: "Reusable AV equipment", quantity: 2, unitPrice: 80, total: 160, orderBy: "", category: "supplies", estimate: false, toSponsor: false, vendorConfirmed: true },
    ],
  });
  const c = runChecks(a, club, "2026-11-14");
  const d = c.find((x) => x.ruleId === "durable-likely");
  assert.equal(d?.level, "warn");
  assert.equal(d?.heuristic, true);
  assert.match(d!.quote, /three years/i);
  assert.equal(d?.fix?.action, "to-sponsor");
});

test("checks: qty-per-attendee warns when quantity exceeds heuristic ratio", () => {
  const a = app({
    docs: { quotes: true, healthPermit: true },
    uepa: "A12345",
    items: [
      { id: "i1", item: "Swag pens", vendor: "Campus Custom Tees", link: "https://example.com", justification: "Giveaways", quantity: 400, unitPrice: 2, total: 800, orderBy: "", category: "promo_merch", estimate: false, toSponsor: false, vendorConfirmed: true },
    ],
  });
  // 400 / 120 > 1.5
  const c = runChecks(a, club, "2026-11-14");
  const q = c.find((x) => x.ruleId === "qty-per-attendee");
  assert.equal(q?.level, "warn");
  assert.equal(q?.heuristic, true);
  assert.match(q!.section, /Greenlight check/);
});

test("checks: duplicate item+vendor warns within a request and against a peer", () => {
  const a = app({
    docs: { quotes: true, healthPermit: true },
    uepa: "A12345",
    items: [
      { id: "i1", item: "Catered lunch", vendor: "Panda Catering", link: "https://example.com", justification: "Lunch", quantity: 60, unitPrice: 35, total: 2100, orderBy: "", category: "food", estimate: false, toSponsor: false },
      { id: "i2", item: "Catered lunch", vendor: "Panda Catering", link: "https://example.com", justification: "More lunch", quantity: 60, unitPrice: 35, total: 2100, orderBy: "", category: "food", estimate: false, toSponsor: false },
    ],
  });
  const c = runChecks(a, club, "2026-11-14");
  assert.ok(c.some((x) => x.ruleId === "duplicate-item" && x.level === "warn"));

  const peer = app({ id: "a2", status: "submitted", submittedAt: "2026-11-10", items: [
    { id: "p1", item: "Catered lunch", vendor: "Panda Catering", link: "https://example.com", justification: "", quantity: 40, unitPrice: 35, total: 1400, orderBy: "", category: "food", estimate: false, toSponsor: false },
  ]});
  const single = app({
    docs: { quotes: true, healthPermit: true },
    uepa: "A12345",
    items: [
      { id: "i1", item: "Catered lunch", vendor: "Panda Catering", link: "https://example.com", justification: "Lunch", quantity: 60, unitPrice: 35, total: 2100, orderBy: "", category: "food", estimate: false, toSponsor: false },
    ],
  });
  const c2 = runChecks(single, club, "2026-11-14", [peer]);
  assert.ok(c2.some((x) => x.ruleId === "duplicate-item" && /also on/i.test(x.title)));
});

test("checks: missing quote warns when a line has no quote, link or cart docs", () => {
  const a = app({
    docs: {},
    uepa: "A12345",
    items: [
      { id: "i1", item: "Catered lunch", vendor: "Panda Catering", link: "", justification: "Lunch", quantity: 100, unitPrice: 30, total: 3000, orderBy: "", category: "food", estimate: false, toSponsor: false },
    ],
  });
  const c = runChecks(a, club, "2026-11-14");
  assert.equal(c.find((x) => x.ruleId === "missing-quote")?.level, "warn");
});

test("deadlineSwitchHint: listed vendor opens the later 6-week deadline", () => {
  const h = deadlineSwitchHint("2027-02-18", "2026-11-14");
  assert.ok(h);
  assert.equal(h!.from, "2026-11-11");
  assert.equal(h!.to, "2026-11-18");
  assert.equal(h!.gainDays, 7);
});
