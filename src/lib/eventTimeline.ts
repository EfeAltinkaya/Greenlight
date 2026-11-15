// Dated checklist worked backwards from the event date. Plain code, no AI.
// USG's own deadline is always a lookup of USG's sheet (lookupDeadline), never computed here.
// Greenlight does not estimate when USG will decide, so no decision date appears in this list.
import { createEvents, type EventAttributes } from "ics";
import { RULES } from "@/data/rules";
import { addBusinessDays } from "./decisionGuard";
import { lookupDeadline } from "./engine";

export type TimelineItem = {
  id: string;
  title: string;
  /** YYYY-MM-DD. null for a note with no date USG or the campus offices publish for this event. */
  dueDate: string | null;
  source: string;
  /** Plain-words reason, shown to first-time clubs. */
  why?: string;
};

export type TimelineInput = {
  eventDate: string;
  /** Outdoor events need the 6-week TES reservation request. */
  outdoor?: boolean;
  /** Travel or a food vendor that is not on USG's Vendor List: USG's 9-week column. */
  needsNineWeeks?: boolean;
  /** For the USG lookup's "days left" only; does not change any due date. */
  today?: string;
};

const DAY = 86_400_000;

export function addDays(iso: string, n: number) {
  return new Date(Date.parse(iso + "T12:00:00Z") + n * DAY).toISOString().slice(0, 10);
}

const TES = "USC Trojan Event Services (TES)";

export function buildEventTimeline(input: TimelineInput): TimelineItem[] {
  const { eventDate, outdoor = false, needsNineWeeks = false } = input;
  if (!eventDate) return [];
  const items: TimelineItem[] = [];

  const dl = lookupDeadline(eventDate, needsNineWeeks, input.today);
  if (dl.kind === "ok") {
    items.push({
      id: "usg-application",
      title: `Submit the USG funding application (${needsNineWeeks ? "9" : "6"}-week deadline)`,
      dueDate: dl.deadline,
      source: `USG Funding Application Deadlines sheet; ${RULES.late.section}`,
      why: `${RULES.late.quote} Greenlight reads this date straight from USG's sheet.`,
    });
  } else {
    items.push({
      id: "usg-application",
      title: "USG funding application deadline",
      dueDate: null,
      source: "USG Funding Application Deadlines sheet",
      why: dl.reason,
    });
  }

  if (outdoor) {
    items.push({
      id: "tes-request",
      title: "Send the TES reservation request for the outdoor space",
      dueDate: addDays(eventDate, -42),
      source: `${TES}: outdoor events, 6 weeks ahead`,
      why: "Outdoor spaces are booked through TES, and they need the request six weeks out. Confirm the exact steps with TES.",
    });
  }

  items.push({
    id: "classroom-requests",
    title: "Classroom requests open in Week 4 of the semester",
    dueDate: null,
    source: "Campus room reservations: opens Week 4 (note)",
    why: "A note, not a deadline. Check the registrar and your department for the exact date this semester.",
  });

  items.push({
    id: "uepa",
    title: "Submit the UEPA (University Event Planning Application)",
    dueDate: addDays(eventDate, -21),
    source: `${RULES.uepa.section}: UEPA at least 3 weeks before`,
    why: `${RULES.uepa.quote}`,
  });

  items.push({
    id: "dps",
    title: "Contact DPS and get approvals",
    dueDate: addDays(eventDate, -14),
    source: "USC Department of Public Safety: at least 2 weeks before",
    why: "DPS reviews safety and security plans for many events. Reach out early so approvals do not hold up the event.",
  });

  if (outdoor) {
    items.push({
      id: "tes-final-payment",
      title: "Make the TES final payment",
      dueDate: addDays(eventDate, -21),
      source: `${TES}: final payment 21 days before`,
      why: "TES expects the final payment three weeks before the event.",
    });
  }

  items.push({
    id: "post-event",
    title: "File the post-event evaluation and final invoices",
    dueDate: addBusinessDays(eventDate, 3),
    source: "Funding Guidelines Section 9: within 3 business days after the event",
    why: "USG asks for the evaluation, photos and final invoices within 3 business days of the event.",
  });

  return items.sort((a, b) => {
    if (a.dueDate === b.dueDate) return 0;
    if (!a.dueDate) return 1;
    if (!b.dueDate) return -1;
    return a.dueDate < b.dueDate ? -1 : 1;
  });
}

/** An .ics calendar of every dated item, as all-day events. Notes without a date are left out. */
export function exportTimelineIcs(items: TimelineItem[], eventTitle: string): string {
  const events: EventAttributes[] = items
    .filter((i): i is TimelineItem & { dueDate: string } => !!i.dueDate)
    .map((i) => {
      const [y, m, d] = i.dueDate.split("-").map(Number);
      return {
        uid: `${i.id}-${i.dueDate}@greenlight`,
        start: [y, m, d],
        duration: { days: 1 },
        title: `${i.title}: ${eventTitle}`,
        description: `${i.source}${i.why ? `\n${i.why}` : ""}`,
        calName: `Greenlight: ${eventTitle}`,
      };
    });
  if (!events.length) return "";
  const { error, value } = createEvents(events);
  if (error || !value) throw error ?? new Error("Could not build the calendar file.");
  return value;
}
