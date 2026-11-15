import { test } from "node:test";
import assert from "node:assert/strict";
import { betaSample, learn, rerank, rng, tally } from "../src/lib/sponsorLearning";
import { rankSponsors } from "../src/lib/sponsorMatch";
import type { Sponsor } from "../src/data/sponsors";

const co = (id: string, over: Partial<Sponsor> = {}): Sponsor => ({ id, name: id.toUpperCase(), industry: "Aerospace", hires: ["Mechanical Engineering"], la: "", tie: null, tieSource: null, inKind: ["prizes"], ...over });
const row = (sponsorId: string, status: "replied" | "committed" | "declined" | "emailed", updatedAt = "2026-11-10") => ({ sponsorId, status, updatedAt });

test("outcomes: replies and commitments count as hits; declines and 14 silent days as misses", () => {
  const t = tally([row("a", "replied"), row("a", "committed"), row("b", "declined"), row("c", "emailed", "2026-10-20"), row("d", "emailed", "2026-11-10")], "2026-11-14");
  assert.deepEqual(t, { a: { replies: 2, misses: 0 }, b: { replies: 0, misses: 1 }, c: { replies: 0, misses: 1 } });
});

test("a company that keeps replying rises above an equal fit that keeps ignoring clubs", () => {
  const pool = [co("a"), co("b"), co("c")];
  const tallies = { a: { replies: 6, misses: 1 }, b: { replies: 0, misses: 7 } };
  const learned = learn(pool, tallies, "club-2026-11-14");
  assert.ok(learned.a.mean > 0.7 && learned.b.mean < 0.25, `${learned.a.mean} ${learned.b.mean}`);
  const order = rerank(rankSponsors(pool, ["Mechanical Engineering"], ["prizes"]), learned).map((m) => m.sponsor.id);
  // C has no history, so on some days it is tried first (exploration); A always beats B.
  assert.ok(order.indexOf("a") < order.indexOf("b"), order.join());
  assert.equal(order.at(-1), "b");
  // Across many days A outranks the unknown C more often than not, because its record is strong.
  const wins = Array.from({ length: 200 }, (_, i) => rerank(rankSponsors(pool, ["Mechanical Engineering"], ["prizes"]), learn(pool, tallies, "d" + i)).findIndex((m) => m.sponsor.id === "a") === 0).filter(Boolean).length;
  assert.ok(wins > 100, String(wins));
});

test("a new company borrows from similar ones: same industry and USC-tie status", () => {
  const pool = [co("old1"), co("old2"), co("fresh"), co("other", { industry: "Finance" })];
  const learned = learn(pool, { old1: { replies: 5, misses: 0 }, old2: { replies: 4, misses: 1 } }, "s");
  assert.equal(learned.fresh.seen, 0);
  assert.ok(learned.fresh.mean > learned.other.mean, "fresh aerospace company inherits the aerospace reply rate");
  assert.match(learned.fresh.basis, /similar companies/);
});

test("ranking is stable for a club on a given day and explores when evidence is thin", () => {
  const pool = [co("a"), co("b")];
  const one = learn(pool, {}, "builders-2026-11-14");
  const two = learn(pool, {}, "builders-2026-11-14");
  assert.equal(one.a.sample, two.a.sample);
  // With no data both are uncertain, so samples spread widely across days (exploration).
  const samples = Array.from({ length: 200 }, (_, i) => learn(pool, {}, "d" + i).a.sample);
  assert.ok(Math.min(...samples) < 0.2 && Math.max(...samples) > 0.8);
});

test("Beta sampler matches the known mean a/(a+b)", () => {
  const r = rng("beta");
  const n = 4000;
  let s = 0;
  for (let i = 0; i < n; i++) s += betaSample(3, 7, r);
  assert.ok(Math.abs(s / n - 0.3) < 0.02, String(s / n));
});
