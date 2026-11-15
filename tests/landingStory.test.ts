// The landing page states these numbers; if the rules engine changes, this fails before the page lies.
import { test } from "node:test";
import assert from "node:assert/strict";
import { FIXES, storyState, type FixId } from "../src/lib/landingStory";

const ALL = FIXES.map((f) => f.id) as FixId[];

test("landing story: as typed, Robotics Build Night has 4 red lights and a passed 9-week deadline", () => {
  const s = storyState([]);
  assert.equal(s.fixes, 4);
  assert.equal(s.total, 5300);
  assert.deepEqual(s.deadline, { date: "2026-11-11", daysLeft: -4, passed: true, nine: true });
  const red = s.checks.filter((c) => c.level === "fail").map((c) => c.ruleId).sort();
  assert.deepEqual(red, ["food-per-person", "ineligible-gift", "late", "vendor-list"]);
});

test("landing story: the three one-click fixes clear every red light and open the Nov 18 deadline", () => {
  const s = storyState(ALL);
  assert.equal(s.fixes, 0);
  assert.equal(s.total, 4000);
  assert.deepEqual(s.deadline, { date: "2026-11-18", daysLeft: 3, passed: false, nine: false });
  assert.ok(s.checks.some((c) => c.ruleId === "other-university-funding" && c.level === "warn"), "Viterbi SOS stacking stays an amber check");
});

test("landing story: the switch to a listed caterer alone fixes the deadline", () => {
  assert.equal(storyState(["vendor"]).deadline?.passed, false);
  assert.equal(storyState(["cap", "gifts"]).deadline?.passed, true);
});
