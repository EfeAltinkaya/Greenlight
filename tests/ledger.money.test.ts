import { describe, it } from "node:test";
import assert from "node:assert/strict";
import * as fc from "fast-check";
import { RULES } from "../src/data/rules";
import { requestItems, requestTotal, runChecks } from "../src/lib/engine";
import { doubleCoveredKeys, stackByEvent } from "../src/lib/ledger";
import { DEMO_CLUB_ID, SEED_APPS, SEED_CLUBS, SEED_LEDGER } from "../src/lib/seed";
import type { Application, Club, LedgerLine, LineItem } from "../src/lib/types";

const club: Club = SEED_CLUBS.find((c) => c.id === DEMO_CLUB_ID)!;
const baseApp = SEED_APPS.find((a) => a.clubId === DEMO_CLUB_ID)!;

function withFood(app: Application, foodTotal: number, attendance: number): Application {
  const food: LineItem = {
    id: "fc-food",
    item: "Catering",
    vendor: "Panda Express Catering",
    link: "",
    justification: "Dinner for attendees",
    quantity: attendance,
    unitPrice: foodTotal / Math.max(attendance, 1),
    total: foodTotal,
    orderBy: "",
    category: "food",
    estimate: false,
    toSponsor: false,
    vendorConfirmed: true,
  };
  return {
    ...app,
    event: { ...app.event, attendance, food: true, travel: false },
    items: [food],
    docs: { ...app.docs, quotes: true, healthPermit: true, fbForm: true },
  };
}

describe("ledger money (fast-check)", () => {
  it("annual cap: request over remaining year money always fails annual-cap", () => {
    fc.assert(
      fc.property(fc.integer({ min: 1, max: 20_000 }), (over) => {
        const received = Math.min(RULES.annualCap.limit, Math.floor(RULES.annualCap.limit * 0.5));
        const left = RULES.annualCap.limit - received;
        const total = left + over;
        const c: Club = { ...club, receivedThisYear: received, eventsThisSemester: 0 };
        const app = withFood(baseApp, total, 80);
        const checks = runChecks(app, c);
        const cap = checks.find((x) => x.ruleId === RULES.annualCap.id);
        assert.ok(cap);
        assert.equal(cap!.level, "fail");
        assert.ok(requestTotal(app) > left);
      }),
      { numRuns: 40 },
    );
  });

  it("food per person: over $35 fails; at or under passes that rule", () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 10, max: 200 }),
        fc.integer({ min: 1, max: 80 }),
        (attendance, dollarsOverOrUnder) => {
          const limit = RULES.foodPerPerson.limit * attendance;
          const over = dollarsOverOrUnder % 2 === 0;
          const foodTotal = over ? limit + 1 + (dollarsOverOrUnder % 50) : Math.max(1, limit - (dollarsOverOrUnder % Math.max(1, limit)));
          const app = withFood(baseApp, foodTotal, attendance);
          const checks = runChecks(app, { ...club, receivedThisYear: 0 });
          const food = checks.find((x) => x.ruleId === RULES.foodPerPerson.id);
          assert.ok(food, "food-per-person check present");
          if (foodTotal > RULES.foodPerPerson.limit * attendance + 1e-9) {
            assert.equal(food!.level, "fail");
          } else {
            assert.equal(food!.level, "pass");
          }
        },
      ),
      { numRuns: 50 },
    );
  });

  it("ledger stack totals equal the sum of non-declined lines per event", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            item: fc.constantFrom("Food", "Supplies", "Prizes", "Venue"),
            amount: fc.integer({ min: 0, max: 5000 }),
            source: fc.constantFrom("usg", "viterbi_sos", "sponsor_in_kind", "unfunded") as fc.Arbitrary<LedgerLine["source"]>,
            status: fc.constantFrom("planned", "approved", "declined") as fc.Arbitrary<LedgerLine["status"]>,
          }),
          { minLength: 1, maxLength: 8 },
        ),
        (rows) => {
          // Always keep at least one active line so the event shell exists.
          if (rows.every((r) => r.status === "declined")) rows[0] = { ...rows[0], status: "planned" };
          const lines: LedgerLine[] = rows.map((r, i) => ({
            id: `t-${i}`,
            clubId: club.id,
            eventId: "ev-prop",
            eventTitle: "Prop event",
            item: r.item,
            vendor: "",
            amount: r.amount,
            category: "test",
            source: r.source,
            sourceRef: null,
            status: r.status,
            evidence: null,
            updatedAt: "2026-11-15",
            history: [],
          }));
          const stacks = stackByEvent(lines, club);
          const stack = stacks.find((s) => s.eventId === "ev-prop");
          assert.ok(stack);
          const expected = lines.filter((l) => l.status !== "declined").reduce((s, l) => s + l.amount, 0);
          assert.equal(stack!.total, expected);
          assert.ok(stack!.total >= stack!.usg);
          assert.ok(stack!.total >= stack!.sponsors);
        },
      ),
      { numRuns: 40 },
    );
  });

  it("one line one source: double coverage is detected; seed lines do not double-cover the same item+event under two sources without warning keys", () => {
    const builders = SEED_LEDGER.filter((l) => l.clubId === "builders" && l.status !== "declined");
    const keys = doubleCoveredKeys(builders);
    // Seed data is curated to be one-line-one-source for the same item name.
    assert.equal(keys.length, 0);

    fc.assert(
      fc.property(fc.string({ minLength: 3, maxLength: 20 }), fc.integer({ min: 1, max: 900 }), (item, amount) => {
        const lines: LedgerLine[] = [
          {
            id: "a",
            clubId: "x",
            eventId: "e",
            eventTitle: "E",
            item,
            vendor: "",
            amount,
            category: "t",
            source: "usg",
            sourceRef: null,
            status: "approved",
            evidence: null,
            updatedAt: "",
            history: [],
          },
          {
            id: "b",
            clubId: "x",
            eventId: "e",
            eventTitle: "E",
            item,
            vendor: "",
            amount,
            category: "t",
            source: "price",
            sourceRef: null,
            status: "approved",
            evidence: null,
            updatedAt: "",
            history: [],
          },
        ];
        const hit = doubleCoveredKeys(lines);
        assert.equal(hit.length, 1);
        assert.equal(hit[0], `e::${item.toLowerCase()}`);
      }),
      { numRuns: 30 },
    );
  });

  it("USG request lines on seed apps: requestItems total matches requestTotal", () => {
    for (const app of SEED_APPS) {
      const items = requestItems(app);
      const sum = items.reduce((s, i) => s + i.total, 0);
      assert.equal(sum, requestTotal(app));
    }
  });
});
