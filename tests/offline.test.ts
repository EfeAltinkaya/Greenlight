import { test } from "node:test";
import assert from "node:assert/strict";
import { offlineIntake } from "../src/lib/ai";

test("offline intake parses the demo sentence", () => {
  const r = offlineIntake("Hackathon for 120 students in Ginsburg Hall on Feb 18. Catering from Chipotle $5,400, Amazon swag $600, $600 in gift cards for winners.", "2026-11-14");
  assert.equal(r.event.date, "2027-02-18");
  assert.equal(r.event.attendance, 120);
  assert.equal(r.board, "professional");
  console.log(JSON.stringify(r.items));
  assert.equal(r.items.length >= 2, true);
  assert.equal(r.items.find((i) => i.category === "food")?.total, 5400);
});
