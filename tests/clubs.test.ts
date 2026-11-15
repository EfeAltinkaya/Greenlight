import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { isSeedClub, switchableClubs, visibleClubs } from "../src/lib/clubs";
import { SEED_CLUBS } from "../src/lib/seed";
import type { Club } from "../src/lib/types";

const testClub = (p: Partial<Club> & Pick<Club, "id" | "name">): Club => ({
  school: "Other",
  startupEligible: false,
  receivedThisYear: 0,
  eventsThisSemester: 0,
  ...p,
});

describe("visibleClubs", () => {
  it("keeps seed clubs and drops officer-less test clubs", () => {
    const mixed = [
      ...SEED_CLUBS,
      testClub({ id: "a", name: "a", hasOfficers: false }),
      testClub({ id: "rpl", name: "RPL", hasOfficers: false }),
      testClub({ id: "hacksc", name: "HackSC", hasOfficers: true }),
    ];
    const v = visibleClubs(mixed);
    assert.ok(v.every((c) => c.id !== "a" && c.id !== "rpl"));
    assert.ok(v.some((c) => c.id === "hacksc"));
    assert.ok(v.some((c) => c.id === "builders"));
  });

  it("switchableClubs returns only seed clubs when present", () => {
    const mixed = [...SEED_CLUBS, testClub({ id: "x", name: "Test Robotics Club", hasOfficers: true })];
    const s = switchableClubs(mixed);
    assert.equal(s.length, SEED_CLUBS.length);
    assert.ok(s.every(isSeedClub));
  });
});
