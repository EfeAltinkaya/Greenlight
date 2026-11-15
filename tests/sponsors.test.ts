import { test } from "node:test";
import assert from "node:assert/strict";
import { needsFrom, rankSponsors } from "../src/lib/sponsorMatch";
import { SPONSORS } from "../src/data/sponsors";

test("needs are read from sponsor ask names", () => {
  assert.deepEqual(needsFrom(["Catering above $35 per person", "Gift cards for winners", "Amazon swag"]).sort(), ["food", "prizes", "swag"]);
});

test("engineering audience plus food ranks engineering employers that give food first", () => {
  const r = rankSponsors(SPONSORS, ["Mechanical Engineering", "Aerospace Engineering"], ["food"]);
  assert.ok(["northrop", "boeing"].includes(r[0].sponsor.id), r[0].sponsor.id);
  assert.ok(r[0].sponsor.inKind.includes("food"));
  assert.ok(r[0].reasons.some((x) => x.startsWith("Hires")));
  assert.ok(r[0].reasons.includes("USC tie on record"));
});

test("business audience ranks consulting and finance above aerospace", () => {
  const r = rankSponsors(SPONSORS, ["Business", "Accounting"], ["food"]).map((m) => m.sponsor.id);
  assert.ok(r.indexOf("deloitte") < r.indexOf("spacex"));
});

test("every USC tie has a source link", () => {
  for (const s of SPONSORS) if (s.tie) assert.ok(s.tieSource?.startsWith("https://"), s.name);
});
