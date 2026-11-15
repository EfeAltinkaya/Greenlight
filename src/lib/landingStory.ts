// The one event the landing page follows: Robotics Build Night, a made-up Trojan Builders request.
// Every verdict, deadline and total on the landing comes from the real rules engine run on this sample.
import { lookupDeadline, needsNineWeeks, requestTotal, runChecks, score } from "./engine";
import type { Application, Check, Club, LineItem } from "./types";

export const STORY_TODAY = "2026-11-15";

export const STORY_CLUB: Club = { id: "story-builders", name: "Trojan Builders", school: "Viterbi", startupEligible: false, receivedThisYear: 0, eventsThisSemester: 0, sample: true };

export const STORY_TEXT =
  "Robotics Build Night, Thursday Feb 18 in Ronald Tutor Hall. 80 students build and race small robots. Chipotle for dinner, about $45 a head. Wire, solder and batteries, around $1,200. Gift cards for the top three teams, $500.";

const line = (o: Partial<LineItem> & Pick<LineItem, "id" | "item" | "category" | "quantity" | "unitPrice">): LineItem => ({
  vendor: "", link: "", justification: "", orderBy: "", estimate: false, toSponsor: false, total: o.quantity * o.unitPrice, ...o,
});

const BASE: Application = {
  id: "story", clubId: STORY_CLUB.id, sample: true, createdAt: STORY_TODAY, submittedAt: null, status: "draft", history: [], aiComments: [], decision: null, sponsorPlan: null,
  uepa: "A12345", docs: { quotes: true, healthPermit: true, coi: true }, answers: { description: "Teams of four build and race small robots in one evening, with mentors from local engineering companies.", missionFit: "Hands-on engineering for any USC student.", otherSources: "Viterbi SOS for food above USG's limit; a sponsor for prizes." },
  event: { title: "Robotics Build Night", type: "engineering workshop", date: "2027-02-18", location: "Ronald Tutor Hall", onCampus: true, attendance: 80, openToAll: true, ticketed: false, privateResidence: false, travel: false, international: false, food: true, description: "Hands-on night where teams build and race small robots.", board: "professional", boardReason: "Hands-on engineering skills fit the Professional/Academic board." },
  items: [],
};

export type FixId = "cap" | "vendor" | "gifts";

export const FIXES: { id: FixId; label: string; done: string }[] = [
  { id: "cap", label: "Cap food at $35 a person", done: "Food capped at $35 a person. The other $800 goes to Viterbi SOS." },
  { id: "vendor", label: "Switch to a caterer on USG's list", done: "Panda Catering is on USG's Vendor List, so the 6-week deadline applies." },
  { id: "gifts", label: "Move gift cards to a sponsor", done: "Gift cards are off the USG request and on the sponsor list." },
];

export function storyApp(fixed: FixId[] = []): Application {
  const has = (f: FixId) => fixed.includes(f);
  const items = [
    line({ id: "food", item: "Dinner for 80", vendor: has("vendor") ? "Panda Catering" : "Chipotle", category: "food", quantity: 80, unitPrice: has("cap") ? 35 : 45 }),
    line({ id: "supplies", item: "Wire, solder and batteries", vendor: "Parts supplier", vendorConfirmed: true, category: "supplies", quantity: 1, unitPrice: 1200 }),
    line({ id: "gifts", item: "Gift cards for the top three teams", vendor: "", category: "gift", quantity: 1, unitPrice: 500, toSponsor: has("gifts") }),
  ];
  return { ...BASE, items };
}

export type StoryState = {
  checks: Check[];
  fixes: number;
  warns: number;
  total: number;
  deadline: { date: string; daysLeft: number; passed: boolean; nine: boolean } | null;
};

export function storyState(fixed: FixId[] = []): StoryState {
  const app = storyApp(fixed);
  const checks = runChecks(app, STORY_CLUB, STORY_TODAY);
  const s = score(checks);
  const nine = needsNineWeeks(app);
  const d = lookupDeadline(app.event.date, nine, STORY_TODAY);
  return {
    checks,
    fixes: s.fail,
    warns: s.warn,
    total: requestTotal(app),
    deadline: d.kind === "ok" ? { date: d.deadline, daysLeft: d.daysLeft, passed: d.passed, nine } : null,
  };
}
