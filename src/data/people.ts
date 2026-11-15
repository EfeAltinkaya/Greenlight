import type { BoardId } from "@/data/rules";

export const ROSTER_SOURCE =
  "https://docs.google.com/spreadsheets/d/1ETOTjL6zybDigD3NXk5JVfYrMYInox85SsWf3DqGfpw/htmlview";
export const ROSTER_AS_OF = "2026-11-14";

export type Weekday = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

export type OfficeSlot = { day: Weekday; start: string; end: string };

export type PersonRole =
  | "director"
  | "associate_director"
  | "delegate"
  | "senior_executive_aide"
  | "executive_aide";

export type Person = {
  name: string;
  email: string;
  role: PersonRole;
  board?: BoardId;
  officeHours: OfficeSlot[];
};

export const generalEmail = "usgfunds@usc.edu";

export const PEOPLE: Person[] = [
  {
    name: "Niharra Chandrasena",
    email: "nschandr@usc.edu",
    role: "director",
    board: "professional",
    officeHours: [
      { day: "Mon", start: "09:00", end: "11:00" },
      { day: "Tue", start: "15:30", end: "19:00" },
      { day: "Wed", start: "12:00", end: "14:00" },
      { day: "Thu", start: "15:30", end: "18:00" },
    ],
  },
  {
    name: "Kim Sales",
    email: "ksales@usc.edu",
    role: "associate_director",
    board: "professional",
    officeHours: [
      { day: "Mon", start: "14:00", end: "16:00" },
      { day: "Tue", start: "12:00", end: "14:00" },
      { day: "Tue", start: "16:00", end: "19:00" },
      { day: "Thu", start: "16:00", end: "17:00" },
    ],
  },
  {
    name: "Anoushey Saquib",
    email: "asaquib@usc.edu",
    role: "director",
    board: "philanthropy",
    officeHours: [
      { day: "Mon", start: "12:00", end: "14:00" },
      { day: "Tue", start: "15:00", end: "17:00" },
      { day: "Wed", start: "12:00", end: "14:00" },
      { day: "Wed", start: "15:30", end: "17:30" },
      { day: "Thu", start: "15:00", end: "17:00" },
    ],
  },
  {
    name: "Elliot Gross",
    email: "eegross@usc.edu",
    role: "associate_director",
    board: "philanthropy",
    officeHours: [
      { day: "Mon", start: "13:00", end: "15:00" },
      { day: "Tue", start: "16:00", end: "18:00" },
      { day: "Wed", start: "13:00", end: "15:00" },
      { day: "Thu", start: "16:00", end: "17:00" },
      { day: "Fri", start: "13:00", end: "14:00" },
    ],
  },
  {
    name: "Kate Stake",
    email: "stake@usc.edu",
    role: "director",
    board: "social",
    officeHours: [
      { day: "Mon", start: "13:00", end: "14:00" },
      { day: "Mon", start: "16:00", end: "17:00" },
      { day: "Tue", start: "16:00", end: "17:00" },
      { day: "Wed", start: "13:00", end: "17:00" },
      { day: "Thu", start: "16:00", end: "17:00" },
      { day: "Fri", start: "14:00", end: "16:00" },
    ],
  },
  {
    name: "Ainsley Fink",
    email: "ainsleyf@usc.edu",
    role: "associate_director",
    board: "social",
    officeHours: [
      { day: "Mon", start: "09:30", end: "12:30" },
      { day: "Tue", start: "11:00", end: "12:00" },
      { day: "Tue", start: "16:00", end: "17:00" },
      { day: "Wed", start: "09:30", end: "12:30" },
    ],
  },
  {
    name: "Daniel Tran",
    email: "dhtran@usc.edu",
    role: "director",
    board: "arts",
    officeHours: [
      { day: "Tue", start: "16:00", end: "17:00" },
      { day: "Wed", start: "11:00", end: "12:00" },
      { day: "Fri", start: "09:00", end: "17:00" },
    ],
  },
  {
    name: "Mollie Cleary",
    email: "mjcleary@usc.edu",
    role: "associate_director",
    board: "arts",
    officeHours: [
      { day: "Wed", start: "11:00", end: "15:30" },
      { day: "Thu", start: "11:30", end: "15:30" },
    ],
  },
  {
    name: "Georgia Silva",
    email: "glsilva@usc.edu",
    role: "delegate",
    officeHours: [
      { day: "Tue", start: "17:00", end: "18:00" },
      { day: "Thu", start: "16:00", end: "18:00" },
    ],
  },
  {
    name: "Crystal Liang",
    email: "liangcry@usc.edu",
    role: "delegate",
    officeHours: [
      { day: "Mon", start: "17:00", end: "18:00" },
      { day: "Tue", start: "16:00", end: "17:00" },
      { day: "Thu", start: "14:10", end: "15:10" },
    ],
  },
  {
    name: "Brady Kawahara",
    email: "bkawahar@usc.edu",
    role: "delegate",
    officeHours: [
      { day: "Tue", start: "17:00", end: "18:00" },
      { day: "Thu", start: "16:00", end: "18:00" },
    ],
  },
  {
    name: "Ava Archer",
    email: "avaarche@usc.edu",
    role: "delegate",
    officeHours: [
      { day: "Mon", start: "14:00", end: "15:00" },
      { day: "Tue", start: "12:00", end: "13:00" },
      { day: "Thu", start: "12:00", end: "13:00" },
    ],
  },
  {
    name: "Troy Nevil",
    email: "nevil@usc.edu",
    role: "senior_executive_aide",
    officeHours: [],
  },
  {
    name: "Jack Rohloff",
    email: "jrohloff@usc.edu",
    role: "executive_aide",
    officeHours: [
      { day: "Tue", start: "15:30", end: "17:00" },
      { day: "Wed", start: "15:30", end: "17:00" },
    ],
  },
  {
    name: "Josh Roga",
    email: "roga@usc.edu",
    role: "executive_aide",
    officeHours: [
      { day: "Tue", start: "17:00", end: "18:00" },
      { day: "Thu", start: "16:00", end: "18:00" },
    ],
  },
];

