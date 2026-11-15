import assert from "node:assert/strict";
import { test } from "node:test";
import { buildEventTimeline, exportTimelineIcs } from "../src/lib/eventTimeline";

const EVENT = "2026-11-18";
const byId = (items: ReturnType<typeof buildEventTimeline>, id: string) => items.find((i) => i.id === id);

test("outdoor event: dates count back from the event date", () => {
  const items = buildEventTimeline({ eventDate: EVENT, outdoor: true, today: "2026-09-01" });
  assert.equal(byId(items, "tes-request")?.dueDate, "2026-10-07");
  assert.equal(byId(items, "uepa")?.dueDate, "2026-10-28");
  assert.equal(byId(items, "dps")?.dueDate, "2026-11-04");
  assert.equal(byId(items, "tes-final-payment")?.dueDate, "2026-10-28");
  assert.equal(byId(items, "post-event")?.dueDate, "2026-11-23");
  assert.equal(byId(items, "classroom-requests")?.dueDate, null);
  for (const i of items) assert.ok(i.source.length > 0);
});

test("USG deadline is looked up from USG's sheet, 6 vs 9 weeks", () => {
  assert.equal(byId(buildEventTimeline({ eventDate: EVENT, today: "2026-09-01" }), "usg-application")?.dueDate, "2026-10-07");
  assert.equal(byId(buildEventTimeline({ eventDate: EVENT, needsNineWeeks: true, today: "2026-09-01" }), "usg-application")?.dueDate, "2026-09-16");
});

test("indoor event has no TES items; blackout dates get no invented USG date", () => {
  const items = buildEventTimeline({ eventDate: EVENT, today: "2026-09-01" });
  assert.equal(byId(items, "tes-request"), undefined);
  assert.equal(byId(items, "tes-final-payment"), undefined);
  const blackout = buildEventTimeline({ eventDate: "2026-12-10", today: "2026-09-01" });
  assert.equal(byId(blackout, "usg-application")?.dueDate, null);
});

test("dated items come first in date order; no decision date anywhere", () => {
  const items = buildEventTimeline({ eventDate: EVENT, outdoor: true, today: "2026-09-01" });
  const dated = items.filter((i) => i.dueDate).map((i) => i.dueDate as string);
  assert.deepEqual(dated, [...dated].sort());
  assert.equal(items[items.length - 1].dueDate, null);
  assert.ok(!items.some((i) => /decision|estimated/i.test(i.title)));
});

test(".ics export has one all-day event per dated item", () => {
  const items = buildEventTimeline({ eventDate: EVENT, outdoor: true, today: "2026-09-01" });
  const ics = exportTimelineIcs(items, "Spring Mixer");
  assert.match(ics, /BEGIN:VCALENDAR/);
  assert.equal((ics.match(/BEGIN:VEVENT/g) ?? []).length, items.filter((i) => i.dueDate).length);
  assert.match(ics, /DTSTART;VALUE=DATE:20261007/);
  assert.match(ics, /Spring Mixer/);
});
