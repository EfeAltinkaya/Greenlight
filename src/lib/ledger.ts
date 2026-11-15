// The ledger is the single record every other feature writes to.
// One line, one source. Double coverage is warned; Section 6 is quoted when combining USC sources.
import { RULES } from "@/data/rules";
import type { Application, Club, Deal, LedgerLine, LedgerSource, LedgerStatus, Status } from "./types";

export const LEDGER_SOURCES: { id: LedgerSource; label: string; group: "usg" | "other_usc" | "sponsors" | "unfunded" }[] = [
  { id: "usg", label: "USG Funding", group: "usg" },
  { id: "legislative", label: "Legislative Fund", group: "other_usc" },
  { id: "assembly", label: "Programming assembly", group: "other_usc" },
  { id: "department", label: "Academic department", group: "other_usc" },
  { id: "viterbi_sos", label: "Viterbi SOS", group: "other_usc" },
  { id: "viterbi_vfb", label: "Viterbi VFB", group: "other_usc" },
  { id: "marshall", label: "Marshall", group: "other_usc" },
  { id: "price", label: "Price", group: "other_usc" },
  { id: "gsg", label: "GSG", group: "other_usc" },
  { id: "ignitesc", label: "IgniteSC", group: "other_usc" },
  { id: "sponsor_in_kind", label: "Sponsor in kind", group: "sponsors" },
  { id: "dues", label: "Dues", group: "other_usc" },
  { id: "unfunded", label: "Still open", group: "unfunded" },
];

export const SECTION6_ADVICE = "Tell your board director before combining sources.";
export const SECTION6_QUOTE = RULES.otherFunding.quote;
export const SECTION6_SECTION = RULES.otherFunding.section;

export function ledgerSourceLabel(s: LedgerSource) {
  return LEDGER_SOURCES.find((x) => x.id === s)?.label ?? s;
}

export function ledgerGroup(s: LedgerSource) {
  return LEDGER_SOURCES.find((x) => x.id === s)?.group ?? "unfunded";
}

/** Lines that share the same event+item under two different sources (double coverage). */
export function doubleCoveredKeys(lines: LedgerLine[]): string[] {
  const map = new Map<string, Set<LedgerSource>>();
  for (const l of lines) {
    if (l.status === "declined" || l.amount <= 0 && l.example) continue;
    const key = `${l.eventId}::${l.item.toLowerCase()}`;
    const set = map.get(key) ?? new Set();
    set.add(l.source);
    map.set(key, set);
  }
  return [...map.entries()].filter(([, sources]) => sources.size > 1).map(([k]) => k);
}

/** Non-USG USC source on an event that also has a USG line (Section 6). */
export function needsSection6(lines: LedgerLine[], eventId: string): boolean {
  const ev = lines.filter((l) => l.eventId === eventId && l.status !== "declined");
  const hasUsg = ev.some((l) => l.source === "usg");
  const hasOtherUsc = ev.some((l) => ledgerGroup(l.source) === "other_usc");
  return hasUsg && hasOtherUsc;
}

export type EventStack = {
  eventId: string;
  title: string;
  usg: number;
  otherUsc: number;
  sponsors: number;
  unfunded: number;
  total: number;
  sample: boolean;
};

export function stackByEvent(lines: LedgerLine[], club: Club): EventStack[] {
  const realOnly = (l: LedgerLine) => !(l.example && !club.sample) && (club.sample || !l.sample || l.example);
  const map = new Map<string, EventStack>();
  for (const l of lines.filter(realOnly)) {
    if (l.status === "declined") continue;
    // Example rows with $0 still create the event shell.
    const cur = map.get(l.eventId) ?? {
      eventId: l.eventId,
      title: l.eventTitle,
      usg: 0,
      otherUsc: 0,
      sponsors: 0,
      unfunded: 0,
      total: 0,
      sample: Boolean(l.sample),
    };
    const g = ledgerGroup(l.source);
    if (g === "usg") cur.usg += l.amount;
    else if (g === "other_usc") cur.otherUsc += l.amount;
    else if (g === "sponsors") cur.sponsors += l.amount;
    else cur.unfunded += l.amount;
    cur.total = cur.usg + cur.otherUsc + cur.sponsors + cur.unfunded;
    map.set(l.eventId, cur);
  }
  return [...map.values()];
}

export function totalsBySource(lines: LedgerLine[], club: Club) {
  const out = new Map<LedgerSource, number>();
  for (const l of lines) {
    if (l.status === "declined") continue;
    if (l.example && !club.sample) continue;
    if (l.sample && !club.sample) continue;
    out.set(l.source, (out.get(l.source) ?? 0) + l.amount);
  }
  return LEDGER_SOURCES.map((s) => ({ ...s, amount: out.get(s.id) ?? 0 })).filter((s) => s.amount > 0 || s.id === "usg");
}

export function usgSemesterStats(lines: LedgerLine[], club: Club) {
  const usgApproved = lines.filter(
    (l) =>
      l.source === "usg" &&
      (l.status === "approved" || l.status === "paid_to_vendor" || l.status === "closed" || l.status === "invoiced") &&
      !(l.example && !club.sample) &&
      (club.sample || !l.sample),
  );
  const eventIds = new Set(usgApproved.map((l) => l.eventId));
  const awarded = usgApproved.reduce((s, l) => s + l.amount, 0);
  return {
    awarded: Math.max(awarded, club.receivedThisYear),
    cap: RULES.annualCap.limit,
    eventsUsed: Math.max(eventIds.size, club.eventsThisSemester),
    eventsCap: 4,
  };
}

