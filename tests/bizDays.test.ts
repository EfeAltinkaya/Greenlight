import { test } from "node:test";
import assert from "node:assert/strict";
import { addBusinessDays, businessDaysBetween, isBusinessDay, nextBusinessDay } from "../src/lib/bizDays";
import { followUpDate } from "../src/lib/outreachGuard";
import { fixDeadline } from "../src/lib/decisionGuard";
import type { Application } from "../src/lib/types";

test("addBusinessDays skips Saturday and Sunday", () => {
  // Friday + 1 business day = Monday
  assert.equal(addBusinessDays("2026-11-13", 1), "2026-11-16");
  // Friday + 2 = Tuesday
  assert.equal(addBusinessDays("2026-11-13", 2), "2026-11-17");
});

test("2-business-day fix window matches fixDeadline", () => {
  const app = {
    status: "needs_info",
    history: [{ at: "2026-11-13", status: "needs_info", note: "Returned" }],
  } as Application;
  const due = fixDeadline(app, "2026-11-16");
  assert.ok(due);
  assert.equal(due!.due, "2026-11-17");
  assert.equal(due!.overdue, false);
  assert.equal(fixDeadline(app, "2026-11-18")!.overdue, true);
});

test("follow-up is +5 business days", () => {
  assert.equal(followUpDate("2026-11-10", 5), "2026-11-17");
});

test("isBusinessDay and nextBusinessDay", () => {
  assert.equal(isBusinessDay("2026-11-14"), false); // Saturday
  assert.equal(nextBusinessDay("2026-11-14"), "2026-11-16");
  assert.ok(businessDaysBetween("2026-11-13", "2026-11-17") >= 2);
});
