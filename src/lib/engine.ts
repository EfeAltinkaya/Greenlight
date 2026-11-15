// The rules engine: plain code, no AI. Every pass/warn/fail in the product comes from here,
// so numbers are exact and every result points at a quoted USG rule.
import { BOARDS, INELIGIBLE, RULES } from "@/data/rules";
import { DEADLINES, type DeadlineRow } from "@/data/deadlines";
import vendorData from "@/data/vendors.json";
import type { Application, Check, Club, LineItem } from "./types";

export const money = (n: number) =>
  "$" + n.toLocaleString("en-US", { minimumFractionDigits: n % 1 ? 2 : 0, maximumFractionDigits: 2 });

const DAY = 86_400_000;
const parse = (d: string) => Date.parse(d + "T12:00:00Z");
export const fmtDate = (d: string, opts: Intl.DateTimeFormatOptions = { weekday: "short", month: "short", day: "numeric" }) =>
  new Date(parse(d)).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
export const todayISO = () => new Date().toLocaleDateString("en-CA", { timeZone: "America/Los_Angeles" });

// ---------- Deadlines ----------

export type DeadlineResult =
  | { kind: "blackout"; reason: string }
  | { kind: "none"; reason: string; row: DeadlineRow | null }
  | {
      kind: "ok";
      row: DeadlineRow;
      deadline: string; // the one that applies
      uses: "six" | "nine";
      daysLeft: number; // from today to deadline (negative = passed)
      passed: boolean;
      /** A later event week whose deadline is still open and much later: "move a week, gain N days". */
      cliff: { weekStart: string; deadline: string; gainDays: number } | null;
    };

export function findWeek(date: string): DeadlineRow | null {
  const t = parse(date);
  // Weekend events belong to the Monday-Friday week before them.
  return DEADLINES.find((r) => t >= parse(r.weekStart) && t <= parse(r.weekEnd) + 2 * DAY) ?? null;
}

export function lookupDeadline(date: string, needsNine: boolean, today = todayISO()): DeadlineResult {
  const t = parse(date);
  if (t >= parse("2026-12-05") && t <= parse("2027-01-12")) return { kind: "blackout", reason: RULES.blackout.quote };
  if (t > parse("2027-05-01")) return { kind: "blackout", reason: RULES.blackout.quote };
  const row = findWeek(date);
  if (!row) return { kind: "none", reason: "This date is outside USG's 2026-27 deadline table.", row: null };
  const deadline = needsNine ? row.nine : row.six;
  if (!deadline)
    return {
      kind: "none",
      reason: needsNine
        ? "USG lists no 9-week deadline for this week, so travel or new-vendor requests cannot meet it."
        : "USG lists no deadline for this week (start of semester or a break).",
      row,
    };
  const daysLeft = Math.round((parse(deadline) - parse(today)) / DAY);
  const idx = DEADLINES.indexOf(row);
  let cliff: Extract<DeadlineResult, { kind: "ok" }>["cliff"] = null;
  for (const next of DEADLINES.slice(idx + 1, idx + 3)) {
    const d = needsNine ? next.nine : next.six;
    if (d && parse(d) - parse(deadline) >= 21 * DAY && parse(d) >= parse(today)) {
      cliff = { weekStart: next.weekStart, deadline: d, gainDays: Math.round((parse(d) - parse(deadline)) / DAY) };
      break;
    }
  }
  return { kind: "ok", row, deadline, uses: needsNine ? "nine" : "six", daysLeft, passed: daysLeft < 0, cliff };
}

// ---------- Vendor List ----------

export type Vendor = (typeof vendorData.vendors)[number];
export type VendorMatch =
  | { kind: "listed"; vendor: Vendor; usable: boolean; status: string }
  | { kind: "not_listed"; suggestions: Vendor[] }
  | { kind: "not_covered" }; // the list only covers food vendors

const norm = (s: string) =>
  s.toLowerCase().replace(/\[.*?\]|\(.*?\)/g, " ").replace(/&/g, " and ").replace(/[^a-z0-9 ]/g, " ").replace(/\b(inc|llc|co|corp|the|restaurant|catering|group)\b/g, " ").replace(/\s+/g, " ").trim();