export function exportLedgerCsv(lines: LedgerLine[]): string {
  const header = ["event", "item", "vendor", "amount", "source", "status", "updatedAt", "sample"];
  const rows = lines.map((l) =>
    [l.eventTitle, l.item, l.vendor, l.amount, l.source, l.status, l.updatedAt, l.sample ? "sample" : ""]
      .map((c) => `"${String(c).replace(/"/g, '""')}"`)
      .join(","),
  );
  return [header.join(","), ...rows].join("\n");
}

export function statusFromApp(status: Status): LedgerStatus {
  if (status === "approved" || status === "partial") return "approved";
  if (status === "denied") return "declined";
  if (status === "submitted" || status === "in_review" || status === "needs_info") return "requested";
  if (status === "closed" || status === "post_event_due") return "invoiced";
  return "planned";
}

/** Map a deal stage onto a ledger line status. */
export function statusFromDeal(stage: Deal["stage"]): LedgerStatus {
  if (stage === "paid" || stage === "event_done") return "paid_to_vendor";
  if (stage === "recap_sent") return "closed";
  if (stage === "declined") return "declined";
  if (stage === "requested" || stage === "details_sent") return "requested";
  return "committed";
}

export function applyAppToLedger(lines: LedgerLine[], app: Application, at: string): LedgerLine[] {
  const usgItems = app.items.filter((i) => !i.toSponsor);
  const next = lines.filter((l) => !(l.sourceRef === app.id && l.source === "usg"));
  const st = statusFromApp(app.status);
  for (const i of usgItems) {
    const amount = app.decision && (app.status === "approved" || app.status === "partial")
      ? Math.min(i.total, Math.max(0, (app.decision.amount / Math.max(1, usgItems.reduce((s, x) => s + x.total, 0))) * i.total))
      : i.total;
    next.push({
      id: `ll-${app.id}-${i.id}`,
      clubId: app.clubId,
      eventId: app.id,
      eventTitle: app.event.title,
      item: i.item,
      vendor: i.vendor,
      amount: Math.round(amount),
      category: i.category,
      source: "usg",
      sourceRef: app.id,
      status: st,
      evidence: null,
      updatedAt: at,
      history: [{ at, status: st, note: `From USG request ${app.requestId ?? app.id}`, by: "system" }],
      sample: app.sample,
    });
  }
  for (const i of app.items.filter((x) => x.toSponsor)) {
    if (next.some((l) => l.eventId === app.id && l.item === i.item && l.source === "sponsor_in_kind")) continue;
    if (next.some((l) => l.eventId === app.id && l.item === i.item && l.source === "unfunded")) continue;
    next.push({
      id: `ll-${app.id}-${i.id}-open`,
      clubId: app.clubId,
      eventId: app.id,
      eventTitle: app.event.title,
      item: i.item,
      vendor: i.vendor,
      amount: i.total,
      category: i.category,
      source: "unfunded",
      sourceRef: app.id,
      status: "planned",
      evidence: null,
      updatedAt: at,
      history: [{ at, status: "planned", note: "Moved off the USG request", by: "club" }],
      sample: app.sample,
    });
  }
  return next;
}

export function applyDealToLedger(lines: LedgerLine[], deal: Deal, at: string): LedgerLine[] {
  if (!deal.appId) return lines;
  const st = statusFromDeal(deal.stage);
  const next = lines.filter((l) => l.sourceRef !== deal.id);
  next.push({
    id: `ll-deal-${deal.id}`,
    clubId: deal.clubId,
    eventId: deal.appId,
    eventTitle: deal.covers,
    item: deal.covers,
    vendor: "",
    amount: deal.amount,
    category: "sponsor",
    source: "sponsor_in_kind",
    sourceRef: deal.id,
    status: st,
    evidence: deal.invoice?.fileName ?? null,
    updatedAt: at,
    history: [{ at, status: st, note: `${deal.sponsorName}: ${deal.stage}`, by: "system" }],
  });
  // Drop matching unfunded line for the same ask when committed/paid.
  if (st === "committed" || st === "paid_to_vendor" || st === "closed") {
    return next.filter(
      (l) =>
        !(
          l.eventId === deal.appId &&
          l.source === "unfunded" &&
          l.item.toLowerCase().includes(deal.covers.toLowerCase().slice(0, 12))
        ),
    );
  }
  return next;
}

/** Zero-dollar walkthrough for a brand-new real club. */
export function exampleLedgerEvent(clubId: string, at: string): LedgerLine[] {
  const eventId = `example-${clubId}`;
  const title = "Example: your first event";
  const mk = (id: string, item: string, source: LedgerSource, status: LedgerStatus): LedgerLine => ({
    id: `${eventId}-${id}`,
    clubId,
    eventId,
    eventTitle: title,
    item,
    vendor: "",
    amount: 0,
    category: "example",
    source,
    sourceRef: null,
    status,
    evidence: null,
    updatedAt: at,
    history: [{ at, status, note: "Example row. Fill in real amounts when you plan an event.", by: "system" }],
    example: true,
  });
  return [
    mk("usg", "Food from a listed vendor", "usg", "planned"),
    mk("sos", "Supplies from a school fund", "viterbi_sos", "planned"),
    mk("sp", "Prizes paid to the vendor by a sponsor", "sponsor_in_kind", "planned"),
    mk("open", "Anything still open", "unfunded", "planned"),
  ];
}
