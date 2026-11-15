import { test } from "node:test";
import assert from "node:assert/strict";
import { didYouMeanVendor, fuzzyVendorSuggestions, shortVendorName } from "../src/lib/vendorMatch";

test("fuzzyVendorSuggestions ranks close spellings", () => {
  const hits = fuzzyVendorSuggestions("Panda Express", { limit: 5 });
  assert.ok(hits.length >= 1);
  assert.ok(hits[0].confidence > 0.4);
  assert.match(hits[0].name, /panda/i);
});

test("didYouMeanVendor never returns an exact listed match (confirm only near-misses)", () => {
  const hits = fuzzyVendorSuggestions("Panda", { limit: 1 });
  assert.ok(hits[0]);
  const exactName = hits[0].name;
  assert.equal(didYouMeanVendor(exactName), null);
  const near = didYouMeanVendor("Panda Expres"); // missing s
  if (near) {
    assert.ok(near.confidence >= 0.55);
    assert.notEqual(near.name.toLowerCase(), "panda expres");
  }
});

test("shortVendorName strips bracketed legal entity", () => {
  assert.equal(shortVendorName("Casablanca Restaurant [Ensueno Corp]"), "Casablanca Restaurant");
});