export function vendorStatus(v: Vendor) {
  if (!v.active) return "Inactive on USG's list";
  if (v.registration === "approved") return "Active, registration approved";
  if (v.registration === "in_progress") return "Active, registration in progress";
  if (v.registration === "invited") return "Active, registration invited";
  if (v.registration === "none") return "Active, no registration yet";
  return "On USG's Vendor List";
}

export function matchVendor(name: string, category: string): VendorMatch {
  if (category !== "food") return { kind: "not_covered" };
  const q = norm(name);
  if (!q) return { kind: "not_listed", suggestions: [] };
  const scored = vendorData.vendors
    .map((v) => {
      const n = norm(v.name);
      const exact = n === q || n.startsWith(q + " ") || q.startsWith(n + " ") || n.includes(q);
      const qWords = q.split(" ").filter((w) => w.length > 2);
      const overlap = qWords.filter((w) => n.split(" ").includes(w)).length / Math.max(qWords.length, 1);
      return { v, score: exact ? 1 : overlap };
    })
    .sort((a, b) => b.score - a.score);
  const best = scored[0];
  if (best && best.score >= 0.99) {
    // Prefer an active entry when the same vendor appears more than once.
    const same = scored.filter((s) => s.score >= 0.99).map((s) => s.v);
    const v = same.find((x) => x.active) ?? same[0];
    return { kind: "listed", vendor: v, usable: v.active, status: vendorStatus(v) };
  }
  return { kind: "not_listed", suggestions: cateringSuggestions() };
}

export function cateringSuggestions(n = 3): Vendor[] {
  return vendorData.vendors.filter((v) => v.active && (v.kinds as string[]).includes("Catering") && v.registration !== "unknown").slice(0, n);
}

// ---------- The checks ----------

const lineTotal = (i: LineItem) => i.total;
export const requestItems = (a: Application) => a.items.filter((i) => !i.toSponsor);
export const requestTotal = (a: Application) => requestItems(a).reduce((s, i) => s + lineTotal(i), 0);

/** Same 9-week trigger the guidelines use: travel, or a food vendor not on USG's list. */
export function needsNineWeeks(app: Application) {
  if (app.event.travel) return true;
  return requestItems(app).some((i) => i.category === "food" && i.vendor && matchVendor(i.vendor, "food").kind === "not_listed");
}

let n = 0;
/** A check's identity across runs: which rule, on which budget line. */
export const checkKey = (c: Pick<Check, "ruleId" | "itemId">) => `${c.ruleId}:${c.itemId ?? ""}`;
const mk = (c: Omit<Check, "id">): Check => ({ id: `${c.ruleId}${c.itemId ? ":" + c.itemId : ""}:${n++}`, ...c });

/** Purchases whose vendor must be on USG's list but that Greenlight's (food-only) copy can't check. */
export const VENDOR_CHECKED: string[] = ["printing", "promo_merch", "tshirt", "supplies", "rental", "other"];

export const UEPA_RE = /^A\d{5,6}$/;

/** Why an event needs the 9-week deadline, in words: travel, or which food vendors are not listed. */
export function nineWeekReason(app: Application) {
  const vendors = [...new Set(app.items.filter((i) => !i.toSponsor && i.category === "food" && i.vendor && matchVendor(i.vendor, "food").kind === "not_listed").map((i) => i.vendor))];
  return [app.event.travel ? "the event involves travel" : "", vendors.length ? `${vendors.join(" and ")} ${vendors.length === 1 ? "is" : "are"} not on USG's Vendor List` : ""].filter(Boolean).join(", and ");
}

