// USG Funding Department rules, 2026-27, written as data.
// Source: "26-27 Funding Department Guidelines" (current as of Oct 21, 2026), the 2026-27
// Application Breakdown slides, and FundingSampleApp_26_27.pdf, all linked from usg.usc.edu/branches/funding.
// Every quote below is copied from those documents so the app can cite it word for word.

export type BoardId = "professional" | "philanthropy" | "social" | "arts";

export const GUIDELINES_URL =
  "https://docs.google.com/document/d/1noJFJ4SxrFGD1Zm-6EqUHpXSIOUuFIL-gIobWXcXCt0/edit";

export const BOARDS: Record<BoardId, { name: string; formName: string; short: string; quote: string; fy26Budget: number; fy26Used: number }> = {
  professional: {
    name: "Professional/Academic Research Fund",
    formName: "Professional Academic Research Fund",
    short: "Professional",
    quote:
      "shall provide funding for events programmed by recognized student organizations that help educate and advance students' future professional careers and academic research projects",
    fy26Budget: 112000,
    fy26Used: 1.05,
  },
  philanthropy: {
    name: "Philanthropy Fund",
    formName: "Philanthropy Fund",
    short: "Philanthropy",
    quote: "shall provide funding for community service projects sponsored by recognized student organizations",
    fy26Budget: 40000,
    fy26Used: 0.94,
  },
  social: {
    name: "Social and Recreation/Startup Fund",
    formName: "Social, Recreational, and Startup Fund",
    short: "Social & Startup",
    quote:
      "shall provide funding for events programmed by recognized student organizations to celebrate, highlight, or foster a sense of community for the student group and student organizations first registered with the Office of Campus Activities within the last two academic semesters",
    fy26Budget: 110000,
    fy26Used: 0.93,
  },
  arts: {
    name: "Performing and Visual Arts Fund",
    formName: "Performing, Visual Arts, & Cultural Fund",
    short: "Arts & Cultural",
    quote:
      "shall provide funding for events geared towards the arts programmed by recognized student organizations to celebrate, highlight, or foster a sense of community",
    fy26Budget: 100000,
    fy26Used: 1.0,
  },
};

export type Rule = { id: string; section: string; quote: string };

