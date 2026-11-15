// Example data so every screen has something real to show. All clubs and requests are made up
// and marked as samples; no real student data.
import type { Application, Club, Deal, LineItem, Offer, Outreach } from "./types";

export const DEMO_CLUB_ID = "builders";

export const SEED_CLUBS: Club[] = [
  { id: "builders", name: "Trojan Builders Society", school: "Viterbi", startupEligible: false, receivedThisYear: 3500, eventsThisSemester: 1 },
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
  vendorConfirmed: true, // sample clubs already checked their non-food vendors
  ...p,
});

const base = (o: Partial<Application> & Pick<Application, "id" | "clubId" | "event" | "items">): Application => ({
  requestId: ({
    "s-robotics": "GL-26-R001",
    "s-dance": "GL-26-D002",
    "s-shore": "GL-26-S003",
    "s-fintech": "GL-26-F004",
    "s-chess": "GL-26-C005",
  } as Record<string, string>)[o.id] ?? `GL-26-${o.id.slice(-4).toUpperCase()}`,
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
    id: "s-robotics",
    clubId: "builders",
    event: { title: "Robotics Build Night", type: "engineering workshop", date: "2026-12-03", location: "Ronald Tutor Hall", onCampus: true, attendance: 80, openToAll: true, ticketed: false, privateResidence: false, travel: false, international: false, food: true, description: "Hands-on night where teams build and race small robots, with mentors from local engineering companies.", board: "professional", boardReason: "Hands-on engineering skills fit the Professional/Academic board." },
    items: [
      li({ item: "Robot kits (single use)", vendor: "Amazon", total: 1200, category: "supplies", justification: "Parts each team uses during the build" }),
      li({ item: "Dinner", vendor: "Panda Catering", quantity: 80, unitPrice: 35, total: 2800, category: "food", justification: "Dinner for an evening build session" }),
      li({ item: "Prizes for the top three teams", vendor: "", total: 450, category: "gift", toSponsor: true }),
      li({ item: "Club t-shirts for volunteers", vendor: "Campus Custom Tees", quantity: 30, unitPrice: 15, total: 450, category: "tshirt", toSponsor: true }),
    ],
    docs: { budget: true, quotes: true, esr: true, healthPermit: true, fbForm: true, cart: true, wishlist: true, inkind: false },
    status: "partial",
    submittedAt: "2026-10-14",
    history: [
      { at: "2026-10-14", status: "submitted", note: "Submitted to USG" },
      { at: "2026-10-16", status: "in_review", note: "Opened by the Professional/Academic director" },
      { at: "2026-10-21", status: "partial", note: "Partly funded: $3,500. Explanation emailed to the club." },
    ],
    decision: { outcome: "partial", amount: 3500, reasonCode: "over-4k", email: "Your request was partly funded: $3,500 of $4,000, covering dinner and most of the kits. Events over $4,000 are reviewed case by case (Section 3).", sentAt: "2026-10-21" },
  }),
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

export const SEED_OUTREACH: Outreach[] = [
  { id: "o1", clubId: "builders", appId: "s-robotics", sponsorId: "northrop", packageTitle: "Prizes for the top three teams", amount: 450, status: "emailed", contactName: "", contactInfo: "", notes: "Sample: emailed the university recruiting inbox.", committed: 0, followUp: "2026-11-12", updatedAt: "2026-11-07", email: null },
  { id: "o2", clubId: "builders", appId: "s-robotics", sponsorId: "spacex", packageTitle: "Club t-shirts for volunteers", amount: 450, status: "shortlist", contactName: "", contactInfo: "", notes: "", committed: 0, followUp: "", updatedAt: "2026-11-07", email: null },
];

// Sample sponsor offers from made-up local businesses (clearly labeled), so the portal is not empty.
export const SEED_OFFERS: Offer[] = [
  { id: "of1", sponsorName: "Sample: Westside Robotics Supply", sponsorEmail: "sponsor@example.com", title: "Parts and prizes for build nights", themes: ["engineering", "robotics", "hackathon"], majors: ["Mechanical Engineering", "Electrical Engineering", "Computer Science"], windowStart: "2026-11-01", windowEnd: "2027-04-30", gives: "Robot kits, tools and prizes, shipped to the club or paid to the vendor", maxAmount: 800, asks: ["Logo on event slides", "5-minute demo of our kits", "Photos for our newsletter"], createdAt: "2026-11-02", sample: true },
  { id: "of2", sponsorName: "Sample: Figueroa Coffee Roasters", sponsorEmail: "sponsor@example.com", title: "Coffee and pastries for morning events", themes: ["networking", "workshop", "career"], majors: [], windowStart: "2026-11-15", windowEnd: "2027-05-01", gives: "Coffee service for up to 100 people, delivered", maxAmount: 400, asks: ["Mention in the event recap", "Table card with our name"], createdAt: "2026-11-05", sample: true },
  { id: "of3", sponsorName: "Sample: Pacific Stagecraft Rentals", sponsorEmail: "sponsor@example.com", title: "Lighting and sound for student performances", themes: ["dance", "concert", "showcase", "film"], majors: ["Music and Dance", "Cinematic Arts"], windowStart: "2027-01-15", windowEnd: "2027-04-30", gives: "Discounted lighting and sound rental, paid to the venue", maxAmount: 1200, asks: ["Logo in the program", "Thank-you from the stage"], createdAt: "2026-11-08", sample: true },
];

export const SEED_DEALS: Deal[] = [
  { id: "d-sample", offerId: "of1", clubId: "builders", appId: "s-robotics", sponsorName: "Sample: Westside Robotics Supply", sponsorEmail: "sponsor@example.com", stage: "details_sent", amount: 450, covers: "Prizes for the top three teams", deliverables: ["Logo on event slides", "5-minute demo of our kits"], message: "We'd love to cover prizes for Robotics Build Night.", contract: null, invoice: null, recap: "",
    history: [
      { at: "2026-11-09", stage: "requested", note: "Club asked for details on prizes", by: "club" },
      { at: "2026-11-11", stage: "details_sent", note: "We can cover $450 of prizes. We'd like a 5-minute kit demo.", by: "sponsor" },
    ] },
];
