import { test } from "node:test";
import assert from "node:assert/strict";
import { outreachTemplate, outreachFacts } from "../src/lib/ai";
import { followUpAllowed, outreachProblems } from "../src/lib/outreachGuard";
import { SPONSORS } from "../src/data/sponsors";
import type { EventInfo, SponsorPackage } from "../src/lib/types";

const event: EventInfo = { title: "Robotics Build Night", type: "workshop", date: "2027-02-18", location: "Ginsburg", onCampus: true, attendance: 120, openToAll: true, ticketed: false, privateResidence: false, travel: false, international: false, food: true, description: "", board: "professional", boardReason: "" };
const pkg: SponsorPackage = { title: "Prizes", covers: "Prizes for the top three teams", amount: 450, offer: ["Logo on event slides"] };

test("the plain template passes every check, with and without a USC tie", () => {
  for (const sponsor of [SPONSORS.find((s) => s.tie)!, SPONSORS.find((s) => !s.tie)!]) {
    const input = { sponsor, pkg, event, clubName: "Trojan Builders Society" };
    assert.deepEqual(outreachProblems(outreachTemplate(input), outreachFacts(input)), [], sponsor.name);
  }
});

test("filler, invented amounts, placeholders and unsourced USC claims are caught", () => {
  const sponsor = SPONSORS.find((s) => !s.tie)!;
  const facts = outreachFacts({ sponsor, pkg, event, clubName: "Club" });
  const body = `Hi team, I wanted to reach out about Robotics Build Night. As USC alumni at ${sponsor.name} you know us. Could you give $5,000 toward it? It would be a win-win for both of us and we can talk at [TIME]. Thanks so much for considering it and for reading this far.`;
  const p = outreachProblems({ subject: "Robotics Build Night", body }, facts);
  assert.ok(p.some((x) => /Filler/.test(x)));
  assert.ok(p.some((x) => /\$5000/.test(x)));
  assert.ok(p.some((x) => /\[TIME\]/.test(x)));
  assert.ok(p.some((x) => /USC connection/.test(x)));
});

test("a reply may not commit to a day the officer never gave", () => {
  const sponsor = SPONSORS[0];
  const base = { ...outreachFacts({ sponsor, pkg, event, clubName: "Club" }), eventTitle: "" };
  const body = `Hi Sam, thank you for getting back to me about ${sponsor.name} covering the prizes. Thursday at 3pm works for a call, and I will send the budget then. Thank you, [Your name]`;
  assert.ok(outreachProblems({ subject: "Re: prizes", body }, { ...base, given: "yes a call works, send budget" }).some((x) => /commits to/.test(x)));
  assert.deepEqual(outreachProblems({ subject: "Re: prizes", body }, { ...base, given: "yes thursday 3pm works, send budget" }), []);
});

test("follow-ups only while a company is still at Emailed, never after a reply", () => {
  assert.equal(followUpAllowed("emailed", "2026-11-10", "2026-11-14"), true);
  assert.equal(followUpAllowed("replied", "2026-11-10", "2026-11-14"), false);
  assert.equal(followUpAllowed("emailed", "2026-11-20", "2026-11-14"), false);
});