export const RULES = {
  annualCap: {
    id: "annual-cap",
    section: "Section 3",
    quote: "Individual organizations may receive a maximum of $8,000 from the USG Funding Department per year.",
    limit: 8000,
  },
  eventsPerSemester: {
    id: "events-per-semester",
    section: "Application Breakdown, slide 4",
    quote: "Individual organizations can receive a maximum of $8,000 per year but up to 4 events per semester",
    limit: 4,
  },
  venueCap: {
    id: "venue-cap",
    section: "Section 3",
    quote:
      "The USG Funding Department will provide funding for up to $4,000 of the total cost associated with on-campus venue rentals and personnel.",
    limit: 4000,
  },
  overFourK: {
    id: "over-4k",
    section: "Section 3",
    quote: "Events with expenses over $4,000 will be reviewed on a case-by-case basis to ensure effective use of funding.",
    limit: 4000,
  },
  foodPerPerson: {
    id: "food-per-person",
    section: "Section 5",
    quote: "Food requests should not exceed a $35 per person maximum based on expected attendance",
    limit: 35,
  },
  foodDocs: {
    id: "food-docs",
    section: "Section 5",
    quote: "RSOs must provide a Health Permit and Certificate of Insurance from the Food Vendor.",
  },
  foodWhy: {
    id: "food-why",
    section: "Section 5",
    quote: "Additional information detailing why food is necessary and how it aligns with the event's purpose is required",
  },
  hotelPerNight: {
    id: "hotel-per-night",
    section: "Section 5",
    quote: "Rooms cannot exceed $400 per night.",
    limit: 400,
  },
  hotelCompare: {
    id: "hotel-compare",
    section: "Section 5",
    quote: "Proof of price comparison with other hotels is required for hotel expenses.",
  },
  vendorList: {
    id: "vendor-list",
    section: "Section 1",
    quote: "Applicants must verify vendor status before submitting their application. ... We will not accept a vendor not on the list.",
  },
  openToAll: {
    id: "open-to-all",
    section: "Section 5",
    quote: "On-campus events that are not open to all students",
  },
  ticketSales: { id: "ticket-sales", section: "Section 5", quote: "Events that include ticket sales" },
  privateResidence: { id: "private-residence", section: "Section 5", quote: "Events occurring in private residences" },
  internationalTravel: { id: "international-travel", section: "Section 5", quote: "International travel" },
  travelPurpose: {
    id: "travel-purpose",
    section: "Section 2",
    quote:
      "Applications requesting funding for travel expenses must include a clear statement of purpose that outlines the reasoning for the travel",
  },
  tshirts: {
    id: "tshirt-vendor",
    section: "Section 4",
    quote: "T-Shirts funded by USG may only be produced by a vendor who is authorized to work with USC Trademarks.",
  },
  startupMerch: {
    id: "startup-merch",
    section: "Section 4",
    quote:
      "student organizations first registered with the Office of Campus Activities within the last two academic semesters (fall or spring) for the use of promotion and membership recruitment",
  },
  blackout: {
    id: "blackout",
    section: "Sample application, Application Timelines",
    quote:
      "Applications for events between December 5, 2026 and January 12, 2027, as well as events after May 1, 2027, will not be considered or approved.",
  },
  uepa: {
    id: "uepa",
    section: "Sample application, Event Details",
    quote:
      "A UEPA is required anytime university funds are being used, food is part of an event, and/or any event with 25 or more people.",
  },
  late: {
    id: "late",
    section: "Section 1",
    quote: "If this deadline is not met the application will be automatically denied.",
  },
  otherFunding: {
    id: "other-university-funding",
    section: "Section 6",
    quote: "RSO receiving funding from another University income source",
  },
} as const;

// Items USG never funds (Section 5, "The following are not eligible for funding").
// Keys are the categories the AI assigns to each budget line.
export const INELIGIBLE: Record<string, { label: string; quote: string }> = {
  reimbursement: { label: "Reimbursement", quote: "Any reimbursements" },
  charity: { label: "Payment or donation to charity", quote: "Payments or donations to charity" },
  alcohol: { label: "Alcohol", quote: "Alcoholic beverages" },
  gift: { label: "Gift or gift card", quote: "Gifts and gift cards" },
  durable: { label: "Durable good", quote: "Durable goods (Items that are not for one-time use such as electronics, uniforms, etc.)" },
  raw_food: { label: "Raw food", quote: "Raw food items requiring refrigeration and/or preparation" },
  restaurant_dinner: { label: "Restaurant dinner", quote: "Restaurant diners" },
  rideshare: { label: "Rideshare or rental car", quote: "Rideshare costs (Uber, Lyft, Buses, Vans, Amtrak cabins, Car rentals, etc.)" },
  deposit: { label: "Refundable deposit", quote: "Any refundable deposits and fees pertaining to cleaning/damage" },
  p2p: { label: "Peer-to-peer payment", quote: "Peer to Peer Payments (Airbnb, VRBO, PayPal, Zelle, CashApp, etc.)" },
  performer: { label: "Talent or performer fee", quote: "Payments to talent or performers" },
  subscription: { label: "Subscription", quote: "Monthly Subscriptions/Payments" },
  jewelry: { label: "Jewelry", quote: "Jewelry" },
  balloons: { label: "Balloons", quote: "Balloons" },
};

// Categories the AI may assign to a budget line. Code, not the model, decides what each one means.
export const ITEM_CATEGORIES = [
  "food",
  "venue",
  "personnel",
  "lodging",
  "airfare",
  "registration",
  "promo_merch",
  "tshirt",
  "printing",
  "supplies",
  "rental",
  "other",
  ...Object.keys(INELIGIBLE),
] as const;
export type ItemCategory = (typeof ITEM_CATEGORIES)[number];