const WEEKDAY_INDEX: Record<Weekday, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const pad2 = (n: number) => String(n).padStart(2, "0");

const slotEnd = (day: Weekday, end: string, base: Date) => {
  const [eh, em] = end.split(":").map(Number);
  const js = base.getDay();
  const want = WEEKDAY_INDEX[day];
  let delta = want - js;
  if (delta < 0) delta += 7;
  const d = new Date(base);
  d.setDate(d.getDate() + delta);
  d.setHours(eh, em, 0, 0);
  return d;
};

const slotStart = (day: Weekday, start: string, base: Date) => {
  const [sh, sm] = start.split(":").map(Number);
  const js = base.getDay();
  const want = WEEKDAY_INDEX[day];
  let delta = want - js;
  if (delta < 0) delta += 7;
  const d = new Date(base);
  d.setDate(d.getDate() + delta);
  d.setHours(sh, sm, 0, 0);
  return d;
};

export type NextOfficeHours =
  | { kind: "none" }
  | { kind: "now"; slot: OfficeSlot; endsAt: string }
  | { kind: "upcoming"; slot: OfficeSlot; startsAt: string };

/** Next office-hours window from today (America/Los_Angeles), including a window in progress. */
export function nextOfficeHours(person: Person, todayDate: string | Date = new Date()): NextOfficeHours {
  if (!person.officeHours.length) return { kind: "none" };
  const base = typeof todayDate === "string" ? new Date(`${todayDate}T12:00:00-08:00`) : new Date(todayDate);
  const now = typeof todayDate === "string" ? new Date() : new Date(todayDate);

  type Cand = { slot: OfficeSlot; start: Date; end: Date };
  const cands: Cand[] = [];
  for (let week = 0; week < 3; week++) {
    const anchor = new Date(base);
    anchor.setDate(anchor.getDate() + week * 7);
    for (const slot of person.officeHours) {
      const start = slotStart(slot.day, slot.start, anchor);
      const end = slotEnd(slot.day, slot.end, anchor);
      if (end <= now) continue;
      cands.push({ slot, start, end });
    }
  }
  if (!cands.length) return { kind: "none" };
  cands.sort((a, b) => a.start.getTime() - b.start.getTime());
  const next = cands[0]!;
  if (next.start <= now && next.end > now) {
    return { kind: "now", slot: next.slot, endsAt: `${pad2(next.end.getHours())}:${pad2(next.end.getMinutes())}` };
  }
  return {
    kind: "upcoming",
    slot: next.slot,
    startsAt: `${next.start.getFullYear()}-${pad2(next.start.getMonth() + 1)}-${pad2(next.start.getDate())}T${pad2(next.start.getHours())}:${pad2(next.start.getMinutes())}`,
  };
}

export function peopleForBoard(boardId: BoardId): Person[] {
  return PEOPLE.filter((p) => p.board === boardId && (p.role === "director" || p.role === "associate_director"));
}

export function outreachTeam(): Person[] {
  return PEOPLE.filter((p) => p.role === "senior_executive_aide" || p.role === "executive_aide");
}

export const formatOfficeTime = (t: string) => {
  const [h, m] = t.split(":").map(Number);
  const am = h < 12;
  const hr = h % 12 || 12;
  return `${hr}:${pad2(m)} ${am ? "AM" : "PM"}`;
};

export const roleLabel = (p: Person) => {
  if (p.role === "director") return "Director";
  if (p.role === "associate_director") return "Associate Director";
  if (p.role === "delegate") return "Funding Delegate";
  if (p.role === "senior_executive_aide") return "Senior Executive Aide, RSO Outreach";
  return "Executive Aide, RSO Outreach";
};