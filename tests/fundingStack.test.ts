import { test } from "node:test";
import assert from "node:assert/strict";
import { doubleCoveredLineIds, needsSection6Disclosure } from "../src/lib/fundingStack";
import type { FundingStackEntry } from "../src/lib/types";

const entry = (over: Partial<FundingStackEntry> & Pick<FundingStackEntry, "lineIds">): FundingStackEntry => ({
  id: over.id ?? "e1",
  source: over.source ?? "usg-funding",
  status: over.status ?? "planning",
  amount: over.amount ?? 0,
  lineIds: over.lineIds,
});

test("doubleCoveredLineIds flags lines on more than one source", () => {
  const stack = [
    entry({ id: "a", lineIds: ["i1", "i2"] }),
    entry({ id: "b", source: "gsg", lineIds: ["i2", "i3"] }),
  ];
  assert.deepEqual(doubleCoveredLineIds(stack).sort(), ["i2"]);
  assert.deepEqual(doubleCoveredLineIds([entry({ lineIds: ["i1"] }), entry({ id: "b", lineIds: ["i2"] })]), []);
});

test("needsSection6Disclosure when another USC source covers lines", () => {
  assert.equal(needsSection6Disclosure([entry({ source: "usg-funding", lineIds: ["i1"] })]), false);
  assert.equal(needsSection6Disclosure([entry({ source: "legislative-fund", lineIds: ["i1"] })]), true);
  assert.equal(needsSection6Disclosure([entry({ source: "marshall", lineIds: ["i1"], status: "declined" })]), false);
  assert.equal(needsSection6Disclosure([entry({ source: "sponsors-in-kind", lineIds: ["i1"] })]), false);
});