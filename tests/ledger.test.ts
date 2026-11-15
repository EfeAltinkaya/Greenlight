import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  doubleCoveredKeys,
  needsSection6,
  stackByEvent,
  usgSemesterStats,
  exampleLedgerEvent,
  exportLedgerCsv,
} from "../src/lib/ledger";
import { SEED_CLUBS, SEED_LEDGER } from "../src/lib/seed";
import type { LedgerLine } from "../src/lib/types";

describe("ledger", () => {
  it("sample clubs have events with at least three sources", () => {
    for (const club of SEED_CLUBS.filter((c) => ["builders", "dance", "shore"].includes(c.id))) {
      const lines = SEED_LEDGER.filter((l) => l.clubId === club.id);
      const stacks = stackByEvent(lines.filter((l) => l.status !== "declined"), club);
      assert.ok(stacks.length >= 1, club.name);
      const sources = new Set(lines.map((l) => l.source));
      assert.ok(sources.size >= 3, `${club.name} sources=${[...sources]}`);
    }
  });

  it("warns on double coverage of the same item", () => {
    const lines: LedgerLine[] = [
      { id: "1", clubId: "x", eventId: "e", eventTitle: "E", item: "Buses", vendor: "", amount: 600, category: "travel", source: "usg", sourceRef: null, status: "approved", evidence: null, updatedAt: "", history: [] },
      { id: "2", clubId: "x", eventId: "e", eventTitle: "E", item: "Buses", vendor: "", amount: 600, category: "travel", source: "price", sourceRef: null, status: "approved", evidence: null, updatedAt: "", history: [] },
    ];
    assert.deepEqual(doubleCoveredKeys(lines), ["e::buses"]);
    assert.equal(needsSection6(lines, "e"), true);
  });

  it("example ledger is zero dollars and does not inflate USG stats", () => {
    const club = { ...SEED_CLUBS[3], sample: false, receivedThisYear: 0, eventsThisSemester: 0 };
    const ex = exampleLedgerEvent(club.id, "2026-11-15");
    assert.ok(ex.every((l) => l.amount === 0 && l.example));
    const stats = usgSemesterStats(ex, club);
    assert.equal(stats.awarded, 0);
  });

  it("exports csv with a header", () => {
    const csv = exportLedgerCsv(SEED_LEDGER.slice(0, 2));
    assert.match(csv, /^event,item,vendor/);
    assert.ok(csv.split("\n").length >= 3);
  });
});