export function runChecks(app: Application, club: Club, today = todayISO()): Check[] {
  n = 0;
  const out: Check[] = [];
  const e = app.event;
  const items = requestItems(app);
  const total = requestTotal(app);

  // Deadline
  const needsNine = needsNineWeeks(app);
  const sent = app.submittedAt && app.status !== "draft" && app.status !== "needs_info" ? app.submittedAt : null;
  const dl = lookupDeadline(e.date, needsNine, sent ?? today);
  if (dl.kind === "blackout") out.push(mk({ ruleId: RULES.blackout.id, level: "fail", title: "USG does not fund events on this date", detail: "Events from Dec 5 to Jan 12, and after May 1, cannot be funded.", quote: RULES.blackout.quote, section: RULES.blackout.section }));
  else if (dl.kind === "none") out.push(mk({ ruleId: RULES.late.id, level: "fail", title: "No USG deadline covers this event week", detail: dl.reason, quote: RULES.late.quote, section: RULES.late.section }));
  else if (dl.passed)
    out.push(mk({ ruleId: RULES.late.id, level: "fail", title: `Deadline passed on ${fmtDate(dl.deadline)}`, detail: `For this event week the ${dl.uses === "nine" ? "9-week" : "6-week"} deadline was ${fmtDate(dl.deadline)}. Late applications are denied automatically.${dl.cliff ? ` Moving the event to the week of ${fmtDate(dl.cliff.weekStart, { month: "short", day: "numeric" })} opens a ${fmtDate(dl.cliff.deadline)} deadline.` : ""}`, quote: RULES.late.quote, section: RULES.late.section }));
  else if (sent)
    out.push(mk({ ruleId: RULES.late.id, level: "pass", title: `Submitted on time (deadline ${fmtDate(dl.deadline)})`, detail: `Submitted ${fmtDate(sent)}, ${dl.daysLeft} day${dl.daysLeft === 1 ? "" : "s"} before the ${dl.uses === "nine" ? "9-week" : "6-week"} deadline.`, quote: RULES.late.quote, section: RULES.late.section }));
  else
    out.push(mk({ ruleId: RULES.late.id, level: dl.daysLeft <= 7 ? "warn" : "pass", title: `Submit by ${fmtDate(dl.deadline)} (${dl.daysLeft} day${dl.daysLeft === 1 ? "" : "s"})`, detail: `${dl.uses === "nine" ? "9-week deadline (travel or a vendor not on the list)" : "6-week deadline (approved vendors)"}. Applications are due Wednesdays at 11:59 PM.`, quote: RULES.late.quote, section: RULES.late.section }));

  // Annual cap and events per semester
  const left = RULES.annualCap.limit - club.receivedThisYear;
  if (total > left)
    out.push(mk({ ruleId: RULES.annualCap.id, level: "fail", title: `Request ${money(total)} is over the ${money(left)} left this year`, detail: `${club.name} has received ${money(club.receivedThisYear)} of its ${money(RULES.annualCap.limit)} yearly maximum.`, quote: RULES.annualCap.quote, section: RULES.annualCap.section }));
  else out.push(mk({ ruleId: RULES.annualCap.id, level: "pass", title: `Within the yearly cap: ${money(left)} left now · ${money(left - total)} after this request`, detail: `${money(club.receivedThisYear)} received so far this year.`, quote: RULES.annualCap.quote, section: RULES.annualCap.section }));
  // $4,000 per semester (officer-stated, amber only). This year's awards so far all fall in the fall semester.
  const semUsed = e.date && e.date < "2027-01-01" ? club.receivedThisYear : 0;
  if (total + semUsed > RULES.semesterCap.limit)
    out.push(mk({ ruleId: RULES.semesterCap.id, level: "warn", title: `Over $4,000 for the semester (${money(total + semUsed)} with this request)`, detail: `A USG Funding officer told us clubs can receive up to $4,000 a semester. ${semUsed ? `${money(semUsed)} is already awarded this semester. ` : ""}Confirm with USG, or plan the part over ${money(Math.max(0, RULES.semesterCap.limit - semUsed))} for sponsors.`, quote: RULES.semesterCap.quote, section: RULES.semesterCap.section }));
  if (club.eventsThisSemester >= RULES.eventsPerSemester.limit)
    out.push(mk({ ruleId: RULES.eventsPerSemester.id, level: "fail", title: "Already 4 USG-funded events this semester", detail: "USG funds up to 4 events per organization each semester.", quote: RULES.eventsPerSemester.quote, section: RULES.eventsPerSemester.section }));

  if (total > RULES.overFourK.limit)
    out.push(mk({ ruleId: RULES.overFourK.id, level: "warn", title: `Total ${money(total)} is over $4,000`, detail: "USG reviews these case by case. Expect questions, or reduce the request.", quote: RULES.overFourK.quote, section: RULES.overFourK.section }));

  const venue = items.filter((i) => i.category === "venue" || i.category === "personnel").reduce((s, i) => s + i.total, 0);
  if (venue > RULES.venueCap.limit)
    out.push(mk({ ruleId: RULES.venueCap.id, level: "fail", title: `Venue and staff ${money(venue)} is over $4,000`, detail: "USG covers up to $4,000 of on-campus venue and personnel costs.", quote: RULES.venueCap.quote, section: RULES.venueCap.section }));

  // Event-level eligibility
  if (e.onCampus && !e.openToAll) out.push(mk({ ruleId: RULES.openToAll.id, level: "fail", title: "On-campus events must be open to all students", detail: "Closed, members-only on-campus events are not fundable.", quote: RULES.openToAll.quote, section: RULES.openToAll.section }));
  if (e.ticketed) out.push(mk({ ruleId: RULES.ticketSales.id, level: "fail", title: "Events with ticket sales are not fundable", detail: "Remove ticket sales or fund this event another way.", quote: RULES.ticketSales.quote, section: RULES.ticketSales.section }));
  if (e.privateResidence) out.push(mk({ ruleId: RULES.privateResidence.id, level: "fail", title: "Events in private residences are not fundable", detail: "Move the event to a campus or public venue.", quote: RULES.privateResidence.quote, section: RULES.privateResidence.section }));
  if (e.international) out.push(mk({ ruleId: RULES.internationalTravel.id, level: "fail", title: "International travel is not fundable", detail: "USG does not fund international travel.", quote: RULES.internationalTravel.quote, section: RULES.internationalTravel.section }));
  if (e.travel) out.push(mk({ ruleId: RULES.travelPurpose.id, level: "info", title: "Travel needs a statement of purpose and traveler details", detail: "Name, DOB, phone, USC email, USC ID and class level for every traveler go directly into EngageSC. Greenlight never stores them.", quote: RULES.travelPurpose.quote, section: RULES.travelPurpose.section }));

  // Line items
  const food = items.filter((i) => i.category === "food");
  const foodTotal = food.reduce((s, i) => s + i.total, 0);
  if (food.length && e.attendance > 0) {
    const pp = foodTotal / e.attendance;
    const max = RULES.foodPerPerson.limit * e.attendance;
    if (pp > RULES.foodPerPerson.limit + 1e-9)
      out.push(mk({ ruleId: RULES.foodPerPerson.id, level: "fail", itemId: food[0].id, title: `Food is ${money(Math.round(pp * 100) / 100)} per person (limit $35)`, detail: `${money(foodTotal)} for ${e.attendance} expected attendees. The most USG will fund is ${money(max)}. Lower it, or move ${money(foodTotal - max)} to a sponsor.`, quote: RULES.foodPerPerson.quote, section: RULES.foodPerPerson.section, fix: { label: `Cap food at ${money(max)}`, action: "cap-food" } }));
    else out.push(mk({ ruleId: RULES.foodPerPerson.id, level: "pass", itemId: food[0].id, title: `Food is ${money(Math.round(pp * 100) / 100)} per person, within $35`, detail: `${money(foodTotal)} for ${e.attendance} expected attendees.`, quote: RULES.foodPerPerson.quote, section: RULES.foodPerPerson.section }));
  }

  for (const i of items) {
    const bad = INELIGIBLE[i.category];
    if (bad) {
      out.push(mk({ ruleId: "ineligible-" + i.category, level: "fail", itemId: i.id, title: `${i.item}: ${bad.label.toLowerCase()} is never fundable`, detail: "USG will not pay for this. Ask a sponsor to cover it instead.", quote: bad.quote, section: "Section 5", fix: { label: "Move to sponsor list", action: "to-sponsor" } }));
      continue;
    }
    if (i.category === "lodging" && i.quantity > 0 && i.unitPrice > RULES.hotelPerNight.limit)
      out.push(mk({ ruleId: RULES.hotelPerNight.id, level: "fail", itemId: i.id, title: `${i.item}: ${money(i.unitPrice)} per night is over $400`, detail: "Pick a cheaper room and attach a price comparison.", quote: RULES.hotelPerNight.quote, section: RULES.hotelPerNight.section }));
    if (i.category === "tshirt")
      out.push(mk({ ruleId: RULES.tshirts.id, level: "warn", itemId: i.id, title: `${i.item}: use a USC Trademarks-licensed vendor`, detail: "Confirm the printer is licensed with USC Trademarks.", quote: RULES.tshirts.quote, section: RULES.tshirts.section }));
    if ((i.category === "promo_merch" || i.category === "tshirt") && !club.startupEligible && e.board !== "social")
      out.push(mk({ ruleId: RULES.startupMerch.id, level: "warn", itemId: i.id, title: `${i.item}: promotional items fit the Startup fund`, detail: "Merch for recruitment is funded for clubs registered in the last two semesters. Otherwise a sponsor is a better fit.", quote: RULES.startupMerch.quote, section: RULES.startupMerch.section, fix: { label: "Move to sponsor list", action: "to-sponsor" } }));
    if (i.category === "food" && i.vendor) {
      const m = matchVendor(i.vendor, "food");
      if (m.kind === "listed")
        out.push(mk({ ruleId: RULES.vendorList.id, level: m.usable ? (m.vendor.registration === "none" ? "warn" : "pass") : "fail", itemId: i.id, title: m.status.startsWith("On ") ? `${i.vendor} is on USG's Vendor List` : `${i.vendor}: ${m.status}`, detail: m.usable ? (m.vendor.registration === "approved" ? "Registration approved." : m.vendor.registration === "unknown" ? "Status not marked on the list. Confirm with USG if unsure." : "USG may need to confirm it accepts a purchase order.") : "Listed as inactive. Choose another vendor.", quote: RULES.vendorList.quote, section: RULES.vendorList.section }));
      else
        out.push(mk({ ruleId: RULES.vendorList.id, level: "fail", itemId: i.id, title: `${i.vendor} is not on USG's Vendor List`, detail: `The guidelines say a vendor not on the list is not accepted; USG's FAQ allows a new vendor with the 9-week deadline. Safest fix: switch to a listed caterer, such as ${cateringSuggestions().map((v) => v.name.replace(/\s*[\[(].*$/, "")).join(", ")}.`, quote: RULES.vendorList.quote, section: RULES.vendorList.section }));
    }
    // Unlisted vendors are a top denial cause for every kind of purchase, not just food (a USG Funding officer's
    // example was a printing service). Greenlight's copy of the Vendor List covers food vendors only, so for other
    // purchases the club must confirm the vendor is approved before it can submit.
    if (VENDOR_CHECKED.includes(i.category)) {
      if (!i.vendor.trim())
        out.push(mk({ ruleId: RULES.vendorList.id, level: "fail", itemId: i.id, title: `${i.item}: add the vendor`, detail: "USG pays approved vendors directly, so every purchase needs a named vendor from USG's Vendor List.", quote: RULES.vendorList.quote, section: RULES.vendorList.section }));
      else if (!i.vendorConfirmed)
        out.push(mk({ ruleId: RULES.vendorList.id, level: "fail", itemId: i.id, title: `Confirm ${i.vendor} is an approved USG vendor`, detail: "Unapproved vendors are one of the most common reasons USG can't fund a line. Check USG's Vendor List (or ask the Funding Department) before you submit, then confirm here.", quote: RULES.vendorList.quote, section: RULES.vendorList.section, fix: { label: "I checked: it's approved", action: "confirm-vendor" } }));
      else
        out.push(mk({ ruleId: RULES.vendorList.id, level: "pass", itemId: i.id, title: `${i.vendor}: you confirmed it's an approved vendor`, detail: "Confirmed by your club.", quote: RULES.vendorList.quote, section: RULES.vendorList.section }));
    }
    if (i.estimate)
      out.push(mk({ ruleId: "quote-needed", level: "warn", itemId: i.id, title: `${i.item}: price is an estimate`, detail: "Replace it with a real quote before you submit.", quote: "The full budget proposal for the event, including quotes for each individual expense", section: "Section 2" }));
    if (i.quote && !i.quote.matches)
      out.push(mk({ ruleId: "quote-mismatch", level: "fail", itemId: i.id, title: `${i.item}: quote does not match the budget`, detail: i.quote.note, quote: "The full budget proposal for the event, including quotes for each individual expense", section: "Section 2" }));
  }

  if (food.length) {
    out.push(mk({ ruleId: RULES.foodDocs.id, level: app.docs.healthPermit ? "pass" : "fail", title: app.docs.healthPermit ? "Food vendor health permit and insurance attached" : "Food vendor health permit and insurance missing", detail: "Attach both from the food vendor, plus the Hospitality food and beverage form.", quote: RULES.foodDocs.quote, section: RULES.foodDocs.section }));
    const foodWhyText = `${app.answers.description} ${app.answers.missionFit}`.trim();
    out.push(mk({
      ruleId: RULES.foodWhy.id,
      level: foodWhyText.length >= 40 ? "pass" : "warn",
      title: foodWhyText.length >= 40 ? "Food purpose is explained in the form answers" : "Explain why food is necessary for the event",
      detail: "USG requires additional information detailing why food is necessary and how it aligns with the event's purpose.",
      quote: RULES.foodWhy.quote,
      section: RULES.foodWhy.section,
    }));
  }
  if (items.some((i) => i.category === "lodging")) {
    out.push(mk({
      ruleId: RULES.hotelCompare.id,
      level: app.docs.hotelCompare ? "pass" : "fail",
      title: app.docs.hotelCompare ? "Hotel price comparison attached" : "Hotel price comparison missing",
      detail: "Attach proof of price comparison with other hotels for lodging expenses.",
      quote: RULES.hotelCompare.quote,
      section: RULES.hotelCompare.section,
    }));
  }
  const other = app.answers.otherSources.trim();
  if (!other) {
    out.push(mk({
      ruleId: RULES.otherFunding.id,
      level: "warn",
      title: "List other funding sources (or N/A)",
      detail: "USG asks what other sources you are using. Receiving funding from another University income source can be grounds for denial.",
      quote: RULES.otherFunding.quote,
      section: RULES.otherFunding.section,
    }));
  } else if (/\b(viterbi|marshall|price|sos|school of|department of|gsg)\b/i.test(other) && !/\bn\/?a\b/i.test(other)) {
    out.push(mk({
      ruleId: RULES.otherFunding.id,
      level: "warn",
      title: "Other University funding may conflict with USG",
      detail: `You listed: "${other.slice(0, 120)}${other.length > 120 ? "…" : ""}". Confirm stacking order with USG before you submit.`,
      quote: RULES.otherFunding.quote,
      section: RULES.otherFunding.section,
    }));
  } else {
    out.push(mk({
      ruleId: RULES.otherFunding.id,
      level: "pass",
      title: "Other funding sources listed",
      detail: other.slice(0, 160),
      quote: RULES.otherFunding.quote,
      section: RULES.otherFunding.section,
    }));
  }
  const needsUepa = e.food || e.attendance >= 25 || items.length > 0;
  if (needsUepa && !e.travel)
    out.push(mk({ ruleId: RULES.uepa.id, level: app.uepa && UEPA_RE.test(app.uepa) ? "pass" : "fail", title: app.uepa ? (UEPA_RE.test(app.uepa) ? `UEPA ${app.uepa}` : "UEPA number format is wrong") : "UEPA number missing", detail: "Must start with A, then 5 or 6 digits (e.g. A12345). Required because this event has food, USG funds or 25+ people.", quote: RULES.uepa.quote, section: RULES.uepa.section }));

  // Board fit
  out.push(mk({ ruleId: "board", level: "info", title: `Board: ${BOARDS[e.board].name}`, detail: e.boardReason, quote: BOARDS[e.board].quote, section: "Section 4" }));
  return out;
}

