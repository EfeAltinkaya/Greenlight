import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { greenlightVerdict, isHardFail } from "../src/lib/verdict";
import { makeRequestId, requestIdOf, subjectTag } from "../src/lib/requestId";
import type { Check } from "../src/lib/types";

const mk = (ruleId: string, level: Check["level"], title = ruleId): Check => ({
  id: ruleId,
  ruleId,
  level,
  title,
  detail: "",
  quote: "q",
  section: "s",
});

describe("greenlightVerdict", () => {
  it("matches when every check passes", () => {
    const v = greenlightVerdict([mk("board", "info"), mk("late", "pass")]);
    assert.equal(v.id, "matches");
    assert.equal(v.clubLabel, "Matches the guidelines");
    assert.equal(v.usgLabel, "Matches");
  });

  it("minor fixes when only warns remain", () => {
    const v = greenlightVerdict([mk("over-4k", "warn"), mk("late", "pass")]);
    assert.equal(v.id, "minor_fixes");
    assert.equal(v.clubLabel, "Matches after 1 fix");
    assert.equal(v.usgLabel, "Minor fixes");
  });

  it("needs back-and-forth for fixable fails such as vendor or food cap", () => {
    const v = greenlightVerdict([mk("vendor-list", "fail"), mk("food-per-person", "fail"), mk("uepa", "fail")]);
    assert.equal(v.id, "back_and_forth");
    assert.match(v.clubLabel, /Matches after 3 fixes/);
    assert.equal(v.usgLabel, "Needs back-and-forth");
  });

  it("will not be funded for hard fails such as a missed deadline", () => {
    const late = mk("late", "fail", "Deadline passed");
    assert.equal(isHardFail(late), true);
    const v = greenlightVerdict([late, mk("vendor-list", "fail")]);
    assert.equal(v.id, "will_not_fund");
    assert.equal(v.clubLabel, "Will not be funded as written");
  });
});

describe("requestId", () => {
  it("builds a stable GL-26-XXXX", () => {
    const a = makeRequestId("abc");
    const b = makeRequestId("abc");
    assert.equal(a, b);
    assert.match(a, /^GL-26-[0-9A-F]{4}$/);
    assert.equal(requestIdOf({ id: "x", requestId: "GL-26-R001" }), "GL-26-R001");
    assert.equal(subjectTag({ id: "x", requestId: "GL-26-R001" }), "[GL-26-R001]");
  });
});
