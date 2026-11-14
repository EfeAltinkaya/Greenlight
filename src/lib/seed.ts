// Example data so every screen has something real to show. All clubs and requests are made up
// and marked as samples; no real student data.
import type { Application, Club, LineItem } from "./types";

export const DEMO_CLUB_ID = "builders";

export const SEED_CLUBS: Club[] = [
  { id: "builders", name: "Trojan Builders Society", school: "Viterbi", startupEligible: false, receivedThisYear: 2000, eventsThisSemester: 1 },
  { id: "dance", name: "Southside Dance Collective", school: "Other", startupEligible: false, receivedThisYear: 4500, eventsThisSemester: 2 },
  { id: "shore", name: "Shoreline Service Club", school: "Dornsife", startupEligible: false, receivedThisYear: 600, eventsThisSemester: 1 },
  { id: "fintech", name: "Marshall Fintech Circle", school: "Marshall", startupEligible: false, receivedThisYear: 0, eventsThisSemester: 0 },
  { id: "chess", name: "Knight Moves Chess Club", school: "Other", startupEligible: true, receivedThisYear: 0, eventsThisSemester: 0 },
];

let k = 0;
const li = (p: Partial<LineItem> & Pick<LineItem, "item" | "total" | "category">): LineItem => ({
  id: "s" + k++,
  vendor: "",
  link: "",
  justification: "",
  quantity: 1,
  unitPrice: p.total,
  orderBy: "",
  estimate: false,
  toSponsor: false,
  ...p,
});

const base = (o: Partial<Application> & Pick<Application, "id" | "clubId" | "event" | "items">): Application => ({
  sample: true,
  answers: { description: o.event.description, missionFit: "It is free and open to all USC students and is one of our main events this semester, which is how we reach new members.", otherSources: "N/A" },
  docs: { budget: true, quotes: true, esr: true },
  uepa: "A20481",
  status: "submitted",
  createdAt: "2026-11-02",
  submittedAt: "2026-11-11",
  history: [{ at: "2026-11-11", status: "submitted", note: "Submitted to USG" }],
  aiComments: [],
  decision: null,
  sponsorPlan: null,
  ...o,
});

export const SEED_APPS: Application[] = [
  base({
    id: "s-dance",
    clubId: "dance",
    event: { title: "Winter Showcase", type: "dance showcase", date: "2027-02-25", location: "Bovard Auditorium", onCampus: true, attendance: 600, openToAll: true, ticketed: false, privateResidence: false, travel: false, international: false, food: false, description: "Annual student dance showcase with eight student crews, free and open to all USC students.", board: "arts", boardReason: "A performance that celebrates student artists fits the arts board." },
    items: [
      li({ item: "Bovard Auditorium rental", vendor: "Trojan Event Services", total: 3600, category: "venue", justification: "Venue large enough for 600 students" }),
      li({ item: "Lighting technician", vendor: "Trojan Event Services", total: 600, category: "personnel", justification: "Required staff for the stage lights" }),
      li({ item: "Programs and posters", vendor: "USC Print Services", total: 280, category: "printing", justification: "Promotion and printed programs" }),
    ],
  }),
  base({
    id: "s-shore",
    clubId: "shore",
    event: { title: "Ballona Creek Cleanup", type: "community service", date: "2027-03-04", location: "Ballona Creek, Culver City", onCampus: false, attendance: 40, openToAll: true, ticketed: false, privateResidence: false, travel: false, international: false, food: true, description: "Hands-on creek cleanup with the city's volunteer program, followed by lunch.", board: "philanthropy", boardReason: "Hands-on community service matches the Philanthropy Fund." },
    items: [
      li({ item: "Gloves, bags and grabbers (single use)", vendor: "Amazon", total: 320, category: "supplies", justification: "Cleanup supplies for 40 volunteers" }),
      li({ item: "Boxed lunches", vendor: "Panda Catering", quantity: 40, unitPrice: 15, total: 600, category: "food", justification: "Lunch after a four-hour cleanup" }),
    ],
    docs: { budget: true, quotes: true, wishlist: true, cart: true, healthPermit: true, fbForm: true },
    submittedAt: "2026-11-11",
  }),
  base({
    id: "s-fintech",
    clubId: "fintech",
    event: { title: "Fintech Industry Night", type: "networking", date: "2027-03-11", location: "Jill and Frank Fertitta Hall", onCampus: true, attendance: 90, openToAll: true, ticketed: false, privateResidence: false, travel: false, international: false, food: true, description: "Panel and networking night with three fintech practitioners.", board: "professional", boardReason: "Professional development and networking fit the Professional/Academic board." },
    items: [
      li({ item: "Catered dinner", vendor: "Chipotle", quantity: 90, unitPrice: 28, total: 2520, category: "food", justification: "Dinner for attendees during networking" }),
      li({ item: "Speaker thank-you gifts", vendor: "USC Bookstore", total: 150, category: "gift", justification: "Thank-you gifts for panelists" }),
    ],
    docs: { budget: true, quotes: false, esr: true },
    uepa: "",
    status: "needs_info",
    history: [
      { at: "2026-11-04", status: "submitted", note: "Submitted to USG" },
      { at: "2026-11-06", status: "needs_info", note: "Returned: quotes and UEPA missing. 2 business days to fix." },
    ],
    submittedAt: "2026-11-04",
  }),
  base({
    id: "s-chess",
    clubId: "chess",
    event: { title: "First Moves Recruitment Mixer", type: "recruitment social", date: "2027-02-04", location: "Tutor Campus Center", onCampus: true, attendance: 60, openToAll: true, ticketed: false, privateResidence: false, travel: false, international: false, food: true, description: "Open chess night to recruit new members, with pizza and club t-shirts.", board: "social", boardReason: "A new club recruiting members fits the Startup fund." },
    items: [
      li({ item: "Pizza", vendor: "Yameel Pizza", quantity: 60, unitPrice: 12, total: 720, category: "food", justification: "Food for 60 guests" }),
      li({ item: "Club t-shirts", vendor: "Campus Custom Tees", quantity: 50, unitPrice: 14, total: 700, category: "tshirt", justification: "Recruitment shirts for new members" }),
    ],
    docs: { budget: true, quotes: true, esr: true, healthPermit: true, fbForm: true },
    status: "in_review",
    history: [
      { at: "2026-11-11", status: "submitted", note: "Submitted to USG" },
      { at: "2026-11-12", status: "in_review", note: "Opened by the Social & Startup director" },
    ],
  }),
];