export function score(checks: Check[]) {
  return {
    fail: checks.filter((c) => c.level === "fail").length,
    warn: checks.filter((c) => c.level === "warn").length,
    pass: checks.filter((c) => c.level === "pass").length,
  };
}

/** Documents the application still needs, built from USG's form and guidelines. */
export function documentList(app: Application) {
  const items = requestItems(app);
  const list: { key: string; label: string; why: string }[] = [
    { key: "budget", label: "Budget proposal sheet (RSO_Lastname_Firstname_BudgetProposal)", why: "Required upload on the USG form" },
    { key: "quotes", label: "One quote PDF per vendor (RSO_Lastname_Firstname_VendorName_Quote)", why: "Quotes for each individual expense" },
  ];
  if (items.some((i) => /amazon/i.test(i.vendor))) list.push({ key: "wishlist", label: "Amazon Wish List link, shared publicly", why: "For Amazon purchases, create an Amazon Wish List" });
  if (items.some((i) => /amazon|online|\.com/i.test(i.vendor + i.link))) list.push({ key: "cart", label: "Cart screenshot with prices, quantities and all fees", why: "For online purchases, include a screenshot of the cart" });
  if (app.event.food) {
    list.push({ key: "healthPermit", label: "Food vendor health permit and certificate of insurance", why: RULES.foodDocs.quote });
    list.push({ key: "fbForm", label: "Hospitality food and beverage form", why: "If serving food at event, please request and attach the food and beverage form from Hospitality" });
  }
  if (app.event.onCampus) list.push({ key: "esr", label: "ESR (event service request) for the on-campus venue", why: "ESRs for on campus events" });
  if (app.event.travel) {
    list.push({ key: "purpose", label: "Statement of purpose for the travel", why: RULES.travelPurpose.quote });
    list.push({ key: "travelers", label: "Traveler details entered in EngageSC (not here)", why: "Name, DOB, phone number, USC email, USC ID # and class level of all travelers" });
  }
  if (items.some((i) => i.category === "lodging")) list.push({ key: "hotelCompare", label: "Hotel price comparison", why: RULES.hotelCompare.quote });
  if (app.items.some((i) => i.toSponsor)) list.push({ key: "inkind", label: "Campus Activities approval for in-kind sponsor donations", why: "Outside organizations may support events through approved in-kind donations only" });
  return list;
}

/** USG's budget sheet columns, in order, for export. */
export function budgetCsv(app: Application) {
  const head = ["Item", "Vendor Name", "Vendor Website/Direct Payment Link", "Justification", "Quantity", "Unit Price", "Total Price (Including Tax)", "Payment/Order by Date"];
  const esc = (v: string | number) => `"${String(v).replace(/"/g, '""')}"`;
  const rows = requestItems(app).map((i) => [i.item, i.vendor, i.link, i.justification, i.quantity, i.unitPrice.toFixed(2), i.total.toFixed(2), i.orderBy].map(esc).join(","));
  return [head.map(esc).join(","), ...rows].join("\n");
}

/** Everything USG will not pay for becomes a sponsor ask. */
export function sponsorAsks(app: Application) {
  const asks: { itemId: string; label: string; amount: number; reason: string }[] = [];
  for (const i of app.items) if (i.toSponsor) asks.push({ itemId: i.id, label: i.item, amount: i.total, reason: INELIGIBLE[i.category] ? `USG never funds ${INELIGIBLE[i.category].label.toLowerCase()}` : "Moved from the USG request" });
  if (app.decision && app.decision.outcome !== "denied") {
    const gap = requestTotal(app) - app.decision.amount;
    if (gap > 0.5) asks.push({ itemId: "gap", label: "Not covered by the USG award", amount: gap, reason: `USG awarded ${money(app.decision.amount)} of ${money(requestTotal(app))}` });
  }
  return asks;
}
